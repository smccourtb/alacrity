/**
 * Gen 7 World State Extractor — Pokemon Sun/Moon and Ultra Sun/Ultra Moon
 *
 * Extracts trainer identity, SID/TSV, play time, Grand Trial progress,
 * and bag contents from a Gen 7 save.
 *
 * Gen 7 replaces Gym badges with Island Trials and Grand Trials.
 * Grand Trials are the "badge equivalent" — completing each island's Kahuna battle.
 *   SM:   4 Grand Trials (Melemele, Akala, Ula'ula, Poni)
 *   USUM: 4 Grand Trials + Title Defense
 */

import type { SaveWorldState, BallCount } from './worldState.js';
import {
  GEN7_ITEMS, GEN7_KEY_ITEMS, GEN7_BALL_ITEM_IDS,
  GEN7_TM_START, GEN7_TM_END,
  gen7ItemIdToTmNumber,
} from './gen7Constants.js';
import { gen7LocationName } from './locationNames.js';

// ---------------------------------------------------------------------------
// Save structure offsets
// ---------------------------------------------------------------------------

// Trainer card blocks
const SM_TRAINER_CARD_OFFSET   = 0x01200;
const USUM_TRAINER_CARD_OFFSET = 0x01400;

// Within trainer card block:
const TRAINER_TID_OFFSET  = 0x00;  // u16 LE
const TRAINER_SID_OFFSET  = 0x02;  // u16 LE
const TRAINER_NAME_OFFSET = 0x38;  // UTF-16LE, 26 bytes (13 chars)

// Play time — in the "Played" record block
// Empirically verified against Checkpoint saves:
//   SM:   hours(u16) at 0x40C00, minutes(u8) at +2, seconds(u8) at +3
//   USUM: hours(u16) at 0x41000, minutes(u8) at +2, seconds(u8) at +3
const SM_PLAYED_OFFSET   = 0x40C00;
const USUM_PLAYED_OFFSET = 0x41000;

// Situation (Overworld) block — zone ID as u16 LE at base + 2
// From PKHeX SaveBlockAccessor7SM/USUM:
const SM_SITUATION_OFFSET   = 0x00E00;
const USUM_SITUATION_OFFSET = 0x01000;
const SITUATION_ZONE_ID     = 0x02;

// Grand Trial completion — read from Trainer Passport stamps in the Misc block.
// PKHeX Stamp7 enum: bits 4-9 of a u32 at Misc+0x08.
//   Bit 5 = Melemele (Hala), Bit 6 = Akala (Olivia),
//   Bit 7 = Ula'ula (Nanu), Bit 8 = Poni (Hapu)
// Source: PKHeX Stamp7.cs / Misc7.cs
const SM_STAMPS_OFFSET   = 0x4008;
const USUM_STAMPS_OFFSET = 0x4408;
const STAMP_GRAND_TRIAL_BITS = [5, 6, 7, 8]; // Melemele, Akala, Ula'ula, Poni

// Bag
const BAG_OFFSET       = 0x00000;
const BAG_SIZE_SM      = 0xDE0;
const BAG_SIZE_USUM    = 0xE28;

const USUM_FILE_SIZE   = 0x6CA00;
const USUM_FILE_SIZE_CHECKPOINT = 0x6CC00;
const BAG_ENTRY_SIZE   = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUsum(buf: Buffer, game: string): boolean {
  const lc = game.toLowerCase();
  if (lc.includes('ultra')) return true;
  return buf.length === USUM_FILE_SIZE || buf.length === USUM_FILE_SIZE_CHECKPOINT;
}

function readUtf16LE(buf: Buffer, offset: number, maxBytes: number): string {
  return buf.subarray(offset, offset + maxBytes).toString('utf16le').replace(/\0/g, '');
}

function parseBag(buf: Buffer, bagOffset: number, bagSize: number): Array<{ itemId: number; count: number }> {
  const items: Array<{ itemId: number; count: number }> = [];
  const maxEntries = Math.floor(bagSize / BAG_ENTRY_SIZE);
  for (let i = 0; i < maxEntries; i++) {
    const off = bagOffset + i * BAG_ENTRY_SIZE;
    if (off + BAG_ENTRY_SIZE > buf.length) break;
    const itemId = buf.readUInt16LE(off);
    const count  = buf.readUInt16LE(off + 2);
    if (itemId === 0x0000) break;
    items.push({ itemId, count });
  }
  return items;
}


// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export function extractGen7WorldState(buf: Buffer, game: string): SaveWorldState {
  const usum = isUsum(buf, game);

  // --- Trainer identity ---
  const trainerBase = usum ? USUM_TRAINER_CARD_OFFSET : SM_TRAINER_CARD_OFFSET;
  const trainerId   = buf.readUInt16LE(trainerBase + TRAINER_TID_OFFSET);
  const trainerSid  = buf.readUInt16LE(trainerBase + TRAINER_SID_OFFSET);
  const tsv = (trainerId ^ trainerSid) >>> 4;
  const playerName  = readUtf16LE(buf, trainerBase + TRAINER_NAME_OFFSET, 26);

  // --- Play time ---
  const playBase    = usum ? USUM_PLAYED_OFFSET : SM_PLAYED_OFFSET;
  const hours       = buf.readUInt16LE(playBase);
  const minutes     = buf[playBase + 2];
  const seconds     = buf[playBase + 3];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  // --- Grand Trials (badge equivalent) via Trainer Passport stamps ---
  const stampsOff = usum ? USUM_STAMPS_OFFSET : SM_STAMPS_OFFSET;
  const stamps = stampsOff + 4 <= buf.length ? buf.readUInt32LE(stampsOff) : 0;
  let badges     = 0;
  let badgeCount = 0;
  for (let i = 0; i < STAMP_GRAND_TRIAL_BITS.length; i++) {
    if ((stamps >>> STAMP_GRAND_TRIAL_BITS[i]) & 1) {
      badges |= (1 << i);
      badgeCount++;
    }
  }

  // --- Bag ---
  const bagSize    = usum ? BAG_SIZE_USUM : BAG_SIZE_SM;
  const bagEntries = parseBag(buf, BAG_OFFSET, bagSize);

  const keyItems: string[] = [];
  const tms: number[]      = [];
  const balls: BallCount[] = [];

  for (const { itemId, count } of bagEntries) {
    const name = GEN7_ITEMS[itemId] ?? `Item ${itemId}`;

    if (GEN7_KEY_ITEMS.has(itemId)) {
      keyItems.push(name);
    }

    if (GEN7_BALL_ITEM_IDS.has(itemId)) {
      balls.push({ name, count });
    }

    const tmNum = gen7ItemIdToTmNumber(itemId);
    if (tmNum !== null) {
      tms.push(tmNum);
    }
  }

  // --- Location (from Situation block zone ID) ---
  // SM and USUM use sequential zone IDs (not met-location IDs)
  const sitBase = usum ? USUM_SITUATION_OFFSET : SM_SITUATION_OFFSET;
  const currentMapId = buf.readUInt16LE(sitBase + SITUATION_ZONE_ID);
  const currentLocationKey = gen7LocationName(currentMapId, game);

  return {
    playerName,
    trainerId,
    trainerSid,
    tsv,
    currentMapId,
    currentLocationKey,
    badges,
    badgeCount,
    keyItems,
    tms,
    hms: [], // Gen 7 has no HMs
    balls,
    playTimeSeconds,
  };
}
