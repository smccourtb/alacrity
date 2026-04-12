import { mkdirSync, copyFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { checksumFile } from './sessionManager.js';
import type { EmulatorConfig } from './emulatorConfigs.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaveBridge {
  dataDir: string;
  savBinPath: string;
  originalChecksum: string;
}

// ---------------------------------------------------------------------------
// Title ID map — derived from Checkpoint backup folder names
// Low half of the title ID, zero-padded to 8 hex chars (upper half is always
// 00040000 for 3DS retail titles).
// ---------------------------------------------------------------------------

const TITLE_ID_LOW: Record<string, string> = {
  // Gen 6
  'Pokemon X':              '00055d00',
  'X':                      '00055d00',
  'Pokemon Y':              '00055e00',
  'Y':                      '00055e00',
  'Pokemon Omega Ruby':     '0011c400',
  'Omega Ruby':             '0011c400',
  'Pokemon Alpha Sapphire': '0011c500',
  'Alpha Sapphire':         '0011c500',
  // Gen 7
  'Pokemon Sun':            '00164800',
  'Sun':                    '00164800',
  'Pokemon Moon':           '00175e00',
  'Moon':                   '00175e00',
  'Pokemon Ultra Sun':      '001b5000',
  'Ultra Sun':              '001b5000',
  'Pokemon Ultra Moon':     '001b5100',
  'Ultra Moon':             '001b5100',
};

// Upper half for 3DS retail titles
const TITLE_ID_HIGH = '00040000';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the game name maps to a known 3DS title ID.
 */
export function needs3dsSaveBridge(game: string): boolean {
  return game in TITLE_ID_LOW;
}

/**
 * Set up the Azahar directory structure so the emulator finds the save.
 *
 * Azahar (Citra fork) looks for saves at:
 *   <XDG_DATA_HOME>/azahar-emu/sdmc/Nintendo 3DS/000…0/000…0/title/<high>/<low>/data/00000001/main
 *
 * We create this tree inside `tempDir`, copy the Checkpoint `main` file into
 * it, and return the paths + checksum so the caller can set XDG_DATA_HOME
 * and later detect changes.
 */
export function bridgeSaveIn(
  tempDir: string,
  savePath: string,
  game: string,
): SaveBridge | null {
  const titleIdLow = TITLE_ID_LOW[game];
  if (!titleIdLow) return null;

  const zeros = '00000000000000000000000000000000';
  const dataDir = join(tempDir, 'azahar-data');
  const savDir = join(
    dataDir,
    'azahar-emu', 'sdmc', 'Nintendo 3DS',
    zeros, zeros,
    'title', TITLE_ID_HIGH, titleIdLow,
    'data', '00000001',
  );
  mkdirSync(savDir, { recursive: true });

  const savBinPath = join(savDir, 'main');
  copyFileSync(savePath, savBinPath);

  // Azahar requires a 16-byte metadata file alongside the save directory.
  // Without it, the emulator ignores the save and creates a fresh one.
  const metadataPath = join(dirname(savDir), '00000001.metadata');
  const metadata = Buffer.alloc(16);
  metadata.writeUInt32LE(0x00040000, 0); // constant observed from Azahar
  metadata.writeUInt32LE(0x00000001, 4);
  metadata.writeUInt32LE(0x00000001, 8);
  metadata.writeUInt32LE(0x00000001, 12);
  writeFileSync(metadataPath, metadata);

  const originalChecksum = checksumFile(savBinPath);

  return { dataDir, savBinPath, originalChecksum };
}

/**
 * Check whether Azahar has modified the bridged save since we placed it.
 */
export function hasSaveBridgeChanged(bridge: SaveBridge): boolean {
  if (!existsSync(bridge.savBinPath)) return false;
  return checksumFile(bridge.savBinPath) !== bridge.originalChecksum;
}

/**
 * Copy the (potentially modified) sav.bin back to the destination path.
 */
export function bridgeSaveOut(bridge: SaveBridge, destPath: string): void {
  copyFileSync(bridge.savBinPath, destPath);
}

// ---------------------------------------------------------------------------
// Azahar qt-config.ini seeding for headless streaming
// ---------------------------------------------------------------------------

// Map xdotool X11 key names → Qt::Key enum values
const X11_TO_QT_KEY: Record<string, number> = {
  // Letters (Qt::Key_A = 0x41 = 65, etc.)
  a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72,
  i: 73, j: 74, k: 75, l: 76, m: 77, n: 78, o: 79, p: 80,
  q: 81, r: 82, s: 83, t: 84, u: 85, v: 86, w: 87, x: 88,
  y: 89, z: 90,
  // Numbers
  '1': 49, '2': 50, '3': 51, '4': 52, '5': 53,
  '6': 54, '7': 55, '8': 56, '9': 57, '0': 48,
  // Arrow keys (Qt::Key_Left = 0x01000012, etc.)
  Left: 16777234, Up: 16777235, Right: 16777236, Down: 16777237,
  // Special keys
  Return: 16777220, BackSpace: 16777219, space: 32, Tab: 16777217,
  Escape: 16777216,
};

/**
 * Encode a value for Azahar's circle_pad / c_stick config format.
 * Uses $ as escape: $0 = comma, $1 = colon.
 */
function encodeAnalogKey(code: number): string {
  return `code$0${code}$1engine$0keyboard`;
}

/**
 * Pre-seed Azahar's qt-config.ini for headless streaming.
 *
 * Sets fullscreen mode, hides all Qt chrome (menu, toolbar, statusbar),
 * configures keybindings to match the provided EmulatorConfig keyMap,
 * and disables pause-on-background.
 *
 * Returns the configDir path (to be set as XDG_CONFIG_HOME).
 */
export function seedAzaharConfig(
  tempDir: string,
  config: EmulatorConfig,
): string {
  const configDir = join(tempDir, 'azahar-config');
  const azaharConfigDir = join(configDir, 'azahar-emu');
  mkdirSync(azaharConfigDir, { recursive: true });

  // Convert our keyMap to Qt key codes
  const km = config.keyMap;
  const qt = (x11Key: string | undefined): number =>
    x11Key ? (X11_TO_QT_KEY[x11Key] ?? 0) : 0;

  const buttonA = qt(km.a);
  const buttonB = qt(km.b);
  const buttonX = qt(km.x);
  const buttonY = qt(km.y);
  const buttonUp = qt(km.up);
  const buttonDown = qt(km.down);
  const buttonLeft = qt(km.left);
  const buttonRight = qt(km.right);
  const stickUp = qt(km.stick_up) || buttonUp;
  const stickDown = qt(km.stick_down) || buttonDown;
  const stickLeft = qt(km.stick_left) || buttonLeft;
  const stickRight = qt(km.stick_right) || buttonRight;
  const buttonL = qt(km.l);
  const buttonR = qt(km.r);
  const buttonZL = qt(km.zl);
  const buttonZR = qt(km.zr);
  const buttonStart = qt(km.start);
  const buttonSelect = qt(km.select);

  // Modifier key for walk (half-tilt analog) — must not conflict with any button
  const modifierCode = config.analogModifierKey
    ? qt(config.analogModifierKey)
    : 67; // 'c' key fallback

  // Circle pad uses SEPARATE keys from D-pad — Azahar consumes button key
  // events before the analog_from_button engine, so sharing keys doesn't work
  const circlePad = [
    `down:${encodeAnalogKey(stickDown)}`,
    'engine:analog_from_button',
    `left:${encodeAnalogKey(stickLeft)}`,
    `modifier:${encodeAnalogKey(modifierCode)}`,
    'modifier_scale:0.500000',
    `right:${encodeAnalogKey(stickRight)}`,
    `up:${encodeAnalogKey(stickUp)}`,
  ].join(',');

  // C-stick (used for camera in some 3DS games, less critical)
  const cStick = [
    `down:${encodeAnalogKey(75)}`,   // K
    'engine:analog_from_button',
    `left:${encodeAnalogKey(74)}`,   // J
    `modifier:${encodeAnalogKey(modifierCode)}`,
    'modifier_scale:0.500000',
    `right:${encodeAnalogKey(76)}`,  // L
    `up:${encodeAnalogKey(73)}`,     // I
  ].join(',');

  const ini = `[Controls]
profile=0
profiles\\1\\button_a="code:${buttonA},engine:keyboard"
profiles\\1\\button_b="code:${buttonB},engine:keyboard"
profiles\\1\\button_x="code:${buttonX},engine:keyboard"
profiles\\1\\button_y="code:${buttonY},engine:keyboard"
profiles\\1\\button_up="code:${buttonUp},engine:keyboard"
profiles\\1\\button_down="code:${buttonDown},engine:keyboard"
profiles\\1\\button_left="code:${buttonLeft},engine:keyboard"
profiles\\1\\button_right="code:${buttonRight},engine:keyboard"
profiles\\1\\button_l="code:${buttonL},engine:keyboard"
profiles\\1\\button_r="code:${buttonR},engine:keyboard"
profiles\\1\\button_zl="code:${buttonZL},engine:keyboard"
profiles\\1\\button_zr="code:${buttonZR},engine:keyboard"
profiles\\1\\button_start="code:${buttonStart},engine:keyboard"
profiles\\1\\button_select="code:${buttonSelect},engine:keyboard"
profiles\\1\\button_debug="code:79,engine:keyboard"
profiles\\1\\button_gpio14="code:80,engine:keyboard"
profiles\\1\\button_home="code:66,engine:keyboard"
profiles\\1\\button_power="code:86,engine:keyboard"
profiles\\1\\circle_pad="${circlePad}"
profiles\\1\\c_stick="${cStick}"
profiles\\1\\motion_device="engine:motion_emu"
profiles\\1\\name=default
profiles\\1\\touch_device="engine:emu_window"
profiles\\1\\touch_from_button_map=0
profiles\\1\\udp_input_address=127.0.0.1
profiles\\1\\udp_input_port=26760
profiles\\size=1
touch_from_button_maps\\1\\entries\\size=0
touch_from_button_maps\\1\\name=default
touch_from_button_maps\\size=1
use_artic_base_controller=false

[Layout]
layout_option=0
screen_gap=0
filter_mode=true
render_3d=0
resolution_factor=${config.resolutionScale ?? 1}
swap_screen=false
upright_screen=false
screen_top_stretch=false
screen_bottom_stretch=false
screen_top_leftright_padding=0
screen_top_topbottom_padding=0
screen_bottom_leftright_padding=0
screen_bottom_topbottom_padding=0

[Renderer]
resolution_factor=${config.resolutionScale ?? 1}
use_hw_renderer=true
use_hw_shader=true
use_shader_jit=true

[Core]
frame_limit=100
turbo_limit=400

[UI]
fullscreen=true
showFilterBar=false
showStatusBar=false
displayTitleBars=false
singleWindowMode=true
hideInactiveMouse=true
confirmClose=false
pauseWhenInBackground=false
firstStart=false
muteWhenInBackground=false
Paths\\gamedirs\\size=0
Shortcuts\\Main%20Window\\Toggle%20Turbo%20Mode\\KeySeq=F12
Shortcuts\\Main%20Window\\Toggle%20Turbo%20Mode\\Context=1
Shortcuts\\Main%20Window\\Swap%20Screens\\KeySeq=
Shortcuts\\Main%20Window\\Swap%20Screens\\Context=1

[Debugging]
enable_rpc_server=true
enable_rpc_server\\default=false
gdbstub_port=24689
gdbstub_port\\default=true

[Miscellaneous]
check_for_update_on_start=false

[WebService]
citra_token=
citra_username=
web_api_url=https://api.citra-emu.org
`;

  writeFileSync(join(azaharConfigDir, 'qt-config.ini'), ini);

  return configDir;
}
