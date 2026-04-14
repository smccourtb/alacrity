import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { paths } from './paths.js';

const db = new Database(paths.db);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = readFileSync(paths.schemaFile, 'utf-8');
db.exec(schema);

// Migrate: add columns for hunt stop & restart support
const huntColumns = db.prepare(`PRAGMA table_info(hunts)`).all() as { name: string }[];
const colNames = new Set(huntColumns.map(c => c.name));
if (!colNames.has('engine')) db.exec(`ALTER TABLE hunts ADD COLUMN engine TEXT NOT NULL DEFAULT 'core'`);
if (!colNames.has('hunt_mode')) db.exec(`ALTER TABLE hunts ADD COLUMN hunt_mode TEXT NOT NULL DEFAULT 'gift'`);
if (!colNames.has('walk_dir')) db.exec(`ALTER TABLE hunts ADD COLUMN walk_dir TEXT NOT NULL DEFAULT 'ns'`);
if (!colNames.has('previous_attempts')) db.exec(`ALTER TABLE hunts ADD COLUMN previous_attempts INTEGER DEFAULT 0`);
if (!colNames.has('is_archived')) db.exec(`ALTER TABLE hunts ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('elapsed_seconds')) db.exec(`ALTER TABLE hunts ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('target_shiny')) db.exec(`ALTER TABLE hunts ADD COLUMN target_shiny INTEGER NOT NULL DEFAULT 1`);
if (!colNames.has('target_gender')) db.exec(`ALTER TABLE hunts ADD COLUMN target_gender TEXT NOT NULL DEFAULT 'any'`);
if (!colNames.has('min_atk')) db.exec(`ALTER TABLE hunts ADD COLUMN min_atk INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('min_def')) db.exec(`ALTER TABLE hunts ADD COLUMN min_def INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('min_spd')) db.exec(`ALTER TABLE hunts ADD COLUMN min_spd INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('min_spc')) db.exec(`ALTER TABLE hunts ADD COLUMN min_spc INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('target_perfect')) db.exec(`ALTER TABLE hunts ADD COLUMN target_perfect INTEGER NOT NULL DEFAULT 0`);
if (!colNames.has('hunt_dir')) db.exec(`ALTER TABLE hunts ADD COLUMN hunt_dir TEXT`);

// Migrate: add gender_rate to species
const speciesColumns = db.prepare(`PRAGMA table_info(species)`).all() as { name: string }[];
const speciesColNames = new Set(speciesColumns.map(c => c.name));
if (!speciesColNames.has('gender_rate')) db.exec(`ALTER TABLE species ADD COLUMN gender_rate INTEGER NOT NULL DEFAULT -1`);

// Playthrough column on guide_progress
try { db.exec('ALTER TABLE guide_progress ADD COLUMN playthrough_id INTEGER REFERENCES playthroughs(id)'); } catch {}

// Source column on save_files (checkpoint / library / catch)
try { db.exec("ALTER TABLE save_files ADD COLUMN source TEXT"); } catch {}

// Drop original_name and uploaded_at from save_files (replaced by label and discovered_at)
const sfColCheck = (db.prepare('PRAGMA table_info(save_files)').all() as any[]).map((c: any) => c.name);
if (sfColCheck.includes('original_name')) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('DROP TABLE IF EXISTS save_files_new');
  db.exec(`
    CREATE TABLE save_files_new (
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
    INSERT INTO save_files_new (id, filename, file_path, game, generation, label, source, format,
      file_size, file_mtime, save_timestamp, checksum, discovered_at, stale, launchable, rom_path, notes)
    SELECT id, filename, file_path, game, generation, label, COALESCE(source, 'library'), format,
      file_size, file_mtime, save_timestamp, checksum,
      COALESCE(discovered_at, uploaded_at, datetime('now')),
      COALESCE(stale, 0), COALESCE(launchable, 0), rom_path, notes
    FROM save_files;
    DROP TABLE save_files;
    ALTER TABLE save_files_new RENAME TO save_files;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_save_files_path ON save_files(file_path);
  `);
  db.exec('PRAGMA foreign_keys = ON');
}

// Migrate save_files for unified data layer
const sfCols = (db.prepare('PRAGMA table_info(save_files)').all() as any[]).map((c: any) => c.name);
if (!sfCols.includes('generation')) db.exec("ALTER TABLE save_files ADD COLUMN generation INTEGER");
if (!sfCols.includes('label')) db.exec("ALTER TABLE save_files ADD COLUMN label TEXT");
if (!sfCols.includes('format')) db.exec("ALTER TABLE save_files ADD COLUMN format TEXT");
if (!sfCols.includes('file_mtime')) db.exec("ALTER TABLE save_files ADD COLUMN file_mtime TEXT");
if (!sfCols.includes('save_timestamp')) db.exec("ALTER TABLE save_files ADD COLUMN save_timestamp TEXT");
if (!sfCols.includes('stale')) db.exec("ALTER TABLE save_files ADD COLUMN stale INTEGER NOT NULL DEFAULT 0");
if (!sfCols.includes('launchable')) db.exec("ALTER TABLE save_files ADD COLUMN launchable INTEGER NOT NULL DEFAULT 0");
if (!sfCols.includes('rom_path')) db.exec("ALTER TABLE save_files ADD COLUMN rom_path TEXT");
if (!sfCols.includes('discovered_at')) {
  db.exec("ALTER TABLE save_files ADD COLUMN discovered_at TEXT");
}

// Add save_timestamp to checkpoints
const cpCols = (db.prepare('PRAGMA table_info(checkpoints)').all() as any[]).map((c: any) => c.name);
if (!cpCols.includes('save_timestamp')) db.exec("ALTER TABLE checkpoints ADD COLUMN save_timestamp TEXT");

// Notes column on checkpoints
try { db.exec('ALTER TABLE checkpoints ADD COLUMN notes TEXT'); } catch {}

// Save-file linkage for collection-driven guide
try { db.exec("ALTER TABLE specimen_tasks ADD COLUMN save_file_id INTEGER REFERENCES save_files(id) ON DELETE SET NULL"); } catch {}
try { db.exec("ALTER TABLE walkthrough_steps ADD COLUMN save_file_id INTEGER REFERENCES save_files(id) ON DELETE SET NULL"); } catch {}

// Manual target management columns
try { db.exec("ALTER TABLE specimen_targets ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE specimen_targets ADD COLUMN dismissed INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE specimen_targets ADD COLUMN manual_override INTEGER NOT NULL DEFAULT 0"); } catch {}

// Migrate: add x/y position + flag columns for sub-marker system
for (const table of ['location_trainers', 'location_items', 'location_tms', 'location_events']) {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => c.name);
  if (!cols.includes('x')) db.exec(`ALTER TABLE ${table} ADD COLUMN x REAL`);
  if (!cols.includes('y')) db.exec(`ALTER TABLE ${table} ADD COLUMN y REAL`);
  if (!cols.includes('flag_index')) db.exec(`ALTER TABLE ${table} ADD COLUMN flag_index INTEGER`);
  if (!cols.includes('flag_source')) db.exec(`ALTER TABLE ${table} ADD COLUMN flag_source TEXT`);
}

// Migrate: enrich species_forms with type/stat/ability/classification columns
const formCols = (db.prepare('PRAGMA table_info(species_forms)').all() as any[]).map((c: any) => c.name);
const newFormCols: [string, string][] = [
  ['pokeapi_id', 'INTEGER'],
  ['form_category', "TEXT NOT NULL DEFAULT 'standard'"],
  ['is_battle_only', 'INTEGER NOT NULL DEFAULT 0'],
  ['is_collectible', 'INTEGER NOT NULL DEFAULT 1'],
  ['type1', 'TEXT'],
  ['type2', 'TEXT'],
  ['ability1', 'TEXT'],
  ['ability2', 'TEXT'],
  ['hidden_ability', 'TEXT'],
  ['base_hp', 'INTEGER'],
  ['base_attack', 'INTEGER'],
  ['base_defense', 'INTEGER'],
  ['base_sp_attack', 'INTEGER'],
  ['base_sp_defense', 'INTEGER'],
  ['base_speed', 'INTEGER'],
  ['generation', 'INTEGER'],
];
for (const [name, type] of newFormCols) {
  if (!formCols.includes(name)) {
    db.exec(`ALTER TABLE species_forms ADD COLUMN ${name} ${type}`);
  }
}

// Create forms_resolved view (drop and recreate to pick up any schema changes)
try { db.exec('DROP VIEW IF EXISTS forms_resolved'); } catch {}
const viewMatch = schema.match(/CREATE VIEW IF NOT EXISTS forms_resolved[\s\S]*?;/);
if (viewMatch) {
  try { db.exec(viewMatch[0]); } catch {}
}

// Migrate: checkpoints include_in_collection, archived
const checkpointCols = (db.prepare('PRAGMA table_info(checkpoints)').all() as any[]).map((c: any) => c.name);
if (!checkpointCols.includes('include_in_collection')) {
  db.exec('ALTER TABLE checkpoints ADD COLUMN include_in_collection INTEGER NOT NULL DEFAULT 0');
  db.exec(`UPDATE checkpoints SET include_in_collection = 1
    WHERE id IN (SELECT active_checkpoint_id FROM playthroughs WHERE active_checkpoint_id IS NOT NULL)`);
}
if (!checkpointCols.includes('archived')) {
  db.exec('ALTER TABLE checkpoints ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
}

// Migrate: checkpoints include_explicit (distinguishes user-toggled from auto-tip inclusion)
if (!checkpointCols.includes('include_explicit')) {
  db.exec('ALTER TABLE checkpoints ADD COLUMN include_explicit INTEGER NOT NULL DEFAULT 0');
  // Any pre-existing include_in_collection=1 rows are treated as explicit user intent
  db.exec('UPDATE checkpoints SET include_explicit = 1 WHERE include_in_collection = 1');
}

// Migrate: playthroughs include_in_collection
const playthroughCols = (db.prepare('PRAGMA table_info(playthroughs)').all() as any[]).map((c: any) => c.name);
if (!playthroughCols.includes('include_in_collection')) {
  db.exec('ALTER TABLE playthroughs ADD COLUMN include_in_collection INTEGER NOT NULL DEFAULT 1');
}

// Migrate: split identity_sightings into collection_saves + collection_bank
const hasSightings = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='identity_sightings'`).get();
const hasSaves = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='collection_saves'`).get();
if (hasSightings && !hasSaves) {
  db.exec(`
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

    INSERT INTO collection_saves (identity_id, checkpoint_id, species_id, box_slot, level, snapshot_data, created_at)
    SELECT identity_id, checkpoint_id, species_id, box_slot, level, snapshot_data, created_at
    FROM identity_sightings WHERE checkpoint_id IS NOT NULL;

    INSERT INTO collection_bank (identity_id, bank_file_id, species_id, box_slot, level, snapshot_data, created_at)
    SELECT identity_id, bank_file_id, species_id, box_slot, level, snapshot_data, created_at
    FROM identity_sightings WHERE bank_file_id IS NOT NULL;

    DROP TABLE identity_sightings;
  `);
}

// Recreate collection VIEW (drop and recreate to pick up any schema changes)
try { db.exec('DROP VIEW IF EXISTS collection'); } catch {}
const collectionViewMatch = schema.match(/CREATE VIEW IF NOT EXISTS collection[\s\S]*?;/);
if (collectionViewMatch) {
  try { db.exec(collectionViewMatch[0]); } catch {}
}

// Migrate: create collection_manual table
const allTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='collection_manual'`).get();
if (!allTables) {
  db.exec(`
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
  `);

}

export default db;
