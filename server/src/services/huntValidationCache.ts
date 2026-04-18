import { statSync } from 'fs';
import type { SaveContext } from './huntValidation.js';

interface Entry {
  mtimeMs: number;
  game: string;
  context: SaveContext;
  loadedAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, Entry>();

export function getCached(sav_path: string, game: string): SaveContext | null {
  const e = cache.get(sav_path);
  if (!e) return null;
  if (e.game !== game) return null;
  if (Date.now() - e.loadedAt > TTL_MS) { cache.delete(sav_path); return null; }
  try {
    const cur = statSync(sav_path).mtimeMs;
    if (cur !== e.mtimeMs) { cache.delete(sav_path); return null; }
  } catch { cache.delete(sav_path); return null; }
  return e.context;
}

export function setCached(sav_path: string, game: string, context: SaveContext): void {
  try {
    const mtimeMs = statSync(sav_path).mtimeMs;
    cache.set(sav_path, { mtimeMs, game, context, loadedAt: Date.now() });
  } catch {
    // If we can't stat, don't cache — the next call will try again.
  }
}

export function clearCache(): void {
  cache.clear();
}
