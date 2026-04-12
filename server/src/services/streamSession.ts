import { spawn, execSync, ChildProcess } from 'child_process';
import { symlinkSync, copyFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import {
  getEmulatorConfig,
  getSystemForGame,
  type SystemType,
  type EmulatorConfig,
} from './emulatorConfigs.js';
import { InputInjector, type InputEvent } from './inputInjector.js';
import {
  createTempDir,
  checksumFile,
  resolveSessionSave,
  cleanupTempDir,
} from './sessionManager.js';
import { bridgeSaveIn, hasSaveBridgeChanged, seedAzaharConfig, type SaveBridge } from './saveBridge3ds.js';
import { seedMelonDSConfig } from './melondsConfig.js';
import { createRelaySession, stopRelaySession } from './mediamtxManager.js';
import { registerProcess, gracefulKill } from './processRegistry.js';
import type { DirectStreamSession } from './directStreamSession.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamSessionInfo {
  id: string;
  game: string;
  system: SystemType;
  status: 'starting' | 'running' | 'stopped';
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Module-level session store (accepts both StreamSession and DirectStreamSession)
// ---------------------------------------------------------------------------

export type AnyStreamSession = StreamSession | DirectStreamSession;

const sessions = new Map<string, AnyStreamSession>();

export function getSession(id: string): AnyStreamSession | undefined {
  return sessions.get(id);
}

export function getAllSessions(): StreamSessionInfo[] {
  return Array.from(sessions.values()).map((s) => s.info);
}

export function registerSession(session: AnyStreamSession): void {
  sessions.set(session.id, session);
}

export function removeSession(id: string): void {
  sessions.delete(id);
}

// ---------------------------------------------------------------------------
// Display number allocator
// ---------------------------------------------------------------------------

let nextDisplayNumber = 199;

function allocateDisplay(): string {
  nextDisplayNumber += 1;
  return `:${nextDisplayNumber}`;
}

function cleanDisplayLock(display: string): void {
  const num = display.replace(':', '');
  try { require('fs').unlinkSync(`/tmp/.X${num}-lock`); } catch {}
  try { require('fs').unlinkSync(`/tmp/.X11-unix/X${num}`); } catch {}
}

// ---------------------------------------------------------------------------
// Virtual display — Xorg+dummy (smoother) with Xvfb fallback
// ---------------------------------------------------------------------------

const XORG_BINARY = '/usr/lib/xorg/Xorg';
const DUMMY_DRIVER = '/usr/lib/xorg/modules/drivers/dummy_drv.so';

let _hasDummyDriver: boolean | null = null;
function hasDummyDriver(): boolean {
  if (_hasDummyDriver === null) {
    _hasDummyDriver = existsSync(DUMMY_DRIVER) && existsSync(XORG_BINARY);
  }
  return _hasDummyDriver;
}

function writeDummyXorgConf(tempDir: string): string {
  const confDir = join(tempDir, 'xorg');
  mkdirSync(confDir, { recursive: true });
  const confPath = join(confDir, 'xorg.conf');
  // Dummy driver defaults to 1024x768 — we use xrandr after startup
  // to set the exact resolution we need
  writeFileSync(confPath, `
Section "Device"
  Identifier "dummy"
  Driver "dummy"
  VideoRam 256000
EndSection
Section "Screen"
  Identifier "screen"
  Device "dummy"
  DefaultDepth 24
EndSection
Section "ServerLayout"
  Identifier "layout"
  Screen "screen"
EndSection
Section "ServerFlags"
  Option "DontVTSwitch" "true"
  Option "AllowMouseOpenFail" "true"
  Option "PciForceNone" "true"
  Option "AutoEnableDevices" "false"
  Option "AutoAddDevices" "false"
EndSection
`);
  return confPath;
}

/** Set the Xorg+dummy display to the exact resolution we need via xrandr. */
function setDisplayResolution(display: string, width: number, height: number): void {
  const env = { ...process.env, DISPLAY: display };
  const opts = { encoding: 'utf-8' as const, timeout: 3000, env };
  const mode = `${width}x${height}`;
  try {
    // Create a zero-bandwidth modeline (dummy driver doesn't care about timings)
    execSync(`xrandr --newmode "${mode}" 0 ${width} ${width} ${width} ${width} ${height} ${height} ${height} ${height}`, opts);
    execSync(`xrandr --addmode DUMMY0 "${mode}"`, opts);
    execSync(`xrandr --output DUMMY0 --mode "${mode}"`, opts);
  } catch {
    // Mode may already exist from a previous session on the same display number
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// StreamSession
// ---------------------------------------------------------------------------

export class StreamSession {
  readonly id: string;
  readonly game: string;
  readonly system: SystemType;

  private _status: 'starting' | 'running' | 'stopped' = 'starting';
  private readonly startedAt: string;

  // Emulator config
  private readonly config: EmulatorConfig;
  private readonly display: string;
  private readonly sinkName: string;

  // Temp dir & save tracking
  private readonly tempDir: string;
  private readonly tempRomPath: string;
  private tempSavePath: string;
  private readonly originalSavePath: string;
  private originalChecksum: string;
  private saveBridge: SaveBridge | null = null;
  private configDir: string | null = null;

  // Child processes
  private xvfbProcess: ChildProcess | null = null;
  private wmProcess: ChildProcess | null = null;
  private emulatorProcess: ChildProcess | null = null;
  private ffmpegVideo: ChildProcess | null = null;
  private ffmpegAudio: ChildProcess | null = null;
  private pulseModuleIndex: string | null = null;

  // Input
  private inputInjector: InputInjector | null = null;

  constructor(game: string, romPath: string, savePath?: string) {
    this.id = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.game = game;
    this.system = getSystemForGame(game);
    this.config = getEmulatorConfig(this.system);
    this.display = allocateDisplay();
    this.sinkName = `stream_sink_${this.id}`;
    this.startedAt = new Date().toISOString();

    this.tempDir = createTempDir(this.id);

    const romBasename = basename(romPath);
    const romExt = extname(romBasename);
    const romNameNoExt = basename(romBasename, romExt);

    this.tempRomPath = join(this.tempDir, romBasename);
    this.originalSavePath = savePath || '';

    symlinkSync(romPath, this.tempRomPath);

    if (this.system === '3ds') {
      if (savePath) {
        // 3DS: bridge the Checkpoint save into Azahar's directory structure
        const bridge = bridgeSaveIn(this.tempDir, savePath, this.game);
        if (bridge) {
          this.saveBridge = bridge;
          this.tempSavePath = bridge.savBinPath;
          this.originalChecksum = bridge.originalChecksum;
        } else {
          // Fallback: treat like a normal save
          this.tempSavePath = join(this.tempDir, `${romNameNoExt}${this.config.saveExtension}`);
          copyFileSync(savePath, this.tempSavePath);
          this.originalChecksum = checksumFile(this.tempSavePath);
        }
      } else {
        this.tempSavePath = join(this.tempDir, `${romNameNoExt}${this.config.saveExtension}`);
        this.originalChecksum = '';
      }
    } else {
      this.tempSavePath = join(this.tempDir, `${romNameNoExt}${this.config.saveExtension}`);
      if (savePath) {
        copyFileSync(savePath, this.tempSavePath);
        this.originalChecksum = checksumFile(this.tempSavePath);
      } else {
        // New game — no save file yet, emulator will create one
        this.originalChecksum = '';
      }
    }
  }

  get status(): 'starting' | 'running' | 'stopped' {
    return this._status;
  }

  get info(): StreamSessionInfo {
    return {
      id: this.id,
      game: this.game,
      system: this.system,
      status: this._status,
      startedAt: this.startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    const scale = this.config.resolutionScale ?? 1;
    const displayWidth = this.config.windowSize.width * scale;
    const displayHeight = this.config.windowSize.height * scale;

    try {
    // 1. Start virtual display
    if (hasDummyDriver()) {
      const confPath = writeDummyXorgConf(this.tempDir);
      const logFile = join(this.tempDir, 'xorg.log');
      console.log(`[${this.id}] Using Xorg+dummy display=${this.display}`);
      this.xvfbProcess = spawn(XORG_BINARY, [
        this.display, '-noreset', '-ac',
        '-config', confPath, '-logfile', logFile,
      ], { stdio: 'ignore' });
    } else {
      console.log(`[${this.id}] Using Xvfb display=${this.display}`);
      this.xvfbProcess = spawn('Xvfb', [
        this.display,
        '-screen', '0', `${displayWidth}x${displayHeight}x24`,
        '-ac',
      ], { stdio: 'ignore' });
    }
    registerProcess(this.xvfbProcess, `Xvfb[${this.id}]`);
    this.xvfbProcess.on('error', (err) => {
      console.error(`[${this.id}] Display error:`, err.message);
    });

    await this.waitForDisplay();

    // Set the exact resolution via xrandr (Xorg+dummy defaults to 1024x768)
    if (hasDummyDriver()) {
      setDisplayResolution(this.display, displayWidth, displayHeight);
    }

    // 2. PulseAudio null sink
    try {
      const result = execSync(
        `pactl load-module module-null-sink sink_name=${this.sinkName} sink_properties=device.description=${this.sinkName}`,
        { encoding: 'utf-8' },
      );
      this.pulseModuleIndex = result.trim();
    } catch (err) {
      console.error(`[${this.id}] PulseAudio sink creation failed:`, err);
    }

    // 3. Start a minimal window manager (matchbox auto-maximizes all windows
    //    to fill the display with no decorations — essential for headless streaming
    //    since Qt fullscreen requests need a WM to work)
    this.wmProcess = spawn('matchbox-window-manager', ['-use_titlebar', 'no', '-use_desktop_mode', 'plain'], {
      env: { ...process.env, DISPLAY: this.display },
      stdio: 'ignore',
    });
    registerProcess(this.wmProcess, `WM[${this.id}]`);
    this.wmProcess.on('error', (err) => {
      console.error(`[${this.id}] WM error (matchbox):`, err.message);
    });
    // Give WM a moment to start before launching the emulator
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 4. Start emulator on the virtual display
    let emuArgs = this.config.args(this.tempRomPath, this.tempSavePath);
    const emuEnv = { ...process.env };
    emuEnv.DISPLAY = this.display;
    emuEnv.PULSE_SINK = this.sinkName;
    emuEnv.QT_QPA_PLATFORM = 'xcb';
    delete emuEnv.WAYLAND_DISPLAY;
    if (this.saveBridge) {
      emuEnv.XDG_DATA_HOME = this.saveBridge.dataDir;
    }
    if (this.system === '3ds') {
      this.configDir = seedAzaharConfig(this.tempDir, this.config);
      emuEnv.XDG_CONFIG_HOME = this.configDir;
    } else if (this.system === 'nds') {
      this.configDir = seedMelonDSConfig(this.tempDir, this.config);
      emuEnv.XDG_CONFIG_HOME = this.configDir;
      // Hide menu bar via Qt stylesheet for clean streaming
      const qssPath = join(this.configDir, 'melonDS', 'stream.qss');
      emuArgs = ['-stylesheet', qssPath, ...emuArgs];
    }

    this.emulatorProcess = spawn(this.config.binary, emuArgs, {
      env: emuEnv,
      stdio: 'ignore',
    });
    registerProcess(this.emulatorProcess, `Emulator[${this.id}]`);
    this.emulatorProcess.on('error', (err) => {
      console.error(`[${this.id}] Emulator error:`, err.message);
    });

    // 5. Wait for emulator window, focus it, and hide the cursor
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const env = { DISPLAY: this.display };
      // Find the main emulator window (largest visible window, or by name)
      const windowId = execSync(
        `xdotool search --onlyvisible --name "" | head -1`,
        { encoding: 'utf-8', timeout: 3000, env: { ...process.env, ...env } },
      ).trim();
      if (windowId) {
        execSync(`xdotool windowfocus --sync ${windowId}`, {
          timeout: 2000, env: { ...process.env, ...env },
        });
        console.log(`[${this.id}] Focused emulator window ${windowId}`);
      }
      // For melonDS: find the main window by title and force it to fill the display
      // (matchbox may not auto-maximize Qt apps with menu bars correctly)
      if (this.system === 'nds') {
        try {
          const melonWinId = execSync(
            `xdotool search --name "melonDS"`,
            { encoding: 'utf-8', timeout: 3000, env: { ...process.env, ...env } },
          ).trim().split('\n')[0];
          if (melonWinId) {
            execSync(`xdotool windowmove --sync ${melonWinId} 0 0`, {
              timeout: 2000, env: { ...process.env, ...env },
            });
            execSync(`xdotool windowsize --sync ${melonWinId} ${displayWidth} ${displayHeight}`, {
              timeout: 2000, env: { ...process.env, ...env },
            });
            execSync(`xdotool windowfocus --sync ${melonWinId}`, {
              timeout: 2000, env: { ...process.env, ...env },
            });
            console.log(`[${this.id}] Resized melonDS window ${melonWinId} to ${displayWidth}x${displayHeight}`);
          }
        } catch (err) {
          console.error(`[${this.id}] melonDS window resize failed:`, err);
        }
      }
      // Park cursor off-screen so it doesn't appear in the stream
      execSync(`xdotool mousemove ${displayWidth + 100} ${displayHeight + 100}`, {
        timeout: 2000, env: { ...process.env, ...env },
      });
    } catch (err) {
      console.error(`[${this.id}] Window setup failed:`, err);
    }

    // 6. Create relay session — get RTP ports for FFmpeg
    const { videoPort, audioPort } = await createRelaySession(this.id);
    console.log(`[${this.id}] Relay session created — video:${videoPort} audio:${audioPort}`);

    // 7. FFmpeg video — raw RTP to relay (minimal latency)
    // 3DS uses higher bitrate to avoid compression artifacts on 3D battle models
    const videoBitrate = this.system === '3ds' ? '2M' : '800k';
    this.ffmpegVideo = spawn('ffmpeg', [
      '-fflags', '+nobuffer+flush_packets',
      '-flags', 'low_delay',
      '-probesize', '32',
      '-analyzeduration', '0',
      '-f', 'x11grab',
      '-framerate', '30',
      '-video_size', `${displayWidth}x${displayHeight}`,
      '-i', this.display,
      '-c:v', 'libvpx',
      '-b:v', videoBitrate,
      '-quality', 'realtime',
      '-deadline', 'realtime',
      '-cpu-used', '8',
      '-lag-in-frames', '0',
      '-error-resilient', '1',
      '-g', '10',             // keyframe every ~333ms (was 30 = 1s)
      '-auto-alt-ref', '0',   // disable alt ref frames for lower latency
      '-f', 'rtp',
      '-payload_type', '96',
      `rtp://127.0.0.1:${videoPort}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    this.ffmpegVideo.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[${this.id}] FFmpeg video: ${msg.split('\n').pop()}`);
    });
    registerProcess(this.ffmpegVideo, `FFmpeg-video[${this.id}]`);
    this.ffmpegVideo.on('error', (err) => {
      console.error(`[${this.id}] FFmpeg video error:`, err.message);
    });

    // 8. FFmpeg audio — raw RTP to relay (minimal latency)
    this.ffmpegAudio = spawn('ffmpeg', [
      '-fflags', '+nobuffer+flush_packets',
      '-flags', 'low_delay',
      '-probesize', '32',
      '-analyzeduration', '0',
      '-f', 'pulse',
      '-fragment_size', '960',  // 20ms at 48kHz (smallest stable pulse fragment)
      '-i', `${this.sinkName}.monitor`,
      '-c:a', 'libopus',
      '-ar', '48000',
      '-ac', '1',
      '-b:a', '48k',
      '-frame_duration', '10', // 10ms opus frames (was default 20ms)
      '-application', 'lowdelay',
      '-f', 'rtp',
      `rtp://127.0.0.1:${audioPort}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    this.ffmpegAudio.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[${this.id}] FFmpeg audio: ${msg.split('\n').pop()}`);
    });
    registerProcess(this.ffmpegAudio, `FFmpeg-audio[${this.id}]`);
    this.ffmpegAudio.on('error', (err) => {
      console.error(`[${this.id}] FFmpeg audio error:`, err.message);
    });

    // 9. Set up input injector
    this.inputInjector = new InputInjector(this.display, this.config, this.system);

    this._status = 'running';
    console.log(`[${this.id}] Stream session started — display=${this.display}, game=${this.game}`);
    } catch (err) {
      // Clean up any partially spawned processes
      console.error(`[${this.id}] start() failed, cleaning up:`, err);
      await this.stop().catch(() => {});
      throw err;
    }
  }

  /** Handle an input message (from DataChannel via relay stdout) */
  handleInputMessage(msg: Record<string, unknown>): void {
    if (!this.inputInjector) return;

    if (msg.action === 'reset') {
      console.log(`[${this.id}] Input: soft reset`);
      this.inputInjector.sendSoftReset();
    } else if (msg.action === 'analog_modifier') {
      this.inputInjector.setAnalogModifier(!!msg.active);
    } else if (msg.action === 'speed') {
      const multiplier = typeof msg.multiplier === 'number' ? msg.multiplier : 1;
      console.log(`[${this.id}] Input: speed ${multiplier === 0 ? 'MAX' : multiplier + 'x'}`);
      this.inputInjector.setSpeed(multiplier);
    } else if (msg.action === 'touch' && typeof msg.x === 'number' && typeof msg.y === 'number') {
      const phase = msg.phase === 'move' ? 'move' : msg.phase === 'end' ? 'end' : 'start';
      this.inputInjector.handleTouch({ x: msg.x, y: msg.y, phase });
    } else if (msg.key && msg.type) {
      this.inputInjector.handleInput(msg as unknown as InputEvent);
    }
  }

  async stop(): Promise<{ saveChanged: boolean }> {
    this._status = 'stopped';

    // Stop relay session (closes PeerConnection + RTP listeners)
    await stopRelaySession(this.id);

    // Kill FFmpeg processes
    await Promise.all([
      this.ffmpegVideo ? gracefulKill(this.ffmpegVideo, `FFmpeg-video[${this.id}]`) : Promise.resolve(),
      this.ffmpegAudio ? gracefulKill(this.ffmpegAudio, `FFmpeg-audio[${this.id}]`) : Promise.resolve(),
    ]);
    this.ffmpegVideo = null;
    this.ffmpegAudio = null;

    // Kill emulator — graceful kill waits for exit (save flush)
    if (this.emulatorProcess) await gracefulKill(this.emulatorProcess, `Emulator[${this.id}]`);
    this.emulatorProcess = null;

    // Check save BEFORE cleaning up the display/temp dir
    const saveChanged = this.hasSaveChanged();

    // Kill window manager
    if (this.wmProcess) await gracefulKill(this.wmProcess, `WM[${this.id}]`, 1000);
    this.wmProcess = null;

    // Kill Xvfb/Xorg and clean lock files
    if (this.xvfbProcess) await gracefulKill(this.xvfbProcess, `Xvfb[${this.id}]`, 1000);
    this.xvfbProcess = null;
    cleanDisplayLock(this.display);

    // Remove PulseAudio sink
    if (this.pulseModuleIndex) {
      try {
        execSync(`pactl unload-module ${this.pulseModuleIndex}`);
      } catch {
        // Sink may already be gone
      }
      this.pulseModuleIndex = null;
    }
    console.log(`[${this.id}] Stream session stopped — saveChanged=${saveChanged}`);
    return { saveChanged };
  }

  resolveSave(
    action: 'save_back' | 'save_as_new' | 'discard',
    newName?: string,
  ): { success: boolean; newPath?: string; saveChanged: boolean } {
    return resolveSessionSave(
      this.tempSavePath,
      this.originalSavePath,
      this.originalChecksum,
      action,
      this.game,
      newName,
    );
  }

  hasSaveChanged(): boolean {
    if (this.saveBridge) return hasSaveBridgeChanged(this.saveBridge);
    if (!existsSync(this.tempSavePath)) return false;
    if (this.originalChecksum === '') return true; // new game — save was created
    return checksumFile(this.tempSavePath) !== this.originalChecksum;
  }

  cleanupTempDir(): void {
    cleanupTempDir(this.tempDir);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async waitForDisplay(timeoutMs = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        execSync(`xdpyinfo -display ${this.display}`, { stdio: 'ignore' });
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error(`[${this.id}] Display ${this.display} not ready after ${timeoutMs}ms`);
  }

}
