/**
 * Gen 7 Save Parser — Pokemon Sun/Moon and Ultra Sun/Ultra Moon
 *
 * Reads a Checkpoint `main` file, locates party and box data,
 * and decodes each PK7 slot using the shared pkDecoder.
 *
 * File sizes:
 *   SM:   441,856 bytes (0x6BE00)
 *   USUM: 445,440 bytes (0x6CA00)
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { decodePokemon, computeLevel, getGrowthRate, type Gen67Pokemon } from './pkDecoder.js';
import { extractGen7WorldState } from './gen7WorldState.js';

// ---------------------------------------------------------------------------
// Save structure constants
// ---------------------------------------------------------------------------

const SM_FILE_SIZE   = 0x6BE00;  // 441,856
const USUM_FILE_SIZE = 0x6CA00;  // 444,928
const USUM_FILE_SIZE_CHECKPOINT = 0x6CC00;  // 445,440 — Checkpoint exports include 0x200 secure-value header

// Party offset differs between SM and USUM
const PARTY_OFFSET_SM   = 0x01400;
const PARTY_OFFSET_USUM = 0x01600;
const PARTY_SLOTS       = 6;
const PARTY_SLOT_SIZE   = 260;

// Box data offset differs
const BOX_OFFSET_SM   = 0x04E00;
const BOX_OFFSET_USUM = 0x05200;

const NUM_BOXES      = 32;
const SLOTS_PER_BOX  = 30;
const BOX_SLOT_SIZE  = 232;

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGen7Save(filePath: string, game: string): ParseResult<Gen67Pokemon> {
  const buf = readFileSync(filePath);

  // Detect USUM vs SM
  const lc = game.toLowerCase();
  const isUsum = lc.includes('ultra')
    || buf.length === USUM_FILE_SIZE
    || buf.length === USUM_FILE_SIZE_CHECKPOINT;

  const partyOffset = isUsum ? PARTY_OFFSET_USUM : PARTY_OFFSET_SM;
  const boxOffset   = isUsum ? BOX_OFFSET_USUM   : BOX_OFFSET_SM;

  const pokemon: Gen67Pokemon[] = [];

  // --- Parse party ---
  // Gen 7 party data starts directly at the offset with no count prefix.
  // Decode all 6 slots; decodePokemon returns null for empty ones.
  for (let i = 0; i < PARTY_SLOTS; i++) {
    const slotStart = partyOffset + i * PARTY_SLOT_SIZE;
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
  const worldState = extractGen7WorldState(buf as Buffer, game);

  return { pokemon, worldState };
}
