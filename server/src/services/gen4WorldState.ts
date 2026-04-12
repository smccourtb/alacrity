/**
 * Gen 4 World State Extractor — Diamond/Pearl/Platinum/HeartGold/SoulSilver
 *
 * Extracts trainer identity, play time, badges, SID/TSV, and bag contents
 * from the General block of a Gen 4 save's active partition.
 */

import type { SaveWorldState, BallCount } from './worldState.js';
import type { Gen4GameOffsets } from './gen4Constants.js';
import {
  GEN4_ITEMS, GEN4_KEY_ITEMS, GEN4_BALL_ITEM_IDS,
  gen4ItemIdToTmNumber, gen4ItemIdToHmNumber,
} from './gen4Constants.js';
import { decodeGen4String } from './charDecoder.js';
import { gen4LocationName } from './locationNames.js';

// Bag entry: u16 item ID LE + u16 count LE
const BAG_ENTRY_SIZE = 4;

function countBits(byte: number): number {
  let n = 0;
  for (let i = 0; i < 8; i++) {
    if (byte & (1 << i)) n++;
  }
  return n;
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

/**
 * Extract trainer identity, play time, badges, bag, and SID/TSV
 * from a Gen 4 General block buffer.
 */
export function extractGen4WorldState(
  generalBuf: Buffer,
  offsets: Gen4GameOffsets,
  game: string,
): SaveWorldState {
  // --- Trainer identity ---
  const playerName  = decodeGen4String(generalBuf, offsets.trainerName, 8);
  const trainerId   = generalBuf.readUInt16LE(offsets.trainerTid);
  const trainerSid  = generalBuf.readUInt16LE(offsets.trainerSid);
  const tsv = (trainerId ^ trainerSid) >>> 4;

  // --- Play time ---
  const hours   = generalBuf.readUInt16LE(offsets.playTimeHours);
  const minutes = generalBuf[offsets.playTimeMinutes];
  const seconds = generalBuf[offsets.playTimeSeconds];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  // --- Badges ---
  const badgeByte  = generalBuf[offsets.badges] ?? 0;
  let badgeCount   = countBits(badgeByte);

  if (offsets.badgesKanto !== undefined) {
    const kantoByte = generalBuf[offsets.badgesKanto] ?? 0;
    badgeCount += countBits(kantoByte);
  }

  // --- Bag ---
  const keyItems: string[] = [];
  const tms: number[]      = [];
  const hms: number[]      = [];
  const balls: BallCount[] = [];

  // Key items pocket
  for (const { itemId } of parseBagPocket(generalBuf, offsets.bagKeyItems, offsets.bagKeyItemsCount)) {
    if (GEN4_KEY_ITEMS.has(itemId)) {
      keyItems.push(GEN4_ITEMS[itemId] ?? `Key Item ${itemId}`);
    }
  }

  // TM/HM pocket
  for (const { itemId } of parseBagPocket(generalBuf, offsets.bagTMHM, offsets.bagTMHMCount)) {
    const tmNum = gen4ItemIdToTmNumber(itemId);
    if (tmNum !== null) { tms.push(tmNum); continue; }
    const hmNum = gen4ItemIdToHmNumber(itemId);
    if (hmNum !== null) hms.push(hmNum);
  }

  // Balls pocket
  for (const { itemId, count } of parseBagPocket(generalBuf, offsets.bagBalls, offsets.bagBallsCount)) {
    if (GEN4_BALL_ITEM_IDS.has(itemId)) {
      balls.push({ name: GEN4_ITEMS[itemId] ?? `Ball ${itemId}`, count });
    }
  }

  // Also check regular items pocket for balls
  for (const { itemId, count } of parseBagPocket(generalBuf, offsets.bagItems, offsets.bagItemsCount)) {
    if (GEN4_BALL_ITEM_IDS.has(itemId)) {
      balls.push({ name: GEN4_ITEMS[itemId] ?? `Ball ${itemId}`, count });
    }
  }

  // --- Location (zone ID from overworld state) ---
  const currentMapId = generalBuf.readUInt16LE(offsets.currentZone);
  const currentLocationKey = gen4LocationName(currentMapId, game);

  return {
    playerName,
    trainerId,
    trainerSid,
    tsv,
    currentMapId,
    currentLocationKey,
    badges:              badgeByte,
    badgeCount,
    keyItems,
    tms,
    hms,
    balls,
    playTimeSeconds,
  };
}
