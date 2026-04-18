import db from '../db.js';
import type { SaveWorldState } from './worldState.js';
import { parseWorldStateLight } from './autoLinkage.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';

export type HuntMode = 'wild' | 'stationary' | 'gift' | 'egg';

export type CheckId =
  | 'mode_species'
  | 'game_species'
  | 'wild_location'
  | 'wild_encounter'
  | 'egg_daycare';

export type CheckSeverity = 'error' | 'warning' | 'skipped';

export interface CheckResult {
  id: CheckId;
  severity: CheckSeverity;
  message: string;
  detail?: string;
}

export interface ValidationInput {
  game: string;
  sav_path: string | null;
  hunt_mode: HuntMode;
  target_species_id: number | null;
}

export interface ValidationReport {
  ok: boolean;
  checks: CheckResult[];
}

export interface SaveContext {
  worldState: SaveWorldState | null;
  daycare: any | null;
  parseError?: string;
}

function gameGen(game: string): number {
  const g = game.toLowerCase();
  if (['red', 'blue', 'yellow'].includes(g)) return 1;
  if (['gold', 'silver', 'crystal'].includes(g)) return 2;
  if (['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'].includes(g)) return 3;
  if (['pokemon diamond', 'pokemon pearl', 'pokemon platinum', 'pokemon heartgold', 'pokemon soulsilver'].includes(g)) return 4;
  if (g.startsWith('pokemon black') || g.startsWith('pokemon white')) return 5;
  if (['pokemon x', 'pokemon y', 'pokemon omega ruby', 'pokemon alpha sapphire'].includes(g)) return 6;
  if (g.includes('sun') || g.includes('moon')) return 7;
  return 0;
}

export async function loadSaveContext(sav_path: string, game: string): Promise<SaveContext> {
  try {
    const worldState = parseWorldStateLight(sav_path, game);
    let daycare: any = null;
    const gen = gameGen(game);
    if (gen === 1) daycare = parseGen1Save(sav_path, game).daycare ?? null;
    if (gen === 2) daycare = parseGen2Save(sav_path, game).daycare ?? null;
    // Gen 3+ daycare reading not wired here; rules will report 'skipped' when needed.
    return { worldState, daycare };
  } catch (err: any) {
    return { worldState: null, daycare: null, parseError: String(err?.message ?? err) };
  }
}

function speciesNameOrId(species_id: number): string {
  const row = db.prepare('SELECT name FROM species WHERE id = ?').get(species_id) as { name?: string } | undefined;
  if (!row?.name) return `species #${species_id}`;
  return row.name.charAt(0).toUpperCase() + row.name.slice(1).replace(/-/g, ' ');
}

function ruleGameSpecies(input: ValidationInput): CheckResult | null {
  if (input.target_species_id == null) return null;

  const row = db.prepare(`
    SELECT EXISTS(
      SELECT 1 FROM map_encounters WHERE game = ? AND species_id = ?
      UNION ALL
      SELECT 1 FROM location_events WHERE game = ? AND species_id = ?
    ) AS found
  `).get(input.game, input.target_species_id, input.game, input.target_species_id) as { found: number };

  if (row.found) return null;

  return {
    id: 'game_species',
    severity: 'error',
    message: `${speciesNameOrId(input.target_species_id)} is not available in ${input.game}.`,
  };
}

const GIFT_EVENT_TYPES = ['gift_pokemon', 'trade'];
const STATIONARY_EVENT_TYPES = ['static_pokemon', 'legendary'];

function ruleModeSpecies(input: ValidationInput): CheckResult | null {
  if (input.target_species_id == null) return null;

  const id = input.target_species_id;
  let found = false;

  if (input.hunt_mode === 'wild') {
    const row = db.prepare(
      'SELECT EXISTS(SELECT 1 FROM map_encounters WHERE game = ? AND species_id = ?) AS f'
    ).get(input.game, id) as { f: number };
    found = !!row.f;
  } else if (input.hunt_mode === 'gift' || input.hunt_mode === 'stationary') {
    const types = input.hunt_mode === 'gift' ? GIFT_EVENT_TYPES : STATIONARY_EVENT_TYPES;
    const placeholders = types.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT EXISTS(SELECT 1 FROM location_events WHERE game = ? AND species_id = ? AND event_type IN (${placeholders})) AS f`
    ).get(input.game, id, ...types) as { f: number };
    found = !!row.f;
  } else if (input.hunt_mode === 'egg') {
    // TODO: egg_groups column missing, egg-mode species filter disabled
    found = true;
  }

  if (found) return null;

  const modeLabel: Record<HuntMode, string> = {
    wild: 'wild encounters',
    stationary: 'stationary battles',
    gift: 'NPC gifts',
    egg: 'breeding',
  };
  return {
    id: 'mode_species',
    severity: 'error',
    message: `${speciesNameOrId(id)} can't be obtained via ${modeLabel[input.hunt_mode]} in ${input.game}.`,
  };
}

export async function validateHuntConfig(input: ValidationInput): Promise<ValidationReport> {
  const checks: CheckResult[] = [];

  const gs = ruleGameSpecies(input);
  if (gs) checks.push(gs);
  const ms = ruleModeSpecies(input);
  if (ms) checks.push(ms);

  const ok = !checks.some(c => c.severity === 'error');
  return { ok, checks };
}
