/**
 * Gen 5 World State Extractor — Black/White/Black 2/White 2
 *
 * Extracts trainer name, TID, SID/TSV, play time, badges, and bag contents
 * from a Gen 5 save buffer. Badge data is stored as date records.
 */

import type { SaveWorldState, BallCount } from './worldState.js';
import type { Gen5GameOffsets } from './gen5Constants.js';
import {
  GEN5_ITEMS, GEN5_KEY_ITEMS, GEN5_BALL_ITEM_IDS,
} from './gen5Constants.js';

// Badge date records for BW: 8 × 3 bytes (year-2000, month, day)
const BW_BADGE_DATES_OFFSET   = 0x1C704;
const B2W2_BADGE_DATES_OFFSET = 0x21200;
const BADGE_COUNT             = 8;
const BADGE_DATE_SIZE         = 3;

// Bag entry: u16 item ID LE + u16 count LE
const BAG_ENTRY_SIZE = 4;

// TM item IDs: 328 (TM01) through 419 (TM95) — Gen 5 extends to TM95
const GEN5_TM_START = 328;
const GEN5_TM_END   = 427; // TM95 + HMs
const GEN5_HM_START = 420;
const GEN5_HM_END   = 427;

function gen5ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN5_TM_START && itemId < GEN5_HM_START) {
    return itemId - GEN5_TM_START + 1;
  }
  return null;
}

function gen5ItemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN5_HM_START && itemId <= GEN5_HM_END) {
    return itemId - GEN5_HM_START + 1;
  }
  return null;
}

function readPlayerName(buf: Buffer, offset: number): string {
  return buf
    .subarray(offset, offset + 8 * 2)
    .toString('utf16le')
    .replace(/\uFFFF/g, '')
    .replace(/\0/g, '');
}

function countBadges(buf: Buffer, badgeDatesOffset: number): { count: number; bitfield: number } {
  let count    = 0;
  let bitfield = 0;
  for (let i = 0; i < BADGE_COUNT; i++) {
    const off   = badgeDatesOffset + i * BADGE_DATE_SIZE;
    if (off + BADGE_DATE_SIZE > buf.length) break;
    const year  = buf[off];
    const month = buf[off + 1];
    const day   = buf[off + 2];
    if (year !== 0 && month !== 0 && day !== 0) {
      count++;
      bitfield |= (1 << i);
    }
  }
  return { count, bitfield };
}

function parseBagPocket(
  buf: Buffer,
  offset: number,
  maxSlots: number,
): Array<{ itemId: number; count: number }> {
  const items: Array<{ itemId: number; count: number }> = [];
  for (let i = 0; i < maxSlots; i++) {
    const off = offset + i * BAG_ENTRY_SIZE;
    if (off + BAG_ENTRY_SIZE > buf.length) break;
    const itemId = buf.readUInt16LE(off);
    const count  = buf.readUInt16LE(off + 2);
    if (itemId === 0x0000) continue;
    items.push({ itemId, count });
  }
  return items;
}

export function extractGen5WorldState(
  buf: Buffer,
  offsets: Gen5GameOffsets,
  isB2W2: boolean,
): SaveWorldState {
  // --- Trainer identity ---
  const playerName  = readPlayerName(buf, offsets.trainerName);
  const trainerId   = buf.readUInt16LE(offsets.trainerTid);
  const trainerSid  = buf.readUInt16LE(offsets.trainerSid);
  const tsv = (trainerId ^ trainerSid) >>> 4;

  // --- Play time ---
  const hours   = buf.readUInt16LE(offsets.playTimeHours);
  const minutes = buf[offsets.playTimeMinutes];
  const seconds = buf[offsets.playTimeSeconds];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  // --- Badges ---
  const badgeDatesOffset = isB2W2 ? B2W2_BADGE_DATES_OFFSET : BW_BADGE_DATES_OFFSET;
  const { count: badgeCount, bitfield: badges } = countBadges(buf, badgeDatesOffset);

  // --- Bag ---
  const keyItems: string[] = [];
  const tms: number[]      = [];
  const hms: number[]      = [];
  const balls: BallCount[] = [];

  // Key items pocket
  for (const { itemId } of parseBagPocket(buf, offsets.bagKeyItems, offsets.bagKeyItemsCount)) {
    if (GEN5_KEY_ITEMS.has(itemId)) {
      keyItems.push(GEN5_ITEMS[itemId] ?? `Key Item ${itemId}`);
    }
  }

  // TM/HM pocket
  for (const { itemId } of parseBagPocket(buf, offsets.bagTMHM, offsets.bagTMHMCount)) {
    const tmNum = gen5ItemIdToTmNumber(itemId);
    if (tmNum !== null) { tms.push(tmNum); continue; }
    const hmNum = gen5ItemIdToHmNumber(itemId);
    if (hmNum !== null) hms.push(hmNum);
  }

  // Items pocket — scan for balls (Gen 5 has no separate balls pocket)
  for (const { itemId, count } of parseBagPocket(buf, offsets.bagItems, offsets.bagItemsCount)) {
    if (GEN5_BALL_ITEM_IDS.has(itemId)) {
      balls.push({ name: GEN5_ITEMS[itemId] ?? `Ball ${itemId}`, count });
    }
  }

  return {
    playerName,
    trainerId,
    trainerSid,
    tsv,
    currentMapId:       0,
    currentLocationKey: '',
    badges,
    badgeCount,
    keyItems,
    tms,
    hms,
    balls,
    playTimeSeconds,
  };
}
