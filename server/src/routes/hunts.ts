import { Router } from 'express';
import { spawn, execSync } from 'child_process';
import { registerProcess } from '../services/processRegistry.js';
import { join } from 'path';
import { readdirSync, readFileSync, watch, existsSync, mkdirSync, symlinkSync, copyFileSync, statSync, rmSync, writeFileSync, utimesSync, type FSWatcher } from 'fs';
import { basename, extname } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { getConfig } from '../services/config.js';
import { resolveEmulatorPath, EmulatorNotInstalledError } from '../services/dependencies.js';
import { currentOs } from '../services/os-triple.js';
import { pushTo3DS } from '../services/ftpSync.js';
import { RNGHuntOrchestrator, type RNGHuntConfig, type HuntProgress } from "../services/rngHuntOrchestrator.js";
import { NDSRNGHuntOrchestrator, type NDSRNGHuntConfig, type HuntProgress as NDSHuntProgress } from "../services/ndsRngHuntOrchestrator.js";
import { getMemoryMap, getEncounterTypes, type EncounterType } from "../services/rng/memoryMap.js";
import { extractTSVFromSave } from "../services/rng/tsvCalculator.js";
import { NATURE_NAMES } from "../services/rng/pokemon.js";
import type { SearchFilters } from "../services/rng/frameSearcher.js";
import { parseGen2Save } from '../services/gen2Parser.js';
import { buildSnapshot } from '../services/saveSnapshot.js';
import { validateHuntConfig, type HuntMode } from '../services/huntValidation.js';

// Track active RNG hunt orchestrators
const activeRNGHunts = new Map<number, RNGHuntOrchestrator | NDSRNGHuntOrchestrator>();

const HUNTS_DIR = paths.huntsDir;
const SCRIPTS_DIR = paths.scriptsDir;
const CORE_HUNTER = join(SCRIPTS_DIR, 'shiny_hunter_core');
const CRYSTAL_STATIONARY_HUNTER = join(SCRIPTS_DIR, 'shiny_hunter_crystal_stationary');
const WILD_HUNTER = join(SCRIPTS_DIR, 'shiny_hunter_wild');
const EGG_HUNTER  = join(SCRIPTS_DIR, 'shiny_hunter_egg');
const HUNT_MANIFEST_PATH = join(SCRIPTS_DIR, 'hunt-manifest.json');

interface HuntManifest {
  binaries: Record<string, { games: string[]; modes: string[] }>;
}

/**
 * Aggregate of which games+modes the bundled hunt binaries support.
 * Generated at build time by scripts/build-hunters.sh from @alacrity markers
 * in each .c source; read once on module load.
 */
const HUNT_SUPPORT: { games: Set<string>; byGame: Map<string, Set<string>> } = (() => {
  const out = { games: new Set<string>(), byGame: new Map<string, Set<string>>() };
  try {
    const raw = readFileSync(HUNT_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw) as HuntManifest;
    for (const bin of Object.values(parsed.binaries)) {
      for (const g of bin.games) {
        out.games.add(g);
        if (!out.byGame.has(g)) out.byGame.set(g, new Set());
        for (const m of bin.modes) out.byGame.get(g)!.add(m);
      }
    }
  } catch (err) {
    console.warn('[hunts] hunt-manifest.json missing or invalid, no games will be marked supported:', (err as Error).message);
  }
  return out;
})();

/**
 * Resolve the mGBA binary from emulator_configs at call time. Hunts can't
 * start without it — throws EmulatorNotInstalledError if not configured.
 */
function getMgbaBinary(): string {
  const row = db.prepare(
    'SELECT path FROM emulator_configs WHERE id = ? AND os = ?'
  ).get('mgba', currentOs()) as { path: string } | undefined;

  if (!row || !row.path) {
    throw new EmulatorNotInstalledError();
  }

  return resolveEmulatorPath(row.path);
}

function getNtfyUrl(): string {
  const c = getConfig();
  return `${c.ntfyServer}/${c.ntfyTopic}`;
}

/** Build a human-readable hunt directory name: Game-Target-YYYY-MM-DD[-N] */
function generateHuntDirName(game: string, target: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const base = `${game}-${target}-${date}`.replace(/\s+/g, '_');
  let name = base;
  let counter = 2;
  while (existsSync(join(HUNTS_DIR, name))) {
    name = `${base}-${counter}`;
    counter++;
  }
  return name;
}

/** Resolve the on-disk hunt directory. Uses hunt_dir column if set, falls back to hunt_N for legacy hunts. */
function getHuntDir(hunt: any): string {
  return join(HUNTS_DIR, hunt.hunt_dir || `hunt_${hunt.id}`);
}

// Game configuration metadata for hunt form auto-population.
// Two method vocabularies flow through this file:
//   1. shiny_availability.method (PascalCase, Gen 1 curated list)
//   2. map_encounters.method (kebab-case, per-game encounter table, Gen 1–2)
// Both resolve to the same HuntMode vocabulary used by the UI pills.
const METHOD_TO_MODE: Record<string, string> = {
  'Gift': 'gift',
  'Stationary': 'stationary',
  'Fishing': 'fishing',
  'Game Corner': 'gift',    // closest match — receive Pokemon
  'In-Game Trade': 'gift',  // closest match — receive Pokemon
};

// map_encounters.method → hunt mode
const ENCOUNTER_METHOD_TO_MODE: Record<string, string | null> = {
  'grass': 'wild',
  'cave': 'wild',
  'surf': 'wild',
  'headbutt': 'wild',       // TODO: separate Headbutt mode when script exists
  'rock-smash': 'wild',     // TODO: separate Rock Smash mode when script exists
  'old-rod': 'fishing',
  'good-rod': 'fishing',
  'super-rod': 'fishing',
  'static': 'stationary',
  'gift': 'gift',
  'special': 'gift',        // catch-all for scripted receipts
  'contest': null,           // skip
};

// `Pokemon Crystal` → `crystal` (map_encounters.game key format)
function gameToEncounterKey(game: string): string {
  return game.toLowerCase().replace(/^pokemon\s+/i, '').replace(/\s+/g, '_');
}

const GAME_METADATA: Record<string, { gen: number; romPattern: RegExp }> = {
  Yellow: { gen: 1, romPattern: /\byellow\b/i },
  Red:    { gen: 1, romPattern: /\bred\b/i },
  Blue:   { gen: 1, romPattern: /\bblue\b/i },
  Gold:   { gen: 2, romPattern: /\bgold\b/i },
  Silver: { gen: 2, romPattern: /\bsilver\b/i },
  Crystal:{ gen: 2, romPattern: /\bcrystal\b/i },
  // Gen 4 — NDS
  'Pokemon Diamond':    { gen: 4, romPattern: /\bdiamond\b/i },
  'Pokemon Pearl':      { gen: 4, romPattern: /\bpearl\b/i },
  'Pokemon Platinum':   { gen: 4, romPattern: /\bplatinum\b/i },
  'Pokemon HeartGold':  { gen: 4, romPattern: /\bheartgold\b/i },
  'Pokemon SoulSilver': { gen: 4, romPattern: /\bsoulsilver\b/i },
  // Gen 5 — NDS
  'Pokemon Black':      { gen: 5, romPattern: /\bblack\b(?!\s*2)/i },
  'Pokemon White':      { gen: 5, romPattern: /\bwhite\b(?!\s*2)/i },
  'Pokemon Black 2':    { gen: 5, romPattern: /\bblack\s*2\b/i },
  'Pokemon White 2':    { gen: 5, romPattern: /\bwhite\s*2\b/i },
  'Pokemon X':              { gen: 6, romPattern: /\bpokemon\s*x\b/i },
  'Pokemon Y':              { gen: 6, romPattern: /\bpokemon\s*y\b/i },
  'Pokemon Omega Ruby':     { gen: 6, romPattern: /\bomega\s*ruby\b/i },
  'Pokemon Alpha Sapphire': { gen: 6, romPattern: /\balpha\s*sapphire\b/i },
  'Pokemon Sun':            { gen: 7, romPattern: /\bpokemon\s*sun\b(?!\s*moon)/i },
  'Pokemon Moon':           { gen: 7, romPattern: /\bpokemon\s*moon\b/i },
  'Pokemon Ultra Sun':      { gen: 7, romPattern: /\bultra\s*sun\b/i },
  'Pokemon Ultra Moon':     { gen: 7, romPattern: /\bultra\s*moon\b/i },
};

/**
 * Collect supportedModes per species by joining map_encounters for the game.
 * Memoized per encounterKey — map_encounters is seed data that doesn't change
 * at runtime, so repeated /api/hunts/config calls don't re-scan the table.
 */
const ENCOUNTER_MODE_CACHE = new Map<string, Map<number, Set<string>>>();
function encounterModesForGame(encounterKey: string): Map<number, Set<string>> {
  const cached = ENCOUNTER_MODE_CACHE.get(encounterKey);
  if (cached) return cached;

  const rows = db.prepare(
    'SELECT species_id, method FROM map_encounters WHERE game = ?'
  ).all(encounterKey) as Array<{ species_id: number; method: string }>;

  const out = new Map<number, Set<string>>();
  for (const r of rows) {
    const mode = ENCOUNTER_METHOD_TO_MODE[r.method];
    if (!mode) continue;
    if (!out.has(r.species_id)) out.set(r.species_id, new Set());
    out.get(r.species_id)!.add(mode);
  }
  ENCOUNTER_MODE_CACHE.set(encounterKey, out);
  return out;
}

// Pick the single "primary" mode for a species from its supported set.
// Preference order: wild > fishing > stationary > gift — wild is the most
// common hunt style, fishing is the next distinct script.
const PRIMARY_MODE_ORDER = ['wild', 'fishing', 'stationary', 'gift'];
function pickPrimaryMode(modes: Set<string>, fallback: string): string {
  for (const m of PRIMARY_MODE_ORDER) if (modes.has(m)) return m;
  return fallback;
}

function getTargetsForGame(game: string, gen: number) {
  // Gen 6/7: no per-game encounter data yet — leave every species as stationary.
  if (gen >= 6) {
    const maxGen = gen === 6 ? 6 : 7;
    const species = db.prepare('SELECT id, name, gender_rate, sprite_url FROM species WHERE generation <= ? ORDER BY id').all(maxGen) as any[];
    return species.map(s => ({
      species_id: s.id,
      name: s.name.charAt(0).toUpperCase() + s.name.slice(1).replace(/-/g, ' '),
      method: 'Wild',
      defaultMode: 'stationary',
      supportedModes: ['stationary'],
      gender_rate: s.gender_rate,
      sprite_url: s.sprite_url,
    }));
  }

  // Gen 2: every Gen 1–2 species is huntable; enrich with encounter-method data
  // from map_encounters. A species with no encounter data falls back to 'wild'.
  if (gen === 2) {
    const encounterKey = gameToEncounterKey(game);
    const modesBySpecies = encounterModesForGame(encounterKey);
    const species = db.prepare(
      'SELECT id, name, gender_rate, sprite_url FROM species WHERE generation <= 2 ORDER BY id'
    ).all() as any[];
    return species.map(s => {
      const modes = modesBySpecies.get(s.id);
      const supportedModes = modes ? Array.from(modes) : ['wild'];
      return {
        species_id: s.id,
        name: s.name.charAt(0).toUpperCase() + s.name.slice(1).replace(/-/g, ' '),
        method: 'Wild',
        defaultMode: pickPrimaryMode(modes ?? new Set(supportedModes), 'wild'),
        supportedModes,
        gender_rate: s.gender_rate,
        sprite_url: s.sprite_url,
      };
    });
  }

  // Gen 1: keep the curated shiny_availability list (no random-encounter shinies
  // exist in Gen 1). Supported modes come from that table's method column.
  const rows = db.prepare(`
    SELECT sa.species_id, s.name, s.gender_rate, s.sprite_url, sa.method
    FROM shiny_availability sa
    JOIN species s ON s.id = sa.species_id
    WHERE sa.game = ?
    ORDER BY sa.method, s.name
  `).all(game) as any[];

  const methodPriority = ['Gift', 'Stationary', 'Fishing', 'Game Corner', 'In-Game Trade'];
  const seen = new Map<number, {
    species_id: number; name: string; method: string; defaultMode: string;
    supportedModes: string[]; gender_rate: number; sprite_url: string | null;
  }>();
  for (const r of rows) {
    const mode = METHOD_TO_MODE[r.method] || 'gift';
    const existing = seen.get(r.species_id);
    if (!existing) {
      seen.set(r.species_id, {
        species_id: r.species_id,
        name: r.name.charAt(0).toUpperCase() + r.name.slice(1).replace(/-/g, ' '),
        method: r.method,
        defaultMode: mode,
        supportedModes: [mode],
        gender_rate: r.gender_rate,
        sprite_url: r.sprite_url,
      });
    } else {
      if (!existing.supportedModes.includes(mode)) existing.supportedModes.push(mode);
      // Update the "primary" method if the new one is higher priority.
      if (methodPriority.indexOf(r.method) < methodPriority.indexOf(existing.method)) {
        existing.method = r.method;
        existing.defaultMode = mode;
      }
    }
  }

  return Array.from(seen.values());
}

// Gen 1/2 gender is determined by Attack DV vs a species-specific threshold.
// If Atk DV <= threshold, the Pokemon is female.
// gender_rate from PokeAPI: -1=genderless, 0=always male, 1=12.5%F, 2=25%F, 4=50%F, 6=75%F, 7=87.5%F, 8=always female
function genderDvThreshold(genderRate: number): number {
  const thresholds: Record<number, number> = {
    [-1]: -2,  // genderless — no gender check possible
    0: -1,     // always male — no females possible
    1: 1,      // 12.5% female: Atk 0-1
    2: 3,      // 25% female: Atk 0-3
    4: 7,      // 50% female: Atk 0-7
    6: 11,     // 75% female: Atk 0-11
    7: 13,     // 87.5% female: Atk 0-13
    8: 16,     // always female — no males possible
  };
  return thresholds[genderRate] ?? -2;
}

const notifiedHits = new Set<string>();
const activeWatchers = new Map<number, FSWatcher[]>(); // huntId → FSWatcher instances

function killHuntProcesses(huntId: number) {
  const hunt = db.prepare('SELECT hunt_dir FROM hunts WHERE id = ?').get(huntId) as any;
  const dirName = hunt?.hunt_dir || `hunt_${huntId}`;
  try { execSync(`pkill -f "mgba.*${dirName}"`, { stdio: 'ignore' }); } catch {}
  try { execSync(`pkill -f "shiny_hunter_core.*/${dirName}/"`, { stdio: 'ignore' }); } catch {}
  try { execSync(`pkill -f "shiny_hunter_wild.*/${dirName}/"`, { stdio: 'ignore' }); } catch {}
  try { execSync(`pkill -f "shiny_hunter_egg.*/${dirName}/"`, { stdio: 'ignore' }); } catch {}
}

function cleanupNonHitInstances(hunt: any, hitInstances: Set<string>) {
  const huntDir = getHuntDir(hunt);
  if (!existsSync(huntDir)) return;
  const entries = readdirSync(huntDir).filter(e => e.startsWith('instance_'));
  for (const entry of entries) {
    const instNum = entry.replace('instance_', '');
    if (!hitInstances.has(instNum)) {
      rmSync(join(huntDir, entry), { recursive: true, force: true });
    }
  }
}

function stopHuntWatcher(huntId: number) {
  const watchers = activeWatchers.get(huntId);
  if (watchers) {
    for (const w of watchers) {
      try { w.close(); } catch {}
    }
    activeWatchers.delete(huntId);
  }
}

// Write the archive bundle for a hit instance: base.sav + shiny.ss1 + manifest.json
// to catches/<game>/<target_huntN_DVs>/. Does not copy catch.sav and does not
// register in save_files or create a checkpoint — those belong to the user-driven
// /save-catch and /save-to-library flows. Safe to call multiple times.
function writeArchiveBundle(hunt: any, instance: string): { catchDir: string; folderName: string; dvStr: string } | null {
  const huntDir = getHuntDir(hunt);
  const instDir = join(huntDir, `instance_${instance}`);
  if (!existsSync(instDir)) return null;

  const stateFiles = readdirSync(instDir).filter((f: string) => f.endsWith('.ss1') && f !== 'rom.ss1');
  const stateFile = stateFiles[0] || '';
  const dvMatch = stateFile.match(/A(\d+)_D(\d+)_Sp(\d+)_Sc(\d+)/);
  const dvStr = dvMatch ? `A${dvMatch[1]}_D${dvMatch[2]}_Sp${dvMatch[3]}_Sc${dvMatch[4]}` : '';

  const game = hunt.game || 'Unknown';
  const folderName = [hunt.target_name, `hunt${hunt.id}`, dvStr].filter(Boolean).join('_');
  const catchGameDir = paths.catchGameDir(game);
  const catchDir = join(catchGameDir, folderName);
  mkdirSync(catchDir, { recursive: true });

  const baseSavSrc = join(instDir, 'rom.sav');
  if (existsSync(baseSavSrc)) {
    copyFileSync(baseSavSrc, join(catchDir, 'base.sav'));
  }
  if (stateFile) {
    copyFileSync(join(instDir, stateFile), join(catchDir, 'shiny.ss1'));
  }

  // Preserve any catch.sav that was already copied in by a prior run
  const hasCatchSav = existsSync(join(catchDir, 'catch.sav'));

  const manifest = {
    game: hunt.game,
    species: hunt.target_name,
    species_id: hunt.target_species_id,
    dvs: dvStr,
    hunt_id: hunt.id,
    emulator: hunt.engine,
    archived_at: new Date().toISOString(),
    files: {
      base_save: existsSync(join(catchDir, 'base.sav')) ? 'base.sav' : null,
      save_state: existsSync(join(catchDir, 'shiny.ss1')) ? 'shiny.ss1' : null,
      catch_save: hasCatchSav ? 'catch.sav' : null,
    },
  };
  writeFileSync(join(catchDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return { catchDir, folderName, dvStr };
}

function handleHuntHit(huntId: number, targetName: string, hits: { instance: string; attempts: number; details: string }[]) {
  killHuntProcesses(huntId);
  stopHuntWatcher(huntId);

  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(huntId) as any;
  const prevAttempts = hunt?.previous_attempts || 0;

  // Accumulate elapsed time from this session
  const sessionSeconds = hunt?.started_at
    ? Math.floor((Date.now() - new Date(hunt.started_at + 'Z').getTime()) / 1000)
    : 0;
  const totalElapsed = (hunt?.elapsed_seconds || 0) + Math.max(0, sessionSeconds);

  db.prepare(`UPDATE hunts SET status = 'hit', hit_details = ?, elapsed_seconds = ?, ended_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(hits), totalElapsed, huntId);

  for (const hit of hits) {
    const hitKey = `hunt_${huntId}_${hit.instance}`;
    if (!notifiedHits.has(hitKey)) {
      notifiedHits.add(hitKey);
      const totalForNotification = prevAttempts + hit.attempts;
      ntfyPush(
        `SHINY HIT: ${targetName}! (${hit.instance})`,
        `${hit.details}\nInstance ${hit.instance}: ${totalForNotification} total attempts`,
        'urgent',
        'sparkles,pokemon',
      );
    }
  }

  const hitInstanceNums = new Set(hits.map(h => h.instance.replace('#', '')));

  // Write the archive bundle for each hit instance before cleaning up. This is
  // the system's permanent provenance record and should happen regardless of
  // whether the user ever opens the workflow.
  if (hunt) {
    for (const instance of hitInstanceNums) {
      try {
        writeArchiveBundle(hunt, instance);
      } catch (err) {
        console.error(`[hunt ${huntId}] archive bundle failed for instance ${instance}:`, err);
      }
    }
  }

  cleanupNonHitInstances(hunt, hitInstanceNums);
}

function scanLogsForHits(hunt: any): { instances: { file: string; attempts: number; hit: boolean }[]; totalAttempts: number; hits: { instance: string; attempts: number; details: string }[] } {
  const logDir = join(getHuntDir(hunt), 'logs');
  if (!existsSync(logDir)) return { instances: [], totalAttempts: 0, hits: [] };

  const logFiles = readdirSync(logDir).filter(f => f.endsWith('.log'));
  let totalAttempts = 0;
  const hits: { instance: string; attempts: number; details: string }[] = [];
  const instances = logFiles.map(f => {
    const content = readFileSync(join(logDir, f), 'utf-8');
    const lines = content.split('\n').filter(l => l.includes('Attempt') || l.match(/^[\d:]+ Egg \d+:/));
    const hitLines = content.split('\n').filter(l => l.includes('!!!'));
    const instAttempts = lines.length;
    totalAttempts += instAttempts;
    for (const h of hitLines) {
      if (h.trim()) hits.push({ instance: f.replace('.log', '').replace('instance_', '#'), attempts: instAttempts, details: h.trim() });
    }
    return { file: f, attempts: instAttempts, hit: hitLines.length > 0 };
  });

  return { instances, totalAttempts, hits };
}

function startHuntWatcher(huntId: number, targetName: string, hunt: any) {
  const logDir = join(getHuntDir(hunt), 'logs');
  if (!existsSync(logDir)) return;

  stopHuntWatcher(huntId);

  const logFiles = readdirSync(logDir).filter(f => f.endsWith('.log'));
  const watchers: FSWatcher[] = [];

  for (const f of logFiles) {
    const filePath = join(logDir, f);
    let lastSize = existsSync(filePath) ? readFileSync(filePath, 'utf-8').length : 0;

    // fs.watch is kqueue/inotify-backed — event-driven, no polling interval.
    // Replaces an earlier watchFile(interval: 2000) that was lagging badly
    // inside the compiled Bun sidecar, holding hit detection several seconds
    // behind the actual log write.
    const w = watch(filePath, () => {
      try {
        const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(huntId) as any;
        if (!hunt || hunt.status !== 'running') {
          stopHuntWatcher(huntId);
          return;
        }

        const content = readFileSync(filePath, 'utf-8');
        const newContent = content.slice(lastSize);
        lastSize = content.length;

        if (newContent.includes('!!!')) {
          const { hits, totalAttempts } = scanLogsForHits(hunt);
          db.prepare('UPDATE hunts SET total_attempts = ? WHERE id = ?').run(totalAttempts, huntId);
          if (hits.length > 0) {
            handleHuntHit(huntId, targetName, hits);
          }
        }
      } catch {}
    });
    watchers.push(w);
  }

  activeWatchers.set(huntId, watchers);
  console.log(`[hunt ${huntId}] Watching ${watchers.length} log files for shiny hits`);
}

async function ntfyPush(title: string, message: string, priority = 'default', tags = 'pokemon') {
  try {
    await fetch(getNtfyUrl(), {
      method: 'POST',
      headers: { Title: title, Priority: priority, Tags: tags },
      body: message,
    });
  } catch {}
}

// Re-attach watchers for any hunts still marked 'running' (handles server restart)
const runningHunts = db.prepare(`SELECT * FROM hunts WHERE status = 'running'`).all() as any[];
for (const hunt of runningHunts) {
  startHuntWatcher(hunt.id, hunt.target_name, hunt);
}

const router = Router();

router.get('/', (req, res) => {
  const includeArchived = req.query.archived === 'true';
  const hunts = includeArchived
    ? db.prepare('SELECT * FROM hunts ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM hunts WHERE is_archived = 0 ORDER BY created_at DESC').all();
  res.json(hunts);
});

// Scan for available ROMs, saves, and lua scripts
const HOME = process.env.HOME || '';
function getScanDirs() {
  return [paths.romsDir, paths.libraryDir, paths.catchesDir];
}
const ROM_EXTS = ['.gbc', '.gb', '.gba', '.3ds', '.cia', '.cxi'];
const SAV_EXTS = ['.sav'];

function scanFiles(dirs: string[], exts: string[]) {
  const results: { path: string; name: string; modified: string }[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      for (const file of readdirSync(dir)) {
        if (exts.includes(extname(file).toLowerCase())) {
          const fullPath = join(dir, file);
          const stat = statSync(fullPath);
          results.push({ path: fullPath, name: file, modified: stat.mtime.toISOString() });
        }
      }
    } catch {}
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

router.get('/browse', (req, res) => {
  const dir = (req.query.path as string) || HOME;
  const exts = (req.query.exts as string)?.split(',') || [];
  if (!existsSync(dir)) return res.status(404).json({ error: 'Directory not found' });

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: join(dir, e.name),
        isDir: e.isDirectory(),
      }))
      .filter(e => e.isDir || exts.length === 0 || exts.some(ext => e.name.toLowerCase().endsWith(ext)))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ path: dir, parent: join(dir, '..'), entries });
  } catch {
    res.status(403).json({ error: 'Cannot read directory' });
  }
});

router.get('/files', (_req, res) => {
  const scanDirs = getScanDirs();
  res.json({
    roms: scanFiles(scanDirs, ROM_EXTS),
    saves: scanFiles(scanDirs, SAV_EXTS),
  });
});

router.get('/presets', (_req, res) => {
  res.json([
    {
      label: 'Yellow — Pikachu',
      target_name: 'Pikachu',
      game: 'Yellow',
      rom_path: join(HOME, 'pokemon', 'roms', 'Pokemon Yellow.gbc'),
      sav_path: join(HOME, 'pokemon', 'roms', 'Pokemon Yellow.sav'),
      hunt_mode: 'gift',
    },
    {
      label: 'Crystal — Lugia',
      target_name: 'Lugia',
      game: 'Crystal',
      rom_path: join(HOME, 'pokemon', 'roms', 'Pokemon Crystal.gbc'),
      sav_path: join(HOME, 'pokemon', 'roms', 'Pokemon Crystal.sav'),
      hunt_mode: 'stationary',
    },
    {
      label: 'Crystal — Wild',
      target_name: 'Ditto',
      game: 'Crystal',
      rom_path: join(HOME, 'pokemon', 'roms', 'Pokemon Crystal.gbc'),
      sav_path: join(HOME, 'pokemon', 'roms', 'Pokemon Crystal.sav'),
      hunt_mode: 'wild',
      walk_dir: 'ns',
    },
    {
      label: 'Crystal — Egg (Shiny Ditto)',
      target_name: 'Charmander',
      game: 'Crystal',
      rom_path: join(HOME, 'pokemon', 'roms', 'Pokemon Crystal.gbc'),
      sav_path: join(HOME, 'pokemon', 'saves', 'library', 'Crystal', 'egg-hunt-base.sav'),
      hunt_mode: 'egg',
    },
  ]);
});

router.get('/game-configs', (_req, res) => {
  const scanDirs = getScanDirs();
  const roms = scanFiles(scanDirs, ROM_EXTS);
  const saves = scanFiles(scanDirs, SAV_EXTS);

  const configs = Object.entries(GAME_METADATA).map(([game, meta]) => {
    const rom = roms.find(r => meta.romPattern.test(r.name)) || null;
    const romBase = rom?.name.replace(/\.(gbc|gb|gba|3ds|cia|cxi)$/i, '');
    const gameSaves = romBase
      ? saves.filter(s => s.name.replace(/\.sav$/i, '') === romBase)
      : [];

    const targets = getTargetsForGame(game, meta.gen);
    const supportedModes = Array.from(HUNT_SUPPORT.byGame.get(game) ?? []);
    const supported = supportedModes.length > 0;

    return {
      game,
      gen: meta.gen,
      rom: rom ? { path: rom.path, name: rom.name } : null,
      saves: gameSaves.map(s => ({ path: s.path, name: s.name })),
      targets,
      supported,
      supportedModes,
    };
  });

  res.json(configs);
});

// Parse daycare info from a save file for egg hunt setup
router.post('/daycare-info', (req, res) => {
  const { sav_path, game } = req.body;
  if (!sav_path || !game) return res.status(400).json({ error: 'sav_path and game required' });

  try {
    const meta = GAME_METADATA[game];
    if (!meta || meta.gen !== 2) return res.json({ active: false });

    const result = parseGen2Save(sav_path, game);
    const dc = result.daycare;
    if (!dc || !dc.active) return res.json({ active: false });

    // Enrich with species names
    const speciesStmt = db.prepare('SELECT name, sprite_url FROM species WHERE id = ?');
    const enrichMon = (m: any) => {
      const species = speciesStmt.get(m.species_id) as any;
      return { ...m, name: species?.name || `#${m.species_id}`, sprite: species?.sprite_url || null };
    };
    const offspring = dc.offspringSpeciesId ? speciesStmt.get(dc.offspringSpeciesId) as any : null;

    res.json({
      ...dc,
      mon1: dc.mon1 ? enrichMon(dc.mon1) : null,
      mon2: dc.mon2 ? enrichMon(dc.mon2) : null,
      offspringName: offspring?.name || null,
      offspringSprite: offspring?.sprite_url || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save context for the hunt preview: current location, party abilities
// (drives the Flame Body inference for egg ETA), and where the target species
// can actually be found in this game. Gen 1/2 only for now — Gen 3+ returns
// a partial shape without party data.
router.post('/save-context', (req, res) => {
  const { sav_path, game, target_species_id } = req.body ?? {};
  if (!game || typeof game !== 'string') return res.status(400).json({ error: 'game required' });

  const out: {
    currentLocation: { key: string; displayName: string } | null;
    party: Array<{ species_id: number; name: string; abilities: string[]; hidden_ability: string | null }>;
    flameBodyInParty: boolean;
    targetLocations: Array<{ location_id: number; displayName: string; method: string }>;
    targetHatchCounter: number | null;
  } = {
    currentLocation: null,
    party: [],
    flameBodyInParty: false,
    targetLocations: [],
    targetHatchCounter: null,
  };

  // Target location lookup + hatch counter — work regardless of save state.
  if (target_species_id != null) {
    const sid = Number(target_species_id);
    const hc = db.prepare('SELECT hatch_counter FROM species WHERE id = ?').get(sid) as { hatch_counter: number | null } | undefined;
    out.targetHatchCounter = hc?.hatch_counter ?? null;

    const encounterKey = game.toLowerCase().replace(/^pokemon\s+/i, '').replace(/\s+/g, '_');
    const rows = db.prepare(`
      SELECT DISTINCT me.location_id, me.method, ml.display_name
      FROM map_encounters me
      JOIN map_locations ml ON ml.id = me.location_id
      WHERE me.game = ? AND me.species_id = ?
      ORDER BY ml.display_name
    `).all(encounterKey, sid) as Array<{
      location_id: number; method: string; display_name: string;
    }>;
    out.targetLocations = rows.map(r => ({
      location_id: r.location_id,
      displayName: r.display_name,
      method: r.method,
    }));
  }

  // Save-dependent data
  if (sav_path) {
    try {
      const meta = GAME_METADATA[game];
      if (meta?.gen === 2) {
        const parsed = parseGen2Save(sav_path, game);
        const ws = parsed.worldState;
        if (ws?.currentLocationKey) {
          const row = db.prepare(
            'SELECT display_name FROM map_locations WHERE location_key = ? LIMIT 1'
          ).get(ws.currentLocationKey) as { display_name?: string } | undefined;
          out.currentLocation = {
            key: ws.currentLocationKey,
            displayName: row?.display_name ?? ws.currentLocationKey,
          };
        }

        // Resolve abilities for each party species
        const abilityStmt = db.prepare(
          'SELECT id, name, ability1, ability2, hidden_ability FROM species WHERE id = ?'
        );
        for (const p of parsed.pokemon) {
          const s = abilityStmt.get(p.species_id) as any;
          if (!s) continue;
          const abilities = [s.ability1, s.ability2].filter(Boolean) as string[];
          out.party.push({
            species_id: s.id,
            name: s.name,
            abilities,
            hidden_ability: s.hidden_ability ?? null,
          });
          // Flame Body isn't tied to a specific slot — if the species CAN have
          // it, assume the user's party slot is using it. Over-reports only if
          // the user deliberately set a non-Flame-Body ability on a Magmar etc.
          // Acceptable tradeoff until we parse the per-mon personality-value
          // ability index out of the save.
          if (abilities.includes('flame-body') || s.hidden_ability === 'flame-body') {
            out.flameBodyInParty = true;
          }
        }
      }
    } catch (err: any) {
      console.error('save-context parse failed:', err?.message);
    }
  }

  res.json(out);
});

router.post('/validate', async (req, res) => {
  const { game, sav_path, hunt_mode, target_species_id } = req.body ?? {};
  if (!game || typeof game !== 'string') return res.status(400).json({ error: 'game required' });
  const mode = (hunt_mode === 'battle' ? 'stationary' : hunt_mode) as HuntMode;
  if (!['wild', 'stationary', 'gift', 'egg', 'fishing'].includes(mode)) {
    return res.status(400).json({ error: 'invalid hunt_mode' });
  }
  const target = target_species_id != null ? Number(target_species_id) : null;
  try {
    const report = await validateHuntConfig({
      game,
      sav_path: sav_path || null,
      hunt_mode: mode,
      target_species_id: target,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

router.get("/encounter-types/:game", (req, res) => {
  try {
    const types = getEncounterTypes(req.params.game);
    res.json(types);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

function spawnHuntProcesses(huntId: number, hunt: any) {
  const { rom_path, sav_path, num_instances, hunt_mode, walk_dir, target_name, game } = hunt;
  const isWild = hunt_mode === 'wild';
  const isEgg = hunt_mode === 'egg';
  // Crystal stationary uses shiny_hunter_crystal_stationary (Gen 2 offsets);
  // Yellow gift/stationary falls through to shiny_hunter_core (Gen 1 offsets).
  const isCrystalStationary = hunt_mode === 'stationary' && game === 'Crystal';
  const huntDir = getHuntDir(hunt);
  const logDir = join(huntDir, 'logs');
  const instances = num_instances;

  let genderThreshold = -2;
  if (hunt.target_species_id) {
    const species = db.prepare('SELECT gender_rate FROM species WHERE id = ?').get(hunt.target_species_id) as any;
    if (species) genderThreshold = genderDvThreshold(species.gender_rate);
  }

  const conditionEnv = {
    TARGET_SHINY: String(hunt.target_shiny ?? 1),
    TARGET_PERFECT: String(hunt.target_perfect ?? 0),
    TARGET_GENDER: hunt.target_gender || 'any',
    GENDER_THRESHOLD: String(genderThreshold),
    MIN_ATK: String(hunt.min_atk ?? 0),
    MIN_DEF: String(hunt.min_def ?? 0),
    MIN_SPD: String(hunt.min_spd ?? 0),
    MIN_SPC: String(hunt.min_spc ?? 0),
  };

  const binary = isEgg ? EGG_HUNTER
    : isWild ? WILD_HUNTER
    : isCrystalStationary ? CRYSTAL_STATIONARY_HUNTER
    : CORE_HUNTER;

  for (let i = 1; i <= instances; i++) {
    const instDir = join(huntDir, `instance_${i}`);
    const logFile = join(logDir, `instance_${i}.log`);
    const args = isWild
      ? [String(i), rom_path, sav_path, logFile, instDir, target_name, walk_dir || 'ns']
      : [String(i), rom_path, sav_path, logFile, instDir];

    const child = spawn(binary, args, {
      env: { ...process.env, ...conditionEnv },
      stdio: 'ignore',
      detached: true,
    });
    registerProcess(child, `Hunt-core[${huntId}:${i}]`);
  }
}

router.post('/', (req, res) => {
  const { target_name, target_species_id, game, rom_path, sav_path, num_instances, hunt_mode, engine, walk_dir,
    target_shiny, target_perfect, target_gender, min_atk, min_def, min_spd, min_spc,
    encounter_type, target_nature, target_ability, target_ivs,
    perfect_iv_count, is_shiny_locked, has_shiny_charm } = req.body;
  const normalizedHuntMode = hunt_mode === 'battle' ? 'stationary' : hunt_mode;

  if (engine === 'rng') {
    // Validate encounter type against game
    try {
      const memMap = getMemoryMap(game);
      if (encounter_type && !memMap.encounterTypes.includes(encounter_type)) {
        return res.status(400).json({
          error: `Encounter type '${encounter_type}' is not valid for ${game}. Valid: ${memMap.encounterTypes.join(", ")}`,
        });
      }
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }

    const huntDirName = generateHuntDirName(game, target_name);

    // Look up the checkpoint this hunt is branching from. The launch save is
    // identified by sav_path; whichever checkpoint currently references that
    // save_file is the parent.
    const parentCheckpoint = db.prepare(`
      SELECT c.id FROM checkpoints c
      JOIN save_files sf ON sf.id = c.save_file_id
      WHERE sf.file_path = ? LIMIT 1
    `).get(sav_path) as { id: number } | undefined;
    const parentCheckpointId = parentCheckpoint?.id ?? null;

    const result = db.prepare(`
      INSERT INTO hunts (target_name, target_species_id, game, rom_path, sav_path,
        num_instances, engine, hunt_mode, walk_dir,
        target_shiny, target_perfect, target_gender, min_atk, min_def, min_spd, min_spc,
        hunt_dir, status, started_at,
        encounter_type, target_nature, target_ability, target_ivs,
        perfect_iv_count, is_shiny_locked, has_shiny_charm,
        parent_checkpoint_id)
      VALUES (?, ?, ?, ?, ?,
        1, 'rng', ?, '',
        ?, 0, ?, 0, 0, 0, 0,
        ?, 'running', datetime('now'),
        ?, ?, ?, ?,
        ?, ?, ?,
        ?)
    `).run(
      target_name, target_species_id || null, game, rom_path, sav_path,
      encounter_type || 'stationary',
      target_shiny ?? 1, target_gender || 'any',
      huntDirName,
      encounter_type || null, target_nature || null, target_ability || null,
      target_ivs ? JSON.stringify(target_ivs) : null,
      perfect_iv_count || 0, is_shiny_locked ? 1 : 0, has_shiny_charm ? 1 : 0,
      parentCheckpointId
    );

    const huntId = result.lastInsertRowid as number;

    // Build search filters
    const filters: SearchFilters = {};
    if (target_shiny) filters.shiny = true;
    if (target_nature) {
      const idx = (NATURE_NAMES as readonly string[]).indexOf(target_nature);
      if (idx >= 0) filters.nature = idx;
    }
    if (target_ability === "hidden") filters.ability = 2;
    else if (target_ability === "normal") filters.ability = 0;
    if (target_gender === "male") filters.gender = 0;
    else if (target_gender === "female") filters.gender = 1;
    if (target_ivs) {
      const ivs = typeof target_ivs === "string" ? JSON.parse(target_ivs) : target_ivs;
      filters.minIVs = [ivs.hp ?? 0, ivs.atk ?? 0, ivs.def ?? 0, ivs.spa ?? 0, ivs.spd ?? 0, ivs.spe ?? 0];
    }

    // Determine generation to pick the right orchestrator
    const memMap = getMemoryMap(game);
    const isNDS = memMap.generation === 4 || memMap.generation === 5;

    let orchestrator: RNGHuntOrchestrator | NDSRNGHuntOrchestrator;

    if (isNDS) {
      // Gen 4/5: extract TID/SID from save for shiny checking
      const saveBuffer = readFileSync(sav_path);
      const { tid, sid, tsv } = extractTSVFromSave(saveBuffer, game);

      orchestrator = new NDSRNGHuntOrchestrator({
        huntId,
        game,
        romPath: rom_path,
        savePath: sav_path,
        encounterType: encounter_type || "stationary",
        targetSpeciesId: target_species_id || null,
        targetName: target_name,
        filters,
        perfectIVCount: perfect_iv_count || 0,
        isShinyLocked: !!is_shiny_locked,
        hasShinyCharm: !!has_shiny_charm,
        genderRatio: 127,
        tid,
        sid,
        tsv,
      });
    } else {
      // Gen 6/7: 3DS orchestrator
      orchestrator = new RNGHuntOrchestrator({
        huntId,
        game,
        romPath: rom_path,
        savePath: sav_path,
        encounterType: encounter_type || "stationary",
        targetSpeciesId: target_species_id || null,
        targetName: target_name,
        filters,
        perfectIVCount: perfect_iv_count || 0,
        isShinyLocked: !!is_shiny_locked,
        hasShinyCharm: !!has_shiny_charm,
        genderRatio: 127,
      });
    }

    activeRNGHunts.set(huntId, orchestrator);

    orchestrator.on("progress", (progress: HuntProgress) => {
      db.prepare("UPDATE hunts SET current_frame = ?, target_frame = ? WHERE id = ?")
        .run(progress.currentFrame, progress.targetFrame, huntId);
    });

    orchestrator.on("hit", () => {
      db.prepare("UPDATE hunts SET status = 'hit', ended_at = datetime('now') WHERE id = ?").run(huntId);
      activeRNGHunts.delete(huntId);
    });

    orchestrator.on("error", () => {
      db.prepare("UPDATE hunts SET status = 'stopped', ended_at = datetime('now') WHERE id = ?").run(huntId);
      activeRNGHunts.delete(huntId);
    });

    orchestrator.start();

    const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(huntId);
    return res.status(201).json(hunt);
  }

  const instances = num_instances || 16;

  const huntDirName = generateHuntDirName(game, target_name);

  // Look up the checkpoint this hunt is branching from. The launch save is
  // identified by sav_path; whichever checkpoint currently references that
  // save_file is the parent.
  const parentCheckpoint = db.prepare(`
    SELECT c.id FROM checkpoints c
    JOIN save_files sf ON sf.id = c.save_file_id
    WHERE sf.file_path = ? LIMIT 1
  `).get(sav_path) as { id: number } | undefined;
  const parentCheckpointId = parentCheckpoint?.id ?? null;

  const result = db.prepare(`
    INSERT INTO hunts (target_name, target_species_id, game, rom_path, sav_path, num_instances, engine, hunt_mode, walk_dir,
      target_shiny, target_perfect, target_gender, min_atk, min_def, min_spd, min_spc, hunt_dir, status, started_at,
      parent_checkpoint_id)
    VALUES (?, ?, ?, ?, ?, ?, 'core', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', datetime('now'),
      ?)
  `).run(target_name, target_species_id || null, game, rom_path, sav_path, instances, normalizedHuntMode || 'gift', walk_dir || 'ns',
    target_shiny ?? 1, target_perfect ?? 0, target_gender || 'any', min_atk ?? 0, min_def ?? 0, min_spd ?? 0, min_spc ?? 0, huntDirName,
    parentCheckpointId);

  const huntId = result.lastInsertRowid as number;
  const huntDir = join(HUNTS_DIR, huntDirName);
  const logDir = join(huntDir, 'logs');
  mkdirSync(logDir, { recursive: true });

  for (let i = 1; i <= instances; i++) {
    const instDir = join(huntDir, `instance_${i}`);
    mkdirSync(instDir, { recursive: true });
    copyFileSync(rom_path, join(instDir, 'rom.gbc'));
    copyFileSync(sav_path, join(instDir, 'rom.sav'));
  }

  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(huntId) as any;
  try {
    spawnHuntProcesses(huntId, hunt);
  } catch (err) {
    if (err instanceof EmulatorNotInstalledError) {
      return res.status(400).json({ error: 'mGBA is not installed. Install it from Settings → Emulators.' });
    }
    throw err;
  }
  startHuntWatcher(huntId, target_name, hunt);

  ntfyPush(
    `Hunt started: ${target_name}`,
    `${game} — ${instances} instances (${normalizedHuntMode || 'gift'} mode)`,
    'default',
    'pokeball',
  );

  res.status(201).json(hunt);
});

router.post('/:id/stop', async (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const orchestrator = activeRNGHunts.get(hunt.id);
  if (orchestrator) {
    await orchestrator.stop();
    activeRNGHunts.delete(hunt.id);
  }

  // Scan logs to preserve attempt count before killing processes
  const { totalAttempts } = scanLogsForHits(hunt);
  const cumulativeAttempts = (hunt.previous_attempts || 0) + totalAttempts;

  killHuntProcesses(hunt.id);
  stopHuntWatcher(hunt.id);

  // Accumulate elapsed time from this session
  const sessionSeconds = hunt.started_at
    ? Math.floor((Date.now() - new Date(hunt.started_at + 'Z').getTime()) / 1000)
    : 0;
  const totalElapsed = (hunt.elapsed_seconds || 0) + Math.max(0, sessionSeconds);

  db.prepare(`UPDATE hunts SET status = 'stopped', total_attempts = ?, previous_attempts = ?, elapsed_seconds = ?, ended_at = datetime('now') WHERE id = ?`)
    .run(cumulativeAttempts, cumulativeAttempts, totalElapsed, hunt.id);
  const updated = db.prepare('SELECT * FROM hunts WHERE id = ?').get(hunt.id);
  res.json(updated);
});

router.post('/:id/resume', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });
  if (hunt.status !== 'stopped') return res.status(400).json({ error: 'Only stopped hunts can be resumed' });

  const huntDir = getHuntDir(hunt);
  const logDir = join(huntDir, 'logs');
  mkdirSync(logDir, { recursive: true });

  // Ensure instance directories exist with ROM/SAV copies
  for (let i = 1; i <= hunt.num_instances; i++) {
    const instDir = join(huntDir, `instance_${i}`);
    mkdirSync(instDir, { recursive: true });
    if (!existsSync(join(instDir, 'rom.gbc'))) copyFileSync(hunt.rom_path, join(instDir, 'rom.gbc'));
    if (!existsSync(join(instDir, 'rom.sav'))) copyFileSync(hunt.sav_path, join(instDir, 'rom.sav'));
  }

  db.prepare(`UPDATE hunts SET status = 'running', ended_at = NULL, started_at = datetime('now') WHERE id = ?`).run(hunt.id);

  try {
    spawnHuntProcesses(hunt.id, hunt);
  } catch (err) {
    if (err instanceof EmulatorNotInstalledError) {
      db.prepare(`UPDATE hunts SET status = 'stopped' WHERE id = ?`).run(hunt.id);
      return res.status(400).json({ error: 'mGBA is not installed. Install it from Settings → Emulators.' });
    }
    throw err;
  }
  startHuntWatcher(hunt.id, hunt.target_name, hunt);

  ntfyPush(
    `Hunt resumed: ${hunt.target_name}`,
    `${hunt.game} — ${hunt.num_instances} instances, ${hunt.previous_attempts || 0} previous attempts`,
    'default',
    'pokeball',
  );

  const updated = db.prepare('SELECT * FROM hunts WHERE id = ?').get(hunt.id);
  res.json(updated);
});

router.post('/:id/archive', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });
  if (hunt.status === 'running') return res.status(400).json({ error: 'Cannot archive a running hunt' });

  db.prepare('UPDATE hunts SET is_archived = 1 WHERE id = ?').run(hunt.id);
  const updated = db.prepare('SELECT * FROM hunts WHERE id = ?').get(hunt.id);
  res.json(updated);
});

router.post('/:id/unarchive', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  db.prepare('UPDATE hunts SET is_archived = 0 WHERE id = ?').run(hunt.id);
  const updated = db.prepare('SELECT * FROM hunts WHERE id = ?').get(hunt.id);
  res.json(updated);
});

router.get('/:id/status', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const { instances, totalAttempts: logAttempts, hits } = scanLogsForHits(hunt);
  const totalAttempts = (hunt.previous_attempts || 0) + logAttempts;

  db.prepare('UPDATE hunts SET total_attempts = ? WHERE id = ?').run(totalAttempts, hunt.id);

  // Fallback detection in case the watcher missed it
  if (hits.length > 0 && hunt.status === 'running') {
    handleHuntHit(hunt.id, hunt.target_name, hits);
  }

  // Compute elapsed time: accumulated + current session if running
  let elapsedSeconds = hunt.elapsed_seconds || 0;
  if (hunt.status === 'running' && hunt.started_at) {
    elapsedSeconds += Math.floor((Date.now() - new Date(hunt.started_at + 'Z').getTime()) / 1000);
  }

  const secondsPerAttempt = totalAttempts > 0 ? elapsedSeconds / totalAttempts : 0;
  const remainingAttempts = Math.max(0, 8192 - totalAttempts);
  const estimatedRemainingSeconds = totalAttempts > 0 ? Math.round(secondsPerAttempt * remainingAttempts) : null;

  res.json({ instances, totalAttempts, hits, elapsedSeconds, secondsPerAttempt, estimatedRemainingSeconds });
});

router.get('/:id/hit-info', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });
  if (hunt.status !== 'hit') return res.json({ hits: [] });

  const hits: any[] = hunt.hit_details ? JSON.parse(hunt.hit_details) : [];
  const huntDir = getHuntDir(hunt);

  const enriched = hits.map(hit => {
    const instNum = hit.instance.replace('#', '');
    const instDir = join(huntDir, `instance_${instNum}`);
    const openDir = join(huntDir, `open_${instNum}`);

    // Find state file + parse DVs
    let stateFile = '';
    let dvs: { atk: number; def: number; spd: number; spc: number } | null = null;
    let isShiny = false;
    if (existsSync(instDir)) {
      const files = readdirSync(instDir);
      stateFile = files.find(f => f.endsWith('.ss1') && f !== 'rom.ss1') || files.find(f => f === 'rom.ss1') || '';
      isShiny = stateFile.includes('SHINY');
      const dvMatch = stateFile.match(/A(\d+)_D(\d+)_Sp(\d+)_Sc(\d+)/);
      if (dvMatch) dvs = { atk: +dvMatch[1], def: +dvMatch[2], spd: +dvMatch[3], spc: +dvMatch[4] };
    }

    // Workflow state
    const opened = existsSync(openDir);
    const openSavPath = join(openDir, 'rom.sav');
    const instSavPath = join(instDir, 'rom.sav');
    let saveModified = false;
    if (opened && existsSync(openSavPath) && existsSync(instSavPath)) {
      saveModified = statSync(openSavPath).mtimeMs > statSync(instSavPath).mtimeMs;
    }

    // Archive bundle state. `archived` is true when the manifest.json exists
    // (the full bundle — base.sav + shiny.ss1 + manifest — was written by
    // handleHuntHit at detection time). `savedToCatches` is the narrower flag:
    // catch.sav specifically exists (i.e. the user saved in-game and the catch
    // save was copied into the bundle).
    const catchesGameDir = paths.catchGameDir(hunt.game || '');
    const catchPattern = `${hunt.target_name}_hunt${hunt.id}`;
    let archived = false;
    let savedToCatches = false;
    let catchDirPath = '';
    let catchSavePath = '';
    if (existsSync(catchesGameDir)) {
      const catchFolder = readdirSync(catchesGameDir).find(f => f.includes(catchPattern));
      if (catchFolder) {
        catchDirPath = join(catchesGameDir, catchFolder);
        if (existsSync(join(catchDirPath, 'manifest.json'))) {
          archived = true;
        }
        const catchFile = join(catchDirPath, 'catch.sav');
        if (existsSync(catchFile)) {
          savedToCatches = true;
          catchSavePath = catchFile;
        }
      }
    }

    return {
      instance: hit.instance,
      attempts: hit.attempts,
      details: hit.details,
      stateFile,
      isShiny,
      dvs,
      paths: {
        instanceDir: instDir,
        openDir: opened ? openDir : null,
        savePath: opened ? openSavPath : instSavPath,
        catchDir: archived ? catchDirPath : null,
        catchSavePath: savedToCatches ? catchSavePath : null,
      },
      workflow: {
        opened,
        saveModified,
        archived,
        savedToCatches,
      },
    };
  });

  res.json({
    huntId: hunt.id,
    target: hunt.target_name,
    game: hunt.game,
    huntMode: hunt.hunt_mode,
    engine: hunt.engine,
    totalAttempts: hunt.total_attempts,
    hits: enriched,
  });
});

router.post('/:id/save-catch', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const { instance } = req.body;
  if (!instance) return res.status(400).json({ error: 'instance required' });

  const huntDir = getHuntDir(hunt);
  const openDir = join(huntDir, `open_${instance}`);
  const savPath = join(openDir, 'rom.sav');
  if (!existsSync(savPath)) return res.status(404).json({ error: 'No save file found. Open in mGBA and save in-game first.' });

  // Derive DVs from shiny save state filename
  const instDir = join(huntDir, `instance_${instance}`);
  const allStateFiles = existsSync(instDir) ? readdirSync(instDir).filter(f => f.endsWith('.ss1') && f !== 'rom.ss1') : [];
  const stateFile = allStateFiles[0] || '';
  const dvMatch = stateFile.match(/A(\d+)_D(\d+)_Sp(\d+)_Sc(\d+)/);
  const dvStr = dvMatch ? `A${dvMatch[1]}_D${dvMatch[2]}_Sp${dvMatch[3]}_Sc${dvMatch[4]}` : '';

  // Build catch bundle directory
  const game = hunt.game || 'Unknown';
  const folderName = [hunt.target_name, `hunt${hunt.id}`, dvStr].filter(Boolean).join('_');
  const catchGameDir = paths.catchGameDir(game);
  const catchDir = join(catchGameDir, folderName);
  mkdirSync(catchDir, { recursive: true });

  // Copy catch save (the one with the shiny caught)
  const catchDest = join(catchDir, 'catch.sav');
  copyFileSync(savPath, catchDest);

  // Copy base save (the one the hunt ran from)
  const baseSavPath = join(instDir, 'rom.sav');
  if (existsSync(baseSavPath)) {
    copyFileSync(baseSavPath, join(catchDir, 'base.sav'));
  }

  // Copy save state
  const stateFiles = readdirSync(instDir).filter((f: string) => f.endsWith('.ss1'));
  if (stateFiles.length > 0) {
    copyFileSync(join(instDir, stateFiles[0]), join(catchDir, 'shiny.ss1'));
  }

  // Write manifest
  const manifest = {
    game: hunt.game,
    species: hunt.target_name,
    species_id: hunt.target_species_id,
    dvs: dvStr,
    hunt_id: hunt.id,
    emulator: hunt.engine,
    caught_at: new Date().toISOString(),
    files: {
      base_save: existsSync(baseSavPath) ? 'base.sav' : null,
      catch_save: 'catch.sav',
      save_state: stateFiles.length > 0 ? 'shiny.ss1' : null,
    },
  };
  writeFileSync(join(catchDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Also register in save_files table
  const filename = `${folderName}/catch.sav`;
  const fileSize = statSync(catchDest).size;
  const insertResult = db.prepare(`
    INSERT INTO save_files (filename, file_path, game, file_size, source, notes)
    VALUES (?, ?, ?, ?, 'catch', ?)
    ON CONFLICT(file_path) DO UPDATE SET
      file_size = excluded.file_size,
      notes = excluded.notes
  `).run(filename, catchDest, hunt.game, fileSize, `Shiny ${hunt.target_name} catch from hunt #${hunt.id}${dvStr ? ` (DVs: ${dvStr})` : ''}`);

  // Get the save_file id whether we just inserted or updated
  const saveRow = db.prepare('SELECT id FROM save_files WHERE file_path = ?').get(catchDest) as any;
  const newSaveFileId = saveRow.id;

  // Create a checkpoint linked to the hunt's source save checkpoint
  let checkpointId: number | null = null;
  try {
    // Check if checkpoint already exists for this save
    const existingCheckpoint = db.prepare(
      'SELECT id FROM checkpoints WHERE save_file_id = ?'
    ).get(newSaveFileId) as { id: number } | undefined;

    if (existingCheckpoint) {
      checkpointId = existingCheckpoint.id;
    } else if (hunt.sav_path) {
      const sourceSave = db.prepare('SELECT id FROM save_files WHERE file_path = ?').get(hunt.sav_path) as { id: number } | undefined;
      if (sourceSave) {
        const sourceCheckpoint = db.prepare(
          'SELECT id, playthrough_id FROM checkpoints WHERE save_file_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(sourceSave.id) as { id: number; playthrough_id: number } | undefined;
        if (sourceCheckpoint) {
          const label = dvStr
            ? `Shiny ${hunt.target_name} (${dvStr})`
            : `Shiny ${hunt.target_name}`;
          let snapshot: string | null = null;
          try {
            snapshot = JSON.stringify(buildSnapshot(catchDest, hunt.game));
          } catch {
            // snapshot is optional — don't fail the whole endpoint if parsing fails
          }
          const cpResult = db.prepare(`
            INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, needs_confirmation, snapshot)
            VALUES (?, ?, ?, ?, 0, ?)
          `).run(sourceCheckpoint.playthrough_id, newSaveFileId, sourceCheckpoint.id, label, snapshot);
          checkpointId = Number(cpResult.lastInsertRowid);
        }
      }
    }
  } catch (err) {
    // Checkpoint creation is best-effort; log but don't fail the response
    console.error('[save-catch] checkpoint creation failed:', err);
  }

  // Mark hunt as archived — the catch is safely saved
  db.prepare('UPDATE hunts SET is_archived = 1 WHERE id = ?').run(hunt.id);

  res.json({ status: 'success', filename, path: catchDest, catchDir, checkpointId });
});

router.post('/:id/save-to-library', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const { instance, name } = req.body;
  if (!instance) return res.status(400).json({ error: 'instance required' });

  const huntDir = getHuntDir(hunt);
  const openDir = join(huntDir, `open_${instance}`);
  const savPath = join(openDir, 'rom.sav');
  if (!existsSync(savPath)) return res.status(404).json({ error: 'No save file found in open directory' });

  const game = hunt.game || 'Unknown';
  const destDir = paths.libraryGameDir(game);
  mkdirSync(destDir, { recursive: true });

  const saveName = name || `egg-hunt-${hunt.target_name.toLowerCase()}`;
  const destPath = join(destDir, `${saveName}.sav`);
  copyFileSync(savPath, destPath);

  // Register in save_files
  db.prepare(`
    INSERT OR IGNORE INTO save_files (filename, file_path, game, source, label)
    VALUES (?, ?, ?, 'library', ?)
  `).run(`${saveName}.sav`, destPath, game, saveName);

  // Get the save_file id whether we just inserted or it already existed
  const saveRow = db.prepare('SELECT id FROM save_files WHERE file_path = ?').get(destPath) as any;
  const newSaveId = saveRow?.id;

  // Find playthrough via the hunt's source save and advance its HEAD
  if (newSaveId) {
    // Find the checkpoint that was the source of this hunt
    const sourceCheckpoint = db.prepare(`
      SELECT c.id, c.playthrough_id FROM checkpoints c
      JOIN save_files sf ON c.save_file_id = sf.id
      WHERE sf.file_path = ?
      ORDER BY c.created_at DESC LIMIT 1
    `).get(hunt.sav_path) as any;

    if (sourceCheckpoint) {
      const newCp = db.prepare(`
        INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label)
        VALUES (?, ?, ?, ?)
      `).run(sourceCheckpoint.playthrough_id, newSaveId, sourceCheckpoint.id, saveName);

      db.prepare('UPDATE playthroughs SET active_checkpoint_id = ?, updated_at = datetime(?) WHERE id = ?')
        .run(newCp.lastInsertRowid, new Date().toISOString(), sourceCheckpoint.playthrough_id);
    }
  }

  res.json({ status: 'success', path: destPath, name: `${saveName}.sav` });
});

router.post('/:id/cleanup', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });
  if (hunt.status !== 'hit') return res.status(400).json({ error: 'Can only clean up completed hunts' });

  const huntDirPath = hunt.hunt_dir
    ? paths.huntDir(hunt.hunt_dir)
    : null;

  if (huntDirPath && existsSync(huntDirPath)) {
    for (const entry of readdirSync(huntDirPath)) {
      if (entry.startsWith('instance_') || entry.startsWith('open_')) {
        rmSync(join(huntDirPath, entry), { recursive: true, force: true });
      }
    }
  }

  db.prepare('UPDATE hunts SET is_archived = 1 WHERE id = ?').run(hunt.id);
  res.json({ success: true, archived: true });
});

router.post('/:id/open', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const { instance } = req.body;
  if (!instance) return res.status(400).json({ error: 'instance required' });

  const huntDir = getHuntDir(hunt);
  const instDir = join(huntDir, `instance_${instance}`);
  if (!existsSync(instDir)) return res.status(404).json({ error: 'Instance not found' });

  // Find the .ss1 state file (SHINY_*, BEST_*, or rom.ss1)
  const files = readdirSync(instDir);
  const stateFile = files.find(f => f.endsWith('.ss1') && f !== 'rom.ss1') || files.find(f => f === 'rom.ss1');

  // Must have at least a .sav to open
  const hasSav = existsSync(join(instDir, 'rom.sav'));
  if (!stateFile && !hasSav) return res.status(404).json({ error: 'No save state or save file found' });

  // Set up a temp dir with copies so originals stay intact
  const openDir = join(huntDir, `open_${instance}`);
  mkdirSync(openDir, { recursive: true });

  // Symlink ROM (never modified), copy save + state (save will be written to)
  const romSrc = existsSync(join(instDir, 'rom.gbc')) ? join(instDir, 'rom.gbc') : hunt.rom_path;
  const romDst = join(openDir, 'rom.gbc');
  const savDst = join(openDir, 'rom.sav');

  if (!existsSync(romDst)) symlinkSync(romSrc, romDst);
  const savSrc = join(instDir, 'rom.sav');
  copyFileSync(savSrc, savDst);
  // Preserve the source mtime on the destination. Without this, copyFileSync
  // stamps the destination with the current time, which would cause the
  // saveModified heuristic (open/rom.sav.mtime > instance/rom.sav.mtime) to
  // return true the instant /open is called — before the user has done
  // anything in mGBA. Backdating makes "user actually saved in-game" the
  // only way for the open file to become newer than the source.
  const savSrcStat = statSync(savSrc);
  utimesSync(savDst, savSrcStat.atime, savSrcStat.mtime);

  // Launch with save state if available, otherwise just ROM+sav
  const mgbaArgs = [romDst];
  if (stateFile) {
    const ssDst = join(openDir, 'rom.ss1');
    copyFileSync(join(instDir, stateFile), ssDst);
    mgbaArgs.push('-t', ssDst);
  }

  let mgbaBinary: string;
  try {
    mgbaBinary = getMgbaBinary();
  } catch (err) {
    if (err instanceof EmulatorNotInstalledError) {
      return res.status(400).json({ error: 'mGBA is not installed. Install it from Settings → Emulators.' });
    }
    throw err;
  }

  const child = spawn(mgbaBinary, mgbaArgs, {
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    stdio: 'ignore',
    detached: true,
  });
  registerProcess(child, 'Hunt-open-shiny');

  res.json({ ok: true, state_file: stateFile || null, pid: child.pid });
});

// Map game names to Checkpoint folder names on 3DS
const CHECKPOINT_FOLDERS: Record<string, string> = {
  'Red': '0x01710 Pokémon Red',
  'Blue': '0x01711 Pokémon Blue',
  'Yellow': '0x01712 Pokémon Yellow',
  'Gold': '0x01726 Pokémon Gold',
  'Silver': '0x01727 Pokémon Silver',
  'Crystal': '0x01728 Pokémon Crystal',
};

const THREE_DS_IP = '192.168.40.36';
const THREE_DS_PORT = 5000;

router.post('/:id/push-3ds', async (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  const { instance } = req.body;
  if (!instance) return res.status(400).json({ error: 'instance required' });

  const huntDir = getHuntDir(hunt);
  const openDir = join(huntDir, `open_${instance}`);
  const savPath = join(openDir, 'rom.sav');
  if (!existsSync(savPath)) return res.status(404).json({ error: 'No save file found. Open and save in-game first.' });

  // Build backup name: "Yellow - Pikachu - Shiny - A14_D10_Sp10_Sc10"
  const instDir = join(huntDir, `instance_${instance}`);
  const stateFiles = existsSync(instDir) ? readdirSync(instDir).filter(f => f.endsWith('.ss1') && f !== 'rom.ss1') : [];
  const stateFile = stateFiles[0] || '';

  // Parse DVs from state filename (e.g. SHINY_Pikachu_A14_D10_Sp10_Sc10.ss1)
  const dvMatch = stateFile.match(/A(\d+)_D(\d+)_Sp(\d+)_Sc(\d+)/);
  const dvStr = dvMatch ? `A${dvMatch[1]}_D${dvMatch[2]}_Sp${dvMatch[3]}_Sc${dvMatch[4]}` : '';
  const isShiny = stateFile.includes('SHINY');
  const backupName = [hunt.game, hunt.target_name, isShiny ? 'Shiny' : '', dvStr].filter(Boolean).join(' - ');

  const checkpointFolder = CHECKPOINT_FOLDERS[hunt.game];
  if (!checkpointFolder) return res.status(400).json({ error: `Unknown game: ${hunt.game}. Known: ${Object.keys(CHECKPOINT_FOLDERS).join(', ')}` });

  const result = await pushTo3DS(THREE_DS_IP, THREE_DS_PORT, savPath, checkpointFolder, backupName);
  res.json({ ...result, backupName });
});

router.get('/:id/stream', (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as any;
  if (!hunt) return res.status(404).json({ error: 'Hunt not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const watchers: FSWatcher[] = [];
  const logDir = join(getHuntDir(hunt), 'logs');

  // RNG hunts don't use log files — skip straight to orchestrator listener
  if (hunt.engine === 'rng') {
    const orchestrator = activeRNGHunts.get(hunt.id);
    if (orchestrator) {
      const onProgress = (progress: HuntProgress) => {
        res.write(`data: ${JSON.stringify({ type: "rng_progress", ...progress })}\n\n`);
      };
      orchestrator.on("progress", onProgress);
      req.on("close", () => {
        orchestrator.removeListener("progress", onProgress);
      });
    }
    return;
  }

  if (!existsSync(logDir)) { res.end(); return; }

  const logFiles = readdirSync(logDir).filter(f => f.endsWith('.log'));

  // Send recent logs on connect (last 5 lines per instance)
  for (const f of logFiles) {
    const filePath = join(logDir, f);
    if (!existsSync(filePath)) continue;
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').slice(-5);
      const inst = f.replace('.log', '').replace('instance_', '#');
      for (const line of lines) {
        if (line) res.write(`data: ${JSON.stringify({ instance: f, message: `[${inst}] ${line}` })}\n\n`);
      }
    } catch {}
  }

  for (const f of logFiles) {
    const filePath = join(logDir, f);
    let lastSize = existsSync(filePath) ? readFileSync(filePath, 'utf-8').length : 0;
    const inst = f.replace('.log', '').replace('instance_', '#');

    // Event-driven fs.watch — replaces watchFile(interval: 1000) which was
    // batching log lines for seconds at a time inside the compiled sidecar.
    const w = watch(filePath, () => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const newContent = content.slice(lastSize);
        lastSize = content.length;
        if (newContent.trim()) {
          const lines = newContent.trim().split('\n');
          for (const line of lines) {
            res.write(`data: ${JSON.stringify({ instance: f, message: `[${inst}] ${line}` })}\n\n`);
          }
        }
      } catch {}
    });
    watchers.push(w);
  }

  req.on('close', () => {
    for (const w of watchers) {
      try { w.close(); } catch {}
    }
  });
});

export default router;
