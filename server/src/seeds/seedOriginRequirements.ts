import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';

interface OriginRequirementSeed {
  species_id: number | null;
  requirement_type: string;
  source_games: string[];
  description: string;
  move_name?: string;
  item_name?: string;
  priority: string;
}

export function seedOriginRequirements() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM origin_requirements').get() as any).c;
  if (count > 0) {
    console.log(`  origin_requirements already seeded (${count} rows)`);
    return;
  }

  const filePath = join(paths.seedDataDir, 'meta', 'origin-requirements.json');
  if (!existsSync(filePath)) {
    console.log('  origin-requirements.json not found, skipping');
    return;
  }

  const data: OriginRequirementSeed[] = JSON.parse(readFileSync(filePath, 'utf-8'));

  const insert = db.prepare(
    `INSERT INTO origin_requirements (species_id, requirement_type, source_games, description, move_name, item_name, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertAll = db.transaction((reqs: OriginRequirementSeed[]) => {
    for (const req of reqs) {
      insert.run(
        req.species_id ?? null,
        req.requirement_type,
        JSON.stringify(req.source_games),
        req.description,
        req.move_name ?? null,
        req.item_name ?? null,
        req.priority,
      );
    }
  });

  insertAll(data);
  console.log(`  Seeded ${data.length} origin requirements`);
}
