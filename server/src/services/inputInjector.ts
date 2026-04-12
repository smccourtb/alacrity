import { execFile, execFileSync } from 'child_process';
import { GameButton, EmulatorConfig, type SystemType } from './emulatorConfigs.js';

export interface InputEvent {
  key: GameButton;
  type: 'down' | 'up';
}

export interface TouchEvent {
  x: number;     // 0–320 (bottom screen width)
  y: number;     // 0–240 (bottom screen height)
  phase: 'start' | 'move' | 'end';
}

// 3DS bottom screen offset within the display (fullscreen vertical layout)
// At 1x: Top screen 400×240 at (0,0), Bottom 320×240 centered at (40, 240)
// Scale factor multiplies all coordinates
const BASE_BOTTOM_X = 40;
const BASE_BOTTOM_Y = 240;
const BASE_BOTTOM_W = 320;
const BASE_BOTTOM_H = 240;

export class InputInjector {
  private display: string;
  private config: EmulatorConfig;
  private scale: number;
  private system: SystemType;
  private currentSpeed = 1; // 1 = normal, 3 = FF toggle, 0 = unbound hold
  private holdingTab = false;
  private holdingModifier = false;

  constructor(display: string, config: EmulatorConfig, system: SystemType) {
    this.display = display;
    this.config = config;
    this.scale = config.resolutionScale ?? 1;
    this.system = system;
  }

  handleInput(event: InputEvent): void {
    const x11Key = this.config.keyMap[event.key];
    // console.log(`[input-injector] key=${event.key} x11Key=${x11Key} type=${event.type} display=${this.display}`);
    if (!x11Key) return;

    const action = event.type === 'down' ? 'keydown' : 'keyup';
    this.xdotool(action, x11Key);
  }

  /**
   * Simulate 3DS bottom-screen touch via xdotool mouse events.
   * Maps the touch lifecycle: start→mousedown, move→mousemove, end→mouseup.
   */
  handleTouch(event: TouchEvent): void {
    const s = this.scale;
    let px: number, py: number;

    if (this.system === 'nds') {
      // NDS: bottom screen fills full width, starts at y=192
      px = Math.round(Math.max(0, Math.min(256, event.x)) * s);
      py = Math.round((Math.max(0, Math.min(192, event.y)) + 192) * s);
    } else {
      // 3DS: bottom screen offset at (40, 240), size 320×240
      px = Math.round((Math.max(0, Math.min(BASE_BOTTOM_W, event.x)) + BASE_BOTTOM_X) * s);
      py = Math.round((Math.max(0, Math.min(BASE_BOTTOM_H, event.y)) + BASE_BOTTOM_Y) * s);
    }

    switch (event.phase) {
      case 'start':
        this.xdotoolAsync([
          'mousemove', '--screen', '0', String(px), String(py),
          'mousedown', '1',
        ]);
        break;
      case 'move':
        this.xdotoolAsync([
          'mousemove', '--screen', '0', String(px), String(py),
        ]);
        break;
      case 'end':
        this.xdotoolAsync(['mouseup', '1']);
        break;
    }
  }

  /** Hold or release the analog modifier key (walk = half-tilt on circle pad). */
  setAnalogModifier(active: boolean): void {
    const key = this.config.analogModifierKey;
    if (!key) return;
    if (active && !this.holdingModifier) {
      this.xdotool('keydown', key);
      this.holdingModifier = true;
    } else if (!active && this.holdingModifier) {
      this.xdotool('keyup', key);
      this.holdingModifier = false;
    }
  }

  sendSoftReset(): void {
    for (const key of this.config.softResetCombo) {
      this.xdotool('keydown', key);
    }
    setTimeout(() => {
      for (const key of this.config.softResetCombo) {
        this.xdotool('keyup', key);
      }
    }, 100);
  }

  setSpeed(multiplier: number): void {
    const ffKey = this.config.fastForwardKey;
    const wasFF = this.currentSpeed > 1 || this.currentSpeed === 0;
    const wantFF = multiplier > 1 || multiplier === 0;

    if (ffKey !== 'Tab') {
      // Azahar: toggle turbo via XTEST (python3+ctypes).
      // xdotool/xte both fail — Qt ignores their events for shortcuts.
      // Only XTEST via ctypes generates events Qt processes.
      if (wantFF !== wasFF) {
        this.xtestKey(0xffc9); // XK_F12
      }
    } else {
      // mGBA: shift+Tab toggles 3x, Tab hold = unbound
      if (this.holdingTab) {
        this.xdotool('keyup', 'Tab');
        this.holdingTab = false;
      }

      if (multiplier === 1) {
        if (wasFF && this.currentSpeed !== 0) {
          this.xdotool('key', 'shift+Tab');
        }
      } else if (multiplier === 0) {
        if (wasFF && this.currentSpeed !== 0) {
          this.xdotool('key', 'shift+Tab');
        }
        this.xdotool('keydown', 'Tab');
        this.holdingTab = true;
      } else {
        if (!wasFF) {
          this.xdotool('key', 'shift+Tab');
        }
      }
    }

    this.currentSpeed = multiplier;
  }

  private xdotool(action: string, key: string): void {
    this.xdotoolAsync([action, '--delay', '0', key]);
  }

  /**
   * Send a key via XTEST extension using python3+ctypes.
   * xdotool and xte both send events that Qt ignores for shortcuts.
   * XTEST via ctypes generates events Qt actually processes.
   */
  private xtestKey(keysym: number): void {
    const script = `
import ctypes, ctypes.util, time
x11 = ctypes.cdll.LoadLibrary(ctypes.util.find_library("X11"))
xtst = ctypes.cdll.LoadLibrary(ctypes.util.find_library("Xtst"))
d = x11.XOpenDisplay(b"${this.display}")
if d:
    kc = x11.XKeysymToKeycode(d, ${keysym})
    xtst.XTestFakeKeyEvent(d, kc, True, 0)
    x11.XFlush(d)
    time.sleep(0.05)
    xtst.XTestFakeKeyEvent(d, kc, False, 0)
    x11.XFlush(d)
    x11.XCloseDisplay(d)
`;
    execFile('python3', ['-c', script], { timeout: 2000 }, () => {});
  }

  /** Fire-and-forget xdotool — avoids blocking the event loop on every keypress. */
  private xdotoolAsync(args: string[]): void {
    execFile('xdotool', args, {
      env: { ...process.env, DISPLAY: this.display },
      timeout: 1000,
    }, () => {
      // Ignore errors — xdotool can fail if display is gone
    });
  }
}
