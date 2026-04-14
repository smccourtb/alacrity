import { Router } from 'express';
import { syncFrom3DS, discover3DS } from '../services/ftpSync.js';
import { autoLinkSave } from '../services/autoLinkage.js';
import db from '../db.js';

const router = Router();

let syncStatus: { state: string; message: string; files: string[]; errors: string[]; imported?: number; skipped?: number } = {
  state: 'idle', message: '', files: [], errors: [],
};

router.get('/discover', async (_req, res) => {
  syncStatus = { state: 'discovering', message: 'Scanning network...', files: [], errors: [] };
  try {
    const result = await discover3DS();
    if (result) {
      syncStatus = { state: 'idle', message: `Found 3DS at ${result.ip}:${result.port}`, files: [], errors: [] };
      res.json({ found: true, ip: result.ip, port: result.port });
    } else {
      syncStatus = { state: 'error', message: '3DS not found', files: [], errors: ['Not found on network'] };
      res.json({ found: false, ip: null, port: null });
    }
  } catch (e: any) {
    syncStatus = { state: 'error', message: e.message, files: [], errors: [e.message] };
    res.json({ found: false, ip: null, port: null });
  }
});

router.post('/sync', (req, res) => {
  const { ip, port } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address required' });

  if (syncStatus.state === 'syncing' || syncStatus.state === 'parsing') {
    return res.json({ status: 'already_running', ...syncStatus });
  }

  syncStatus = { state: 'syncing', message: 'Downloading saves from 3DS...', files: [], errors: [] };
  res.json({ status: 'started', message: 'Sync started' });

  // Run in background (not awaited — response already sent)
  (async () => {
    try {
      const result = await syncFrom3DS(ip, port || 5000);
      syncStatus = { state: 'parsing', message: `Downloaded ${result.files.length} files. Auto-linking...`, files: result.files, errors: result.errors };

      // Auto-link any save_files that have a game set but haven't been linked yet
      let linked = 0;
      try {
        const unlinkedSaves = db.prepare(
          `SELECT sf.id, sf.file_path, sf.game FROM save_files sf
           WHERE sf.game IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM checkpoints c WHERE c.save_file_id = sf.id
           )`
        ).all() as any[];

        // Run all auto-linkage in a single transaction to avoid per-row fsync
        const linkAll = db.transaction(() => {
          for (const save of unlinkedSaves) {
            try {
              const linkResult = autoLinkSave(save.id, save.file_path, save.game);
              if (linkResult.playthrough_id) linked++;
            } catch (err) {
              console.error(`Auto-linkage failed for save ${save.id}:`, err);
            }
          }
        });
        linkAll();
      } catch (err) {
        console.error('Auto-linkage pass failed:', err);
      }

      syncStatus = {
        state: 'done',
        message: `Sync complete. Linked ${linked} saves.`,
        files: result.files,
        errors: result.errors,
      };
    } catch (e: any) {
      syncStatus = { state: 'error', message: e.message, files: syncStatus.files, errors: [...syncStatus.errors, e.message] };
    }
  })();
});

router.get('/status', (_req, res) => {
  res.json(syncStatus);
});

export default router;
