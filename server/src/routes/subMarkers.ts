import { Router } from 'express';
import db from '../db.js';
import { persistIconOverrideToSeed, persistCustomMarkerToSeed } from './guide.js';

// Two routers so the controller can mount them at distinct prefixes without
// the `/:mapKey` route shadowing sibling paths.
const router = Router();           // mounted at /api/guide/sub-markers
export const customMarkersRouter = Router(); // mounted at /api/guide/custom-markers

// Table name allowlist for PATCH endpoint
const TABLE_MAP: Record<string, string> = {
  trainers: 'location_trainers',
  items: 'location_items',
  tms: 'location_tms',
  events: 'location_events',
};

// Mirror a single custom_markers row back to its seed JSON by natural_id.
// Safe to call multiple times; writes are idempotent.
function syncCustomMarkerToSeed(id: number): void {
  const row = db.prepare(`
    SELECT cm.natural_id, cm.label, cm.marker_type, cm.description, cm.x, cm.y,
           cm.icon AS sprite_ref, cm.sprite_kind, gm.map_key,
           paired.natural_id AS paired_natural_id
    FROM custom_markers cm
    JOIN game_maps gm ON gm.id = cm.map_id
    LEFT JOIN custom_markers paired ON paired.id = cm.paired_marker_id
    WHERE cm.id = ?
  `).get(id) as any;
  if (!row) return;
  persistCustomMarkerToSeed(row.map_key, {
    natural_id: row.natural_id,
    label: row.label,
    marker_type: row.marker_type,
    description: row.description,
    x: row.x,
    y: row.y,
    sprite_kind: row.sprite_kind,
    sprite_ref: row.sprite_ref,
    paired_id: row.paired_natural_id ?? null,
  });
}

// Validate sprite_kind: must be null/undefined, 'item', or 'pokemon'.
// Returns true if valid.
function isValidSpriteKind(v: unknown): v is null | 'item' | 'pokemon' | undefined {
  return v == null || v === 'item' || v === 'pokemon';
}

// Validate sprite_ref: null, or non-empty string ≤ 64 chars.
function isValidSpriteRef(v: unknown): v is null | string | undefined {
  if (v == null) return true;
  return typeof v === 'string' && v.length > 0 && v.length <= 64;
}

// GET /api/guide/sub-markers/export/:mapKey — export all placed positions
router.get('/export/:mapKey', (req, res) => {
  const { mapKey } = req.params;

  const map = db.prepare('SELECT id FROM game_maps WHERE map_key = ?').get(mapKey) as { id: number } | undefined;
  if (!map) return res.status(404).json({ error: 'Map not found' });

  const trainers = db.prepare(`
    SELECT lt.id, lt.x, lt.y, lt.trainer_class, lt.trainer_name, lt.game
    FROM location_trainers lt
    JOIN map_locations ml ON ml.id = lt.location_id
    WHERE ml.map_id = ? AND lt.x IS NOT NULL AND lt.y IS NOT NULL
  `).all(map.id);

  const items = db.prepare(`
    SELECT li.id, li.x, li.y, li.item_name, li.method, li.game
    FROM location_items li
    JOIN map_locations ml ON ml.id = li.location_id
    WHERE ml.map_id = ? AND li.x IS NOT NULL AND li.y IS NOT NULL
  `).all(map.id);

  const tms = db.prepare(`
    SELECT lt.id, lt.x, lt.y, lt.tm_number, lt.move_name, lt.method, lt.game
    FROM location_tms lt
    JOIN map_locations ml ON ml.id = lt.location_id
    WHERE ml.map_id = ? AND lt.x IS NOT NULL AND lt.y IS NOT NULL
  `).all(map.id);

  const events = db.prepare(`
    SELECT le.id, le.x, le.y, le.event_name, le.event_type, le.game
    FROM location_events le
    JOIN map_locations ml ON ml.id = le.location_id
    WHERE ml.map_id = ? AND le.x IS NOT NULL AND le.y IS NOT NULL
  `).all(map.id);

  const custom = db.prepare(`
    SELECT id, natural_id, x, y, label, marker_type, game
    FROM custom_markers
    WHERE map_id = ? AND x IS NOT NULL AND y IS NOT NULL
  `).all(map.id);

  res.json({ trainers, items, tms, events, custom });
});

// POST /api/guide/sub-markers/import/:mapKey — bulk import positions
router.post('/import/:mapKey', (req, res) => {
  const { mapKey } = req.params;

  const map = db.prepare('SELECT id FROM game_maps WHERE map_key = ?').get(mapKey) as { id: number } | undefined;
  if (!map) return res.status(404).json({ error: 'Map not found' });

  const { trainers = [], items = [], tms = [], events = [], custom = [] } = req.body as {
    trainers?: { id: number; x: number; y: number }[];
    items?: { id: number; x: number; y: number }[];
    tms?: { id: number; x: number; y: number }[];
    events?: { id: number; x: number; y: number }[];
    custom?: { id: number; x: number; y: number }[];
  };

  const updateTrainer = db.prepare(`
    UPDATE location_trainers SET x = ?, y = ?
    WHERE id = ? AND location_id IN (SELECT id FROM map_locations WHERE map_id = ?)
  `);
  const updateItem = db.prepare(`
    UPDATE location_items SET x = ?, y = ?
    WHERE id = ? AND location_id IN (SELECT id FROM map_locations WHERE map_id = ?)
  `);
  const updateTm = db.prepare(`
    UPDATE location_tms SET x = ?, y = ?
    WHERE id = ? AND location_id IN (SELECT id FROM map_locations WHERE map_id = ?)
  `);
  const updateEvent = db.prepare(`
    UPDATE location_events SET x = ?, y = ?
    WHERE id = ? AND location_id IN (SELECT id FROM map_locations WHERE map_id = ?)
  `);
  const updateCustom = db.prepare(`
    UPDATE custom_markers SET x = ?, y = ?
    WHERE id = ? AND map_id = ?
  `);

  const importAll = db.transaction(() => {
    for (const row of trainers) updateTrainer.run(row.x, row.y, row.id, map.id);
    for (const row of items) updateItem.run(row.x, row.y, row.id, map.id);
    for (const row of tms) updateTm.run(row.x, row.y, row.id, map.id);
    for (const row of events) updateEvent.run(row.x, row.y, row.id, map.id);
    for (const row of custom) updateCustom.run(row.x, row.y, row.id, map.id);
  });

  importAll();
  for (const row of custom) syncCustomMarkerToSeed(row.id);
  res.json({ ok: true });
});

// GET /api/guide/sub-markers/:mapKey?game=red — all sub-markers unified
router.get('/:mapKey', (req, res) => {
  const { mapKey } = req.params;
  const game = req.query.game as string | undefined;

  const map = db.prepare('SELECT id FROM game_maps WHERE map_key = ?').get(mapKey) as { id: number } | undefined;
  if (!map) return res.status(404).json({ error: 'Map not found' });

  const gameFilter = game ? ' AND t.game = ?' : '';
  const baseParams = (extra: any[] = []) => game ? [map.id, game, ...extra] : [map.id, ...extra];

  // x/y come from marker_positions when present (durable across reseeds)
  // and fall back to the reference table's own x/y for initial parser-seeded
  // placements that haven't yet been moved by a user.
  const mpJoin = (type: string) =>
    `LEFT JOIN marker_positions mp ON mp.marker_type = '${type}' AND mp.reference_id = t.id AND mp.map_key = (SELECT map_key FROM game_maps WHERE id = ml.map_id)`;

  const trainers = db.prepare(`
    SELECT
      t.id,
      'trainer' AS type,
      (t.trainer_class || ' ' || t.trainer_name) AS name,
      NULL AS detail,
      ml.location_key,
      ml.display_name AS location_name,
      ml.id AS location_id,
      COALESCE(mp.x, t.x) AS x,
      COALESCE(mp.y, t.y) AS y,
      NULL AS method
    FROM location_trainers t
    JOIN map_locations ml ON ml.id = t.location_id
    ${mpJoin('trainer')}
    WHERE ml.map_id = ?${gameFilter}
  `).all(...baseParams());

  const items = db.prepare(`
    SELECT
      t.id,
      'item' AS type,
      t.item_name AS name,
      t.description AS detail,
      ml.location_key,
      ml.display_name AS location_name,
      ml.id AS location_id,
      COALESCE(mp.x, t.x) AS x,
      COALESCE(mp.y, t.y) AS y,
      t.method
    FROM location_items t
    JOIN map_locations ml ON ml.id = t.location_id
    ${mpJoin('item')}
    WHERE ml.map_id = ?${gameFilter}
  `).all(...baseParams());

  const tms = db.prepare(`
    SELECT
      t.id,
      'tm' AS type,
      ('TM' || printf('%02d', t.tm_number) || ' ' || t.move_name) AS name,
      t.method AS detail,
      ml.location_key,
      ml.display_name AS location_name,
      ml.id AS location_id,
      COALESCE(mp.x, t.x) AS x,
      COALESCE(mp.y, t.y) AS y,
      t.method
    FROM location_tms t
    JOIN map_locations ml ON ml.id = t.location_id
    ${mpJoin('tm')}
    WHERE ml.map_id = ?${gameFilter}
  `).all(...baseParams());

  const events = db.prepare(`
    SELECT
      t.id,
      'event' AS type,
      t.event_name AS name,
      t.description AS detail,
      ml.location_key,
      ml.display_name AS location_name,
      ml.id AS location_id,
      COALESCE(mp.x, t.x) AS x,
      COALESCE(mp.y, t.y) AS y,
      t.event_type AS method
    FROM location_events t
    JOIN map_locations ml ON ml.id = t.location_id
    ${mpJoin('event')}
    WHERE ml.map_id = ?${gameFilter}
  `).all(...baseParams());

  const customGameFilter = game ? ' AND cm.game = ?' : '';
  const customParams = game ? [map.id, game] : [map.id];
  const custom = db.prepare(`
    SELECT
      cm.id,
      cm.natural_id,
      'custom' AS type,
      cm.label AS name,
      cm.description AS detail,
      '' AS location_key,
      '' AS location_name,
      0 AS location_id,
      cm.x,
      cm.y,
      cm.marker_type AS method,
      cm.sprite_kind,
      cm.icon AS sprite_ref,
      cm.paired_marker_id,
      pm.x AS paired_x,
      pm.y AS paired_y,
      pm.label AS paired_label,
      pgm.map_key AS paired_map_key,
      pgm.display_name AS paired_map_name
    FROM custom_markers cm
    LEFT JOIN custom_markers pm ON pm.id = cm.paired_marker_id
    LEFT JOIN game_maps pgm ON pgm.id = pm.map_id
    WHERE cm.map_id = ?${customGameFilter}
  `).all(...customParams);

  const all = [...trainers, ...items, ...tms, ...events, ...custom];
  res.json(all);
});

// PATCH /api/guide/custom-markers/:id — update editable fields
customMarkersRouter.patch('/:id', (req, res) => {
  const allowed = ['x', 'y', 'label', 'description', 'marker_type', 'color', 'icon', 'sprite_kind'] as const;
  const sets: string[] = [];
  const values: any[] = [];
  // sprite_ref is an alias that writes to the `icon` column.
  if ('sprite_ref' in req.body) {
    if (!isValidSpriteRef(req.body.sprite_ref)) {
      return res.status(400).json({ error: 'sprite_ref must be null or a non-empty string ≤ 64 chars' });
    }
    sets.push('icon = ?');
    values.push(req.body.sprite_ref ?? null);
  }
  if ('sprite_kind' in req.body && !isValidSpriteKind(req.body.sprite_kind)) {
    return res.status(400).json({ error: "sprite_kind must be null, 'item', or 'pokemon'" });
  }
  for (const key of allowed) {
    if (key in req.body) {
      // Skip icon if sprite_ref was already handled (avoid double-write / conflict).
      if (key === 'icon' && 'sprite_ref' in req.body) continue;
      sets.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No editable fields provided' });
  values.push(Number(req.params.id));
  const result = db.prepare(`UPDATE custom_markers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) return res.status(404).json({ error: 'Custom marker not found' });
  syncCustomMarkerToSeed(Number(req.params.id));
  res.json({ ok: true });
});

// PUT /api/guide/sub-markers/override — upsert sprite override for a seeded sub-marker
// Body: { sub_marker_type, reference_id, sprite_kind, sprite_ref }
router.put('/override', (req, res) => {
  const { sub_marker_type, reference_id, sprite_kind, sprite_ref } = req.body ?? {};
  if (typeof sub_marker_type !== 'string' || !sub_marker_type) {
    return res.status(400).json({ error: 'sub_marker_type required' });
  }
  if (typeof reference_id !== 'number' || !Number.isInteger(reference_id)) {
    return res.status(400).json({ error: 'reference_id must be int' });
  }
  if (sprite_kind == null || !isValidSpriteKind(sprite_kind)) {
    return res.status(400).json({ error: "sprite_kind required ('item' or 'pokemon')" });
  }
  if (!sprite_ref || !isValidSpriteRef(sprite_ref)) {
    return res.status(400).json({ error: 'sprite_ref required (non-empty, ≤ 64 chars)' });
  }

  db.prepare(`
    INSERT INTO sub_marker_overrides (sub_marker_type, reference_id, sprite_kind, sprite_ref)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(sub_marker_type, reference_id) DO UPDATE SET
      sprite_kind = excluded.sprite_kind,
      sprite_ref = excluded.sprite_ref
  `).run(sub_marker_type, reference_id, sprite_kind as string, sprite_ref as string);
  persistIconOverrideToSeed(sub_marker_type, reference_id, sprite_kind as string, sprite_ref as string);
  res.json({ ok: true });
});

// DELETE /api/guide/sub-markers/override/:type/:id — clear a sprite override
router.delete('/override/:type/:id', (req, res) => {
  const type = req.params.type;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM sub_marker_overrides WHERE sub_marker_type = ? AND reference_id = ?').run(type, id);
  persistIconOverrideToSeed(type, id, null, null);
  res.json({ ok: true });
});

// PATCH /api/guide/sub-markers/:table/:id — update x/y position
// Writes to marker_positions (durable) rather than the reference table, so
// placements survive reseeds/renames.
const TABLE_TO_TYPE: Record<string, string> = {
  trainers: 'trainer',
  items: 'item',
  tms: 'tm',
  events: 'event',
};
router.patch('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const { x, y } = req.body;

  const realTable = TABLE_MAP[table];
  const markerType = TABLE_TO_TYPE[table];
  if (!realTable || !markerType) {
    return res.status(400).json({ error: `Invalid table '${table}'. Must be one of: ${Object.keys(TABLE_MAP).join(', ')}` });
  }

  const bothNumbers = typeof x === 'number' && typeof y === 'number';
  const bothNull = x === null && y === null;
  if (!bothNumbers && !bothNull) {
    return res.status(400).json({ error: 'x and y must both be numbers or both be null' });
  }

  // Resolve map_key from the reference row so we can key the position
  // correctly per map.
  const mapRow = db.prepare(`
    SELECT gm.map_key FROM ${realTable} t
    JOIN map_locations ml ON ml.id = t.location_id
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE t.id = ?
  `).get(Number(id)) as { map_key: string } | undefined;
  if (!mapRow) return res.status(404).json({ error: 'Row not found' });

  if (bothNull) {
    db.prepare(`
      DELETE FROM marker_positions
      WHERE map_key = ? AND marker_type = ? AND reference_id = ? AND game_override IS NULL
    `).run(mapRow.map_key, markerType, Number(id));
  } else {
    // Conflict target uses the partial unique index since SQLite treats NULL
    // game_override as distinct under the composite UNIQUE.
    db.prepare(`
      INSERT INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
      VALUES (?, ?, ?, ?, ?, NULL)
      ON CONFLICT(map_key, marker_type, reference_id) WHERE game_override IS NULL
      DO UPDATE SET x = excluded.x, y = excluded.y
    `).run(mapRow.map_key, markerType, Number(id), x, y);
  }

  res.json({ ok: true });
});

// POST /api/guide/custom-markers — create a custom marker
customMarkersRouter.post('/', (req, res) => {
  const { map_id, game, label, marker_type, description, x, y, color, icon, sprite_kind, sprite_ref } = req.body;

  if (!map_id || !label || !marker_type || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Required fields: map_id, label, marker_type, x, y' });
  }
  if (!isValidSpriteKind(sprite_kind)) {
    return res.status(400).json({ error: "sprite_kind must be null, 'item', or 'pokemon'" });
  }
  if (!isValidSpriteRef(sprite_ref)) {
    return res.status(400).json({ error: 'sprite_ref must be null or a non-empty string ≤ 64 chars' });
  }

  // sprite_ref is the canonical name; falls back to legacy `icon` field.
  const iconValue = sprite_ref !== undefined ? (sprite_ref ?? null) : (icon ?? null);

  const natural_id = crypto.randomUUID();
  const result = db.prepare(`
    INSERT INTO custom_markers (map_id, game, label, marker_type, description, x, y, color, icon, sprite_kind, natural_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(map_id, game ?? null, label, marker_type, description ?? null, x, y, color ?? null, iconValue, sprite_kind ?? null, natural_id);

  syncCustomMarkerToSeed(Number(result.lastInsertRowid));
  res.status(201).json({ id: result.lastInsertRowid, natural_id, ok: true });
});

// DELETE /api/guide/custom-markers/:id — delete a custom marker
customMarkersRouter.delete('/:id', (req, res) => {
  const toDelete = db.prepare(`
    SELECT cm.natural_id, gm.map_key
    FROM custom_markers cm
    JOIN game_maps gm ON gm.id = cm.map_id
    WHERE cm.id = ?
  `).get(Number(req.params.id)) as { natural_id: string; map_key: string } | undefined;
  const result = db.prepare('DELETE FROM custom_markers WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Custom marker not found' });
  if (toDelete) persistCustomMarkerToSeed(toDelete.map_key, { natural_id: toDelete.natural_id, deleted: true });
  res.json({ ok: true });
});

// POST /api/guide/custom-markers/:id/link { partnerId } — pair two connection markers
customMarkersRouter.post('/:id/link', (req, res) => {
  const id = Number(req.params.id);
  const partnerId = Number(req.body?.partnerId);
  if (!partnerId || id === partnerId) return res.status(400).json({ error: 'partnerId required and must differ' });

  const rows = db.prepare(
    `SELECT id, marker_type, game, paired_marker_id FROM custom_markers WHERE id IN (?, ?)`
  ).all(id, partnerId) as { id: number; marker_type: string; game: string | null; paired_marker_id: number | null }[];

  if (rows.length !== 2) return res.status(404).json({ error: 'Both markers must exist' });
  for (const r of rows) {
    if (r.marker_type !== 'connection') return res.status(400).json({ error: 'Both markers must be type=connection' });
    if (r.paired_marker_id != null) return res.status(400).json({ error: `Marker ${r.id} is already linked` });
  }
  if (rows[0].game !== rows[1].game) return res.status(400).json({ error: 'Markers must belong to the same game' });

  const upd = db.prepare('UPDATE custom_markers SET paired_marker_id = ? WHERE id = ?');
  db.transaction(() => {
    upd.run(partnerId, id);
    upd.run(id, partnerId);
  })();
  syncCustomMarkerToSeed(id);
  syncCustomMarkerToSeed(partnerId);
  res.json({ ok: true });
});

// DELETE /api/guide/custom-markers/:id/link — unlink both sides
customMarkersRouter.delete('/:id/link', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT paired_marker_id FROM custom_markers WHERE id = ?').get(id) as { paired_marker_id: number | null } | undefined;
  if (!row) return res.status(404).json({ error: 'Marker not found' });
  if (row.paired_marker_id == null) return res.json({ ok: true });
  const partnerId = row.paired_marker_id;
  const upd = db.prepare('UPDATE custom_markers SET paired_marker_id = NULL WHERE id = ?');
  db.transaction(() => { upd.run(id); upd.run(partnerId); })();
  syncCustomMarkerToSeed(id);
  syncCustomMarkerToSeed(partnerId);
  res.json({ ok: true });
});

// GET /api/guide/custom-markers/unlinked?game=red — connection markers without a partner
customMarkersRouter.get('/unlinked', (req, res) => {
  const game = req.query.game as string | undefined;
  if (!game) return res.status(400).json({ error: 'game query param required' });
  const rows = db.prepare(`
    SELECT cm.id, cm.label, cm.map_id, gm.map_key, gm.display_name AS map_name, cm.x, cm.y
    FROM custom_markers cm
    JOIN game_maps gm ON gm.id = cm.map_id
    WHERE cm.marker_type = 'connection' AND cm.paired_marker_id IS NULL AND cm.game = ?
    ORDER BY gm.display_name, cm.label
  `).all(game);
  res.json(rows);
});

// POST /api/guide/custom-markers/pair — create two linked connection markers in one tx
customMarkersRouter.post('/pair', (req, res) => {
  const { game, a, b } = req.body as {
    game?: string;
    a?: { map_id: number; label: string; x: number; y: number; description?: string };
    b?: { map_id: number; label: string; x: number; y: number; description?: string };
  };
  if (!a || !b || !a.label || !b.label) return res.status(400).json({ error: 'a and b with labels required' });
  if (a.x == null || a.y == null || b.x == null || b.y == null) return res.status(400).json({ error: 'positions required' });

  const ins = db.prepare(`
    INSERT INTO custom_markers (map_id, game, label, marker_type, description, x, y, natural_id)
    VALUES (?, ?, ?, 'connection', ?, ?, ?, ?)
  `);
  const link = db.prepare('UPDATE custom_markers SET paired_marker_id = ? WHERE id = ?');

  let idA = 0, idB = 0;
  const naturalA = crypto.randomUUID();
  const naturalB = crypto.randomUUID();
  db.transaction(() => {
    idA = Number(ins.run(a.map_id, game ?? null, a.label, a.description ?? null, a.x, a.y, naturalA).lastInsertRowid);
    idB = Number(ins.run(b.map_id, game ?? null, b.label, b.description ?? null, b.x, b.y, naturalB).lastInsertRowid);
    link.run(idB, idA);
    link.run(idA, idB);
  })();
  syncCustomMarkerToSeed(idA);
  syncCustomMarkerToSeed(idB);
  res.status(201).json({ idA, idB, naturalA, naturalB });
});

export default router;
