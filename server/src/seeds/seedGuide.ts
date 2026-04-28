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
  console.log('Seeding game maps and locations...');

  // Upsert game_maps by map_key (UNIQUE). Preserves id across boots.
  const upsertMap = db.prepare(`
    INSERT INTO game_maps (map_key, display_name, image_path, width, height, games)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(map_key) DO UPDATE SET
      display_name = excluded.display_name,
      image_path = excluded.image_path,
      width = excluded.width,
      height = excluded.height,
      games = excluded.games
  `);
  const getMapId = db.prepare('SELECT id FROM game_maps WHERE map_key = ?');

  // Upsert locations. COALESCE on x/y preserves user-moved pin positions
  // when the JSON hasn't been re-persisted (UI edits call persistLocationToSeed,
  // so the JSON mirrors user state — but COALESCE keeps DB wins as a safety net
  // against accidental JSON resets).
  const upsertLocation = db.prepare(`
    INSERT INTO map_locations (map_id, location_key, display_name, x, y, location_type, progression_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(map_id, location_key) DO UPDATE SET
      display_name = excluded.display_name,
      x = excluded.x,
      y = excluded.y,
      location_type = excluded.location_type,
      progression_order = excluded.progression_order
  `);

  const mapFiles = ['kanto-locations.json', 'johto-locations.json'];

  const runAll = db.transaction(() => {
    for (const file of mapFiles) {
      const data = loadJson(file);
      upsertMap.run(
        data.map.map_key,
        data.map.display_name,
        data.map.image_path,
        data.map.width,
        data.map.height,
        JSON.stringify(data.map.games)
      );
      const row = getMapId.get(data.map.map_key) as { id: number };
      const mapId = row.id;

      for (const loc of data.locations) {
        upsertLocation.run(mapId, loc.key, loc.name, loc.x, loc.y, loc.type, loc.order);
      }
      console.log(`  Upserted ${data.map.display_name} map with ${data.locations.length} locations.`);
    }
  });
  runAll();
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
