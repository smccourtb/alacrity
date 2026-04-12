import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { EmulatorConfig } from './emulatorConfigs.js';
import { paths } from '../paths.js';

// ---------------------------------------------------------------------------
// X11 key name → Qt::Key enum value mapping
// melonDS uses Qt key codes in its TOML config (not SDL scancodes)
// ---------------------------------------------------------------------------

const X11_TO_QT_KEY: Record<string, number> = {
  // Letters (Qt::Key_A = 0x41 = 65, etc.)
  a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72,
  i: 73, j: 74, k: 75, l: 76, m: 77, n: 78, o: 79, p: 80,
  q: 81, r: 82, s: 83, t: 84, u: 85, v: 86, w: 87, x: 88,
  y: 89, z: 90,
  // Arrow keys (Qt::Key_Left = 0x01000012, etc.)
  Left: 16777234, Up: 16777235, Right: 16777236, Down: 16777237,
  // Special keys
  Return: 16777220, BackSpace: 16777219, space: 32, Tab: 16777217,
  Escape: 16777216,
};

const PROJECT_ROOT = paths.resourcesDir;

/**
 * Pre-seed melonDS TOML configuration for headless streaming.
 *
 * Sets keybindings from the EmulatorConfig keyMap, configures vertical
 * screen layout, and sets BIOS/firmware paths if available.
 *
 * Returns the configDir path (to be set as XDG_CONFIG_HOME).
 */
export interface MelonDSConfigOptions {
  /** Enable GDB stub for memory reading (RNG hunting). Default: false */
  enableGdb?: boolean;
  /** GDB ARM9 port. Default: 3333 */
  gdbPort?: number;
}

export function seedMelonDSConfig(
  tempDir: string,
  config: EmulatorConfig,
  options: MelonDSConfigOptions = {},
): string {
  const configDir = join(tempDir, 'melonds-config');
  const melondsDir = join(configDir, 'melonDS');
  mkdirSync(melondsDir, { recursive: true });

  const km = config.keyMap;
  const qt = (x11Key: string | undefined): number =>
    x11Key ? (X11_TO_QT_KEY[x11Key] ?? -1) : -1;

  // BIOS/firmware paths (optional — melonDS uses HLE if missing)
  const biosDir = join(PROJECT_ROOT, 'tools', 'melonds');
  const bios7Path = join(biosDir, 'bios7.bin');
  const bios9Path = join(biosDir, 'bios9.bin');
  const firmwarePath = join(biosDir, 'firmware.bin');
  const hasBios = existsSync(bios9Path) && existsSync(bios7Path);

  // Top-level keys must come before any table sections (TOML spec)
  const toml = `# melonDS config — auto-generated for Alacrity
LimitFPS = true
TargetFPS = 60.0

[Audio]
Volume = 256

[DS]
BIOS9Path = "${hasBios ? bios9Path : ''}"
BIOS7Path = "${hasBios ? bios7Path : ''}"
FirmwarePath = "${existsSync(firmwarePath) ? firmwarePath : ''}"
ExternalBIOSEnable = ${hasBios}

[Instance0]
JoystickID = 0

[Instance0.Keyboard]
A = ${qt(km.a)}
B = ${qt(km.b)}
X = ${qt(km.x)}
Y = ${qt(km.y)}
Left = ${qt(km.left)}
Right = ${qt(km.right)}
Up = ${qt(km.up)}
Down = ${qt(km.down)}
L = ${qt(km.l)}
R = ${qt(km.r)}
Start = ${qt(km.start)}
Select = ${qt(km.select)}
HK_FastForward = ${qt(config.fastForwardKey)}
HK_FastForwardToggle = -1
HK_FullscreenToggle = -1
HK_Pause = -1
HK_Reset = -1
HK_Mic = -1
HK_Lid = -1

[Instance0.Window0]
ScreenLayout = 0
ScreenGap = 0
ShowOSD = false
${options.enableGdb ? `
[Gdb]
Enabled = true

[Gdb.ARM9]
Port = ${options.gdbPort ?? 3333}
BreakOnStartup = false

[Gdb.ARM7]
Port = ${(options.gdbPort ?? 3333) + 1}
BreakOnStartup = false
` : ''}
`;

  writeFileSync(join(melondsDir, 'melonDS.toml'), toml);

  // Qt stylesheet to hide the menu bar for headless streaming
  const qss = 'QMenuBar { max-height: 0px; border: none; padding: 0; margin: 0; }';
  writeFileSync(join(melondsDir, 'stream.qss'), qss);

  return configDir;
}
