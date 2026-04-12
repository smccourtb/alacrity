import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { gen, type, include_forms } = req.query;
  let sql = 'SELECT * FROM species WHERE 1=1';
  const params: any[] = [];

  if (gen) {
    sql += ' AND generation = ?';
    params.push(Number(gen));
  }
  if (type) {
    sql += ' AND (type1 = ? OR type2 = ?)';
    params.push(type, type);
  }

  sql += ' ORDER BY id';
  const speciesList = db.prepare(sql).all(...params) as any[];

  if (include_forms === 'true') {
    const allForms = db.prepare('SELECT * FROM forms_resolved ORDER BY species_id, form_order').all() as any[];
    const formsBySpecies = new Map<number, any[]>();
    for (const f of allForms) {
      const list = formsBySpecies.get(f.species_id) || [];
      list.push(f);
      formsBySpecies.set(f.species_id, list);
    }
    const result = speciesList.map(s => ({
      ...s,
      forms: formsBySpecies.get(s.id) || [],
    }));
    res.json(result);
  } else {
    res.json(speciesList);
  }
});

router.get('/:id/forms', (req, res) => {
  const forms = db.prepare('SELECT * FROM forms_resolved WHERE species_id = ? ORDER BY form_order').all(req.params.id);
  res.json(forms);
});

router.get('/:id', (req, res) => {
  const species = db.prepare('SELECT * FROM species WHERE id = ?').get(req.params.id);
  if (!species) return res.status(404).json({ error: 'Species not found' });

  // Include shiny availability info
  const shinyAvailability = db.prepare(
    'SELECT game, method, notes, source_url FROM shiny_availability WHERE species_id = ? ORDER BY game'
  ).all(req.params.id);

  res.json({ ...species as any, shiny_availability: shinyAvailability });
});

// Dedicated endpoint for shiny availability
router.get('/:id/shiny-availability', (req, res) => {
  const availability = db.prepare(
    'SELECT game, method, notes, source_url FROM shiny_availability WHERE species_id = ? ORDER BY game'
  ).all(req.params.id);
  res.json(availability);
});

export default router;
