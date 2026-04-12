import { Database } from 'bun:sqlite';
import { paths } from './paths.js';
import { currentOs } from './services/os-triple.js';

export function runMigrations(db: Database) {
  const columns = (db.prepare('PRAGMA table_info(pokemon)').all() as any[]).map((c: any) => c.name);

  const newCols: [string, string][] = [
    ['ot_sid', 'TEXT'],
    ['ot_gender', 'TEXT'],
    ['ribbons', "TEXT DEFAULT '[]'"],
    ['marks', "TEXT DEFAULT '[]'"],
    ['source', "TEXT DEFAULT 'manual'"],
    ['manual_fields', "TEXT DEFAULT '[]'"],
    ['form_id', 'INTEGER REFERENCES species_forms(id)'],
    ['gender', 'TEXT'],
  ];

  for (const [name, type] of newCols) {
    if (!columns.includes(name)) {
      db.exec(`ALTER TABLE pokemon ADD COLUMN ${name} ${type}`);
    }
  }

  // Species table legality columns
  const speciesCols = (db.prepare('PRAGMA table_info(species)').all() as any[]).map((c: any) => c.name);
  const newSpeciesCols: [string, string][] = [
    ['ball_permit', 'INTEGER NOT NULL DEFAULT 0'],
    ['category', 'TEXT'],
    ['ha_gen', 'INTEGER'],
  ];

  for (const [name, type] of newSpeciesCols) {
    if (!speciesCols.includes(name)) {
      db.exec(`ALTER TABLE species ADD COLUMN ${name} ${type}`);
    }
  }

  // Per-game wiki prose + callouts
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_wiki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL REFERENCES map_locations(id),
      game TEXT NOT NULL,
      wiki_prose TEXT,
      wiki_callouts TEXT,
      UNIQUE(location_id, game)
    )
  `);

  // Create legality tables if they don't exist
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS sync_ignores (
      unique_key TEXT PRIMARY KEY,
      pokemon_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Launcher tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS save_notes (
      save_path_hash TEXT PRIMARY KEY,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emulator_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      launch_args TEXT NOT NULL DEFAULT '{rom}',
      supports_link INTEGER NOT NULL DEFAULT 0,
      link_listen_args TEXT NOT NULL DEFAULT '',
      link_connect_args TEXT NOT NULL DEFAULT '',
      is_default_gen1 INTEGER NOT NULL DEFAULT 0,
      is_default_gen2 INTEGER NOT NULL DEFAULT 0,
      is_default_3ds INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Add is_default_3ds column if missing (migration for existing DBs)
  try { db.exec('ALTER TABLE emulator_configs ADD COLUMN is_default_3ds INTEGER NOT NULL DEFAULT 0'); } catch {}

  // ─────────────────────────────────────────────────────────────────
  // Migration: rebuild emulator_configs with (id, os) primary key
  // ─────────────────────────────────────────────────────────────────
  const emulatorTableInfo = db.prepare("PRAGMA table_info('emulator_configs')").all() as Array<{ name: string }>;
  const hasOsColumn = emulatorTableInfo.some(col => col.name === 'os');

  if (!hasOsColumn) {
    // Rebuild the table with the new shape. SQLite doesn't allow changing a primary
    // key in place, so we use the standard create-new/copy/drop/rename pattern.
    const triple = currentOs();

    db.exec(`
      CREATE TABLE emulator_configs_new (
        id TEXT NOT NULL,
        os TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        launch_args TEXT NOT NULL DEFAULT '{rom}',
        supports_link INTEGER NOT NULL DEFAULT 0,
        link_listen_args TEXT NOT NULL DEFAULT '',
        link_connect_args TEXT NOT NULL DEFAULT '',
        is_default_gen1 INTEGER NOT NULL DEFAULT 0,
        is_default_gen2 INTEGER NOT NULL DEFAULT 0,
        is_default_3ds INTEGER NOT NULL DEFAULT 0,
        installed_version TEXT,
        managed_install INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (id, os)
      );
    `);

    // Copy existing rows, tagging them with the current OS triple as a best guess.
    // (v1 doesn't have production users, so this is fine — pre-v1 dev DBs get
    // tagged with whatever OS the developer is running.)
    db.prepare(`
      INSERT INTO emulator_configs_new
        (id, os, name, path, launch_args, supports_link, link_listen_args,
         link_connect_args, is_default_gen1, is_default_gen2, is_default_3ds,
         installed_version, managed_install)
      SELECT id, ?, name, path, launch_args, supports_link, link_listen_args,
             link_connect_args, is_default_gen1, is_default_gen2, is_default_3ds,
             NULL, 0
      FROM emulator_configs
    `).run(triple);

    db.exec('DROP TABLE emulator_configs');
    db.exec('ALTER TABLE emulator_configs_new RENAME TO emulator_configs');
  }

  // Seed default emulators if table is empty
  const emulatorCount = (db.prepare('SELECT COUNT(*) as c FROM emulator_configs').get() as any).c;
  if (emulatorCount === 0) {
    const home = process.env.HOME || '';
    db.prepare(`
      INSERT INTO emulator_configs (id, name, path, launch_args, supports_link, link_listen_args, link_connect_args, is_default_gen1, is_default_gen2, is_default_3ds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('mgba', 'mGBA', `${home}/mgba/build/qt/mgba-qt`, '{rom}', 0, '', '', 1, 1, 0);

    db.prepare(`
      INSERT INTO emulator_configs (id, name, path, launch_args, supports_link, link_listen_args, link_connect_args, is_default_gen1, is_default_gen2, is_default_3ds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('bgb', 'BGB', `${process.cwd()}/tools/bgb/bgb.exe`, '{rom}', 1, '--listen', '--connect 127.0.0.1', 0, 0, 0);
  }

  // Seed Azahar if not present
  const hasAzahar = db.prepare('SELECT 1 FROM emulator_configs WHERE id = ?').get('azahar');
  if (!hasAzahar) {
    const projectRoot = paths.resourcesDir;
    db.prepare(`
      INSERT INTO emulator_configs (id, name, path, launch_args, supports_link, link_listen_args, link_connect_args, is_default_gen1, is_default_gen2, is_default_3ds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('azahar', 'Azahar (3DS)', `${projectRoot}/tools/azahar/azahar.AppImage`, '{rom}', 0, '', '', 0, 0, 1);
  }
}
