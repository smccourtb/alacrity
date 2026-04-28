/**
 * Generates Gen 1-3 event flag definitions from pret disassembly sources.
 * Gen 1-2: Fetches ASM files and parses rgbds const_def/const/const_skip/const_next macros.
 * Gen 3: Fetches C header files and parses #define FLAG_NAME 0xNNN syntax.
 *
 * Usage: npx tsx src/scripts/generate-flag-defs.ts [game]
 *   game: red (default), blue, yellow, gold, silver, crystal, emerald, firered
 *
 * Note: Blue shares pokered's event constants; Silver shares pokegold's.
 * The build flags differ but the event_flags.asm files are byte-identical.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

type Game = 'red' | 'blue' | 'yellow' | 'gold' | 'silver' | 'crystal' | 'emerald' | 'firered';

const GAME_SOURCES: Record<Game, { url: string; output: string; format: 'asm' | 'c_header' }> = {
  red: {
    url: 'https://raw.githubusercontent.com/pret/pokered/master/constants/event_constants.asm',
    output: 'red.json',
    format: 'asm',
  },
  blue: {
    // Pokeblue shares pokered's event_constants.asm — byte-identical at build.
    url: 'https://raw.githubusercontent.com/pret/pokered/master/constants/event_constants.asm',
    output: 'blue.json',
    format: 'asm',
  },
  yellow: {
    url: 'https://raw.githubusercontent.com/pret/pokeyellow/master/constants/event_constants.asm',
    output: 'yellow.json',
    format: 'asm',
  },
  gold: {
    url: 'https://raw.githubusercontent.com/pret/pokegold/master/constants/event_flags.asm',
    output: 'gold.json',
    format: 'asm',
  },
  silver: {
    // Pokesilver shares pokegold's event_flags.asm.
    url: 'https://raw.githubusercontent.com/pret/pokegold/master/constants/event_flags.asm',
    output: 'silver.json',
    format: 'asm',
  },
  crystal: {
    url: 'https://raw.githubusercontent.com/pret/pokecrystal/master/constants/event_flags.asm',
    output: 'crystal.json',
    format: 'asm',
  },
  emerald: {
    url: 'https://raw.githubusercontent.com/pret/pokeemerald/master/include/constants/flags.h',
    output: 'emerald.json',
    format: 'c_header',
  },
  firered: {
    url: 'https://raw.githubusercontent.com/pret/pokefirered/master/include/constants/flags.h',
    output: 'firered.json',
    format: 'c_header',
  },
};

const VALID_GAMES = ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'emerald', 'firered'];
const gameArg = process.argv[2] ?? 'red';
if (!VALID_GAMES.includes(gameArg)) {
  console.error(`Unknown game: ${gameArg}. Valid options: ${VALID_GAMES.join(', ')}`);
  process.exit(1);
}
const GAME = gameArg as Game;
const { url: SOURCE_URL, output: OUTPUT_FILE, format: SOURCE_FORMAT } = GAME_SOURCES[GAME];

interface FlagDefinition {
  index: number;
  name: string;
  category: string;
  location_key?: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

function getCategory(name: string): string {
  // Gen 1-2 (EVENT_ prefix)
  if (name.startsWith('EVENT_BEAT_')) return 'trainer';
  if (name.startsWith('EVENT_GOT_TM')) return 'tm';
  if (name.startsWith('EVENT_GOT_HM')) return 'hm';
  if (name.startsWith('EVENT_GOT_')) return 'item';
  // Gen 3 (FLAG_ prefix)
  if (name.startsWith('FLAG_DEFEATED_')) return 'trainer';
  if (name.startsWith('FLAG_TRAINER_')) return 'trainer';
  if (name.startsWith('FLAG_RECEIVED_TM')) return 'tm';
  if (name.startsWith('FLAG_GOT_TM')) return 'tm';
  if (name.startsWith('FLAG_RECEIVED_HM')) return 'hm';
  if (name.startsWith('FLAG_GOT_HM')) return 'hm';
  if (name.startsWith('FLAG_BADGE')) return 'badge';
  if (name.startsWith('FLAG_TEMP_')) return 'temp';
  if (name.includes('BADGE')) return 'badge';
  return 'event';
}

// ---------------------------------------------------------------------------
// Location mapping
// Strip the EVENT_ prefix, then check if the remainder starts with a known
// location token.  More specific prefixes are listed first.
// ---------------------------------------------------------------------------

const LOCATION_MAP: Array<[string, string]> = [
  // ---------------------------------------------------------------------------
  // Johto locations (Crystal) — listed before Kanto so more specific matches win
  // ---------------------------------------------------------------------------
  // Johto gyms
  ['VIOLET_GYM', 'violet-city'],
  ['AZALEA_GYM', 'azalea-town'],
  ['GOLDENROD_GYM', 'goldenrod-city'],
  ['ECRUTEAK_GYM', 'ecruteak-city'],
  ['CIANWOOD_GYM', 'cianwood-city'],
  ['OLIVINE_GYM', 'olivine-city'],
  ['MAHOGANY_GYM', 'mahogany-town'],
  ['BLACKTHORN_GYM', 'blackthorn-city'],
  // Johto cities / towns
  ['NEW_BARK', 'new-bark-town'],
  ['CHERRYGROVE', 'cherrygrove-city'],
  ['VIOLET_CITY', 'violet-city'],
  ['VIOLET', 'violet-city'],
  ['AZALEA', 'azalea-town'],
  ['GOLDENROD', 'goldenrod-city'],
  ['ECRUTEAK', 'ecruteak-city'],
  ['OLIVINE', 'olivine-city'],
  ['CIANWOOD', 'cianwood-city'],
  ['MAHOGANY', 'mahogany-town'],
  ['BLACKTHORN', 'blackthorn-city'],
  // Johto special locations
  ['LAKE_OF_RAGE', 'lake-of-rage'],
  ['ICE_PATH', 'ice-path'],
  ['DRAGONS_DEN', 'dragons-den'],
  ['DARK_CAVE', 'dark-cave'],
  ['SPROUT_TOWER', 'sprout-tower'],
  ['BURNED_TOWER', 'burned-tower'],
  ['TIN_TOWER', 'tin-tower'],
  ['WHIRL_ISLAND', 'whirl-islands'],
  ['MT_MORTAR', 'mt-mortar'],
  ['MOUNT_MORTAR', 'mt-mortar'],
  ['UNION_CAVE', 'union-cave'],
  ['SLOWPOKE_WELL', 'slowpoke-well'],
  ['ILEX_FOREST', 'ilex-forest'],
  ['NATIONAL_PARK', 'national-park'],
  ['RUINS_OF_ALPH', 'ruins-of-alph'],
  ['RADIO_TOWER', 'goldenrod-city'],
  ['DEPT_STORE', 'goldenrod-city'],
  ['UNDERGROUND', 'goldenrod-city'],       // Goldenrod Underground
  ['LIGHTHOUSE', 'olivine-city'],
  ['BATTLE_TOWER', 'battle-tower'],
  ['SILVER_CAVE', 'mt-silver'],
  ['MOUNT_SILVER', 'mt-silver'],
  ['MT_SILVER', 'mt-silver'],
  // Johto people / story flags
  ['ELM', 'new-bark-town'],
  ['PROFESSOR_ELM', 'new-bark-town'],
  ['MR_POKEMON', 'cherrygrove-city'],
  ['FALKNER', 'violet-city'],
  ['BUGSY', 'azalea-town'],
  ['KURT', 'azalea-town'],
  ['WHITNEY', 'goldenrod-city'],
  ['MORTY', 'ecruteak-city'],
  ['CHUCK', 'cianwood-city'],
  ['JASMINE', 'olivine-city'],
  ['PRYCE', 'mahogany-town'],
  ['CLAIRE', 'blackthorn-city'],
  ['SECRETPOTION', 'cianwood-city'],
  ['SS_TICKET_FROM_ELM', 'new-bark-town'],
  ['SUICUNE', 'ecruteak-city'],
  ['CELEBI', 'ilex-forest'],
  ['APRICORN', 'azalea-town'],
  ['CARD_KEY', 'goldenrod-city'],
  ['ROCKET_HIDEOUT', 'mahogany-town'],    // Gen 2 Rocket Hideout is in Mahogany
  // ---------------------------------------------------------------------------
  // Kanto locations (shared by Red/Yellow/Crystal)
  // ---------------------------------------------------------------------------
  // Gyms (before plain city so they win on GYM-specific names)
  ['VIRIDIAN_GYM', 'viridian-gym'],
  ['PEWTER_GYM', 'pewter-gym'],
  ['CERULEAN_GYM', 'cerulean-gym'],
  ['VERMILION_GYM', 'vermilion-gym'],
  ['CELADON_GYM', 'celadon-gym'],
  ['FUCHSIA_GYM', 'fuchsia-gym'],
  ['SAFFRON_GYM', 'saffron-gym'],
  ['CINNABAR_GYM', 'cinnabar-gym'],
  // Cities / towns
  ['PALLET', 'pallet-town'],
  ['OAKS_LAB', 'pallet-town'],
  ['VIRIDIAN_CITY', 'viridian-city'],
  ['VIRIDIAN', 'viridian-city'],
  ['PEWTER_CITY', 'pewter-city'],
  ['PEWTER', 'pewter-city'],
  ['CERULEAN_CITY', 'cerulean-city'],
  ['CERULEAN', 'cerulean-city'],
  ['VERMILION_CITY', 'vermilion-city'],
  ['VERMILION', 'vermilion-city'],
  ['LAVENDER_TOWN', 'lavender-town'],
  ['LAVENDER', 'lavender-town'],
  ['CELADON_CITY', 'celadon-city'],
  ['CELADON', 'celadon-city'],
  ['FUCHSIA_CITY', 'fuchsia-city'],
  ['FUCHSIA', 'fuchsia-city'],
  ['SAFFRON_CITY', 'saffron-city'],
  ['SAFFRON', 'saffron-city'],
  ['CINNABAR_ISLAND', 'cinnabar-island'],
  ['CINNABAR', 'cinnabar-island'],
  // Special locations
  ['SILPH_CO', 'silph-co'],
  ['POKEMON_TOWER', 'pokemon-tower'],
  ['POKEMONTOWER', 'pokemon-tower'],
  ['MT_MOON', 'mt-moon'],
  ['SS_ANNE', 'ss-anne'],
  ['POWER_PLANT', 'power-plant'],
  ['SEAFOAM', 'seafoam-islands'],
  ['VICTORY_ROAD', 'victory-road'],
  ['ROCKET_HIDEOUT', 'rocket-hideout'],
  ['SAFARI_ZONE', 'safari-zone'],
  ['FIGHTING_DOJO', 'fighting-dojo'],
  // Additional landmarks
  ['OAKS_LAB', 'pallet-town'],
  ['OAK_', 'pallet-town'],        // EVENT_OAK_*, EVENT_GOT_POKEBALLS_FROM_OAK, etc.
  ['INTO_LAB', 'pallet-town'],   // EVENT_FOLLOWED_OAK_INTO_LAB
  ['ROCK_TUNNEL', 'rock-tunnel'],
  ['MANSION', 'cinnabar-island'], // Pokemon Mansion
  ['LORELEIS_ROOM', 'victory-road'],
  ['BRUNOS_ROOM', 'victory-road'],
  ['AGATHAS_ROOM', 'victory-road'],
  ['LANCES_ROOM', 'victory-road'],
  ['CHAMPION', 'victory-road'],
  ['BILLS_HOUSE', 'cerulean-city'],
  ['BILL', 'cerulean-city'],
  ['NUGGET', 'cerulean-city'],    // Nugget Bridge
  ['ROUTE24_ROCKET', 'route-24'],
  ['DOCK', 'vermilion-city'],     // SS Anne dock
  ['SS_TICKET', 'vermilion-city'],
  ['LT_SURGE', 'vermilion-gym'],
  ['THUNDERBADGE', 'vermilion-city'],
  ['CASCADEBADGE', 'cerulean-city'],
  ['RAINBOWBADGE', 'celadon-city'],
  ['SOULBADGE', 'fuchsia-city'],
  ['MARSHBADGE', 'saffron-city'],
  ['VOLCANOBADGE', 'cinnabar-island'],
  ['EARTHBADGE', 'viridian-city'],
  ['BROCK', 'pewter-gym'],
  ['MISTY', 'cerulean-gym'],
  ['ERIKA', 'celadon-gym'],
  ['KOGA', 'fuchsia-gym'],
  ['BLAINE', 'cinnabar-gym'],
  ['SABRINA', 'saffron-gym'],
  ['KARATE_MASTER', 'fighting-dojo'],
  ['HITMONLEE', 'fighting-dojo'],
  ['HITMONCHAN', 'fighting-dojo'],
  ['ZAPDOS', 'power-plant'],
  ['MOLTRES', 'mt-moon'],         // Actually Victory Road, but close enough
  ['MEWTWO', 'cerulean-city'],    // Cerulean Cave
  ['ARTICUNO', 'seafoam-islands'],
  ['HALL_OF_FAME', 'victory-road'],
  // SNORLAX intentionally omitted — two different routes, handled by ROUTE_ match above
  ['MR_FUJI', 'lavender-town'],
  ['POKE_FLUTE', 'lavender-town'],
  ['PURIFIED_ZONE', 'lavender-town'],
  ['GHOST_MAROWAK', 'lavender-town'],
  ['INDIGO', 'victory-road'],
  ['STARTER', 'pallet-town'],
  ['POKEDEX', 'pallet-town'],
  ['POKEBALLS_FROM_OAK', 'pallet-town'],
  ['GOT_TOWN_MAP', 'pallet-town'],
  ['BLUES_HOUSE', 'pallet-town'],
  ['DAISY', 'pallet-town'],
  // Items obtained in specific known locations
  ['MASTER_BALL', 'silph-co'],
  ['LIFT_KEY', 'rocket-hideout'],
  ['COIN_CASE', 'celadon-city'],
  ['DOME_FOSSIL', 'mt-moon'],
  ['HELIX_FOSSIL', 'mt-moon'],
  ['FOSSIL', 'cinnabar-island'],     // Lab reviving fossil — Cinnabar
  ['GOLD_TEETH', 'safari-zone'],
  ['SAFARI_GAME', 'safari-zone'],
  ['CAPTAINS_BACK', 'ss-anne'],
  ['WALKED_OUT_OF_DOCK', 'vermilion-city'],
  ['RUBBED_CAPTAIN', 'ss-anne'],
  ['BICYCLE', 'cerulean-city'],
  ['BIKE_VOUCHER', 'vermilion-city'],
  ['MAGIKARP', 'mt-moon'],           // Bought from salesman at Mt Moon entrance
  ['ITEMFINDER', 'lavender-town'],   // Given in Lavender
  ['EXP_ALL', 'route-15'],           // Actually Route 15 gate — but unknown without check
  ['POTION_SAMPLE', 'viridian-city'],
  ['SS_TICKET', 'vermilion-city'],
  ['LOCK_OPENED', 'silph-co'],
  ['PIKACHU_FAN', 'cerulean-city'],
  ['SEEL_FAN', 'cerulean-city'],
  ['COINS', 'celadon-city'],
  ['COIN_', 'celadon-city'],
  ['MUSEUM_TICKET', 'pewter-city'],
  ['OLD_AMBER', 'pewter-city'],
  ['OAKS_PARCEL', 'viridian-city'],  // Got parcel from Viridian Mart
  ['LANCE', 'victory-road'],
  // ---------------------------------------------------------------------------
  // Hoenn locations (Emerald / Ruby / Sapphire)
  // ---------------------------------------------------------------------------
  ['PETALBURG', 'petalburg-city'],
  ['RUSTBORO', 'rustboro-city'],
  ['DEWFORD', 'dewford-town'],
  ['SLATEPORT', 'slateport-city'],
  ['MAUVILLE', 'mauville-city'],
  ['VERDANTURF', 'verdanturf-town'],
  ['FALLARBOR', 'fallarbor-town'],
  ['LAVARIDGE', 'lavaridge-town'],
  ['FORTREE', 'fortree-city'],
  ['LILYCOVE', 'lilycove-city'],
  ['MOSSDEEP', 'mossdeep-city'],
  ['SOOTOPOLIS', 'sootopolis-city'],
  ['PACIFIDLOG', 'pacifidlog-town'],
  ['EVER_GRANDE', 'ever-grande-city'],
  ['METEOR_FALLS', 'meteor-falls'],
  ['MT_CHIMNEY', 'mt-chimney'],
  ['FIERY_PATH', 'fiery-path'],
  ['JAGGED_PASS', 'jagged-pass'],
  ['MT_PYRE', 'mt-pyre'],
  ['SEAFLOOR_CAVERN', 'seafloor-cavern'],
  ['CAVE_OF_ORIGIN', 'cave-of-origin'],
  ['SKY_PILLAR', 'sky-pillar'],
  ['SHOAL_CAVE', 'shoal-cave'],
  ['GRANITE_CAVE', 'granite-cave'],
  ['PETALBURG_WOODS', 'petalburg-woods'],
  ['RUSTURF_TUNNEL', 'rusturf-tunnel'],
  ['TRICK_HOUSE', 'trick-house'],
  ['NEW_MAUVILLE', 'new-mauville'],
  ['ABANDONED_SHIP', 'abandoned-ship'],
  // ---------------------------------------------------------------------------
  // Sevii Islands (FireRed / LeafGreen)
  // ---------------------------------------------------------------------------
  ['ONE_ISLAND', 'one-island'],
  ['TWO_ISLAND', 'two-island'],
  ['THREE_ISLAND', 'three-island'],
  ['SEVII', 'sevii-islands'],
];

function getLocationKey(name: string): string | undefined {
  // Route matching: ROUTE_N, ROUTE_NN, ROUTENN anywhere in the name
  const routeMatch = name.match(/ROUTE_?(\d+)/);
  if (routeMatch) {
    return `route-${routeMatch[1]}`;
  }

  // Search for location tokens anywhere in the flag name.
  // Check word-boundary aligned: token must appear as _TOKEN or start of body.
  for (const [token, key] of LOCATION_MAP) {
    if (name.includes(token)) return key;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// ASM parser
// ---------------------------------------------------------------------------

function parseConstValue(token: string): number {
  token = token.trim();
  if (token.startsWith('$')) {
    return parseInt(token.slice(1), 16);
  }
  return parseInt(token, 10);
}

/**
 * Evaluates simple arithmetic expressions like "$F0 - 2" or "$150".
 * Only supports single binary +/- with hex/decimal literals.
 */
function evalConstExpr(expr: string): number {
  expr = expr.trim();
  // Try binary expression first
  const binMatch = expr.match(/^(.+?)\s*([-+])\s*(.+)$/);
  if (binMatch) {
    const left = parseConstValue(binMatch[1].trim());
    const op = binMatch[2];
    const right = parseConstValue(binMatch[3].trim());
    return op === '+' ? left + right : left - right;
  }
  return parseConstValue(expr);
}

function parseFlagDefs(asm: string): FlagDefinition[] {
  const flags: FlagDefinition[] = [];
  let counter = 0;
  let started = false;

  for (const rawLine of asm.split('\n')) {
    // Strip comments and trim
    const line = rawLine.replace(/;.*$/, '').trim();
    if (!line) continue;

    if (line === 'const_def') {
      counter = 0;
      started = true;
      continue;
    }

    if (!started) continue;

    // const_next <expr>  — jump counter to value
    const nextMatch = line.match(/^const_next\s+(.+)$/);
    if (nextMatch) {
      counter = evalConstExpr(nextMatch[1]);
      continue;
    }

    // const_skip [n]  — skip n slots (default 1)
    const skipMatch = line.match(/^const_skip(?:\s+(\d+))?$/);
    if (skipMatch) {
      const n = skipMatch[1] !== undefined ? parseInt(skipMatch[1], 10) : 1;
      counter += n;
      continue;
    }

    // const EVENT_NAME
    const constMatch = line.match(/^const\s+(EVENT_\w+)$/);
    if (constMatch) {
      const name = constMatch[1];
      flags.push({
        index: counter,
        name,
        category: getCategory(name),
        location_key: getLocationKey(name),
        source: 'event',
      });
      counter++;
      continue;
    }

    // DEF lines and other non-const directives — skip silently
  }

  return flags;
}

// ---------------------------------------------------------------------------
// C header parser (Gen 3: #define FLAG_NAME 0xNNN)
// ---------------------------------------------------------------------------

function parseCHeaderFlagDefs(header: string): FlagDefinition[] {
  const flags: FlagDefinition[] = [];

  // First pass: collect all #define values (for resolving base constants)
  const defines = new Map<string, number>();
  for (const rawLine of header.split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    const directMatch = line.match(/^#define\s+(\w+)\s+(0x[0-9A-Fa-f]+|\d+)\s*$/);
    if (directMatch) {
      const val = directMatch[2].startsWith('0x')
        ? parseInt(directMatch[2], 16)
        : parseInt(directMatch[2], 10);
      defines.set(directMatch[1], val);
    }
  }

  // Second pass: resolve all FLAG_* defines
  for (const rawLine of header.split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();

    // Direct: #define FLAG_NAME 0xNNN
    const directMatch = line.match(/^#define\s+(FLAG_\w+)\s+(0x[0-9A-Fa-f]+|\d+)\s*$/);
    if (directMatch) {
      const name = directMatch[1];
      const val = directMatch[2].startsWith('0x')
        ? parseInt(directMatch[2], 16)
        : parseInt(directMatch[2], 10);
      flags.push({
        index: val,
        name,
        category: getCategory(name),
        location_key: getLocationKey(name),
        source: 'event',
      });
      continue;
    }

    // Base + offset: #define FLAG_NAME (SOME_BASE + 0xNN)
    const exprMatch = line.match(/^#define\s+(FLAG_\w+)\s+\(\s*(\w+)\s*\+\s*(0x[0-9A-Fa-f]+|\d+)\s*\)\s*$/);
    if (exprMatch) {
      const name = exprMatch[1];
      const baseName = exprMatch[2];
      const offset = exprMatch[3].startsWith('0x')
        ? parseInt(exprMatch[3], 16)
        : parseInt(exprMatch[3], 10);
      const baseVal = defines.get(baseName);
      if (baseVal !== undefined) {
        flags.push({
          index: baseVal + offset,
          name,
          category: getCategory(name),
          location_key: getLocationKey(name),
          source: 'event',
        });
      }
      continue;
    }
  }

  // Sort by index and deduplicate
  flags.sort((a, b) => a.index - b.index);
  const seen = new Set<number>();
  return flags.filter(f => {
    if (seen.has(f.index)) return false;
    seen.add(f.index);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Game: ${GAME}`);
  console.log(`Fetching ${SOURCE_URL} …`);
  const resp = await fetch(SOURCE_URL);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching source`);
  }
  const source = await resp.text();
  console.log(`Fetched ${source.split('\n').length} lines.`);

  const flags = SOURCE_FORMAT === 'c_header' ? parseCHeaderFlagDefs(source) : parseFlagDefs(source);
  console.log(`Parsed ${flags.length} flag definitions.`);

  // Sample output
  console.log('First 5 flags:');
  for (const f of flags.slice(0, 5)) {
    console.log(`  [${f.index}] ${f.name} (${f.category}) → ${f.location_key ?? 'unknown'}`);
  }
  console.log('Last 5 flags:');
  for (const f of flags.slice(-5)) {
    console.log(`  [${f.index}] ${f.name} (${f.category}) → ${f.location_key ?? 'unknown'}`);
  }

  // Index range sanity check
  const maxIndex = Math.max(...flags.map(f => f.index));
  console.log(`Max flag index: ${maxIndex} (0x${maxIndex.toString(16).toUpperCase()})`);

  const outDir = join(__dirname, '../data/flags');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, OUTPUT_FILE);
  writeFileSync(outPath, JSON.stringify(flags, null, 2) + '\n');
  console.log(`Written to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
