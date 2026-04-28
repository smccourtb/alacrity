/**
 * Seeds Gen 8/9 reference tables from the JSON files produced by
 * fetch-gen8-9-reference.ts, fetch-marks-catalog.ts, fetch-za-data.ts, and
 * the hand-written tera-types.json / paradox-species.json / alpha-species.json.
 *
 * Idempotent.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';

function loadJson<T>(rel: string, opts: { required: boolean } = { required: false }): T | null {
  const path = join(paths.seedDataDir, rel);
  if (!existsSync(path)) {
    if (opts.required) {
      throw new Error(`[gen8-9] required seed file missing: ${path}`);
    }
    console.warn(`  [gen8-9] missing ${rel}; skipping`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export function seedGen89Reference(): void {
  // 1. Tera types
  const teraTypes = loadJson<Array<{ key: string; name: string; color: string }>>('meta/tera-types.json', { required: true });
  if (teraTypes) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO tera_types_catalog (key, name, color) VALUES (?, ?, ?)`);
    db.transaction(() => {
      for (const t of teraTypes) stmt.run(t.key, t.name, t.color);
    })();
    console.log(`  Seeded ${teraTypes.length} tera types.`);
  }

  // 2. species_in_dex from gen8-9-reference.json + legends-za.json
  const ref = loadJson<Record<string, Record<string, Array<{ species_id: number; dex_number: number }>>>>('gen8-9-reference.json', { required: true });
  const za = loadJson<{ dex: Array<{ species_id: number; dex_number: number; name: string }>; new_megas?: Array<{ species_id: number; form_name: string }> }>('legends-za.json', { required: true });
  const insertDex = db.prepare(`
    INSERT OR REPLACE INTO species_in_dex (species_id, game, dex_name, dex_number) VALUES (?, ?, ?, ?)
  `);
  let dexRows = 0;
  db.transaction(() => {
    if (ref) {
      for (const [game, dexes] of Object.entries(ref)) {
        for (const [dexName, entries] of Object.entries(dexes)) {
          for (const e of entries) {
            insertDex.run(e.species_id, game, dexName, e.dex_number);
            dexRows++;
          }
        }
      }
    }
    if (za && za.dex) {
      for (const e of za.dex) {
        insertDex.run(e.species_id, 'legends-z-a', 'lumiose', e.dex_number);
        dexRows++;
      }
    }
  })();
  console.log(`  Seeded ${dexRows} species_in_dex rows.`);

  // 3. Marks catalog merge — only insert marks NOT already in `marks` (by name).
  // NB: insert-only by name. Updates to title_suffix/how_to_obtain/games for
  // existing marks are intentionally NOT propagated — edit the marks table
  // directly if you need to revise.
  const marksCatalog = loadJson<Array<{ name: string; category: string; title_suffix: string; games: string[]; how_to_obtain: string }>>('marks-catalog.json');
  if (marksCatalog) {
    const existing = new Set((db.prepare('SELECT name FROM marks').all() as Array<{ name: string }>).map(r => r.name));
    const insertMark = db.prepare(`
      INSERT INTO marks (name, category, how_to_obtain, games, title_suffix, sprite_key, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM marks))
    `);
    let added = 0;
    db.transaction(() => {
      for (const m of marksCatalog) {
        if (existing.has(m.name)) continue;
        insertMark.run(m.name, m.category, m.how_to_obtain, JSON.stringify(m.games), m.title_suffix, '');
        added++;
      }
    })();
    console.log(`  Marks catalog: ${added} new entries added (${existing.size} already present).`);
  }

  // 4. Z-A new megas → species_forms
  if (za && za.new_megas) {
    const insertForm = db.prepare(`
      INSERT OR IGNORE INTO species_forms (species_id, form_name, form_order, form_category, is_battle_only, is_collectible)
      VALUES (?, ?, (SELECT COALESCE(MAX(form_order), 0) + 1 FROM species_forms WHERE species_id = ?), 'mega', 0, 1)
    `);
    let added = 0;
    db.transaction(() => {
      for (const m of za.new_megas) {
        const r = insertForm.run(m.species_id, m.form_name, m.species_id);
        if (Number(r.changes) > 0) added++;
      }
    })();
    console.log(`  Z-A megas: ${added} new species_forms rows added.`);
  }
}
