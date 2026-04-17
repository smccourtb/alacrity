import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { currentOs } from './services/os-triple.js';
import { getConfig } from './services/config.js';

// Defaults: cwd for dev mode. Overridden by CLI flags in packaged mode.
let dataDir = process.cwd();
let resourcesDir = process.cwd();

function expandDataSentinel(stored: string): string {
  if (stored.startsWith('$DATA/')) {
    return join(dataDir, stored.slice('$DATA/'.length));
  }
  return stored;
}

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
  get romsDir() { return expandDataSentinel(getConfig().romsDir); },
  get biosDir() { return expandDataSentinel(getConfig().biosDir); },
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

  // macOS and Windows both ship libarchive's bsdtar in the base install
  // (macOS 10.15+ at /usr/bin/tar, Windows 10 build 17063+ at System32\tar.exe).
  // Trusting the system tool here is consistent with how we already rely on
  // hdiutil, cp, wine, and which. Linux needs a bundled copy because the
  // system tar there is GNU tar — it can't extract zip or 7z archives.
  get binBsdtar() {
    const triple = currentOs();
    if (triple === 'macos-arm64') return '/usr/bin/tar';
    if (triple === 'windows-x64') return 'C:\\Windows\\System32\\tar.exe';
    // Linux: packaged bundle puts it at <resourcesDir>/bin/, dev mode has it
    // at <repoRoot>/src-tauri/resources/bin/ because the file lives there
    // in source and Tauri copies it in the release bundle.
    const packaged = join(resourcesDir, 'bin', `bsdtar-${triple}`);
    if (existsSync(packaged)) return packaged;
    return join(resourcesDir, 'src-tauri', 'resources', 'bin', `bsdtar-${triple}`);
  },

  // ── Tool binaries ──────────────────────────────────────────
  get mgba() { return join(resourcesDir, 'tools', 'mgba-stream', 'mgba-stream'); },
  get rtcRelay() {
    // Go build on Windows appends .exe; Node's child_process.spawn needs the
    // explicit extension to locate the binary via CreateProcess.
    const ext = process.platform === 'win32' ? '.exe' : '';
    return join(resourcesDir, 'tools', 'rtc-relay', `rtc-relay${ext}`);
  },

  // ── Hunt helpers ───────────────────────────────────────────
  huntDir(huntDirName: string) { return join(dataDir, 'hunts', huntDirName); },
  huntScript(name: string) { return join(resourcesDir, 'scripts', name); },
  catchGameDir(game: string) { return join(dataDir, 'saves', 'catches', game); },
  libraryGameDir(game: string) { return join(dataDir, 'saves', 'library', game); },
};
