/**
 * OS triple detection for cross-OS portable mode.
 *
 * Alacrity uses a compact {os}-{arch} key to segregate per-OS state
 * (emulator installs, config paths, etc.) when running from a portable
 * USB stick shared across Linux/macOS/Windows machines.
 */

export type OsTriple = 'linux-x64' | 'macos-arm64' | 'windows-x64';

export function detectOsTriple(): OsTriple {
  const p = process.platform;
  const a = process.arch;
  if (p === 'linux' && a === 'x64') return 'linux-x64';
  if (p === 'darwin' && a === 'arm64') return 'macos-arm64';
  if (p === 'win32' && a === 'x64') return 'windows-x64';
  throw new Error(
    `Unsupported platform: ${p}-${a}. Alacrity supports linux-x64, macos-arm64, windows-x64.`
  );
}

/**
 * Cached triple — computed once on first call, returned on subsequent calls.
 * The OS doesn't change during a process lifetime.
 */
let cachedTriple: OsTriple | null = null;
export function currentOs(): OsTriple {
  if (cachedTriple === null) cachedTriple = detectOsTriple();
  return cachedTriple;
}
