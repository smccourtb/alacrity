import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const generation = req.query.generation ? Number(req.query.generation) : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  const clauses: string[] = [];
  const params: any[] = [];
  if (category) { clauses.push('category = ?'); params.push(category); }
  if (generation && Number.isFinite(generation)) {
    clauses.push('(generation IS NULL OR generation <= ?)');
    params.push(generation);
  }
  if (search) {
    clauses.push('(LOWER(name) LIKE ? OR LOWER(display_name) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT id, name, display_name, category, generation, sprite_path
    FROM items
    ${where}
    ORDER BY category, display_name
    LIMIT 2000
  `).all(...params);
  res.json(rows);
});

export default router;
