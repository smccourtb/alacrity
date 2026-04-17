import { spawn, ChildProcess } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { getSystemForGame, type SystemType } from './emulatorConfigs.js';
import {
  createTempDir,
  checksumFile,
  resolveSessionSave,
  cleanupTempDir,
} from './sessionManager.js';
import { createRelaySession, stopRelaySession } from './relayManager.js';
import { registerProcess, gracefulKill } from './processRegistry.js';
import { broadcastSessionsChanged, type StreamSessionInfo } from './sessionRegistry.js';
import { paths } from '../paths.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MGBA_STREAM_BIN = paths.mgba;

// ---------------------------------------------------------------------------
// DirectStreamSession
// ---------------------------------------------------------------------------

export class DirectStreamSession {
  readonly id: string;
  readonly game: string;
  readonly system: SystemType;

  private _status: 'starting' | 'running' | 'stopped' = 'starting';
  private _saveChanged: boolean = false;
  private readonly startedAt: string;

  // Temp dir & save tracking
  private readonly tempDir: string;
  private readonly tempRomPath: string;
  private readonly tempSavePath: string;
  private readonly originalSavePath: string;
  private originalChecksum: string;

  // Child process
  private mgbaProcess: ChildProcess | null = null;

  constructor(game: string, romPath: string, savePath?: string) {
    this.id = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.game = game;
    this.system = getSystemForGame(game);
    this.startedAt = new Date().toISOString();

    this.tempDir = createTempDir(this.id);

    const romBasename = basename(romPath);
    const romExt = extname(romBasename);
    const romNameNoExt = basename(romBasename, romExt);

    this.tempRomPath = join(this.tempDir, romBasename);
    this.tempSavePath = join(this.tempDir, `${romNameNoExt}.sav`);
    this.originalSavePath = savePath || '';

    // Copy ROM (not symlink) — mgba-stream needs the actual file
    copyFileSync(romPath, this.tempRomPath);
    if (savePath) {
      copyFileSync(savePath, this.tempSavePath);
      this.originalChecksum = checksumFile(this.tempSavePath);
    } else {
      // New game — no save file yet, emulator will create one
      this.originalChecksum = '';
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
      saveChanged: this._status === 'stopped' ? this._saveChanged : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    // Pre-flight: spawn's ENOENT fires asynchronously on 'error', which
    // would let us return with _status='running' while the child is already
    // dead. Catch missing binary up front so /start returns a real 500.
    if (!existsSync(MGBA_STREAM_BIN)) {
      throw new Error(
        `mgba-stream binary not found at ${MGBA_STREAM_BIN}. Streaming ` +
        `requires a platform-native build of mgba-stream; this path is ` +
        `currently Linux-only.`,
      );
    }

    // Create relay session — get RTP ports for video + audio
    const { videoPort, audioPort } = await createRelaySession(this.id);
    console.log(`[${this.id}] Relay session created — video:${videoPort} audio:${audioPort}`);

    // Spawn mgba-stream with stdin pipe for input. Wait for either 'spawn'
    // (success) or 'error' (launch failure) before flipping status.
    this.mgbaProcess = spawn(MGBA_STREAM_BIN, [
      this.tempRomPath,
      this.tempSavePath,
      String(videoPort),
      String(audioPort),
    ], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    await new Promise<void>((resolve, reject) => {
      this.mgbaProcess!.once('spawn', resolve);
      this.mgbaProcess!.once('error', reject);
    });

    registerProcess(this.mgbaProcess, `mgba-stream[${this.id}]`);
    this.mgbaProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[${this.id}] mgba-stream: ${msg.split('\n').pop()}`);
    });

    // Late errors (crash after successful spawn) should tear the session
    // down rather than leaving the relay with a running PC but no RTP.
    this.mgbaProcess.on('error', (err) => {
      console.error(`[${this.id}] mgba-stream error:`, err.message);
      this.stop().catch(() => {});
    });

    this.mgbaProcess.on('exit', (code, signal) => {
      console.log(`[${this.id}] mgba-stream exited with code ${code}, signal ${signal}`);
      if (this._status === 'running') {
        this.stop().catch(() => {});
      }
    });

    this._status = 'running';
    broadcastSessionsChanged();
    console.log(`[${this.id}] Direct stream session started — game=${this.game}`);
  }

  /** Handle an input message (from DataChannel via relay stdout) */
  handleInputMessage(msg: Record<string, unknown>): void {
    if (!this.mgbaProcess || !this.mgbaProcess.stdin || this.mgbaProcess.killed) return;

    try {
      this.mgbaProcess.stdin.write(JSON.stringify(msg) + '\n');
    } catch (err) {
      console.error(`[${this.id}] Failed to write input to mgba-stream:`, err);
    }
  }

  async stop(): Promise<{ saveChanged: boolean }> {
    this._status = 'stopped';

    // Stop relay session
    await stopRelaySession(this.id);

    // Kill mgba-stream if it ever started. Guard against stop() racing a
    // failed start(), or a second stop() invocation from a disconnect event.
    if (this.mgbaProcess) {
      await gracefulKill(this.mgbaProcess, `mgba-stream[${this.id}]`);
      this.mgbaProcess = null;
    }

    this._saveChanged = this.hasSaveChanged();
    console.log(`[${this.id}] Direct stream session stopped — saveChanged=${this._saveChanged}`);
    broadcastSessionsChanged();
    return { saveChanged: this._saveChanged };
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
    if (!existsSync(this.tempSavePath)) return false;
    if (this.originalChecksum === '') return true; // new game — save was created
    return checksumFile(this.tempSavePath) !== this.originalChecksum;
  }

  cleanupTempDir(): void {
    cleanupTempDir(this.tempDir);
  }
}
