// Gen 2 save parser (Gold, Silver, Crystal)
// References:
//   https://bulbapedia.bulbagarden.net/wiki/Save_data_structure_(Generation_II)
//   https://datacrystal.tcrf.net/wiki/Pokémon_Crystal/RAM_map

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import { extractGen2WorldState } from './gen2WorldState.js';
import { decodeGen2String } from './charDecoder.js';

export const GEN2_MOVES: Record<number, string> = {
  // Gen 1 moves (1-165) - same IDs
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
  // Gen 2 new moves (166-251)
  166: 'sketch', 167: 'triple-kick', 168: 'thief', 169: 'spider-web', 170: 'mind-reader',
  171: 'nightmare', 172: 'flame-wheel', 173: 'snore', 174: 'curse', 175: 'flail',
  176: 'conversion-2', 177: 'aeroblast', 178: 'cotton-spore', 179: 'reversal', 180: 'spite',
  181: 'powder-snow', 182: 'protect', 183: 'mach-punch', 184: 'scary-face', 185: 'faint-attack',
  186: 'sweet-kiss', 187: 'belly-drum', 188: 'sludge-bomb', 189: 'mud-slap', 190: 'octazooka',
  191: 'spikes', 192: 'zap-cannon', 193: 'foresight', 194: 'destiny-bond', 195: 'perish-song',
  196: 'icy-wind', 197: 'detect', 198: 'bone-rush', 199: 'lock-on', 200: 'outrage',
  201: 'sandstorm', 202: 'giga-drain', 203: 'endure', 204: 'charm', 205: 'rollout',
  206: 'false-swipe', 207: 'swagger', 208: 'milk-drink', 209: 'spark', 210: 'fury-cutter',
  211: 'steel-wing', 212: 'mean-look', 213: 'attract', 214: 'sleep-talk', 215: 'heal-bell',
  216: 'return', 217: 'present', 218: 'frustration', 219: 'safeguard', 220: 'pain-split',
  221: 'sacred-fire', 222: 'magnitude', 223: 'dynamic-punch', 224: 'megahorn', 225: 'dragon-breath',
  226: 'baton-pass', 227: 'encore', 228: 'pursuit', 229: 'rapid-spin', 230: 'sweet-scent',
  231: 'iron-tail', 232: 'metal-claw', 233: 'vital-throw', 234: 'morning-sun', 235: 'synthesis',
  236: 'moonlight', 237: 'hidden-power', 238: 'cross-chop', 239: 'twister', 240: 'rain-dance',
  241: 'sunny-day', 242: 'crunch', 243: 'mirror-coat', 244: 'psych-up', 245: 'extreme-speed',
  246: 'ancient-power', 247: 'shadow-ball', 248: 'future-sight', 249: 'rock-smash', 250: 'whirlpool',
  251: 'beat-up',
};

const GEN2_ITEMS: Record<number, string> = {
  0: '', // No item
  1: 'master-ball', 3: 'ultra-ball', 4: 'great-ball', 5: 'poke-ball',
  8: 'moon-stone', 9: 'antidote', 10: 'burn-heal', 11: 'ice-heal',
  12: 'awakening', 13: 'paralyze-heal', 14: 'full-restore', 15: 'max-potion',
  16: 'hyper-potion', 17: 'super-potion', 18: 'potion', 19: 'escape-rope',
  20: 'repel', 21: 'max-elixir', 22: 'fire-stone', 23: 'thunder-stone',
  24: 'water-stone', 26: 'hp-up', 27: 'protein', 28: 'iron',
  29: 'carbos', 30: 'lucky-punch', 31: 'calcium', 32: 'rare-candy',
  33: 'x-accuracy', 34: 'leaf-stone', 35: 'metal-powder', 36: 'nugget',
  37: 'poke-doll', 38: 'full-heal', 39: 'revive', 40: 'max-revive',
  41: 'guard-spec', 42: 'super-repel', 43: 'max-repel', 44: 'dire-hit',
  46: 'fresh-water', 47: 'soda-pop', 48: 'lemonade', 49: 'x-attack',
  51: 'x-defend', 52: 'x-speed', 53: 'x-special', 55: 'bright-powder',
  56: 'moomoo-milk', 57: 'quick-claw', 58: 'psncureberry',
  60: 'kings-rock', 62: 'bitter-berry',
  63: 'mint-berry', 64: 'red-apricorn', 67: 'miracle-seed',
  68: 'thick-club', 69: 'focus-band',
  73: 'energypowder', 74: 'energy-root', 75: 'heal-powder', 76: 'revival-herb',
  77: 'hard-stone', 78: 'lucky-egg', 79: 'card-key',
  82: 'silver-leaf', 83: 'gold-leaf',
  85: 'mystery-berry',
  96: 'berry', 97: 'gold-berry',
  98: 'squirtbottle',
  101: 'polkadot-bow',
  106: 'przcureberry',
  107: 'burnt-berry',
  108: 'ice-berry', 109: 'poison-barb',
  112: 'sharp-beak', 113: 'berry-juice',
  114: 'scope-lens', 117: 'metal-coat',
  118: 'dragon-fang', 121: 'leftovers',
  143: 'mysteryberry',
  150: 'dragon-scale', 151: 'berserk-gene',
  156: 'sacred-ash',
  163: 'normal-box', 164: 'gorgeous-box',
  167: 'sun-stone',
  169: 'polkadot-bow',
  170: 'up-grade',
  172: 'berry',
  173: 'gold-berry',
  174: 'pink-bow',
  175: 'stick',
  176: 'smoke-ball',
  177: 'nevermeltice', 178: 'magnet', 179: 'miracle-berry',
  180: 'pearl', 181: 'big-pearl', 182: 'everstone',
  183: 'spell-tag', 184: 'ragecandybar',
  185: 'gs-ball',
  186: 'blue-card',
  187: 'miracle-seed', 188: 'thick-club',
  189: 'focus-band',
  191: 'charcoal', 192: 'berry-juice',
  193: 'scope-lens',
  196: 'metal-coat', 197: 'dragon-fang',
  199: 'leftovers',
  210: 'mystic-water', 211: 'twisted-spoon', 212: 'kings-rock',
  213: 'silver-powder', 214: 'amulet-coin',
  215: 'cleanse-tag', 216: 'soul-dew',
  217: 'deep-sea-tooth', 218: 'deep-sea-scale',
  219: 'smoke-ball', 220: 'everstone',
  221: 'choice-band',
  222: 'silk-scarf',
  223: 'sharp-beak',
  224: 'poison-barb',
  225: 'nevermeltice',
  226: 'spell-tag',
  227: 'twisted-spoon',
  228: 'charcoal',
  229: 'dragon-fang',
  230: 'silk-scarf',
  231: 'up-grade',
  232: 'shell-bell',
  233: 'sea-incense',
  234: 'lax-incense',
  235: 'lucky-punch',
  236: 'metal-powder',
  237: 'thick-club',
  238: 'stick',
  241: 'black-belt', 242: 'blackglasses',
};

function decodeMove(id: number): string {
  return GEN2_MOVES[id] || '';
}

export function decodeItem(id: number): string {
  return GEN2_ITEMS[id] || '';
}

function isShinyDVs(atk: number, def: number, spd: number, spc: number): boolean {
  const shinyAtk = [2, 3, 6, 7, 10, 11, 14, 15].includes(atk);
  return shinyAtk && def === 10 && spd === 10 && spc === 10;
}

export interface Gen2Pokemon {
  species_id: number;
  level: number;
  iv_attack: number;
  iv_defense: number;
  iv_speed: number;
  iv_special: number;
  iv_hp: number;
  is_shiny: boolean;
  ot_name: string;
  ot_tid: number;
  held_item: string;
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
  friendship: number;
  pokerus: number;
  caught_level: number;   // Crystal only, 0 for G/S
  caught_location: number; // Crystal only, 0 for G/S
  caught_time: number;    // Crystal only, 0 for G/S (0=none, 1=morn, 2=day, 3=night)
}

// Crystal-specific offsets (differ slightly from Gold/Silver)
const CRYSTAL_OFFSETS = {
  playerName: 0x200B,
  playerTID: 0x2009,
  partyCount: 0x2865,
  partySpecies: 0x2866, // 7 bytes (6 species + terminator)
  partyData: 0x286D,    // 48 bytes per pokemon
  partyOTNames: 0x298D,  // 0x286D + 6*48 = 0x298D; 11 bytes per OT name
  partyNicknames: 0x29CF, // 0x298D + 6*11 = 0x29CF; 11 bytes per nickname
  // Boxes stored at 0x4000+ in SRAM
  currentBoxNum: 0x2724,
  currentBox: 0x2D6C,
};

const GS_OFFSETS = {
  playerName: 0x200B,
  playerTID: 0x2009,
  partyCount: 0x288A,
  partySpecies: 0x288B,
  partyData: 0x2892,
  partyOTNames: 0x29B2,  // 0x2892 + 6*48 = 0x29B2; 11 bytes per OT name
  partyNicknames: 0x29F4, // 0x29B2 + 6*11 = 0x29F4; 11 bytes per nickname
  currentBoxNum: 0x2724,
  currentBox: 0x2D6C,
};

export function parseGen2Save(filePathOrBuf: string | Buffer, gameName: string): ParseResult<Gen2Pokemon> {
  const buf = typeof filePathOrBuf === 'string' ? readFileSync(filePathOrBuf) : filePathOrBuf;
  const results: Gen2Pokemon[] = [];

  if (buf.length < 0x8000) return { pokemon: results, worldState: extractGen2WorldState(buf, gameName) };

  // Detect Crystal vs Gold/Silver by checking known offsets
  const isCrystal = gameName.toLowerCase().includes('crystal');
  const offsets = isCrystal ? CRYSTAL_OFFSETS : GS_OFFSETS;

  const playerName = decodeGen2String(buf, offsets.playerName, 11);
  const playerTID = buf.readUInt16BE(offsets.playerTID);

  // Parse party
  const partyCount = buf[offsets.partyCount];
  if (partyCount > 6) return { pokemon: results, worldState: extractGen2WorldState(buf, gameName) };

  const PKM_SIZE = 48; // Party pokemon size in Gen 2

  for (let i = 0; i < partyCount; i++) {
    const species = buf[offsets.partySpecies + i];
    if (species === 0 || species === 0xFF) continue;

    const offset = offsets.partyData + i * PKM_SIZE;

    const heldItem = buf[offset + 1];
    const level = buf[offset + 31]; // Current level

    // DVs at offset + 0x15-0x16 (21-22 decimal) in party struct
    const dvByte1 = buf[offset + 0x15]; // Atk(4) | Def(4)
    const dvByte2 = buf[offset + 0x16]; // Spd(4) | Spc(4)
    const atkDV = (dvByte1 >> 4) & 0xF;
    const defDV = dvByte1 & 0xF;
    const spdDV = (dvByte2 >> 4) & 0xF;
    const spcDV = dvByte2 & 0xF;
    const hpDV = ((atkDV & 1) << 3) | ((defDV & 1) << 2) | ((spdDV & 1) << 1) | (spcDV & 1);

    // EXP: 3 bytes big-endian at offset + 0x08
    const exp = (buf[offset + 8] << 16) | (buf[offset + 9] << 8) | buf[offset + 10];

    // Stat EXP: 2 bytes each at 0x0B-0x14
    const statExpHp      = buf.readUInt16BE(offset + 0x0B);
    const statExpAttack  = buf.readUInt16BE(offset + 0x0D);
    const statExpDefense = buf.readUInt16BE(offset + 0x0F);
    const statExpSpeed   = buf.readUInt16BE(offset + 0x11);
    const statExpSpecial = buf.readUInt16BE(offset + 0x13);

    // PP Ups: top 2 bits of each PP byte at 0x17-0x1A
    const ppUps = ((buf[offset + 0x17] >> 6) & 3) |
                  (((buf[offset + 0x18] >> 6) & 3) << 2) |
                  (((buf[offset + 0x19] >> 6) & 3) << 4) |
                  (((buf[offset + 0x1A] >> 6) & 3) << 6);

    // Friendship, Pokerus, Caught data (Crystal only)
    const friendship = buf[offset + 0x1B];
    const pokerus    = buf[offset + 0x1C];
    const caughtByte1 = buf[offset + 0x1D];
    const caughtByte2 = buf[offset + 0x1E];
    const caughtTime     = isCrystal ? (caughtByte1 >> 6) & 0x3 : 0;
    const caughtLevel    = isCrystal ? caughtByte1 & 0x3F : 0;
    const caughtLocation = isCrystal ? caughtByte2 & 0x7F : 0;

    // OT name
    const otName = decodeGen2String(buf, offsets.partyOTNames + i * 11, 11);

    results.push({
      species_id: species,
      level,
      iv_attack: atkDV,
      iv_defense: defDV,
      iv_speed: spdDV,
      iv_special: spcDV,
      iv_hp: hpDV,
      is_shiny: isShinyDVs(atkDV, defDV, spdDV, spcDV),
      ot_name: otName || playerName,
      ot_tid: playerTID,
      held_item: decodeItem(heldItem),
      move1: decodeMove(buf[offset + 2]),
      move2: decodeMove(buf[offset + 3]),
      move3: decodeMove(buf[offset + 4]),
      move4: decodeMove(buf[offset + 5]),
      box: -1, // party
      exp,
      stat_exp_hp: statExpHp,
      stat_exp_attack: statExpAttack,
      stat_exp_defense: statExpDefense,
      stat_exp_speed: statExpSpeed,
      stat_exp_special: statExpSpecial,
      pp_ups: ppUps,
      friendship,
      pokerus,
      caught_level: caughtLevel,
      caught_location: caughtLocation,
      caught_time: caughtTime,
    });
  }

  // Parse all 14 boxes from SRAM banks + current box from RAM
  const BOX_PKM_SIZE = 32; // Box pokemon are smaller than party (no stat data)
  const BOX_SIZE = 0x450; // 1104 bytes per box (Crystal's actual stride, not 1102)
  const currentBoxNum = buf[offsets.currentBoxNum] & 0x7F; // bits 0-6 = box number (0-13)

  // SRAM bank offsets: boxes 0-6 at 0x4000, boxes 7-13 at 0x6000
  const SRAM_BANK_2 = 0x4000;
  const SRAM_BANK_3 = 0x6000;

  function parseBox(boxOffset: number, boxNum: number): void {
    if (boxOffset + BOX_SIZE > buf.length) return;

    const countByte = buf[boxOffset];
    const dataStart = boxOffset + 1 + 21; // after count + species list area

    // Count 1-20: parse that many slots. Otherwise scan species list (up to 20).
    // mGBA/emulator saves can have count > 20 with valid species data.
    if (countByte === 0) return;
    const maxSlots = (countByte >= 1 && countByte <= 20) ? countByte : 20;

    for (let i = 0; i < maxSlots; i++) {
      const species = buf[boxOffset + 1 + i];
      if (species === 0xFF) break; // terminator — no more Pokemon after this
      if (species === 0 || species > 251) continue; // skip empty slots and invalid IDs

      const offset = dataStart + i * BOX_PKM_SIZE;
      if (offset + BOX_PKM_SIZE > buf.length) continue;

      // 0x1F = current level in box struct
      const level = buf[offset + 0x1F] || 1;

      const heldItem = buf[offset + 1];

      // DVs at offset 0x15-0x16 (decimal 21-22) in box struct
      const dvByte1 = buf[offset + 0x15];
      const dvByte2 = buf[offset + 0x16];
      const atkDV = (dvByte1 >> 4) & 0xF;
      const defDV = dvByte1 & 0xF;
      const spdDV = (dvByte2 >> 4) & 0xF;
      const spcDV = dvByte2 & 0xF;
      const hpDV = ((atkDV & 1) << 3) | ((defDV & 1) << 2) | ((spdDV & 1) << 1) | (spcDV & 1);

      // EXP: 3 bytes big-endian at offset + 0x08
      const exp = (buf[offset + 0x08] << 16) | (buf[offset + 0x09] << 8) | buf[offset + 0x0A];

      // Stat EXP: 2 bytes each at 0x0B-0x14
      const statExpHp      = buf.readUInt16BE(offset + 0x0B);
      const statExpAttack  = buf.readUInt16BE(offset + 0x0D);
      const statExpDefense = buf.readUInt16BE(offset + 0x0F);
      const statExpSpeed   = buf.readUInt16BE(offset + 0x11);
      const statExpSpecial = buf.readUInt16BE(offset + 0x13);

      // PP Ups: top 2 bits of each PP byte at 0x17-0x1A
      const ppUps = ((buf[offset + 0x17] >> 6) & 3) |
                    (((buf[offset + 0x18] >> 6) & 3) << 2) |
                    (((buf[offset + 0x19] >> 6) & 3) << 4) |
                    (((buf[offset + 0x1A] >> 6) & 3) << 6);

      // Friendship, Pokerus, Caught data (Crystal only)
      const friendship = buf[offset + 0x1B];
      const pokerus    = buf[offset + 0x1C];
      const caughtByte1 = buf[offset + 0x1D];
      const caughtByte2 = buf[offset + 0x1E];
      const caughtTime     = isCrystal ? (caughtByte1 >> 6) & 0x3 : 0;
      const caughtLevel    = isCrystal ? caughtByte1 & 0x3F : 0;
      const caughtLocation = isCrystal ? caughtByte2 & 0x7F : 0;

      const otNamesStart = dataStart + 20 * BOX_PKM_SIZE;
      const otName = decodeGen2String(buf, otNamesStart + i * 11, 11);

      results.push({
        species_id: species,
        level,
        iv_attack: atkDV,
        iv_defense: defDV,
        iv_speed: spdDV,
        iv_special: spcDV,
        iv_hp: hpDV,
        is_shiny: isShinyDVs(atkDV, defDV, spdDV, spcDV),
        ot_name: otName || playerName,
        ot_tid: playerTID,
        held_item: decodeItem(heldItem),
        move1: decodeMove(buf[offset + 2]),
        move2: decodeMove(buf[offset + 3]),
        move3: decodeMove(buf[offset + 4]),
        move4: decodeMove(buf[offset + 5]),
        box: boxNum,
        exp,
        stat_exp_hp: statExpHp,
        stat_exp_attack: statExpAttack,
        stat_exp_defense: statExpDefense,
        stat_exp_speed: statExpSpeed,
        stat_exp_special: statExpSpecial,
        pp_ups: ppUps,
        friendship,
        pokerus,
        caught_level: caughtLevel,
        caught_location: caughtLocation,
        caught_time: caughtTime,
      });
    }
  }

  // Parse all 14 boxes from SRAM. The RAM copy of the current box is often
  // stale in emulator/3DS VC saves, so SRAM is the reliable source.
  for (let box = 0; box < 14; box++) {
    const bankOffset = box < 7 ? SRAM_BANK_2 : SRAM_BANK_3;
    const boxInBank = box < 7 ? box : box - 7;
    parseBox(bankOffset + boxInBank * BOX_SIZE, box);
  }

  const worldState = extractGen2WorldState(buf, gameName);
  let daycare: DaycareInfo | undefined;
  if (isCrystal) {
    // Daycare parsing only supported for Crystal (offsets are Crystal-specific)
    daycare = parseGen2Daycare(buf, offsets);
  }
  return { pokemon: results, worldState, daycare };
}

// ── Daycare / breeding info ───────────────────────────────────────────────────

export interface DaycareInfo {
  active: boolean;
  eggReady: boolean;
  mon1: DaycareMon | null;
  mon2: DaycareMon | null;
  offspringSpeciesId: number | null;
  shinyOdds: string | null;
}

export interface DaycareMon {
  species_id: number;
  is_shiny: boolean;
  level: number;
  moves: string[];
  dvs: { atk: number; def: number; spd: number; spc: number };
}

// Relative offsets from partyCount to daycare data (WRAM layout is contiguous)
// wDayCareMan = partyCount + (0xDEF5 - 0xDCD7)
// breed mon 1 species = partyCount + (0xDF0C - 0xDCD7)
// breed mon 2 species = partyCount + (0xDF45 - 0xDCD7)
const DC_MAN_OFFSET   = 0xDEF5 - 0xDCD7;  // 0x21E
const DC_MON1_OFFSET  = 0xDF0C - 0xDCD7;  // 0x235 (species byte of box struct)
const DC_MON2_OFFSET  = 0xDF45 - 0xDCD7;  // 0x26E

// Gen 2 offspring: evolved parent → baby species
// Breeding produces the lowest evolution of the non-Ditto parent
const GEN2_BABY_SPECIES: Record<number, number> = {
  // Gen 2 babies
  25: 172, 26: 172,   // Pikachu/Raichu → Pichu
  35: 173, 36: 173,   // Clefairy/Clefable → Cleffa
  39: 174, 40: 174,   // Jigglypuff/Wigglytuff → Igglybuff
  125: 239,            // Electabuzz → Elekid
  126: 240,            // Magmar → Magby
};

// Evolution families: first member is the baby/base form
const GEN2_FAMILIES = [
  [1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18],[19,20],[21,22],
  [23,24],[25,26],[27,28],[29,30,31],[32,33,34],[35,36],[37,38],[39,40],
  [41,42,169],[43,44,45,182],[46,47],[48,49],[50,51],[52,53],[54,55],[56,57],
  [58,59],[60,61,62,186],[63,64,65],[66,67,68],[69,70,71],[72,73],[74,75,76],
  [77,78],[79,80,199],[81,82],[84,85],[86,87],[88,89],[90,91],[92,93,94],
  [95,208],[96,97],[98,99],[100,101],[102,103],[104,105],[109,110],[111,112],
  [113,242],[116,117,230],[118,119],[120,121],[123,212],[129,130],
  [133,134,135,136,196,197],[137,233],[138,139],[140,141],[147,148,149],
  [152,153,154],[155,156,157],[158,159,160],[161,162],[163,164],[165,166],
  [167,168],[170,171],[175,176],[177,178],[179,180,181],[183,184],
  [187,188,189],[191,192],[194,195],[204,205],[209,210],[216,217],[218,219],
  [220,221],[223,224],[228,229],[231,232],[246,247,248],
];

const SPECIES_TO_BABY: Record<number, number> = {};
for (const family of GEN2_FAMILIES) {
  const baby = family[0];
  for (const member of family) {
    SPECIES_TO_BABY[member] = GEN2_BABY_SPECIES[member] ?? baby;
  }
}

function getOffspringSpecies(mon1Species: number, mon2Species: number): number | null {
  // If one is Ditto, offspring is the baby form of the other
  if (mon1Species === 132) return SPECIES_TO_BABY[mon2Species] ?? mon2Species;
  if (mon2Species === 132) return SPECIES_TO_BABY[mon1Species] ?? mon1Species;
  // Nidoran♀ special case: can produce Nidoran♂
  if (mon1Species === 29 || mon1Species === 30 || mon1Species === 31) return 29; // Nidoran♀
  if (mon2Species === 29 || mon2Species === 30 || mon2Species === 31) return 29;
  // Otherwise offspring is baby form of the female parent (gender-based, but we simplify to mon1)
  return SPECIES_TO_BABY[mon1Species] ?? mon1Species;
}

function parseGen2Daycare(buf: Buffer, offsets: typeof CRYSTAL_OFFSETS): DaycareInfo {
  const base = offsets.partyCount;
  const flag = buf[base + DC_MAN_OFFSET];
  const active = !!(flag & 0x80);
  const eggReady = !!(flag & 0x40);
  const hasMon1 = !!(flag & 0x01);

  if (!active || !hasMon1) {
    return { active: false, eggReady: false, mon1: null, mon2: null, offspringSpeciesId: null, shinyOdds: null };
  }

  // Box-mon struct fields are at fixed offsets from the species byte:
  //   +0x02..0x05 — moves (4 bytes, GEN2_MOVES ids)
  //   +0x15..0x16 — DVs (Atk|Def, Spd|Spc)
  //   +0x1F     — current level
  function readMon(monBase: number): DaycareMon | null {
    const species = buf[monBase];
    if (!(species > 0 && species < 252)) return null;
    const dv1 = buf[monBase + 0x15];
    const dv2 = buf[monBase + 0x16];
    const atk = (dv1 >> 4) & 0xF, def = dv1 & 0xF;
    const spd = (dv2 >> 4) & 0xF, spc = dv2 & 0xF;
    const moves = [
      GEN2_MOVES[buf[monBase + 0x02]],
      GEN2_MOVES[buf[monBase + 0x03]],
      GEN2_MOVES[buf[monBase + 0x04]],
      GEN2_MOVES[buf[monBase + 0x05]],
    ].filter(Boolean) as string[];
    return {
      species_id: species,
      is_shiny: isShinyDVs(atk, def, spd, spc),
      level: buf[monBase + 0x1F] || 0,
      moves,
      dvs: { atk, def, spd, spc },
    };
  }

  const mon1 = readMon(base + DC_MON1_OFFSET);
  const mon2Data = readMon(base + DC_MON2_OFFSET);

  const offspringSpeciesId = (mon1 && mon2Data)
    ? getOffspringSpecies(mon1.species_id, mon2Data.species_id)
    : null;

  // Calculate shiny odds based on parent DVs
  // Offspring inherits: Def from Ditto/father, bottom 3 bits of Spc from Ditto/father
  // Random: Atk (16), Spd (16), top bit of Spc (2)
  // For shiny: Def=10, Spd=10, Spc=10, Atk in shiny set
  let shinyOdds: string | null = null;
  if (mon1 && mon2Data) {
    const hasShinyParent = mon1.is_shiny || mon2Data.is_shiny;
    if (hasShinyParent) {
      // Shiny Ditto breeding: Def locked to 10, Spc bottom 3 bits = 010
      // Need: Atk shiny (8/16), Spd=10 (1/16), Spc top bit=1 (1/2)
      shinyOdds = '1/64';
    } else {
      // No shiny parent: standard 1/8192 (all 4 DVs random-ish)
      shinyOdds = '~1/8,192';
    }
  }

  return { active, eggReady, mon1, mon2: mon2Data, offspringSpeciesId, shinyOdds };
}
