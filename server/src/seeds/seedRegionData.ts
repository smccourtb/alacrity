import db from '../db.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';
import { resolveKey } from '../services/clusterIdentity.js';

let splitsSeeded = false;

function buildLocationMap(mapKey: string): Map<string, number> {
  const rows = db.prepare(`
    SELECT ml.id, ml.location_key FROM map_locations ml
    JOIN game_maps gm ON gm.id = ml.map_id
    WHERE gm.map_key = ?
  `).all(mapKey) as { id: number; location_key: string }[];
  return new Map(rows.map(r => [r.location_key, r.id]));
}

interface CustomMarkerSeedEntry {
  natural_id: string;
  label: string;
  marker_type: string;
  description?: string | null;
  x: number;
  y: number;
  sprite_kind?: string | null;
  sprite_ref?: string | null;
  paired_id?: string | null;
}

interface RegionFile {
  region: string;
  generation: number;
  games: string[];
  custom_markers?: CustomMarkerSeedEntry[];
  clusters?: Array<{
    kind: 'proximity' | 'location_aggregate';
    primary: string;
    location?: string;
    x?: number; y?: number;
    hide_members?: boolean;
    members?: string[];
  }>;
  cluster_splits?: string[];
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
      sprite_kind?: string;
      sprite_ref?: string;
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
      sprite_kind?: string;
      sprite_ref?: string;
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
      sprite_kind?: string;
      sprite_ref?: string;
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
      sprite_kind?: string;
      sprite_ref?: string;
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
): { trainers: number; encounters: number; items: number; tms: number; events: number; pruned: number } {
  const counts = { trainers: 0, encounters: 0, items: 0, tms: 0, events: 0, pruned: 0 };

  // Collect expected unique-keys per table so we can prune rows that no longer
  // appear in the seed JSON (e.g. a trainer reassigned to a different location).
  const expectedTrainers = new Set<string>();  // `${locId}|${game}|${class}|${name}`
  const expectedItems = new Set<string>();     // `${locId}|${game}|${item}|${method}`
  const expectedTms = new Set<string>();       // `${locId}|${game}|${tmNumber}`
  const expectedEvents = new Set<string>();    // `${locId}|${game}|${event_name}`

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

  // Natural-key lookups to resolve row ids after UPSERT (lastInsertRowid is
  // unreliable on ON CONFLICT UPDATE paths).
  const selectTrainerId = db.prepare(`
    SELECT id FROM location_trainers WHERE location_id = ? AND game = ? AND trainer_class = ? AND trainer_name = ?
  `);
  const selectItemId = db.prepare(`
    SELECT id FROM location_items WHERE location_id = ? AND game = ? AND item_name = ? AND method = ?
  `);
  const selectTmId = db.prepare(`
    SELECT id FROM location_tms WHERE location_id = ? AND game = ? AND tm_number = ?
  `);
  const selectEventId = db.prepare(`
    SELECT id FROM location_events WHERE location_id = ? AND game = ? AND event_name = ?
  `);

  const upsertOverride = db.prepare(`
    INSERT INTO sub_marker_overrides (sub_marker_type, reference_id, sprite_kind, sprite_ref)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(sub_marker_type, reference_id) DO UPDATE SET
      sprite_kind = excluded.sprite_kind,
      sprite_ref = excluded.sprite_ref
  `);

  const applyOverride = (
    lookup: (...args: any[]) => { id: number } | undefined,
    type: 'trainer' | 'item' | 'hidden_item' | 'tm' | 'event',
    entry: { sprite_kind?: string; sprite_ref?: string },
    ...keyArgs: any[]
  ): void => {
    if (!entry.sprite_kind || !entry.sprite_ref) return;
    const row = lookup(...keyArgs);
    if (!row) return;
    upsertOverride.run(type, row.id, entry.sprite_kind, entry.sprite_ref);
  };

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
        expectedTrainers.add(`${locationId}|${game}|${trainer.trainer_class}|${trainer.trainer_name}`);
        applyOverride(
          (...a) => selectTrainerId.get(...a) as { id: number } | undefined,
          'trainer', trainer,
          locationId, game, trainer.trainer_class, trainer.trainer_name
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
        const itemMethod = item.method ?? 'field';
        insertItem.run(
          locationId, game, item.item_name, itemMethod,
          item.description ?? null, item.requirements ?? null,
          item.x ?? null, item.y ?? null,
          item.flag_index ?? null, item.flag_source ?? null
        );
        expectedItems.add(`${locationId}|${game}|${item.item_name}|${itemMethod}`);
        applyOverride(
          (...a) => selectItemId.get(...a) as { id: number } | undefined,
          itemMethod === 'hidden' ? 'hidden_item' : 'item', item,
          locationId, game, item.item_name, itemMethod
        );
        counts.items++;
      }
    }

    // TMs — expand per-game
    for (const tm of locationData.tms ?? []) {
      if (tm.tm_number == null) continue; // skip malformed entries
      for (const game of tm.games ?? regionGames) {
        insertTm.run(
          locationId, game, tm.tm_number, tm.move_name, tm.method,
          tm.price ?? null, tm.requirements ?? null,
          tm.x ?? null, tm.y ?? null,
          tm.flag_index ?? null, tm.flag_source ?? null
        );
        expectedTms.add(`${locationId}|${game}|${tm.tm_number}`);
        applyOverride(
          (...a) => selectTmId.get(...a) as { id: number } | undefined,
          'tm', tm,
          locationId, game, tm.tm_number
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
        expectedEvents.add(`${locationId}|${game}|${evt.event_name}`);
        applyOverride(
          (...a) => selectEventId.get(...a) as { id: number } | undefined,
          'event', evt,
          locationId, game, evt.event_name
        );
        counts.events++;
      }
    }

    // Shops — one row per shop; inventory wiped+refilled each run.
    const insertShop = db.prepare(`
      INSERT INTO location_shops (location_id, shop_name, x, y)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(location_id, shop_name) DO UPDATE SET
        x = COALESCE(excluded.x, location_shops.x),
        y = COALESCE(excluded.y, location_shops.y)
      RETURNING id
    `);
    const clearShopInv = db.prepare('DELETE FROM location_shop_inventory WHERE shop_id = ?');
    const insertShopInv = db.prepare(`
      INSERT INTO location_shop_inventory (shop_id, item_name, price, badge_gate, games)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const shop of (locationData as any).shops ?? []) {
      const row = insertShop.get(locationId, shop.shop_name, shop.x ?? null, shop.y ?? null) as { id: number } | undefined;
      if (!row) continue;
      clearShopInv.run(row.id);
      for (const inv of shop.inventory ?? []) {
        insertShopInv.run(
          row.id,
          inv.item_name,
          inv.price ?? null,
          inv.badge_gate ?? 0,
          inv.games ? JSON.stringify(inv.games) : null,
        );
      }
    }
  }

  // Prune orphans: rows in this region's locations for this region's games whose
  // unique-key is not in the expected set (i.e. the seed JSON no longer has them).
  // This is what lets a trainer/item/event *move* between locations cleanly —
  // upserts alone leave the old row behind when location_id changes.
  const locationIds = Array.from(locMap.values());
  if (locationIds.length > 0 && regionGames.length > 0) {
    const locPlaceholders = locationIds.map(() => '?').join(',');
    const gamePlaceholders = regionGames.map(() => '?').join(',');

    const pruneTable = (
      table: string,
      keyCols: string[],
      expected: Set<string>,
    ): number => {
      const rows = db.prepare(
        `SELECT id, ${keyCols.join(', ')} FROM ${table}
         WHERE location_id IN (${locPlaceholders}) AND game IN (${gamePlaceholders})`
      ).all(...locationIds, ...regionGames) as any[];
      const del = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      let n = 0;
      for (const r of rows) {
        const key = keyCols.map(c => r[c]).join('|');
        if (!expected.has(key)) { del.run(r.id); n++; }
      }
      return n;
    };

    counts.pruned += pruneTable('location_trainers',
      ['location_id', 'game', 'trainer_class', 'trainer_name'], expectedTrainers);
    counts.pruned += pruneTable('location_items',
      ['location_id', 'game', 'item_name', 'method'], expectedItems);
    counts.pruned += pruneTable('location_tms',
      ['location_id', 'game', 'tm_number'], expectedTms);
    counts.pruned += pruneTable('location_events',
      ['location_id', 'game', 'event_name'], expectedEvents);
  }

  return counts;
}

function seedCustomMarkers(
  mapKey: string,
  customMarkers: CustomMarkerSeedEntry[]
): number {
  const mapRow = db.prepare('SELECT id FROM game_maps WHERE map_key = ?').get(mapKey) as { id: number } | undefined;
  if (!mapRow) {
    console.warn(`  [custom_markers] Unknown map_key: ${mapKey}`);
    return 0;
  }
  const mapId = mapRow.id;

  const upsert = db.prepare(`
    INSERT INTO custom_markers (natural_id, map_id, label, marker_type, description, x, y, icon, sprite_kind)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(natural_id) DO UPDATE SET
      label = excluded.label,
      marker_type = excluded.marker_type,
      description = excluded.description,
      x = excluded.x,
      y = excluded.y,
      icon = excluded.icon,
      sprite_kind = excluded.sprite_kind
  `);

  for (const m of customMarkers) {
    upsert.run(
      m.natural_id,
      mapId,
      m.label,
      m.marker_type,
      m.description ?? null,
      m.x,
      m.y,
      m.sprite_ref ?? null,
      m.sprite_kind ?? null
    );
  }

  // Resolve paired_id → paired_marker_id in a second pass so forward-references work.
  const byNat = db.prepare('SELECT id, natural_id FROM custom_markers WHERE map_id = ?').all(mapId) as { id: number; natural_id: string }[];
  const natToId = new Map(byNat.map(r => [r.natural_id, r.id]));
  const setPair = db.prepare('UPDATE custom_markers SET paired_marker_id = ? WHERE natural_id = ?');
  for (const m of customMarkers) {
    const partnerId = m.paired_id ? natToId.get(m.paired_id) : null;
    setPair.run(partnerId ?? null, m.natural_id);
  }

  return customMarkers.length;
}

function seedClusters(mapKey: string, entries: NonNullable<RegionFile['clusters']>): number {
  const mapRow = db.prepare('SELECT id FROM game_maps WHERE map_key = ?').get(mapKey) as { id: number } | undefined;
  if (!mapRow) return 0;
  // Wipe previous clusters for this map before reseeding — identity-key idempotency doesn't fit cleanly here.
  db.prepare('DELETE FROM marker_clusters WHERE map_key = ?').run(mapKey);

  let n = 0;
  for (const e of entries) {
    const primary = resolveKey(e.primary);
    if (!primary) { console.warn(`  [clusters] primary not resolvable: ${e.primary}`); continue; }
    let scopeLocationId: number | null = null;
    if (e.kind === 'location_aggregate' && e.location) {
      const loc = db.prepare(`
        SELECT ml.id FROM map_locations ml
        JOIN game_maps gm ON gm.id = ml.map_id
        WHERE gm.map_key = ? AND ml.location_key = ?
      `).get(mapKey, e.location) as { id: number } | undefined;
      scopeLocationId = loc?.id ?? null;
    }
    const result = db.prepare(`
      INSERT INTO marker_clusters
        (map_key, kind, scope_location_id, x, y, primary_marker_type, primary_reference_id, hide_members)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mapKey, e.kind, scopeLocationId,
      e.kind === 'location_aggregate' ? (e.x ?? null) : null,
      e.kind === 'location_aggregate' ? (e.y ?? null) : null,
      primary.marker_type, primary.reference_id,
      e.hide_members ? 1 : 0,
    );
    const cid = Number(result.lastInsertRowid);
    const ins = db.prepare(`INSERT OR IGNORE INTO marker_cluster_members (cluster_id, marker_type, reference_id) VALUES (?, ?, ?)`);
    ins.run(cid, primary.marker_type, primary.reference_id);
    if (e.kind === 'proximity' && Array.isArray(e.members)) {
      for (const mk of e.members) {
        const r = resolveKey(mk);
        if (!r) { console.warn(`  [clusters] member not resolvable, dropping: ${mk}`); continue; }
        ins.run(cid, r.marker_type, r.reference_id);
      }
    }
    n++;
  }
  return n;
}

function seedClusterSplits(keys: string[]): number {
  // Wipe + re-insert keeps this idempotent across reseeds.
  db.prepare('DELETE FROM marker_cluster_splits').run();
  let n = 0;
  const ins = db.prepare(`INSERT OR IGNORE INTO marker_cluster_splits (marker_type, reference_id) VALUES (?, ?)`);
  for (const k of keys) {
    const r = resolveKey(k);
    if (!r) { console.warn(`  [cluster_splits] not resolvable, dropping: ${k}`); continue; }
    ins.run(r.marker_type, r.reference_id);
    n++;
  }
  return n;
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

    // Custom markers are keyed by natural_id and upsert-safe, so they always
    // (re-)apply, even when the rest of the region is already seeded. This is
    // how user-created markers persisted to seed JSON survive DB wipes.
    if (Array.isArray(regionData.custom_markers) && regionData.custom_markers.length > 0) {
      const n = db.transaction(() => seedCustomMarkers(region, regionData.custom_markers!))();
      console.log(`  Seeded ${n} custom markers`);
    }

    // Clusters are deferred until AFTER seedLocationsData has populated
    // trainers/items/events for this region — otherwise resolveKey runs
    // against an empty table and emits "primary not resolvable" warnings.
    // (See deferred call further below in this same loop.)

    if (!splitsSeeded && Array.isArray(regionData.cluster_splits) && regionData.cluster_splits.length > 0) {
      splitsSeeded = true;
      const n = db.transaction(() => seedClusterSplits(regionData.cluster_splits!))();
      console.log(`  Seeded ${n} cluster splits`);
    }

    // Shops live outside the re-seed guard because they were added after the
    // initial seed of older dev DBs — same pattern as custom_markers/clusters.
    // The shop+inventory upsert is idempotent (clears+rewrites inventory each run).
    {
      const locMap = buildLocationMap(region);
      if (locMap.size > 0) {
        const insertShop = db.prepare(`
          INSERT INTO location_shops (location_id, shop_name, x, y)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(location_id, shop_name) DO UPDATE SET
            x = COALESCE(excluded.x, location_shops.x),
            y = COALESCE(excluded.y, location_shops.y)
          RETURNING id
        `);
        const clearShopInv = db.prepare('DELETE FROM location_shop_inventory WHERE shop_id = ?');
        // Idempotent column add — older dev DBs predate the notes column.
        try { db.exec(`ALTER TABLE location_shop_inventory ADD COLUMN notes TEXT`); } catch { /* already exists */ }
        const insertShopInv = db.prepare(`
          INSERT INTO location_shop_inventory (shop_id, item_name, price, badge_gate, games, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        let shopCount = 0, invCount = 0;
        db.transaction(() => {
          for (const [locationKey, locationData] of Object.entries(locations)) {
            const locationId = locMap.get(locationKey);
            if (!locationId) continue;
            for (const shop of (locationData as any).shops ?? []) {
              const row = insertShop.get(locationId, shop.shop_name, shop.x ?? null, shop.y ?? null) as { id: number } | undefined;
              if (!row) continue;
              shopCount++;
              clearShopInv.run(row.id);
              for (const inv of shop.inventory ?? []) {
                insertShopInv.run(
                  row.id, inv.item_name,
                  inv.price ?? null, inv.badge_gate ?? 0,
                  inv.games ? JSON.stringify(inv.games) : null,
                  inv.notes ?? null,
                );
                invCount++;
              }
            }
          }
        })();
        if (shopCount > 0) console.log(`  Seeded ${shopCount} shops (${invCount} inventory rows)`);
      }
    }

    // Re-seed every boot. Inserts use ON CONFLICT upserts that preserve
    // user-edited x/y/flag fields (via COALESCE) and refresh descriptions
    // from JSON (which mirrors UI edits via persistDescriptionToSeed). The
    // previous `isAlreadySeeded` guard skipped locations that were added
    // to the JSON after the initial seed (e.g. radio-tower, shops).
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
        `${counts.items} items, ${counts.tms} TMs, ${counts.events} events` +
        (counts.pruned > 0 ? ` (pruned ${counts.pruned} orphans)` : '')
      );
    });

    transaction();

    // Now that trainers/items/events exist, the cluster identity keys can
    // be resolved. Wipes + re-inserts inside seedClusters() are idempotent.
    if (Array.isArray(regionData.clusters) && regionData.clusters.length > 0) {
      const n = db.transaction(() => seedClusters(region, regionData.clusters!))();
      console.log(`  Seeded ${n} clusters`);
    }

    console.log(`  Done with ${filename}.`);
  }

  dedupeLocationItems();
  dedupeRedundantMarts();
  stripSingletonTrainerNumbering();

  console.log('\nRegion data seeding complete.');
}

// Pret labels rematchable trainers "<Name>1", "<Name>2", ... so the bulk
// importer surfaces them as "Joey #1" / "Joey #2" / etc. When only "#1" was
// kept (rematches live as separate events rather than distinct NPCs on the
// map), the "#1" suffix is noise — the user sees just one Joey on Route 30.
function stripSingletonTrainerNumbering(): void {
  const result = db.prepare(`
    UPDATE location_trainers
    SET trainer_name = substr(trainer_name, 1, length(trainer_name) - 3)
    WHERE trainer_name LIKE '% #1'
      AND NOT EXISTS (
        SELECT 1 FROM location_trainers sib
        WHERE sib.location_id = location_trainers.location_id
          AND sib.game = location_trainers.game
          AND sib.trainer_class = location_trainers.trainer_class
          AND sib.id != location_trainers.id
          AND sib.trainer_name LIKE substr(location_trainers.trainer_name, 1, length(location_trainers.trainer_name) - 3) || ' #%'
      )
  `).run();
  if (result.changes > 0) {
    console.log(`  Stripped "#1" suffix from ${result.changes} singleton trainer rows.`);
  }
}

// Strip city-named "<X> Mart" shop rows when the same location already has a
// generic "Poké Mart" — the pret-source shop parser emits per-map labels
// (Cherrygrove Mart, Violet Mart, …) that duplicate the canonical entry.
// Legit separate shops like "Goldenrod Underground (...)", "Mahogany Mart1F (1)"
// don't end in plain "Mart" so they're preserved.
function dedupeRedundantMarts(): void {
  const invRes = db.prepare(`
    DELETE FROM location_shop_inventory
    WHERE shop_id IN (
      SELECT ls.id FROM location_shops ls
      WHERE ls.shop_name LIKE '% Mart'
        AND ls.shop_name != 'Poké Mart'
        AND EXISTS (
          SELECT 1 FROM location_shops ls2
          WHERE ls2.location_id = ls.location_id AND ls2.shop_name = 'Poké Mart'
        )
    )
  `).run();
  const shopRes = db.prepare(`
    DELETE FROM location_shops
    WHERE shop_name LIKE '% Mart'
      AND shop_name != 'Poké Mart'
      AND EXISTS (
        SELECT 1 FROM location_shops ls2
        WHERE ls2.location_id = location_shops.location_id AND ls2.shop_name = 'Poké Mart'
      )
  `).run();
  if (shopRes.changes > 0) {
    console.log(`  Deduped ${shopRes.changes} redundant <City> Mart shops (${invRes.changes} inventory rows).`);
  }
}

// Collapse case-only duplicates like "HP Up" vs "Hp Up". The legacy
// "visible" method has been merged into "field" upstream, so we only
// need the canonical-capitalization pass here.
function dedupeLocationItems(): void {
  const caseRes = db.prepare(`
    DELETE FROM location_items
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY location_id, game, method, LOWER(item_name)
            ORDER BY
              CASE WHEN EXISTS (
                SELECT 1 FROM items it WHERE it.display_name = location_items.item_name
              ) THEN 0 ELSE 1 END,
              id
          ) AS rn
        FROM location_items
      )
      WHERE rn > 1
    )
  `).run();

  if (caseRes.changes > 0) {
    console.log(`  Deduped ${caseRes.changes} case-only item rows.`);
    db.prepare(`
      DELETE FROM marker_positions
      WHERE marker_type IN ('item','hidden_item')
        AND reference_id NOT IN (SELECT id FROM location_items)
    `).run();
  }
}
