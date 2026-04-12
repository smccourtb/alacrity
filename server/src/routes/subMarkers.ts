import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Table name allowlist for PATCH endpoint
const TABLE_MAP: Record<string, string> = {
  trainers: 'location_trainers',
  items: 'location_items',
  tms: 'location_tms',
  events: 'location_events',
};

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
    SELECT id, x, y, label, marker_type, game
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

  const trainers = db.prepare(`
    SELECT
      t.id,
      'trainer' AS type,
      (t.trainer_class || ' ' || t.trainer_name) AS name,
      NULL AS detail,
      ml.location_key,
      ml.display_name AS location_name,
      ml.id AS location_id,
      t.x,
      t.y,
      NULL AS method
    FROM location_trainers t
    JOIN map_locations ml ON ml.id = t.location_id
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
      t.x,
      t.y,
      t.method
    FROM location_items t
    JOIN map_locations ml ON ml.id = t.location_id
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
      t.x,
      t.y,
      t.method
    FROM location_tms t
    JOIN map_locations ml ON ml.id = t.location_id
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
      t.x,
      t.y,
      t.event_type AS method
    FROM location_events t
    JOIN map_locations ml ON ml.id = t.location_id
    WHERE ml.map_id = ?${gameFilter}
  `).all(...baseParams());

  const customGameFilter = game ? ' AND game = ?' : '';
  const customParams = game ? [map.id, game] : [map.id];
  const custom = db.prepare(`
    SELECT
      id,
      'custom' AS type,
      label AS name,
      description AS detail,
      '' AS location_key,
      '' AS location_name,
      0 AS location_id,
      x,
      y,
      marker_type AS method
    FROM custom_markers
    WHERE map_id = ?${customGameFilter}
  `).all(...customParams);

  const all = [...trainers, ...items, ...tms, ...events, ...custom];
  res.json(all);
});

// PATCH /api/guide/custom-markers/:id — reposition a custom marker
router.patch('/custom-markers/:id', (req, res) => {
  const { x, y } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y must be numbers' });
  }
  const result = db.prepare('UPDATE custom_markers SET x = ?, y = ? WHERE id = ?').run(x, y, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Custom marker not found' });
  res.json({ ok: true });
});

// PATCH /api/guide/sub-markers/:table/:id — update x/y position
router.patch('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const { x, y } = req.body;

  const realTable = TABLE_MAP[table];
  if (!realTable) {
    return res.status(400).json({ error: `Invalid table '${table}'. Must be one of: ${Object.keys(TABLE_MAP).join(', ')}` });
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y must be numbers' });
  }

  const result = db.prepare(`UPDATE ${realTable} SET x = ?, y = ? WHERE id = ?`).run(x, y, Number(id));
  if (result.changes === 0) return res.status(404).json({ error: 'Row not found' });

  res.json({ ok: true });
});

// POST /api/guide/custom-markers — create a custom marker
router.post('/custom-markers', (req, res) => {
  const { map_id, game, label, marker_type, description, x, y, color, icon } = req.body;

  if (!map_id || !label || !marker_type || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Required fields: map_id, label, marker_type, x, y' });
  }

  const result = db.prepare(`
    INSERT INTO custom_markers (map_id, game, label, marker_type, description, x, y, color, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(map_id, game ?? null, label, marker_type, description ?? null, x, y, color ?? null, icon ?? null);

  res.status(201).json({ id: result.lastInsertRowid, ok: true });
});

// DELETE /api/guide/custom-markers/:id — delete a custom marker
router.delete('/custom-markers/:id', (req, res) => {
  const result = db.prepare('DELETE FROM custom_markers WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Custom marker not found' });
  res.json({ ok: true });
});

export default router;
