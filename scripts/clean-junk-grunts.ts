/**
 * One-shot cleanup: drop Bulbapedia-scraper junk entries that got loaded as
 * trainer rows. These are area/section labels (Base, HQ, Hideout, …), not
 * trainer names. Removes from BOTH:
 *   - data/pokemon.db (so the running app stops showing them)
 *   - server/src/seeds/data/*-gen*.json (so re-seed doesn't bring them back)
 */
import { Database } from 'bun:sqlite';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const JUNK_NAMES = new Set([
  'Base', 'Game Corner', 'HQ', 'Hideout', 'Prize Master',
  'Siblings', 'Warehouse', 'Brothers', 'Sisters',
]);

const REPO = join(import.meta.dir, '..');
const DB_PATH = join(REPO, 'data', 'pokemon.db');
const SEEDS_DIR = join(REPO, 'server', 'src', 'seeds', 'data');

// 1. DB cleanup
const db = new Database(DB_PATH);
const placeholders = Array.from(JUNK_NAMES).map(() => '?').join(',');
const result = db.prepare(`
  DELETE FROM location_trainers
  WHERE trainer_class LIKE '%Grunt%'
    AND trainer_name IN (${placeholders})
`).run(...JUNK_NAMES);
console.log(`DB: deleted ${result.changes} junk grunt rows`);

// 2. Seed JSON cleanup
const files = readdirSync(SEEDS_DIR).filter(f => /-gen\d+\.json$/.test(f));
for (const f of files) {
  const path = join(SEEDS_DIR, f);
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let removed = 0;
  for (const [, loc] of Object.entries(data.locations ?? {}) as [string, any][]) {
    if (!Array.isArray(loc.trainers)) continue;
    const before = loc.trainers.length;
    loc.trainers = loc.trainers.filter((t: any) => {
      const isGrunt = (t.trainer_class ?? '').includes('Grunt');
      const isJunk = JUNK_NAMES.has(t.trainer_name);
      return !(isGrunt && isJunk);
    });
    removed += before - loc.trainers.length;
  }
  if (removed > 0) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`JSON: ${f} — removed ${removed} entries`);
  }
}

db.close();
