import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { copyFileSync, unlinkSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import db from '../db.js';
import { paths } from '../paths.js';
import { autoLinkSave } from '../services/autoLinkage.js';
import { syncSaves } from '../services/syncSaves.js';
import { importSavesFromSource } from '../services/saveImport.js';
import { getConfig, updateConfig } from '../services/config.js';

const SAVES_DIR = paths.savesDir;
const BACKUPS_DIR = paths.backupsDir;

const storage = multer.diskStorage({
  destination: SAVES_DIR,
  filename: (_req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${timestamp}_${file.originalname}`);
  }
});
const upload = multer({ storage });

const router = Router();

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM save_files WHERE 1=1';
  const params: any[] = [];

  if (req.query.stale !== 'true') {
    sql += ' AND stale = 0';
  }
  if (req.query.source) {
    sql += ' AND source = ?';
    params.push(req.query.source);
  }
  if (req.query.game) {
    sql += ' AND game = ?';
    params.push(req.query.game);
  }
  if (req.query.generation) {
    sql += ' AND generation = ?';
    params.push(Number(req.query.generation));
  }
  if (req.query.launchable === 'true') {
    sql += ' AND launchable = 1';
  }
  if (req.query.search) {
    sql += ' AND (label LIKE ? OR filename LIKE ? OR notes LIKE ?)';
    const term = `%${req.query.search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY COALESCE(file_mtime, discovered_at) DESC';
  const saves = db.prepare(sql).all(...params);
  res.json(saves);
});

router.post('/rescan', (_req, res) => {
  const result = syncSaves();
  const saves = db.prepare('SELECT * FROM save_files WHERE stale = 0 ORDER BY COALESCE(file_mtime, discovered_at) DESC').all();
  res.json({ ...result, saves });
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const content = readFileSync(req.file.path);
  const checksum = createHash('sha256').update(content).digest('hex');

  const result = db.prepare(`
    INSERT INTO save_files (filename, file_path, game, file_size, checksum, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.file.filename, req.file.path,
    req.body.game || null, req.file.size, checksum, req.body.notes || null
  );

  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(result.lastInsertRowid) as any;

  // Auto-link to playthrough if game is known
  let linkageResult = null;
  if (save.game) {
    try {
      linkageResult = autoLinkSave(save.id, save.file_path, save.game);
    } catch (err) {
      console.error('Auto-linkage failed for upload:', err);
    }
  }

  res.status(201).json({ ...save, linkage: linkageResult });
});

router.post('/:id/link', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });
  if (!save.game) return res.status(400).json({ error: 'Save has no game set; cannot auto-link' });

  try {
    const linkageResult = autoLinkSave(save.id, save.file_path, save.game);
    res.json(linkageResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/download', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });
  res.download(save.file_path, save.filename);
});

router.post('/:id/backup', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${timestamp}_${save.filename}`;
  const backupPath = join(BACKUPS_DIR, backupName);

  copyFileSync(save.file_path, backupPath);
  const stat = statSync(backupPath);

  const result = db.prepare(`
    INSERT INTO save_files (filename, file_path, game, file_size, checksum, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(backupName, backupPath, save.game, stat.size, save.checksum, `Backup of ${save.filename}`);

  const backup = db.prepare('SELECT * FROM save_files WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(backup);
});

router.get('/heads', (_req, res) => {
  const heads = db.prepare(`
    SELECT p.id as playthrough_id, p.game, p.label as playthrough_label, p.ot_name,
           c.id as checkpoint_id, c.label as checkpoint_label, c.location_key, c.badge_count,
           c.snapshot, c.save_timestamp,
           sf.id as save_id, sf.file_path, sf.label as save_label, sf.file_mtime,
           sf.launchable, sf.rom_path
    FROM playthroughs p
    JOIN checkpoints c ON c.id = p.active_checkpoint_id
    JOIN save_files sf ON sf.id = c.save_file_id
    WHERE sf.stale = 0
    ORDER BY sf.file_mtime DESC
  `).all();
  res.json(heads);
});

router.patch('/:id', (req, res) => {
  const { label, notes } = req.body;
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });

  if (label !== undefined) db.prepare('UPDATE save_files SET label = ? WHERE id = ?').run(label, req.params.id);
  if (notes !== undefined) db.prepare('UPDATE save_files SET notes = ? WHERE id = ?').run(notes, req.params.id);

  const updated = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const save = db.prepare('SELECT * FROM save_files WHERE id = ?').get(req.params.id) as any;
  if (!save) return res.status(404).json({ error: 'Save not found' });

  try { unlinkSync(save.file_path); } catch {}
  db.prepare('DELETE FROM save_files WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── User metadata (tag + sort order) ───────────────────────────────────────
// Phase 1b: lets users customize how saves are grouped and ordered in the
// GroupedView. `tag` is a free-form custom group name. `user_sort_order` is
// a user-assigned rank within a section (higher = earlier). Either may be
// null to clear.

// GET /api/saves/meta?ids=1,2,3
// Batch fetch meta rows for the save ids currently visible in the view.
// Returns an object keyed by save_file_id so the client can look up each
// save's metadata in O(1). Saves with no row in save_user_meta return an
// empty object entry (i.e. `{}` instead of being absent).
router.get('/meta', (req, res) => {
  const raw = req.query.ids;
  if (typeof raw !== 'string' || raw.length === 0) {
    return res.json({});
  }
  const ids = raw
    .split(',')
    .map(s => Number(s))
    .filter(n => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return res.json({});

  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT save_file_id, tag, user_sort_order, updated_at
       FROM save_user_meta
       WHERE save_file_id IN (${placeholders})`,
    )
    .all(...ids) as Array<{
      save_file_id: number;
      tag: string | null;
      user_sort_order: number | null;
      updated_at: string;
    }>;

  const out: Record<string, { tag: string | null; user_sort_order: number | null; updated_at: string }> = {};
  for (const r of rows) {
    out[String(r.save_file_id)] = {
      tag: r.tag,
      user_sort_order: r.user_sort_order,
      updated_at: r.updated_at,
    };
  }
  res.json(out);
});

// PATCH /api/saves/:id/meta
// Body: { tag?: string | null, user_sort_order?: number | null }
// Upsert the user_meta row for a save. Either field may be omitted to leave
// it unchanged, or set to null to clear it.
router.patch('/:id/meta', (req, res) => {
  const saveId = Number(req.params.id);
  if (!Number.isInteger(saveId) || saveId <= 0) {
    return res.status(400).json({ error: 'invalid save id' });
  }
  const save = db.prepare('SELECT id FROM save_files WHERE id = ?').get(saveId);
  if (!save) return res.status(404).json({ error: 'Save not found' });

  const body = (req.body ?? {}) as { tag?: string | null; user_sort_order?: number | null };
  const hasTag = Object.prototype.hasOwnProperty.call(body, 'tag');
  const hasSort = Object.prototype.hasOwnProperty.call(body, 'user_sort_order');
  if (!hasTag && !hasSort) {
    return res.status(400).json({ error: 'must provide at least one of: tag, user_sort_order' });
  }

  // Normalize inputs. Empty-string tag becomes null.
  const nextTag = hasTag
    ? (typeof body.tag === 'string' && body.tag.trim().length > 0 ? body.tag.trim() : null)
    : undefined;
  const nextSort = hasSort
    ? (typeof body.user_sort_order === 'number' && Number.isFinite(body.user_sort_order) ? body.user_sort_order : null)
    : undefined;

  // Read existing row (if any) so fields not in this request are preserved.
  const existing = db
    .prepare('SELECT save_file_id, tag, user_sort_order FROM save_user_meta WHERE save_file_id = ?')
    .get(saveId) as { tag: string | null; user_sort_order: number | null } | undefined;

  const finalTag = hasTag ? nextTag! : (existing?.tag ?? null);
  const finalSort = hasSort ? nextSort! : (existing?.user_sort_order ?? null);

  db.prepare(
    `INSERT INTO save_user_meta (save_file_id, tag, user_sort_order, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(save_file_id) DO UPDATE SET
       tag = excluded.tag,
       user_sort_order = excluded.user_sort_order,
       updated_at = excluded.updated_at`,
  ).run(saveId, finalTag, finalSort);

  const row = db
    .prepare('SELECT save_file_id, tag, user_sort_order, updated_at FROM save_user_meta WHERE save_file_id = ?')
    .get(saveId);
  res.json(row);
});


// POST /api/saves/import-sources
// Body: { path: string }
// Adds the path to config.importSources and immediately scans it.
router.post('/import-sources', async (req, res) => {
  const { path: srcPath } = req.body || {};
  if (!srcPath || typeof srcPath !== 'string') {
    return res.status(400).json({ error: 'path required' });
  }

  const cfg = getConfig();
  if (cfg.importSources.includes(srcPath)) {
    return res.status(400).json({ error: 'This source is already configured' });
  }

  try {
    const next = updateConfig({ importSources: [...cfg.importSources, srcPath] });
    const index = next.importSources.length - 1;
    const result = await importSavesFromSource(srcPath);
    return res.json({ index, result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/saves/import-sources/:index/rescan
router.post('/import-sources/:index/rescan', async (req, res) => {
  const idx = Number(req.params.index);
  const cfg = getConfig();
  if (!Number.isInteger(idx) || idx < 0 || idx >= cfg.importSources.length) {
    return res.status(404).json({ error: 'Source not found' });
  }

  try {
    const result = await importSavesFromSource(cfg.importSources[idx]);
    return res.json({ result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/saves/import-sources/:index
// Removes the entry from config; does NOT touch any files on disk.
router.delete('/import-sources/:index', (req, res) => {
  const idx = Number(req.params.index);
  const cfg = getConfig();
  if (!Number.isInteger(idx) || idx < 0 || idx >= cfg.importSources.length) {
    return res.status(404).json({ error: 'Source not found' });
  }

  const nextSources = cfg.importSources.filter((_, i) => i !== idx);
  updateConfig({ importSources: nextSources });
  return res.json({ success: true });
});

export default router;
