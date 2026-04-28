import { Router } from 'express';
import { getConfig, updateConfig } from '../services/config.js';

const router = Router();

// GET /api/config — return the full current config
router.get('/', (_req, res) => {
  res.json(getConfig());
});

// PUT /api/config — partial update
// Body: { romsDir?, biosDir?, ntfyServer?, ntfyTopic?, welcomeDismissed? }
router.put('/', (req, res) => {
  const allowedKeys = [
    'romsDir',
    'biosDir',
    'ntfyServer',
    'ntfyTopic',
    'welcomeDismissed',
    'pokedexSpriteStyle',
    'boxIconEverywhere',
  ] as const;

  const partial: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in req.body) partial[key] = req.body[key];
  }

  if (partial.welcomeDismissed === true) {
    partial.welcomeDismissedAt = new Date().toISOString();
  }

  const updated = updateConfig(partial as any);
  res.json(updated);
});

// POST /api/config/test-notification — send a test ntfy notification
router.post('/test-notification', async (_req, res) => {
  const c = getConfig();
  const url = `${c.ntfyServer}/${c.ntfyTopic}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Title': 'Alacrity', 'Tags': 'sparkles' },
      body: 'Test notification from Alacrity ✨',
    });
    if (!resp.ok) {
      return res.status(502).json({
        error: `ntfy server returned ${resp.status} ${resp.statusText}`,
      });
    }
    res.json({ ok: true, url });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Network error' });
  }
});

export default router;
