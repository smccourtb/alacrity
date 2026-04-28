/**
 * One-shot: dumps current DB state for marker_positions, sub_marker_overrides,
 * and custom_markers into the seed JSON files so wipe+reseed is safe.
 *
 *   bun run server/src/scripts/backfill-persist.ts
 */
import db from '../db.js';
import {
  persistPositionToSeed,
  persistIconOverrideToSeed,
  persistCustomMarkerToSeed,
} from '../routes/guide.js';

console.log('[backfill] marker_positions');
const positions = db.prepare('SELECT marker_type, reference_id, x, y FROM marker_positions').all() as any[];
for (const p of positions) {
  persistPositionToSeed(p.marker_type, p.reference_id, p.x, p.y);
}
console.log(`[backfill]   ${positions.length} positions written`);

console.log('[backfill] sub_marker_overrides');
const overrides = db.prepare('SELECT sub_marker_type, reference_id, sprite_kind, sprite_ref FROM sub_marker_overrides').all() as any[];
for (const o of overrides) {
  persistIconOverrideToSeed(o.sub_marker_type, o.reference_id, o.sprite_kind, o.sprite_ref);
}
console.log(`[backfill]   ${overrides.length} overrides written`);

console.log('[backfill] custom_markers');
const markers = db.prepare(`
  SELECT cm.natural_id, cm.label, cm.marker_type, cm.description, cm.x, cm.y,
         cm.icon AS sprite_ref, cm.sprite_kind, gm.map_key,
         paired.natural_id AS paired_natural_id
  FROM custom_markers cm
  JOIN game_maps gm ON gm.id = cm.map_id
  LEFT JOIN custom_markers paired ON paired.id = cm.paired_marker_id
`).all() as any[];
for (const m of markers) {
  if (!m.natural_id) continue; // should be backfilled by migration, but be defensive
  persistCustomMarkerToSeed(m.map_key, {
    natural_id: m.natural_id,
    label: m.label,
    marker_type: m.marker_type,
    description: m.description,
    x: m.x,
    y: m.y,
    sprite_kind: m.sprite_kind,
    sprite_ref: m.sprite_ref,
    paired_id: m.paired_natural_id ?? null,
  });
}
console.log(`[backfill]   ${markers.length} custom markers written`);

console.log('[backfill] done');
process.exit(0);
