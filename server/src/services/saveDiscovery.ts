import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import { detectGame } from './saveParser.js';
import db from '../db.js';
import { paths } from '../paths.js';
import { extractGen1WorldState } from './gen1WorldState.js';
import { extractGen2WorldState } from './gen2WorldState.js';

function analyzeFile(filePath: string, game: string, gen: number | null): { playTimeSeconds: number | null; checksum: string | null } {
  try {
    const buf = readFileSync(filePath);
    const checksum = createHash('sha256').update(buf).digest('hex');
    let playTimeSeconds: number | null = null;
    if (gen === 1) playTimeSeconds = extractGen1WorldState(buf).playTimeSeconds;
    else if (gen === 2) playTimeSeconds = extractGen2WorldState(buf, game).playTimeSeconds;
    return { playTimeSeconds, checksum };
  } catch {
    return { playTimeSeconds: null, checksum: null };
  }
}

const LIBRARY_DIR = paths.libraryDir;
const CATCHES_DIR = paths.catchesDir;
const HUNTS_DIR = paths.huntsDir;

const SAVE_EXTENSIONS = new Set(['.sav', '.dat', '.sa2', '.ss1', '.srm']);

// ROM_MAP: game name → relative path from project root
export const ROM_MAP: Record<string, string> = {
  Red: 'roms/Pokemon Red.gb',
  Blue: 'roms/Pokemon Blue.gb',
  Yellow: 'roms/Pokemon Yellow.gbc',
  Gold: 'roms/Pokemon Gold.gbc',
  Silver: 'roms/Pokemon Silver.gbc',
  Crystal: 'roms/Pokemon Crystal.gbc',
  // Gen 3 — GBA
  Ruby: 'roms/Pokemon Ruby.gba',
  Sapphire: 'roms/Pokemon Sapphire.gba',
  Emerald: 'roms/Pokemon Emerald.gba',
  FireRed: 'roms/Pokemon FireRed.gba',
  LeafGreen: 'roms/Pokemon LeafGreen.gba',
  // Gen 4 — NDS
  Diamond: 'roms/Pokemon Diamond.nds',
  Pearl: 'roms/Pokemon Pearl.nds',
  Platinum: 'roms/Pokemon Platinum.nds',
  HeartGold: 'roms/Pokemon HeartGold.nds',
  SoulSilver: 'roms/Pokemon SoulSilver.nds',
  // Gen 5 — NDS
  Black: 'roms/Pokemon Black.nds',
  White: 'roms/Pokemon White.nds',
  'Black 2': 'roms/Pokemon Black 2.nds',
  'White 2': 'roms/Pokemon White 2.nds',
  // Gen 6 — 3DS
  X: 'roms/Pokemon X.3ds',
  Y: 'roms/Pokemon Y.3ds',
  'Omega Ruby': 'roms/Pokemon Omega Ruby.3ds',
  'Alpha Sapphire': 'roms/Pokemon Alpha Sapphire.3ds',
  // Gen 7 — 3DS
  Sun: 'roms/Pokemon Sun.3ds',
  Moon: 'roms/Pokemon Moon.3ds',
  'Ultra Sun': 'roms/Pokemon Ultra Sun.3ds',
  'Ultra Moon': 'roms/Pokemon Ultra Moon.3ds',
};

export interface DiscoveredSave {
  id: string;
  filePath: string;
  game: string;
  generation: number | null;
  label: string;
  source: 'checkpoint' | 'catch' | 'library' | 'hunt';
  format: string;
  fileSize: number;
  lastModified: string;
  launchable: boolean;
  romPath: string | null;
  playTimeSeconds: number | null;
  checksum: string | null;
}

function hashPath(filePath: string): string {
  return createHash('md5').update(filePath).digest('hex').slice(0, 16);
}

function scanCatches(): DiscoveredSave[] {
  const results: DiscoveredSave[] = [];
  if (!existsSync(CATCHES_DIR)) return results;

  for (const entry of readdirSync(CATCHES_DIR)) {
    const entryPath = join(CATCHES_DIR, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      // New structure: catches/{game}/{catch_folder}/catch.sav
      // or catches/{game}/{catch_folder}/base.sav
      for (const catchFolder of readdirSync(entryPath)) {
        const catchFolderPath = join(entryPath, catchFolder);
        if (!statSync(catchFolderPath).isDirectory()) {
          // Flat file inside game dir — handle like legacy
          scanCatchFile(catchFolderPath, results);
          continue;
        }
        // Look for catch.sav and base.sav inside the bundle folder
        for (const saveFile of ['catch.sav', 'base.sav']) {
          const filePath = join(catchFolderPath, saveFile);
          if (!existsSync(filePath)) continue;

          const stat = statSync(filePath);
          const detected = detectGame(filePath) || detectGame(entry) || detectGame(catchFolder);
          const game = detected?.game || entry; // entry is the game dir name
          const gen = detected?.gen || null;
          const label = saveFile === 'catch.sav' ? catchFolder : `${catchFolder} (base)`;

          const romRel = gen ? ROM_MAP[game] ?? null : null;
          const romPath = romRel ? join(paths.resourcesDir, romRel) : null;
          const { playTimeSeconds, checksum } = analyzeFile(filePath, game, gen);

          results.push({
            id: hashPath(filePath),
            filePath,
            game,
            generation: gen,
            label,
            source: 'catch',
            format: extname(saveFile),
            fileSize: stat.size,
            lastModified: stat.mtime.toISOString(),
            launchable: !!(romPath && existsSync(romPath)),
            romPath,
            playTimeSeconds,
            checksum,
          });
        }
      }
    } else {
      // Legacy flat file: catches/Crystal_Abra_hunt16.sav
      scanCatchFile(entryPath, results);
    }
  }
  return results;
}

function scanCatchFile(filePath: string, results: DiscoveredSave[]) {
  const file = basename(filePath);
  const ext = extname(file).toLowerCase();
  if (!SAVE_EXTENSIONS.has(ext)) return;

  const stat = statSync(filePath);
  const detected = detectGame(filePath) || detectGame(file);
  const game = detected?.game || 'Unknown';
  const gen = detected?.gen || null;

  const nameNoExt = basename(file, ext);
  const parts = nameNoExt.split('_');
  const label = parts.length >= 2 ? parts.slice(1).join(' ') : nameNoExt;

  const romRel = gen ? ROM_MAP[game] ?? null : null;
  const romPath = romRel ? join(paths.resourcesDir, romRel) : null;
  const { playTimeSeconds, checksum } = analyzeFile(filePath, game, gen);

  results.push({
    id: hashPath(filePath),
    filePath,
    game,
    generation: gen,
    label,
    source: 'catch',
    format: ext,
    fileSize: stat.size,
    lastModified: stat.mtime.toISOString(),
    launchable: !!(romPath && existsSync(romPath)),
    romPath,
    playTimeSeconds,
    checksum,
  });
}

function scanLibrary(): DiscoveredSave[] {
  const results: DiscoveredSave[] = [];
  if (!existsSync(LIBRARY_DIR)) return results;

  // Recurse into library: library/Crystal/*.sav, library/Moon/*/main
  function walk(dir: string, depth: number) {
    if (depth > 4) return;
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else {
        const ext = extname(entry).toLowerCase();
        const isMain = entry === 'main';
        if (!SAVE_EXTENSIONS.has(ext) && !isMain) continue;

        // Detect game from path components
        const relPath = fullPath.slice(LIBRARY_DIR.length + 1);
        const detected = detectGame(relPath);
        const game = detected?.game || 'Unknown';
        const gen = detected?.gen || null;

        // Label from parent dir or filename
        const parentDir = basename(join(fullPath, '..'));
        const label = isMain ? parentDir : basename(entry, ext);

        const romRel = gen ? ROM_MAP[game] ?? null : null;
        const romPath = romRel ? join(paths.resourcesDir, romRel) : null;
        const { playTimeSeconds, checksum } = analyzeFile(fullPath, game, gen);

        results.push({
          id: hashPath(fullPath),
          filePath: fullPath,
          game,
          generation: gen,
          label,
          source: 'library',
          format: isMain ? 'main' : ext,
          fileSize: stat.size,
          lastModified: stat.mtime.toISOString(),
          launchable: !!(romPath && existsSync(romPath)),
          romPath,
          playTimeSeconds,
          checksum,
        });
      }
    }
  }
  walk(LIBRARY_DIR, 0);
  return results;
}

function scanHuntOpens(): DiscoveredSave[] {
  const results: DiscoveredSave[] = [];
  if (!existsSync(HUNTS_DIR)) return results;

  for (const huntDir of readdirSync(HUNTS_DIR)) {
    const huntPath = join(HUNTS_DIR, huntDir);
    if (!statSync(huntPath).isDirectory()) continue;

    // Must have at least one open_* subdirectory to be relevant
    let hasOpenDir = false;
    try {
      hasOpenDir = readdirSync(huntPath).some(e => e.startsWith('open_'));
    } catch { continue; }
    if (!hasOpenDir) continue;

    for (const openDir of readdirSync(huntPath)) {
      if (!openDir.startsWith('open_')) continue;
      const openPath = join(huntPath, openDir);
      if (!statSync(openPath).isDirectory()) continue;

      // Look for rom.sav
      const savPath = join(openPath, 'rom.sav');
      if (!existsSync(savPath)) continue;

      const stat = statSync(savPath);
      // Try to find ROM to detect game
      const romGbc = join(openPath, 'rom.gbc');
      const romGb = join(openPath, 'rom.gb');
      const hasRom = existsSync(romGbc) || existsSync(romGb);

      // Look up game from hunts DB table by hunt_dir column, falling back to legacy id extraction
      const huntRow = (
        db.prepare('SELECT game FROM hunts WHERE hunt_dir = ?').get(huntDir) ||
        (huntDir.startsWith('hunt_') ? db.prepare('SELECT game FROM hunts WHERE id = ?').get(huntDir.replace('hunt_', '')) : null)
      ) as any;
      const detected = huntRow ? detectGame(huntRow.game) : null;
      const game = detected?.game || huntRow?.game || 'Unknown';
      const gen = detected?.gen || null;

      const { playTimeSeconds, checksum } = analyzeFile(savPath, game, gen);

      results.push({
        id: hashPath(savPath),
        filePath: savPath,
        game,
        generation: gen,
        label: `${huntDir} ${openDir}`,
        source: 'hunt',
        format: '.sav',
        fileSize: stat.size,
        lastModified: stat.mtime.toISOString(),
        launchable: hasRom,
        romPath: hasRom ? (existsSync(romGbc) ? romGbc : romGb) : null,
        playTimeSeconds,
        checksum,
      });
    }
  }
  return results;
}

export function discoverAllSaves(): DiscoveredSave[] {
  return [
    ...scanCatches(),
    ...scanLibrary(),
    ...scanHuntOpens(),
  ];
}
