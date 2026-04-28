import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';

// `marks.games` historically stores display names ("Sword", "Scarlet"); other
// reference routes use slugs ("sword", "legends-arceus"). Normalize both sides
// on read so callers can pass slugs uniformly.
const slugifyGame = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

const router = Router();

// GET /api/reference/ribbons
router.get('/ribbons', (req, res) => {
  const ribbons = db.prepare('SELECT * FROM ribbons ORDER BY sort_order').all();
  res.json(ribbons);
});

// GET /api/reference/marks?game=sword
router.get('/marks', (req, res) => {
  const game = typeof req.query.game === 'string' ? slugifyGame(req.query.game) : undefined;
  // ~50 rows, in-JS filter is fine
  const all = db.prepare('SELECT * FROM marks ORDER BY sort_order').all() as any[];
  if (!game) return res.json(all);
  res.json(all.filter(m => {
    try { return (JSON.parse(m.games) as string[]).map(slugifyGame).includes(game); }
    catch { return false; }
  }));
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

// GET /api/reference/tera-types
router.get('/tera-types', (_req, res) => {
  const rows = db.prepare('SELECT key, name, color FROM tera_types_catalog ORDER BY key').all();
  res.json(rows);
});

// GET /api/reference/alpha-species
router.get('/alpha-species', (_req, res) => {
  try {
    const filePath = join(paths.seedDataDir, 'meta', 'alpha-species.json');
    res.json(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch (err: any) {
    res.status(500).json({ error: `Failed to read alpha-species.json: ${err.message}` });
  }
});

// GET /api/reference/paradox-species
router.get('/paradox-species', (_req, res) => {
  try {
    const filePath = join(paths.seedDataDir, 'meta', 'paradox-species.json');
    res.json(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch (err: any) {
    res.status(500).json({ error: `Failed to read paradox-species.json: ${err.message}` });
  }
});

// GET /api/reference/active-legs
router.get('/active-legs', (_req, res) => {
  const rows = db.prepare(
    `SELECT key, label, origin_mark, games, leg_order, status FROM collection_legs WHERE status = 'active' ORDER BY leg_order`
  ).all();
  res.json(rows.map((r: any) => ({ ...r, games: JSON.parse(r.games) })));
});

// GET /api/reference/species-in-dex?game=legends-arceus
router.get('/species-in-dex', (req, res) => {
  const game = typeof req.query.game === 'string' ? req.query.game : undefined;
  if (!game) return res.status(400).json({ error: 'Missing required query param: ?game=<slug> (e.g. legends-arceus)' });
  const rows = db.prepare(
    `SELECT species_id, dex_name, dex_number FROM species_in_dex WHERE game = ? ORDER BY dex_name, dex_number`
  ).all(game);
  res.json(rows);
});

export default router;
