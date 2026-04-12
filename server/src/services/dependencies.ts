/**
 * Dependency service — emulator path resolution, install flow, mismatch detection.
 *
 * Currently only exports the `resolveEmulatorPath` helper. Install flow and
 * manifest loading land in Phase 4.
 */

import { readFileSync, writeFileSync, unlinkSync, renameSync, existsSync, mkdirSync, rmSync, chmodSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
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

// ─────────────────────────────────────────────────────────────────
// Install flow — download, verify, extract, finalize
// ─────────────────────────────────────────────────────────────────

export type InstallStage =
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'finalizing'
  | 'done'
  | 'error';

export interface InstallProgress {
  stage: InstallStage;
  bytesDownloaded?: number;
  bytesTotal?: number | null;
  percent?: number | null;
  message?: string;
  retryable?: boolean;
}

export type ProgressCallback = (progress: InstallProgress) => void;

export interface InstallResult {
  emulatorId: string;
  version: string;
  path: string; // the stored $DATA/ path, not the resolved path
}

const PROGRESS_EVENT_EVERY_BYTES = 256 * 1024;

/**
 * Download a file to a temporary location, stream-computing SHA256 as we go.
 * Returns the final hash.
 */
async function downloadAndHash(
  url: string,
  destPath: string,
  sizeBytes: number | null,
  onProgress: ProgressCallback
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = sizeBytes ?? (contentLength ? parseInt(contentLength, 10) : null);

  const hash = createHash('sha256');
  let bytesDownloaded = 0;
  let lastProgressAt = 0;

  const reader = response.body!.getReader();
  const chunks: Buffer[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const buf = Buffer.from(value);
    chunks.push(buf);
    hash.update(buf);
    bytesDownloaded += buf.length;

    if (bytesDownloaded - lastProgressAt >= PROGRESS_EVENT_EVERY_BYTES) {
      onProgress({
        stage: 'downloading',
        bytesDownloaded,
        bytesTotal: total,
        percent: total ? (bytesDownloaded / total) * 100 : null,
      });
      lastProgressAt = bytesDownloaded;
    }
  }

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, Buffer.concat(chunks));

  return hash.digest('hex');
}

/**
 * Spawn a command and capture stdout/stderr. Used by extractArchive for
 * bsdtar and DMG mount operations.
 */
async function runCommand(
  cmd: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ exitCode: code ?? -1, stderr, stdout }));
    proc.on('error', (err) => reject(err));
  });
}

/**
 * Extract the downloaded archive into a staging directory, dispatching on format.
 */
async function extractArchive(
  downloadedPath: string,
  stagingDir: string,
  platform: ManifestPlatformEntry,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress({ stage: 'extracting', percent: null });

  mkdirSync(stagingDir, { recursive: true });

  switch (platform.archive) {
    case 'appimage': {
      // AppImage: single file, just copy it into the staging dir
      const dest = join(stagingDir, platform.binaryRelPath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(downloadedPath, dest);
      if (platform.chmod) chmodSync(dest, 0o755);
      return;
    }

    case 'dmg': {
      if (process.platform !== 'darwin') {
        throw new Error(
          `DMG archive format is only supported on macOS (current platform: ${process.platform})`
        );
      }
      const volumeName = platform.dmgVolumeName;
      if (!volumeName) throw new Error('DMG entry missing dmgVolumeName');

      const mountResult = await runCommand('hdiutil', [
        'attach', downloadedPath,
        '-nobrowse', '-quiet',
      ]);
      if (mountResult.exitCode !== 0) {
        throw new Error(`hdiutil attach failed: ${mountResult.stderr}`);
      }

      try {
        const volumePath = `/Volumes/${volumeName}`;
        const cpResult = await runCommand('cp', ['-R', `${volumePath}/.`, stagingDir]);
        if (cpResult.exitCode !== 0) {
          throw new Error(`cp failed: ${cpResult.stderr}`);
        }
      } finally {
        await runCommand('hdiutil', ['detach', `/Volumes/${volumeName}`, '-quiet']);
      }
      return;
    }

    default: {
      // Universal: use bundled bsdtar (zip, tar.xz, 7z, etc.)
      const result = await runCommand(paths.binBsdtar, [
        '-xf', downloadedPath,
        '-C', stagingDir,
      ]);
      if (result.exitCode !== 0) {
        const firstLine = result.stderr.split('\n')[0];
        throw new Error(`bsdtar extraction failed: ${firstLine}`);
      }
      return;
    }
  }
}

/**
 * Install an emulator from the manifest.
 *
 * Flow: downloading → verifying → extracting → finalizing → done.
 * On any stage failure, cleans up temp files and throws.
 */
export async function installEmulator(
  emulatorId: string,
  onProgress: ProgressCallback
): Promise<InstallResult> {
  const manifestEntry = getManifestEntry(emulatorId);
  if (!manifestEntry) {
    throw new Error(`Unknown or unavailable emulator: ${emulatorId}`);
  }
  const { entry, platform } = manifestEntry;
  const os = currentOs();
  const versionedName = `${emulatorId}-${entry.version}-${os}`;

  const tmpDir = join(paths.emulatorsDir, '.tmp');
  const downloadPath = join(tmpDir, `${versionedName}.download`);
  const stagingDir = join(tmpDir, `${versionedName}.staging`);
  const finalDir = join(paths.emulatorsDir, versionedName);

  mkdirSync(tmpDir, { recursive: true });

  try {
    // ──── Stage: downloading ────
    onProgress({
      stage: 'downloading',
      bytesDownloaded: 0,
      bytesTotal: platform.sizeBytes ?? null,
      percent: 0,
    });
    const actualHash = await downloadAndHash(
      platform.downloadUrl,
      downloadPath,
      platform.sizeBytes ?? null,
      onProgress
    );

    // ──── Stage: verifying ────
    onProgress({ stage: 'verifying', percent: 100 });
    if (platform.sha256 !== 'PLACEHOLDER_FROZEN_AT_RELEASE' &&
        platform.sha256.toLowerCase() !== actualHash.toLowerCase()) {
      throw new Error(
        `SHA256 mismatch: expected ${platform.sha256}, got ${actualHash}`
      );
    }
    // Note: PLACEHOLDER checksums are accepted at runtime during dev. CI's
    // freeze-manifest check prevents shipping a release with placeholders.

    // ──── Stage: extracting ────
    await extractArchive(downloadPath, stagingDir, platform, onProgress);

    // ──── Stage: finalizing ────
    onProgress({ stage: 'finalizing', percent: 0 });
    const stagedBinary = join(stagingDir, platform.binaryRelPath);
    if (!existsSync(stagedBinary)) {
      throw new Error(
        `Install completed but binary not found at expected path: ${platform.binaryRelPath}. ` +
        `This is a bug in Alacrity; please report it.`
      );
    }
    if (platform.chmod) {
      chmodSync(stagedBinary, 0o755);
    }

    // Atomic commit: rename staging → final. If final already exists (reinstall),
    // remove it first.
    if (existsSync(finalDir)) rmSync(finalDir, { recursive: true, force: true });
    renameSync(stagingDir, finalDir);

    // Write DB row with $DATA/ sentinel for portable-safe paths.
    const storedPath = `$DATA/emulators/${versionedName}/${platform.binaryRelPath}`;
    db.prepare(`
      UPDATE emulator_configs
      SET path = ?, installed_version = ?, managed_install = 1
      WHERE id = ? AND os = ?
    `).run(storedPath, entry.version, emulatorId, os);

    // Rebuild mismatch cache
    detectMismatches();

    // Clean up the temp download file
    try { unlinkSync(downloadPath); } catch {}

    onProgress({ stage: 'done' });

    return {
      emulatorId,
      version: entry.version,
      path: storedPath,
    };
  } catch (err) {
    // Best-effort cleanup on any error
    try { if (existsSync(downloadPath)) unlinkSync(downloadPath); } catch {}
    try { if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true }); } catch {}
    throw err;
  }
}

/**
 * Uninstall an emulator: delete its final directory and clear the DB row's path.
 */
export function uninstallEmulator(emulatorId: string): void {
  const os = currentOs();
  const row = db.prepare(
    'SELECT installed_version FROM emulator_configs WHERE id = ? AND os = ?'
  ).get(emulatorId, os) as { installed_version: string | null } | undefined;

  if (row?.installed_version) {
    const versionedName = `${emulatorId}-${row.installed_version}-${os}`;
    const dir = join(paths.emulatorsDir, versionedName);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }

  db.prepare(`
    UPDATE emulator_configs
    SET path = '', installed_version = NULL, managed_install = 0
    WHERE id = ? AND os = ?
  `).run(emulatorId, os);

  detectMismatches();
}

/**
 * Clean up any leftover .tmp directories from crashed installs.
 * Called once at sidecar startup.
 */
export function cleanupTempInstalls(): void {
  const tmpDir = join(paths.emulatorsDir, '.tmp');
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });
}
