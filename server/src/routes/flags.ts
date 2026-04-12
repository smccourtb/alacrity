import { Router } from 'express';
import { readFileSync } from 'fs';
import { parseEventFlags, getFlagDefinitions } from '../services/flagParsers/index.js';
import { extractGen1WorldState } from '../services/gen1WorldState.js';
import { extractGen2WorldState } from '../services/gen2WorldState.js';
import db from '../db.js';

// Game name → generation for world state parsing
const GAME_GEN: Record<string, number> = {
  red: 1, blue: 1, yellow: 1,
  gold: 2, silver: 2, crystal: 2,
};

function extractLocationKey(game: string, buf: Buffer): string | null {
  const gen = GAME_GEN[game.toLowerCase()];
  if (!gen) return null;
  try {
    const ws = gen === 1 ? extractGen1WorldState(buf) : extractGen2WorldState(buf, game);
    return ws.currentLocationKey !== 'unknown' ? ws.currentLocationKey : null;
  } catch { return null; }
}

const router = Router();

// GET /api/flags/:game/definitions — all known flags for a game
router.get('/:game/definitions', (req, res) => {
  const { game } = req.params;
  const defs = getFlagDefinitions(game);
  if (defs.length === 0) {
    return res.status(404).json({ error: `No flag definitions found for game: ${game}` });
  }
  res.json(defs);
});

// GET /api/flags/:game/:saveFileId — parse flags from a save file in DB
router.get('/:game/:saveFileId', (req, res) => {
  const { game, saveFileId } = req.params;

  const saveFile = db.prepare('SELECT file_path FROM save_files WHERE id = ?').get(Number(saveFileId)) as { file_path: string } | undefined;
  if (!saveFile) {
    return res.status(404).json({ error: `Save file not found: ${saveFileId}` });
  }

  try {
    const saveBuffer = readFileSync(saveFile.file_path);
    const report = parseEventFlags(game, saveBuffer);
    const currentLocationKey = extractLocationKey(game, saveBuffer);
    res.json({ ...report, currentLocationKey });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to parse save: ${err.message}` });
  }
});

// POST /api/flags/parse — parse flags from an arbitrary save path
router.post('/parse', (req, res) => {
  const { game, savePath } = req.body;
  if (!game || !savePath) {
    return res.status(400).json({ error: 'game and savePath required' });
  }

  try {
    const saveBuffer = readFileSync(savePath);
    const report = parseEventFlags(game, saveBuffer);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to parse save: ${err.message}` });
  }
});

export default router;
