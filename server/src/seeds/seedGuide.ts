import db from '../db.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';
import { seedOriginRequirements } from './seedOriginRequirements.js';
import { seedCollectionLegs, seedSpecimenTargets, seedSpecimenTasks, generateAllWalkthroughs } from './seedCollectionPlanner.js';
import { seedRegionData } from './seedRegionData.js';

function loadJson(filename: string) {
  return JSON.parse(readFileSync(join(paths.seedDataDir, filename), 'utf-8'));
}

export function seedGameMaps(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM game_maps').get() as { count: number };
  if (existing.count > 0) {
    console.log(`game_maps already seeded (${existing.count} maps). Skipping.`);
    return;
  }

  console.log('Seeding game maps and locations...');

  const insertMap = db.prepare(`
    INSERT INTO game_maps (map_key, display_name, image_path, width, height, games)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertLocation = db.prepare(`
    INSERT INTO map_locations (map_id, location_key, display_name, x, y, location_type, progression_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Load and seed each map region
  const mapFiles = ['kanto-locations.json', 'johto-locations.json'];

  const insertAll = db.transaction(() => {
    for (const file of mapFiles) {
      const data = loadJson(file);
      const mapResult = insertMap.run(
        data.map.map_key,
        data.map.display_name,
        data.map.image_path,
        data.map.width,
        data.map.height,
        JSON.stringify(data.map.games)
      );
      const mapId = mapResult.lastInsertRowid;

      for (const loc of data.locations) {
        insertLocation.run(mapId, loc.key, loc.name, loc.x, loc.y, loc.type, loc.order);
      }
      console.log(`  Seeded ${data.map.display_name} map with ${data.locations.length} locations.`);
    }
  });
  insertAll();
}

export function seedGuide(): void {
  seedGameMaps();
  seedRegionData();
  seedOriginRequirements();
  seedCollectionLegs();
  seedSpecimenTargets();
  seedSpecimenTasks();
  generateAllWalkthroughs();
}
