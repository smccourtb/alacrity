import { Router } from 'express';
import db from '../db.js';
import { decodeBallPermit } from '../services/ballLegality.js';

const router = Router();

// GET /api/legality/balls/:speciesId — decoded ball legality for a species
router.get('/balls/:speciesId', (req, res) => {
  const species = db.prepare(
    'SELECT id, ball_permit, category FROM species WHERE id = ?'
  ).get(req.params.speciesId) as any;

  if (!species) {
    res.status(404).json({ error: 'Species not found' });
    return;
  }

  res.json({
    species_id: species.id,
    ball_permit: species.ball_permit,
    legal_balls: decodeBallPermit(species.ball_permit),
    category: species.category,
  });
});

// GET /api/legality/shiny/:speciesId — shiny lock info
router.get('/shiny/:speciesId', (req, res) => {
  const locks = db.prepare(
    'SELECT form, game FROM shiny_locks WHERE species_id = ? ORDER BY game'
  ).all(req.params.speciesId) as any[];

  // Check if globally shiny-locked: locked in every game where the species is obtainable
  const obtainableGames = db.prepare(
    'SELECT COUNT(*) as count FROM game_versions WHERE max_species_id >= ?'
  ).get(req.params.speciesId) as any;
  const lockCount = db.prepare(
    'SELECT COUNT(DISTINCT game) as count FROM shiny_locks WHERE species_id = ? AND form = 0'
  ).get(req.params.speciesId) as any;

  res.json({
    species_id: Number(req.params.speciesId),
    shiny_locks: locks,
    is_globally_shiny_locked: obtainableGames.count > 0 && lockCount.count >= obtainableGames.count,
  });
});

// GET /api/legality/game-versions — all game versions with origin marks
router.get('/game-versions', (_req, res) => {
  const versions = db.prepare(
    'SELECT * FROM game_versions ORDER BY sort_order'
  ).all();
  res.json(versions);
});

// GET /api/legality/categories — species grouped by category
router.get('/categories', (_req, res) => {
  const rows = db.prepare(
    'SELECT id, name, category FROM species WHERE category IS NOT NULL ORDER BY category, id'
  ).all();
  res.json(rows);
});

export default router;
