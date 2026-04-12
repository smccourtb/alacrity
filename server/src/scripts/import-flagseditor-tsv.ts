/**
 * Imports flag definitions from FlagsEditorEXPlugin TSV files (Gen 4-7).
 * Fetches from: https://github.com/fattard/FlagsEditorEXPlugin/tree/main/flagslist
 *
 * Usage: npx tsx src/scripts/import-flagseditor-tsv.ts <game>
 *   game: diamond, pearl, platinum, heartgold, soulsilver,
 *         black, white, black2, white2,
 *         x, y, omegaruby, alphasapphire,
 *         ultrasun, ultramoon
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://raw.githubusercontent.com/fattard/FlagsEditorEXPlugin/main/flagslist/';

// Maps our game names to the TSV filename in the repo.
// Pearl/White/Y/AlphaSapphire/UltraMoon share the same flags as their counterparts.
const GAME_TSV_MAP: Record<string, string> = {
  diamond:       'flags_gen4dp_en.txt',
  pearl:         'flags_gen4dp_en.txt',
  platinum:      'flags_gen4pt_en.txt',
  heartgold:     'flags_gen4hgss_en.txt',
  soulsilver:    'flags_gen4hgss_en.txt',
  black:         'flags_gen5bw_en.txt',
  white:         'flags_gen5bw_en.txt',
  black2:        'flags_gen5b2w2_en.txt',
  white2:        'flags_gen5b2w2_en.txt',
  x:             'flags_gen6xy_en.txt',
  y:             'flags_gen6xy_en.txt',
  omegaruby:     'flags_gen6oras_en.txt',
  alphasapphire: 'flags_gen6oras_en.txt',
  ultrasun:      'flags_gen7usum_en.txt',
  ultramoon:     'flags_gen7usum_en.txt',
};

const VALID_GAMES = Object.keys(GAME_TSV_MAP);

interface FlagDefinition {
  index: number;
  name: string;
  category: string;
  location_key?: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Category normalization
// ---------------------------------------------------------------------------

function normalizeCategory(raw: string): string | null {
  const s = raw.trim();
  if (s === '_UNUSED' || s.endsWith('_UNUSED')) return null;

  switch (s) {
    case 'TRAINER BATTLE': return 'trainer';
    case 'FIELD ITEM':     return 'item';
    case 'HIDDEN ITEM':    return 'hidden_item';
    case 'ITEM GIFT':      return 'gift';
    case 'PKMN GIFT':      return 'gift_pokemon';
    case 'STATIC ENCOUNTER': return 'encounter';
    case 'IN-GAME TRADE':  return 'trade';
    case 'EVENT':          return 'event';
    case 'SIDE QUEST':     return 'side_quest';
  }
  if (s.startsWith('SUB')) return 'side_quest';
  if (s === '') return 'event';

  // Generic fallback: lowercase, replace non-alphanumeric runs with underscores
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ---------------------------------------------------------------------------
// Location key conversion
// ---------------------------------------------------------------------------

function toLocationKey(raw: string): string | undefined {
  const s = raw.trim();
  if (!s || s === '-' || s.toLowerCase() === 'n/a') return undefined;

  // Lowercase, replace spaces and special chars with hyphens, collapse/trim
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// TSV parser
// ---------------------------------------------------------------------------

function parseTsv(text: string, game: string): FlagDefinition[] {
  const flags: FlagDefinition[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split on tabs — columns are tab-separated
    const cols = line.split('\t');

    // First column is always the hex index
    const hexStr = cols[0]?.trim();
    if (!hexStr || !hexStr.startsWith('0x')) continue;

    const index = parseInt(hexStr, 16);
    if (isNaN(index)) continue;

    // Second column is the category
    const rawCategory = cols[1]?.trim() ?? '';
    const category = normalizeCategory(rawCategory);

    // Skip unused flags
    if (category === null) continue;

    // Remaining columns: the format has 2-4 columns total.
    // Col 2 may be location, col 3 may be description/name, col 4 may be flag name.
    // The flag name (identifier like FH_01, TR_xxx) is always the LAST non-empty column.
    // Location is the second-to-last if there are 4+ columns, otherwise col 2 if it looks
    // like a place name (not all-caps identifier).

    let locationKey: string | undefined;
    let name: string;

    // Gather remaining cols (indices 2+), drop empties
    const rest = cols.slice(2).map(c => c.trim()).filter(c => c.length > 0);

    if (rest.length === 0) {
      // No name — skip
      continue;
    } else if (rest.length === 1) {
      // Only a name, no location
      name = rest[0];
    } else {
      // Last element is the flag name/identifier, preceding ones contribute to location+description
      name = rest[rest.length - 1];
      // Location: join all preceding parts (could be "Valley Windworks" + "Found Max Elixir")
      // We only use the first part as location key (which is typically the place name)
      locationKey = toLocationKey(rest[0]);
    }

    if (!name) continue;

    flags.push({
      index,
      name,
      category,
      ...(locationKey ? { location_key: locationKey } : {}),
      source: `flagseditor-${game}`,
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const gameArg = process.argv[2];
  if (!gameArg || !VALID_GAMES.includes(gameArg)) {
    console.error(`Usage: npx tsx import-flagseditor-tsv.ts <game>`);
    console.error(`Valid games: ${VALID_GAMES.join(', ')}`);
    process.exit(1);
  }

  const game = gameArg;
  const tsvFile = GAME_TSV_MAP[game];
  const url = BASE_URL + tsvFile;

  console.log(`Game:     ${game}`);
  console.log(`TSV file: ${tsvFile}`);
  console.log(`Fetching: ${url}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching ${url}`);
  }
  const text = await resp.text();
  console.log(`Fetched ${text.split('\n').length} lines.`);

  const flags = parseTsv(text, game);
  console.log(`Parsed ${flags.length} flag definitions.`);

  if (flags.length < 100) {
    console.warn(`WARNING: only ${flags.length} flags parsed — may indicate a format mismatch`);
  }

  // Sample output
  console.log('First 5 flags:');
  for (const f of flags.slice(0, 5)) {
    console.log(`  [0x${f.index.toString(16).padStart(3, '0')}] ${f.name} (${f.category})${f.location_key ? ` → ${f.location_key}` : ''}`);
  }
  console.log('Last 5 flags:');
  for (const f of flags.slice(-5)) {
    console.log(`  [0x${f.index.toString(16).padStart(3, '0')}] ${f.name} (${f.category})${f.location_key ? ` → ${f.location_key}` : ''}`);
  }

  const maxIndex = Math.max(...flags.map(f => f.index));
  console.log(`Max flag index: ${maxIndex} (0x${maxIndex.toString(16).toUpperCase()})`);

  const outDir = join(__dirname, '../data/flags');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${game}.json`);
  writeFileSync(outPath, JSON.stringify(flags, null, 2) + '\n');
  console.log(`Written to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
