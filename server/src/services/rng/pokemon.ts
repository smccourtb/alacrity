// server/src/services/rng/pokemon.ts

import { computePSV, computePRV } from "./tsvCalculator.js";

export interface RNGPokemon {
  frame: number;
  pid: number;
  ec: number;
  psv: number;
  prv: number;
  nature: number;
  ability: number;
  gender: number; // 0=male, 1=female, 2=genderless
  ivs: [number, number, number, number, number, number]; // HP, Atk, Def, SpA, SpD, Spe
  shiny: boolean;
  squareShiny: boolean;
}

export interface GenerationParams {
  tsv: number;
  trv: number;
  perfectIVCount: number;
  isShinyLocked: boolean;
  pidRerollCount: number;
  genderRatio: number; // -1=genderless, 0=always male, 254=always female, else threshold
}

/**
 * Generate a Pokemon's stats from a Gen 6 PRNG state.
 * Consumes RNG calls in the same order as the actual game.
 */
export function generatePokemonGen6(
  getrand: () => number,
  frame: number,
  params: GenerationParams
): RNGPokemon {
  const ec = getrand();
  let pid = 0;
  let shiny = false;
  let squareShiny = false;

  // PID generation with rerolls (Shiny Charm adds +2 rerolls)
  for (let i = 0; i < params.pidRerollCount + 1; i++) {
    pid = getrand();
    const psv = computePSV(pid);
    if (psv === params.tsv) {
      if (params.isShinyLocked) {
        pid ^= 0x10000000;
      } else {
        shiny = true;
        squareShiny = computePRV(pid) === params.trv;
      }
      break;
    }
  }

  // IVs: assign guaranteed perfect IVs first, then randomize rest
  const ivs: [number, number, number, number, number, number] = [-1, -1, -1, -1, -1, -1];
  let assigned = 0;
  while (assigned < params.perfectIVCount) {
    const slot = getrand() % 6;
    if (ivs[slot] === -1) {
      ivs[slot] = 31;
      assigned++;
    }
  }
  for (let i = 0; i < 6; i++) {
    if (ivs[i] === -1) {
      ivs[i] = getrand() >>> 27; // Upper 5 bits -> 0-31
    }
  }

  const ability = getrand() % 3;
  const nature = getrand() % 25;

  let gender = 2; // genderless
  if (params.genderRatio === 0) {
    gender = 0;
  } else if (params.genderRatio === 254) {
    gender = 1;
  } else if (params.genderRatio !== -1) {
    gender = (getrand() % 252) + 1 < params.genderRatio ? 1 : 0;
  }

  return {
    frame,
    pid,
    ec,
    psv: computePSV(pid),
    prv: computePRV(pid),
    nature,
    ability,
    gender,
    ivs,
    shiny,
    squareShiny,
  };
}

/**
 * Generate a Pokemon's stats from a Gen 7 PRNG state.
 * Gen 7 uses SFMT but the generation order is the same as Gen 6 for stationary/wild.
 */
export function generatePokemonGen7(
  getrand: () => number,
  frame: number,
  params: GenerationParams
): RNGPokemon {
  return generatePokemonGen6(getrand, frame, params);
}

/**
 * Generate a Pokemon's stats from a Gen 4 RNG state.
 *
 * Gen 4 uses LCRNG for PID (two consecutive u16 calls → u32) and a separate
 * method for IVs. The shiny check uses (TID ^ SID ^ PID_high ^ PID_low) < 8.
 *
 * Call order for Method 1 (stationary/wild):
 *   1. PID low = LCRNG() >> 16
 *   2. PID high = LCRNG() >> 16
 *   3. IVs part 1 = LCRNG() >> 16 (HP, Atk, Def)
 *   4. IVs part 2 = LCRNG() >> 16 (Spe, SpA, SpD)
 *
 * Nature = PID % 25, Ability = PID & 1, Gender = PID & 0xFF vs threshold
 */
export function generatePokemonGen4(
  getrand: () => number,
  frame: number,
  params: GenerationParams
): RNGPokemon {
  // PID generation — reroll if shiny when shiny-locked
  let pid: number;
  let shiny = false;
  let squareShiny = false;

  for (let i = 0; i < params.pidRerollCount + 1; i++) {
    const pidLow = (getrand() >>> 16) & 0xffff;
    const pidHigh = (getrand() >>> 16) & 0xffff;
    pid = ((pidHigh << 16) | pidLow) >>> 0;

    const sv = (params.tsv ^ pidHigh ^ pidLow);
    if (sv < 8) {
      if (params.isShinyLocked) {
        // Reroll to avoid shiny
        continue;
      }
      shiny = true;
      squareShiny = sv === 0;
      break;
    }
  }
  // If all rerolls exhausted, use the last PID
  pid = pid! >>> 0;

  // IVs from two LCRNG calls (Method 1)
  const iv1 = (getrand() >>> 16) & 0xffff;
  const iv2 = (getrand() >>> 16) & 0xffff;

  const ivs: [number, number, number, number, number, number] = [
    iv1 & 0x1f,         // HP
    (iv1 >>> 5) & 0x1f, // Atk
    (iv1 >>> 10) & 0x1f, // Def
    (iv2 >>> 5) & 0x1f, // SpA
    (iv2 >>> 10) & 0x1f, // SpD
    iv2 & 0x1f,         // Spe
  ];

  // Guaranteed perfect IVs (legendaries, etc.)
  let assigned = 0;
  while (assigned < params.perfectIVCount) {
    const slot = getrand() % 6;
    if (ivs[slot] !== 31) {
      ivs[slot] = 31;
      assigned++;
    }
  }

  const nature = pid % 25;
  const ability = pid & 1;

  let gender = 2; // genderless
  if (params.genderRatio === 0) {
    gender = 0;
  } else if (params.genderRatio === 254) {
    gender = 1;
  } else if (params.genderRatio !== -1) {
    gender = (pid & 0xff) < params.genderRatio ? 1 : 0;
  }

  return {
    frame,
    pid,
    ec: pid, // Gen 4 has no EC; use PID as proxy
    psv: computePSV(pid),
    prv: computePRV(pid),
    nature,
    ability,
    gender,
    ivs,
    shiny,
    squareShiny,
  };
}

/**
 * Generate a Pokemon's stats from a Gen 5 RNG state.
 *
 * Gen 5 is similar to Gen 4 but PID and IVs use separate RNG instances:
 * - PIDRNG (MT19937) for PID
 * - IVRNG (separate MT19937) for IVs
 *
 * For the frame searcher, we treat them as sequential calls from the same MT
 * since we read the combined state from memory.
 */
export function generatePokemonGen5(
  getrand: () => number,
  frame: number,
  params: GenerationParams
): RNGPokemon {
  // Gen 5 uses the same method as Gen 4 for Method 1 encounters
  return generatePokemonGen4(getrand, frame, params);
}

export const NATURE_NAMES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
] as const;
