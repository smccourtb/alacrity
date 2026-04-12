import type { SaveWorldState, BallCount } from './worldState.js';
import {
  GEN2_ITEMS, GEN2_BALL_IDS,
  gen2ItemIdToTmNumber, gen2ItemIdToHmNumber,
} from './gen2Constants.js';
import { gen2MapIdToLocationKey } from './mapIdLookup.js';
import { decodeGen2String } from './charDecoder.js';

// Gen 2 save offsets — Crystal vs Gold/Silver differ
// Bulbapedia: "Save data structure (Generation II)"
// Crystal 1.1 map offsets are 0x32C bytes later than 1.0.
// Bulbapedia documents 1.0 offsets; most mGBA ROMs are 1.1.
const CRYSTAL_MAP_V10 = { mapGroup: 0x2847, mapNumber: 0x2848 };
const CRYSTAL_MAP_V11 = { mapGroup: 0x2B73, mapNumber: 0x2B74 };

const CRYSTAL_OFFSETS = {
  playerName: 0x200B,
  playerTID: 0x2009,
  badges: 0x23E1,          // Johto badges
  kantoBadges: 0x23E2,     // Kanto badges (post-game)
  mapGroup: 0x2847,        // v1.0 default, resolved at runtime below
  mapNumber: 0x2848,
  // Gen 2 has separate bag pockets
  itemsPocketCount: 0x2420,
  itemsPocket: 0x2421,
  keyItemsPocketCount: 0x2449,
  keyItemsPocket: 0x244A,
  ballsPocketCount: 0x2465,
  ballsPocket: 0x2466,
  tmhmPocketCount: 0x247C,
  tmhmPocket: 0x247D,
  playTimeHours: 0x2054,    // 1 byte (hours)
  // 0x2055 = frames (1/60s ticks, ignored)
  playTimeMinutes: 0x2056,  // 1 byte
  playTimeSeconds: 0x2057,  // 1 byte
};

const GS_OFFSETS = {
  playerName: 0x200B,
  playerTID: 0x2009,
  badges: 0x23E1,
  kantoBadges: 0x23E2,
  mapGroup: 0x2000,
  mapNumber: 0x2001,
  itemsPocketCount: 0x241A,
  itemsPocket: 0x241B,
  keyItemsPocketCount: 0x2449,
  keyItemsPocket: 0x244A,
  ballsPocketCount: 0x2465,
  ballsPocket: 0x2466,
  tmhmPocketCount: 0x247C,
  tmhmPocket: 0x247D,
  playTimeHours: 0x2054,    // Same offset in Gold/Silver (1 byte)
  // 0x2055 = frames (1/60s ticks, ignored)
  playTimeMinutes: 0x2056,
  playTimeSeconds: 0x2057,
};

function parseBagPocket(buf: Buffer, countOffset: number, dataOffset: number): Array<{ itemId: number; count: number }> {
  const items: Array<{ itemId: number; count: number }> = [];
  const count = buf[countOffset];
  for (let i = 0; i < count && i < 30; i++) {
    const itemId = buf[dataOffset + i * 2];
    const qty = buf[dataOffset + i * 2 + 1];
    if (itemId === 0xFF || itemId === 0x00) break;
    items.push({ itemId, count: qty });
  }
  return items;
}

export function extractGen2WorldState(buf: Buffer, gameName: string): SaveWorldState {
  const isCrystal = gameName.toLowerCase().includes('crystal');
  const offsets = isCrystal ? CRYSTAL_OFFSETS : GS_OFFSETS;

  // Identity
  const playerName = decodeGen2String(buf, offsets.playerName, 11);
  const trainerId = buf.readUInt16BE(offsets.playerTID);

  // Location — Gen 2 uses mapGroup + mapNumber
  // Crystal 1.0 vs 1.1 have different SRAM offsets for map data.
  // Try v1.1 first (most common with mGBA), fall back to v1.0.
  let mapGroup = buf[offsets.mapGroup];
  let mapNumber = buf[offsets.mapNumber];
  if (isCrystal) {
    const v11g = buf[CRYSTAL_MAP_V11.mapGroup];
    const v11n = buf[CRYSTAL_MAP_V11.mapNumber];
    const v10g = buf[CRYSTAL_MAP_V10.mapGroup];
    const v10n = buf[CRYSTAL_MAP_V10.mapNumber];
    const v11valid = v11g <= 26 && gen2MapIdToLocationKey(v11g, v11n) !== 'unknown';
    const v10valid = v10g <= 26 && gen2MapIdToLocationKey(v10g, v10n) !== 'unknown';
    if (v11valid) {
      mapGroup = v11g;
      mapNumber = v11n;
    } else if (v10valid) {
      mapGroup = v10g;
      mapNumber = v10n;
    }
  }
  const currentMapId = (mapGroup << 8) | mapNumber;
  const currentLocationKey = gen2MapIdToLocationKey(mapGroup, mapNumber);

  // Badges — Johto (8 bits) + Kanto (8 bits)
  const johtoBadges = buf[offsets.badges];
  const kantoBadges = buf[offsets.kantoBadges];
  const badges = (kantoBadges << 8) | johtoBadges;
  let badgeCount = 0;
  for (let i = 0; i < 16; i++) {
    if (badges & (1 << i)) badgeCount++;
  }

  // Key items pocket
  const keyItemEntries = parseBagPocket(buf, offsets.keyItemsPocketCount, offsets.keyItemsPocket);
  const keyItems = keyItemEntries.map(e => GEN2_ITEMS[e.itemId] ?? `Item 0x${e.itemId.toString(16)}`);

  // Balls pocket
  const ballEntries = parseBagPocket(buf, offsets.ballsPocketCount, offsets.ballsPocket);
  const balls: BallCount[] = ballEntries
    .filter(e => GEN2_BALL_IDS.has(e.itemId))
    .map(e => ({
      name: GEN2_ITEMS[e.itemId] ?? `Ball 0x${e.itemId.toString(16)}`,
      count: e.count,
    }));

  // TM/HM pocket
  const tmhmEntries = parseBagPocket(buf, offsets.tmhmPocketCount, offsets.tmhmPocket);
  const tms: number[] = [];
  const hms: number[] = [];
  for (const entry of tmhmEntries) {
    const tmNum = gen2ItemIdToTmNumber(entry.itemId);
    if (tmNum !== null) { tms.push(tmNum); continue; }
    const hmNum = gen2ItemIdToHmNumber(entry.itemId);
    if (hmNum !== null) hms.push(hmNum);
  }

  // Play time (displayed on continue screen)
  // Structure: hours (1 byte), frames (1 byte), minutes (1 byte), seconds (1 byte)
  const hours = buf[offsets.playTimeHours];
  const minutes = buf[offsets.playTimeMinutes];
  const seconds = buf[offsets.playTimeSeconds];
  const playTimeSeconds = (hours * 3600) + (minutes * 60) + seconds;

  return {
    playerName,
    trainerId,
    trainerSid: 0,
    tsv: 0,
    currentMapId,
    currentLocationKey,
    badges,
    badgeCount,
    keyItems,
    tms,
    hms,
    balls,
    playTimeSeconds,
  };
}
