/**
 * refresh-descriptions.ts
 *
 * One-shot: re-reads item/TM descriptions from the region seed JSON and
 * UPDATEs the corresponding rows in the live dev DB. Leaves everything else
 * (calibrations, marker_positions, etc.) untouched.
 *
 * Usage (from repo root): bunx tsx server/src/scripts/refresh-descriptions.ts
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = join(SCRIPT_DIR, '../../..');
const DB_PATH = join(REPO_ROOT, 'data', 'pokemon.db');
const SEED_DIR = join(SCRIPT_DIR, '../seeds/data');

const db = new Database(DB_PATH);

// tm_number comes through as string "TM31" in Kanto and integer 31 in Johto —
// normalize so we can match the DB rows (which also mix the two shapes).
function normTm(v: unknown): string {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    const m = v.match(/^TM0*(\d+)$/i);
    return m ? m[1] : v;
  }
  return '';
}

interface LocationData {
  items?: Array<{ item_name: string; method?: string; description?: string; games?: string[] }>;
  tms?: Array<{ tm_number: number | string; description?: string; games?: string[] }>;
}

function refresh(file: string): { items: number; tms: number } {
  const data = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf-8'));
  const defaultGames: string[] = Array.isArray(data.games) ? data.games : [];
  const updateItem = db.prepare(`
    UPDATE location_items SET description = ?
    WHERE item_name = ? AND method = ? AND game = ?
      AND location_id = (
        SELECT ml.id FROM map_locations ml WHERE ml.location_key = ?
      )
  `);
  // Kanto stores tm_number as TEXT "TMNN"; Johto as INTEGER. Match both.
  const updateTm = db.prepare(`
    UPDATE location_tms SET description = ?
    WHERE (CAST(tm_number AS INTEGER) = CAST(? AS INTEGER)
           OR tm_number = ?
           OR tm_number = ?)
      AND game = ?
      AND location_id = (
        SELECT ml.id FROM map_locations ml WHERE ml.location_key = ?
      )
  `);

  let items = 0, tms = 0;
  for (const [locKey, loc] of Object.entries(data.locations ?? {}) as [string, LocationData][]) {
    for (const item of loc.items ?? []) {
      if (!item.description) continue;
      const games = item.games ?? defaultGames;
      for (const game of games) {
        const r = updateItem.run(item.description, item.item_name, item.method ?? null, game, locKey);
        items += r.changes;
      }
    }
    for (const tm of loc.tms ?? []) {
      if (!tm.description) continue;
      const games = tm.games ?? defaultGames;
      const n = normTm(tm.tm_number);
      for (const game of games) {
        const r = updateTm.run(tm.description, n, `TM${n}`, `TM${n.padStart(2, '0')}`, game, locKey);
        tms += r.changes;
      }
    }
  }
  return { items, tms };
}

console.log(`DB: ${DB_PATH}\n`);
for (const file of ['kanto-gen1.json', 'johto-gen2.json']) {
  const r = refresh(file);
  console.log(`${file}: updated ${r.items} item rows, ${r.tms} TM rows`);
}
db.close();
