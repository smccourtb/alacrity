// client/src/components/hunt/odds.ts
// Generation-aware shiny-hunt odds.
//
// Gen 1/2: DV combinatorics over a 65,536-state space (Atk/Def/Spd/Spc × 16 each).
// Gen 6/7: probabilistic model — base shiny rate × filters (nature, ability,
// IV constraints under guaranteed-perfect rules, gender rate).
//
// The function returns { combos, total, odds } where:
//   - Gen 1/2: combos = #matching DV states, total = 65,536 (or 512 for shiny-Ditto egg)
//   - Gen 6/7: combos = 1, total = round(1/p); still conveys "1 / N"

import { is3DSGame } from './constants';

export const SHINY_ATK_VALUES = [2, 3, 6, 7, 10, 11, 14, 15];
const ALL_DV = Array.from({ length: 16 }, (_, i) => i);

export interface OddsInput {
  game: string | undefined;
  huntMode: string;
  shiny: boolean;
  perfect: boolean;
  gender: string;
  genderRate: number | undefined;

  // Gen 1/2
  minAtk: number;
  minDef: number;
  minSpd: number;
  minSpc: number;

  // Gen 6/7
  nature: string | undefined;
  ability: string | undefined;
  encounterType: string | undefined;
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } | undefined;
  shinyCharm: boolean;
  guaranteedIvs: number;
}

export interface OddsOutput {
  combos: number;
  total: number;
  odds: string;
  /** Approximations or missing data that affect this number. Rendered as a disclaimer. */
  caveats?: string[];
}

export function calculateOdds(opts: OddsInput): OddsOutput {
  return is3DSGame(opts.game ?? '') ? calculateOdds3DS(opts) : calculateOddsGen12(opts);
}

// ─── Gen 1/2 ───────────────────────────────────────────────────────────────

function genderDvThreshold(genderRate: number | undefined): number {
  if (genderRate === undefined) return -2;
  const thresholds: Record<number, number> = {
    [-1]: -2, 0: -1, 1: 1, 2: 3, 4: 7, 6: 11, 7: 13, 8: 16,
  };
  return thresholds[genderRate] ?? -2;
}

function calculateOddsGen12(opts: OddsInput): OddsOutput {
  const isEgg = opts.huntMode === 'egg';
  const total = isEgg ? 16 * 1 * 16 * 2 : 65536;

  let validAtk = [...ALL_DV];
  let validDef = isEgg ? [10] : [...ALL_DV];
  let validSpd = [...ALL_DV];
  let validSpc = isEgg ? [2, 10] : [...ALL_DV];

  if (opts.shiny) {
    validAtk = validAtk.filter(v => SHINY_ATK_VALUES.includes(v));
    validDef = [10];
    validSpd = [10];
    validSpc = [10];
  }

  if (opts.perfect) {
    validAtk = validAtk.filter(v => v === 15);
    if (!opts.shiny) {
      validDef = validDef.filter(v => v === 15);
      validSpd = validSpd.filter(v => v === 15);
      validSpc = validSpc.filter(v => v === 15);
    }
  }

  const threshold = genderDvThreshold(opts.genderRate);
  if (opts.gender === 'male' && threshold >= 0) {
    validAtk = validAtk.filter(v => v > threshold);
  } else if (opts.gender === 'female') {
    if (threshold < 0) {
      validAtk = [];
    } else if (threshold <= 15) {
      validAtk = validAtk.filter(v => v <= threshold);
    }
  }

  // Atk in shiny mode is picked from a discrete dropdown of valid shiny DVs,
  // so a specific value means "exactly this DV", not a floor. Other stats are
  // raw numeric inputs that read as thresholds, so >=.
  const atkExact = opts.shiny && opts.minAtk > 0 && SHINY_ATK_VALUES.includes(opts.minAtk);
  if (atkExact) validAtk = validAtk.filter(v => v === opts.minAtk);
  else if (opts.minAtk > 0) validAtk = validAtk.filter(v => v >= opts.minAtk);
  if (opts.minDef > 0) validDef = validDef.filter(v => v >= opts.minDef);
  if (opts.minSpd > 0) validSpd = validSpd.filter(v => v >= opts.minSpd);
  if (opts.minSpc > 0) validSpc = validSpc.filter(v => v >= opts.minSpc);

  const combos = validAtk.length * validDef.length * validSpd.length * validSpc.length;
  return formatOdds(combos, total);
}

// ─── Gen 6/7 ───────────────────────────────────────────────────────────────

// Per-method Hidden Ability rates, verified against community sources:
//   Friend Safari: Bulbapedia — "approximately 1 in 3"
//   Horde:         ~5% per slot (pokemondb.net community testing, 48/1000 Whismur)
//   DexNav:        25% max at Search Level ≥100 (5/15/20/25 by SL band, Bulbapedia)
//   SOS:           15% at chain ≥30 in Sun/Moon (Serebii)
//   Breeding:      60% with Ability Capsule on HA parent (Gen 6+)
//   Stationary:    0 — most legendaries don't have HA accessible in-game
//   Default:       0 — regular wild encounters have no HA route
const HA_RATE: Record<string, { rate: number; note?: string }> = {
  friend_safari:    { rate: 1 / 3 },
  horde:            { rate: 0.05 },
  dexnav_chain:     { rate: 0.25, note: 'DexNav HA rate caps at 25% (Search Level ≥100); lower SLs: 5–20%' },
  sos_chain:        { rate: 0.15, note: 'SOS HA rate 15% at chain ≥30 (Sun/Moon)' },
  breeding:         { rate: 0.6, note: 'Assumes Ability Capsule on a female HA parent (60%); varies otherwise' },
  stationary:       { rate: 1 / 150, note: 'HA on stationary legendaries is usually transfer-only in Gen 6/7 — effectively unreachable via catching' },
  default:          { rate: 1 / 150, note: 'HA from plain wild encounters is effectively unreachable without a method-specific route (Friend Safari / Horde / DexNav / SOS / breeding)' },
};

function calculateOdds3DS(opts: OddsInput): OddsOutput {
  const caveats: string[] = [];
  let p = 1;

  // 1. Shiny rate
  if (opts.shiny) {
    const base = 1 / 4096;
    p *= opts.shinyCharm ? base * 3 : base;
    if (opts.encounterType === 'breeding') {
      caveats.push('Base shiny rate shown — Masuda method (parents from different regions) multiplies shiny odds by 6');
    } else if (opts.encounterType === 'sos_chain') {
      caveats.push('Base shiny rate shown — chain ≥70 improves shiny to ~1/683 in Sun/Moon');
    } else if (opts.encounterType === 'dexnav_chain') {
      caveats.push('Base shiny rate shown — DexNav chain and Search Level give small shiny boosts');
    }
  }

  // 2. Gender rate (independent of IVs in Gen 3+)
  if (opts.gender !== 'any' && opts.genderRate !== undefined) {
    const rate = opts.genderRate;
    if (rate === -1) return impossible();
    if (opts.gender === 'female') {
      if (rate === 0) return impossible();
      p *= rate / 8;
    } else if (opts.gender === 'male') {
      if (rate === 8) return impossible();
      p *= (8 - rate) / 8;
    }
  }

  // 3. Nature (uniform over 25 — Synchronize not modeled where it applies; caveat)
  if (opts.nature && opts.nature !== '__any__') {
    p *= 1 / 25;
    const syncAppliesTo = new Set(['wild', 'stationary', 'horde', 'dexnav_chain']);
    if (!opts.encounterType || syncAppliesTo.has(opts.encounterType)) {
      caveats.push('Nature fixed at 1/25 — leading a Synchronize Pokemon lifts the match rate to ~1/2 (not modeled)');
    }
  }

  // 4. Ability filter
  if (opts.ability === 'hidden') {
    const key = opts.encounterType && HA_RATE[opts.encounterType] ? opts.encounterType : 'default';
    const entry = HA_RATE[key];
    p *= entry.rate;
    if (entry.note) caveats.push(entry.note);
  } else if (opts.ability === 'normal') {
    p *= 0.5;
    caveats.push('Normal ability assumed 50% (dual-ability species); single-ability species are 100%');
  }

  // 5. IV constraints
  const minIvs = opts.ivs
    ? [opts.ivs.hp, opts.ivs.atk, opts.ivs.def, opts.ivs.spa, opts.ivs.spd, opts.ivs.spe]
    : [0, 0, 0, 0, 0, 0];
  const guaranteed = Math.max(0, Math.min(6, opts.guaranteedIvs ?? 0));
  const ivProb = ivProbability(minIvs, guaranteed);
  if (ivProb === 0) return impossible();
  p *= ivProb;

  if (p === 0) return impossible();
  if (p >= 1) return { combos: 1, total: 1, odds: '1/1', caveats: caveats.length ? caveats : undefined };

  const total = Math.round(1 / p);
  return {
    combos: 1,
    total,
    odds: `1/${total.toLocaleString()}`,
    caveats: caveats.length ? caveats : undefined,
  };
}

function impossible(): OddsOutput {
  return { combos: 0, total: 0, odds: 'Impossible' };
}

/**
 * Probability that a random 6-stat IV draw meets the per-stat minimums, given
 * `guaranteed` of the 6 stats are forced to 31 (random positions).
 *
 * - guaranteed === 6: every stat is 31, pass iff every min ≤ 31 (trivially true).
 * - guaranteed === 0: independent uniform 0–31 per stat.
 * - else: average over all C(6, guaranteed) position selections.
 */
function ivProbability(min: number[], guaranteed: number): number {
  if (min.some(m => m > 31)) return 0;
  if (guaranteed >= 6) return 1;
  if (guaranteed === 0) {
    return min.reduce((acc, m) => acc * (32 - Math.max(0, m)) / 32, 1);
  }

  const positions = combinations([0, 1, 2, 3, 4, 5], guaranteed);
  let total = 0;
  for (const sel of positions) {
    let prob = 1;
    for (let i = 0; i < 6; i++) {
      if (sel.includes(i)) continue;
      prob *= (32 - Math.max(0, min[i])) / 32;
    }
    total += prob;
  }
  return total / positions.length;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// ─── shared formatting ─────────────────────────────────────────────────────

function formatOdds(combos: number, total: number): OddsOutput {
  let odds: string;
  if (combos === 0) odds = 'Impossible';
  else if (combos === total) odds = '1/1';
  else {
    const ratio = total / combos;
    odds = ratio === Math.floor(ratio)
      ? `1/${ratio.toLocaleString()}`
      : `1/${ratio.toFixed(1).toLocaleString()}`;
  }
  return { combos, total, odds };
}
