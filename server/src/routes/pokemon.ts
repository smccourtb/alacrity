import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Build GAME_TO_ORIGIN from the game_versions table (single source of truth)
function getGameToOrigin(): Record<string, string> {
  const rows = db.prepare('SELECT name, origin_mark FROM game_versions').all() as any[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.name] = r.origin_mark;
  return map;
}
let _gameToOrigin: Record<string, string> | null = null;
function gameToOrigin(): Record<string, string> {
  if (!_gameToOrigin) _gameToOrigin = getGameToOrigin();
  return _gameToOrigin;
}

router.get('/', (req, res) => {
  const { shiny, species_id } = req.query;
  let sql = `SELECT cm.*,
    s.name as species_name, s.sprite_url, s.shiny_sprite_url
  FROM collection_manual cm
  JOIN species s ON cm.species_id = s.id
  WHERE 1=1`;
  const params: any[] = [];

  if (shiny !== undefined) {
    sql += ' AND cm.is_shiny = ?';
    params.push(shiny === 'true' ? 1 : 0);
  }
  if (species_id) {
    sql += ' AND cm.species_id = ?';
    params.push(Number(species_id));
  }

  sql += ' ORDER BY cm.species_id, cm.id';
  res.json(db.prepare(sql).all(...params));
});

router.get('/completion', (_req, res) => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM species').get() as any).count;

  // Fetch all opted-in identity sightings (species_id + snapshot_data for shiny check)
  const sightingRows = db.prepare(`
    SELECT s.species_id, s.snapshot_data FROM collection_saves s
    JOIN checkpoints c ON c.id = s.checkpoint_id
    JOIN playthroughs pt ON pt.id = c.playthrough_id
    WHERE c.include_in_collection = 1 AND c.archived = 0 AND pt.include_in_collection = 1
    UNION ALL
    SELECT s.species_id, s.snapshot_data FROM collection_bank s
    JOIN save_files sf ON sf.id = s.bank_file_id
    WHERE (sf.format = 'bank' OR sf.source IN ('pksm', 'bank'))
  `).all() as { species_id: number; snapshot_data: string | null }[];

  // Manual entries
  const manualRows = db.prepare(
    'SELECT species_id, is_shiny FROM collection_manual'
  ).all() as { species_id: number; is_shiny: number }[];

  // Build sets
  const caughtSpecies = new Set<number>();
  const shinySpecies = new Set<number>();

  for (const row of sightingRows) {
    caughtSpecies.add(row.species_id);
    if (row.snapshot_data) {
      try {
        const snap = JSON.parse(row.snapshot_data);
        if (snap.is_shiny) shinySpecies.add(row.species_id);
      } catch {}
    }
  }
  for (const row of manualRows) {
    caughtSpecies.add(row.species_id);
    if (row.is_shiny) shinySpecies.add(row.species_id);
  }

  // By-gen breakdown — get generation for each species
  const speciesGenMap = new Map<number, number>();
  const genRows = db.prepare('SELECT id, generation FROM species').all() as { id: number; generation: number }[];
  for (const r of genRows) speciesGenMap.set(r.id, r.generation);

  const genTotals = db.prepare(
    'SELECT generation, COUNT(*) as total FROM species GROUP BY generation ORDER BY generation'
  ).all() as { generation: number; total: number }[];

  const byGen = genTotals.map(g => {
    const genCaught = new Set<number>();
    const genShiny = new Set<number>();
    for (const id of caughtSpecies) {
      if (speciesGenMap.get(id) === g.generation) genCaught.add(id);
    }
    for (const id of shinySpecies) {
      if (speciesGenMap.get(id) === g.generation) genShiny.add(id);
    }
    return {
      generation: g.generation,
      total: g.total,
      caught: genCaught.size,
      shiny_caught: genShiny.size,
    };
  });

  res.json({ total, caught: caughtSpecies.size, shinyCaught: shinySpecies.size, byGen });
});

router.get('/completion/species/:id', (req, res) => {
  const { id } = req.params;
  const speciesId = Number(id);
  const species = db.prepare('SELECT * FROM species WHERE id = ?').get(speciesId) as any;
  if (!species) return res.status(404).json({ error: 'Species not found' });

  // Identity sightings for this species
  const sightings = db.prepare(`
    SELECT s.snapshot_data FROM collection_saves s
    JOIN checkpoints c ON c.id = s.checkpoint_id
    JOIN playthroughs pt ON pt.id = c.playthrough_id
    WHERE s.species_id = ? AND c.include_in_collection = 1 AND c.archived = 0 AND pt.include_in_collection = 1
    UNION ALL
    SELECT s.snapshot_data FROM collection_bank s
    JOIN save_files sf ON sf.id = s.bank_file_id
    WHERE s.species_id = ? AND (sf.format = 'bank' OR sf.source IN ('pksm', 'bank'))
  `).all(speciesId, speciesId) as { snapshot_data: string | null }[];

  // Manual entries
  const manualEntries = db.prepare('SELECT * FROM collection_manual WHERE species_id = ?').all(speciesId) as any[];

  // Parse sighting snapshots
  const parsed = sightings
    .map(s => { try { return s.snapshot_data ? JSON.parse(s.snapshot_data) : null; } catch { return null; } })
    .filter(Boolean);

  // Aggregate
  let living = false;
  let shiny = false;
  const originGames = new Set<string>();
  const allRibbons = new Set<number>();
  const allMarks = new Set<number>();
  const balls = new Set<string>();
  const abilities = new Set<string>();
  let hasPerfect = false;

  for (const snap of parsed) {
    if (snap.is_shiny) shiny = true; else living = true;
    if (snap.origin_game) originGames.add(snap.origin_game);
    if (snap.ball) balls.add(snap.ball);
    if (snap.ability) abilities.add(snap.ability);
    if (snap.ivs) {
      const iv = snap.ivs;
      // Gen 3+: perfect = all 31. Gen 1-2: perfect = all 15
      if ((iv.hp === 31 && iv.atk === 31 && iv.def === 31 && iv.spa === 31 && iv.spd === 31 && iv.spe === 31) ||
          (iv.hp === 15 && iv.atk === 15 && iv.def === 15 && iv.spa === 15 && iv.spd === 15 && iv.spe === 15)) {
        hasPerfect = true;
      }
    }
    try { for (const r of JSON.parse(snap.ribbons || '[]')) allRibbons.add(r); } catch {}
    try { for (const m of JSON.parse(snap.marks || '[]')) allMarks.add(m); } catch {}
  }

  for (const e of manualEntries) {
    if (e.is_shiny) shiny = true; else living = true;
    if (e.origin_game) originGames.add(e.origin_game);
    if (e.ball) balls.add(e.ball);
    if (e.ability) abilities.add(e.ability);
    try { for (const r of JSON.parse(e.ribbons || '[]')) allRibbons.add(r); } catch {}
    try { for (const m of JSON.parse(e.marks || '[]')) allMarks.add(m); } catch {}
    if (e.ivs) {
      try {
        const iv = JSON.parse(e.ivs);
        if (iv.hp === 31 && iv.atk === 31 && iv.def === 31 && iv.spa === 31 && iv.spd === 31 && iv.spe === 31) {
          hasPerfect = true;
        }
      } catch {}
    }
  }

  // Convert origin_game strings to origin marks, then count unique marks
  const origins = new Set<string>();
  const g2o = gameToOrigin();
  for (const game of originGames) {
    if (g2o[game]) origins.add(g2o[game]);
    else origins.add(game);
  }

  const totalAbilities = [species.ability1, species.ability2, species.hidden_ability].filter(Boolean).length;

  // Per-form completion
  const formCompletion: Record<number, { living: boolean; shiny: boolean }> = {};
  const speciesForms = db.prepare(
    'SELECT id, form_category FROM species_forms WHERE species_id = ? AND is_collectible = 1'
  ).all(speciesId) as { id: number; form_category: string }[];

  for (const form of speciesForms) {
    const formSnaps = parsed.filter((s: any) => s.form === form.id);
    const formManual = manualEntries.filter((e: any) => e.form_id === form.id);
    formCompletion[form.id] = {
      living: formSnaps.some((s: any) => !s.is_shiny) || formManual.some((e: any) => !e.is_shiny),
      shiny: formSnaps.some((s: any) => s.is_shiny) || formManual.some((e: any) => e.is_shiny),
    };
  }
  const standardForm = speciesForms.find(f => f.form_category === 'standard');
  if (standardForm) {
    const noFormSnaps = parsed.filter((s: any) => !s.form || s.form === 0);
    const noFormManual = manualEntries.filter((e: any) => !e.form_id);
    if (noFormSnaps.length > 0 || noFormManual.length > 0) {
      formCompletion[standardForm.id] = {
        living: formCompletion[standardForm.id]?.living || noFormSnaps.some((s: any) => !s.is_shiny) || noFormManual.some((e: any) => !e.is_shiny),
        shiny: formCompletion[standardForm.id]?.shiny || noFormSnaps.some((s: any) => s.is_shiny) || noFormManual.some((e: any) => e.is_shiny),
      };
    }
  }

  res.json({
    species_id: speciesId,
    living,
    shiny,
    origins: origins.size,
    total_origins: 11,
    ribbons: allRibbons.size,
    marks: allMarks.size,
    balls: balls.size,
    abilities: abilities.size,
    total_abilities: totalAbilities,
    has_perfect_ivs: hasPerfect,
    entries_count: parsed.length + manualEntries.length,
    forms: formCompletion,
  });
});

// Resolve an `origin_game` slug ('legends-z-a', 'sword') to its display-name
// form ('Legends Z-A', 'Sword') as stored in `game_versions.name`. Existing
// origin-mark + leg attribution lookups are keyed by display name; storing the
// slug makes manual entries fall through those maps. Returns the input
// unchanged if no game_versions row matches.
function normalizeOriginGame(input: string | null | undefined): string | null {
  if (!input) return null;
  const row = db.prepare(
    `SELECT name FROM game_versions
       WHERE LOWER(REPLACE(name, ' ', '-')) = ?
          OR LOWER(REPLACE(name, ' ', ''))  = ?
          OR LOWER(name)                    = ?
       LIMIT 1`
  ).get(input, input, input) as { name: string } | undefined;
  return row?.name ?? input;
}

// Allowlist of columns the PUT handler is permitted to mutate. Anything
// outside this set (e.g. id, identity_id, species_id, created_at) is silently
// dropped to prevent client-side rewiring of manual rows.
const PUT_ALLOWED_COLUMNS = new Set([
  'nickname', 'is_shiny', 'level', 'gender', 'nature', 'ability', 'ball',
  'origin_game', 'ot_name', 'ot_tid', 'form_id', 'ribbons', 'marks',
  'ivs', 'evs', 'moves', 'notes', 'caught_date',
  'tera_type', 'is_alpha', 'is_mega',
]);

router.post('/', (req, res) => {
  const {
    species_id, nickname, is_shiny, level, gender, nature, ability, ball,
    origin_game: originGameInput, ot_name, ot_tid, form_id,
    iv_hp, iv_attack, iv_defense, iv_speed, iv_sp_attack, iv_sp_defense,
    ev_hp, ev_attack, ev_defense, ev_speed, ev_sp_attack, ev_sp_defense,
    move1, move2, move3, move4, notes, caught_date,
    ribbons, marks,
    tera_type, is_alpha, is_mega
  } = req.body;
  const origin_game = normalizeOriginGame(originGameInput);

  if (form_id) {
    const form = db.prepare('SELECT species_id FROM species_forms WHERE id = ?').get(form_id) as any;
    if (!form || form.species_id !== species_id) {
      return res.status(400).json({ error: 'form_id does not belong to this species' });
    }
  }

  if (tera_type) {
    const ok = db.prepare('SELECT 1 FROM tera_types_catalog WHERE key = ?').get(tera_type);
    if (!ok) return res.status(400).json({ error: `Unknown tera_type: ${tera_type}` });
  }

  const ribbonsJson = ribbons ? JSON.stringify(ribbons) : '[]';
  const marksJson = marks ? JSON.stringify(marks) : '[]';

  // Pack IVs/EVs/moves as JSON
  const ivsJson = (iv_hp != null) ? JSON.stringify({
    hp: iv_hp, atk: iv_attack ?? 0, def: iv_defense ?? 0,
    spa: iv_sp_attack ?? 0, spd: iv_sp_defense ?? 0, spe: iv_speed ?? 0,
  }) : null;
  const evsJson = (ev_hp != null) ? JSON.stringify({
    hp: ev_hp, atk: ev_attack ?? 0, def: ev_defense ?? 0,
    spa: ev_sp_attack ?? 0, spd: ev_sp_defense ?? 0, spe: ev_speed ?? 0,
  }) : null;
  const movesJson = JSON.stringify([move1, move2, move3, move4].filter(Boolean));

  const result = db.prepare(`
    INSERT INTO collection_manual
      (species_id, nickname, is_shiny, level, gender, nature, ability, ball,
       origin_game, ot_name, ot_tid, form_id, ribbons, marks, ivs, evs, moves, notes, caught_date,
       tera_type, is_alpha, is_mega)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    species_id, nickname || null, is_shiny ? 1 : 0, level || null,
    gender || null, nature || null, ability || null, ball || null,
    origin_game || null, ot_name || null, ot_tid || null, form_id || null,
    ribbonsJson, marksJson, ivsJson, evsJson, movesJson,
    notes || null, caught_date || null,
    tera_type ?? null, is_alpha ? 1 : 0, is_mega ? 1 : 0
  );

  const created = db.prepare(`
    SELECT cm.*, s.name as species_name, s.sprite_url, s.shiny_sprite_url
    FROM collection_manual cm JOIN species s ON cm.species_id = s.id
    WHERE cm.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM collection_manual WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (PUT_ALLOWED_COLUMNS.has(k)) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

  if (updates.tera_type) {
    const ok = db.prepare('SELECT 1 FROM tera_types_catalog WHERE key = ?').get(updates.tera_type as string);
    if (!ok) return res.status(400).json({ error: `Unknown tera_type: ${updates.tera_type}` });
  }

  if (typeof updates.origin_game === 'string') {
    updates.origin_game = normalizeOriginGame(updates.origin_game);
  }

  // Stringify JSON fields if they're arrays/objects
  if (Array.isArray(updates.ribbons)) updates.ribbons = JSON.stringify(updates.ribbons);
  if (Array.isArray(updates.marks)) updates.marks = JSON.stringify(updates.marks);
  if (updates.ivs && typeof updates.ivs === 'object') updates.ivs = JSON.stringify(updates.ivs);
  if (updates.evs && typeof updates.evs === 'object') updates.evs = JSON.stringify(updates.evs);
  if (Array.isArray(updates.moves)) updates.moves = JSON.stringify(updates.moves);
  if (typeof updates.is_alpha === 'boolean') updates.is_alpha = updates.is_alpha ? 1 : 0;
  if (typeof updates.is_mega === 'boolean') updates.is_mega = updates.is_mega ? 1 : 0;

  const fields = Object.keys(updates);
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f] as any);

  db.prepare(`UPDATE collection_manual SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...values, req.params.id);
  const updated = db.prepare('SELECT * FROM collection_manual WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM collection_manual WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ success: true });
});

export default router;
