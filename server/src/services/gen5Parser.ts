/**
 * Gen 5 Save Parser — Pokemon Black/White and Black 2/White 2
 *
 * Reads a 512KB Checkpoint save file and extracts party + box Pokemon
 * using the shared PK4/PK5 decoder.
 *
 * File size: 0x80000 (524,288 bytes)
 * No block detection required — party and box data are at fixed offsets.
 * 24 boxes × 30 slots, box stride 0x1000 bytes (4096).
 * Party slots: 220 bytes (PK5). Box slots: 136 bytes.
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { decodePK45, type Gen45Pokemon } from './pk45Decoder.js';
import { getGen5Offsets } from './gen5Constants.js';
import { extractGen5WorldState } from './gen5WorldState.js';
import { computeLevel, getGrowthRate } from './pkDecoder.js';

// ---------------------------------------------------------------------------
// Save structure constants
// ---------------------------------------------------------------------------

const GEN5_FILE_SIZE   = 0x80000;  // 524,288 bytes
const SLOTS_PER_BOX    = 30;
const BOX_SLOT_SIZE    = 136;      // box pokemon (unextended)
const MAX_PARTY_SLOTS  = 6;

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGen5Save(filePath: string, game: string): ParseResult<Gen45Pokemon> {
  const buf = readFileSync(filePath);

  if (buf.length < GEN5_FILE_SIZE) {
    throw new Error(
      `Gen 5 save too small: expected >= 0x${GEN5_FILE_SIZE.toString(16)} bytes, got ${buf.length}`,
    );
  }

  const lc      = game.toLowerCase();
  const isB2W2  = lc.includes('black 2') || lc.includes('white 2')
    || lc.includes('b2') || lc.includes('w2');
  const offsets = getGen5Offsets(game);

  const pokemon: Gen45Pokemon[] = [];

  // ---------------------------------------------------------------------------
  // Parse party
  // ---------------------------------------------------------------------------
  const partyCount = Math.min(
    buf.readUInt32LE(offsets.partyCount),
    MAX_PARTY_SLOTS,
  );

  for (let i = 0; i < partyCount; i++) {
    const slotStart = offsets.partyStart + i * offsets.partySlotSize;
    if (slotStart + offsets.partySlotSize > buf.length) break;
    const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + offsets.partySlotSize));
    const pk = decodePK45(slotBuf, true);
    if (pk) {
      pk.box = -1;
      pokemon.push(pk);
    }
  }

  // ---------------------------------------------------------------------------
  // Parse boxes
  // 24 boxes, each padded to boxStride (0x1000) bytes.
  // Within each box: 30 slots × 136 bytes (tightly packed from box base).
  // ---------------------------------------------------------------------------
  for (let box = 0; box < offsets.numBoxes; box++) {
    const boxBase = offsets.boxStart + box * offsets.boxStride;
    for (let slot = 0; slot < SLOTS_PER_BOX; slot++) {
      const slotStart = boxBase + slot * BOX_SLOT_SIZE;
      if (slotStart + BOX_SLOT_SIZE > buf.length) break;
      const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + BOX_SLOT_SIZE));

      // Quick skip: PID == 0 means empty slot
      if (slotBuf.readUInt32LE(0) === 0) continue;

      const pk = decodePK45(slotBuf, true);
      if (pk) {
        pk.box = box;
        // Box slots don't have a party extension with level — derive from EXP
        pk.level = computeLevel(getGrowthRate(pk.species_id), pk.exp);
        pokemon.push(pk);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // World state
  // ---------------------------------------------------------------------------
  const worldState = extractGen5WorldState(buf as Buffer, offsets, isB2W2);

  return { pokemon, worldState };
}
