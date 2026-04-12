import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ---------- Collection Legs ----------

// GET /specimens/legs — all legs ordered by leg_order
router.get('/legs', (_req, res) => {
  const rows = db.prepare('SELECT * FROM collection_legs ORDER BY leg_order').all();
  const legs = (rows as any[]).map(row => ({
    ...row,
    games: JSON.parse(row.games),
  }));
  res.json(legs);
});

// PATCH /specimens/legs/:key — update leg status
router.patch('/legs/:key', (req, res) => {
  const { key } = req.params;
  const { status } = req.body;

  const existing = db.prepare('SELECT * FROM collection_legs WHERE key = ?').get(key);
  if (!existing) return res.status(404).json({ error: 'Leg not found' });

  db.prepare('UPDATE collection_legs SET status = COALESCE(?, status) WHERE key = ?').run(status ?? null, key);

  const updated = db.prepare('SELECT * FROM collection_legs WHERE key = ?').get(key) as any;
  res.json({ ...updated, games: JSON.parse(updated.games) });
});

// ---------- Specimen Targets ----------

// GET /specimens/targets — all targets with optional filters
router.get('/targets', (req, res) => {
  const { leg, game, species_id, category, status } = req.query;
  const includeDismissed = req.query.include_dismissed === 'true';

  const conditions: string[] = [];
  const params: any[] = [];

  if (!includeDismissed) {
    conditions.push('st.dismissed = 0');
  }
  if (leg) {
    conditions.push('st.leg_key = ?');
    params.push(leg);
  }
  if (game) {
    conditions.push('st.source_game = ?');
    params.push(game);
  }
  if (species_id) {
    conditions.push('st.species_id = ?');
    params.push(Number(species_id));
  }
  if (category) {
    conditions.push('st.category = ?');
    params.push(category);
  }
  if (status) {
    conditions.push('sp.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT
       st.id, st.species_id, st.leg_key, st.source_game, st.category,
       st.target_type, st.constraints, st.description, st.priority, st.notes,
       s.name AS species_name, s.sprite_url, s.shiny_sprite_url,
       cl.label AS leg_label, cl.origin_mark,
       sp.status, sp.current_location
     FROM specimen_targets st
     JOIN species s ON s.id = st.species_id
     JOIN collection_legs cl ON cl.key = st.leg_key
     LEFT JOIN specimen_progress sp ON sp.target_id = st.id
     ${where}
     ORDER BY cl.leg_order, st.priority DESC, st.id`
  ).all(...params);

  const targets = (rows as any[]).map(row => ({
    ...row,
    constraints: JSON.parse(row.constraints || '{}'),
  }));

  res.json(targets);
});

// GET /specimens/targets/:id — single target with tasks
router.get('/targets/:id', (req, res) => {
  const id = Number(req.params.id);

  const target = db.prepare(
    `SELECT
       st.id, st.species_id, st.leg_key, st.source_game, st.category,
       st.target_type, st.constraints, st.description, st.priority, st.notes,
       s.name AS species_name, s.sprite_url, s.shiny_sprite_url,
       cl.label AS leg_label, cl.origin_mark,
       sp.status, sp.current_location,
       sp.save_file_id, sp.checkpoint_id, sp.pokemon_id, sp.notes AS progress_notes
     FROM specimen_targets st
     JOIN species s ON s.id = st.species_id
     JOIN collection_legs cl ON cl.key = st.leg_key
     LEFT JOIN specimen_progress sp ON sp.target_id = st.id
     WHERE st.id = ?`
  ).get(id) as any;

  if (!target) return res.status(404).json({ error: 'Target not found' });

  const tasks = db.prepare(
    'SELECT * FROM specimen_tasks WHERE target_id = ? ORDER BY task_order'
  ).all(id);

  res.json({
    ...target,
    constraints: JSON.parse(target.constraints || '{}'),
    tasks,
  });
});

// POST /targets — create a manual target
router.post('/targets', (req, res) => {
  const { species_id, description, source_game, notes, leg_key } = req.body;

  if (!species_id || !description) {
    return res.status(400).json({ error: 'species_id and description are required' });
  }

  const result = db.prepare(`
    INSERT INTO specimen_targets (species_id, leg_key, source_game, category, target_type, constraints, description, priority, notes, is_manual)
    VALUES (?, ?, ?, 'optional', 'custom', '{}', ?, 0, ?, 1)
  `).run(species_id, leg_key || 'gameboy', source_game || null, description, notes || null);

  // Initialize specimen_progress for the new target
  db.prepare(`
    INSERT OR IGNORE INTO specimen_progress (target_id, status)
    VALUES (?, 'pending')
  `).run(result.lastInsertRowid);

  const created = db.prepare('SELECT * FROM specimen_targets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PATCH /specimens/targets/:id — update source_game, notes, dismissed, manual_override, description
router.patch('/targets/:id', (req, res) => {
  const { id } = req.params;
  const { source_game, notes, dismissed, manual_override, description } = req.body;

  const target = db.prepare('SELECT * FROM specimen_targets WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Target not found' });

  db.prepare(`
    UPDATE specimen_targets
    SET source_game = COALESCE(?, source_game),
        notes = COALESCE(?, notes),
        description = COALESCE(?, description),
        dismissed = COALESCE(?, dismissed),
        manual_override = COALESCE(?, manual_override)
    WHERE id = ?
  `).run(
    source_game ?? null,
    notes ?? null,
    description ?? null,
    dismissed !== undefined ? (dismissed ? 1 : 0) : null,
    manual_override !== undefined ? (manual_override ? 1 : 0) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM specimen_targets WHERE id = ?').get(id) as any;
  res.json({ ...updated, constraints: JSON.parse((updated as any).constraints || '{}') });
});

// ---------- Specimen Progress ----------

// PATCH /specimens/progress/:targetId — update progress for a target
router.patch('/progress/:targetId', (req, res) => {
  const targetId = Number(req.params.targetId);
  const { status, current_location, save_file_id, checkpoint_id, pokemon_id, notes } = req.body;

  const existing = db.prepare('SELECT * FROM specimen_progress WHERE target_id = ?').get(targetId);

  if (existing) {
    db.prepare(
      `UPDATE specimen_progress SET
         status = COALESCE(?, status),
         current_location = COALESCE(?, current_location),
         save_file_id = COALESCE(?, save_file_id),
         checkpoint_id = COALESCE(?, checkpoint_id),
         pokemon_id = COALESCE(?, pokemon_id),
         notes = COALESCE(?, notes)
       WHERE target_id = ?`
    ).run(
      status ?? null,
      current_location ?? null,
      save_file_id ?? null,
      checkpoint_id ?? null,
      pokemon_id ?? null,
      notes ?? null,
      targetId
    );
  } else {
    db.prepare(
      `INSERT INTO specimen_progress (target_id, status, current_location, save_file_id, checkpoint_id, pokemon_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      targetId,
      status ?? 'pending',
      current_location ?? null,
      save_file_id ?? null,
      checkpoint_id ?? null,
      pokemon_id ?? null,
      notes ?? null
    );
  }

  const updated = db.prepare('SELECT * FROM specimen_progress WHERE target_id = ?').get(targetId);
  res.json(updated);
});

// ---------- Specimen Tasks ----------

// PATCH /specimens/tasks/:taskId — update task status, notes, and save_file_id
router.patch('/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const { status, notes, save_file_id } = req.body;

  const task = db.prepare('SELECT * FROM specimen_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare(`
    UPDATE specimen_tasks
    SET status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        save_file_id = COALESCE(?, save_file_id)
    WHERE id = ?
  `).run(status ?? null, notes ?? null, save_file_id ?? null, taskId);

  const updated = db.prepare('SELECT * FROM specimen_tasks WHERE id = ?').get(taskId);
  res.json(updated);
});

// ---------- Summary ----------

// GET /specimens/summary — per-species aggregated stats with optional leg filter
router.get('/summary', (req, res) => {
  const { leg } = req.query;

  const params: any[] = [];
  let legFilter = '';
  if (leg) {
    legFilter = 'WHERE st.leg_key = ?';
    params.push(leg);
  }

  const rows = db.prepare(
    `SELECT
       st.species_id,
       s.name,
       s.id AS dex_number,
       s.sprite_url,
       COUNT(st.id) AS total,
       SUM(CASE WHEN sp.status IN ('completed', 'obtained', 'journey_complete') THEN 1 ELSE 0 END) AS obtained,
       SUM(CASE WHEN sp.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN sp.status IS NULL OR sp.status NOT IN ('completed', 'obtained', 'journey_complete', 'in_progress') THEN 1 ELSE 0 END) AS pending
     FROM specimen_targets st
     JOIN species s ON s.id = st.species_id
     LEFT JOIN specimen_progress sp ON sp.target_id = st.id
     ${legFilter}
     GROUP BY st.species_id, s.name, s.id, s.sprite_url
     ORDER BY s.id`
  ).all(...params);

  res.json(rows);
});

export default router;
