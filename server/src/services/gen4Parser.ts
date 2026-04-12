/**
 * Gen 4 Save Parser — Diamond/Pearl, Platinum, HeartGold/SoulSilver
 *
 * Gen 4 saves are 512 KB (0x80000) split into two 256 KB partitions.
 * Each partition contains a General block (trainer data + party) followed
 * by a Storage block (boxes).  The active partition is identified by the
 * higher save counter stored in the General block footer.
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { getGen4Offsets } from './gen4Constants.js';
import { decodePK45, type Gen45Pokemon } from './pk45Decoder.js';
import { computeLevel, getGrowthRate } from './pkDecoder.js';
import { extractGen4WorldState } from './gen4WorldState.js';

// ---------------------------------------------------------------------------
// Save-file constants
// ---------------------------------------------------------------------------

const FILE_SIZE      = 0x80000;   // 512 KB
const PARTITION_SIZE = 0x40000;   // 256 KB

// Partition base addresses
const PRIMARY_BASE   = 0x00000;
const BACKUP_BASE    = 0x40000;

// Party
const PARTY_SLOT_SIZE  = 236;   // PK4 party format
const BOX_SLOT_SIZE    = 136;   // PK4 box format
const NUM_BOXES        = 18;
const SLOTS_PER_BOX    = 30;

// ---------------------------------------------------------------------------
// Active partition detection
// ---------------------------------------------------------------------------

/**
 * Read the save counter from the footer of a General block.
 *
 * Footer layout:
 *   +0x00  section ID (u32)
 *   +0x04  save counter (u32) ← this is the "timestamp" we compare
 *
 * The footer starts at `generalSize - footerSize` within the partition.
 */
function readSaveCounter(buf: Buffer, partitionBase: number, generalSize: number, footerSize: number): number {
  const footerOffset = partitionBase + generalSize - footerSize;
  if (footerOffset + 8 > buf.length) return 0;
  return buf.readUInt32LE(footerOffset + 4);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGen4Save(filePath: string, game: string): ParseResult<Gen45Pokemon> {
  const buf = readFileSync(filePath);

  if (buf.length < FILE_SIZE) {
    throw new Error(`Gen 4 save too small: ${buf.length} bytes (expected ${FILE_SIZE})`);
  }

  const offsets = getGen4Offsets(game);

  // Determine active partition by comparing save counters.
  // 0xFFFFFFFF means the partition is uninitialized — treat as 0.
  let primaryCounter = readSaveCounter(buf, PRIMARY_BASE, offsets.generalSize, offsets.footerSize);
  let backupCounter  = readSaveCounter(buf, BACKUP_BASE,  offsets.generalSize, offsets.footerSize);
  if (primaryCounter === 0xFFFFFFFF) primaryCounter = 0;
  if (backupCounter === 0xFFFFFFFF) backupCounter = 0;
  const partBase = primaryCounter >= backupCounter ? PRIMARY_BASE : BACKUP_BASE;

  const pokemon: Gen45Pokemon[] = [];

  // ---------------------------------------------------------------------------
  // Parse party
  // ---------------------------------------------------------------------------
  const partyCountOffset = partBase + offsets.partyCount;
  const partyCount = Math.min(buf.readUInt32LE(partyCountOffset), 6);

  for (let i = 0; i < partyCount; i++) {
    const slotStart = partBase + offsets.partyStart + i * PARTY_SLOT_SIZE;
    if (slotStart + PARTY_SLOT_SIZE > buf.length) break;

    const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + PARTY_SLOT_SIZE));
    const pk = decodePK45(slotBuf, false);
    if (pk) {
      pk.box = -1;
      pokemon.push(pk);
    }
  }

  // ---------------------------------------------------------------------------
  // Parse boxes
  // ---------------------------------------------------------------------------
  const storageBase = partBase + offsets.storageStart;

  for (let box = 0; box < NUM_BOXES; box++) {
    for (let slot = 0; slot < SLOTS_PER_BOX; slot++) {
      const slotStart = storageBase + offsets.boxStart
        + box * offsets.boxStride
        + slot * BOX_SLOT_SIZE;

      if (slotStart + BOX_SLOT_SIZE > buf.length) break;

      // Quick empty-slot check (PID == 0)
      if (buf.readUInt32LE(slotStart) === 0) continue;

      const slotBuf = Buffer.from(buf.subarray(slotStart, slotStart + BOX_SLOT_SIZE));
      const pk = decodePK45(slotBuf, false);
      if (pk) {
        pk.box = box;
        // Box slots lack the party extension that stores level directly,
        // so derive it from EXP + species growth rate.
        pk.level = computeLevel(getGrowthRate(pk.species_id), pk.exp);
        pokemon.push(pk);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // World state
  // ---------------------------------------------------------------------------
  const generalBuf = Buffer.from(buf.subarray(partBase, partBase + offsets.generalSize));
  const worldState = extractGen4WorldState(generalBuf, offsets, game);

  return { pokemon, worldState };
}
