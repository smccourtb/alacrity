/**
 * Dependency service — emulator path resolution, install flow, mismatch detection.
 *
 * Currently only exports the `resolveEmulatorPath` helper. Install flow and
 * manifest loading land in Phase 4.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { currentOs, type OsTriple } from './os-triple.js';

export interface ManifestPlatformEntry {
  downloadUrl: string;
  sha256: string;
  sizeBytes?: number;
  archive: 'appimage' | 'zip' | 'tar.xz' | '7z' | 'dmg';
  binaryRelPath: string;
  chmod?: boolean;
  dmgVolumeName?: string;
  requiresWine?: boolean;
}

export interface ManifestEmulatorEntry {
  displayName: string;
  version: string;
  license: string;
  licenseUrl: string;
  homepageUrl: string;
  description: string;
  coreAbiLock?: boolean;
  coreAbiLockMessage?: string;
  platforms: Partial<Record<OsTriple, ManifestPlatformEntry>>;
}

export interface DependencyManifest {
  manifestVersion: 1;
  alacrityMinVersion: string;
  emulators: Record<string, ManifestEmulatorEntry>;
}

export class EmulatorNotInstalledError extends Error {
  constructor() {
    super('Emulator is not installed');
    this.name = 'EmulatorNotInstalledError';
  }
}

/**
 * Resolve a stored emulator path (from emulator_configs.path) to an absolute
 * filesystem path suitable for spawning.
 *
 * Three forms are supported:
 *   - Absolute path (e.g., /usr/bin/mgba-qt): used as-is. This is the form for
 *     user-provided custom installs.
 *   - Sentinel-prefixed path (e.g., $DATA/emulators/mgba-0.10.3-linux-x64/mGBA.AppImage):
 *     the $DATA/ prefix is expanded to paths.dataDir at spawn time. This form is
 *     written by the auto-install flow and makes managed installs portable
 *     across mount points.
 *   - Empty string: emulator is not installed. Throws EmulatorNotInstalledError.
 */
export function resolveEmulatorPath(storedPath: string): string {
  if (!storedPath) throw new EmulatorNotInstalledError();
  if (storedPath.startsWith('$DATA/')) {
    return join(paths.dataDir, storedPath.slice('$DATA/'.length));
  }
  return storedPath;
}

let cachedManifest: DependencyManifest | null = null;

/**
 * Load the dependency manifest from the bundled resources directory.
 * Cached on first call — the manifest is immutable for the sidecar's lifetime.
 */
export function loadManifest(): DependencyManifest {
  if (cachedManifest !== null) return cachedManifest;

  const manifestPath = join(paths.referenceDataDir, 'dependency-manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw) as DependencyManifest;

  if (parsed.manifestVersion !== 1) {
    throw new Error(
      `Unknown manifest version ${parsed.manifestVersion} — expected 1`
    );
  }

  cachedManifest = parsed;
  return parsed;
}

/**
 * Get the manifest entry for an emulator on the current OS.
 * Returns null if the emulator is unknown or not available on this OS.
 */
export function getManifestEntry(
  emulatorId: string
): { entry: ManifestEmulatorEntry; platform: ManifestPlatformEntry } | null {
  const manifest = loadManifest();
  const entry = manifest.emulators[emulatorId];
  if (!entry) return null;

  const platform = entry.platforms[currentOs()];
  if (!platform) return null;

  return { entry, platform };
}

export type MismatchState =
  | { kind: 'ok'; installedVersion: string; pinnedVersion: string }
  | { kind: 'not-installed' }
  | { kind: 'out-of-date'; installed: string; pinned: string }
  | { kind: 'custom'; path: string }
  | { kind: 'unavailable' };

interface EmulatorConfigRow {
  id: string;
  os: string;
  name: string;
  path: string;
  installed_version: string | null;
  managed_install: 0 | 1;
}

let cachedMismatches: Map<string, MismatchState> | null = null;

/**
 * Rebuild the mismatch state cache for all four emulators on the current OS.
 * Call after any install/uninstall/config change.
 */
export function detectMismatches(): Map<string, MismatchState> {
  const manifest = loadManifest();
  const os = currentOs();
  const result = new Map<string, MismatchState>();

  for (const emulatorId of Object.keys(manifest.emulators)) {
    const entry = manifest.emulators[emulatorId];
    const platform = entry.platforms[os];

    if (!platform) {
      result.set(emulatorId, { kind: 'unavailable' });
      continue;
    }

    const row = db.prepare(
      'SELECT * FROM emulator_configs WHERE id = ? AND os = ?'
    ).get(emulatorId, os) as EmulatorConfigRow | undefined;

    if (!row || !row.path) {
      result.set(emulatorId, { kind: 'not-installed' });
      continue;
    }

    if (!row.managed_install) {
      result.set(emulatorId, { kind: 'custom', path: row.path });
      continue;
    }

    const installed = row.installed_version ?? '';
    const pinned = entry.version;

    if (installed === pinned) {
      result.set(emulatorId, {
        kind: 'ok',
        installedVersion: installed,
        pinnedVersion: pinned,
      });
    } else {
      result.set(emulatorId, {
        kind: 'out-of-date',
        installed,
        pinned,
      });
    }
  }

  cachedMismatches = result;
  return result;
}

/**
 * Get the cached mismatch state. Calls detectMismatches() on first access.
 */
export function getMismatches(): Map<string, MismatchState> {
  if (cachedMismatches === null) return detectMismatches();
  return cachedMismatches;
}
