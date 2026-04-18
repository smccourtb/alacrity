import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(
    'SELECT id, name, increased_stat, decreased_stat, is_neutral FROM natures ORDER BY name'
  ).all();
  res.json(rows);
});

export default router;
