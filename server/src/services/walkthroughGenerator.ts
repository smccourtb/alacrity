import db from '../db.js';

// Maps task_type to action_tag
function taskTypeToActionTag(taskType: string): string | null {
  switch (taskType) {
    case 'catch':
    case 'breed':
      return 'CATCH-NOW';
    case 'nature_grind':
      return 'SAVE-BEFORE';
    case 'transfer':
      return 'DO-NOT-TRANSFER-YET';
    default:
      return null;
  }
}

// Maps target_type to specimen_role
function targetTypeToSpecimenRole(targetType: string): string | null {
  switch (targetType) {
    case 'origin':
      return 'origin-trophy';
    case 'tm_move':
      return 'tm-specimen';
    default:
      return null;
  }
}

export function generateWalkthroughSteps(game: string): void {
  // 1. Delete any existing generated steps (those with specimen_task_id set) for this game
  const deleted = db.prepare(`
    DELETE FROM walkthrough_steps
    WHERE game = ? AND specimen_task_id IS NOT NULL
  `).run(game);

  if (deleted.changes > 0) {
    console.log(`  Cleared ${deleted.changes} previously generated steps for ${game}.`);
  }

  // 2. Query specimen_tasks for this game with a location_key, joined with specimen_targets
  const tasks = db.prepare(`
    SELECT
      st.id AS task_id,
      st.location_key,
      st.task_type,
      st.description,
      tgt.species_id,
      tgt.target_type
    FROM specimen_tasks st
    JOIN specimen_targets tgt ON tgt.id = st.target_id
    WHERE st.game = ? AND st.location_key IS NOT NULL
  `).all(game) as Array<{
    task_id: number;
    location_key: string;
    task_type: string;
    description: string;
    species_id: number;
    target_type: string;
  }>;

  if (tasks.length === 0) {
    console.log(`  No specimen tasks with location_key found for ${game}. Skipping generation.`);
    return;
  }

  // 3. Build location_key → location_id map (for maps that include this game)
  const locations = db.prepare(`
    SELECT ml.id, ml.location_key FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE gm.games LIKE ?
  `).all(`%"${game}"%`) as { id: number; location_key: string }[];
  const locMap = new Map(locations.map(l => [l.location_key, l.id]));

  // 4. Get max step_order per location_id for this game to avoid UNIQUE constraint conflicts
  const maxOrders = db.prepare(`
    SELECT location_id, MAX(step_order) AS max_order
    FROM walkthrough_steps
    WHERE game = ?
    GROUP BY location_id
  `).all(game) as { location_id: number; max_order: number }[];
  const maxOrderMap = new Map(maxOrders.map(r => [r.location_id, r.max_order]));

  const insert = db.prepare(`
    INSERT OR IGNORE INTO walkthrough_steps
      (game, location_id, step_order, action_tag, description, species_id, specimen_role,
       is_version_exclusive, exclusive_to, auto_trackable, notes, specimen_task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 1, NULL, ?)
  `);

  let inserted = 0;

  const insertAll = db.transaction(() => {
    // Track next step_order per location within this generation run
    const nextOrder = new Map<number, number>();

    for (const task of tasks) {
      const locationId = locMap.get(task.location_key);
      if (!locationId) {
        console.warn(`  Unknown location_key "${task.location_key}" for game ${game}, skipping task ${task.task_id}`);
        continue;
      }

      // Determine starting step_order for this location (after existing steps)
      if (!nextOrder.has(locationId)) {
        const existingMax = maxOrderMap.get(locationId) ?? 0;
        nextOrder.set(locationId, existingMax + 1);
      }

      const stepOrder = nextOrder.get(locationId)!;
      nextOrder.set(locationId, stepOrder + 1);

      const actionTag = taskTypeToActionTag(task.task_type);
      const specimenRole = targetTypeToSpecimenRole(task.target_type);

      const result = insert.run(
        game,
        locationId,
        stepOrder,
        actionTag,
        task.description,
        task.species_id,
        specimenRole,
        task.task_id
      );

      if (result.changes > 0) inserted++;
    }
  });

  insertAll();

  console.log(`  Generated ${inserted} walkthrough steps for ${game}.`);
}
