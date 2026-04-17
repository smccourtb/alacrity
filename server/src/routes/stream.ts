import { Router, Request, Response } from 'express';
import { registerProcess } from '../services/processRegistry.js';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  StreamSession,
  getSession,
  getAllSessions,
  registerSession,
  removeSession,
  subscribeToSessions,
  type AnyStreamSession,
} from '../services/streamSession.js';
import { DirectStreamSession } from '../services/directStreamSession.js';
import {
  detectInstalledEmulators,
  getEmulatorConfig,
  getSystemForGame,
  supportsDirectStream,
} from '../services/emulatorConfigs.js';
import { relayOffer } from '../services/relayManager.js';
import { paths } from '../paths.js';
const router = Router();

const ROM_MAP: Record<string, string> = {
  'Pokemon Red': 'roms/Pokemon Red.gb',
  'Pokemon Blue': 'roms/Pokemon Blue.gb',
  'Pokemon Yellow': 'roms/Pokemon Yellow.gbc',
  'Pokemon Gold': 'roms/Pokemon Gold.gbc',
  'Pokemon Silver': 'roms/Pokemon Silver.gbc',
  'Pokemon Crystal': 'roms/Pokemon Crystal.gbc',
  'Pokemon Ruby': 'roms/Pokemon Ruby.gba',
  'Pokemon Sapphire': 'roms/Pokemon Sapphire.gba',
  'Pokemon Emerald': 'roms/Pokemon Emerald.gba',
  'Pokemon FireRed': 'roms/Pokemon FireRed.gba',
  'Pokemon LeafGreen': 'roms/Pokemon LeafGreen.gba',
  'Pokemon Diamond': 'roms/Pokemon Diamond.nds',
  'Pokemon Pearl': 'roms/Pokemon Pearl.nds',
  'Pokemon Platinum': 'roms/Pokemon Platinum.nds',
  'Pokemon HeartGold': 'roms/Pokemon HeartGold.nds',
  'Pokemon SoulSilver': 'roms/Pokemon SoulSilver.nds',
  'Pokemon Black': 'roms/Pokemon Black.nds',
  'Pokemon White': 'roms/Pokemon White.nds',
  'Pokemon Black 2': 'roms/Pokemon Black 2.nds',
  'Pokemon White 2': 'roms/Pokemon White 2.nds',
  'Pokemon X': 'roms/Pokemon X.3ds',
  'Pokemon Y': 'roms/Pokemon Y.3ds',
  'Pokemon Omega Ruby': 'roms/Pokemon Omega Ruby.3ds',
  'Pokemon Alpha Sapphire': 'roms/Pokemon Alpha Sapphire.3ds',
  'Pokemon Sun': 'roms/Pokemon Sun.3ds',
  'Pokemon Moon': 'roms/Pokemon Moon.3ds',
  'Pokemon Ultra Sun': 'roms/Pokemon Ultra Sun.3ds',
  'Pokemon Ultra Moon': 'roms/Pokemon Ultra Moon.3ds',
  'Red': 'roms/Pokemon Red.gb',
  'Blue': 'roms/Pokemon Blue.gb',
  'Yellow': 'roms/Pokemon Yellow.gbc',
  'Gold': 'roms/Pokemon Gold.gbc',
  'Silver': 'roms/Pokemon Silver.gbc',
  'Crystal': 'roms/Pokemon Crystal.gbc',
  'X': 'roms/Pokemon X.3ds',
  'Y': 'roms/Pokemon Y.3ds',
  'Omega Ruby': 'roms/Pokemon Omega Ruby.3ds',
  'Alpha Sapphire': 'roms/Pokemon Alpha Sapphire.3ds',
  'Sun': 'roms/Pokemon Sun.3ds',
  'Moon': 'roms/Pokemon Moon.3ds',
  'Ultra Sun': 'roms/Pokemon Ultra Sun.3ds',
  'Ultra Moon': 'roms/Pokemon Ultra Moon.3ds',
};

function resolveRomPath(game: string): string | null {
  const rel = ROM_MAP[game];
  if (!rel) return null;
  const abs = join(paths.resourcesDir, rel);
  return existsSync(abs) ? abs : null;
}

// POST /api/stream/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { savePath, game } = req.body;
    if (!game || typeof game !== 'string') {
      return res.status(400).json({ error: 'game is required' });
    }
    if (savePath && !existsSync(savePath)) {
      return res.status(404).json({ error: 'Save file not found' });
    }
    const romPath = resolveRomPath(game);
    if (!romPath) {
      return res.status(404).json({ error: `ROM not found for game: ${game}` });
    }

    // Use DirectStreamSession (mgba-stream) for GB/GBC/GBA, StreamSession for NDS/3DS
    const system = getSystemForGame(game);
    const session: AnyStreamSession = supportsDirectStream(system)
      ? new DirectStreamSession(game, romPath, savePath)
      : new StreamSession(game, romPath, savePath);
    registerSession(session);
    await session.start();

    return res.json({ sessionId: session.id, system: session.system });
  } catch (err: any) {
    console.error('[stream/start]', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/offer — SDP exchange via Pion relay
router.post('/offer', async (req: Request, res: Response) => {
  try {
    const { sessionId, sdp } = req.body;
    if (!sessionId || !sdp) {
      return res.status(400).json({ error: 'sessionId and sdp are required' });
    }
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const answerSdp = await relayOffer(sessionId, sdp);
    return res.json({ sdp: answerSdp });
  } catch (err: any) {
    console.error('[stream/offer]', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/stop
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { saveChanged } = await session.stop();
    // If no resolution is needed, drop the session now so it doesn't linger.
    // When saveChanged, /resolve handles removal after the user picks an action.
    if (!saveChanged) {
      session.cleanupTempDir();
      removeSession(sessionId);
    }
    return res.json({ sessionId, saveChanged });
  } catch (err: any) {
    console.error('[stream/stop]', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/resolve
router.post('/resolve', (req: Request, res: Response) => {
  try {
    const { sessionId, action, newName } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!['save_back', 'save_as_new', 'discard'].includes(action)) {
      return res.status(400).json({ error: 'action must be save_back, save_as_new, or discard' });
    }
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = session.resolveSave(action, newName);
    session.cleanupTempDir();
    removeSession(sessionId);
    return res.json(result);
  } catch (err: any) {
    console.error('[stream/resolve]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', (_req: Request, res: Response) => {
  try {
    return res.json(getAllSessions());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/stream/events — SSE feed of session-list snapshots.
// Pushes an updated snapshot on subscribe and on every lifecycle transition
// (register, status change, remove). Clients that can open EventSource
// replace their polling loops with this.
router.get('/events', (req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // Disable proxy buffering; required for Nginx and some reverse proxies.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const send = (snapshot: unknown): void => {
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  const unsubscribe = subscribeToSessions(send);

  // Comment-frame heartbeat keeps idle connections open through proxies and
  // lets the server notice dead peers via the write failing.
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* peer gone */ }
  }, 15000);

  req.on('close', () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
});

router.get('/emulators', (_req: Request, res: Response) => {
  try {
    return res.json(detectInstalledEmulators());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/stream/games — list games with ROMs available on disk
router.get('/games', (_req: Request, res: Response) => {
  try {
    const games: { game: string; system: string }[] = [];
    const seen = new Set<string>();
    for (const [game, relPath] of Object.entries(ROM_MAP)) {
      // Skip short-name aliases (e.g. 'Red' → use 'Pokemon Red')
      if (!game.startsWith('Pokemon ')) continue;
      if (seen.has(game)) continue;
      seen.add(game);
      const abs = join(paths.resourcesDir, relPath);
      if (existsSync(abs)) {
        const system = getSystemForGame(game);
        games.push({ game, system });
      }
    }
    return res.json(games);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/launch — open emulator GUI directly (desktop play, no streaming)
router.post('/launch', (req: Request, res: Response) => {
  try {
    const { game, savePath } = req.body;
    if (!game || typeof game !== 'string') {
      return res.status(400).json({ error: 'game is required' });
    }
    const romPath = resolveRomPath(game);
    if (!romPath) {
      return res.status(404).json({ error: `ROM not found for game: ${game}` });
    }
    if (savePath && !existsSync(savePath)) {
      return res.status(404).json({ error: 'Save file not found' });
    }

    const system = getSystemForGame(game);
    const config = getEmulatorConfig(system);

    // For melonDS: copy save next to ROM symlink in a temp dir so it finds it
    // melonDS looks for saves adjacent to the ROM with matching name
    let launchRom = romPath;
    const env: Record<string, string> = { ...process.env } as any;

    if (system === 'nds') {
      const { mkdtempSync, symlinkSync, copyFileSync } = require('fs');
      const { basename, extname } = require('path');
      const tmpDir = mkdtempSync(join(require('os').tmpdir(), 'melonds-'));
      const romBase = basename(romPath);
      const romNameNoExt = basename(romBase, extname(romBase));
      const tmpRom = join(tmpDir, romBase);
      symlinkSync(romPath, tmpRom);
      if (savePath) {
        copyFileSync(savePath, join(tmpDir, `${romNameNoExt}.sav`));
      }
      launchRom = tmpRom;

      const { seedMelonDSConfig } = require('../services/melondsConfig.js');
      env.XDG_CONFIG_HOME = seedMelonDSConfig(tmpDir, config);
    }

    const args = config.args(launchRom, savePath || '');

    const { spawn: spawnProcess } = require('child_process');
    const proc = spawnProcess(config.binary, args, {
      env,
      stdio: 'ignore',
      detached: true,
    });
    registerProcess(proc, `Desktop-launch[${game}]`);

    return res.json({ success: true, game, pid: proc.pid });
  } catch (err: any) {
    console.error('[stream/launch]', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
