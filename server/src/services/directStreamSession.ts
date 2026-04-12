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
import { createRelaySession, stopRelaySession } from './mediamtxManager.js';
import { registerProcess, gracefulKill } from './processRegistry.js';
import type { StreamSessionInfo } from './streamSession.js';
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
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    // Create relay session — get RTP ports for video + audio
    const { videoPort, audioPort } = await createRelaySession(this.id);
    console.log(`[${this.id}] Relay session created — video:${videoPort} audio:${audioPort}`);

    // Spawn mgba-stream with stdin pipe for input
    this.mgbaProcess = spawn(MGBA_STREAM_BIN, [
      this.tempRomPath,
      this.tempSavePath,
      String(videoPort),
      String(audioPort),
    ], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    registerProcess(this.mgbaProcess, `mgba-stream[${this.id}]`);
    this.mgbaProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[${this.id}] mgba-stream: ${msg.split('\n').pop()}`);
    });

    this.mgbaProcess.on('error', (err) => {
      console.error(`[${this.id}] mgba-stream error:`, err.message);
    });

    this.mgbaProcess.on('exit', (code, signal) => {
      console.log(`[${this.id}] mgba-stream exited with code ${code}, signal ${signal}`);
    });

    this._status = 'running';
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

    // Kill mgba-stream
    await gracefulKill(this.mgbaProcess!, `mgba-stream[${this.id}]`);
    this.mgbaProcess = null;

    const saveChanged = this.hasSaveChanged();
    console.log(`[${this.id}] Direct stream session stopped — saveChanged=${saveChanged}`);
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
    if (!existsSync(this.tempSavePath)) return false;
    if (this.originalChecksum === '') return true; // new game — save was created
    return checksumFile(this.tempSavePath) !== this.originalChecksum;
  }

  cleanupTempDir(): void {
    cleanupTempDir(this.tempDir);
  }
}
