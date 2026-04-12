import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { generateWalkthroughSteps } from '../services/walkthroughGenerator.js';

function loadJson(filename: string) {
  return JSON.parse(readFileSync(join(paths.seedDataDir, filename), 'utf-8'));
}

export function seedCollectionLegs(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM collection_legs').get() as { count: number };
  if (existing.count > 0) {
    console.log(`  collection_legs already seeded (${existing.count} rows). Skipping.`);
    return;
  }

  const data = loadJson('meta/collection-legs.json');

  const insert = db.prepare(`
    INSERT INTO collection_legs (key, label, origin_mark, games, leg_order, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const leg of data) {
      insert.run(
        leg.key,
        leg.label,
        leg.origin_mark ?? null,
        JSON.stringify(leg.games),
        leg.leg_order,
        leg.status
      );
    }
  });
  insertAll();

  console.log(`  Seeded ${data.length} collection legs.`);
}

export function seedSpecimenTargets(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM specimen_targets').get() as { count: number };
  if (existing.count > 0) {
    console.log(`  specimen_targets already seeded (${existing.count} rows). Skipping.`);
    return;
  }

  const speciesCount = (db.prepare('SELECT COUNT(*) as count FROM species').get() as { count: number }).count;
  if (speciesCount === 0) {
    console.log('  species table empty — skipping specimen_targets (run seed.ts first)');
    return;
  }

  const data = loadJson('meta/specimen-targets-gameboy.json');

  const insertTarget = db.prepare(`
    INSERT INTO specimen_targets (species_id, leg_key, source_game, category, target_type, constraints, description, priority, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProgress = db.prepare(`
    INSERT INTO specimen_progress (target_id, status)
    VALUES (?, 'pending')
  `);

  const insertAll = db.transaction(() => {
    for (const t of data) {
      const result = insertTarget.run(
        t.species_id,
        t.leg_key ?? 'gameboy',
        t.source_game ?? null,
        t.category ?? 'mandatory',
        t.target_type,
        JSON.stringify(t.constraints ?? {}),
        t.description,
        t.priority ?? 0,
        t.notes ?? null
      );
      insertProgress.run(result.lastInsertRowid);
    }
  });
  insertAll();

  console.log(`  Seeded ${data.length} specimen targets with progress rows.`);
}

export function seedSpecimenTasks(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM specimen_tasks').get() as { count: number };
  if (existing.count > 0) {
    console.log(`  specimen_tasks already seeded (${existing.count} rows). Skipping.`);
    return;
  }

  const targetCount = (db.prepare('SELECT COUNT(*) as count FROM specimen_targets').get() as { count: number }).count;
  if (targetCount === 0) {
    console.log('  specimen_targets empty — skipping specimen_tasks');
    return;
  }

  const data = loadJson('meta/specimen-tasks-gameboy.json');

  const lookupTarget = db.prepare(`
    SELECT id FROM specimen_targets
    WHERE species_id = ? AND target_type = ? AND source_game = ?
  `);

  const insertTask = db.prepare(`
    INSERT INTO specimen_tasks (target_id, game, location_key, task_type, description, task_order, required)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let totalTasks = 0;

  const insertAll = db.transaction(() => {
    for (const entry of data) {
      const ref = entry.target_ref;
      const target = lookupTarget.get(ref.species_id, ref.target_type, ref.source_game) as { id: number } | undefined;
      if (!target) {
        console.warn(`  Warning: no target found for species_id=${ref.species_id} target_type=${ref.target_type} source_game=${ref.source_game}, skipping tasks`);
        continue;
      }
      for (const task of entry.tasks) {
        insertTask.run(
          target.id,
          task.game,
          task.location_key ?? null,
          task.task_type,
          task.description,
          task.task_order,
          task.required
        );
        totalTasks++;
      }
    }
  });
  insertAll();

  console.log(`  Seeded ${totalTasks} specimen tasks across ${data.length} targets.`);
}

export function generateAllWalkthroughs(): void {
  console.log('Generating walkthrough steps from specimen tasks...');
  for (const game of ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal']) {
    generateWalkthroughSteps(game);
  }
}
