import db from '../db.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';

function buildLocationMap(mapKey: string): Map<string, number> {
  const rows = db.prepare(`
    SELECT ml.id, ml.location_key FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE gm.map_key = ?
  `).all(mapKey) as { id: number; location_key: string }[];
  return new Map(rows.map(r => [r.location_key, r.id]));
}

interface RegionFile {
  region: string;
  generation: number;
  games: string[];
  milestones: Array<{
    location_key: string;
    step_order: number;
    action_tag: string | null;
    description: string;
    notes: string | null;
  }>;
  locations: Record<string, {
    trainers?: Array<{
      games?: string[];
      trainer_class: string;
      trainer_name: string;
      flag_index?: number | null;
      flag_source?: string | null;
      is_boss?: boolean;
      is_rematchable?: boolean;
      party_pokemon?: any[];
      party?: any[];
      x?: number | null;
      y?: number | null;
    }>;
    encounters?: Array<{
      games?: string[];
      species_id: number;
      method: string;
      level_min: number;
      level_max: number;
      encounter_rate?: number | null;
      time_of_day?: string | null;
      notes?: string | null;
    }>;
    items?: Array<{
      games?: string[];
      item_name: string;
      method?: string | null;
      description?: string | null;
      flag_index?: number | null;
      flag_source?: string | null;
      requirements?: string | null;
      x?: number | null;
      y?: number | null;
    }>;
    tms?: Array<{
      games?: string[];
      tm_number: number;
      move_name: string;
      method: string;
      flag_index?: number | null;
      flag_source?: string | null;
      price?: number | null;
      requirements?: string | null;
      x?: number | null;
      y?: number | null;
    }>;
    events?: Array<{
      games?: string[];
      event_name: string;
      event_type: string;
      description?: string | null;
      flag_index?: number | null;
      flag_source?: string | null;
      progression_order?: number | null;
      species_id?: number | null;
      requirements?: string | null;
      x?: number | null;
      y?: number | null;
    }>;
  }>;
}

function discoverRegionFiles(): string[] {
  const pattern = /^.+-gen\d+\.json$/;
  return readdirSync(paths.seedDataDir).filter(f => pattern.test(f)).sort();
}

function isAlreadySeeded(games: string[]): boolean {
  if (games.length === 0) return false;
  const firstGame = games[0];
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM location_events WHERE game = ?'
  ).get(firstGame) as { count: number };
  return row.count > 0;
}

function seedMilestonesForRegion(
  milestones: RegionFile['milestones'],
  games: string[],
  locMap: Map<string, number>
): void {
  const insert = db.prepare(`
    INSERT INTO walkthrough_steps (game, location_id, step_order, action_tag, description, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(game, location_id, step_order) DO UPDATE SET
      action_tag = excluded.action_tag,
      description = excluded.description,
      notes = excluded.notes
  `);

  let count = 0;
  for (const game of games) {
    for (const milestone of milestones) {
      const locationId = locMap.get(milestone.location_key);
      if (!locationId) {
        console.warn(`  [milestones] Unknown location: ${milestone.location_key}`);
        continue;
      }
      insert.run(
        game,
        locationId,
        milestone.step_order,
        milestone.action_tag ?? null,
        milestone.description,
        milestone.notes ?? null
      );
      count++;
    }
  }
  console.log(`  Seeded ${count} walkthrough steps (${games.length} games × ${milestones.length} milestones)`);
}

function seedLocationsData(
  locations: RegionFile['locations'],
  locMap: Map<string, number>,
  regionGames: string[]
): { trainers: number; encounters: number; items: number; tms: number; events: number } {
  const counts = { trainers: 0, encounters: 0, items: 0, tms: 0, events: 0 };

  const insertTrainer = db.prepare(`
    INSERT INTO location_trainers (location_id, game, trainer_class, trainer_name, is_rematchable, is_boss, party_pokemon, x, y, flag_index, flag_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, game, trainer_class, trainer_name) DO UPDATE SET
      is_rematchable = excluded.is_rematchable,
      is_boss = excluded.is_boss,
      party_pokemon = excluded.party_pokemon,
      x = COALESCE(excluded.x, location_trainers.x),
      y = COALESCE(excluded.y, location_trainers.y),
      flag_index = COALESCE(excluded.flag_index, location_trainers.flag_index),
      flag_source = COALESCE(excluded.flag_source, location_trainers.flag_source)
  `);

  const checkEncounter = db.prepare(`
    SELECT 1 FROM map_encounters
    WHERE location_id = ? AND game = ? AND species_id = ? AND method = ?
      AND level_min IS ? AND level_max IS ? AND encounter_rate IS ?
  `);
  const insertEncounter = db.prepare(`
    INSERT INTO map_encounters
      (location_id, game, species_id, method, level_min, level_max, encounter_rate, time_of_day, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO location_items (location_id, game, item_name, method, description, requirements, x, y, flag_index, flag_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, game, item_name, method) DO UPDATE SET
      description = excluded.description,
      requirements = excluded.requirements,
      x = COALESCE(excluded.x, location_items.x),
      y = COALESCE(excluded.y, location_items.y),
      flag_index = COALESCE(excluded.flag_index, location_items.flag_index),
      flag_source = COALESCE(excluded.flag_source, location_items.flag_source)
  `);

  const insertTm = db.prepare(`
    INSERT INTO location_tms (location_id, game, tm_number, move_name, method, price, requirements, x, y, flag_index, flag_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, game, tm_number) DO UPDATE SET
      move_name = excluded.move_name,
      method = excluded.method,
      price = excluded.price,
      requirements = excluded.requirements,
      x = COALESCE(excluded.x, location_tms.x),
      y = COALESCE(excluded.y, location_tms.y),
      flag_index = COALESCE(excluded.flag_index, location_tms.flag_index),
      flag_source = COALESCE(excluded.flag_source, location_tms.flag_source)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO location_events (location_id, game, event_name, event_type, description, progression_order, species_id, requirements, x, y, flag_index, flag_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, game, event_name) DO UPDATE SET
      event_type = excluded.event_type,
      description = excluded.description,
      progression_order = excluded.progression_order,
      species_id = excluded.species_id,
      requirements = excluded.requirements,
      x = COALESCE(excluded.x, location_events.x),
      y = COALESCE(excluded.y, location_events.y),
      flag_index = COALESCE(excluded.flag_index, location_events.flag_index),
      flag_source = COALESCE(excluded.flag_source, location_events.flag_source)
  `);

  for (const [locationKey, locationData] of Object.entries(locations)) {
    const locationId = locMap.get(locationKey);
    if (!locationId) {
      console.warn(`  [locations] Unknown location key: ${locationKey}`);
      continue;
    }

    // Trainers — expand per-game
    for (const trainer of locationData.trainers ?? []) {
      for (const game of trainer.games ?? regionGames) {
        insertTrainer.run(
          locationId, game, trainer.trainer_class, trainer.trainer_name,
          trainer.is_rematchable ? 1 : 0,
          trainer.is_boss ? 1 : 0,
          JSON.stringify(trainer.party_pokemon ?? trainer.party ?? []),
          trainer.x ?? null, trainer.y ?? null,
          trainer.flag_index ?? null, trainer.flag_source ?? null
        );
        counts.trainers++;
      }
    }

    // Encounters — expand per-game
    for (const enc of locationData.encounters ?? []) {
      for (const game of enc.games ?? regionGames) {
        const exists = checkEncounter.get(
          locationId, game, enc.species_id, enc.method,
          enc.level_min, enc.level_max, enc.encounter_rate ?? null
        );
        if (!exists) {
          insertEncounter.run(
            locationId, game, enc.species_id, enc.method,
            enc.level_min, enc.level_max,
            enc.encounter_rate ?? null,
            enc.time_of_day ?? null,
            enc.notes ?? null
          );
          counts.encounters++;
        }
      }
    }

    // Items — expand per-game
    for (const item of locationData.items ?? []) {
      for (const game of item.games ?? regionGames) {
        insertItem.run(
          locationId, game, item.item_name, item.method ?? 'field',
          item.description ?? null, item.requirements ?? null,
          item.x ?? null, item.y ?? null,
          item.flag_index ?? null, item.flag_source ?? null
        );
        counts.items++;
      }
    }

    // TMs — expand per-game
    for (const tm of locationData.tms ?? []) {
      for (const game of tm.games ?? regionGames) {
        insertTm.run(
          locationId, game, tm.tm_number, tm.move_name, tm.method,
          tm.price ?? null, tm.requirements ?? null,
          tm.x ?? null, tm.y ?? null,
          tm.flag_index ?? null, tm.flag_source ?? null
        );
        counts.tms++;
      }
    }

    // Events — expand per-game
    for (const evt of locationData.events ?? []) {
      for (const game of evt.games ?? regionGames) {
        insertEvent.run(
          locationId, game, evt.event_name, evt.event_type,
          evt.description ?? null, evt.progression_order ?? null,
          evt.species_id ?? null, evt.requirements ?? null,
          evt.x ?? null, evt.y ?? null,
          evt.flag_index ?? null, evt.flag_source ?? null
        );
        counts.events++;
      }
    }
  }

  return counts;
}

export function seedRegionData(): void {
  // Ensure sub_marker_zoom_threshold column exists (idempotent migration)
  try {
    db.exec(`ALTER TABLE game_maps ADD COLUMN sub_marker_zoom_threshold REAL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Ensure marker_positions table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS marker_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      map_key TEXT NOT NULL,
      marker_type TEXT NOT NULL CHECK(marker_type IN ('item', 'hidden_item', 'trainer', 'tm', 'event')),
      reference_id INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      game_override TEXT,
      UNIQUE(map_key, marker_type, reference_id, game_override)
    )
  `);

  const regionFiles = discoverRegionFiles();
  if (regionFiles.length === 0) {
    console.log('No region data files found (expected *-gen*.json in seeds/data/). Skipping.');
    return;
  }

  console.log(`Found ${regionFiles.length} region file(s): ${regionFiles.join(', ')}`);

  for (const filename of regionFiles) {
    const filePath = join(paths.seedDataDir, filename);
    const regionData: RegionFile = JSON.parse(readFileSync(filePath, 'utf-8'));
    const { region, generation, games, milestones, locations } = regionData;

    console.log(`\nProcessing ${filename} (${region} gen${generation}, games: ${games.join(', ')})`);

    // Guard against re-seeding: check location_events count for first game in this region
    if (isAlreadySeeded(games)) {
      console.log(`  location_events already seeded for ${games[0]}. Skipping ${filename}.`);
      continue;
    }

    const locMap = buildLocationMap(region);
    if (locMap.size === 0) {
      console.log(`  No locations found for region '${region}'. Seed game maps first.`);
      continue;
    }

    const transaction = db.transaction(() => {
      // Seed milestones into walkthrough_steps
      if (milestones && milestones.length > 0) {
        seedMilestonesForRegion(milestones, games, locMap);
      }

      // Seed all location detail data (trainers, encounters, items, tms, events)
      const counts = seedLocationsData(locations, locMap, games);
      console.log(
        `  Seeded: ${counts.trainers} trainers, ${counts.encounters} encounters, ` +
        `${counts.items} items, ${counts.tms} TMs, ${counts.events} events`
      );
    });

    transaction();
    console.log(`  Done with ${filename}.`);
  }

  console.log('\nRegion data seeding complete.');
}
