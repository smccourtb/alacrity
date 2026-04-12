// Gen 1 save parser (Red, Blue, Yellow)
// References:
//   https://bulbapedia.bulbagarden.net/wiki/Save_data_structure_(Generation_I)
//   https://datacrystal.tcrf.net/wiki/Pokémon_Red_and_Blue/RAM_map

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { extractGen1WorldState } from './gen1WorldState.js';
import { decodeGen1String } from './charDecoder.js';

// Gen 1 species index → national dex mapping
export const INDEX_TO_DEX: Record<number, number> = {
  0x01: 112, 0x02: 115, 0x03: 32, 0x04: 35, 0x05: 21, 0x06: 100, 0x07: 34,
  0x08: 80, 0x09: 2, 0x0A: 103, 0x0B: 108, 0x0C: 102, 0x0D: 88, 0x0E: 94,
  0x0F: 29, 0x10: 31, 0x11: 104, 0x12: 111, 0x13: 131, 0x14: 59, 0x15: 151,
  0x16: 130, 0x17: 90, 0x18: 72, 0x19: 92, 0x1A: 123, 0x1B: 120, 0x1C: 9,
  0x1D: 127, 0x1E: 114, 0x21: 58, 0x22: 95, 0x23: 22, 0x24: 16, 0x25: 79,
  0x26: 64, 0x27: 75, 0x28: 113, 0x29: 67, 0x2A: 122, 0x2B: 106, 0x2C: 107,
  0x2D: 24, 0x2E: 47, 0x2F: 54, 0x30: 96, 0x31: 76, 0x33: 126, 0x35: 125,
  0x36: 82, 0x37: 109, 0x39: 56, 0x3A: 86, 0x3B: 50, 0x3C: 128, 0x40: 83,
  0x41: 48, 0x42: 149, 0x46: 84, 0x47: 60, 0x48: 124, 0x49: 146, 0x4A: 144,
  0x4B: 145, 0x4C: 132, 0x4D: 52, 0x4E: 98, 0x52: 37, 0x53: 38, 0x54: 25,
  0x55: 26, 0x58: 147, 0x59: 148, 0x5A: 140, 0x5B: 141, 0x5C: 116, 0x5D: 117,
  0x60: 39, 0x61: 40, 0x62: 133, 0x63: 136, 0x64: 135, 0x65: 134, 0x66: 66,
  0x67: 41, 0x68: 23, 0x69: 46, 0x6A: 61, 0x6B: 62, 0x6C: 13, 0x6D: 14,
  0x6E: 15, 0x70: 85, 0x71: 57, 0x72: 51, 0x73: 49, 0x74: 87, 0x75: 53,
  0x76: 10, 0x77: 11, 0x78: 12, 0x7B: 68, 0x7C: 55, 0x7D: 97, 0x7E: 42,
  0x7F: 150, 0x80: 143, 0x81: 129, 0x82: 91, 0x83: 45, 0x84: 43, 0x85: 44,
  0x88: 70, 0x8A: 110, 0x8B: 36, 0x8D: 73, 0x8E: 101, 0x91: 138, 0x92: 139,
  0x93: 142, 0x94: 63, 0x95: 65, 0x96: 17, 0x97: 18, 0x98: 121, 0x99: 1,
  0x9A: 3, 0x9B: 73, 0x9D: 118, 0x9E: 119, 0xA3: 77, 0xA4: 78, 0xA5: 19,
  0xA6: 20, 0xA7: 33, 0xA8: 30, 0xA9: 74, 0xAA: 137, 0xAB: 142, 0xAD: 105,
  0xB0: 99, 0xB1: 128, 0xB2: 28, 0xB3: 27, 0xB4: 71, 0xB5: 152, 0xB9: 69,
  0xBA: 5, 0xBB: 4, 0xBC: 6, 0xBD: 8, 0xBE: 7, 0xBF: 93, 0xC0: 89,
  0xC1: 81, 0xC2: 153, // Dummy values for some edge cases
};

export interface Gen1Pokemon {
  species_id: number;
  level: number;
  iv_attack: number;
  iv_defense: number;
  iv_speed: number;
  iv_special: number; // Gen 1 has one Special stat
  iv_hp: number;
  is_shiny: boolean;
  ot_name: string;
  ot_tid: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  box: number; // -1 = party, 0+ = box number
  exp: number;
  stat_exp_hp: number;
  stat_exp_attack: number;
  stat_exp_defense: number;
  stat_exp_speed: number;
  stat_exp_special: number;
  pp_ups: number;
}

// Gen 1 move index → move name (PokeAPI naming convention)
export const GEN1_MOVES: Record<number, string> = {
  1: 'pound', 2: 'karate-chop', 3: 'double-slap', 4: 'comet-punch', 5: 'mega-punch',
  6: 'pay-day', 7: 'fire-punch', 8: 'ice-punch', 9: 'thunder-punch', 10: 'scratch',
  11: 'vice-grip', 12: 'guillotine', 13: 'razor-wind', 14: 'swords-dance', 15: 'cut',
  16: 'gust', 17: 'wing-attack', 18: 'whirlwind', 19: 'fly', 20: 'bind',
  21: 'slam', 22: 'vine-whip', 23: 'stomp', 24: 'double-kick', 25: 'mega-kick',
  26: 'jump-kick', 27: 'rolling-kick', 28: 'sand-attack', 29: 'headbutt', 30: 'horn-attack',
  31: 'fury-attack', 32: 'horn-drill', 33: 'tackle', 34: 'body-slam', 35: 'wrap',
  36: 'take-down', 37: 'thrash', 38: 'double-edge', 39: 'tail-whip', 40: 'poison-sting',
  41: 'twineedle', 42: 'pin-missile', 43: 'leer', 44: 'bite', 45: 'growl',
  46: 'roar', 47: 'sing', 48: 'supersonic', 49: 'sonic-boom', 50: 'disable',
  51: 'acid', 52: 'ember', 53: 'flamethrower', 54: 'mist', 55: 'water-gun',
  56: 'hydro-pump', 57: 'surf', 58: 'ice-beam', 59: 'blizzard', 60: 'psybeam',
  61: 'bubble-beam', 62: 'aurora-beam', 63: 'hyper-beam', 64: 'peck', 65: 'drill-peck',
  66: 'submission', 67: 'low-kick', 68: 'counter', 69: 'seismic-toss', 70: 'strength',
  71: 'absorb', 72: 'mega-drain', 73: 'leech-seed', 74: 'growth', 75: 'razor-leaf',
  76: 'solar-beam', 77: 'poison-powder', 78: 'stun-spore', 79: 'sleep-powder', 80: 'petal-dance',
  81: 'string-shot', 82: 'dragon-rage', 83: 'fire-spin', 84: 'thunder-shock', 85: 'thunderbolt',
  86: 'thunder-wave', 87: 'thunder', 88: 'rock-throw', 89: 'earthquake', 90: 'fissure',
  91: 'dig', 92: 'toxic', 93: 'confusion', 94: 'psychic', 95: 'hypnosis',
  96: 'meditate', 97: 'agility', 98: 'quick-attack', 99: 'rage', 100: 'teleport',
  101: 'night-shade', 102: 'mimic', 103: 'screech', 104: 'double-team', 105: 'recover',
  106: 'harden', 107: 'minimize', 108: 'smokescreen', 109: 'confuse-ray', 110: 'withdraw',
  111: 'defense-curl', 112: 'barrier', 113: 'light-screen', 114: 'haze', 115: 'reflect',
  116: 'focus-energy', 117: 'bide', 118: 'metronome', 119: 'mirror-move', 120: 'self-destruct',
  121: 'egg-bomb', 122: 'lick', 123: 'smog', 124: 'sludge', 125: 'bone-club',
  126: 'fire-blast', 127: 'waterfall', 128: 'clamp', 129: 'swift', 130: 'skull-bash',
  131: 'spike-cannon', 132: 'constrict', 133: 'amnesia', 134: 'kinesis', 135: 'soft-boiled',
  136: 'high-jump-kick', 137: 'glare', 138: 'dream-eater', 139: 'poison-gas', 140: 'barrage',
  141: 'leech-life', 142: 'lovely-kiss', 143: 'sky-attack', 144: 'transform', 145: 'bubble',
  146: 'dizzy-punch', 147: 'spore', 148: 'flash', 149: 'psywave', 150: 'splash',
  151: 'acid-armor', 152: 'crabhammer', 153: 'explosion', 154: 'fury-swipes', 155: 'bonemerang',
  156: 'rest', 157: 'rock-slide', 158: 'hyper-fang', 159: 'sharpen', 160: 'conversion',
  161: 'tri-attack', 162: 'super-fang', 163: 'slash', 164: 'substitute', 165: 'struggle',
};

function decodeMove(id: number): string {
  return GEN1_MOVES[id] || '';
}

function isShinyDVs(atk: number, def: number, spd: number, spc: number): boolean {
  const shinyAtk = [2, 3, 6, 7, 10, 11, 14, 15].includes(atk);
  return shinyAtk && def === 10 && spd === 10 && spc === 10;
}

export function parseGen1Save(filePathOrBuf: string | Buffer, gameName: string): ParseResult<Gen1Pokemon> {
  const buf = typeof filePathOrBuf === 'string' ? readFileSync(filePathOrBuf) : filePathOrBuf;
  const results: Gen1Pokemon[] = [];

  if (buf.length < 0x8000) return { pokemon: results, worldState: extractGen1WorldState(buf) };

  // Party data starts at 0x2F2C in R/B, 0x2F2C in Yellow too
  const partyOffset = 0x2F2C;
  const partyCount = buf[partyOffset];
  if (partyCount > 6 || partyCount === 0) return { pokemon: results, worldState: extractGen1WorldState(buf) };

  // OT name at 0x2598
  const playerName = decodeGen1String(buf, 0x2598, 11);
  const playerTID = buf.readUInt16BE(0x2605);

  // Party species list at partyOffset+1, 6 bytes
  // Party data at partyOffset+8, 44 bytes per pokemon
  const PKM_SIZE = 44;
  const partyDataStart = partyOffset + 8;

  for (let i = 0; i < partyCount; i++) {
    const speciesIdx = buf[partyOffset + 1 + i];
    const dexNum = INDEX_TO_DEX[speciesIdx];
    if (!dexNum || dexNum > 151) continue;

    const offset = partyDataStart + i * PKM_SIZE;

    // DVs at offset + 27-28 (relative to pokemon data)
    const dvByte1 = buf[offset + 27]; // Atk(4) | Def(4)
    const dvByte2 = buf[offset + 28]; // Spd(4) | Spc(4)
    const atkDV = (dvByte1 >> 4) & 0xF;
    const defDV = dvByte1 & 0xF;
    const spdDV = (dvByte2 >> 4) & 0xF;
    const spcDV = dvByte2 & 0xF;
    const hpDV = ((atkDV & 1) << 3) | ((defDV & 1) << 2) | ((spdDV & 1) << 1) | (spcDV & 1);

    const level = buf[offset + 33]; // Current level

    results.push({
      species_id: dexNum,
      level,
      iv_attack: atkDV,
      iv_defense: defDV,
      iv_speed: spdDV,
      iv_special: spcDV,
      iv_hp: hpDV,
      is_shiny: isShinyDVs(atkDV, defDV, spdDV, spcDV),
      ot_name: playerName,
      ot_tid: playerTID,
      move1: decodeMove(buf[offset + 8]),
      move2: decodeMove(buf[offset + 9]),
      move3: decodeMove(buf[offset + 10]),
      move4: decodeMove(buf[offset + 11]),
      box: -1, // party
      exp: (buf[offset + 14] << 16) | (buf[offset + 15] << 8) | buf[offset + 16],
      stat_exp_hp: buf.readUInt16BE(offset + 17),
      stat_exp_attack: buf.readUInt16BE(offset + 19),
      stat_exp_defense: buf.readUInt16BE(offset + 21),
      stat_exp_speed: buf.readUInt16BE(offset + 23),
      stat_exp_special: buf.readUInt16BE(offset + 25),
      pp_ups: ((buf[offset + 29] >> 6) & 3) | (((buf[offset + 30] >> 6) & 3) << 2) | (((buf[offset + 31] >> 6) & 3) << 4) | (((buf[offset + 32] >> 6) & 3) << 6),
    });
  }

  // Parse current box (the one selected in the PC)
  // Current box number at 0x284C, current box data at 0x30C0
  const currentBoxNum = buf[0x284C] & 0x7F; // bit 7 is "changed" flag
  const CURRENT_BOX_OFFSET = 0x30C0;
  const BOX_PKM_SIZE = 33;
  const boxCount = buf[CURRENT_BOX_OFFSET];

  // RAM copy of current box can be stale (especially in saves from other emulators).
  // Validate count before trusting it over the SRAM bank copy.
  const useRamBox = boxCount >= 0 && boxCount <= 20;
  if (useRamBox) {
    for (let i = 0; i < boxCount; i++) {
      const specIdx = buf[CURRENT_BOX_OFFSET + 1 + i];
      const dexNum = INDEX_TO_DEX[specIdx];
      if (!dexNum) continue;

      const offset = CURRENT_BOX_OFFSET + 1 + 21 + i * BOX_PKM_SIZE; // species list (20) + terminator (1)
      const dvByte1 = buf[offset + 27];
      const dvByte2 = buf[offset + 28];
      const atkDV = (dvByte1 >> 4) & 0xF;
      const defDV = dvByte1 & 0xF;
      const spdDV = (dvByte2 >> 4) & 0xF;
      const spcDV = dvByte2 & 0xF;
      const hpDV = ((atkDV & 1) << 3) | ((defDV & 1) << 2) | ((spdDV & 1) << 1) | (spcDV & 1);

      results.push({
        species_id: dexNum,
        level: buf[offset + 3],
        iv_attack: atkDV,
        iv_defense: defDV,
        iv_speed: spdDV,
        iv_special: spcDV,
        iv_hp: hpDV,
        is_shiny: isShinyDVs(atkDV, defDV, spdDV, spcDV),
        ot_name: playerName,
        ot_tid: playerTID,
        move1: decodeMove(buf[offset + 8]),
        move2: decodeMove(buf[offset + 9]),
        move3: decodeMove(buf[offset + 10]),
        move4: decodeMove(buf[offset + 11]),
        box: currentBoxNum,
        exp: (buf[offset + 14] << 16) | (buf[offset + 15] << 8) | buf[offset + 16],
        stat_exp_hp: buf.readUInt16BE(offset + 17),
        stat_exp_attack: buf.readUInt16BE(offset + 19),
        stat_exp_defense: buf.readUInt16BE(offset + 21),
        stat_exp_speed: buf.readUInt16BE(offset + 23),
        stat_exp_special: buf.readUInt16BE(offset + 25),
        pp_ups: ((buf[offset + 29] >> 6) & 3) | (((buf[offset + 30] >> 6) & 3) << 2) | (((buf[offset + 31] >> 6) & 3) << 4) | (((buf[offset + 32] >> 6) & 3) << 6),
      });
    }
  }

  // Parse stored boxes (boxes not currently selected, stored in banks)
  // Bank 1 (boxes 1-6): 0x4000, Bank 2 (boxes 7-12): 0x6000
  // Each bank has box data sequentially, 1122 bytes per box
  const BOX_SIZE = 1122;
  const BANKS = [
    { offset: 0x4000, boxes: 6 },
    { offset: 0x6000, boxes: 6 },
  ];

  for (const bank of BANKS) {
    for (let b = 0; b < bank.boxes; b++) {
      const boxIndex = bank === BANKS[0] ? b : b + 6;
      if (boxIndex === currentBoxNum && useRamBox) continue; // already parsed from RAM

      const boxBase = bank.offset + b * BOX_SIZE;
      if (boxBase + BOX_SIZE > buf.length) break;

      const count = buf[boxBase];
      for (let i = 0; i < Math.min(count, 20); i++) {
        const specIdx = buf[boxBase + 1 + i];
        const dexNum = INDEX_TO_DEX[specIdx];
        if (!dexNum) continue;

        const offset = boxBase + 1 + 21 + i * BOX_PKM_SIZE;
        const dvByte1 = buf[offset + 27];
        const dvByte2 = buf[offset + 28];
        const atkDV = (dvByte1 >> 4) & 0xF;
        const defDV = dvByte1 & 0xF;
        const spdDV = (dvByte2 >> 4) & 0xF;
        const spcDV = dvByte2 & 0xF;
        const hpDV = ((atkDV & 1) << 3) | ((defDV & 1) << 2) | ((spdDV & 1) << 1) | (spcDV & 1);

        results.push({
          species_id: dexNum,
          level: buf[offset + 3],
          iv_attack: atkDV,
          iv_defense: defDV,
          iv_speed: spdDV,
          iv_special: spcDV,
          iv_hp: hpDV,
          is_shiny: isShinyDVs(atkDV, defDV, spdDV, spcDV),
          ot_name: playerName,
          ot_tid: playerTID,
          move1: decodeMove(buf[offset + 8]),
          move2: decodeMove(buf[offset + 9]),
          move3: decodeMove(buf[offset + 10]),
          move4: decodeMove(buf[offset + 11]),
          box: boxIndex,
          exp: (buf[offset + 14] << 16) | (buf[offset + 15] << 8) | buf[offset + 16],
          stat_exp_hp: buf.readUInt16BE(offset + 17),
          stat_exp_attack: buf.readUInt16BE(offset + 19),
          stat_exp_defense: buf.readUInt16BE(offset + 21),
          stat_exp_speed: buf.readUInt16BE(offset + 23),
          stat_exp_special: buf.readUInt16BE(offset + 25),
          pp_ups: ((buf[offset + 29] >> 6) & 3) | (((buf[offset + 30] >> 6) & 3) << 2) | (((buf[offset + 31] >> 6) & 3) << 4) | (((buf[offset + 32] >> 6) & 3) << 6),
        });
      }
    }
  }

  const worldState = extractGen1WorldState(buf);
  return { pokemon: results, worldState };
}
