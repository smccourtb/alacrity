import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/moves?names=thunderbolt,flamethrower
router.get('/', (req, res) => {
  const names = (req.query.names as string || '').split(',').filter(Boolean);
  if (names.length === 0) return res.json([]);
  const placeholders = names.map(() => '?').join(',');
  const moves = db.prepare(`SELECT * FROM moves WHERE name IN (${placeholders})`).all(...names);
  res.json(moves);
});

// GET /api/moves/search?q=thunder&limit=20
router.get('/search', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  if (!q) {
    const moves = db.prepare('SELECT * FROM moves ORDER BY name LIMIT ?').all(limit);
    return res.json(moves);
  }
  const moves = db.prepare('SELECT * FROM moves WHERE name LIKE ? ORDER BY name LIMIT ?').all(`%${q}%`, limit);
  res.json(moves);
});

export default router;
