import { execSync } from 'child_process';
import { paths } from '../paths.js';

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

const MGBA_BINARY = `${process.env.HOME}/mgba/build/qt/mgba-qt`;

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

const EMULATOR_CONFIGS: Record<string, EmulatorConfig> = {
  'mgba-gb': {
    name: 'mGBA (GB/GBC)',
    binary: MGBA_BINARY,
    args: (rom: string, _save: string) => ['-f', rom],
    windowSize: { width: 480, height: 432 },  // 160x144 * 3
    keyMap: MGBA_KEY_MAP,
    softResetCombo: GB_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'mgba': {
    name: 'mGBA (GBA)',
    binary: MGBA_BINARY,
    args: (rom: string, _save: string) => ['-f', rom],
    windowSize: { width: 720, height: 480 },  // 240x160 * 3
    keyMap: MGBA_KEY_MAP,
    softResetCombo: GB_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'melonds': {
    name: 'melonDS (NDS)',
    binary: paths.melonds,
    args: (rom: string, _save: string) => [rom],
    windowSize: { width: 256, height: 384 },
    keyMap: MELONDS_KEY_MAP,
    softResetCombo: DS_SOFT_RESET,
    fastForwardKey: 'Tab',
    saveExtension: '.sav',
  },
  'azahar': {
    name: 'Azahar (3DS)',
    binary: paths.azahar,
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

export function getEmulatorConfig(system: SystemType): EmulatorConfig {
  const key = SYSTEM_TO_EMULATOR[system];
  const config = EMULATOR_CONFIGS[key];
  if (!config) {
    throw new Error(`No emulator config found for system: ${system}`);
  }
  return config;
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
  const results: Record<string, boolean> = {};
  for (const [key, config] of Object.entries(EMULATOR_CONFIGS)) {
    try {
      execSync(`which ${config.binary} 2>/dev/null || test -f ${config.binary}`, { stdio: 'ignore' });
      results[key] = true;
    } catch {
      results[key] = false;
    }
  }
  return results;
}
