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
  | 'fishing_location'
  | 'fishing_encounter'
  | 'fishing_rod'
  | 'egg_daycare'
  | 'stationary_location'
  | 'stationary_party';

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
  /** Party pokemon (Gen 1/2 only right now). No HP fields — parser doesn't read them. */
  party: Array<{ species_id: number }>;
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
    let party: SaveContext['party'] = [];
    const gen = gameGen(game);
    if (gen === 1) {
      const parsed = parseGen1Save(sav_path, game);
      daycare = parsed.daycare ?? null;
      party = (parsed.pokemon ?? []).filter((p: any) => p.box === -1);
    } else if (gen === 2) {
      const parsed = parseGen2Save(sav_path, game);
      daycare = parsed.daycare ?? null;
      party = (parsed.pokemon ?? []).filter((p: any) => p.box === -1);
    }
    // Gen 3+ daycare/party reading not wired here; rules will report 'skipped' when needed.
    return { worldState, daycare, party };
  } catch (err: any) {
    return { worldState: null, daycare: null, party: [], parseError: String(err?.message ?? err) };
  }
}

function speciesNameOrId(species_id: number): string {
  const row = db.prepare('SELECT name FROM species WHERE id = ?').get(species_id) as { name?: string } | undefined;
  if (!row?.name) return `species #${species_id}`;
  return row.name.charAt(0).toUpperCase() + row.name.slice(1).replace(/-/g, ' ');
}

function ruleGameSpecies(input: ValidationInput): CheckResult | null {
  if (input.target_species_id == null) return null;
  // Egg hunts can target species not natively in the game — parents may be
  // bred from / traded over from another title (e.g. Squirtle in Crystal via
  // a Gen 1 trade-up). Parent compatibility is enforced by ruleEggDaycare.
  if (input.hunt_mode === 'egg') return null;

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

// map_encounters.method values that belong to each hunt mode. PokeAPI's
// 'special' is a catch-all (starters, Game Corner prizes, Snorlax, Mewtwo,
// fossil revivals, in-game trades), so it lands in BOTH gift and stationary
// buckets — better to over-allow than block a legitimate hunt with a
// false-positive error.
const MODE_ENCOUNTER_METHODS: Record<HuntMode, string[]> = {
  wild: ['grass', 'cave', 'surf', 'rock-smash', 'headbutt', 'contest'],
  fishing: ['old-rod', 'good-rod', 'super-rod'],
  gift: ['gift', 'special'],
  stationary: ['static', 'special'],
  egg: [],
};

const MODE_EVENT_TYPES: Record<HuntMode, string[]> = {
  wild: [],
  fishing: [],
  gift: ['gift', 'gift_pokemon', 'trade'],
  stationary: ['static_pokemon', 'legendary', 'story'],
  egg: [],
};

function existsForMode(game: string, speciesId: number, mode: HuntMode): boolean {
  const methods = MODE_ENCOUNTER_METHODS[mode];
  const events = MODE_EVENT_TYPES[mode];

  if (methods.length) {
    const ph = methods.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT EXISTS(SELECT 1 FROM map_encounters
         WHERE game = ? COLLATE NOCASE AND species_id = ? AND method IN (${ph})) AS f`,
    ).get(game, speciesId, ...methods) as { f: number };
    if (row.f) return true;
  }

  if (events.length) {
    const ph = events.map(() => '?').join(',');
    const row = db.prepare(
      `SELECT EXISTS(SELECT 1 FROM location_events
         WHERE game = ? COLLATE NOCASE AND species_id = ? AND event_type IN (${ph})) AS f`,
    ).get(game, speciesId, ...events) as { f: number };
    if (row.f) return true;
  }

  return false;
}

function ruleModeSpecies(input: ValidationInput): CheckResult | null {
  if (input.target_species_id == null) return null;

  // Egg-mode species filter handled by ruleEggTarget / ruleEggDaycare, which
  // know about breedability + parent compatibility. Let this rule pass.
  if (input.hunt_mode === 'egg') return null;

  if (existsForMode(input.game, input.target_species_id, input.hunt_mode)) return null;

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
    message: `${speciesNameOrId(input.target_species_id)} can't be obtained via ${modeLabel[input.hunt_mode]} in ${input.game}.`,
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

/**
 * Generic location/encounter validator for the two save-position-dependent
 * modes (wild + fishing). Each mode emits its own check ids so the UI can
 * label them correctly.
 */
function locationCheckIds(mode: HuntMode): { loc: CheckId; enc: CheckId } {
  if (mode === 'fishing') return { loc: 'fishing_location', enc: 'fishing_encounter' };
  return { loc: 'wild_location', enc: 'wild_encounter' };
}

function ruleEncounterLocation(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'wild' && input.hunt_mode !== 'fishing') return null;
  const { loc } = locationCheckIds(input.hunt_mode);
  const isFishing = input.hunt_mode === 'fishing';
  const modeWord = isFishing ? 'fishing' : 'wild';

  if (!ctx.worldState) {
    return {
      id: loc,
      severity: 'error',
      message: 'Load a save to validate location.',
      detail: `${modeWord[0].toUpperCase()}${modeWord.slice(1)} hunts use the save's current map to verify encounters — pick a save file first.`,
    };
  }
  const locId = locationIdForKey(ctx.worldState.currentLocationKey, input.game);
  if (locId == null) {
    return {
      id: loc,
      severity: 'warning',
      message: `Couldn't resolve current location ("${ctx.worldState.currentLocationKey || 'unknown'}").`,
    };
  }
  const methods = MODE_ENCOUNTER_METHODS[input.hunt_mode];
  const ph = methods.map(() => '?').join(',');
  const row = db.prepare(
    `SELECT EXISTS(SELECT 1 FROM map_encounters
       WHERE location_id = ? AND game = ? COLLATE NOCASE AND method IN (${ph})) AS f`,
  ).get(locId, input.game, ...methods) as { f: number };
  if (row.f) return null;

  return {
    id: loc,
    severity: 'error',
    message: `No ${modeWord} encounters at ${locationNameForKey(ctx.worldState.currentLocationKey)}.`,
    detail: isFishing
      ? 'Stand next to fishable water (Safari Zone, Dragon\'s Den, etc.) and save before starting.'
      : 'Move to a route with grass, cave, or water tiles before starting the hunt.',
  };
}

function ruleEncounterMatch(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'wild' && input.hunt_mode !== 'fishing') return null;
  if (input.target_species_id == null) return null;
  const gen = gameGen(input.game);
  const { enc } = locationCheckIds(input.hunt_mode);
  if (gen >= 3) {
    return {
      id: enc,
      severity: 'skipped',
      message: `Encounter data not yet available for ${input.game}.`,
    };
  }
  if (!ctx.worldState) return null;
  const locId = locationIdForKey(ctx.worldState.currentLocationKey, input.game);
  if (locId == null) return null;
  const methods = MODE_ENCOUNTER_METHODS[input.hunt_mode];
  const ph = methods.map(() => '?').join(',');
  const row = db.prepare(
    `SELECT EXISTS(SELECT 1 FROM map_encounters
       WHERE location_id = ? AND game = ? COLLATE NOCASE AND species_id = ? AND method IN (${ph})) AS f`,
  ).get(locId, input.game, input.target_species_id, ...methods) as { f: number };
  if (row.f) return null;

  // Where DOES this species appear in this mode? Surface a hint so the user
  // knows where to walk to.
  const spotsRows = db.prepare(
    `SELECT DISTINCT ml.display_name
       FROM map_encounters me
       JOIN map_locations ml ON ml.id = me.location_id
      WHERE me.game = ? COLLATE NOCASE AND me.species_id = ? AND me.method IN (${ph})
      ORDER BY ml.display_name LIMIT 4`,
  ).all(input.game, input.target_species_id, ...methods) as Array<{ display_name: string }>;
  const spots = spotsRows.map(r => r.display_name).join(', ');
  const modeWord = input.hunt_mode === 'fishing' ? 'via fishing' : 'in the wild';

  return {
    id: enc,
    severity: 'error',
    message: `${speciesNameOrId(input.target_species_id)} doesn't appear ${modeWord} at ${locationNameForKey(ctx.worldState.currentLocationKey)}.`,
    detail: spots
      ? `Try: ${spots}.`
      : 'Move to a route this species appears at before starting.',
  };
}

function ruleFishingRod(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'fishing') return null;
  if (input.target_species_id == null) return null;
  if (!ctx.worldState) return null;
  const locId = locationIdForKey(ctx.worldState.currentLocationKey, input.game);
  if (locId == null) return null;
  const rodRows = db.prepare(
    `SELECT DISTINCT method FROM map_encounters
      WHERE location_id = ? AND game = ? COLLATE NOCASE AND species_id = ?
        AND method IN ('old-rod','good-rod','super-rod')`,
  ).all(locId, input.game, input.target_species_id) as Array<{ method: string }>;
  if (rodRows.length === 0) return null; // ruleEncounterMatch handled the "wrong spot" error
  const required = rodRows.map(r => r.method).sort().reverse(); // super-rod first
  const pretty = required.map(r =>
    r === 'super-rod' ? 'Super Rod' : r === 'good-rod' ? 'Good Rod' : 'Old Rod'
  );
  return {
    id: 'fishing_rod',
    severity: 'warning',
    message: `Requires ${pretty.join(' or ')}.`,
    detail: 'Make sure the rod is in your bag before saving — the script can\'t cast without it.',
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
  // Gen 2 parser uses mon1/mon2 — keep both shapes supported.
  mon1?: DaycareParent | null;
  mon2?: DaycareParent | null;
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

/**
 * Target-property-only egg checks — fire regardless of save state, so users
 * see the problem the moment they pick a bad target without needing to load
 * a save first.
 */
function ruleEggTarget(input: ValidationInput): CheckResult | null {
  if (input.hunt_mode !== 'egg' || input.target_species_id == null) return null;

  const meta = db.prepare('SELECT is_baby FROM species WHERE id = ?').get(input.target_species_id) as { is_baby: number } | undefined;
  const isBaby = meta?.is_baby === 1;
  const groupRows = db.prepare('SELECT egg_group FROM species_egg_groups WHERE species_id = ?').all(input.target_species_id) as Array<{ egg_group: string }>;
  const groups = groupRows.map(r => r.egg_group.toLowerCase());

  // Un-breedable: only in 'no-eggs' and NOT a baby. Babies show up in no-eggs
  // but hatch from their evolved form, so they remain valid egg-hunt targets.
  if (!isBaby && groups.length > 0 && groups.every(g => g === 'no-eggs')) {
    return {
      id: 'egg_daycare',
      severity: 'error',
      message: `${speciesNameOrId(input.target_species_id)} can't be produced from an egg.`,
      detail: 'Legendary and mythical species have no egg group — try a different hunt mode.',
    };
  }

  if (isBaby) {
    return {
      id: 'egg_daycare',
      severity: 'warning',
      message: `${speciesNameOrId(input.target_species_id)} hatches only when its evolved form is in the daycare.`,
      detail: 'Some baby species also require an incense item (e.g. Sea Incense for Azurill, Odd Incense for Mime Jr.).',
    };
  }

  return null;
}

function ruleEggDaycare(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'egg') return null;
  if (!ctx.worldState && !ctx.daycare) {
    return {
      id: 'egg_daycare',
      severity: 'error',
      message: 'Load a save to validate the daycare.',
      detail: 'Egg hunts read the daycare directly from the save — pick a save file first.',
    };
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
  const parents: DaycareParent[] = (
    dc.parents
      ?? [dc.parent1 ?? dc.mon1 ?? null, dc.parent2 ?? dc.mon2 ?? null]
  ).filter(Boolean) as DaycareParent[];

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

  // Target-property checks (un-breedable, baby) already ran in ruleEggTarget.
  // Here we only enforce parent↔target egg-group compatibility.
  if (input.target_species_id != null) {
    const targetGroupRows = db.prepare('SELECT egg_group FROM species_egg_groups WHERE species_id = ?').all(input.target_species_id) as Array<{ egg_group: string }>;
    const targetGroups = targetGroupRows.map(r => r.egg_group.toLowerCase());

    const breedableGroups = targetGroups.filter(g => g !== 'no-eggs');
    if (breedableGroups.length && !dittoOnEither) {
      const matches = breedableGroups.some(g => g1.includes(g) || g2.includes(g));
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

function ruleStationaryLocation(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'stationary') return null;
  if (!ctx.worldState) {
    return {
      id: 'stationary_location',
      severity: 'error',
      message: 'Load a save to validate position.',
      detail: 'Stationary hunts need the save standing on the encounter tile — pick a save file first.',
    };
  }
  if (input.target_species_id == null) return null;

  const currentKey = ctx.worldState.currentLocationKey;
  if (!currentKey) return null;

  // Does the target actually spawn as a static/legendary in this game?
  const rows = db.prepare(`
    SELECT ml.location_key, ml.display_name
    FROM location_events le
    JOIN map_locations ml ON ml.id = le.location_id
    WHERE le.game = ? COLLATE NOCASE AND le.species_id = ? AND le.event_type IN ('static_pokemon', 'legendary')
  `).all(input.game, input.target_species_id) as Array<{ location_key: string; display_name: string }>;

  if (rows.length === 0) return null;

  const match = rows.find(r => r.location_key === currentKey);
  if (match) return null;

  const expected = rows.map(r => r.display_name).slice(0, 3).join(', ');
  const plural = rows.length > 1 ? ` (${rows.length} spots)` : '';
  return {
    id: 'stationary_location',
    severity: 'error',
    message: `Save isn't at the static spawn for ${speciesNameOrId(input.target_species_id)}.`,
    detail: `Expected: ${expected}${plural}. Walk to the encounter tile and save before starting.`,
  };
}

function ruleStationaryParty(input: ValidationInput, ctx: SaveContext): CheckResult | null {
  if (input.hunt_mode !== 'stationary') return null;
  if (!ctx.worldState) return null;
  // Only Gen 1/2 populate ctx.party today; Gen 3+ skips silently.
  const gen = gameGen(input.game);
  if (gen !== 1 && gen !== 2) return null;
  if (ctx.party.length === 0) {
    return {
      id: 'stationary_party',
      severity: 'error',
      message: 'Party is empty.',
      detail: 'Static battles need at least one Pokemon in your party.',
    };
  }
  // Fainted-party detection requires current-HP parsing which the Gen 1/2 party
  // parser doesn't expose yet. Leaving it out rather than false-passing.
  return null;
}

export async function validateHuntConfig(input: ValidationInput): Promise<ValidationReport> {
  const checks: CheckResult[] = [];

  const gs = ruleGameSpecies(input);
  if (gs) checks.push(gs);
  const ms = ruleModeSpecies(input);
  if (ms) checks.push(ms);

  let ctx: SaveContext = { worldState: null, daycare: null, party: [] };
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

  const wl = ruleEncounterLocation(input, ctx);
  if (wl) checks.push(wl);
  const we = ruleEncounterMatch(input, ctx);
  if (we) checks.push(we);
  const fr = ruleFishingRod(input, ctx);
  if (fr) checks.push(fr);
  const et = ruleEggTarget(input);
  if (et) checks.push(et);
  const ed = ruleEggDaycare(input, ctx);
  if (ed) checks.push(ed);
  const sl = ruleStationaryLocation(input, ctx);
  if (sl) checks.push(sl);
  const sp = ruleStationaryParty(input, ctx);
  if (sp) checks.push(sp);

  const ok = !checks.some(c => c.severity === 'error');
  return { ok, checks };
}
