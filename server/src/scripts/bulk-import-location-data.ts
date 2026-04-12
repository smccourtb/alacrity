/**
 * Bulk-imports location detail rows (trainers, items, tms, events) from flag
 * definition JSON files into the database.
 *
 * Usage:
 *   npx tsx src/scripts/bulk-import-location-data.ts [game]
 *   game defaults to "red"
 *
 * Each flag is mapped to the appropriate detail table by category:
 *   trainer → location_trainers
 *   item    → location_items
 *   tm/hm   → location_tms  (skipped — no location_key in Red)
 *   event   → location_events
 *
 * Rows already inserted (manual seed) are skipped via INSERT OR IGNORE and
 * the de-dup check below.
 */

import db from '../db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlagDef {
  index: number;
  name: string;
  category: string;
  location_key?: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const locationIdCache = new Map<string, number | null>();

function getLocationId(key: string): number | null {
  if (locationIdCache.has(key)) return locationIdCache.get(key)!;
  const row = db.prepare('SELECT id FROM map_locations WHERE location_key = ?').get(key) as { id: number } | undefined;
  const id = row?.id ?? null;
  locationIdCache.set(key, id);
  return id;
}

/**
 * Convert a flag name body into a human-readable string.
 * e.g. "RESCUED_MR_FUJI" → "Rescued Mr Fuji"
 */
function flagBodyToReadable(body: string): string {
  return body
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ---------------------------------------------------------------------------
// Trainer parsing
// ---------------------------------------------------------------------------

// Known gym leaders: flag body after EVENT_BEAT_ → display name
const GYM_LEADERS: Record<string, string> = {
  BROCK: 'Brock',
  MISTY: 'Misty',
  LT_SURGE: 'Lt. Surge',
  ERIKA: 'Erika',
  KOGA: 'Koga',
  SABRINA: 'Sabrina',
  BLAINE: 'Blaine',
  GIOVANNI: 'Giovanni', // will be picked by VIRIDIAN_GYM_GIOVANNI below
};

// E4 room prefixes → display name
const E4_ROOM: Record<string, string> = {
  LORELEIS_ROOM: 'Lorelei',
  BRUNOS_ROOM: 'Bruno',
  AGATHAS_ROOM: 'Agatha',
  LANCES_ROOM: 'Lance',
};

// Boss names that should get is_boss = 1 but aren't gym leaders / E4
const BOSSES = new Set([
  'GHOST_MAROWAK',
  'ZAPDOS',
  'ARTICUNO',
  'MOLTRES',
  'MEWTWO',
  'ROUTE12_SNORLAX',
  'ROUTE16_SNORLAX',
]);

interface TrainerInfo {
  trainerClass: string;
  trainerName: string;
  isBoss: number;
}

/**
 * Parse a trainer flag name into class, display name, and boss flag.
 *
 * Examples:
 *   EVENT_BEAT_BROCK → Gym Leader / Brock / boss
 *   EVENT_BEAT_VIRIDIAN_GYM_GIOVANNI → Gym Leader / Giovanni / boss
 *   EVENT_BEAT_LORELEIS_ROOM_TRAINER_0 → Elite Four / Lorelei / boss
 *   EVENT_BEAT_CHAMPION_RIVAL → Rival / Blue / boss
 *   EVENT_BEAT_CERULEAN_RIVAL → Rival / Blue
 *   EVENT_BEAT_ROUTE_3_TRAINER_0 → Trainer / Route 3 Trainer 1
 *   EVENT_BEAT_VIRIDIAN_GYM_TRAINER_2 → Gym Trainer / Viridian Gym Trainer 3
 *   EVENT_BEAT_GHOST_MAROWAK → Wild Pokemon / Ghost Marowak / boss
 *   EVENT_BEAT_ZAPDOS → Legendary / Zapdos / boss
 */
function parseTrainer(name: string): TrainerInfo {
  // Strip EVENT_BEAT_ prefix
  const body = name.replace(/^EVENT_BEAT_/, '');

  // ---- Elite Four room trainers ----
  for (const [prefix, leader] of Object.entries(E4_ROOM)) {
    if (body.startsWith(prefix + '_TRAINER_')) {
      const n = parseInt(body.split('_').pop()!, 10);
      return { trainerClass: 'Elite Four', trainerName: `${leader} Trainer ${n + 1}`, isBoss: 0 };
    }
  }

  // ---- Champion ----
  if (body === 'CHAMPION_RIVAL') {
    return { trainerClass: 'Champion', trainerName: 'Blue', isBoss: 1 };
  }
  // ---- Lance (E4 boss) ----
  if (body === 'LANCE') {
    return { trainerClass: 'Elite Four', trainerName: 'Lance', isBoss: 1 };
  }

  // ---- Rival battles (not champion) ----
  if (body.includes('RIVAL')) {
    // Try to extract a readable context e.g. "Cerulean Rival", "Route 22 Rival 1st Battle"
    const readable = flagBodyToReadable(body.replace(/_?RIVAL.*$/, '').trim() || 'Rival').trim();
    const suffix = body.match(/RIVAL(.*)$/)?.[1]?.replace(/_/g, ' ').trim() || '';
    const battleLabel = suffix ? ` (${flagBodyToReadable(suffix)})` : '';
    return { trainerClass: 'Rival', trainerName: `Blue${battleLabel}`, isBoss: 0 };
  }

  // ---- Named gym leaders ----
  if (body in GYM_LEADERS) {
    return { trainerClass: 'Gym Leader', trainerName: GYM_LEADERS[body], isBoss: 1 };
  }

  // ---- GYM TRAINER_N pattern ----
  const gymTrainerMatch = body.match(/^(.+_GYM)_TRAINER_(\d+)$/);
  if (gymTrainerMatch) {
    const gymPart = gymTrainerMatch[1]; // e.g. VIRIDIAN_GYM
    const n = parseInt(gymTrainerMatch[2], 10);
    const gymName = flagBodyToReadable(gymPart); // e.g. "Viridian Gym"
    return { trainerClass: 'Gym Trainer', trainerName: `${gymName} Trainer ${n + 1}`, isBoss: 0 };
  }

  // ---- GYM GIOVANNI (specific boss) ----
  const gymGiovanniMatch = body.match(/^(.+_GYM)_GIOVANNI$/);
  if (gymGiovanniMatch) {
    return { trainerClass: 'Gym Leader', trainerName: 'Giovanni', isBoss: 1 };
  }

  // ---- Generic location TRAINER_N ----
  const genericTrainerMatch = body.match(/^(.+)_TRAINER_(\d+)$/);
  if (genericTrainerMatch) {
    const locPart = genericTrainerMatch[1];
    const n = parseInt(genericTrainerMatch[2], 10);
    const locName = flagBodyToReadable(locPart);
    return { trainerClass: 'Trainer', trainerName: `${locName} Trainer ${n + 1}`, isBoss: 0 };
  }

  // ---- Voltorb / wild encounters in Power Plant ----
  const voltorbMatch = body.match(/^POWER_PLANT_VOLTORB_(\d+)$/);
  if (voltorbMatch) {
    const n = parseInt(voltorbMatch[1], 10);
    return { trainerClass: 'Wild Pokemon', trainerName: `Power Plant Voltorb ${n + 1}`, isBoss: 0 };
  }

  // ---- Snorlax ----
  if (body.match(/SNORLAX/)) {
    const loc = flagBodyToReadable(body.replace(/_?SNORLAX.*$/, '').trim());
    return { trainerClass: 'Wild Pokemon', trainerName: `${loc} Snorlax`, isBoss: 1 };
  }

  // ---- Legendary birds / Mewtwo ----
  if (body === 'ZAPDOS') return { trainerClass: 'Legendary', trainerName: 'Zapdos', isBoss: 1 };
  if (body === 'ARTICUNO') return { trainerClass: 'Legendary', trainerName: 'Articuno', isBoss: 1 };
  if (body === 'MOLTRES') return { trainerClass: 'Legendary', trainerName: 'Moltres', isBoss: 1 };
  if (body === 'MEWTWO') return { trainerClass: 'Legendary', trainerName: 'Mewtwo', isBoss: 1 };

  // ---- Ghost Marowak ----
  if (body === 'GHOST_MAROWAK') return { trainerClass: 'Wild Pokemon', trainerName: 'Ghost Marowak', isBoss: 1 };

  // ---- Karate Master ----
  if (body === 'KARATE_MASTER') return { trainerClass: 'Gym Leader', trainerName: 'Karate Master', isBoss: 1 };

  // ---- Rocket enemies ----
  if (body.includes('ROCKET')) {
    const readable = flagBodyToReadable(body);
    return { trainerClass: 'Team Rocket', trainerName: readable, isBoss: body.includes('GIOVANNI') ? 1 : 0 };
  }

  // ---- Fallback ----
  const readable = flagBodyToReadable(body);
  return { trainerClass: 'Trainer', trainerName: readable, isBoss: 0 };
}

// ---------------------------------------------------------------------------
// Item parsing
// ---------------------------------------------------------------------------

/**
 * Skip items that are already covered by the manual events seed or should
 * not appear as standalone items.
 */
const SKIP_ITEMS = new Set([
  'EVENT_GOT_STARTER',
  'EVENT_GOT_POKEDEX',
  'EVENT_GOT_POKEBALLS_FROM_OAK',
]);

/**
 * Canonical names for items whose flag body doesn't produce a clean name by
 * the generic lowercaser (preserves ALL-CAPS acronyms, apostrophes, etc.)
 */
const ITEM_NAME_OVERRIDES: Record<string, string> = {
  'EVENT_GOT_OAKS_PARCEL': "Oak's Parcel",
  'EVENT_GOT_SS_TICKET': 'SS Ticket',
  'EVENT_GOT_POKE_FLUTE': 'Poke Flute',
  'EVENT_GOT_EXP_ALL': 'Exp. All',
  'EVENT_GOT_COIN_CASE': 'Coin Case',
  'EVENT_GOT_BIKE_VOUCHER': 'Bike Voucher',
  'EVENT_GOT_TOWN_MAP': 'Town Map',
  'EVENT_GOT_OLD_AMBER': 'Old Amber',
  'EVENT_GOT_BICYCLE': 'Bicycle',
  'EVENT_GOT_DOME_FOSSIL': 'Dome Fossil',
  'EVENT_GOT_HELIX_FOSSIL': 'Helix Fossil',
  'EVENT_GOT_MASTER_BALL': 'Master Ball',
  'EVENT_GOT_ITEMFINDER': 'Itemfinder',
  'EVENT_GOT_POTION_SAMPLE': 'Potion Sample',
  'EVENT_GOT_HITMONLEE': 'Hitmonlee',
  'EVENT_GOT_HITMONCHAN': 'Hitmonchan',
  'EVENT_GOT_NUGGET': 'Nugget',
  'EVENT_GOT_10_COINS': '10 Coins',
  'EVENT_GOT_20_COINS': '20 Coins',
  'EVENT_GOT_20_COINS_2': '20 Coins (2)',
};

function itemNameFromFlag(name: string): string {
  if (ITEM_NAME_OVERRIDES[name]) return ITEM_NAME_OVERRIDES[name];
  const body = name.replace(/^EVENT_GOT_/, '').replace(/_/g, ' ');
  return body.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns the method for an item flag. Most gifted items in Gen 1 are 'gift',
 * but Dome/Helix Fossil are a 'choice' (you pick one). We handle this separately
 * since we only insert one row per item — the manual seed already has the choice
 * rows, so we skip these here to avoid duplication.
 */
const SKIP_ALREADY_SEEDED_ITEMS = new Set([
  'EVENT_GOT_DOME_FOSSIL',
  'EVENT_GOT_HELIX_FOSSIL',
  // Also skip items already in manual seed with exact matching names
  'EVENT_GOT_OAKS_PARCEL',    // manual seed has "Oak's Parcel" (same item)
  'EVENT_GOT_SS_TICKET',      // manual seed has "SS Ticket" at same location
  'EVENT_GOT_TOWN_MAP',       // manual seed has "Town Map"
  'EVENT_GOT_BICYCLE',        // manual seed has "Bicycle"
  'EVENT_GOT_BIKE_VOUCHER',   // manual seed has "Bike Voucher"
  'EVENT_GOT_OLD_AMBER',      // manual seed has "Old Amber"
  'EVENT_GOT_POKE_FLUTE',     // manual seed has "Poke Flute"
  'EVENT_GOT_MASTER_BALL',    // manual seed has "Master Ball"
  'EVENT_GOT_COIN_CASE',      // manual seed has "Coin Case"
]);

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

/**
 * Skip events that are already in the manual seed or are too low-level to be
 * meaningful story beats (Cinnabar Gym gate unlocks, fan boasts, locks etc.)
 */
function shouldSkipEvent(name: string): boolean {
  // Already seeded manually (check for exact event_name duplicates handled by UNIQUE)
  // but also skip obviously internal/low-value flags
  if (name.match(/^EVENT_\w+[0-9A-F]{2,3}$/)) return true; // hex-style e.g. EVENT_1B8, EVENT_2A7
  if (name.includes('_GATE') && name.includes('_UNLOCKED')) return true;
  if (name.includes('_FAN_BOAST')) return true;
  return false;
}

function eventNameFromFlag(name: string): string {
  const body = name
    .replace(/^EVENT_/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return body;
}

function eventTypeFromFlag(name: string): string {
  if (name.includes('_RIVAL')) return 'rival';
  if (name.includes('_GYM')) return 'gym';
  if (name.includes('HALL_OF_FAME')) return 'story';
  if (name.includes('SAFARI')) return 'story';
  if (name.includes('FOSSIL')) return 'story';
  if (name.includes('_RESCUE') || name.includes('RESCUED')) return 'story';
  if (name.includes('_ROCKET')) return 'story';
  if (name.includes('_OPEN') || name.includes('OPENED')) return 'story';
  if (name.includes('_LEFT') || name.includes('_DEPARTED')) return 'story';
  if (name.includes('BILL') || name.includes('MR_POKEMON')) return 'story';
  return 'story';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const game = process.argv[2] || 'red';
const flagsPath = join(__dirname, `../data/flags/${game}.json`);

let flags: FlagDef[];
try {
  flags = JSON.parse(readFileSync(flagsPath, 'utf-8'));
} catch (err) {
  console.error(`Could not read flags file: ${flagsPath}`);
  process.exit(1);
}

console.log(`Loaded ${flags.length} flag definitions for "${game}"`);

// Prepared statements
const insertTrainer = db.prepare(`
  INSERT OR IGNORE INTO location_trainers
    (location_id, game, trainer_class, trainer_name, flag_index, flag_source, is_boss)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO location_items
    (location_id, game, item_name, method, flag_index, flag_source)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertEvent = db.prepare(`
  INSERT OR IGNORE INTO location_events
    (location_id, game, event_name, event_type, flag_index, flag_source)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const counts = { trainers: 0, items: 0, tms: 0, events: 0, skipped: 0 };

const run = db.transaction(() => {
  for (const flag of flags) {
    if (!flag.location_key) {
      counts.skipped++;
      continue;
    }

    const locId = getLocationId(flag.location_key);
    if (!locId) {
      counts.skipped++;
      continue;
    }

    switch (flag.category) {
      case 'trainer': {
        const info = parseTrainer(flag.name);
        const result = insertTrainer.run(locId, game, info.trainerClass, info.trainerName, flag.index, flag.source, info.isBoss);
        if (result.changes > 0) counts.trainers++;
        else counts.skipped++;
        break;
      }

      case 'item': {
        if (SKIP_ITEMS.has(flag.name)) { counts.skipped++; break; }
        if (SKIP_ALREADY_SEEDED_ITEMS.has(flag.name)) { counts.skipped++; break; }
        const itemName = itemNameFromFlag(flag.name);
        const result = insertItem.run(locId, game, itemName, 'gift', flag.index, flag.source);
        if (result.changes > 0) counts.items++;
        else counts.skipped++;
        break;
      }

      case 'tm':
      case 'hm': {
        // All TM/HM flags for Red are missing location_key — handled above by the !location_key check.
        // If a future game has location_keys on TM flags, we'd need a location_tms insert here.
        counts.skipped++;
        break;
      }

      case 'event': {
        if (shouldSkipEvent(flag.name)) { counts.skipped++; break; }
        const eventName = eventNameFromFlag(flag.name);
        const eventType = eventTypeFromFlag(flag.name);
        const result = insertEvent.run(locId, game, eventName, eventType, flag.index, flag.source);
        if (result.changes > 0) counts.events++;
        else counts.skipped++;
        break;
      }

      default:
        counts.skipped++;
        break;
    }
  }
});

run();

console.log('\nResults:');
console.log(`  Trainers inserted : ${counts.trainers}`);
console.log(`  Items inserted    : ${counts.items}`);
console.log(`  TMs inserted      : ${counts.tms}`);
console.log(`  Events inserted   : ${counts.events}`);
console.log(`  Skipped / ignored : ${counts.skipped}`);
console.log(`  Total processed   : ${flags.length}`);
