import { Router } from 'express';
import { spawn } from 'child_process';
import db from '../db.js';
import {
  loadManifest,
  getMismatches,
  detectMismatches,
  installEmulator,
  uninstallEmulator,
  type InstallProgress,
} from '../services/dependencies.js';
import { currentOs } from '../services/os-triple.js';

const router = Router();

// In-flight installs, keyed by emulatorId. Value is a list of active SSE
// subscribers. Used for concurrency control (409 on duplicate) and broadcast.
const inflightInstalls = new Map<string, Array<(event: string, data: unknown) => void>>();

// GET /api/dependencies — full state of all emulators for current OS
router.get('/', (_req, res) => {
  const manifest = loadManifest();
  const mismatches = getMismatches();
  const os = currentOs();

  const emulators = Object.entries(manifest.emulators).map(([id, entry]) => {
    const row = db.prepare(
      'SELECT * FROM emulator_configs WHERE id = ? AND os = ?'
    ).get(id, os) as {
      path: string;
      installed_version: string | null;
      managed_install: 0 | 1;
    } | undefined;

    const state = mismatches.get(id) ?? { kind: 'unavailable' };
    const platform = entry.platforms[os];

    return {
      id,
      displayName: entry.displayName,
      version: entry.version,
      license: entry.license,
      licenseUrl: entry.licenseUrl,
      homepageUrl: entry.homepageUrl,
      description: entry.description,
      coreAbiLock: entry.coreAbiLock ?? false,
      coreAbiLockMessage: entry.coreAbiLockMessage,
      platform: platform ? {
        downloadUrl: platform.downloadUrl,
        sizeBytes: platform.sizeBytes,
        archive: platform.archive,
        requiresWine: platform.requiresWine ?? false,
      } : null,
      installed: row ? {
        path: row.path,
        installedVersion: row.installed_version,
        managedInstall: row.managed_install === 1,
      } : null,
      state,
    };
  });

  res.json({ emulators });
});

// POST /api/dependencies/:id/install — kick off install (non-blocking)
router.post('/:id/install', (req, res) => {
  const id = req.params.id;

  if (inflightInstalls.has(id)) {
    return res.status(409).json({ error: 'Install already in progress for this emulator' });
  }

  const subscribers: Array<(event: string, data: unknown) => void> = [];
  inflightInstalls.set(id, subscribers);

  // Return immediately; client subscribes to /progress for updates
  res.json({ ok: true });

  // Run the install in the background
  (async () => {
    try {
      const result = await installEmulator(id, (progress: InstallProgress) => {
        for (const sub of subscribers) sub('progress', progress);
      });
      for (const sub of subscribers) sub('done', result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      for (const sub of subscribers) {
        sub('error', {
          message,
          retryable: true, // crude for v1; refine per error type later
        });
      }
    } finally {
      inflightInstalls.delete(id);
    }
  })();
});

// GET /api/dependencies/:id/progress — SSE stream of install progress
router.get('/:id/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const subscribers = inflightInstalls.get(req.params.id);
  if (!subscribers) {
    send('error', { message: 'No install in progress for this emulator' });
    res.end();
    return;
  }

  subscribers.push(send);
  req.on('close', () => {
    const idx = subscribers.indexOf(send);
    if (idx >= 0) subscribers.splice(idx, 1);
  });
});

// POST /api/dependencies/:id/uninstall
router.post('/:id/uninstall', (req, res) => {
  try {
    uninstallEmulator(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/dependencies/:id/use-custom — user sets a custom path
router.post('/:id/use-custom', (req, res) => {
  const { path: customPath } = req.body;
  if (typeof customPath !== 'string' || !customPath) {
    return res.status(400).json({ error: 'path required' });
  }

  const os = currentOs();
  db.prepare(`
    UPDATE emulator_configs
    SET path = ?, installed_version = NULL, managed_install = 0
    WHERE id = ? AND os = ?
  `).run(customPath, req.params.id, os);

  detectMismatches();
  res.json({ ok: true });
});

// POST /api/dependencies/:id/use-managed — revert a custom install to managed
router.post('/:id/use-managed', (req, res) => {
  const os = currentOs();
  // Clear the path; user must click Install to actually download.
  db.prepare(`
    UPDATE emulator_configs
    SET path = '', installed_version = NULL, managed_install = 0
    WHERE id = ? AND os = ?
  `).run(req.params.id, os);

  detectMismatches();
  res.json({ ok: true });
});

// GET /api/dependencies/wine-detected — does the system have Wine installed?
router.get('/wine-detected', (_req, res) => {
  const p = spawn('which', ['wine']);
  let stdout = '';
  p.stdout.on('data', (d) => { stdout += d.toString(); });
  p.on('error', () => {
    res.json({ detected: false, path: null });
  });
  p.on('close', (code) => {
    if (code === 0 && stdout.trim()) {
      res.json({ detected: true, path: stdout.trim() });
    } else {
      res.json({ detected: false, path: null });
    }
  });
});

export default router;
