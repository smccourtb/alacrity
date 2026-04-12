import { Router } from 'express';
import { readFileSync, existsSync, statSync, createReadStream, writeFileSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { ROM_MAP, type DiscoveredSave } from '../services/saveDiscovery.js';
import {
  createSession,
  getSession,
  getActiveSessions,
  resolveSession,
  addSessionListener,
  cleanStaleSessions,
} from '../services/sessionManager.js';
import { buildSnapshot } from '../services/saveSnapshot.js';
const router = Router();

// Clean stale sessions on module load
cleanStaleSessions();

/** Convert a save_files DB row into the DiscoveredSave shape that sessionManager expects */
function dbRowToDiscoveredSave(row: any): DiscoveredSave {
  return {
    id: String(row.id),
    filePath: row.file_path,
    game: row.game || 'Unknown',
    generation: row.generation || null,
    label: row.label || row.filename,
    source: row.source || 'library',
    format: row.format || extname(row.file_path),
    fileSize: row.file_size || 0,
    lastModified: row.file_mtime || row.discovered_at || '',
    launchable: !!row.launchable,
    romPath: row.rom_path || null,
    playTimeSeconds: row.save_timestamp ? Number(row.save_timestamp) : null,
    checksum: row.checksum || null,
  };
}

// --- Save Preview ---

const previewCache = new Map<string, { data: any; mtime: number }>();

router.get('/saves/:id/preview', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });

  const supportedGens = [1, 2];
  if (!save.generation || !supportedGens.includes(save.generation)) {
    return res.json({ available: false, reason: `Preview not available for Gen ${save.generation || '?'} saves` });
  }

  // Check cache by mtime
  const stat = statSync(save.file_path);
  const cacheKey = String(save.id);
  const cached = previewCache.get(cacheKey);
  if (cached && cached.mtime === stat.mtimeMs) {
    return res.json(cached.data);
  }

  try {
    const snapshot = buildSnapshot(save.file_path, save.game);
    const result = { available: true, snapshot };

    previewCache.set(cacheKey, { data: result, mtime: stat.mtimeMs });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ available: false, reason: err.message });
  }
});

// --- Emulators ---

router.get('/emulators', (_req, res) => {
  const emulators = db.prepare('SELECT * FROM emulator_configs').all();
  res.json(emulators);
});

router.put('/emulators/:id', (req, res) => {
  const { name, path, launch_args, supports_link, link_listen_args, link_connect_args, is_default_gen1, is_default_gen2 } = req.body;
  db.prepare(`
    UPDATE emulator_configs
    SET name = ?, path = ?, launch_args = ?, supports_link = ?, link_listen_args = ?, link_connect_args = ?, is_default_gen1 = ?, is_default_gen2 = ?
    WHERE id = ?
  `).run(name, path, launch_args, supports_link ? 1 : 0, link_listen_args || '', link_connect_args || '', is_default_gen1 ? 1 : 0, is_default_gen2 ? 1 : 0, req.params.id);

  const updated = db.prepare('SELECT * FROM emulator_configs WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// --- Play Session ---

function getDefaultEmulator(gen: number): any {
  const col = gen >= 6 ? 'is_default_3ds' : gen === 2 ? 'is_default_gen2' : 'is_default_gen1';
  return db.prepare(`SELECT * FROM emulator_configs WHERE ${col} = 1`).get()
    || db.prepare('SELECT * FROM emulator_configs LIMIT 1').get();
}

router.post('/play', (req, res) => {
  const { saveId, emulatorId } = req.body;
  if (!saveId) return res.status(400).json({ error: 'saveId required' });

  const saveRow = db.prepare('SELECT * FROM save_files WHERE id = ?').get(saveId) as any;
  if (!saveRow) return res.status(404).json({ error: 'Save not found' });
  if (!saveRow.launchable) return res.status(400).json({ error: 'Save is not launchable (no matching ROM found)' });
  const save = dbRowToDiscoveredSave(saveRow);

  // Get emulator config
  let emulator: any;
  if (emulatorId) {
    emulator = db.prepare('SELECT * FROM emulator_configs WHERE id = ?').get(emulatorId);
  }
  if (!emulator) {
    emulator = getDefaultEmulator(save.generation || 1);
  }
  if (!emulator) return res.status(500).json({ error: 'No emulator configured' });

  try {
    const session = createSession(save, emulator.path, emulator.launch_args, null, emulator.id);
    res.json({
      sessionId: session.id,
      pid: session.pid,
      game: save.game,
      label: save.label,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Trade Session ---

router.post('/trade', (req, res) => {
  const { saveId1, saveId2, emulatorId } = req.body;
  if (!saveId1 || !saveId2) return res.status(400).json({ error: 'saveId1 and saveId2 required' });

  const row1 = db.prepare('SELECT * FROM save_files WHERE id = ?').get(saveId1) as any;
  const row2 = db.prepare('SELECT * FROM save_files WHERE id = ?').get(saveId2) as any;
  if (!row1 || !row2) return res.status(404).json({ error: 'One or both saves not found' });
  if (!row1.launchable || !row2.launchable) return res.status(400).json({ error: 'Both saves must be launchable' });
  const save1 = dbRowToDiscoveredSave(row1);
  const save2 = dbRowToDiscoveredSave(row2);

  // Compatibility check
  const gen1 = save1.generation || 0;
  const gen2 = save2.generation || 0;
  if (gen1 > 2 || gen2 > 2) return res.status(400).json({ error: 'Trade only supported for Gen 1-2' });
  if (gen1 === 0 || gen2 === 0) return res.status(400).json({ error: 'Cannot determine generation for one or both saves' });

  // Get trade emulator (prefer link-capable)
  let emulator: any;
  if (emulatorId) {
    emulator = db.prepare('SELECT * FROM emulator_configs WHERE id = ?').get(emulatorId);
  }
  if (!emulator) {
    emulator = db.prepare('SELECT * FROM emulator_configs WHERE supports_link = 1 LIMIT 1').get();
  }
  if (!emulator) return res.status(500).json({ error: 'No link-capable emulator configured' });

  try {
    // Launch instance 1 with listen args
    const listenArgs = `${emulator.launch_args} ${emulator.link_listen_args}`.trim();
    const session1 = createSession(save1, emulator.path, listenArgs, null, emulator.id);

    // Launch instance 2 with connect args, linked to session 1
    const connectArgs = `${emulator.launch_args} ${emulator.link_connect_args}`.trim();
    const session2 = createSession(save2, emulator.path, connectArgs, session1.id, emulator.id);

    // Link session 1 back to session 2
    session1.linkedSessionId = session2.id;

    res.json({
      session1: { sessionId: session1.id, pid: session1.pid, game: save1.game, label: save1.label },
      session2: { sessionId: session2.id, pid: session2.pid, game: save2.game, label: save2.label },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sessions ---

router.get('/sessions', (_req, res) => {
  const active = getActiveSessions().map(s => ({
    id: s.id,
    game: s.save.game,
    label: s.save.label,
    source: s.save.source,
    pid: s.pid,
    startedAt: s.startedAt,
    emulatorId: s.emulatorId,
    linkedSessionId: s.linkedSessionId,
    pendingSave: s.pendingSave,
  }));
  res.json(active);
});

router.post('/sessions/:id/resolve', (req, res) => {
  const { action, newName, createCheckpoint, includeInCollection } = req.body;
  if (!['save_back', 'save_as_new', 'discard'].includes(action)) {
    return res.status(400).json({ error: 'action must be save_back, save_as_new, or discard' });
  }

  const result = resolveSession(req.params.id, action, newName, createCheckpoint);
  if (!result.success) return res.status(404).json({ error: 'Session not found' });

  // If caller wants this checkpoint included in collection, set the flag
  if (includeInCollection && result.checkpointId) {
    try {
      db.prepare('UPDATE checkpoints SET include_in_collection = 1 WHERE id = ?').run(result.checkpointId);
    } catch (err) {
      console.error('[resolve] include_in_collection update error:', err);
    }
  }

  res.json(result);
});

// --- SSE for session events ---

router.get('/sessions/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const remove = addSessionListener((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', remove);
});

// --- ROM & Save file streaming (for web emulator) ---

router.get('/rom/:game', (req, res) => {
  const romRel = ROM_MAP[req.params.game];
  if (!romRel) return res.status(404).json({ error: `Unknown game: ${req.params.game}` });

  const romPath = join(paths.resourcesDir, romRel);
  if (!existsSync(romPath)) return res.status(404).json({ error: 'ROM file not found on disk' });

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${basename(romPath)}"`);
  createReadStream(romPath).pipe(res);
});

router.get('/saves/:id/file', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });
  if (!existsSync(save.file_path)) return res.status(404).json({ error: 'Save file not found on disk' });

  // Rename to match ROM for emulator compatibility
  const romRel = save.rom_path ? basename(save.rom_path) : null;
  const downloadName = romRel ? `${basename(romRel, extname(romRel))}.sav` : basename(save.file_path);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  createReadStream(save.file_path).pipe(res);
});

// Upload modified save from web emulator
router.post('/saves/:id/upload-save', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const data = Buffer.concat(chunks);
    const action = req.query.action as string || 'save_back';
    const newName = req.query.name as string;

    if (action === 'save_back') {
      writeFileSync(save.file_path, data);
      res.json({ success: true });
    } else if (action === 'save_as_new') {
      const name = newName || `${save.label} (web ${new Date().toISOString().slice(0, 10)})`;
      const destDir = paths.libraryGameDir(save.game);
      mkdirSync(destDir, { recursive: true });
      const destPath = join(destDir, `${name}.sav`);
      writeFileSync(destPath, data);
      res.json({ success: true, newPath: destPath });
    } else {
      res.json({ success: true }); // discard — nothing to do
    }
  });
});

export default router;
