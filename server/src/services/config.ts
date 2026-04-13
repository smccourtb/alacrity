/**
 * Config service — manages <dataDir>/config.json.
 *
 * Read-with-defaults on first access, partial write on update, emits change
 * events so components can react to Settings changes without a restart.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { paths } from '../paths.js';

export interface AlacrityConfig {
  version: 1;
  welcomeDismissed: boolean;
  welcomeDismissedAt: string | null;
  romsDir: string;
  biosDir: string;
  importSources: string[];
  ntfyServer: string;
  ntfyTopic: string;
}

const DEFAULTS: Omit<AlacrityConfig, 'ntfyTopic'> = {
  version: 1,
  welcomeDismissed: false,
  welcomeDismissedAt: null,
  romsDir: '$DATA/roms',
  biosDir: '$DATA/bios',
  importSources: [],
  ntfyServer: 'https://ntfy.sh',
};

function generateDefaultNtfyTopic(): string {
  return `alacrity-${randomBytes(8).toString('hex')}`;
}

let cached: AlacrityConfig | null = null;
const emitter = new EventEmitter();

function load(): AlacrityConfig {
  const file = paths.configFile;
  if (!existsSync(file)) {
    const fresh: AlacrityConfig = {
      ...DEFAULTS,
      ntfyTopic: generateDefaultNtfyTopic(),
    };
    write(fresh);
    return fresh;
  }

  try {
    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AlacrityConfig>;

    // Merge with defaults for any missing fields (forward-compat).
    const merged: AlacrityConfig = {
      version: 1,
      welcomeDismissed: parsed.welcomeDismissed ?? DEFAULTS.welcomeDismissed,
      welcomeDismissedAt: parsed.welcomeDismissedAt ?? DEFAULTS.welcomeDismissedAt,
      romsDir: parsed.romsDir ?? DEFAULTS.romsDir,
      biosDir: parsed.biosDir ?? DEFAULTS.biosDir,
      importSources: parsed.importSources ?? DEFAULTS.importSources,
      ntfyServer: parsed.ntfyServer ?? DEFAULTS.ntfyServer,
      ntfyTopic: parsed.ntfyTopic ?? generateDefaultNtfyTopic(),
    };

    // Persist any filled-in defaults back to disk so the file is always complete.
    if (JSON.stringify(parsed) !== JSON.stringify(merged)) {
      write(merged);
    }

    return merged;
  } catch (err) {
    console.error('[config] Failed to read config.json, using defaults:', err);
    const fresh: AlacrityConfig = {
      ...DEFAULTS,
      ntfyTopic: generateDefaultNtfyTopic(),
    };
    write(fresh);
    return fresh;
  }
}

function write(config: AlacrityConfig): void {
  const file = paths.configFile;
  mkdirSync(dirname(file), { recursive: true });

  // Atomic write: write to a sibling temp file, then rename.
  // rename(2) is atomic on POSIX for same-filesystem moves.
  const tmpFile = `${file}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  try {
    renameSync(tmpFile, file);
  } catch (err) {
    try { unlinkSync(tmpFile); } catch {}
    throw err;
  }
}

/**
 * Get the current config. Loads from disk on first call, returns cached on
 * subsequent calls. Always returns a complete config (never partial).
 */
export function getConfig(): AlacrityConfig {
  if (cached === null) cached = load();
  return cached;
}

/**
 * Update a subset of config fields. Merges the partial into the current config,
 * writes atomically to disk, and emits a 'change' event.
 */
export function updateConfig(partial: Partial<Omit<AlacrityConfig, 'version'>>): AlacrityConfig {
  const current = getConfig();
  const next: AlacrityConfig = {
    ...current,
    ...partial,
    version: 1, // always pinned
  };
  write(next);
  cached = next;
  emitter.emit('change', next);
  return next;
}

/**
 * Subscribe to config changes. Returns an unsubscribe function.
 */
export function onConfigChange(listener: (config: AlacrityConfig) => void): () => void {
  emitter.on('change', listener);
  return () => emitter.off('change', listener);
}

/**
 * Initialize config service — call once at sidecar startup to ensure
 * config.json exists with defaults before any other module reads from it.
 */
export function initConfig(): void {
  getConfig();
}
