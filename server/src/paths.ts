import { join } from 'path';
import { mkdirSync } from 'fs';
import { currentOs } from './services/os-triple.js';

// Defaults: cwd for dev mode. Overridden by CLI flags in packaged mode.
let dataDir = process.cwd();
let resourcesDir = process.cwd();

/** Call once at startup with parsed CLI flags */
export function initPaths(opts: { dataDir?: string; resourcesDir?: string }) {
  if (opts.dataDir) dataDir = opts.dataDir;
  if (opts.resourcesDir) resourcesDir = opts.resourcesDir;

  // Ensure user-writable directories exist
  for (const sub of ['data', 'saves', 'saves/library', 'saves/catches', 'hunts', 'roms', 'backups', 'emulators', 'emulators/.tmp']) {
    mkdirSync(join(dataDir, sub), { recursive: true });
  }
}

// ── User data paths (writable) ──────────────────────────────────
export const paths = {
  get dataDir() { return dataDir; },
  get db() { return join(dataDir, 'data', 'pokemon.db'); },
  get savesDir() { return join(dataDir, 'saves'); },
  get libraryDir() { return join(dataDir, 'saves', 'library'); },
  get catchesDir() { return join(dataDir, 'saves', 'catches'); },
  get huntsDir() { return join(dataDir, 'hunts'); },
  get romsDir() { return join(dataDir, 'roms'); },
  get backupsDir() { return join(dataDir, 'backups'); },
  get emulatorsDir() { return join(dataDir, 'emulators'); },
  get configFile() { return join(dataDir, 'config.json'); },

  // ── Bundled resource paths (read-only in packaged mode) ─────
  get resourcesDir() { return resourcesDir; },
  get scriptsDir() { return join(resourcesDir, 'scripts'); },
  get toolsDir() { return join(resourcesDir, 'tools'); },
  get luaDir() { return join(resourcesDir, 'scripts', 'lua'); },
  get schemaFile() { return join(resourcesDir, 'server', 'src', 'schema.sql'); },
  get seedDataDir() { return join(resourcesDir, 'server', 'src', 'seeds', 'data'); },
  get referenceDataDir() { return join(resourcesDir, 'server', 'src', 'data'); },
  get flagsDir() { return join(resourcesDir, 'server', 'src', 'data', 'flags'); },

  get binBsdtar() {
    const triple = currentOs();
    const filename =
      triple === 'windows-x64' ? 'bsdtar-windows-x64.exe' : `bsdtar-${triple}`;
    return join(resourcesDir, 'bin', filename);
  },

  // ── Tool binaries ──────────────────────────────────────────
  get mgba() { return join(resourcesDir, 'tools', 'mgba-stream', 'mgba-stream'); },
  get rtcRelay() { return join(resourcesDir, 'tools', 'rtc-relay', 'rtc-relay'); },
  get mediamtx() { return join(resourcesDir, 'tools', 'mediamtx', 'mediamtx'); },

  // ── Hunt helpers ───────────────────────────────────────────
  huntDir(huntDirName: string) { return join(dataDir, 'hunts', huntDirName); },
  huntScript(name: string) { return join(resourcesDir, 'scripts', name); },
  catchGameDir(game: string) { return join(dataDir, 'saves', 'catches', game); },
  libraryGameDir(game: string) { return join(dataDir, 'saves', 'library', game); },
};
