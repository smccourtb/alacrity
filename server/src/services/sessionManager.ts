import { spawn, ChildProcess } from 'child_process';
import { registerProcess } from './processRegistry.js';
import { mkdirSync, symlinkSync, copyFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { autoLinkSave } from './autoLinkage.js';
import { createHash } from 'crypto';
import { DiscoveredSave } from './saveDiscovery.js';
import { getSystemForGame } from './emulatorConfigs.js';
import { bridgeSaveIn, hasSaveBridgeChanged, restoreSaveBridge, type SaveBridge } from './saveBridge3ds.js';

const SESSIONS_DIR = join(paths.dataDir, 'sessions');

export interface PlaySession {
  id: string;
  save: DiscoveredSave;
  tempDir: string;
  originalSavePath: string;
  tempSavePath: string;
  originalChecksum: string;
  process: ChildProcess | null;
  pid: number | null;
  startedAt: string;
  emulatorId: string;
  linkedSessionId: string | null;
  saveBridge: SaveBridge | null;
  // Set when emulator exits and save was modified — waiting for user to resolve
  pendingSave: boolean;
}

export type SessionEndReason = 'exited' | 'crashed';

export interface SessionEndEvent {
  sessionId: string;
  saveChanged: boolean;
  reason: SessionEndReason;
}

// In-memory session store
const sessions = new Map<string, PlaySession>();

// SSE listeners for session events
type SessionListener = (event: SessionEndEvent) => void;
const listeners = new Set<SessionListener>();

export function addSessionListener(fn: SessionListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(event: SessionEndEvent) {
  for (const fn of listeners) fn(event);
}

export function checksumFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/** Clean up stale session dirs from previous server runs */
export function cleanStaleSessions() {
  if (!existsSync(SESSIONS_DIR)) return;
  for (const entry of readdirSync(SESSIONS_DIR)) {
    const dir = join(SESSIONS_DIR, entry);
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function createSession(
  save: DiscoveredSave,
  emulatorPath: string,
  emulatorArgs: string,
  linkedSessionId: string | null = null,
  emulatorId: string = 'mgba',
): PlaySession {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = join(SESSIONS_DIR, id);
  mkdirSync(tempDir, { recursive: true });

  if (!save.romPath) throw new Error('No ROM path for this save');

  // Determine ROM filename and extension
  const romBasename = basename(save.romPath);
  const romExt = extname(romBasename);
  const romNameNoExt = basename(romBasename, romExt);
  const romDst = join(tempDir, romBasename);

  // Symlink ROM (read-only)
  symlinkSync(save.romPath, romDst);

  // Detect 3DS games and bridge the save into Azahar's directory structure
  let saveBridge: SaveBridge | null = null;
  let savDst: string;
  let originalChecksum: string;

  let is3ds = false;
  try {
    is3ds = getSystemForGame(save.game) === '3ds';
  } catch {
    // Unknown game — fall through to default .sav behavior
  }

  if (is3ds) {
    const bridge = bridgeSaveIn(tempDir, save.filePath, save.game, id);
    if (bridge) {
      saveBridge = bridge;
      savDst = bridge.savBinPath;
      originalChecksum = bridge.originalChecksum;
    } else {
      savDst = join(tempDir, `${romNameNoExt}.sav`);
      copyFileSync(save.filePath, savDst);
      originalChecksum = checksumFile(savDst);
    }
  } else {
    savDst = join(tempDir, `${romNameNoExt}.sav`);
    copyFileSync(save.filePath, savDst);
    originalChecksum = checksumFile(savDst);
  }

  // Build emulator args from template, preserving paths with spaces
  const ROM_TOKEN = '__ROM__';
  const SAV_TOKEN = '__SAV__';
  const finalArgs = emulatorArgs
    .replace('{rom}', ROM_TOKEN)
    .replace('{save}', SAV_TOKEN)
    .split(/\s+/)
    .filter(Boolean)
    .map(a => a === ROM_TOKEN ? romDst : a === SAV_TOKEN ? savDst : a);

  // If template produced no args, just pass the ROM path
  if (finalArgs.length === 0) finalArgs.push(romDst);

  const spawnEnv: Record<string, string | undefined> = {
    ...process.env,
    DISPLAY: process.env.DISPLAY || ':0',
  };
  // Only set XDG_DATA_HOME when the bridge is the temp-dir variant (Linux).
  // Real-dir bridges (macOS/Windows) leave dataDir empty because Qt ignores
  // XDG on those platforms — the save was written into Azahar's actual dir.
  if (saveBridge && saveBridge.dataDir) {
    spawnEnv.XDG_DATA_HOME = saveBridge.dataDir;
  }

  const child = spawn(emulatorPath, finalArgs, {
    env: spawnEnv,
    stdio: 'ignore',
  });

  registerProcess(child, `Desktop-emulator[${id}]`);
  child.on('error', (err) => {
    console.error(`[session ${id}] spawn error:`, err.message);
  });

  const session: PlaySession = {
    id,
    save,
    tempDir,
    originalSavePath: save.filePath,
    tempSavePath: savDst,
    originalChecksum,
    process: child,
    pid: child.pid || null,
    startedAt: new Date().toISOString(),
    emulatorId,
    linkedSessionId,
    saveBridge,
    pendingSave: false,
  };

  sessions.set(id, session);

  // Watch for process exit
  child.on('exit', (code) => {
    try {
      if (code !== 0 && code !== null) console.log(`[session ${id}] emulator exited with code ${code}`);
      const saveChanged = saveBridge
        ? hasSaveBridgeChanged(saveBridge)
        : existsSync(savDst) && checksumFile(savDst) !== originalChecksum;
      const reason: SessionEndReason = code === 0 || code === null ? 'exited' : 'crashed';
      notifyListeners({ sessionId: id, saveChanged, reason });

      if (saveChanged) {
        // Mark session as pending save resolution
        const s = sessions.get(id);
        if (s) s.pendingSave = true;
      } else {
        cleanupSession(id);
      }
    } catch (err) {
      console.error(`[session ${id}] exit handler error:`, err);
      cleanupSession(id);
    }
  });

  return session;
}

export function getSession(id: string): PlaySession | undefined {
  return sessions.get(id);
}

export function getActiveSessions(): PlaySession[] {
  return Array.from(sessions.values());
}

export function resolveSession(
  id: string,
  action: 'save_back' | 'save_as_new' | 'discard',
  newName?: string,
  createCheckpoint?: boolean,
): { success: boolean; newPath?: string; checkpointCreated?: boolean; checkpointId?: number } {
  const session = sessions.get(id);
  if (!session) return { success: false };

  const game = session.save.game;
  let checkpointId: number | undefined;

  if (action === 'save_back') {
    copyFileSync(session.tempSavePath, session.originalSavePath);
    if (createCheckpoint) {
      try {
        const existing = db.prepare('SELECT id FROM save_files WHERE file_path = ?').get(session.originalSavePath) as { id: number } | undefined;
        if (existing) {
          const linkResult = autoLinkSave(existing.id, session.originalSavePath, game);
          if (linkResult.checkpoint_id) checkpointId = linkResult.checkpoint_id;
        }
      } catch (err) {
        console.error(`[resolveSession] checkpoint (save_back) error:`, err);
      }
    }
  } else if (action === 'save_as_new') {
    const name = newName || `${session.save.label} (played ${new Date().toISOString().slice(0, 10)})`;
    const destDir = paths.libraryGameDir(game);
    mkdirSync(destDir, { recursive: true });
    const destPath = join(destDir, `${name}.sav`);
    copyFileSync(session.tempSavePath, destPath);
    if (createCheckpoint) {
      try {
        const fileSize = statSync(destPath).size;
        const sfResult = db.prepare(
          'INSERT OR IGNORE INTO save_files (filename, file_path, game, file_size, source) VALUES (?, ?, ?, ?, ?)'
        ).run(name, destPath, game, fileSize, 'library');
        const saveFileId = Number(sfResult.lastInsertRowid);
        const linkResult = autoLinkSave(saveFileId, destPath, game);
        if (linkResult.checkpoint_id) checkpointId = linkResult.checkpoint_id;
      } catch (err) {
        console.error(`[resolveSession] checkpoint (save_as_new) error:`, err);
      }
    }
    cleanupSession(id);
    return { success: true, newPath: destPath, checkpointCreated: !!createCheckpoint, checkpointId };
  }

  cleanupSession(id);
  return { success: true, checkpointCreated: action !== 'discard' && !!createCheckpoint, checkpointId };
}

export function cleanupSession(id: string) {
  const session = sessions.get(id);
  if (!session) return;
  // Restore any files we displaced in Azahar's real data dir. Must run AFTER
  // resolveSession copies the modified save out, since the modified save
  // lives at savBridge.savBinPath (which we're about to overwrite).
  if (session.saveBridge) {
    try { restoreSaveBridge(session.saveBridge); } catch (err) {
      console.error(`[session ${id}] restore bridge failed:`, err);
    }
  }
  try { rmSync(session.tempDir, { recursive: true, force: true }); } catch {}
  sessions.delete(id);
}

// --- Shared session helpers (used by both desktop and stream sessions) ---

export function createTempDir(sessionId: string): string {
  const tempDir = join(SESSIONS_DIR, sessionId);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

export function resolveSessionSave(
  tempSavePath: string,
  originalSavePath: string,
  originalChecksum: string,
  action: 'save_back' | 'save_as_new' | 'discard',
  game?: string,
  newName?: string,
): { success: boolean; newPath?: string; saveChanged: boolean } {
  const currentChecksum = checksumFile(tempSavePath);
  const saveChanged = currentChecksum !== originalChecksum;

  if (action === 'discard') {
    return { success: true, saveChanged };
  }
  if (action === 'save_back') {
    copyFileSync(tempSavePath, originalSavePath);
    return { success: true, saveChanged };
  }
  if (action === 'save_as_new' && game) {
    const system = getSystemForGame(game);
    const destName = newName || `stream_${Date.now()}`;

    if (system === '3ds') {
      // 3DS saves: saves/library/<game>/<backupName>/main
      const destDir = join(paths.libraryGameDir(game), destName);
      mkdirSync(destDir, { recursive: true });
      const destPath = join(destDir, 'main');
      copyFileSync(tempSavePath, destPath);
      return { success: true, newPath: destPath, saveChanged };
    }

    // GB/GBA/NDS: saves/library/<game>/<name>.sav
    const destDir = paths.libraryGameDir(game);
    mkdirSync(destDir, { recursive: true });
    const destPath = join(destDir, `${destName}.sav`);
    copyFileSync(tempSavePath, destPath);
    return { success: true, newPath: destPath, saveChanged };
  }
  return { success: false, saveChanged };
}

export function cleanupTempDir(tempDir: string): void {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[sessionManager] Failed to clean up ${tempDir}:`, err);
  }
}
