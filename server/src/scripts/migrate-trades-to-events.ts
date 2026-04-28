/**
 * migrate-trades-to-events.ts
 *
 * Promotes in-game trade rows from `map_encounters` into `location_events`
 * so they render on the Events tab and can be pinned to the map via the
 * sub-marker calibration flow. Keeps the original encounter rows intact
 * (trades remain obtainable in the Pokemon tab too).
 *
 * Mutates both the live DB and the region seed JSON so a future reseed
 * keeps the events.
 *
 * Usage (from repo root): bun run server/src/scripts/migrate-trades-to-events.ts
 */

import { Database } from 'bun:sqlite';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = join(SCRIPT_DIR, '../../..');
const DB_PATH = join(REPO_ROOT, 'data', 'pokemon.db');
const SEED_DIR = join(SCRIPT_DIR, '../seeds/data');

const db = new Database(DB_PATH);

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// Rows from map_encounters flagged as in-game trades. Keep the encounter row
// intact; just mirror it into location_events (one row per game).
const rows = db.prepare(`
  SELECT me.id, me.location_id, me.game, me.species_id, me.notes,
         s.name AS species_name, ml.location_key, gm.map_key
  FROM map_encounters me
  JOIN map_locations ml ON ml.id = me.location_id
  JOIN game_maps gm ON gm.id = ml.map_id
  JOIN species s ON s.id = me.species_id
  WHERE me.notes LIKE 'In-game trade%'
  ORDER BY gm.map_key, ml.location_key, me.game
`).all() as Array<{
  id: number; location_id: number; game: string; species_id: number;
  notes: string; species_name: string; location_key: string; map_key: string;
}>;

console.log(`Found ${rows.length} trade encounter rows to promote.`);

const insertEvent = db.prepare(`
  INSERT INTO location_events
    (location_id, game, event_name, event_type, description, progression_order, species_id, requirements, x, y, flag_index, flag_source)
  VALUES (?, ?, ?, 'trade', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL)
  ON CONFLICT(location_id, game, event_name) DO UPDATE SET
    event_type = excluded.event_type,
    description = excluded.description,
    species_id = excluded.species_id
`);

let dbInserted = 0;
for (const r of rows) {
  const eventName = `Trade for ${titleCase(r.species_name.replace(/-/g, ' '))}`;
  const result = insertEvent.run(r.location_id, r.game, eventName, r.notes, r.species_id);
  if (result.changes > 0) dbInserted++;
}
console.log(`DB: upserted ${dbInserted} location_events rows.`);

// ─── JSON write-back ───────────────────────────────────────────────
// Walk each region JSON, find encounter entries with "In-game trade" notes,
// and mirror them into the same location's events array (deduped by event_name).

type RegionFile = {
  region: string;
  games: string[];
  locations: Record<string, {
    encounters?: Array<{
      species_id: number;
      notes?: string;
      games?: string[];
    }>;
    events?: Array<{
      event_name: string;
      event_type?: string;
      description?: string;
      species_id?: number;
      games?: string[];
    }>;
  }>;
};

function speciesNameById(id: number): string | null {
  const row = db.prepare('SELECT name FROM species WHERE id = ?').get(id) as { name: string } | undefined;
  return row?.name ?? null;
}

function processFile(filePath: string): number {
  const raw = readFileSync(filePath, 'utf-8');
  const data: RegionFile = JSON.parse(raw);
  const defaultGames = Array.isArray(data.games) ? data.games : [];
  let added = 0;

  for (const loc of Object.values(data.locations ?? {})) {
    if (!loc.encounters) continue;
    loc.events ??= [];
    for (const enc of loc.encounters) {
      if (!enc.notes?.startsWith('In-game trade')) continue;
      const name = speciesNameById(enc.species_id);
      if (!name) continue;
      const eventName = `Trade for ${titleCase(name.replace(/-/g, ' '))}`;
      const exists = loc.events.some(e => e.event_name === eventName);
      if (exists) continue;
      loc.events.push({
        event_name: eventName,
        event_type: 'trade',
        species_id: enc.species_id,
        description: enc.notes,
        games: enc.games ?? defaultGames,
      });
      added++;
    }
  }

  if (added > 0) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }
  return added;
}

for (const file of readdirSync(SEED_DIR).filter(f => /^.+-gen\d+\.json$/.test(f))) {
  const count = processFile(join(SEED_DIR, file));
  console.log(`${file}: ${count} trade events added to JSON`);
}

db.close();
