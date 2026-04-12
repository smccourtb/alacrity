import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { copyFileSync, unlinkSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import db from '../db.js';
import { paths } from '../paths.js';
import { autoLinkSave } from '../services/autoLinkage.js';
import { importFromDirectory } from '../services/collectionImport.js';
import { syncSaves } from '../services/syncSaves.js';

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

// POST /api/saves/import-directory
router.post('/import-directory', (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath) return res.status(400).json({ error: 'path required' });

  try {
    const result = importFromDirectory(dirPath);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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


export default router;
