import db from '../db.js';
import { resolveEmulatorPath, EmulatorNotInstalledError } from './dependencies.js';
import { currentOs } from './os-triple.js';

export type GameButton =
  | 'up' | 'down' | 'left' | 'right'
  | 'stick_up' | 'stick_down' | 'stick_left' | 'stick_right'
  | 'a' | 'b' | 'x' | 'y'
  | 'l' | 'r' | 'zl' | 'zr'
  | 'start' | 'select';

export type SystemType = 'gb' | 'gbc' | 'gba' | 'nds' | '3ds';

export interface EmulatorConfig {
  name: string;
  binary: string;
  args: (rom: string, save: string) => string[];
  windowSize: { width: number; height: number };
  keyMap: Partial<Record<GameButton, string>>;  // button → X11 key name for xdotool
  softResetCombo: string[];    // X11 keys to send simultaneously for soft reset
  fastForwardKey: string;      // X11 key for speed toggle
  saveExtension: string;
  analogModifierKey?: string;  // X11 key for circle pad walk (half-tilt) modifier
  resolutionScale?: number;    // internal rendering scale (e.g. 2 = 2x native)
}

// Internal: metadata only, no binary path — that's resolved at call time.
type BaseEmulatorConfig = Omit<EmulatorConfig, 'binary'>;

const MGBA_KEY_MAP: Partial<Record<GameButton, string>> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  a: 'x',
  b: 'z',
  l: 'a',
  r: 's',
  start: 'Return',
  select: 'BackSpace',
};

const MELONDS_KEY_MAP: Partial<Record<GameButton, string>> = {
  ...MGBA_KEY_MAP,
  x: 'w',
  y: 'q',
};

// D-pad and circle pad MUST use different keys — Azahar's input system
// consumes button key events before the analog_from_button engine sees them.
// D-pad: t/g/f/h (for registered items, ride pokemon)
// Circle pad (stick): r/v/b/n (for analog movement)
const LIME3DS_KEY_MAP: Partial<Record<GameButton, string>> = {
  up: 't',
  down: 'g',
  left: 'f',
  right: 'h',
  stick_up: 'r',
  stick_down: 'v',
  stick_left: 'b',
  stick_right: 'n',
  a: 'x',
  b: 'z',
  x: 'w',
  y: 's',
  l: 'a',
  r: 'd',
  zl: 'q',
  zr: 'e',
  start: 'Return',
  select: 'BackSpace',
};

const GB_SOFT_RESET: string[] = ['x', 'z', 'Return', 'BackSpace'];  // A+B+Start+Select
const DS_SOFT_RESET: string[] = ['a', 's', 'Return', 'BackSpace'];  // L+R+Start+Select (mGBA/melonDS keys)
const _3DS_SOFT_RESET: string[] = ['a', 'd', 'Return'];  // L+R+Start (LIME3DS key map)

const BASE_EMULATOR_CONFIGS: Record<string, BaseEmulatorConfig> = {
  'mgba-gb': {
    name: 'mGBA (GB/GBC)',
    args: (rom: string, _save: string) => ['-f', rom],
    windowSize: { width: 480, height: 432 },  // 160x144 * 3
    keyMap: MGBA_KEY_MAP,
    softResetCombo: GB_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'mgba': {
    name: 'mGBA (GBA)',
    args: (rom: string, _save: string) => ['-f', rom],
    windowSize: { width: 720, height: 480 },  // 240x160 * 3
    keyMap: MGBA_KEY_MAP,
    softResetCombo: GB_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'melonds': {
    name: 'melonDS (NDS)',
    args: (rom: string, _save: string) => [rom],
    windowSize: { width: 256, height: 384 },
    keyMap: MELONDS_KEY_MAP,
    softResetCombo: DS_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'azahar': {
    name: 'Azahar (3DS)',
    args: (rom: string, _save: string) => [rom],
    windowSize: { width: 400, height: 480 },  // base size at 1x — scaled by resolutionScale
    keyMap: LIME3DS_KEY_MAP,
    softResetCombo: _3DS_SOFT_RESET,  // L+R+Start
    fastForwardKey: 'F12',            // Turbo toggle — currently non-functional (Qt ignores synthetic X11 events for shortcuts)
    saveExtension: '.sav',
    analogModifierKey: 'c',
    resolutionScale: 1,
  },
};

const SYSTEM_TO_EMULATOR: Record<SystemType, string> = {
  gb: 'mgba-gb',
  gbc: 'mgba-gb',
  gba: 'mgba',
  nds: 'melonds',
  '3ds': 'azahar',
};

const GAME_TO_SYSTEM: Record<string, SystemType> = {
  // Gen 1 — GB
  'Pokemon Red': 'gb',
  'Pokemon Blue': 'gb',
  'Pokemon Yellow': 'gb',
  // Gen 2 — GBC
  'Pokemon Gold': 'gbc',
  'Pokemon Silver': 'gbc',
  'Pokemon Crystal': 'gbc',
  // Gen 3 — GBA
  'Pokemon Ruby': 'gba',
  'Pokemon Sapphire': 'gba',
  'Pokemon Emerald': 'gba',
  'Pokemon FireRed': 'gba',
  'Pokemon LeafGreen': 'gba',
  // Gen 4 — NDS
  'Pokemon Diamond': 'nds',
  'Pokemon Pearl': 'nds',
  'Pokemon Platinum': 'nds',
  'Pokemon HeartGold': 'nds',
  'Pokemon SoulSilver': 'nds',
  // Gen 5 — NDS
  'Pokemon Black': 'nds',
  'Pokemon White': 'nds',
  'Pokemon Black 2': 'nds',
  'Pokemon White 2': 'nds',
  // Gen 6 — 3DS
  'Pokemon X': '3ds',
  'Pokemon Y': '3ds',
  'Pokemon Omega Ruby': '3ds',
  'Pokemon Alpha Sapphire': '3ds',
  // Gen 7 — 3DS
  'Pokemon Sun': '3ds',
  'Pokemon Moon': '3ds',
  'Pokemon Ultra Sun': '3ds',
  'Pokemon Ultra Moon': '3ds',
};

// Map the internal config keys to the canonical emulator IDs in the DB.
// Two config keys (mgba-gb, mgba) share a single DB row because they're
// both served by the same mGBA binary.
const CONFIG_KEY_TO_EMULATOR_ID: Record<string, 'mgba' | 'bgb' | 'melonds' | 'azahar'> = {
  'mgba-gb': 'mgba',
  'mgba': 'mgba',
  'melonds': 'melonds',
  'azahar': 'azahar',
};

function resolveBinaryForKey(key: string): string {
  const emulatorId = CONFIG_KEY_TO_EMULATOR_ID[key];
  if (!emulatorId) {
    throw new Error(`No emulator ID mapping for config key: ${key}`);
  }

  const row = db.prepare(
    'SELECT path FROM emulator_configs WHERE id = ? AND os = ?'
  ).get(emulatorId, currentOs()) as { path: string } | undefined;

  if (!row || !row.path) {
    throw new EmulatorNotInstalledError();
  }

  return resolveEmulatorPath(row.path);
}

export function getEmulatorConfig(system: SystemType): EmulatorConfig {
  const key = SYSTEM_TO_EMULATOR[system];
  const baseConfig = BASE_EMULATOR_CONFIGS[key];
  if (!baseConfig) {
    throw new Error(`No emulator config found for system: ${system}`);
  }

  const binary = resolveBinaryForKey(key);

  return {
    ...baseConfig,
    binary,
  };
}

export function getSystemForGame(game: string): SystemType {
  // Try exact match first, then with "Pokemon " prefix
  const system = GAME_TO_SYSTEM[game] ?? GAME_TO_SYSTEM[`Pokemon ${game}`];
  if (!system) {
    throw new Error(`Unknown game: ${game}`);
  }
  return system;
}

/** Returns true for systems that can use the direct mgba-stream binary */
export function supportsDirectStream(system: SystemType): boolean {
  return system === 'gb' || system === 'gbc' || system === 'gba';
}

export function detectInstalledEmulators(): Record<string, boolean> {
  const os = currentOs();
  const rows = db.prepare('SELECT id, path FROM emulator_configs WHERE os = ?').all(os) as Array<{ id: string; path: string }>;
  const installed = new Map(rows.map(r => [r.id, r.path !== '']));

  const results: Record<string, boolean> = {};
  for (const configKey of Object.keys(BASE_EMULATOR_CONFIGS)) {
    const emulatorId = CONFIG_KEY_TO_EMULATOR_ID[configKey];
    if (!emulatorId) {
      results[configKey] = false;
      continue;
    }
    results[configKey] = installed.get(emulatorId) ?? false;
  }
  return results;
}
