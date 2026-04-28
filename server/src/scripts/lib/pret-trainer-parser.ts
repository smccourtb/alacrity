/**
 * Parses pret trainer data into a normalized shape.
 *
 * Works for gen2 (pokecrystal, pokegold). Both use the same format:
 *   - data/trainers/parties.asm groups like `WhitneyGroup:` with
 *     `db "INSTANCE@", TRAINERTYPE_*` blocks and `db level, SPECIES, ...` rows.
 *   - maps/<Name>.asm reference trainers via `trainer CLASS, INSTANCE, ...`
 *     or `loadtrainer CLASS, INSTANCE`.
 *
 * Gen1 (pokered, pokeyellow) uses a different scheme (numbered trainer
 * indices embedded in object event data) — returns [] for those and logs
 * a warning. A gen1 parser is TODO; the orchestrator (Task 11) falls back
 * gracefully when no trainers are returned.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ParsedTrainer {
  trainer_class: string;
  trainer_name: string;
  instance: string;  // original pret instance identifier (e.g. "EXECUTIVEM_1")
  party: Array<{ species: string; level: number }>;
  map_name: string; // pret CamelCase filename without .asm
  // Pret EVENT_BEAT_* flag in `wEventFlags`. Standard `trainer` macros embed
  // it as their third arg; gym-leader `loadtrainer` macros pair with a
  // `setevent EVENT_BEAT_*` later in the same battle script (forward-scanned).
  event_flag: string | null;
}

export async function parseTrainersFromPret(pretRoot: string): Promise<ParsedTrainer[]> {
  const partiesFile = join(pretRoot, 'data/trainers/parties.asm');
  const mapsDir = join(pretRoot, 'maps');

  if (!existsSync(partiesFile)) {
    console.warn(`[trainer-parser] ${pretRoot}: no data/trainers/parties.asm (gen1?), skipping`);
    return [];
  }
  if (!existsSync(mapsDir)) {
    console.warn(`[trainer-parser] ${pretRoot}: no maps/ dir, skipping`);
    return [];
  }

  const { parties, duplicateNames } = await parseParties(partiesFile);
  const assignments = await parseMapAssignments(mapsDir);

  const results: ParsedTrainer[] = [];
  for (const { mapName, trainerClass, instance, eventFlag } of assignments) {
    // Map refs use either the db-string name (LASS, CARRIE) or a numbered
    // constant like WHITNEY1 that resolves to the 1-indexed ordinal in its
    // group. Try the direct string first, then fall back to class+ordinal.
    // Try the raw class first (BLACKBELT_T), then strip Crystal's `_T/_F/_M`
    // disambiguator suffix (BLACKBELT — matches `BlackbeltGroup` in parties).
    const classCandidates = [trainerClass, trainerClass.replace(/_[TFM]$/, '')];
    let party: { name: string; members: Array<{ species: string; level: number }> } | undefined;
    let resolvedName = instance;
    let ordinal: number | null = null;
    let resolvedClass = trainerClass;
    for (const candClass of classCandidates) {
      party = parties.get(`${candClass}:${instance}`);
      if (party) { resolvedClass = candClass; break; }
    }
    if (!party) {
      const ordinalMatch = instance.match(/^(.*?)(\d+)$/);
      if (ordinalMatch) {
        ordinal = parseInt(ordinalMatch[2], 10);
        for (const candClass of classCandidates) {
          const byOrd = parties.get(`${candClass}:#${ordinal}`);
          if (byOrd) { party = byOrd; resolvedName = byOrd.name; resolvedClass = candClass; break; }
        }
      }
    }
    if (!party) continue;
    // Disambiguate shared-name instances: every GRUNTM group entry uses the
    // db-string "GRUNT@" so the resolved name collides. Suffix with the
    // map-ref ordinal so they stay distinct per encounter.
    if (duplicateNames.has(`${trainerClass}:${resolvedName}`) && ordinal != null) {
      resolvedName = `${resolvedName} #${ordinal}`;
    }
    results.push({
      trainer_class: trainerClass,
      trainer_name: resolvedName,
      instance,
      party: party.members,
      map_name: mapName,
      event_flag: eventFlag,
    });
  }
  return results;
}

function camelToUpperSnake(s: string): string {
  // FalknerGroup → FALKNER; MrMimeGroup → MR_MIME
  const noSuffix = s.replace(/Group$/, '');
  return noSuffix
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

async function parseParties(file: string): Promise<{
  parties: Map<string, { name: string; members: Array<{ species: string; level: number }> }>;
  duplicateNames: Set<string>;
}> {
  const text = await readFile(file, 'utf-8');
  const out = new Map<string, { name: string; members: Array<{ species: string; level: number }> }>();
  const seen = new Map<string, number>(); // "CLASS:name" → count
  const duplicateNames = new Set<string>();

  // Split into top-level groups: lines matching `<Label>Group:` at column 0
  const lines = text.split('\n');
  let currentClass: string | null = null;
  let currentInstance: string | null = null;
  let currentOrdinal = 0;
  let currentMembers: Array<{ species: string; level: number }> = [];

  const flush = () => {
    if (currentClass && currentInstance && currentMembers.length) {
      const entry = { name: currentInstance, members: currentMembers };
      out.set(`${currentClass}:${currentInstance}`, entry);
      out.set(`${currentClass}:#${currentOrdinal}`, entry);
      // Map refs use the no-underscore convention (GRUNTM, EXECUTIVEM) while
      // camelToUpperSnake produces underscored (GRUNT_M, EXECUTIVE_M). Index
      // both so trainer lookups from the map side resolve.
      const normClass = currentClass.replace(/_/g, '');
      if (normClass !== currentClass) {
        out.set(`${normClass}:${currentInstance}`, entry);
        out.set(`${normClass}:#${currentOrdinal}`, entry);
      }
      const seenKey = `${currentClass}:${currentInstance}`;
      const count = (seen.get(seenKey) ?? 0) + 1;
      seen.set(seenKey, count);
      if (count > 1) {
        duplicateNames.add(seenKey);
        if (normClass !== currentClass) duplicateNames.add(`${normClass}:${currentInstance}`);
      }
    }
    currentInstance = null;
    currentMembers = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/;.*$/, '').trimEnd();

    const groupMatch = line.match(/^([A-Za-z0-9_]+Group):\s*$/);
    if (groupMatch) {
      flush();
      currentClass = camelToUpperSnake(groupMatch[1]);
      currentOrdinal = 0;
      continue;
    }

    // Instance header: `db "NAME@", TRAINERTYPE_*`
    const instMatch = line.match(/^\s*db\s+"([^"@]+)@?",\s*TRAINERTYPE_\w+/);
    if (instMatch && currentClass) {
      flush();
      currentInstance = instMatch[1];
      currentOrdinal += 1;
      continue;
    }

    // Party member: `db LEVEL, SPECIES, ...`
    const memberMatch = line.match(/^\s*db\s+(\d+),\s*([A-Z][A-Z0-9_]*)/);
    if (memberMatch && currentInstance) {
      const species = memberMatch[2];
      if (species === 'NO_MOVE' || species.startsWith('TRAINERTYPE_')) continue;
      currentMembers.push({ species, level: parseInt(memberMatch[1], 10) });
      continue;
    }

    // end marker `db -1`
    if (/^\s*db\s+-1\b/.test(line) && currentInstance) {
      flush();
    }
  }
  flush();

  return { parties: out, duplicateNames };
}

async function parseMapAssignments(mapsDir: string): Promise<Array<{ mapName: string; trainerClass: string; instance: string; eventFlag: string | null }>> {
  const files = await readdir(mapsDir);
  const out: Array<{ mapName: string; trainerClass: string; instance: string; eventFlag: string | null }> = [];
  // Standard NPC trainer: `trainer CLASS, INSTANCE, EVENT_BEAT_*, seenText, beatenText, ...`
  const trainerRe = /^\s*trainer\s+([A-Z][A-Z0-9_]*)\s*,\s*([A-Z][A-Z0-9_]*)\s*,\s*(EVENT_[A-Z0-9_]+)/gm;
  // Gym-leader/special battles: `loadtrainer CLASS, INSTANCE` — no inline event,
  // but the surrounding battle script issues `setevent EVENT_BEAT_*` after the
  // battle returns. Forward-scan up to a reasonable window for that pairing.
  const loadRe = /^\s*loadtrainer\s+([A-Z][A-Z0-9_]*)\s*,\s*([A-Z][A-Z0-9_]*)/gm;
  const setEventRe = /^\s*setevent\s+(EVENT_BEAT_[A-Z0-9_]+)/;
  // Strip trailing digits to normalize rematch instances. Pret uses TULLY1
  // for the first encounter (with EVENT) and TULLY2/TULLY3 as rematch parties
  // invoked via loadtrainer — same logical trainer, no separate flag.
  const normalizeInstance = (s: string) => s.replace(/\d+$/, '');
  for (const f of files) {
    if (!f.endsWith('.asm')) continue;
    const mapName = f.replace(/\.asm$/, '');
    const text = await readFile(join(mapsDir, f), 'utf-8');
    let m;
    const trainerKeys = new Set<string>();
    trainerRe.lastIndex = 0;
    while ((m = trainerRe.exec(text)) != null) {
      out.push({ mapName, trainerClass: m[1], instance: m[2], eventFlag: m[3] });
      trainerKeys.add(`${m[1]}:${normalizeInstance(m[2])}`);
    }
    // For loadtrainer matches, suppress those that duplicate a `trainer` entry
    // for the same class + normalized instance (rematch parties). Otherwise,
    // forward-scan for a paired `setevent EVENT_BEAT_*` (gym leaders).
    const lines = text.split('\n');
    loadRe.lastIndex = 0;
    while ((m = loadRe.exec(text)) != null) {
      const norm = normalizeInstance(m[2]);
      if (trainerKeys.has(`${m[1]}:${norm}`)) continue;
      const lineNum = text.slice(0, m.index).split('\n').length;
      let eventFlag: string | null = null;
      for (let li = lineNum; li < Math.min(lineNum + 30, lines.length); li++) {
        const ln = lines[li].replace(/;.*$/, '');
        const se = ln.match(setEventRe);
        if (se) { eventFlag = se[1]; break; }
      }
      out.push({ mapName, trainerClass: m[1], instance: m[2], eventFlag });
      trainerKeys.add(`${m[1]}:${norm}`);
    }
  }
  return out;
}
