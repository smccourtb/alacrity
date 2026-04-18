import db from '../db.js';
import type { SaveWorldState } from './worldState.js';
import { parseWorldStateLight } from './autoLinkage.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';
import { getCached, setCached } from './huntValidationCache.js';

export type HuntMode = 'wild' | 'stationary' | 'gift' | 'egg' | 'fishing';

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
      SELECT 1 FROM map_encounters WHERE game = ? COLLATE NOCASE AND species_id = ?
      UNION ALL
      SELECT 1 FROM location_events WHERE game = ? COLLATE NOCASE AND species_id = ?
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
      'SELECT EXISTS(SELECT 1 FROM map_encounters WHERE game = ? COLLATE NOCASE AND species_id = ?) AS f'
    ).get(input.game, id) as { f: number };
    found = !!row.f;
  } else if (input.hunt_mode === 'gift' || input.hunt_mode === 'stationary') {
    const types = input.hunt_mode === 'gift' ? GIFT_EVENT_TYPES : STATIONARY_EVENT_TYPES;
    const placeholders = types.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT EXISTS(SELECT 1 FROM location_events WHERE game = ? COLLATE NOCASE AND species_id = ? AND event_type IN (${placeholders})) AS f`
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
    fishing: 'fishing encounters',
  };
  return {
    id: 'mode_species',
    severity: 'error',
    message: `${speciesNameOrId(id)} can't be obtained via ${modeLabel[input.hunt_mode]} in ${input.game}.`,
  };
}

function locationIdForKey(currentLocationKey: string, _game: string): number | null {
  if (!currentLocationKey) return null;
  // map_locations has no game column — location_key is game-agnostic in this seed
  const row = db.prepare(
    'SELECT id FROM map_locations WHERE location_key = ? LIMIT 1'
  ).get(currentLocationKey) as { id?: number } | undefined;
  return row?.id ?? null;
}

function locationNameForKey(currentLocationKey: string): string {
  if (!currentLocationKey) return 'unknown location';
  const row = db.prepare(
    'SELECT display_name FROM map_locations WHERE location_key = ? LIMIT 1'
  ).get(currentLocationKey) as { display_name?: string } | undefined;
  return row?.display_name ?? currentLocationKey;
}

function ruleWildLocation(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'wild') return null;
  if (!ctx.worldState) {
    return { id: 'wild_location', severity: 'skipped', message: 'Load a save to validate location.' };
  }
  const locId = locationIdForKey(ctx.worldState.currentLocationKey, input.game);
  if (locId == null) {
    return {
      id: 'wild_location',
      severity: 'warning',
      message: `Couldn't resolve current location ("${ctx.worldState.currentLocationKey || 'unknown'}").`,
    };
  }
  const row = db.prepare(
    'SELECT EXISTS(SELECT 1 FROM map_encounters WHERE location_id = ? AND game = ? COLLATE NOCASE) AS f'
  ).get(locId, input.game) as { f: number };
  if (row.f) return null;
  return {
    id: 'wild_location',
    severity: 'error',
    message: `No wild encounters at ${locationNameForKey(ctx.worldState.currentLocationKey)}.`,
    detail: 'Move to a route with grass, cave, or water tiles before starting the hunt.',
  };
}

function ruleWildEncounter(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'wild') return null;
  if (input.target_species_id == null) return null;
  const gen = gameGen(input.game);
  if (gen >= 3) {
    return {
      id: 'wild_encounter',
      severity: 'skipped',
      message: `Encounter data not yet available for ${input.game}.`,
    };
  }
  if (!ctx.worldState) return null;
  const locId = locationIdForKey(ctx.worldState.currentLocationKey, input.game);
  if (locId == null) return null;
  const row = db.prepare(
    'SELECT EXISTS(SELECT 1 FROM map_encounters WHERE location_id = ? AND game = ? COLLATE NOCASE AND species_id = ?) AS f'
  ).get(locId, input.game, input.target_species_id) as { f: number };
  if (row.f) return null;
  return {
    id: 'wild_encounter',
    severity: 'warning',
    message: `${speciesNameOrId(input.target_species_id)} doesn't appear at ${locationNameForKey(ctx.worldState.currentLocationKey)}.`,
    detail: 'Encounter data may be incomplete — proceed with caution or move to a known route for this species.',
  };
}

interface DaycareParent {
  species_id?: number;
  egg_groups?: string[] | string;
}
interface DaycareInfo {
  parents?: DaycareParent[];
  parent1?: DaycareParent | null;
  parent2?: DaycareParent | null;
}

function parentEggGroups(p: DaycareParent | null | undefined): string[] {
  if (!p) return [];
  if (Array.isArray(p.egg_groups)) return p.egg_groups.map(g => g.toLowerCase());
  if (typeof p.egg_groups === 'string' && p.egg_groups.length) {
    return p.egg_groups.split(',').map(g => g.trim().toLowerCase());
  }
  if (p.species_id != null) {
    const row = db.prepare('SELECT egg_groups FROM species WHERE id = ?').get(p.species_id) as { egg_groups?: string } | undefined;
    return (row?.egg_groups ?? '').split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function ruleEggDaycare(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'egg') return null;
  if (!ctx.worldState && !ctx.daycare) {
    return { id: 'egg_daycare', severity: 'skipped', message: 'Load a save to validate daycare.' };
  }
  const gen = gameGen(input.game);
  if (gen >= 3 && !ctx.daycare) {
    return {
      id: 'egg_daycare',
      severity: 'skipped',
      message: `Daycare reading not yet available for ${input.game}.`,
    };
  }

  const dc = (ctx.daycare ?? {}) as DaycareInfo;
  const parents: DaycareParent[] = dc.parents
    ?? [dc.parent1 ?? null, dc.parent2 ?? null].filter(Boolean) as DaycareParent[];

  if (parents.length < 2) {
    return {
      id: 'egg_daycare',
      severity: 'error',
      message: parents.length === 0 ? 'Daycare is empty.' : 'Daycare has only one Pokémon.',
      detail: 'Drop off two compatible Pokémon at the daycare before starting an egg hunt.',
    };
  }

  const g1 = parentEggGroups(parents[0]);
  const g2 = parentEggGroups(parents[1]);
  const dittoOnEither = g1.includes('ditto') || g2.includes('ditto');
  const overlap = g1.some(g => g2.includes(g));
  if (!dittoOnEither && !overlap) {
    return {
      id: 'egg_daycare',
      severity: 'error',
      message: 'Daycare parents are not in compatible egg groups.',
    };
  }

  if (input.target_species_id != null) {
    const row = db.prepare('SELECT egg_groups FROM species WHERE id = ?').get(input.target_species_id) as { egg_groups?: string } | undefined;
    const targetGroups = (row?.egg_groups ?? '').split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
    if (targetGroups.length && !dittoOnEither) {
      const matches = targetGroups.some(g => g1.includes(g) || g2.includes(g));
      if (!matches) {
        return {
          id: 'egg_daycare',
          severity: 'error',
          message: `${speciesNameOrId(input.target_species_id)}'s egg group doesn't match either parent.`,
        };
      }
    }
  }

  return null;
}

export async function validateHuntConfig(input: ValidationInput): Promise<ValidationReport> {
  const checks: CheckResult[] = [];

  const gs = ruleGameSpecies(input);
  if (gs) checks.push(gs);
  const ms = ruleModeSpecies(input);
  if (ms) checks.push(ms);

  let ctx: SaveContext = { worldState: null, daycare: null };
  if (input.sav_path) {
    const cached = getCached(input.sav_path, input.game);
    if (cached) {
      ctx = cached;
    } else {
      ctx = await loadSaveContext(input.sav_path, input.game);
      setCached(input.sav_path, input.game, ctx);
    }
    if (ctx.parseError) {
      checks.push({
        id: 'wild_location',
        severity: 'warning',
        message: "Couldn't read save — save-aware checks skipped.",
        detail: ctx.parseError,
      });
    }
  }

  const wl = ruleWildLocation(input, ctx);
  if (wl) checks.push(wl);
  const we = ruleWildEncounter(input, ctx);
  if (we) checks.push(we);
  const ed = ruleEggDaycare(input, ctx);
  if (ed) checks.push(ed);

  const ok = !checks.some(c => c.severity === 'error');
  return { ok, checks };
}
