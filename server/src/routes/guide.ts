import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { computeProgress } from '../services/guideProgress.js';
import { loadFlagDefinitions } from '../services/flagParsers/index.js';
import type { FlagDefinition } from '../services/flagParsers/types.js';
import { resolveCollection } from '../services/identityService.js';
import { resolveClustersForMap } from '../services/clusterResolve.js';
import { keyForMarker } from '../services/clusterIdentity.js';
import subMarkersRouter, { customMarkersRouter } from './subMarkers.js';

const router = Router();

router.use('/sub-markers', subMarkersRouter);
router.use('/custom-markers', customMarkersRouter);

// Migrations for guide tables
try { db.exec('ALTER TABLE location_trainers ADD COLUMN description TEXT'); } catch {}
try { db.exec('ALTER TABLE location_tms ADD COLUMN description TEXT'); } catch {}

// GET /api/guide/maps — list all game maps
router.get('/maps', (_req, res) => {
  const maps = db.prepare('SELECT * FROM game_maps').all() as any[];
  res.json(maps.map(m => ({ ...m, games: JSON.parse(m.games) })));
});

// GET /api/guide/maps/:mapKey — single map by key
router.get('/maps/:mapKey', (req, res) => {
  const map = db.prepare('SELECT * FROM game_maps WHERE map_key = ?').get(req.params.mapKey) as any;
  if (!map) return res.status(404).json({ error: 'Map not found' });
  res.json({ ...map, games: JSON.parse(map.games) });
});

// GET /api/guide/game-map/:game — resolve a game code to its map
router.get('/game-map/:game', (req, res) => {
  const { game } = req.params;
  const map = db.prepare(`
    SELECT * FROM game_maps WHERE games LIKE ?
  `).get(`%"${game}"%`) as any;

  if (!map) {
    return res.status(404).json({ error: `No map found for game: ${game}` });
  }

  map.games = JSON.parse(map.games);
  res.json(map);
});

// GET /api/guide/locations/:mapKey — all locations for a map
router.get('/locations/:mapKey', (req, res) => {
  const locations = db.prepare(`
    SELECT ml.* FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE gm.map_key = ?
    ORDER BY ml.progression_order
  `).all(req.params.mapKey);
  res.json(locations);
});

// Writes calibrated x/y back to the source seed JSON so they survive DB wipes.
// In packaged mode the seed dir is read-only and the write fails silently — the
// DB update is still authoritative at runtime.
function persistLocationToSeed(mapKey: string, locationKey: string, x: number, y: number): void {
  try {
    const filePath = join(paths.seedDataDir, `${mapKey}-locations.json`);
    if (!existsSync(filePath)) return;
    const raw = readFileSync(filePath, 'utf-8');
    const escapedKey = locationKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(
      `("key"\\s*:\\s*"${escapedKey}"[^}]*?"x"\\s*:\\s*)-?[\\d.]+([^}]*?"y"\\s*:\\s*)-?[\\d.]+`
    );
    if (!pattern.test(raw)) return;
    const updated = raw.replace(pattern, `$1${x.toFixed(4)}$2${y.toFixed(4)}`);
    if (updated !== raw) writeFileSync(filePath, updated, 'utf-8');
  } catch (err) {
    console.warn(`[guide] Could not persist ${mapKey}/${locationKey} to seed JSON: ${(err as Error).message}`);
  }
}

// PATCH /api/guide/locations/:id — update location marker position
router.patch('/locations/:id', (req, res) => {
  const { x, y } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y must be numbers' });
  }
  const id = Number(req.params.id);
  const result = db.prepare('UPDATE map_locations SET x = ?, y = ? WHERE id = ?').run(x, y, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Location not found' });

  const loc = db.prepare(`
    SELECT ml.location_key, gm.map_key
    FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE ml.id = ?
  `).get(id) as { location_key: string; map_key: string } | undefined;
  if (loc) persistLocationToSeed(loc.map_key, loc.location_key, x, y);

  res.json({ ok: true });
});

// GET /api/guide/walkthrough/:game — all steps for a game with completion status
router.get('/walkthrough/:game', (req, res) => {
  const game = req.params.game;

  const rows = db.prepare(`
    SELECT
      ws.id, ws.step_order, ws.action_tag, ws.description,
      ws.species_id, ws.specimen_role, ws.auto_trackable, ws.notes,
      ws.specimen_task_id, ws.is_version_exclusive, ws.exclusive_to,
      ws.save_file_id AS step_save_file_id,
      s.name AS species_name,
      s.sprite_url,
      ml.id AS location_id, ml.location_key, ml.display_name AS location_name,
      ml.x, ml.y, ml.progression_order,
      st.save_file_id AS task_save_file_id,
      sf.filename AS save_filename,
      sf.notes AS save_notes,
      sf.file_path AS save_file_path,
      sp.status AS specimen_status
    FROM walkthrough_steps ws
    LEFT JOIN species s ON s.id = ws.species_id
    JOIN map_locations ml ON ml.id = ws.location_id
    LEFT JOIN specimen_tasks st ON st.id = ws.specimen_task_id
    LEFT JOIN specimen_progress sp ON sp.target_id = st.target_id
    LEFT JOIN save_files sf ON sf.id = COALESCE(ws.save_file_id, st.save_file_id)
    WHERE ws.game = ?
    ORDER BY ml.progression_order, ws.step_order
  `).all(game) as any[];
  const steps = rows;

  // Get milestone (manual) completion from guide_progress
  const milestoneProgress = db.prepare(`
    SELECT step_id, MAX(completed) as completed
    FROM guide_progress
    GROUP BY step_id
  `).all() as { step_id: number; completed: number }[];
  const milestoneMap = new Map(milestoneProgress.map(p => [p.step_id, p.completed === 1]));

  // Group by location
  const grouped: Record<string, { location: any; steps: any[] }> = {};
  for (const step of steps) {
    const key = step.location_key;
    if (!grouped[key]) {
      grouped[key] = {
        location: {
          id: step.location_id,
          key: step.location_key,
          name: step.location_name,
          x: step.x,
          y: step.y,
        },
        steps: [],
      };
    }

    // Determine completion
    const isSpecimenStep = step.specimen_task_id !== null;
    const specimenCompleted = isSpecimenStep && ['completed', 'obtained', 'journey_complete'].includes(step.specimen_status);
    const milestoneCompleted = !isSpecimenStep && (milestoneMap.get(step.id) || false);

    grouped[key].steps.push({
      id: step.id,
      step_order: step.step_order,
      action_tag: step.action_tag,
      description: step.description,
      species_id: step.species_id,
      species_name: step.species_name,
      sprite_url: step.sprite_url,
      specimen_role: step.specimen_role,
      is_version_exclusive: step.is_version_exclusive,
      exclusive_to: step.exclusive_to,
      auto_trackable: step.auto_trackable,
      notes: step.notes,
      specimen_task_id: step.specimen_task_id,
      completed: specimenCompleted || milestoneCompleted,
      completed_from_save: specimenCompleted,
      save_file_id: step.step_save_file_id ?? step.task_save_file_id ?? null,
      save_label: step.save_filename ?? null,
      save_notes: step.save_notes ?? null,
      is_collection_target: step.specimen_task_id != null,
      collection_status: step.specimen_status ?? null,
    });
  }

  res.json(Object.values(grouped));
});

// GET /api/guide/encounters/:locationId — encounter table for a location
router.get('/encounters/:locationId', (req, res) => {
  const game = req.query.game as string;
  let sql = `
    SELECT me.*, s.name as species_name, s.sprite_url, s.type1, s.type2
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id = ?
  `;
  const params: any[] = [req.params.locationId];

  if (game) {
    sql += ' AND me.game = ?';
    params.push(game);
  }

  sql += ' ORDER BY me.encounter_rate DESC';

  const encounters = db.prepare(sql).all(...params);
  res.json(encounters);
});

// GET /api/guide/location/:locationId/collection-status
// Returns encounter species for this location annotated with caught/needed status
router.get('/location/:locationId/collection-status', (req, res) => {
  try {
    const locationId = Number(req.params.locationId);
    const game = req.query.game as string | undefined;

    let sql = `
    SELECT DISTINCT me.species_id, s.name as species_name, s.sprite_url
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id = ?
  `;
    const params: any[] = [locationId];
    if (game) {
      sql += ' AND me.game = ?';
      params.push(game);
    }
    sql += ' ORDER BY me.species_id';

    const encounters = db.prepare(sql).all(...params) as any[];

    const collection = resolveCollection();
    const collectedSpecies = new Set(collection.map((c: any) => c.species_id));

    const annotated = encounters.map((e: any) => ({
      ...e,
      caught: collectedSpecies.has(e.species_id),
    }));

    const caughtCount = annotated.filter((e: any) => e.caught).length;

    res.json({
      encounters: annotated,
      summary: { total: encounters.length, caught: caughtCount },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guide/progress/:game/:saveId — computed progress
router.get('/progress/:game/:saveId', (req, res) => {
  const { game, saveId } = req.params;
  const playthroughId = req.query.playthrough_id ? Number(req.query.playthrough_id) : undefined;

  // Look up save file path
  const saveFile = db.prepare('SELECT file_path FROM save_files WHERE id = ?').get(Number(saveId)) as { file_path: string } | undefined;

  const result = computeProgress(game, saveFile?.file_path || null, Number(saveId), playthroughId);
  res.json(result);
});

// POST /api/guide/progress/:stepId — toggle manual progress (milestones only)
router.post('/progress/:stepId', (req, res) => {
  const stepId = Number(req.params.stepId);
  const { completed, notes } = req.body;

  // Only allow toggling milestones (steps without specimen_task_id)
  const step = db.prepare('SELECT specimen_task_id FROM walkthrough_steps WHERE id = ?').get(stepId) as { specimen_task_id: number | null } | undefined;
  if (!step) return res.status(404).json({ error: 'Step not found' });
  if (step.specimen_task_id !== null) {
    return res.status(400).json({ error: 'Specimen steps are completed from save data, not manually' });
  }

  db.prepare(`
    INSERT INTO guide_progress (step_id, completed, completed_at, notes)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(step_id, save_file_id) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at,
      notes = excluded.notes
  `).run(stepId, completed ? 1 : 0, notes || null);

  res.json({ ok: true });
});

// PATCH /api/guide/steps/:stepId/save — link/unlink a save file to a walkthrough step
router.patch('/steps/:stepId/save', (req, res) => {
  const { stepId } = req.params;
  const { save_file_id } = req.body; // null to unlink

  const step = db.prepare('SELECT * FROM walkthrough_steps WHERE id = ?').get(stepId);
  if (!step) return res.status(404).json({ error: 'Step not found' });

  db.prepare('UPDATE walkthrough_steps SET save_file_id = ? WHERE id = ?')
    .run(save_file_id ?? null, stepId);

  const updated = db.prepare('SELECT * FROM walkthrough_steps WHERE id = ?').get(stepId);
  res.json(updated);
});

// GET /api/guide/campaign — full GB origin campaign with phases
router.get('/campaign', (_req, res) => {
  const phasesPath = join(paths.seedDataDir, 'meta', 'campaign-phases.json');
  const phases = JSON.parse(readFileSync(phasesPath, 'utf-8')) as Array<{
    phase: number; game: string; label: string; description: string;
  }>;

  // Get milestone completion
  const milestoneProgress = db.prepare(`
    SELECT step_id, MAX(completed) as completed
    FROM guide_progress
    GROUP BY step_id
  `).all() as { step_id: number; completed: number }[];
  const milestoneMap = new Map(milestoneProgress.map(p => [p.step_id, p.completed === 1]));

  const result = phases.map(phase => {
    const steps = db.prepare(`
      SELECT ws.*, ml.location_key, ml.display_name as location_name, ml.x, ml.y,
             ml.progression_order,
             s.name as species_name, s.sprite_url,
             sp.status as specimen_status
      FROM walkthrough_steps ws
      JOIN map_locations ml ON ml.id = ws.location_id
      LEFT JOIN species s ON s.id = ws.species_id
      LEFT JOIN specimen_tasks stk ON stk.id = ws.specimen_task_id
      LEFT JOIN specimen_targets stt ON stt.id = stk.target_id
      LEFT JOIN specimen_progress sp ON sp.target_id = stt.id
      WHERE ws.game = ?
      ORDER BY ml.progression_order, ws.step_order
    `).all(phase.game) as any[];

    const locations: any[] = [];
    let currentLocKey: string | null = null;
    let currentGroup: any = null;
    let phaseTotal = 0;
    let phaseCompleted = 0;

    for (const step of steps) {
      if (step.location_key !== currentLocKey) {
        currentLocKey = step.location_key;
        currentGroup = {
          location: {
            id: step.location_id,
            key: step.location_key,
            name: step.location_name,
            x: step.x,
            y: step.y,
          },
          steps: [],
        };
        locations.push(currentGroup);
      }

      const isSpecimenStep = step.specimen_task_id !== null;
      const specimenCompleted = isSpecimenStep && ['completed', 'obtained', 'journey_complete'].includes(step.specimen_status);
      const milestoneCompleted = !isSpecimenStep && (milestoneMap.get(step.id) || false);
      const completed = specimenCompleted || milestoneCompleted;

      phaseTotal++;
      if (completed) phaseCompleted++;

      currentGroup.steps.push({
        id: step.id,
        step_order: step.step_order,
        action_tag: step.action_tag,
        description: step.description,
        species_id: step.species_id,
        species_name: step.species_name,
        sprite_url: step.sprite_url,
        specimen_role: step.specimen_role,
        is_version_exclusive: step.is_version_exclusive,
        exclusive_to: step.exclusive_to,
        auto_trackable: step.auto_trackable,
        notes: step.notes,
        specimen_task_id: step.specimen_task_id,
        completed,
        completed_from_save: specimenCompleted,
      });
    }

    return {
      ...phase,
      locations,
      progress: { total: phaseTotal, completed: phaseCompleted },
    };
  });

  const overallTotal = result.reduce((s, p) => s + p.progress.total, 0);
  const overallCompleted = result.reduce((s, p) => s + p.progress.completed, 0);

  res.json({ phases: result, overall: { total: overallTotal, completed: overallCompleted } });
});

// GET /api/guide/markers/:mapKey — all marker positions for a map
router.get('/markers/:mapKey', (req, res) => {
  const { mapKey } = req.params;
  const game = req.query.game as string | undefined;

  const rows = db.prepare(`
    SELECT
      mp.id, mp.marker_type, mp.reference_id, mp.x, mp.y, mp.game_override,
      CASE mp.marker_type
        WHEN 'item' THEN li.item_name
        WHEN 'hidden_item' THEN li.item_name
        WHEN 'trainer' THEN lt.trainer_name
        WHEN 'tm' THEN ltm.move_name
        WHEN 'event' THEN le.event_name
      END as name,
      CASE mp.marker_type
        WHEN 'item' THEN li.method
        WHEN 'hidden_item' THEN li.method
        WHEN 'trainer' THEN lt.trainer_class
        WHEN 'tm' THEN ltm.tm_number
        WHEN 'event' THEN le.event_type
      END as detail,
      CASE mp.marker_type
        WHEN 'item' THEN li.flag_index
        WHEN 'hidden_item' THEN li.flag_index
        WHEN 'trainer' THEN lt.flag_index
        WHEN 'tm' THEN ltm.flag_index
        WHEN 'event' THEN le.flag_index
      END as flag_index,
      CASE mp.marker_type
        WHEN 'item' THEN li.description
        WHEN 'hidden_item' THEN li.description
        WHEN 'trainer' THEN lt.description
        WHEN 'tm' THEN ltm.description
        WHEN 'event' THEN le.description
      END as description,
      CASE mp.marker_type
        WHEN 'item' THEN li.location_id
        WHEN 'hidden_item' THEN li.location_id
        WHEN 'trainer' THEN lt.location_id
        WHEN 'tm' THEN ltm.location_id
        WHEN 'event' THEN le.location_id
      END as location_id,
      ml.location_key,
      smo.sprite_kind AS sprite_kind,
      smo.sprite_ref AS sprite_ref
    FROM marker_positions mp
    LEFT JOIN location_items li ON (mp.marker_type IN ('item','hidden_item') AND mp.reference_id = li.id AND (? = '' OR li.game = ?))
    LEFT JOIN location_trainers lt ON (mp.marker_type = 'trainer' AND mp.reference_id = lt.id AND (? = '' OR lt.game = ?))
    LEFT JOIN location_tms ltm ON (mp.marker_type = 'tm' AND mp.reference_id = ltm.id AND (? = '' OR ltm.game = ?))
    LEFT JOIN location_events le ON (mp.marker_type = 'event' AND mp.reference_id = le.id AND (? = '' OR le.game = ?))
    LEFT JOIN map_locations ml ON ml.id = COALESCE(li.location_id, lt.location_id, ltm.location_id, le.location_id)
    LEFT JOIN sub_marker_overrides smo ON smo.sub_marker_type = mp.marker_type AND smo.reference_id = mp.reference_id
    WHERE mp.map_key = ?
      AND (mp.game_override IS NULL OR mp.game_override = ?)
      -- Drop rows whose ref-table join didn't match the selected game.
      -- One of li/lt/ltm/le must resolve for the row to be valid.
      AND COALESCE(li.id, lt.id, ltm.id, le.id) IS NOT NULL
    ORDER BY mp.marker_type, mp.id
  `).all(game ?? '', game ?? '', game ?? '', game ?? '', game ?? '', game ?? '', game ?? '', game ?? '', mapKey, game ?? '') as any[];

  const shopRows = db.prepare(`
    SELECT
      ls.id AS id,
      'shop' AS marker_type,
      ls.id AS reference_id,
      ls.x AS x,
      ls.y AS y,
      NULL AS game_override,
      ls.shop_name AS name,
      NULL AS detail,
      NULL AS flag_index,
      NULL AS description,
      ls.location_id AS location_id,
      ml.location_key AS location_key,
      smo.sprite_kind AS sprite_kind,
      smo.sprite_ref AS sprite_ref
    FROM location_shops ls
    JOIN map_locations ml ON ml.id = ls.location_id
    JOIN game_maps gm ON gm.id = ml.map_id
    LEFT JOIN sub_marker_overrides smo ON smo.sub_marker_type = 'shop' AND smo.reference_id = ls.id
    WHERE gm.map_key = ? AND ls.x IS NOT NULL AND ls.y IS NOT NULL
  `).all(mapKey) as any[];

  // Hydrate each shop with its per-game inventory so the map tooltip can
  // preview items/prices without a separate fetch. Join the items catalog to
  // attach the canonical sprite path so the tooltip can render an icon.
  const shopInvStmt = db.prepare(`
    SELECT si.item_name, si.price, si.badge_gate, si.games, si.notes, it.sprite_path
    FROM location_shop_inventory si
    LEFT JOIN items it ON it.display_name = si.item_name
    WHERE si.shop_id = ?
    ORDER BY si.id
  `);
  for (const s of shopRows) {
    const inv = (shopInvStmt.all(s.id) as any[])
      .map(i => ({ ...i, games: i.games ? JSON.parse(i.games) as string[] : null }))
      .filter(i => !game || !i.games || i.games.includes(game));
    s.inventory = inv;
  }

  const markers = [...rows, ...shopRows];
  // Custom markers aren't returned in `markers` (they arrive via /sub-markers),
  // but they need to be in `flat` so clusters whose primary/member is a custom
  // marker can resolve coordinates.
  const customFlat = db.prepare(`
    SELECT cm.id AS reference_id, cm.x, cm.y
    FROM custom_markers cm
    JOIN game_maps gm ON gm.id = cm.map_id
    WHERE gm.map_key = ? AND (cm.game IS NULL OR cm.game = ?)
  `).all(mapKey, game ?? '') as any[];
  const flat = [
    ...markers.map((m: any) => ({
      marker_type: m.marker_type,
      reference_id: m.reference_id,
      x: m.x,
      y: m.y,
      location_id: m.location_id ?? null,
    })),
    ...customFlat.map((c: any) => ({
      marker_type: 'custom',
      reference_id: c.reference_id,
      x: c.x,
      y: c.y,
      location_id: null,
    })),
  ];
  const clusters = resolveClustersForMap(mapKey, flat);
  res.json({ markers, clusters });
});

// POST /api/guide/markers — create or upsert a marker position
router.post('/markers', (req, res) => {
  const { map_key, marker_type, reference_id, x, y, game_override } = req.body;
  if (!map_key || !marker_type || reference_id == null || x == null || y == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Two conflict targets: the composite UNIQUE for non-NULL game_override,
  // and the partial unique index for NULL game_override (SQLite treats NULLs
  // as distinct in the composite UNIQUE, so the partial index handles that case).
  const result = game_override
    ? db.prepare(`
        INSERT INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(map_key, marker_type, reference_id, game_override)
        DO UPDATE SET x = excluded.x, y = excluded.y
      `).run(map_key, marker_type, reference_id, x, y, game_override)
    : db.prepare(`
        INSERT INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
        VALUES (?, ?, ?, ?, ?, NULL)
        ON CONFLICT(map_key, marker_type, reference_id) WHERE game_override IS NULL
        DO UPDATE SET x = excluded.x, y = excluded.y
      `).run(map_key, marker_type, reference_id, x, y);

  res.json({ id: result.lastInsertRowid });
  persistPositionToSeed(marker_type, reference_id, x, y);
});

// PATCH /api/guide/markers/:id — update marker position
router.patch('/markers/:id', (req, res) => {
  const { x, y } = req.body;
  if (x == null || y == null) {
    return res.status(400).json({ error: 'x and y required' });
  }
  db.prepare('UPDATE marker_positions SET x = ?, y = ? WHERE id = ?').run(x, y, Number(req.params.id));
  const row = db.prepare('SELECT marker_type, reference_id, x, y FROM marker_positions WHERE id = ?').get(Number(req.params.id)) as any;
  if (row) persistPositionToSeed(row.marker_type, row.reference_id, row.x, row.y);
  res.json({ ok: true });
});

// Writes description edits back to the region seed JSON so notes survive DB wipes.
// Matches the sub-record inside locations[location_key][arrayKey] using natural
// keys (item_name+method, trainer_class+trainer_name, tm_number, event_name).
// If multiple region files exist for the same map (e.g. gen2 + gen4 HGSS), the
// first file with a match wins. Silently fails if the seed dir is read-only.
function persistDescriptionToSeed(type: string, id: number, description: string): void {
  try {
    const info = fetchSubMarkerLocator(type, id);
    if (!info) return;
    const { mapKey, locationKey, arrayKey, matcher } = info;
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    for (const file of files) {
      const filePath = join(paths.seedDataDir, file);
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const loc = data?.locations?.[locationKey];
      const arr = loc?.[arrayKey];
      if (!Array.isArray(arr)) continue;
      const entry = arr.find(matcher);
      if (!entry) continue;
      if (entry.description === description) return;
      entry.description = description;
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      return;
    }
  } catch (err) {
    console.warn(`[guide] Could not persist ${type}/${id} description to seed JSON: ${(err as Error).message}`);
  }
}

function persistPositionToSeed(type: string, id: number, x: number, y: number): void {
  try {
    const info = fetchSubMarkerLocator(type, id);
    if (!info) return;
    const { mapKey, locationKey, arrayKey, matcher } = info;
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    for (const file of files) {
      const filePath = join(paths.seedDataDir, file);
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const loc = data?.locations?.[locationKey];
      const arr = loc?.[arrayKey];
      if (!Array.isArray(arr)) continue;
      const entry = arr.find(matcher);
      if (!entry) continue;
      if (entry.x === x && entry.y === y) return;
      entry.x = x;
      entry.y = y;
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      return;
    }
  } catch (err) {
    console.warn(`[guide] Could not persist ${type}/${id} position to seed JSON: ${(err as Error).message}`);
  }
}

function persistIconOverrideToSeed(type: string, id: number, spriteKind: string | null, spriteRef: string | null): void {
  try {
    const info = fetchSubMarkerLocator(type, id);
    if (!info) return;
    const { mapKey, locationKey, arrayKey, matcher } = info;
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    for (const file of files) {
      const filePath = join(paths.seedDataDir, file);
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const loc = data?.locations?.[locationKey];
      const arr = loc?.[arrayKey];
      if (!Array.isArray(arr)) continue;
      const entry = arr.find(matcher);
      if (!entry) continue;
      if (spriteKind && spriteRef) {
        entry.sprite_kind = spriteKind;
        entry.sprite_ref = spriteRef;
      } else {
        delete entry.sprite_kind;
        delete entry.sprite_ref;
      }
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      return;
    }
  } catch (err) {
    console.warn(`[guide] Could not persist ${type}/${id} icon override to seed JSON: ${(err as Error).message}`);
  }
}

export interface CustomMarkerSeed {
  natural_id: string;
  label: string;
  marker_type: string;
  description: string | null;
  x: number;
  y: number;
  sprite_kind: string | null;
  sprite_ref: string | null;
  paired_id: string | null;
}

export function persistCustomMarkerToSeed(
  mapKey: string,
  entry: CustomMarkerSeed | { natural_id: string; deleted: true }
): void {
  try {
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    if (files.length === 0) return;
    const filePath = join(paths.seedDataDir, files[0]); // first match wins
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const arr: CustomMarkerSeed[] = Array.isArray(data.custom_markers)
      ? data.custom_markers
      : (data.custom_markers = []);
    const idx = arr.findIndex((m: any) => m.natural_id === entry.natural_id);
    if ('deleted' in entry) {
      if (idx >= 0) arr.splice(idx, 1);
      else return;
    } else if (idx >= 0) {
      arr[idx] = entry;
    } else {
      arr.push(entry);
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`[guide] Could not persist custom marker ${entry.natural_id} to seed JSON: ${(err as Error).message}`);
  }
}

export { persistPositionToSeed, persistIconOverrideToSeed };

/** Mirror a cluster row back into its map's seed JSON (idempotent upsert by primary identity key). */
export function persistClusterToSeed(clusterId: number, opts: { mapKey: string }): void {
  try {
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${opts.mapKey}-gen\\d+\\.json$`).test(f));
    if (files.length === 0) return;
    const filePath = join(paths.seedDataDir, files[0]);
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const arr: any[] = Array.isArray(data.clusters) ? data.clusters : (data.clusters = []);

    const row = db.prepare(`
      SELECT mc.kind, mc.hide_members, mc.x, mc.y,
             mc.primary_marker_type, mc.primary_reference_id,
             ml.location_key AS scope_location_key
      FROM marker_clusters mc
      LEFT JOIN map_locations ml ON ml.id = mc.scope_location_id
      WHERE mc.id = ?
    `).get(clusterId) as any;
    if (!row) return;

    const primaryKey = keyForMarker(row.primary_marker_type, row.primary_reference_id);
    if (!primaryKey) return;

    const entry: any = {
      kind: row.kind,
      primary: primaryKey,
    };
    if (row.kind === 'location_aggregate') {
      entry.location = row.scope_location_key;
      entry.x = row.x; entry.y = row.y;
      entry.hide_members = !!row.hide_members;
    } else {
      const memberRows = db.prepare(`
        SELECT marker_type, reference_id FROM marker_cluster_members WHERE cluster_id = ?
      `).all(clusterId) as Array<{ marker_type: string; reference_id: number }>;
      entry.members = memberRows
        .map(m => keyForMarker(m.marker_type, m.reference_id))
        .filter((k): k is string => !!k);
    }

    const idx = arr.findIndex((e: any) => e.primary === primaryKey);
    if (idx >= 0) arr[idx] = entry; else arr.push(entry);
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`[guide] Could not persist cluster ${clusterId} to seed JSON: ${(err as Error).message}`);
  }
}

/** Remove a cluster entry from seed JSON, keyed by primary identity string. */
export function persistClusterDeletionToSeed(mapKey: string, primaryKey: string): void {
  try {
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    if (files.length === 0) return;
    const filePath = join(paths.seedDataDir, files[0]);
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const arr: any[] = Array.isArray(data.clusters) ? data.clusters : [];
    const idx = arr.findIndex((e: any) => e.primary === primaryKey);
    if (idx < 0) return;
    arr.splice(idx, 1);
    data.clusters = arr;
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`[guide] Could not persist cluster deletion to seed JSON: ${(err as Error).message}`);
  }
}

/** Append/remove a cluster-split entry in seed JSON. */
export function persistClusterSplitToSeed(mapKey: string, markerType: string, referenceId: number, remove: boolean): void {
  try {
    const files = readdirSync(paths.seedDataDir)
      .filter(f => new RegExp(`^${mapKey}-gen\\d+\\.json$`).test(f));
    if (files.length === 0) return;
    const filePath = join(paths.seedDataDir, files[0]);
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const arr: string[] = Array.isArray(data.cluster_splits) ? data.cluster_splits : (data.cluster_splits = []);
    const key = keyForMarker(markerType, referenceId);
    if (!key) return;
    const idx = arr.indexOf(key);
    if (remove) {
      if (idx >= 0) arr.splice(idx, 1); else return;
    } else {
      if (idx < 0) arr.push(key); else return;
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn(`[guide] Could not persist cluster-split to seed JSON: ${(err as Error).message}`);
  }
}

type SubMarkerLocator = {
  mapKey: string;
  locationKey: string;
  arrayKey: 'items' | 'trainers' | 'tms' | 'events';
  matcher: (entry: any) => boolean;
};

function fetchSubMarkerLocator(type: string, id: number): SubMarkerLocator | null {
  if (type === 'item' || type === 'hidden_item') {
    const row = db.prepare(`
      SELECT li.item_name, li.method, ml.location_key, gm.map_key
      FROM location_items li
      JOIN map_locations ml ON ml.id = li.location_id
      JOIN game_maps gm ON gm.id = ml.map_id
      WHERE li.id = ?
    `).get(id) as { item_name: string; method: string; location_key: string; map_key: string } | undefined;
    if (!row) return null;
    return {
      mapKey: row.map_key, locationKey: row.location_key, arrayKey: 'items',
      matcher: (e: any) => e.item_name === row.item_name && e.method === row.method,
    };
  }
  if (type === 'trainer') {
    const row = db.prepare(`
      SELECT lt.trainer_class, lt.trainer_name, ml.location_key, gm.map_key
      FROM location_trainers lt
      JOIN map_locations ml ON ml.id = lt.location_id
      JOIN game_maps gm ON gm.id = ml.map_id
      WHERE lt.id = ?
    `).get(id) as { trainer_class: string; trainer_name: string; location_key: string; map_key: string } | undefined;
    if (!row) return null;
    return {
      mapKey: row.map_key, locationKey: row.location_key, arrayKey: 'trainers',
      matcher: (e: any) => e.trainer_class === row.trainer_class && e.trainer_name === row.trainer_name,
    };
  }
  if (type === 'tm') {
    const row = db.prepare(`
      SELECT ltm.tm_number, ml.location_key, gm.map_key
      FROM location_tms ltm
      JOIN map_locations ml ON ml.id = ltm.location_id
      JOIN game_maps gm ON gm.id = ml.map_id
      WHERE ltm.id = ?
    `).get(id) as { tm_number: number; location_key: string; map_key: string } | undefined;
    if (!row) return null;
    return {
      mapKey: row.map_key, locationKey: row.location_key, arrayKey: 'tms',
      matcher: (e: any) => e.tm_number === row.tm_number,
    };
  }
  if (type === 'event') {
    const row = db.prepare(`
      SELECT le.event_name, ml.location_key, gm.map_key
      FROM location_events le
      JOIN map_locations ml ON ml.id = le.location_id
      JOIN game_maps gm ON gm.id = ml.map_id
      WHERE le.id = ?
    `).get(id) as { event_name: string; location_key: string; map_key: string } | undefined;
    if (!row) return null;
    return {
      mapKey: row.map_key, locationKey: row.location_key, arrayKey: 'events',
      matcher: (e: any) => e.event_name === row.event_name,
    };
  }
  return null;
}

// PATCH /api/guide/sub-marker/:type/:id — update description
router.patch('/sub-marker/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const { description } = req.body;
  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'description string required' });
  }

  const TABLE_MAP: Record<string, string> = {
    item: 'location_items',
    hidden_item: 'location_items',
    trainer: 'location_trainers',
    tm: 'location_tms',
    event: 'location_events',
  };
  const table = TABLE_MAP[type];
  if (!table) return res.status(400).json({ error: 'invalid marker type' });

  const numId = Number(id);
  db.prepare(`UPDATE ${table} SET description = ? WHERE id = ?`).run(description, numId);
  persistDescriptionToSeed(type, numId, description);
  res.json({ ok: true });
});

// DELETE /api/guide/markers/:id — remove a marker position
router.delete('/markers/:id', (req, res) => {
  db.prepare('DELETE FROM marker_positions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// PATCH /api/guide/shops/:id — update a shop's x/y (shop coords live in
// location_shops directly, not marker_positions).
router.patch('/shops/:id', (req, res) => {
  const { x, y } = req.body ?? {};
  if (x == null || y == null) return res.status(400).json({ error: 'x and y required' });
  const result = db.prepare('UPDATE location_shops SET x = ?, y = ? WHERE id = ?')
    .run(x, y, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'shop not found' });
  res.json({ ok: true });
});

// GET /api/guide/markers/:mapKey/export — dump all marker positions as JSON
router.get('/markers/:mapKey/export', (req, res) => {
  const rows = db.prepare('SELECT * FROM marker_positions WHERE map_key = ?').all(req.params.mapKey);
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.mapKey}-markers.json"`);
  res.json(rows);
});

// POST /api/guide/markers/:mapKey/import — bulk import marker positions
router.post('/markers/:mapKey/import', (req, res) => {
  const { markers } = req.body;
  if (!Array.isArray(markers)) return res.status(400).json({ error: 'markers array required' });

  const insert = db.prepare(`
    INSERT OR REPLACE INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const m of markers) {
      insert.run(req.params.mapKey, m.marker_type, m.reference_id, m.x, m.y, m.game_override ?? null);
    }
  });
  transaction();

  res.json({ imported: markers.length });
});

/**
 * Auto-link flag definitions to location items that are missing flag_index.
 * Searches all flag categories for the location since the game's flag categories
 * don't always align with our sidebar categories (e.g. ground items are "event" flags).
 */
function autoLinkFlags(items: any[], locFlags: FlagDefinition[], usedIndices: Set<number>): void {
  for (const item of items) {
    if (item.flag_index != null) continue;

    const name = (item.trainer_name || item.item_name || item.move_name || item.event_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (!name) continue;

    const match = locFlags.find(f => !usedIndices.has(f.index) && f.name.toUpperCase().includes(name));
    if (match) {
      item.flag_index = match.index;
      usedIndices.add(match.index);
    }
  }
}

// GET /api/guide/location-detail/:locationId/:game
router.get('/location-detail/:locationId/:game', (req, res) => {
  const { locationId, game } = req.params;
  const locId = Number(locationId);

  const gameGroup = [game];
  const gamePlaceholders = '?';

  const loc = db.prepare('SELECT location_key FROM map_locations WHERE id = ?').get(locId) as { location_key: string } | undefined;
  const locIds = [locId];
  const locPlaceholders = locIds.map(() => '?').join(',');

  const items = db.prepare(`
    SELECT * FROM location_items WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders}) ORDER BY method, item_name
  `).all(...locIds, ...gameGroup);

  const rawTrainers = db.prepare(`
    SELECT * FROM location_trainers WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders})
    ORDER BY is_boss DESC, trainer_class, trainer_name
  `).all(...locIds, ...gameGroup) as any[];

  // Resolve party_pokemon → species info + sprite URLs
  const speciesByName = db.prepare(`SELECT id, name, sprite_url FROM species WHERE LOWER(name) = LOWER(?)`);
  const speciesById = db.prepare(`SELECT id, name, sprite_url FROM species WHERE id = ?`);
  const trainers = rawTrainers.map(t => {
    let party: any[] = [];
    try {
      party = typeof t.party_pokemon === 'string' ? JSON.parse(t.party_pokemon) : (t.party_pokemon || []);
    } catch { /* empty */ }
    return {
      ...t,
      party_pokemon: party.map((p: any) => {
        // Look up by species_id (number) or species (string name)
        const species = p.species_id
          ? speciesById.get(p.species_id) as any
          : p.species ? speciesByName.get(p.species.toLowerCase()) as any : null;
        return {
          species: species?.name ?? p.species ?? null,
          level: p.level,
          species_id: species?.id ?? p.species_id ?? null,
          sprite_url: species?.sprite_url ?? null,
          moves: p.moves ?? [],
        };
      }),
    };
  });

  // Deduplicate trainers across games: group by name, merge best data from each
  const trainerMap = new Map<string, any>();
  for (const t of trainers) {
    const key = t.trainer_name;
    const existing = trainerMap.get(key);
    if (!existing) {
      trainerMap.set(key, t);
    } else {
      const existingHasMoves = existing.party_pokemon.some((p: any) => p.moves?.length > 0);
      const newHasMoves = t.party_pokemon.some((p: any) => p.moves?.length > 0);
      if ((!existingHasMoves && newHasMoves) || (existingHasMoves === newHasMoves && t.game === game)) {
        // Take the better entry but preserve flag data from whichever has it
        const merged = { ...t };
        if (merged.flag_index == null && existing.flag_index != null) {
          merged.flag_index = existing.flag_index;
          merged.flag_source = existing.flag_source;
        }
        trainerMap.set(key, merged);
      } else if (existing.flag_index == null && t.flag_index != null) {
        // Keep existing but grab flag data from this entry
        existing.flag_index = t.flag_index;
        existing.flag_source = t.flag_source;
      }
    }
  }
  const dedupedTrainers = Array.from(trainerMap.values());

  const tms = db.prepare(`
    SELECT * FROM location_tms WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders}) ORDER BY tm_number
  `).all(...locIds, ...gameGroup);

  const events = db.prepare(`
    SELECT le.*, s.name as species_name, s.sprite_url
    FROM location_events le
    LEFT JOIN species s ON s.id = le.species_id
    WHERE le.location_id IN (${locPlaceholders}) AND le.game IN (${gamePlaceholders})
    ORDER BY le.progression_order, le.event_name
  `).all(...locIds, ...gameGroup);

  const encounters = db.prepare(`
    SELECT me.*, s.name as species_name, s.sprite_url, s.type1, s.type2
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id IN (${locPlaceholders}) AND me.game IN (${gamePlaceholders})
    ORDER BY me.method, me.encounter_rate DESC
  `).all(...locIds, ...gameGroup);

  // Deduplicate items/tms/events across games, merging best data from each
  const dedupByKey = (arr: any[], keyFn: (a: any) => string) => {
    const map = new Map<string, any>();
    for (const item of arr) {
      const key = keyFn(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        // Merge: take the richest version of each field
        const merged = { ...existing };
        // Prefer non-null values from either entry
        for (const field of ['description', 'requirements', 'flag_index', 'flag_source', 'event_type', 'method']) {
          if (!merged[field] && item[field]) merged[field] = item[field];
        }
        map.set(key, merged);
      }
    }
    return Array.from(map.values());
  };
  const dedupedItems = dedupByKey(items, i => `${i.item_name}|${i.method}`);
  const dedupedTms = dedupByKey(tms, t => String(t.tm_number));
  const dedupedEvents = dedupByKey(events, e => e.event_name);

  // Filter out version-exclusive entries from other games
  // For R/B/Y: red and blue share base content, yellow has exclusives
  const isCompatible = (entryGame: string) => {
    if (!entryGame || entryGame === game) return true;
    // red/blue are compatible with each other
    if ((game === 'red' || game === 'blue') && (entryGame === 'red' || entryGame === 'blue')) return true;
    return false;
  };
  const filterExclusives = (arr: any[]) => arr.filter(a => isCompatible(a.game));

  const wikiData = db.prepare(
    'SELECT wiki_prose, wiki_callouts FROM location_wiki WHERE location_id = ? AND game = ?'
  ).get(locId, game) as { wiki_prose: string | null; wiki_callouts: string | null } | undefined;

  // Auto-link flag definitions to items missing flag_index
  const locationKey = loc?.location_key ?? '';
  const flagDefs = loadFlagDefinitions(game);
  const locFlagDefs = flagDefs.filter(f => f.location_key === locationKey);
  const finalItems = filterExclusives(dedupedItems);
  const finalTrainers = filterExclusives(dedupedTrainers);
  const finalTms = filterExclusives(dedupedTms);
  const finalEvents = filterExclusives(dedupedEvents);
  const usedIndices = new Set<number>();
  autoLinkFlags(finalTrainers, locFlagDefs, usedIndices);
  autoLinkFlags(finalItems, locFlagDefs, usedIndices);
  autoLinkFlags(finalTms, locFlagDefs, usedIndices);
  autoLinkFlags(finalEvents, locFlagDefs, usedIndices);

  const posStmt = db.prepare(`
    SELECT x, y FROM marker_positions
    WHERE map_key = (SELECT gm.map_key FROM game_maps gm
                     JOIN map_locations ml ON ml.map_id = gm.id WHERE ml.id = ?)
      AND marker_type = ? AND reference_id = ?
      AND (game_override IS NULL OR game_override = ?)
    LIMIT 1
  `);
  function xyFor(type: string, id: number, row: any): { x: number | null; y: number | null } {
    const override = posStmt.get(locId, type, id, game) as { x: number; y: number } | undefined;
    if (override) return { x: override.x, y: override.y };
    return { x: row.x ?? null, y: row.y ?? null };
  }
  const withXY = (arr: any[], type: string) =>
    arr.map(r => ({ ...r, ...xyFor(type, r.id, r) }));

  const finalItemsXY    = withXY(finalItems,    'item');
  const finalTrainersXY = withXY(finalTrainers, 'trainer');
  const finalTmsXY      = withXY(finalTms,      'tm');
  const finalEventsXY   = withXY(finalEvents,   'event');

  const shops = db.prepare(`
    SELECT ls.id, ls.shop_name, ls.x, ls.y
    FROM location_shops ls
    WHERE ls.location_id IN (${locPlaceholders})
    ORDER BY ls.shop_name
  `).all(...locIds) as Array<{ id: number; shop_name: string; x: number | null; y: number | null }>;
  const invStmt = db.prepare(`
    SELECT si.item_name, si.price, si.badge_gate, si.games, si.notes, it.sprite_path
    FROM location_shop_inventory si
    LEFT JOIN items it ON it.display_name = si.item_name
    WHERE si.shop_id = ?
    ORDER BY si.id
  `);
  const shopsWithInventory = shops
    .map(s => ({
      ...s,
      inventory: (invStmt.all(s.id) as any[])
        .map(i => ({ ...i, games: i.games ? JSON.parse(i.games) as string[] : null }))
        .filter(i => !i.games || i.games.includes(game)),
    }))
    .filter(s => s.inventory.length > 0);

  res.json({
    items: finalItemsXY,
    trainers: finalTrainersXY,
    tms: finalTmsXY,
    events: finalEventsXY,
    encounters,
    shops: shopsWithInventory,
    wiki_prose: wikiData?.wiki_prose ?? null,
    wiki_callouts: wikiData?.wiki_callouts ? JSON.parse(wikiData.wiki_callouts) : [],
  });
});

// GET /api/guide/species-locations/:speciesId/:game — find all locations where a species appears
router.get('/species-locations/:speciesId/:game', (req, res) => {
  const speciesId = Number(req.params.speciesId);
  const { game } = req.params;

  const encounters = db.prepare(`
    SELECT me.location_id, ml.location_key, ml.display_name,
           me.method, me.level_min, me.level_max, me.encounter_rate, me.time_of_day
    FROM map_encounters me
    JOIN map_locations ml ON ml.id = me.location_id
    WHERE me.species_id = ? AND me.game = ?
    ORDER BY ml.progression_order, me.method
  `).all(speciesId, game);

  res.json(encounters);
});

// GET /api/guide/species-search?q=...&game=... — autocomplete species that appear in encounters for a game
router.get('/species-search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const game = String(req.query.game || '');
  if (q.length < 2) return res.json([]);

  const species = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.sprite_url, s.type1, s.type2
    FROM species s
    JOIN map_encounters me ON me.species_id = s.id AND me.game = ?
    WHERE s.name LIKE ?
    ORDER BY s.id
    LIMIT 10
  `).all(game, `%${q}%`);

  res.json(species);
});

// POST /api/guide/clusters — create persisted cluster (proximity or location_aggregate)
router.post('/clusters', (req, res) => {
  const {
    map_key, kind, scope_location_id,
    x, y,
    primary_marker_type, primary_reference_id,
    hide_members,
    members,
  } = req.body ?? {};
  if (!map_key || (kind !== 'proximity' && kind !== 'location_aggregate')) {
    return res.status(400).json({ error: 'map_key + kind required' });
  }
  if (!primary_marker_type || primary_reference_id == null) {
    return res.status(400).json({ error: 'primary required' });
  }

  const result = db.prepare(`
    INSERT INTO marker_clusters
      (map_key, kind, scope_location_id, x, y,
       primary_marker_type, primary_reference_id, hide_members)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    map_key, kind,
    kind === 'location_aggregate' ? (scope_location_id ?? null) : null,
    kind === 'location_aggregate' ? (x ?? null) : null,
    kind === 'location_aggregate' ? (y ?? null) : null,
    primary_marker_type, primary_reference_id,
    hide_members ? 1 : 0,
  );
  const clusterId = Number(result.lastInsertRowid);

  if (kind === 'proximity' && Array.isArray(members)) {
    const ins = db.prepare(`
      INSERT OR IGNORE INTO marker_cluster_members (cluster_id, marker_type, reference_id)
      VALUES (?, ?, ?)
    `);
    db.transaction(() => {
      ins.run(clusterId, primary_marker_type, primary_reference_id);
      for (const m of members) ins.run(clusterId, m.marker_type, m.reference_id);
    })();
  }

  persistClusterToSeed(clusterId, { mapKey: map_key });
  res.status(201).json({ id: clusterId });
});

// PATCH /api/guide/clusters/:id
router.patch('/clusters/:id', (req, res) => {
  const id = Number(req.params.id);
  const sets: string[] = []; const values: any[] = [];
  for (const col of ['x', 'y', 'primary_marker_type', 'primary_reference_id'] as const) {
    if (col in req.body) { sets.push(`${col} = ?`); values.push(req.body[col]); }
  }
  if ('hide_members' in req.body) {
    sets.push('hide_members = ?'); values.push(req.body.hide_members ? 1 : 0);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'no editable fields' });
  values.push(id);
  const result = db.prepare(`UPDATE marker_clusters SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) return res.status(404).json({ error: 'cluster not found' });
  const row = db.prepare('SELECT map_key FROM marker_clusters WHERE id = ?').get(id) as any;
  if (row) persistClusterToSeed(id, { mapKey: row.map_key });
  res.json({ ok: true });
});

// DELETE /api/guide/clusters/:id
router.delete('/clusters/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT mc.map_key, mc.primary_marker_type, mc.primary_reference_id
    FROM marker_clusters mc WHERE mc.id = ?`).get(id) as any;
  if (!row) return res.status(404).json({ error: 'cluster not found' });
  const primaryKey = keyForMarker(row.primary_marker_type, row.primary_reference_id);
  db.prepare('DELETE FROM marker_clusters WHERE id = ?').run(id);
  if (primaryKey) persistClusterDeletionToSeed(row.map_key, primaryKey);
  res.json({ ok: true });
});

// POST /api/guide/clusters/:id/members
router.post('/clusters/:id/members', (req, res) => {
  const id = Number(req.params.id);
  const { marker_type, reference_id } = req.body ?? {};
  if (!marker_type || reference_id == null) return res.status(400).json({ error: 'marker_type+reference_id' });
  db.prepare(`
    INSERT OR IGNORE INTO marker_cluster_members (cluster_id, marker_type, reference_id)
    VALUES (?, ?, ?)`).run(id, marker_type, reference_id);
  const row = db.prepare('SELECT map_key FROM marker_clusters WHERE id = ?').get(id) as any;
  if (row) persistClusterToSeed(id, { mapKey: row.map_key });
  res.json({ ok: true });
});

// DELETE /api/guide/clusters/:id/members
router.delete('/clusters/:id/members', (req, res) => {
  const id = Number(req.params.id);
  const { marker_type, reference_id } = req.body ?? {};
  db.prepare(`
    DELETE FROM marker_cluster_members
    WHERE cluster_id = ? AND marker_type = ? AND reference_id = ?`).run(id, marker_type, reference_id);
  const row = db.prepare('SELECT map_key FROM marker_clusters WHERE id = ?').get(id) as any;
  if (row) persistClusterToSeed(id, { mapKey: row.map_key });
  res.json({ ok: true });
});

// POST /api/guide/cluster-splits
router.post('/cluster-splits', (req, res) => {
  const { map_key, marker_type, reference_id } = req.body ?? {};
  if (!map_key || !marker_type || reference_id == null) return res.status(400).json({ error: 'fields' });
  db.prepare(`
    INSERT OR IGNORE INTO marker_cluster_splits (marker_type, reference_id)
    VALUES (?, ?)`).run(marker_type, reference_id);
  persistClusterSplitToSeed(map_key, marker_type, reference_id, false);
  res.json({ ok: true });
});

// DELETE /api/guide/cluster-splits
router.delete('/cluster-splits', (req, res) => {
  const { map_key, marker_type, reference_id } = req.body ?? {};
  if (!map_key || !marker_type || reference_id == null) return res.status(400).json({ error: 'fields' });
  db.prepare(`
    DELETE FROM marker_cluster_splits WHERE marker_type = ? AND reference_id = ?`).run(marker_type, reference_id);
  persistClusterSplitToSeed(map_key, marker_type, reference_id, true);
  res.json({ ok: true });
});

export default router;

