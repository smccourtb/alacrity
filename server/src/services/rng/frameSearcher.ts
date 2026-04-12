// server/src/services/rng/frameSearcher.ts

import { TinyMT } from "./tinymt.js";
import { SFMT } from "./sfmt.js";
import { LCRNG } from "./mt19937.js";
import {
  generatePokemonGen4,
  generatePokemonGen6,
  type RNGPokemon,
  type GenerationParams,
  NATURE_NAMES,
} from "./pokemon.js";
import type { GameMemoryMap } from "./memoryMap.js";

export interface SearchFilters {
  shiny?: boolean;
  nature?: number;
  minIVs?: [number, number, number, number, number, number];
  ability?: number;
  gender?: number;
}

export interface SearchResult {
  pokemon: RNGPokemon;
  framesAway: number;
}

export function searchGen6(
  state: [number, number, number, number],
  params: GenerationParams,
  filters: SearchFilters,
  maxFrames: number = 1_000_000
): SearchResult | null {
  const rng = new TinyMT(state[0], state[1], state[2], state[3]);

  for (let frame = 0; frame < maxFrames; frame++) {
    const clone = rng.clone();
    const pokemon = generatePokemonGen6(() => clone.nextUint(), frame, params);

    if (matchesFilters(pokemon, filters)) {
      return { pokemon, framesAway: frame };
    }

    rng.nextUint();
  }

  return null;
}

export function searchGen7(
  seed: number,
  params: GenerationParams,
  filters: SearchFilters,
  startFrame: number = 0,
  maxFrames: number = 1_000_000
): SearchResult | null {
  const rng = new SFMT(seed);

  rng.advance(startFrame);

  for (let frame = startFrame; frame < startFrame + maxFrames; frame++) {
    const clone = rng.clone();
    const pokemon = generatePokemonGen6(() => clone.nextUint(), frame, params);

    if (matchesFilters(pokemon, filters)) {
      return { pokemon, framesAway: frame - startFrame };
    }

    rng.nextUint();
  }

  return null;
}

/**
 * Search Gen 4/5 frames using LCRNG (Method 1).
 * Seed is the current LCRNG state. Each frame advances one LCRNG step,
 * then consumes 4 calls for PID + IVs.
 */
export function searchGen4(
  seed: number,
  params: GenerationParams,
  filters: SearchFilters,
  maxFrames: number = 1_000_000
): SearchResult | null {
  const rng = new LCRNG(seed);

  for (let frame = 0; frame < maxFrames; frame++) {
    // Clone from current state to generate without advancing the main iterator
    const cloneSeed = rng.currentSeed;
    const clone = new LCRNG(cloneSeed);
    // Consume one call to advance past current frame's "start"
    clone.next();
    const pokemon = generatePokemonGen4(() => clone.next(), frame, params);

    if (matchesFilters(pokemon, filters)) {
      return { pokemon, framesAway: frame };
    }

    rng.next(); // Advance main RNG by one frame
  }

  return null;
}

/**
 * Search Gen 5 frames — same algorithm as Gen 4 for Method 1 encounters.
 */
export function searchGen5(
  seed: number,
  params: GenerationParams,
  filters: SearchFilters,
  maxFrames: number = 1_000_000
): SearchResult | null {
  return searchGen4(seed, params, filters, maxFrames);
}

function matchesFilters(pokemon: RNGPokemon, filters: SearchFilters): boolean {
  if (filters.shiny !== undefined && pokemon.shiny !== filters.shiny) {
    return false;
  }
  if (filters.nature !== undefined && pokemon.nature !== filters.nature) {
    return false;
  }
  if (filters.ability !== undefined && pokemon.ability !== filters.ability) {
    return false;
  }
  if (filters.gender !== undefined && pokemon.gender !== filters.gender) {
    return false;
  }
  if (filters.minIVs) {
    for (let i = 0; i < 6; i++) {
      if (pokemon.ivs[i] < filters.minIVs[i]) {
        return false;
      }
    }
  }
  return true;
}

export function formatResult(result: SearchResult): string {
  const p = result.pokemon;
  const ivStr = `${p.ivs[0]}/${p.ivs[1]}/${p.ivs[2]}/${p.ivs[3]}/${p.ivs[4]}/${p.ivs[5]}`;
  const shinyStr = p.squareShiny
    ? "■ Square Shiny"
    : p.shiny
      ? "★ Star Shiny"
      : "";
  const abilityStr = p.ability === 2 ? "HA" : `Ability ${p.ability}`;
  return `Frame ${p.frame}: ${NATURE_NAMES[p.nature]} ${abilityStr} [${ivStr}] ${shinyStr}`.trim();
}
