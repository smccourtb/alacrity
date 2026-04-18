CREATE TABLE IF NOT EXISTS natures (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  increased_stat TEXT,
  decreased_stat TEXT,
  is_neutral INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS species (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type1 TEXT NOT NULL,
  type2 TEXT,
  ability1 TEXT,
  ability2 TEXT,
  hidden_ability TEXT,
  sprite_url TEXT,
  shiny_sprite_url TEXT,
  base_hp INTEGER,
  base_attack INTEGER,
  base_defense INTEGER,
  base_sp_attack INTEGER,
  base_sp_defense INTEGER,
  base_speed INTEGER,
  generation INTEGER NOT NULL,
  gender_rate INTEGER NOT NULL DEFAULT -1,
  growth_rate INTEGER
);

CREATE TABLE IF NOT EXISTS save_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  game TEXT,
  generation INTEGER,
  label TEXT,
  source TEXT NOT NULL DEFAULT 'library',
  format TEXT,
  file_size INTEGER,
  file_mtime TEXT,
  save_timestamp TEXT,
  checksum TEXT,
  discovered_at TEXT DEFAULT (datetime('now')),
  stale INTEGER NOT NULL DEFAULT 0,
  launchable INTEGER NOT NULL DEFAULT 0,
  rom_path TEXT,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_save_files_path ON save_files(file_path);

-- User-authored metadata for saves: tag (custom group name) and
-- user_sort_order (higher = earlier). Phase 1b of the save-visibility
-- rework. One row per save, or no row if the user hasn't touched it.
CREATE TABLE IF NOT EXISTS save_user_meta (
  save_file_id INTEGER PRIMARY KEY REFERENCES save_files(id) ON DELETE CASCADE,
  tag TEXT,
  user_sort_order INTEGER,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_save_user_meta_tag ON save_user_meta(tag);

-- Per-tag metadata (color, etc.). Populated lazily when a user sets a
-- color on a tag. A tag with no row here gets a default color.
CREATE TABLE IF NOT EXISTS save_tag_meta (
  tag TEXT PRIMARY KEY,
  color TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hunts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_species_id INTEGER REFERENCES species(id),
  target_name TEXT NOT NULL,
  game TEXT NOT NULL,
  rom_path TEXT NOT NULL,
  sav_path TEXT NOT NULL,
  num_instances INTEGER NOT NULL DEFAULT 30,
  engine TEXT NOT NULL DEFAULT 'core', -- 'core' or 'rng'
  hunt_mode TEXT NOT NULL DEFAULT 'gift',
  walk_dir TEXT NOT NULL DEFAULT 'ns',
  target_shiny INTEGER NOT NULL DEFAULT 1,
  target_gender TEXT NOT NULL DEFAULT 'any',
  min_atk INTEGER NOT NULL DEFAULT 0,
  min_def INTEGER NOT NULL DEFAULT 0,
  min_spd INTEGER NOT NULL DEFAULT 0,
  min_spc INTEGER NOT NULL DEFAULT 0,
  target_perfect INTEGER NOT NULL DEFAULT 0,
  encounter_type TEXT,
  tsv INTEGER,
  target_nature TEXT,
  target_ability TEXT,
  target_ivs TEXT,
  target_frame INTEGER,
  current_frame INTEGER NOT NULL DEFAULT 0,
  perfect_iv_count INTEGER NOT NULL DEFAULT 0,
  is_shiny_locked INTEGER NOT NULL DEFAULT 0,
  has_shiny_charm INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'stopped',
  total_attempts INTEGER DEFAULT 0,
  previous_attempts INTEGER DEFAULT 0,
  started_at TEXT,
  ended_at TEXT,
  hit_details TEXT,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  hunt_dir TEXT,
  parent_checkpoint_id INTEGER REFERENCES checkpoints(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hunt_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hunt_id INTEGER NOT NULL REFERENCES hunts(id),
  instance_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  message TEXT,
  is_hit INTEGER DEFAULT 0,
  logged_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hunt_logs_hunt ON hunt_logs(hunt_id);

CREATE TABLE IF NOT EXISTS moves (
  name TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  power INTEGER,
  accuracy INTEGER,
  pp INTEGER
);

-- ============================================
-- Collection Guide tables
-- ============================================

CREATE TABLE IF NOT EXISTS game_maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  games TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS map_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL REFERENCES game_maps(id),
  location_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  location_type TEXT NOT NULL,
  progression_order INTEGER,
  UNIQUE(map_id, location_key)
);

CREATE INDEX IF NOT EXISTS idx_locations_map ON map_locations(map_id);

CREATE TABLE IF NOT EXISTS walkthrough_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  step_order INTEGER NOT NULL,
  action_tag TEXT,
  description TEXT NOT NULL,
  species_id INTEGER REFERENCES species(id),
  specimen_role TEXT,
  is_version_exclusive INTEGER DEFAULT 0,
  exclusive_to TEXT,
  auto_trackable INTEGER DEFAULT 1,
  notes TEXT,
  specimen_task_id INTEGER REFERENCES specimen_tasks(id),
  save_file_id INTEGER REFERENCES save_files(id) ON DELETE SET NULL,
  UNIQUE(game, location_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_walkthrough_game ON walkthrough_steps(game);
CREATE INDEX IF NOT EXISTS idx_walkthrough_location ON walkthrough_steps(location_id);

CREATE TABLE IF NOT EXISTS map_encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  species_id INTEGER NOT NULL REFERENCES species(id),
  method TEXT NOT NULL,
  level_min INTEGER,
  level_max INTEGER,
  encounter_rate REAL,
  time_of_day TEXT,
  notes TEXT,
  UNIQUE(location_id, game, species_id, method, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_encounters_location ON map_encounters(location_id);
CREATE INDEX IF NOT EXISTS idx_encounters_game ON map_encounters(game);

CREATE TABLE IF NOT EXISTS location_trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  trainer_class TEXT NOT NULL,
  trainer_name TEXT NOT NULL,
  is_rematchable INTEGER NOT NULL DEFAULT 0,
  is_boss INTEGER NOT NULL DEFAULT 0,
  party_pokemon TEXT,
  UNIQUE(location_id, game, trainer_class, trainer_name)
);

CREATE INDEX IF NOT EXISTS idx_trainers_location ON location_trainers(location_id);
CREATE INDEX IF NOT EXISTS idx_trainers_game ON location_trainers(game);

CREATE TABLE IF NOT EXISTS location_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  item_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'field',
  description TEXT,
  requirements TEXT,
  UNIQUE(location_id, game, item_name, method)
);

CREATE INDEX IF NOT EXISTS idx_items_location ON location_items(location_id);
CREATE INDEX IF NOT EXISTS idx_items_game ON location_items(game);

CREATE TABLE IF NOT EXISTS location_tms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  tm_number TEXT NOT NULL,
  move_name TEXT NOT NULL,
  method TEXT NOT NULL,
  price INTEGER,
  requirements TEXT,
  UNIQUE(location_id, game, tm_number)
);

CREATE INDEX IF NOT EXISTS idx_tms_location ON location_tms(location_id);
CREATE INDEX IF NOT EXISTS idx_tms_game ON location_tms(game);

CREATE TABLE IF NOT EXISTS location_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  progression_order INTEGER,
  species_id INTEGER REFERENCES species(id),
  requirements TEXT,
  UNIQUE(location_id, game, event_name)
);

CREATE INDEX IF NOT EXISTS idx_events_location ON location_events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_game ON location_events(game);

CREATE TABLE IF NOT EXISTS custom_markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL REFERENCES game_maps(id),
  game TEXT,
  label TEXT NOT NULL,
  marker_type TEXT NOT NULL DEFAULT 'note',
  description TEXT,
  x REAL NOT NULL,
  y REAL NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guide_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL REFERENCES walkthrough_steps(id),
  save_file_id INTEGER REFERENCES save_files(id),
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  notes TEXT,
  UNIQUE(step_id, save_file_id)
);

-- ============================================================
-- Playthrough & Checkpoint System
-- ============================================================

CREATE TABLE IF NOT EXISTS playthroughs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  ot_name TEXT NOT NULL,
  ot_tid INTEGER NOT NULL,
  goal TEXT NOT NULL DEFAULT 'origin_collection',
  label TEXT,
  active_checkpoint_id INTEGER REFERENCES checkpoints(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(game, ot_name, ot_tid)
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playthrough_id INTEGER NOT NULL REFERENCES playthroughs(id) ON DELETE CASCADE,
  save_file_id INTEGER NOT NULL REFERENCES save_files(id),
  parent_checkpoint_id INTEGER REFERENCES checkpoints(id),
  label TEXT,
  location_key TEXT,
  badge_count INTEGER,
  is_branch INTEGER NOT NULL DEFAULT 0,
  needs_confirmation INTEGER NOT NULL DEFAULT 0,
  snapshot TEXT,
  notes TEXT,
  include_in_collection INTEGER NOT NULL DEFAULT 0,
  include_explicit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_playthrough ON checkpoints(playthrough_id);

CREATE TABLE IF NOT EXISTS origin_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER REFERENCES species(id),
  requirement_type TEXT NOT NULL,
  source_games TEXT NOT NULL,
  description TEXT NOT NULL,
  move_name TEXT,
  item_name TEXT,
  priority TEXT NOT NULL DEFAULT 'must'
);

CREATE TABLE IF NOT EXISTS collection_legs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  origin_mark TEXT,
  games TEXT NOT NULL,
  leg_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS specimen_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  leg_key TEXT NOT NULL REFERENCES collection_legs(key),
  source_game TEXT,
  category TEXT NOT NULL DEFAULT 'mandatory',
  target_type TEXT NOT NULL,
  constraints TEXT NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_manual INTEGER NOT NULL DEFAULT 0,
  dismissed INTEGER NOT NULL DEFAULT 0,
  manual_override INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS specimen_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER NOT NULL REFERENCES specimen_targets(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  location_key TEXT,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  task_order INTEGER NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  save_file_id INTEGER REFERENCES save_files(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS specimen_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER NOT NULL REFERENCES specimen_targets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_location TEXT,
  save_file_id INTEGER REFERENCES save_files(id),
  checkpoint_id INTEGER REFERENCES checkpoints(id),
  pokemon_id INTEGER,
  notes TEXT,
  UNIQUE(target_id)
);

CREATE TABLE IF NOT EXISTS playthrough_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playthrough_id INTEGER NOT NULL REFERENCES playthroughs(id) ON DELETE CASCADE,
  requirement_id INTEGER REFERENCES origin_requirements(id),
  species_id INTEGER REFERENCES species(id),
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_checkpoint_id INTEGER REFERENCES checkpoints(id),
  notes TEXT,
  completed_from_save INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_goals_playthrough ON playthrough_goals(playthrough_id);

-- ============================================================
-- Multi-dex reference tables
-- ============================================================

-- Reference: ribbons (93 total)
CREATE TABLE IF NOT EXISTS ribbons (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  how_to_obtain TEXT NOT NULL DEFAULT '',
  games TEXT NOT NULL DEFAULT '[]',
  prerequisites TEXT,
  sprite_key TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Reference: marks (54 total)
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  how_to_obtain TEXT NOT NULL DEFAULT '',
  games TEXT NOT NULL DEFAULT '[]',
  title_suffix TEXT NOT NULL DEFAULT '',
  sprite_key TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Reference: balls (28 total)
CREATE TABLE IF NOT EXISTS balls (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  games TEXT NOT NULL DEFAULT '[]',
  sprite_key TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Species forms (Mega, Giga, Regional, Gender variants)
CREATE TABLE IF NOT EXISTS species_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  form_name TEXT NOT NULL,
  form_order INTEGER NOT NULL DEFAULT 0,
  sprite_url TEXT,
  shiny_sprite_url TEXT,
  pokeapi_id INTEGER,
  form_category TEXT NOT NULL DEFAULT 'standard',
  is_battle_only INTEGER NOT NULL DEFAULT 0,
  is_collectible INTEGER NOT NULL DEFAULT 1,
  type1 TEXT,
  type2 TEXT,
  ability1 TEXT,
  ability2 TEXT,
  hidden_ability TEXT,
  base_hp INTEGER,
  base_attack INTEGER,
  base_defense INTEGER,
  base_sp_attack INTEGER,
  base_sp_defense INTEGER,
  base_speed INTEGER,
  generation INTEGER,
  UNIQUE(species_id, form_name)
);

-- Shiny hunting methods per species per game
CREATE TABLE IF NOT EXISTS shiny_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  game TEXT NOT NULL,
  method TEXT NOT NULL,
  odds TEXT NOT NULL DEFAULT '',
  notes TEXT,
  UNIQUE(species_id, game)
);

-- ============================================================
-- Legality Reference Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS shiny_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  form INTEGER NOT NULL DEFAULT 0,
  game TEXT NOT NULL,
  UNIQUE(species_id, form, game)
);

CREATE INDEX IF NOT EXISTS idx_shiny_locks_species ON shiny_locks(species_id);

CREATE TABLE IF NOT EXISTS game_versions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  generation INTEGER NOT NULL,
  origin_mark TEXT NOT NULL,
  max_species_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Pokemon Identity & Collection Goals Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS pokemon_identity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  gen INTEGER NOT NULL,
  first_seen_checkpoint_id INTEGER REFERENCES checkpoints(id),
  confirmed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_identity_fingerprint ON pokemon_identity(fingerprint);
CREATE INDEX IF NOT EXISTS idx_identity_gen ON pokemon_identity(gen);

-- Pokemon found in checkpoint saves (auto-scanned)
CREATE TABLE IF NOT EXISTS collection_saves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id INTEGER NOT NULL REFERENCES pokemon_identity(id) ON DELETE CASCADE,
  checkpoint_id INTEGER NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  species_id INTEGER NOT NULL,
  box_slot TEXT,
  level INTEGER,
  snapshot_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_collection_saves_identity ON collection_saves(identity_id);
CREATE INDEX IF NOT EXISTS idx_collection_saves_checkpoint ON collection_saves(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_collection_saves_species ON collection_saves(species_id);

-- Pokemon from PKSM banks / external banks
CREATE TABLE IF NOT EXISTS collection_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id INTEGER NOT NULL REFERENCES pokemon_identity(id) ON DELETE CASCADE,
  bank_file_id INTEGER NOT NULL REFERENCES save_files(id) ON DELETE CASCADE,
  species_id INTEGER NOT NULL,
  box_slot TEXT,
  level INTEGER,
  snapshot_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_collection_bank_identity ON collection_bank(identity_id);
CREATE INDEX IF NOT EXISTS idx_collection_bank_file ON collection_bank(bank_file_id);
CREATE INDEX IF NOT EXISTS idx_collection_bank_species ON collection_bank(species_id);

CREATE TABLE IF NOT EXISTS collection_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  filters TEXT NOT NULL DEFAULT '{}',
  scope TEXT NOT NULL DEFAULT 'all',
  target_count INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collection_manual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id INTEGER REFERENCES pokemon_identity(id),
  species_id INTEGER NOT NULL,
  is_shiny INTEGER NOT NULL DEFAULT 0,
  level INTEGER,
  gender TEXT,
  nature TEXT,
  ability TEXT,
  ball TEXT,
  origin_game TEXT,
  nickname TEXT,
  ot_name TEXT,
  ot_tid INTEGER,
  form_id INTEGER,
  ribbons TEXT DEFAULT '[]',
  marks TEXT DEFAULT '[]',
  ivs TEXT,
  evs TEXT,
  moves TEXT DEFAULT '[]',
  notes TEXT,
  caught_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_collection_manual_species ON collection_manual(species_id);

-- Unified collection view across all sources
CREATE VIEW IF NOT EXISTS collection AS
  SELECT id, identity_id, checkpoint_id, NULL as bank_file_id, species_id,
         box_slot, level, snapshot_data, created_at, 'save' as source
  FROM collection_saves
  UNION ALL
  SELECT id, identity_id, NULL as checkpoint_id, bank_file_id, species_id,
         box_slot, level, snapshot_data, created_at, 'bank' as source
  FROM collection_bank
  UNION ALL
  SELECT id, NULL as identity_id, NULL as checkpoint_id, NULL as bank_file_id, species_id,
         NULL as box_slot, level, NULL as snapshot_data, created_at, 'manual' as source
  FROM collection_manual;

CREATE VIEW IF NOT EXISTS forms_resolved AS
SELECT
  sf.id, sf.species_id, sf.form_name, sf.form_order,
  sf.pokeapi_id, sf.form_category, sf.is_battle_only, sf.is_collectible,
  COALESCE(sf.type1, s.type1) AS type1,
  CASE WHEN sf.type2 = '' THEN NULL ELSE COALESCE(sf.type2, s.type2) END AS type2,
  COALESCE(sf.ability1, s.ability1) AS ability1,
  COALESCE(sf.ability2, s.ability2) AS ability2,
  COALESCE(sf.hidden_ability, s.hidden_ability) AS hidden_ability,
  COALESCE(sf.sprite_url, s.sprite_url) AS sprite_url,
  COALESCE(sf.shiny_sprite_url, s.shiny_sprite_url) AS shiny_sprite_url,
  COALESCE(sf.base_hp, s.base_hp) AS base_hp,
  COALESCE(sf.base_attack, s.base_attack) AS base_attack,
  COALESCE(sf.base_defense, s.base_defense) AS base_defense,
  COALESCE(sf.base_sp_attack, s.base_sp_attack) AS base_sp_attack,
  COALESCE(sf.base_sp_defense, s.base_sp_defense) AS base_sp_defense,
  COALESCE(sf.base_speed, s.base_speed) AS base_speed,
  COALESCE(sf.generation, s.generation) AS generation,
  s.name AS species_name,
  s.gender_rate
FROM species_forms sf
JOIN species s ON sf.species_id = s.id;

-- === Guide V2: Location Detail Tables ===

CREATE TABLE IF NOT EXISTS location_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  item_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'field',
  description TEXT,
  flag_index INTEGER,
  flag_source TEXT,
  requirements TEXT,
  UNIQUE(location_id, game, item_name, method)
);
CREATE INDEX IF NOT EXISTS idx_location_items_loc ON location_items(location_id);
CREATE INDEX IF NOT EXISTS idx_location_items_game ON location_items(game);

CREATE TABLE IF NOT EXISTS location_trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  trainer_class TEXT NOT NULL,
  trainer_name TEXT NOT NULL,
  flag_index INTEGER,
  flag_source TEXT DEFAULT 'event',
  is_rematchable INTEGER NOT NULL DEFAULT 0,
  is_boss INTEGER NOT NULL DEFAULT 0,
  party_pokemon TEXT,
  description TEXT,
  UNIQUE(location_id, game, trainer_class, trainer_name)
);
CREATE INDEX IF NOT EXISTS idx_location_trainers_loc ON location_trainers(location_id);
CREATE INDEX IF NOT EXISTS idx_location_trainers_game ON location_trainers(game);

CREATE TABLE IF NOT EXISTS location_tms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  tm_number TEXT NOT NULL,
  move_name TEXT NOT NULL,
  method TEXT NOT NULL,
  flag_index INTEGER,
  flag_source TEXT,
  price INTEGER,
  requirements TEXT,
  description TEXT,
  UNIQUE(location_id, game, tm_number)
);
CREATE INDEX IF NOT EXISTS idx_location_tms_loc ON location_tms(location_id);

CREATE TABLE IF NOT EXISTS location_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES map_locations(id),
  game TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  flag_index INTEGER,
  flag_source TEXT,
  progression_order INTEGER,
  species_id INTEGER REFERENCES species(id),
  requirements TEXT,
  UNIQUE(location_id, game, event_name)
);
CREATE INDEX IF NOT EXISTS idx_location_events_loc ON location_events(location_id);
CREATE INDEX IF NOT EXISTS idx_location_events_game ON location_events(game);

CREATE TABLE IF NOT EXISTS marker_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_key TEXT NOT NULL,
  marker_type TEXT NOT NULL CHECK(marker_type IN ('item', 'hidden_item', 'trainer', 'tm', 'event')),
  reference_id INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  game_override TEXT,
  UNIQUE(map_key, marker_type, reference_id, game_override)
);
