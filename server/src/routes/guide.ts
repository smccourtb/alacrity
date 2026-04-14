import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { computeProgress } from '../services/guideProgress.js';
import { loadFlagDefinitions } from '../services/flagParsers/index.js';
import type { FlagDefinition } from '../services/flagParsers/types.js';
import { resolveCollection } from '../services/identityService.js';

const router = Router();

// Migrations for guide tables
try { db.exec('ALTER TABLE location_trainers ADD COLUMN description TEXT'); } catch {}
try { db.exec('ALTER TABLE location_tms ADD COLUMN description TEXT'); } catch {}

// GET /api/guide/maps — list all game maps
router.get('/maps', (_req, res) => {
  const maps = db.prepare('SELECT * FROM game_maps').all() as any[];
  res.json(maps.map(m => ({ ...m, games: JSON.parse(m.games) })));
});

// GET /api/guide/maps/:mapKey — single map by key
router.get('/maps/:mapKey', (req, res) => {
  const map = db.prepare('SELECT * FROM game_maps WHERE map_key = ?').get(req.params.mapKey) as any;
  if (!map) return res.status(404).json({ error: 'Map not found' });
  res.json({ ...map, games: JSON.parse(map.games) });
});

// GET /api/guide/game-map/:game — resolve a game code to its map
router.get('/game-map/:game', (req, res) => {
  const { game } = req.params;
  const map = db.prepare(`
    SELECT * FROM game_maps WHERE games LIKE ?
  `).get(`%"${game}"%`) as any;

  if (!map) {
    return res.status(404).json({ error: `No map found for game: ${game}` });
  }

  map.games = JSON.parse(map.games);
  res.json(map);
});

// GET /api/guide/locations/:mapKey — all locations for a map
router.get('/locations/:mapKey', (req, res) => {
  const locations = db.prepare(`
    SELECT ml.* FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE gm.map_key = ?
    ORDER BY ml.progression_order
  `).all(req.params.mapKey);
  res.json(locations);
});

// PATCH /api/guide/locations/:id — update location marker position
router.patch('/locations/:id', (req, res) => {
  const { x, y } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y must be numbers' });
  }
  const result = db.prepare('UPDATE map_locations SET x = ?, y = ? WHERE id = ?').run(x, y, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Location not found' });
  res.json({ ok: true });
});

// GET /api/guide/walkthrough/:game — all steps for a game with completion status
router.get('/walkthrough/:game', (req, res) => {
  const game = req.params.game;

  const rows = db.prepare(`
    SELECT
      ws.id, ws.step_order, ws.action_tag, ws.description,
      ws.species_id, ws.specimen_role, ws.auto_trackable, ws.notes,
      ws.specimen_task_id, ws.is_version_exclusive, ws.exclusive_to,
      ws.save_file_id AS step_save_file_id,
      s.name AS species_name,
      s.sprite_url,
      ml.id AS location_id, ml.location_key, ml.display_name AS location_name,
      ml.x, ml.y, ml.progression_order,
      st.save_file_id AS task_save_file_id,
      sf.filename AS save_filename,
      sf.notes AS save_notes,
      sf.file_path AS save_file_path,
      sp.status AS specimen_status
    FROM walkthrough_steps ws
    LEFT JOIN species s ON s.id = ws.species_id
    JOIN map_locations ml ON ml.id = ws.location_id
    LEFT JOIN specimen_tasks st ON st.id = ws.specimen_task_id
    LEFT JOIN specimen_progress sp ON sp.target_id = st.target_id
    LEFT JOIN save_files sf ON sf.id = COALESCE(ws.save_file_id, st.save_file_id)
    WHERE ws.game = ?
    ORDER BY ml.progression_order, ws.step_order
  `).all(game) as any[];
  const steps = rows;

  // Get milestone (manual) completion from guide_progress
  const milestoneProgress = db.prepare(`
    SELECT step_id, MAX(completed) as completed
    FROM guide_progress
    GROUP BY step_id
  `).all() as { step_id: number; completed: number }[];
  const milestoneMap = new Map(milestoneProgress.map(p => [p.step_id, p.completed === 1]));

  // Group by location
  const grouped: Record<string, { location: any; steps: any[] }> = {};
  for (const step of steps) {
    const key = step.location_key;
    if (!grouped[key]) {
      grouped[key] = {
        location: {
          id: step.location_id,
          key: step.location_key,
          name: step.location_name,
          x: step.x,
          y: step.y,
        },
        steps: [],
      };
    }

    // Determine completion
    const isSpecimenStep = step.specimen_task_id !== null;
    const specimenCompleted = isSpecimenStep && ['completed', 'obtained', 'journey_complete'].includes(step.specimen_status);
    const milestoneCompleted = !isSpecimenStep && (milestoneMap.get(step.id) || false);

    grouped[key].steps.push({
      id: step.id,
      step_order: step.step_order,
      action_tag: step.action_tag,
      description: step.description,
      species_id: step.species_id,
      species_name: step.species_name,
      sprite_url: step.sprite_url,
      specimen_role: step.specimen_role,
      is_version_exclusive: step.is_version_exclusive,
      exclusive_to: step.exclusive_to,
      auto_trackable: step.auto_trackable,
      notes: step.notes,
      specimen_task_id: step.specimen_task_id,
      completed: specimenCompleted || milestoneCompleted,
      completed_from_save: specimenCompleted,
      save_file_id: step.step_save_file_id ?? step.task_save_file_id ?? null,
      save_label: step.save_filename ?? null,
      save_notes: step.save_notes ?? null,
      is_collection_target: step.specimen_task_id != null,
      collection_status: step.specimen_status ?? null,
    });
  }

  res.json(Object.values(grouped));
});

// GET /api/guide/encounters/:locationId — encounter table for a location
router.get('/encounters/:locationId', (req, res) => {
  const game = req.query.game as string;
  let sql = `
    SELECT me.*, s.name as species_name, s.sprite_url, s.type1, s.type2
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id = ?
  `;
  const params: any[] = [req.params.locationId];

  if (game) {
    sql += ' AND me.game = ?';
    params.push(game);
  }

  sql += ' ORDER BY me.encounter_rate DESC';

  const encounters = db.prepare(sql).all(...params);
  res.json(encounters);
});

// GET /api/guide/location/:locationId/collection-status
// Returns encounter species for this location annotated with caught/needed status
router.get('/location/:locationId/collection-status', (req, res) => {
  try {
    const locationId = Number(req.params.locationId);
    const game = req.query.game as string | undefined;

    let sql = `
    SELECT DISTINCT me.species_id, s.name as species_name, s.sprite_url
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id = ?
  `;
    const params: any[] = [locationId];
    if (game) {
      sql += ' AND me.game = ?';
      params.push(game);
    }
    sql += ' ORDER BY me.species_id';

    const encounters = db.prepare(sql).all(...params) as any[];

    const collection = resolveCollection();
    const collectedSpecies = new Set(collection.map((c: any) => c.species_id));

    const annotated = encounters.map((e: any) => ({
      ...e,
      caught: collectedSpecies.has(e.species_id),
    }));

    const caughtCount = annotated.filter((e: any) => e.caught).length;

    res.json({
      encounters: annotated,
      summary: { total: encounters.length, caught: caughtCount },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guide/progress/:game/:saveId — computed progress
router.get('/progress/:game/:saveId', (req, res) => {
  const { game, saveId } = req.params;
  const playthroughId = req.query.playthrough_id ? Number(req.query.playthrough_id) : undefined;

  // Look up save file path
  const saveFile = db.prepare('SELECT file_path FROM save_files WHERE id = ?').get(Number(saveId)) as { file_path: string } | undefined;

  const result = computeProgress(game, saveFile?.file_path || null, Number(saveId), playthroughId);
  res.json(result);
});

// POST /api/guide/progress/:stepId — toggle manual progress (milestones only)
router.post('/progress/:stepId', (req, res) => {
  const stepId = Number(req.params.stepId);
  const { completed, notes } = req.body;

  // Only allow toggling milestones (steps without specimen_task_id)
  const step = db.prepare('SELECT specimen_task_id FROM walkthrough_steps WHERE id = ?').get(stepId) as { specimen_task_id: number | null } | undefined;
  if (!step) return res.status(404).json({ error: 'Step not found' });
  if (step.specimen_task_id !== null) {
    return res.status(400).json({ error: 'Specimen steps are completed from save data, not manually' });
  }

  db.prepare(`
    INSERT INTO guide_progress (step_id, completed, completed_at, notes)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(step_id, save_file_id) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at,
      notes = excluded.notes
  `).run(stepId, completed ? 1 : 0, notes || null);

  res.json({ ok: true });
});

// PATCH /api/guide/steps/:stepId/save — link/unlink a save file to a walkthrough step
router.patch('/steps/:stepId/save', (req, res) => {
  const { stepId } = req.params;
  const { save_file_id } = req.body; // null to unlink

  const step = db.prepare('SELECT * FROM walkthrough_steps WHERE id = ?').get(stepId);
  if (!step) return res.status(404).json({ error: 'Step not found' });

  db.prepare('UPDATE walkthrough_steps SET save_file_id = ? WHERE id = ?')
    .run(save_file_id ?? null, stepId);

  const updated = db.prepare('SELECT * FROM walkthrough_steps WHERE id = ?').get(stepId);
  res.json(updated);
});

// GET /api/guide/campaign — full GB origin campaign with phases
router.get('/campaign', (_req, res) => {
  const phasesPath = join(paths.seedDataDir, 'meta', 'campaign-phases.json');
  const phases = JSON.parse(readFileSync(phasesPath, 'utf-8')) as Array<{
    phase: number; game: string; label: string; description: string;
  }>;

  // Get milestone completion
  const milestoneProgress = db.prepare(`
    SELECT step_id, MAX(completed) as completed
    FROM guide_progress
    GROUP BY step_id
  `).all() as { step_id: number; completed: number }[];
  const milestoneMap = new Map(milestoneProgress.map(p => [p.step_id, p.completed === 1]));

  const result = phases.map(phase => {
    const steps = db.prepare(`
      SELECT ws.*, ml.location_key, ml.display_name as location_name, ml.x, ml.y,
             ml.progression_order,
             s.name as species_name, s.sprite_url,
             sp.status as specimen_status
      FROM walkthrough_steps ws
      JOIN map_locations ml ON ml.id = ws.location_id
      LEFT JOIN species s ON s.id = ws.species_id
      LEFT JOIN specimen_tasks stk ON stk.id = ws.specimen_task_id
      LEFT JOIN specimen_targets stt ON stt.id = stk.target_id
      LEFT JOIN specimen_progress sp ON sp.target_id = stt.id
      WHERE ws.game = ?
      ORDER BY ml.progression_order, ws.step_order
    `).all(phase.game) as any[];

    const locations: any[] = [];
    let currentLocKey: string | null = null;
    let currentGroup: any = null;
    let phaseTotal = 0;
    let phaseCompleted = 0;

    for (const step of steps) {
      if (step.location_key !== currentLocKey) {
        currentLocKey = step.location_key;
        currentGroup = {
          location: {
            id: step.location_id,
            key: step.location_key,
            name: step.location_name,
            x: step.x,
            y: step.y,
          },
          steps: [],
        };
        locations.push(currentGroup);
      }

      const isSpecimenStep = step.specimen_task_id !== null;
      const specimenCompleted = isSpecimenStep && ['completed', 'obtained', 'journey_complete'].includes(step.specimen_status);
      const milestoneCompleted = !isSpecimenStep && (milestoneMap.get(step.id) || false);
      const completed = specimenCompleted || milestoneCompleted;

      phaseTotal++;
      if (completed) phaseCompleted++;

      currentGroup.steps.push({
        id: step.id,
        step_order: step.step_order,
        action_tag: step.action_tag,
        description: step.description,
        species_id: step.species_id,
        species_name: step.species_name,
        sprite_url: step.sprite_url,
        specimen_role: step.specimen_role,
        is_version_exclusive: step.is_version_exclusive,
        exclusive_to: step.exclusive_to,
        auto_trackable: step.auto_trackable,
        notes: step.notes,
        specimen_task_id: step.specimen_task_id,
        completed,
        completed_from_save: specimenCompleted,
      });
    }

    return {
      ...phase,
      locations,
      progress: { total: phaseTotal, completed: phaseCompleted },
    };
  });

  const overallTotal = result.reduce((s, p) => s + p.progress.total, 0);
  const overallCompleted = result.reduce((s, p) => s + p.progress.completed, 0);

  res.json({ phases: result, overall: { total: overallTotal, completed: overallCompleted } });
});

// GET /api/guide/markers/:mapKey — all marker positions for a map
router.get('/markers/:mapKey', (req, res) => {
  const { mapKey } = req.params;
  const game = req.query.game as string | undefined;

  const rows = db.prepare(`
    SELECT
      mp.id, mp.marker_type, mp.reference_id, mp.x, mp.y, mp.game_override,
      CASE mp.marker_type
        WHEN 'item' THEN li.item_name
        WHEN 'hidden_item' THEN li.item_name
        WHEN 'trainer' THEN lt.trainer_name
        WHEN 'tm' THEN ltm.move_name
        WHEN 'event' THEN le.event_name
      END as name,
      CASE mp.marker_type
        WHEN 'item' THEN li.method
        WHEN 'hidden_item' THEN li.method
        WHEN 'trainer' THEN lt.trainer_class
        WHEN 'tm' THEN ltm.tm_number
        WHEN 'event' THEN le.event_type
      END as detail,
      CASE mp.marker_type
        WHEN 'item' THEN li.flag_index
        WHEN 'hidden_item' THEN li.flag_index
        WHEN 'trainer' THEN lt.flag_index
        WHEN 'tm' THEN ltm.flag_index
        WHEN 'event' THEN le.flag_index
      END as flag_index,
      CASE mp.marker_type
        WHEN 'item' THEN li.location_id
        WHEN 'hidden_item' THEN li.location_id
        WHEN 'trainer' THEN lt.location_id
        WHEN 'tm' THEN ltm.location_id
        WHEN 'event' THEN le.location_id
      END as location_id,
      ml.location_key
    FROM marker_positions mp
    LEFT JOIN location_items li ON (mp.marker_type IN ('item','hidden_item') AND mp.reference_id = li.id)
    LEFT JOIN location_trainers lt ON (mp.marker_type = 'trainer' AND mp.reference_id = lt.id)
    LEFT JOIN location_tms ltm ON (mp.marker_type = 'tm' AND mp.reference_id = ltm.id)
    LEFT JOIN location_events le ON (mp.marker_type = 'event' AND mp.reference_id = le.id)
    LEFT JOIN map_locations ml ON ml.id = COALESCE(li.location_id, lt.location_id, ltm.location_id, le.location_id)
    WHERE mp.map_key = ?
      AND (mp.game_override IS NULL OR mp.game_override = ?)
    ORDER BY mp.marker_type, mp.id
  `).all(mapKey, game ?? '') as any[];

  res.json(rows);
});

// POST /api/guide/markers — create or upsert a marker position
router.post('/markers', (req, res) => {
  const { map_key, marker_type, reference_id, x, y, game_override } = req.body;
  if (!map_key || !marker_type || reference_id == null || x == null || y == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db.prepare(`
    INSERT INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(map_key, marker_type, reference_id, game_override)
    DO UPDATE SET x = excluded.x, y = excluded.y
  `).run(map_key, marker_type, reference_id, x, y, game_override ?? null);

  res.json({ id: result.lastInsertRowid });
});

// PATCH /api/guide/markers/:id — update marker position
router.patch('/markers/:id', (req, res) => {
  const { x, y } = req.body;
  if (x == null || y == null) {
    return res.status(400).json({ error: 'x and y required' });
  }
  db.prepare('UPDATE marker_positions SET x = ?, y = ? WHERE id = ?').run(x, y, Number(req.params.id));
  res.json({ ok: true });
});

// PATCH /api/guide/sub-marker/:type/:id — update description
router.patch('/sub-marker/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const { description } = req.body;
  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'description string required' });
  }

  const TABLE_MAP: Record<string, string> = {
    item: 'location_items',
    hidden_item: 'location_items',
    trainer: 'location_trainers',
    tm: 'location_tms',
    event: 'location_events',
  };
  const table = TABLE_MAP[type];
  if (!table) return res.status(400).json({ error: 'invalid marker type' });

  db.prepare(`UPDATE ${table} SET description = ? WHERE id = ?`).run(description, Number(id));
  res.json({ ok: true });
});

// DELETE /api/guide/markers/:id — remove a marker position
router.delete('/markers/:id', (req, res) => {
  db.prepare('DELETE FROM marker_positions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// GET /api/guide/markers/:mapKey/export — dump all marker positions as JSON
router.get('/markers/:mapKey/export', (req, res) => {
  const rows = db.prepare('SELECT * FROM marker_positions WHERE map_key = ?').all(req.params.mapKey);
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.mapKey}-markers.json"`);
  res.json(rows);
});

// POST /api/guide/markers/:mapKey/import — bulk import marker positions
router.post('/markers/:mapKey/import', (req, res) => {
  const { markers } = req.body;
  if (!Array.isArray(markers)) return res.status(400).json({ error: 'markers array required' });

  const insert = db.prepare(`
    INSERT OR REPLACE INTO marker_positions (map_key, marker_type, reference_id, x, y, game_override)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const m of markers) {
      insert.run(req.params.mapKey, m.marker_type, m.reference_id, m.x, m.y, m.game_override ?? null);
    }
  });
  transaction();

  res.json({ imported: markers.length });
});

/**
 * Auto-link flag definitions to location items that are missing flag_index.
 * Searches all flag categories for the location since the game's flag categories
 * don't always align with our sidebar categories (e.g. ground items are "event" flags).
 */
function autoLinkFlags(items: any[], locFlags: FlagDefinition[], usedIndices: Set<number>): void {
  for (const item of items) {
    if (item.flag_index != null) continue;

    const name = (item.trainer_name || item.item_name || item.move_name || item.event_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (!name) continue;

    const match = locFlags.find(f => !usedIndices.has(f.index) && f.name.toUpperCase().includes(name));
    if (match) {
      item.flag_index = match.index;
      usedIndices.add(match.index);
    }
  }
}

// GET /api/guide/location-detail/:locationId/:game
router.get('/location-detail/:locationId/:game', (req, res) => {
  const { locationId, game } = req.params;
  const locId = Number(locationId);

  const gameGroup = [game];
  const gamePlaceholders = '?';

  // Gym locations should also pull data from their parent city (e.g. pewter-gym → pewter-city)
  // because some seed data files use the city key for gym trainers
  const loc = db.prepare('SELECT location_key FROM map_locations WHERE id = ?').get(locId) as { location_key: string } | undefined;
  const locIds = [locId];
  if (loc?.location_key?.endsWith('-gym')) {
    const cityKey = loc.location_key.replace('-gym', '-city').replace('cinnabar-city', 'cinnabar-island');
    const parentLoc = db.prepare('SELECT id FROM map_locations WHERE location_key = ?').get(cityKey) as { id: number } | undefined;
    if (parentLoc) locIds.push(parentLoc.id);
  }
  const locPlaceholders = locIds.map(() => '?').join(',');

  const items = db.prepare(`
    SELECT * FROM location_items WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders}) ORDER BY method, item_name
  `).all(...locIds, ...gameGroup);

  const rawTrainers = db.prepare(`
    SELECT * FROM location_trainers WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders})
    ORDER BY is_boss DESC, trainer_class, trainer_name
  `).all(...locIds, ...gameGroup) as any[];

  // Resolve party_pokemon → species info + sprite URLs
  const speciesByName = db.prepare(`SELECT id, name, sprite_url FROM species WHERE LOWER(name) = LOWER(?)`);
  const speciesById = db.prepare(`SELECT id, name, sprite_url FROM species WHERE id = ?`);
  const trainers = rawTrainers.map(t => {
    let party: any[] = [];
    try {
      party = typeof t.party_pokemon === 'string' ? JSON.parse(t.party_pokemon) : (t.party_pokemon || []);
    } catch { /* empty */ }
    return {
      ...t,
      party_pokemon: party.map((p: any) => {
        // Look up by species_id (number) or species (string name)
        const species = p.species_id
          ? speciesById.get(p.species_id) as any
          : p.species ? speciesByName.get(p.species.toLowerCase()) as any : null;
        return {
          species: species?.name ?? p.species ?? null,
          level: p.level,
          species_id: species?.id ?? p.species_id ?? null,
          sprite_url: species?.sprite_url ?? null,
          moves: p.moves ?? [],
        };
      }),
    };
  });

  // Deduplicate trainers across games: group by name, merge best data from each
  const trainerMap = new Map<string, any>();
  for (const t of trainers) {
    const key = t.trainer_name;
    const existing = trainerMap.get(key);
    if (!existing) {
      trainerMap.set(key, t);
    } else {
      const existingHasMoves = existing.party_pokemon.some((p: any) => p.moves?.length > 0);
      const newHasMoves = t.party_pokemon.some((p: any) => p.moves?.length > 0);
      if ((!existingHasMoves && newHasMoves) || (existingHasMoves === newHasMoves && t.game === game)) {
        // Take the better entry but preserve flag data from whichever has it
        const merged = { ...t };
        if (merged.flag_index == null && existing.flag_index != null) {
          merged.flag_index = existing.flag_index;
          merged.flag_source = existing.flag_source;
        }
        trainerMap.set(key, merged);
      } else if (existing.flag_index == null && t.flag_index != null) {
        // Keep existing but grab flag data from this entry
        existing.flag_index = t.flag_index;
        existing.flag_source = t.flag_source;
      }
    }
  }
  const dedupedTrainers = Array.from(trainerMap.values());

  const tms = db.prepare(`
    SELECT * FROM location_tms WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders}) ORDER BY tm_number
  `).all(...locIds, ...gameGroup);

  const events = db.prepare(`
    SELECT le.*, s.name as species_name, s.sprite_url
    FROM location_events le
    LEFT JOIN species s ON s.id = le.species_id
    WHERE le.location_id IN (${locPlaceholders}) AND le.game IN (${gamePlaceholders})
    ORDER BY le.progression_order, le.event_name
  `).all(...locIds, ...gameGroup);

  const encounters = db.prepare(`
    SELECT me.*, s.name as species_name, s.sprite_url, s.type1, s.type2
    FROM map_encounters me
    JOIN species s ON s.id = me.species_id
    WHERE me.location_id IN (${locPlaceholders}) AND me.game IN (${gamePlaceholders})
    ORDER BY me.method, me.encounter_rate DESC
  `).all(...locIds, ...gameGroup);

  // Deduplicate items/tms/events across games, merging best data from each
  const dedupByKey = (arr: any[], keyFn: (a: any) => string) => {
    const map = new Map<string, any>();
    for (const item of arr) {
      const key = keyFn(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        // Merge: take the richest version of each field
        const merged = { ...existing };
        // Prefer non-null values from either entry
        for (const field of ['description', 'requirements', 'flag_index', 'flag_source', 'event_type', 'method']) {
          if (!merged[field] && item[field]) merged[field] = item[field];
        }
        map.set(key, merged);
      }
    }
    return Array.from(map.values());
  };
  const dedupedItems = dedupByKey(items, i => `${i.item_name}|${i.method}`);
  const dedupedTms = dedupByKey(tms, t => String(t.tm_number));
  const dedupedEvents = dedupByKey(events, e => e.event_name);

  // Filter out version-exclusive entries from other games
  // For R/B/Y: red and blue share base content, yellow has exclusives
  const isCompatible = (entryGame: string) => {
    if (!entryGame || entryGame === game) return true;
    // red/blue are compatible with each other
    if ((game === 'red' || game === 'blue') && (entryGame === 'red' || entryGame === 'blue')) return true;
    return false;
  };
  const filterExclusives = (arr: any[]) => arr.filter(a => isCompatible(a.game));

  const wikiData = db.prepare(
    'SELECT wiki_prose, wiki_callouts FROM location_wiki WHERE location_id = ? AND game = ?'
  ).get(locId, game) as { wiki_prose: string | null; wiki_callouts: string | null } | undefined;

  // Auto-link flag definitions to items missing flag_index
  const locationKey = loc?.location_key ?? '';
  const flagDefs = loadFlagDefinitions(game);
  const locFlagDefs = flagDefs.filter(f => f.location_key === locationKey);
  const finalItems = filterExclusives(dedupedItems);
  const finalTrainers = filterExclusives(dedupedTrainers);
  const finalTms = filterExclusives(dedupedTms);
  const finalEvents = filterExclusives(dedupedEvents);
  const usedIndices = new Set<number>();
  autoLinkFlags(finalTrainers, locFlagDefs, usedIndices);
  autoLinkFlags(finalItems, locFlagDefs, usedIndices);
  autoLinkFlags(finalTms, locFlagDefs, usedIndices);
  autoLinkFlags(finalEvents, locFlagDefs, usedIndices);

  res.json({
    items: finalItems,
    trainers: finalTrainers,
    tms: finalTms,
    events: finalEvents,
    encounters,
    wiki_prose: wikiData?.wiki_prose ?? null,
    wiki_callouts: wikiData?.wiki_callouts ? JSON.parse(wikiData.wiki_callouts) : [],
  });
});

// GET /api/guide/species-locations/:speciesId/:game — find all locations where a species appears
router.get('/species-locations/:speciesId/:game', (req, res) => {
  const speciesId = Number(req.params.speciesId);
  const { game } = req.params;

  const encounters = db.prepare(`
    SELECT me.location_id, ml.location_key, ml.display_name,
           me.method, me.level_min, me.level_max, me.encounter_rate, me.time_of_day
    FROM map_encounters me
    JOIN map_locations ml ON ml.id = me.location_id
    WHERE me.species_id = ? AND me.game = ?
    ORDER BY ml.progression_order, me.method
  `).all(speciesId, game);

  res.json(encounters);
});

// GET /api/guide/species-search?q=...&game=... — autocomplete species that appear in encounters for a game
router.get('/species-search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const game = String(req.query.game || '');
  if (q.length < 2) return res.json([]);

  const species = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.sprite_url, s.type1, s.type2
    FROM species s
    JOIN map_encounters me ON me.species_id = s.id AND me.game = ?
    WHERE s.name LIKE ?
    ORDER BY s.id
    LIMIT 10
  `).all(game, `%${q}%`);

  res.json(species);
});

export default router;
