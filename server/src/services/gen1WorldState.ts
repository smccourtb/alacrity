import type { SaveWorldState, BallCount } from './worldState.js';
import {
  GEN1_ITEMS, GEN1_KEY_ITEMS, GEN1_BALL_IDS,
  GEN1_TM_START, GEN1_TM_END, GEN1_HM_START, GEN1_HM_END,
  itemIdToTmNumber, itemIdToHmNumber,
} from './gen1Constants.js';
import { gen1MapIdToLocationKey } from './mapIdLookup.js';
import { decodeGen1String } from './charDecoder.js';

const OFFSETS = {
  playerName: 0x2598,
  playerTID: 0x2605,
  currentMapId: 0x2601,
  badges: 0x2602,
  bagItemCount: 0x25C9,
  bagItems: 0x25CA,
  playTimeHours: 0x2CED,    // 2 bytes, little-endian (max 255:59:59)
  playTimeMaxed: 0x2CEF,    // 1 byte, nonzero = maxed at 255:59
  playTimeMinutes: 0x2CF0,  // 1 byte
  playTimeSeconds: 0x2CF1,  // 1 byte
};

const BAG_ENTRY_SIZE = 2;
const MAX_BAG_ITEMS = 20;

export function extractGen1WorldState(buf: Buffer): SaveWorldState {
  const playerName = decodeGen1String(buf, OFFSETS.playerName, 11);
  const trainerId = buf.readUInt16BE(OFFSETS.playerTID);

  const currentMapId = buf[OFFSETS.currentMapId];
  const currentLocationKey = gen1MapIdToLocationKey(currentMapId);

  const badgeByte = buf[OFFSETS.badges];
  let badgeCount = 0;
  for (let i = 0; i < 8; i++) {
    if (badgeByte & (1 << i)) badgeCount++;
  }

  const keyItems: string[] = [];
  const tms: number[] = [];
  const hms: number[] = [];
  const balls: BallCount[] = [];

  const bagCount = Math.min(buf[OFFSETS.bagItemCount], MAX_BAG_ITEMS);
  for (let i = 0; i < bagCount; i++) {
    const itemId = buf[OFFSETS.bagItems + i * BAG_ENTRY_SIZE];
    const count = buf[OFFSETS.bagItems + i * BAG_ENTRY_SIZE + 1];

    if (itemId === 0xFF || itemId === 0x00) break;

    const name = GEN1_ITEMS[itemId] ?? `Item 0x${itemId.toString(16)}`;

    if (GEN1_KEY_ITEMS.has(itemId)) {
      keyItems.push(name);
    }

    if (GEN1_BALL_IDS.has(itemId)) {
      balls.push({ name, count });
    }

    const tmNum = itemIdToTmNumber(itemId);
    if (tmNum !== null) {
      tms.push(tmNum);
    }
    const hmNum = itemIdToHmNumber(itemId);
    if (hmNum !== null) {
      hms.push(hmNum);
    }
  }

  // Play time (shown on continue screen)
  const hours = buf.readUInt16LE(OFFSETS.playTimeHours);
  const minutes = buf[OFFSETS.playTimeMinutes];
  const seconds = buf[OFFSETS.playTimeSeconds];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  return {
    playerName,
    trainerId,
    trainerSid: 0,
    tsv: 0,
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
