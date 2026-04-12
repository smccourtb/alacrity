/**
 * PK3 Decoder — Gen 3 Pokemon Binary Format
 *
 * Decrypts and decodes PK3 binary data (80 bytes box / 100 bytes party)
 * for Generation 3 games (Ruby/Sapphire/Emerald/FireRed/LeafGreen).
 *
 * Encryption: XOR each u32 word in 0x20-0x4F with (PID ^ OTID).
 * Shuffle: 4 × 12-byte substructures reordered by PID % 24.
 */

import { NATURE_NAMES } from './pkConstants.js';
import { resolveMoveName, resolveAbilityName } from '../seed-moves.js';
import { decodeGen3String } from './charDecoder.js';
import {
  GEN3_SPECIES_TO_NATIONAL,
  GEN3_ITEMS,
  GEN3_BALL_NAMES,
  GEN3_ORIGIN_GAME,
} from './gen3Constants.js';
import db from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Gen3Pokemon {
  species_id: number;
  nickname: string;
  level: number;
  is_shiny: boolean;
  nature: string;
  ability: string;
  gender: string;
  ball: string;
  held_item: string;
  ot_name: string;
  ot_tid: number;
  ot_sid: number;
  iv_hp: number;
  iv_attack: number;
  iv_defense: number;
  iv_speed: number;
  iv_sp_attack: number;
  iv_sp_defense: number;
  ev_hp: number;
  ev_attack: number;
  ev_defense: number;
  ev_speed: number;
  ev_sp_attack: number;
  ev_sp_defense: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  is_egg: boolean;
  has_pokerus: boolean;
  met_level: number;
  origin_game: string;
  box: number;
  exp: number;
  pid: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOX_SIZE = 80;
const PARTY_SIZE = 100;

// Encrypted data block range
const DATA_START = 0x20;
const DATA_END = 0x50; // exclusive — 48 bytes (4 × 12)

const SUBSTRUCTURE_SIZE = 12;

// ---------------------------------------------------------------------------
// Shuffle Table — 24 orderings of substructures Growth(0) Attacks(1) EVs(2) Misc(3)
// ---------------------------------------------------------------------------

const SUBSTRUCTURE_ORDER: number[][] = [
  [0,1,2,3], [0,1,3,2], [0,2,1,3], [0,3,1,2], [0,2,3,1], [0,3,2,1],
  [1,0,2,3], [1,0,3,2], [2,0,1,3], [3,0,1,2], [2,0,3,1], [3,0,2,1],
  [1,2,0,3], [1,3,0,2], [2,1,0,3], [3,1,0,2], [2,3,0,1], [3,2,0,1],
  [1,2,3,0], [1,3,2,0], [2,1,3,0], [3,1,2,0], [2,3,1,0], [3,2,1,0],
];

// ---------------------------------------------------------------------------
// Decryption + Unshuffling
// ---------------------------------------------------------------------------

/**
 * XOR-decrypt the 48-byte data block (0x20-0x4F) in place.
 * Each u32 word is XORed with (PID ^ OTID).
 */
function decryptDataBlock(buf: Buffer, pid: number, otid: number): void {
  const key = (pid ^ otid) >>> 0;
  for (let i = DATA_START; i < DATA_END; i += 4) {
    const word = buf.readUInt32LE(i) ^ key;
    buf.writeUInt32LE(word >>> 0, i);
  }
}

/**
 * Unshuffle the 4 substructures from their encrypted order to canonical order.
 * The table gives which canonical substructure (0-3) occupies each encrypted slot.
 * So slot i in the encrypted data contains canonical block order[i].
 */
function unshuffleSubstructures(buf: Buffer, pid: number): void {
  const order = SUBSTRUCTURE_ORDER[pid % 24];

  // Copy out the shuffled data
  const shuffled = Buffer.alloc(SUBSTRUCTURE_SIZE * 4);
  buf.copy(shuffled, 0, DATA_START, DATA_END);

  // scatter: shuffled[i] → canonical position order[i]
  for (let i = 0; i < 4; i++) {
    shuffled.copy(
      buf,
      DATA_START + order[i] * SUBSTRUCTURE_SIZE,
      i * SUBSTRUCTURE_SIZE,
      (i + 1) * SUBSTRUCTURE_SIZE,
    );
  }
}

// ---------------------------------------------------------------------------
// Checksum verification
// ---------------------------------------------------------------------------

/**
 * Sum of all u16 words in the decrypted 48-byte block (0x20-0x4F).
 * Must match stored checksum at 0x1C.
 */
function computeChecksum(buf: Buffer): number {
  let sum = 0;
  for (let i = DATA_START; i < DATA_END; i += 2) {
    sum = (sum + buf.readUInt16LE(i)) & 0xFFFF;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Gender resolution
// ---------------------------------------------------------------------------

// Map gender_rate value → PID threshold for male. Male if (PID & 0xFF) >= threshold.
const GENDER_THRESHOLD: Record<number, number> = {
  1: 31,
  2: 63,
  3: 63,
  4: 127,
  5: 191,
  6: 191,
  7: 225,
};

let genderRateCache: Record<number, number> | null = null;

function getGenderRate(nationalId: number): number {
  if (!genderRateCache) {
    genderRateCache = {};
    try {
      const rows = db.prepare('SELECT id, gender_rate FROM species WHERE gender_rate IS NOT NULL').all() as any[];
      for (const r of rows) genderRateCache[r.id] = r.gender_rate;
    } catch {}
  }
  return genderRateCache[nationalId] ?? 0;
}

function resolveGender(pid: number, nationalId: number): string {
  const rate = getGenderRate(nationalId);
  if (rate === -1) return 'genderless';
  if (rate === 0) return 'male';
  if (rate === 8) return 'female';
  const threshold = GENDER_THRESHOLD[rate] ?? 127;
  return (pid & 0xFF) >= threshold ? 'male' : 'female';
}

// ---------------------------------------------------------------------------
// Ability resolution
// ---------------------------------------------------------------------------

let abilityCache: Record<number, { ability1: number; ability2: number }> | null = null;

function getSpeciesAbilities(nationalId: number): { ability1: number; ability2: number } {
  if (!abilityCache) {
    abilityCache = {};
    try {
      const rows = db.prepare('SELECT id, ability1, ability2 FROM species').all() as any[];
      for (const r of rows) abilityCache[r.id] = { ability1: r.ability1 ?? 0, ability2: r.ability2 ?? 0 };
    } catch {}
  }
  return abilityCache[nationalId] ?? { ability1: 0, ability2: 0 };
}

function resolveGen3Ability(abilityBit: number, nationalId: number): string {
  const { ability1, ability2 } = getSpeciesAbilities(nationalId);
  const abilityId = abilityBit === 1 && ability2 ? ability2 : ability1;
  return resolveAbilityName(abilityId);
}

// ---------------------------------------------------------------------------
// Item resolution
// ---------------------------------------------------------------------------

function resolveGen3Item(id: number): string {
  if (id === 0) return '';
  return GEN3_ITEMS[id] ?? `item-${id}`;
}

// ---------------------------------------------------------------------------
// Level from EXP (medium fast fallback — Gen 3 saves don't store growth rate in PK3)
// ---------------------------------------------------------------------------

/**
 * Compute level from EXP using Medium Fast (n^3) as default.
 * Callers that know the species growth rate can supply it.
 * Growth rate IDs: 0=Medium Fast, 3=Medium Slow, 4=Fast, 5=Slow, 1=Erratic, 2=Fluctuating
 */
function expForLevel(growthRate: number, n: number): number {
  if (n <= 1) return 0;
  switch (growthRate) {
    case 0: return n * n * n;
    case 1:
      if (n <= 50)      return Math.floor((n * n * n * (100 - n)) / 50);
      else if (n <= 68) return Math.floor((n * n * n * (150 - n)) / 100);
      else if (n <= 98) return Math.floor((n * n * n * Math.floor((1911 - 10 * n) / 3)) / 500);
      else              return Math.floor((n * n * n * (160 - n)) / 100);
    case 2:
      if (n <= 15)      return Math.floor(n * n * n * ((Math.floor((n + 1) / 3) + 24) / 50));
      else if (n <= 36) return Math.floor(n * n * n * ((n + 14) / 50));
      else              return Math.floor(n * n * n * ((Math.floor(n / 2) + 32) / 50));
    case 3: return Math.floor(6 * n * n * n / 5) - 15 * n * n + 100 * n - 140;
    case 4: return Math.floor(4 * n * n * n / 5);
    case 5: return Math.floor(5 * n * n * n / 4);
    default: return n * n * n;
  }
}

let gen3GrowthRateCache: Record<number, number> | null = null;

function getGen3GrowthRate(nationalId: number): number {
  if (!gen3GrowthRateCache) {
    gen3GrowthRateCache = {};
    try {
      const rows = db.prepare('SELECT id, growth_rate FROM species WHERE growth_rate IS NOT NULL').all() as any[];
      for (const r of rows) gen3GrowthRateCache[r.id] = r.growth_rate;
    } catch {}
  }
  return gen3GrowthRateCache[nationalId] ?? 0;
}

function computeLevelFromExp(exp: number, nationalId: number): number {
  const growthRate = getGen3GrowthRate(nationalId);
  for (let level = 100; level >= 1; level--) {
    if (exp >= expForLevel(growthRate, level)) return level;
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Main Decoder
// ---------------------------------------------------------------------------

/**
 * Decode a PK3 binary slot into a structured Gen3Pokemon object.
 *
 * @param raw  Buffer of 80 bytes (box) or 100 bytes (party)
 * @returns Parsed Pokemon or null if slot is empty, bad egg, or checksum fails
 */
export function decodePK3(raw: Buffer): Gen3Pokemon | null {
  if (raw.length < BOX_SIZE) return null;

  // Make a mutable copy
  const buf = Buffer.from(raw);

  // --- Unencrypted header (0x00-0x1F) ---
  const pid = buf.readUInt32LE(0x00);
  const otid = buf.readUInt32LE(0x04);

  // Skip empty slots
  if (pid === 0 && otid === 0) return null;

  const tid = otid & 0xFFFF;
  const sid = (otid >>> 16) & 0xFFFF;

  const nickname = decodeGen3String(buf, 0x08, 10);
  // 0x12: language (unused in output but could filter)
  const miscFlags = buf[0x13];
  const isBadEgg = !!(miscFlags & 0x01);
  const hasSpecies = !!(miscFlags & 0x02);
  const isEggFlag = !!(miscFlags & 0x04);

  if (isBadEgg) return null;

  const otName = decodeGen3String(buf, 0x14, 7);
  const storedChecksum = buf.readUInt16LE(0x1C);

  // --- Decrypt + Unshuffle (mutates buf at 0x20-0x4F) ---
  decryptDataBlock(buf, pid, otid);
  unshuffleSubstructures(buf, pid);

  // --- Checksum verification ---
  const calcChecksum = computeChecksum(buf);
  if (calcChecksum !== storedChecksum) return null;

  // --- Substructure offsets after unshuffle ---
  const growthOff = DATA_START + 0 * SUBSTRUCTURE_SIZE; // sub 0
  const attacksOff = DATA_START + 1 * SUBSTRUCTURE_SIZE; // sub 1
  const evsOff = DATA_START + 2 * SUBSTRUCTURE_SIZE;    // sub 2
  const miscOff = DATA_START + 3 * SUBSTRUCTURE_SIZE;   // sub 3

  // --- Growth (sub 0) ---
  const gen3SpeciesId = buf.readUInt16LE(growthOff + 0x00);
  if (gen3SpeciesId === 0) return null;

  const nationalId = GEN3_SPECIES_TO_NATIONAL[gen3SpeciesId];
  if (!nationalId) return null; // unknown/invalid species

  const heldItemId = buf.readUInt16LE(growthOff + 0x02);
  const exp = buf.readUInt32LE(growthOff + 0x04);
  // ppBonuses at +0x08, friendship at +0x09 (unused in output)

  // --- Attacks (sub 1) ---
  const move1id = buf.readUInt16LE(attacksOff + 0x00);
  const move2id = buf.readUInt16LE(attacksOff + 0x02);
  const move3id = buf.readUInt16LE(attacksOff + 0x04);
  const move4id = buf.readUInt16LE(attacksOff + 0x06);

  // --- EVs / Condition (sub 2) ---
  const evHp  = buf[evsOff + 0x00];
  const evAtk = buf[evsOff + 0x01];
  const evDef = buf[evsOff + 0x02];
  const evSpd = buf[evsOff + 0x03];
  const evSpa = buf[evsOff + 0x04];
  const evSpdef = buf[evsOff + 0x05];
  // contest stats at +0x06-0x0B (cool/beauty/cute/smart/tough/feel)

  // --- Misc (sub 3) ---
  const pokerus = buf[miscOff + 0x00];
  // metLocation at +0x01
  const originsInfo = buf.readUInt16LE(miscOff + 0x02);
  const ivData = buf.readUInt32LE(miscOff + 0x04);
  // ribbons at +0x08

  // --- Parse origins info ---
  const metLevel = originsInfo & 0x7F;
  const originGameId = (originsInfo >> 7) & 0x0F;
  const ballId = (originsInfo >> 11) & 0x0F;
  // OT gender at bit 15

  // --- Parse IV data ---
  const ivHp    = ivData & 0x1F;
  const ivAtk   = (ivData >> 5) & 0x1F;
  const ivDef   = (ivData >> 10) & 0x1F;
  const ivSpe   = (ivData >> 15) & 0x1F;
  const ivSpa   = (ivData >> 20) & 0x1F;
  const ivSpdef = (ivData >> 25) & 0x1F;
  const isEggFromIV = !!((ivData >> 30) & 1);
  const abilityBit = (ivData >> 31) & 1;

  // --- Derived values ---
  const nature = NATURE_NAMES[pid % 25] || 'Hardy';
  const isShiny = ((tid ^ sid ^ ((pid >>> 16) & 0xFFFF) ^ (pid & 0xFFFF)) >>> 0) < 8;
  const isEgg = isEggFlag || isEggFromIV;
  const gender = resolveGender(pid, nationalId);
  const ability = resolveGen3Ability(abilityBit, nationalId);
  const ball = GEN3_BALL_NAMES[ballId] || 'Poké Ball';
  const originGame = GEN3_ORIGIN_GAME[originGameId] || `Game-${originGameId}`;

  // --- Level ---
  // For party pokemon (100 bytes), level is stored at 0x54
  let level: number;
  if (buf.length >= PARTY_SIZE) {
    level = buf[0x54] || computeLevelFromExp(exp, nationalId);
  } else {
    level = computeLevelFromExp(exp, nationalId);
  }

  return {
    species_id: nationalId,
    nickname: nickname || '',
    level,
    is_shiny: isShiny,
    nature,
    ability,
    gender,
    ball,
    held_item: resolveGen3Item(heldItemId),
    ot_name: otName,
    ot_tid: tid,
    ot_sid: sid,
    iv_hp: ivHp,
    iv_attack: ivAtk,
    iv_defense: ivDef,
    iv_speed: ivSpe,
    iv_sp_attack: ivSpa,
    iv_sp_defense: ivSpdef,
    ev_hp: evHp,
    ev_attack: evAtk,
    ev_defense: evDef,
    ev_speed: evSpd,
    ev_sp_attack: evSpa,
    ev_sp_defense: evSpdef,
    move1: resolveMoveName(move1id),
    move2: resolveMoveName(move2id),
    move3: resolveMoveName(move3id),
    move4: resolveMoveName(move4id),
    is_egg: isEgg,
    has_pokerus: pokerus !== 0,
    met_level: metLevel,
    origin_game: originGame,
    box: -1, // caller sets this (-1 = party, 0+ = box index)
    exp,
    pid,
  };
}
