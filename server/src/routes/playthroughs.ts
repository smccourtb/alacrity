import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ---------- Playthroughs ----------

// List all playthroughs
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM playthroughs ORDER BY updated_at DESC').all();
  res.json(rows);
});

// Get single playthrough with its checkpoint tree
router.get('/:id', (req, res) => {
  const playthrough = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(Number(req.params.id));
  if (!playthrough) return res.status(404).json({ error: 'Playthrough not found' });

  const checkpoints = db.prepare(
    'SELECT c.*, sf.label as save_name, sf.file_path FROM checkpoints c JOIN save_files sf ON sf.id = c.save_file_id WHERE c.playthrough_id = ? ORDER BY c.created_at DESC'
  ).all(Number(req.params.id));

  res.json({ ...playthrough as any, checkpoints });
});

// Create playthrough
router.post('/', (req, res) => {
  const { game, ot_name, ot_tid, goal, label } = req.body;
  if (!game || !ot_name || ot_tid === undefined) {
    return res.status(400).json({ error: 'game, ot_name, and ot_tid are required' });
  }

  const result = db.prepare(
    'INSERT INTO playthroughs (game, ot_name, ot_tid, goal, label) VALUES (?, ?, ?, ?, ?)'
  ).run(game, ot_name, ot_tid, goal ?? 'origin_collection', label ?? null);

  const playthrough = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(playthrough);
});

// Update playthrough
router.patch('/:id', (req, res) => {
  const { label, goal, active_checkpoint_id } = req.body;
  const id = Number(req.params.id);

  const existing = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Playthrough not found' });

  db.prepare(
    `UPDATE playthroughs SET
      label = COALESCE(?, label),
      goal = COALESCE(?, goal),
      active_checkpoint_id = COALESCE(?, active_checkpoint_id),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(label ?? null, goal ?? null, active_checkpoint_id ?? null, id);

  const updated = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(id);
  res.json(updated);
});

// Delete playthrough
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  // Delete guide_progress for this playthrough
  db.prepare('DELETE FROM guide_progress WHERE playthrough_id = ?').run(id);

  // Cascade deletes checkpoints and playthrough_goals via ON DELETE CASCADE
  db.prepare('DELETE FROM playthroughs WHERE id = ?').run(id);

  res.json({ ok: true });
});

// Reset progress only
router.post('/:id/reset', (req, res) => {
  const id = Number(req.params.id);

  const existing = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Playthrough not found' });

  db.prepare("UPDATE playthrough_goals SET status = 'pending', completed_from_save = 0 WHERE playthrough_id = ?").run(id);
  db.prepare('DELETE FROM guide_progress WHERE playthrough_id = ?').run(id);
  db.prepare("UPDATE playthroughs SET updated_at = datetime('now') WHERE id = ?").run(id);

  res.json({ ok: true });
});

// ---------- Checkpoints ----------

// List checkpoints for a playthrough
router.get('/:id/checkpoints', (req, res) => {
  const checkpoints = db.prepare(
    `SELECT c.*, sf.label as save_name, sf.file_path
     FROM checkpoints c
     JOIN save_files sf ON sf.id = c.save_file_id
     WHERE c.playthrough_id = ?
     ORDER BY c.created_at DESC`
  ).all(Number(req.params.id));
  res.json(checkpoints);
});

// Create checkpoint manually
router.post('/:id/checkpoints', (req, res) => {
  const playthroughId = Number(req.params.id);
  const { save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch } = req.body;

  if (!save_file_id) return res.status(400).json({ error: 'save_file_id is required' });

  const result = db.prepare(
    `INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch, needs_confirmation)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(playthroughId, save_file_id, parent_checkpoint_id ?? null, label ?? null, location_key ?? null, badge_count ?? null, is_branch ? 1 : 0);

  // Set as active checkpoint
  db.prepare("UPDATE playthroughs SET active_checkpoint_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(result.lastInsertRowid, playthroughId);

  const checkpoint = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(checkpoint);
});

// ---------- Goals ----------

// List goals for a playthrough (with requirement details)
router.get('/:id/goals', (req, res) => {
  const goals = db.prepare(
    `SELECT pg.*, s.name as species_name, s.sprite_url,
            orq.description as requirement_description, orq.requirement_type, orq.move_name, orq.item_name, orq.priority
     FROM playthrough_goals pg
     LEFT JOIN species s ON s.id = pg.species_id
     LEFT JOIN origin_requirements orq ON orq.id = pg.requirement_id
     WHERE pg.playthrough_id = ?
     ORDER BY pg.id`
  ).all(Number(req.params.id));
  res.json(goals);
});

// Add custom goal
router.post('/:id/goals', (req, res) => {
  const playthroughId = Number(req.params.id);
  const { species_id, requirement_id, notes } = req.body;

  const result = db.prepare(
    'INSERT INTO playthrough_goals (playthrough_id, requirement_id, species_id, notes) VALUES (?, ?, ?, ?)'
  ).run(playthroughId, requirement_id ?? null, species_id ?? null, notes ?? null);

  const goal = db.prepare('SELECT * FROM playthrough_goals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(goal);
});

// Update goal status
router.patch('/goals/:goalId', (req, res) => {
  const goalId = Number(req.params.goalId);
  const { status, notes, assigned_checkpoint_id } = req.body;

  db.prepare(
    `UPDATE playthrough_goals SET
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      assigned_checkpoint_id = COALESCE(?, assigned_checkpoint_id)
    WHERE id = ?`
  ).run(status ?? null, notes ?? null, assigned_checkpoint_id ?? null, goalId);

  const updated = db.prepare('SELECT * FROM playthrough_goals WHERE id = ?').get(goalId);
  if (!updated) return res.status(404).json({ error: 'Goal not found' });
  res.json(updated);
});

// Delete goal
router.delete('/goals/:goalId', (req, res) => {
  db.prepare('DELETE FROM playthrough_goals WHERE id = ?').run(Number(req.params.goalId));
  res.json({ ok: true });
});

// ---------- Checkpoint mutations (non-nested) ----------
// These are mounted at /api/playthroughs but use /checkpoints/:checkpointId path

router.patch('/checkpoints/:checkpointId', (req, res) => {
  const checkpointId = Number(req.params.checkpointId);
  const { label, is_branch, needs_confirmation, parent_checkpoint_id, notes } = req.body;

  // Handle reparenting separately to allow setting parent to null (root)
  if (parent_checkpoint_id !== undefined) {
    // Prevent circular references: ensure new parent isn't a descendant of this node
    if (parent_checkpoint_id !== null) {
      let cursor = parent_checkpoint_id;
      while (cursor != null) {
        if (cursor === checkpointId) {
          res.status(400).json({ error: 'Cannot reparent: would create a cycle' });
          return;
        }
        const row = db.prepare('SELECT parent_checkpoint_id FROM checkpoints WHERE id = ?').get(cursor) as any;
        cursor = row?.parent_checkpoint_id ?? null;
      }
    }
    db.prepare('UPDATE checkpoints SET parent_checkpoint_id = ? WHERE id = ?')
      .run(parent_checkpoint_id, checkpointId);
  }

  db.prepare(
    `UPDATE checkpoints SET
      label = COALESCE(?, label),
      is_branch = COALESCE(?, is_branch),
      needs_confirmation = COALESCE(?, needs_confirmation),
      notes = COALESCE(?, notes)
    WHERE id = ?`
  ).run(label ?? null, is_branch ?? null, needs_confirmation ?? null, notes ?? null, checkpointId);

  const updated = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(checkpointId);
  if (!updated) return res.status(404).json({ error: 'Checkpoint not found' });
  res.json(updated);
});

router.delete('/checkpoints/:checkpointId', (req, res) => {
  const checkpointId = Number(req.params.checkpointId);

  // Re-link children to this checkpoint's parent
  const checkpoint = db.prepare('SELECT parent_checkpoint_id FROM checkpoints WHERE id = ?').get(checkpointId) as any;
  if (checkpoint) {
    db.prepare('UPDATE checkpoints SET parent_checkpoint_id = ? WHERE parent_checkpoint_id = ?')
      .run(checkpoint.parent_checkpoint_id, checkpointId);
  }

  db.prepare('DELETE FROM checkpoints WHERE id = ?').run(checkpointId);
  res.json({ ok: true });
});

// Get checkpoint world state (parse save on demand)
router.get('/checkpoints/:checkpointId/state', async (req, res) => {
  const checkpointId = Number(req.params.checkpointId);

  const checkpoint = db.prepare(
    `SELECT c.*, sf.file_path, sf.game
     FROM checkpoints c
     JOIN save_files sf ON sf.id = c.save_file_id
     WHERE c.id = ?`
  ).get(checkpointId) as any;

  if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });

  try {
    const { parseGen1Save } = await import('../services/gen1Parser.js');
    const { parseGen2Save } = await import('../services/gen2Parser.js');

    const game = checkpoint.game ?? '';
    const isGen1 = ['red', 'blue', 'yellow'].includes(game.toLowerCase());
    const result = isGen1
      ? parseGen1Save(checkpoint.file_path, game)
      : parseGen2Save(checkpoint.file_path, game);

    // Enrich party with species names/sprites
    const partyPokemon = result.pokemon.slice(0, 6).map(p => {
      const species = db.prepare('SELECT name, sprite_url FROM species WHERE id = ?').get(p.species_id) as any;
      return {
        species_id: p.species_id,
        species_name: species?.name ?? null,
        sprite_url: species?.sprite_url ?? null,
        level: p.level,
      };
    });

    res.json({
      checkpoint,
      worldState: { ...result.worldState, party: partyPokemon },
      totalPokemon: result.pokemon.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to parse save: ${err.message}` });
  }
});

export default router;
