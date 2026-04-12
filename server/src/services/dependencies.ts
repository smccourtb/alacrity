/**
 * Dependency service — emulator path resolution, install flow, mismatch detection.
 *
 * Currently only exports the `resolveEmulatorPath` helper. Install flow and
 * manifest loading land in Phase 4.
 */

import { join } from 'path';
import { paths } from '../paths.js';

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
