/**
 * Gen 6 World State Extractor — Pokemon X/Y and Omega Ruby/Alpha Sapphire
 *
 * Extracts trainer identity, SID/TSV, play time, badges, and bag contents.
 * Bag parsing was already present; this adds play time and SID.
 */

import type { SaveWorldState, BallCount } from './worldState.js';
import {
  GEN6_ITEMS, GEN6_KEY_ITEMS, GEN6_BALL_ITEM_IDS,
  GEN6_TM_START, GEN6_TM_END, GEN6_HM_START, GEN6_HM_END,
  gen6ItemIdToTmNumber, gen6ItemIdToHmNumber,
} from './gen6Constants.js';
import { gen6LocationName } from './locationNames.js';

// Gen 6 save structure offsets
// XY and ORAS share the same trainer card block at 0x14000
const TRAINER_CARD_OFFSET = 0x14000;
const TRAINER_TID_OFFSET  = 0x00;   // u16 LE at TrainerCard + 0x00
const TRAINER_SID_OFFSET  = 0x02;   // u16 LE at TrainerCard + 0x02
const TRAINER_NAME_OFFSET = 0x48;   // UTF-16LE, 26 bytes (13 chars)

// Play time is in the GameTime block at 0x01000
// Empirically verified: hours at +0x14, minutes at +0x16, seconds at +0x17
const PLAYED_BLOCK_OFFSET = 0x01000;
const PLAY_HOURS_OFFSET   = 0x14;    // u16 LE within GameTime block
const PLAY_MINUTES_OFFSET = 0x16;    // u8
const PLAY_SECONDS_OFFSET = 0x17;    // u8

// Situation (overworld) block — MapID at base + 2
// XY Situation at 0x01200, ORAS Situation at 0x01400
const SITUATION_OFFSET_XY   = 0x01200;
const SITUATION_OFFSET_ORAS = 0x01400;
const SITUATION_MAP_ID      = 0x02; // u16 LE offset within Situation block

// Trainer2 block (badges) at 0x04200, badge byte at +0x0C
const TRAINER2_OFFSET     = 0x04200;
const BADGES_OFFSET       = 0x0C;

// Bag starts at 0x00400
const BAG_OFFSET          = 0x00400;
const BAG_SIZE_XY         = 0xB88;
const BAG_SIZE_ORAS       = 0xB90;

// ORAS file size
const ORAS_FILE_SIZE      = 0x76000;

const BAG_ENTRY_SIZE      = 4;

function isOras(buf: Buffer, game: string): boolean {
  const lc = game.toLowerCase();
  if (lc.includes('omega ruby') || lc.includes('alpha sapphire')) return true;
  return buf.length === ORAS_FILE_SIZE;
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

export function extractGen6WorldState(buf: Buffer, game: string): SaveWorldState {
  const oras = isOras(buf, game);

  // --- Trainer identity ---
  const trainerBase = TRAINER_CARD_OFFSET;
  const trainerId   = buf.readUInt16LE(trainerBase + TRAINER_TID_OFFSET);
  const trainerSid  = buf.readUInt16LE(trainerBase + TRAINER_SID_OFFSET);
  const tsv = (trainerId ^ trainerSid) >>> 4;
  const playerName  = readUtf16LE(buf, trainerBase + TRAINER_NAME_OFFSET, 26);

  // --- Play time ---
  const playBase    = PLAYED_BLOCK_OFFSET;
  const hours       = buf.readUInt16LE(playBase + PLAY_HOURS_OFFSET);
  const minutes     = buf[playBase + PLAY_MINUTES_OFFSET];
  const seconds     = buf[playBase + PLAY_SECONDS_OFFSET];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  // --- Badges ---
  const badgeByte  = buf[TRAINER2_OFFSET + BADGES_OFFSET] ?? 0;
  let badgeCount   = 0;
  for (let i = 0; i < 8; i++) {
    if (badgeByte & (1 << i)) badgeCount++;
  }

  // --- Bag ---
  const bagSize    = oras ? BAG_SIZE_ORAS : BAG_SIZE_XY;
  const bagEntries = parseBag(buf, BAG_OFFSET, bagSize);

  const keyItems: string[] = [];
  const tms: number[]      = [];
  const hms: number[]      = [];
  const balls: BallCount[] = [];

  for (const { itemId, count } of bagEntries) {
    const name = GEN6_ITEMS[itemId] ?? `Item ${itemId}`;

    if (GEN6_KEY_ITEMS.has(itemId)) {
      keyItems.push(name);
    }

    if (GEN6_BALL_ITEM_IDS.has(itemId)) {
      balls.push({ name, count });
    }

    const tmNum = gen6ItemIdToTmNumber(itemId);
    if (tmNum !== null) {
      tms.push(tmNum);
      continue;
    }
    const hmNum = gen6ItemIdToHmNumber(itemId);
    if (hmNum !== null) {
      hms.push(hmNum);
    }
  }

  // --- Location (from Situation block zone ID) ---
  // ORAS stores zone as a plain u16 matching met-location IDs.
  // XY stores zone as a packed u16 where the high byte is the map zone.
  const sitBase = oras ? SITUATION_OFFSET_ORAS : SITUATION_OFFSET_XY;
  const rawZoneId = buf.readUInt16LE(sitBase + SITUATION_MAP_ID);
  let currentMapId = rawZoneId;
  let currentLocationKey = gen6LocationName(rawZoneId, game);
  if (currentLocationKey === 'unknown' && rawZoneId > 255) {
    // XY packed format: try high byte as zone
    const hiByte = (rawZoneId >> 8) & 0xFF;
    const hiName = gen6LocationName(hiByte, game);
    if (hiName !== 'unknown') {
      currentMapId = hiByte;
      currentLocationKey = hiName;
    }
  }

  return {
    playerName,
    trainerId,
    trainerSid,
    tsv,
    currentMapId,
    currentLocationKey,
    badges: badgeByte,
    badgeCount,
    keyItems,
    tms,
    hms,
    balls,
    playTimeSeconds,
  };
}
