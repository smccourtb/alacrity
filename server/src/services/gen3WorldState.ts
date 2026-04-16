/**
 * Gen 3 World State Extractor
 *
 * Reads trainer identity, play time, badges, bag contents, and location
 * from a Gen 3 save's Section 0 (trainer info) and Section 1 (team/items).
 * Works for Ruby/Sapphire/Emerald and FireRed/LeafGreen.
 */

import type { SaveWorldState, SaveRtc, BallCount } from './worldState.js';
import { decodeGen3String } from './charDecoder.js';
import {
  GEN3_ITEMS, GEN3_KEY_ITEMS, GEN3_BALL_ITEM_IDS,
  gen3ItemIdToTmNumber, gen3ItemIdToHmNumber,
} from './gen3Constants.js';
import { gen3MapToLocationKey } from './gen3MapLookup.js';

// ---------------------------------------------------------------------------
// Section 0 (Trainer Info) field offsets
// ---------------------------------------------------------------------------
const NAME_OFFSET   = 0x0000; // Gen 3 encoded, 7 bytes
const NAME_LEN      = 7;
const GENDER_OFFSET = 0x0008; // u8
const OTID_OFFSET   = 0x000A; // u32 LE — low16=TID, high16=SID

// Play time — hours are u16 LE, minutes/seconds are u8
const PLAY_HOURS_OFFSET   = 0x000E;
const PLAY_MINUTES_OFFSET = 0x0010;
const PLAY_SECONDS_OFFSET = 0x0011;

// Badges — same offset for RSE and FRLG in Section 0
const BADGES_OFFSET = 0x00EE;

// LocalTimeOffset (gSaveBlock2Ptr) — RSE only; struct Time { s16 days, s8 hours, s8 minutes, s8 seconds }
// FRLG does not populate this field meaningfully.
const LOCAL_TIME_OFFSET = 0x0098;

// ---------------------------------------------------------------------------
// Section 1 (Team / Items) — bag + location offsets
// ---------------------------------------------------------------------------

// Location: warp data at the start of Section 1, same for all Gen 3 games
// struct: { s16 x, s16 y, WarpData location { s8 mapGroup, s8 mapNum, ... } }
const WARP_MAP_GROUP_OFFSET  = 0x0004; // s8 mapGroup in Section 1
const WARP_MAP_NUMBER_OFFSET = 0x0005; // s8 mapNum in Section 1

// Bag pocket structures: each entry is 4 bytes (u16 item ID LE + u16 count LE)
const BAG_ENTRY_SIZE = 4;

interface BagPocket {
  offset: number;
  maxSlots: number;
}

// RSE bag pocket offsets (within Section 1)
const RSE_BAG: Record<string, BagPocket> = {
  items:    { offset: 0x0560, maxSlots: 30 },
  keyItems: { offset: 0x05B0, maxSlots: 30 },
  balls:    { offset: 0x0600, maxSlots: 16 },
  tmhm:     { offset: 0x0640, maxSlots: 64 },
};

// Emerald has slightly different bag offsets
const EMERALD_BAG: Record<string, BagPocket> = {
  items:    { offset: 0x0560, maxSlots: 30 },
  keyItems: { offset: 0x05D8, maxSlots: 30 },
  balls:    { offset: 0x0650, maxSlots: 16 },
  tmhm:     { offset: 0x0690, maxSlots: 64 },
};

// FRLG bag pocket offsets (within Section 1)
const FRLG_BAG: Record<string, BagPocket> = {
  items:    { offset: 0x0310, maxSlots: 42 },
  keyItems: { offset: 0x03B8, maxSlots: 30 },
  balls:    { offset: 0x0430, maxSlots: 13 },
  tmhm:     { offset: 0x0464, maxSlots: 58 },
};

// ---------------------------------------------------------------------------
// RTC parsing (RSE only)
// ---------------------------------------------------------------------------

// Reads the localTimeOffset field from Section 0 for RSE saves.
// FRLG does not have a meaningful cart RTC — returns undefined for those games.
// Layout at LOCAL_TIME_OFFSET: s16 LE days, s8 hours, s8 minutes, s8 seconds.
// Returns undefined if the game is FRLG, the buffer is too short, or any field
// is out of the expected calendar range.
function parseGen3Rtc(section0: Buffer, game: string): SaveRtc | undefined {
  const lc = game.toLowerCase();
  if (lc.includes('firered') || lc.includes('leafgreen')) return undefined;

  const end = LOCAL_TIME_OFFSET + 5; // s16 + 3×s8 = 5 bytes
  if (section0.length < end) return undefined;

  const days    = section0.readInt16LE(LOCAL_TIME_OFFSET);
  const hours   = section0.readInt8(LOCAL_TIME_OFFSET + 2);
  const minutes = section0.readInt8(LOCAL_TIME_OFFSET + 3);
  const seconds = section0.readInt8(LOCAL_TIME_OFFSET + 4);

  if (days < 0) return undefined;
  if (hours < 0 || hours > 23) return undefined;
  if (minutes < 0 || minutes > 59) return undefined;
  if (seconds < 0 || seconds > 59) return undefined;

  return { days, hours, minutes, seconds };
}

// ---------------------------------------------------------------------------
// Bag parsing
// ---------------------------------------------------------------------------

function parseBagPocket(
  section1: Buffer,
  pocket: BagPocket,
): Array<{ itemId: number; count: number }> {
  const items: Array<{ itemId: number; count: number }> = [];
  for (let i = 0; i < pocket.maxSlots; i++) {
    const off = pocket.offset + i * BAG_ENTRY_SIZE;
    if (off + BAG_ENTRY_SIZE > section1.length) break;
    const itemId = section1.readUInt16LE(off);
    const count  = section1.readUInt16LE(off + 2);
    if (itemId === 0x0000) continue; // empty slot
    items.push({ itemId, count });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export function extractGen3WorldState(
  section0: Buffer,
  section1: Buffer | null,
  game: string,
): SaveWorldState {
  // --- Trainer identity ---
  const playerName = decodeGen3String(section0, NAME_OFFSET, NAME_LEN);
  const otid      = section0.readUInt32LE(OTID_OFFSET);
  const trainerId = otid & 0xFFFF;
  const trainerSid = (otid >>> 16) & 0xFFFF;
  const tsv = (trainerId ^ trainerSid) >>> 4;

  // --- Play time ---
  const hours   = section0.readUInt16LE(PLAY_HOURS_OFFSET);
  const minutes = section0[PLAY_MINUTES_OFFSET];
  const seconds = section0[PLAY_SECONDS_OFFSET];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  // --- RTC ---
  const save_rtc = parseGen3Rtc(section0, game);

  // --- Badges ---
  const badgeByte = section0[BADGES_OFFSET] ?? 0;
  let badgeCount  = 0;
  for (let i = 0; i < 8; i++) {
    if (badgeByte & (1 << i)) badgeCount++;
  }

  // --- Location (from Section 1 warp data) ---
  let currentMapId = 0;
  let currentLocationKey = '';
  if (section1 && section1.length > WARP_MAP_NUMBER_OFFSET) {
    const mapGroup  = section1[WARP_MAP_GROUP_OFFSET];
    const mapNumber = section1[WARP_MAP_NUMBER_OFFSET];
    currentMapId = (mapGroup << 8) | mapNumber;
    currentLocationKey = gen3MapToLocationKey(mapGroup, mapNumber, game);
  }

  // --- Bag (from Section 1 pockets) ---
  const keyItems: string[] = [];
  const tms: number[]      = [];
  const hms: number[]      = [];
  const balls: BallCount[] = [];

  if (section1) {
    const lc = game.toLowerCase();
    const isFrlg = lc.includes('firered') || lc.includes('leafgreen');
    const isEmerald = lc.includes('emerald');
    const bagLayout = isFrlg ? FRLG_BAG : isEmerald ? EMERALD_BAG : RSE_BAG;

    // Key items pocket
    for (const { itemId } of parseBagPocket(section1, bagLayout.keyItems)) {
      if (GEN3_KEY_ITEMS.has(itemId)) {
        keyItems.push(GEN3_ITEMS[itemId] ?? `Key Item ${itemId}`);
      }
    }

    // Balls pocket
    for (const { itemId, count } of parseBagPocket(section1, bagLayout.balls)) {
      if (GEN3_BALL_ITEM_IDS.has(itemId)) {
        balls.push({ name: GEN3_ITEMS[itemId] ?? `Ball ${itemId}`, count });
      }
    }

    // TM/HM pocket
    for (const { itemId } of parseBagPocket(section1, bagLayout.tmhm)) {
      const tmNum = gen3ItemIdToTmNumber(itemId);
      if (tmNum !== null) { tms.push(tmNum); continue; }
      const hmNum = gen3ItemIdToHmNumber(itemId);
      if (hmNum !== null) hms.push(hmNum);
    }

    // Also check regular items pocket for balls (player might have balls there)
    for (const { itemId, count } of parseBagPocket(section1, bagLayout.items)) {
      if (GEN3_BALL_ITEM_IDS.has(itemId)) {
        balls.push({ name: GEN3_ITEMS[itemId] ?? `Ball ${itemId}`, count });
      }
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
    save_rtc,
  };
}
