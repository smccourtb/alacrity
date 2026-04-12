import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/reference/ribbons
router.get('/ribbons', (req, res) => {
  const ribbons = db.prepare('SELECT * FROM ribbons ORDER BY sort_order').all();
  res.json(ribbons);
});

// GET /api/reference/marks
router.get('/marks', (req, res) => {
  const marks = db.prepare('SELECT * FROM marks ORDER BY sort_order').all();
  res.json(marks);
});

// GET /api/reference/balls
router.get('/balls', (req, res) => {
  const balls = db.prepare('SELECT * FROM balls ORDER BY sort_order').all();
  res.json(balls);
});

// GET /api/reference/forms?species_id=1
router.get('/forms', (req, res) => {
  const species_id = typeof req.query.species_id === 'string' ? req.query.species_id : undefined;
  if (species_id) {
    const forms = db.prepare('SELECT * FROM forms_resolved WHERE species_id = ? ORDER BY form_order').all(species_id);
    res.json(forms);
  } else {
    const forms = db.prepare('SELECT * FROM forms_resolved ORDER BY species_id, form_order').all();
    res.json(forms);
  }
});

// GET /api/reference/shiny-methods?species_id=1
router.get('/shiny-methods', (req, res) => {
  const species_id = typeof req.query.species_id === 'string' ? req.query.species_id : undefined;
  if (species_id) {
    const methods = db.prepare('SELECT * FROM shiny_methods WHERE species_id = ?').all(species_id);
    res.json(methods);
  } else {
    const methods = db.prepare('SELECT * FROM shiny_methods ORDER BY species_id').all();
    res.json(methods);
  }
});

// GET /api/reference/game-versions
router.get('/game-versions', (_req, res) => {
  const versions = db.prepare('SELECT * FROM game_versions ORDER BY sort_order').all();
  res.json(versions);
});

export default router;
