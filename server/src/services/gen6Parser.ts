/**
 * Gen 6 Save Parser — Pokemon X/Y and Omega Ruby/Alpha Sapphire
 *
 * Reads a Checkpoint `main` file, locates party and box data,
 * and decodes each PK6 slot using the shared pkDecoder.
 *
 * File sizes:
 *   X/Y:  415,232 bytes (0x65600)
 *   ORAS: 483,328 bytes (0x76000)
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { decodePokemon, computeLevel, getGrowthRate, type Gen67Pokemon } from './pkDecoder.js';
import { extractGen6WorldState } from './gen6WorldState.js';

// ---------------------------------------------------------------------------
// Save structure constants
// ---------------------------------------------------------------------------

const XY_FILE_SIZE   = 0x65600;  // 415,232
const ORAS_FILE_SIZE = 0x76000;  // 483,328

// Party offset is the same for both XY and ORAS
const PARTY_OFFSET   = 0x14200;
const PARTY_SLOTS    = 6;
const PARTY_SLOT_SIZE = 260;

// Box data offset differs
const BOX_OFFSET_XY   = 0x22600;
const BOX_OFFSET_ORAS = 0x33000;

const NUM_BOXES      = 31;
const SLOTS_PER_BOX  = 30;
const BOX_SLOT_SIZE  = 232;

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGen6Save(filePath: string, game: string): ParseResult<Gen67Pokemon> {
  const buf = readFileSync(filePath);

  // Detect XY vs ORAS
  const lc = game.toLowerCase();
  const isOras = lc.includes('omega ruby') || lc.includes('alpha sapphire')
    || buf.length === ORAS_FILE_SIZE;

  const boxOffset = isOras ? BOX_OFFSET_ORAS : BOX_OFFSET_XY;

  const pokemon: Gen67Pokemon[] = [];

  // --- Parse party ---
  // Gen 6 party data starts directly at the offset with no count prefix.
  // Decode all 6 slots; decodePokemon returns null for empty ones.
  for (let i = 0; i < PARTY_SLOTS; i++) {
    const slotStart = PARTY_OFFSET + i * PARTY_SLOT_SIZE;
    if (slotStart + PARTY_SLOT_SIZE > buf.length) break;
    const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + PARTY_SLOT_SIZE));
    const pk = decodePokemon(slotBuf, true);
    if (pk) {
      pk.box = -1;
      pokemon.push(pk);
    }
  }

  // --- Parse boxes ---
  for (let box = 0; box < NUM_BOXES; box++) {
    for (let slot = 0; slot < SLOTS_PER_BOX; slot++) {
      const slotStart = boxOffset + (box * SLOTS_PER_BOX + slot) * BOX_SLOT_SIZE;
      if (slotStart + BOX_SLOT_SIZE > buf.length) break;
      const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + BOX_SLOT_SIZE));

      // Quick check: skip empty slots (EC == 0)
      if (slotBuf.readUInt32LE(0) === 0) continue;

      const pk = decodePokemon(slotBuf, true);
      if (pk) {
        pk.box = box;
        // Box pokemon don't have the party extension with level,
        // so compute level from EXP + growth rate
        pk.level = computeLevel(getGrowthRate(pk.species_id), pk.exp);
        pokemon.push(pk);
      }
    }
  }

  // --- World state ---
  const worldState = extractGen6WorldState(buf as Buffer, game);

  return { pokemon, worldState };
}
