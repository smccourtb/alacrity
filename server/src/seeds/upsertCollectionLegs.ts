/**
 * Idempotent UPSERT for collection_legs. The original `seedCollectionLegs()`
 * early-returns if any rows exist — fine for first-run seeding, but doesn't
 * propagate JSON edits (e.g. flipping 'upcoming' → 'active', adding a new
 * leg). This runs after the initial seed and reconciles JSON ↔ DB.
 *
 * Legs removed from the JSON are NOT deleted from the DB — leg removal must
 * be done by hand.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';

interface LegJson {
  key: string;
  label: string;
  origin_mark: string | null;
  games: string[];
  leg_order: number;
  status: string;
}

export function upsertCollectionLegs(): void {
  const data: LegJson[] = JSON.parse(
    readFileSync(join(paths.seedDataDir, 'meta/collection-legs.json'), 'utf-8'),
  );

  const upsert = db.prepare(`
    INSERT INTO collection_legs (key, label, origin_mark, games, leg_order, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      label       = excluded.label,
      origin_mark = excluded.origin_mark,
      games       = excluded.games,
      leg_order   = excluded.leg_order,
      status      = excluded.status
  `);

  const tx = db.transaction(() => {
    for (const leg of data) {
      upsert.run(
        leg.key,
        leg.label,
        leg.origin_mark,
        JSON.stringify(leg.games),
        leg.leg_order,
        leg.status,
      );
    }
  });
  tx();
  console.log(`  Upserted ${data.length} collection legs.`);
}
