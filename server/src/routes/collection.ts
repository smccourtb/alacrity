import { Router } from 'express';
import db from '../db.js';
import { scanCheckpoint, resolveCollection } from '../services/identityService.js';
import { buildSnapshot } from '../services/saveSnapshot.js';

const router = Router();

// POST /api/collection/scan/checkpoint/:id — scan a single checkpoint
router.post('/scan/checkpoint/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid checkpoint id' });

  try {
    const result = scanCheckpoint(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collection/rebuild-snapshots — re-parse save files and rebuild checkpoint snapshots
router.post('/rebuild-snapshots', (_req, res) => {
  try {
    const checkpoints = db.prepare(`
      SELECT c.id, sf.file_path, pt.game
      FROM checkpoints c
      JOIN playthroughs pt ON pt.id = c.playthrough_id
      JOIN save_files sf ON sf.id = c.save_file_id
      WHERE c.archived = 0
    `).all() as { id: number; file_path: string; game: string }[];

    let rebuilt = 0;
    let scanned = 0;
    let totalIdentities = 0;
    let totalSightings = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const cp of checkpoints) {
      try {
        // Re-parse save file with enriched snapshot builder
        const snapshot = buildSnapshot(cp.file_path, cp.game);
        db.prepare('UPDATE checkpoints SET snapshot = ? WHERE id = ?')
          .run(JSON.stringify(snapshot), cp.id);
        rebuilt++;

        // Re-scan identity sightings from the updated snapshot
        const result = scanCheckpoint(cp.id);
        totalIdentities += result.identities;
        totalSightings += result.sightings;
        scanned++;
      } catch (err: any) {
        errors.push({ id: cp.id, error: err.message });
      }
    }

    res.json({ rebuilt, scanned, totalIdentities, totalSightings, errors, total: checkpoints.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collection/scan/all — scan all opted-in checkpoints
router.post('/scan/all', (_req, res) => {
  try {
    const checkpoints = db.prepare<{ id: number }, []>(`
      SELECT c.id
      FROM checkpoints c
      JOIN playthroughs pt ON pt.id = c.playthrough_id
      WHERE c.archived = 0
        AND pt.include_in_collection = 1
        AND (c.include_in_collection = 1 OR c.id = pt.active_checkpoint_id)
    `).all();

    let totalIdentities = 0;
    let totalSightings = 0;
    let scanned = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const { id } of checkpoints) {
      try {
        const result = scanCheckpoint(id);
        totalIdentities += result.identities;
        totalSightings += result.sightings;
        scanned++;
      } catch (err: any) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({ scanned, totalIdentities, totalSightings, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collection/sources — count entries per source
router.get('/sources', (_req, res) => {
  try {
    const save = (db.prepare('SELECT COUNT(*) as count FROM collection_saves').get() as any).count;
    const bank = (db.prepare('SELECT COUNT(*) as count FROM collection_bank').get() as any).count;
    const manual = (db.prepare('SELECT COUNT(*) as count FROM collection_manual').get() as any).count;
    res.json({ save, bank, manual });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collection — resolve collection with optional filters
router.get('/', (req, res) => {
  try {
    const playthroughId = req.query.playthrough_id != null
      ? Number(req.query.playthrough_id)
      : undefined;
    const game = typeof req.query.game === 'string' ? req.query.game : undefined;

    const entries = resolveCollection({
      playthroughId: playthroughId != null && !isNaN(playthroughId) ? playthroughId : undefined,
      game,
    });
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collection/:id/sightings — list sightings for an identity
router.get('/:id/sightings', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid identity id' });

  try {
    const sightings = db.prepare(`
      SELECT
        s.id,
        s.identity_id,
        s.checkpoint_id,
        s.bank_file_id,
        s.species_id,
        s.box_slot,
        s.level,
        s.snapshot_data,
        s.created_at,
        c.label AS checkpoint_label,
        pt.game,
        sf.file_path,
        sf.save_timestamp
      FROM collection s
      LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
      LEFT JOIN playthroughs pt ON pt.id = c.playthrough_id
      LEFT JOIN save_files sf ON sf.id = c.save_file_id
      WHERE s.identity_id = ?
      ORDER BY sf.save_timestamp DESC
    `).all(id);

    res.json(sightings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/collection/:id/confirm — update confirmed flag
router.patch('/:id/confirm', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid identity id' });

  const { confirmed } = req.body;
  if (typeof confirmed !== 'boolean') {
    return res.status(400).json({ error: 'confirmed must be a boolean' });
  }

  try {
    const result = db.prepare(
      'UPDATE pokemon_identity SET confirmed = ? WHERE id = ?'
    ).run(confirmed ? 1 : 0, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collection/goals — list all collection goals
router.get('/goals', (_req, res) => {
  try {
    const goals = db.prepare(
      'SELECT * FROM collection_goals ORDER BY is_default DESC, name ASC'
    ).all();
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collection/goals — create a goal
router.post('/goals', (req, res) => {
  const { name, filters, scope, target_count, is_default } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const insert = db.transaction(() => {
      if (is_default) {
        db.prepare('UPDATE collection_goals SET is_default = 0').run();
      }

      return db.prepare(`
        INSERT INTO collection_goals (name, filters, scope, target_count, is_default)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        name,
        JSON.stringify(filters ?? {}),
        scope ?? null,
        target_count ?? null,
        is_default ? 1 : 0,
      );
    });

    const result = insert();
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/collection/goals/:id — update a goal
router.put('/goals/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid goal id' });

  const { name, filters, scope, target_count, is_default } = req.body;

  try {
    if (is_default) {
      db.prepare('UPDATE collection_goals SET is_default = 0 WHERE id != ?').run(id);
    }

    const result = db.prepare(`
      UPDATE collection_goals
      SET
        name = COALESCE(?, name),
        filters = COALESCE(?, filters),
        scope = COALESCE(?, scope),
        target_count = COALESCE(?, target_count),
        is_default = COALESCE(?, is_default)
      WHERE id = ?
    `).run(
      name ?? null,
      filters != null ? JSON.stringify(filters) : null,
      scope ?? null,
      target_count ?? null,
      is_default != null ? (is_default ? 1 : 0) : null,
      id,
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/collection/goals/:id — delete a goal
router.delete('/goals/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid goal id' });

  try {
    const result = db.prepare('DELETE FROM collection_goals WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collection/dashboard?leg=gameboy
router.get('/dashboard', (req, res) => {
  const leg = (req.query.leg as string) || '';

  // 1. Overall progress
  const overallRow = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN sp.status IN ('completed','obtained','journey_complete') THEN 1 ELSE 0 END) AS obtained,
      SUM(CASE WHEN sp.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
    FROM specimen_targets t
    LEFT JOIN specimen_progress sp ON sp.target_id = t.id
    ${leg ? 'WHERE t.leg_key = ?' : ''}
  `).get(...(leg ? [leg] : [])) as any;

  const overall = {
    total: overallRow.total,
    obtained: overallRow.obtained,
    in_progress: overallRow.in_progress,
    remaining: overallRow.total - overallRow.obtained - overallRow.in_progress,
  };

  // 2. Per-game stats
  const gameRows = db.prepare(`
    SELECT
      t.source_game AS game,
      COUNT(*) AS total,
      SUM(CASE WHEN sp.status IN ('completed','obtained','journey_complete') THEN 1 ELSE 0 END) AS obtained,
      SUM(CASE WHEN sp.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
    FROM specimen_targets t
    LEFT JOIN specimen_progress sp ON sp.target_id = t.id
    ${leg ? 'WHERE t.leg_key = ?' : ''}
    GROUP BY t.source_game
    ORDER BY obtained * 1.0 / COUNT(*) DESC
  `).all(...(leg ? [leg] : [])) as any[];

  // 3. Pinned saves per game
  const pinnedSaves = db.prepare(`
    SELECT DISTINCT st.game, sf.id AS save_file_id, sf.filename, sf.notes AS save_notes
    FROM specimen_tasks st
    JOIN save_files sf ON sf.id = st.save_file_id
    ${leg ? 'JOIN specimen_targets t ON t.id = st.target_id AND t.leg_key = ?' : ''}
  `).all(...(leg ? [leg] : [])) as any[];

  const savesByGame = new Map<string, any[]>();
  for (const row of pinnedSaves) {
    if (!savesByGame.has(row.game)) savesByGame.set(row.game, []);
    savesByGame.get(row.game)!.push({
      save_file_id: row.save_file_id,
      filename: row.filename,
      notes: row.save_notes,
    });
  }

  // 4. Next-up target per game
  const nextUpRows = db.prepare(`
    SELECT
      t.source_game AS game,
      t.id AS target_id,
      t.description,
      s.name AS species_name,
      s.sprite_url,
      st_task.location_key,
      st_task.task_type
    FROM specimen_targets t
    LEFT JOIN specimen_progress sp ON sp.target_id = t.id
    LEFT JOIN species s ON s.id = t.species_id
    LEFT JOIN specimen_tasks st_task ON st_task.target_id = t.id AND st_task.location_key IS NOT NULL
    WHERE (sp.status IS NULL OR sp.status = 'pending')
    ${leg ? 'AND t.leg_key = ?' : ''}
    GROUP BY t.source_game
    ORDER BY t.priority, t.id
  `).all(...(leg ? [leg] : [])) as any[];

  const nextUpByGame = new Map<string, any>();
  for (const row of nextUpRows) {
    if (!nextUpByGame.has(row.game)) {
      nextUpByGame.set(row.game, {
        target_id: row.target_id,
        description: row.description,
        species_name: row.species_name,
        sprite_url: row.sprite_url,
        location_key: row.location_key,
        task_type: row.task_type,
      });
    }
  }

  const games = gameRows.map(g => ({
    game: g.game,
    total: g.total,
    obtained: g.obtained,
    in_progress: g.in_progress,
    remaining: g.total - g.obtained - g.in_progress,
    pinned_saves: savesByGame.get(g.game) ?? [],
    next_up: nextUpByGame.get(g.game) ?? null,
  }));

  // 5. Species gaps
  const gaps = db.prepare(`
    SELECT
      t.id AS target_id,
      t.species_id,
      t.source_game,
      t.description,
      t.priority,
      t.category,
      s.name AS species_name,
      s.id AS dex_number,
      s.sprite_url,
      st_task.location_key,
      st_task.task_type,
      sf.id AS save_file_id,
      sf.filename AS save_filename
    FROM specimen_targets t
    LEFT JOIN specimen_progress sp ON sp.target_id = t.id
    LEFT JOIN species s ON s.id = t.species_id
    LEFT JOIN specimen_tasks st_task ON st_task.target_id = t.id AND st_task.location_key IS NOT NULL
    LEFT JOIN save_files sf ON sf.id = st_task.save_file_id
    WHERE (sp.status IS NULL OR sp.status IN ('pending', 'in_progress'))
    ${leg ? 'AND t.leg_key = ?' : ''}
    GROUP BY t.id
    ORDER BY t.priority, s.id
    LIMIT 50
  `).all(...(leg ? [leg] : [])) as any[];

  res.json({ overall, games, gaps });
});

export default router;
