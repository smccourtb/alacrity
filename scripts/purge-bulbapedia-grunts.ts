/**
 * Remove the Bulbapedia-scraped grunt entries with trainer_name="Grunt"
 * and trainer_name="Grunt A/B/C" from the johto seed JSON.
 * The pret-based reseed (with the name-disambiguation fix) will re-add
 * them under the correct location_keys with authentic party data and
 * uniquely numbered names.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const JSON_PATH = join(import.meta.dir, '..', 'server/src/seeds/data/johto-gen2.json');
const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
let removed = 0;
for (const [, loc] of Object.entries(data.locations ?? {}) as [string, any][]) {
  if (!Array.isArray(loc.trainers)) continue;
  const before = loc.trainers.length;
  loc.trainers = loc.trainers.filter((t: any) => {
    const cls = (t.trainer_class || '').toLowerCase();
    const name = (t.trainer_name || '').trim();
    const isGrunt = cls.includes('grunt') || cls.includes('rocket');
    // Keep pret-sourced entries (they have species_id in party); drop
    // Bulbapedia entries with generic "Grunt" / "Grunt A-C" names.
    const isGeneric = /^Grunt( [A-Z])?$/.test(name);
    return !(isGrunt && isGeneric);
  });
  removed += before - loc.trainers.length;
}
writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`Removed ${removed} generic-grunt entries from johto JSON`);
