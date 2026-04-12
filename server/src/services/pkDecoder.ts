/**
 * PK6/PK7 Shared Decoder — Decryption + Field Extraction
 *
 * Handles decryption, block unshuffling, and field extraction for
 * Generation 6 (X/Y/ORAS) and Generation 7 (SM/USUM) Pokemon data.
 *
 * PK6/PK7 binary format: 232 bytes (box) or 260 bytes (party).
 * Bytes 0x00-0x07: header (EC, checksum, etc.)
 * Bytes 0x08-0xE7: 4 encrypted/shuffled blocks (A, B, C, D) of 56 bytes each
 * Bytes 0xE8-0x103: party extension (encrypted separately, only in 260-byte slots)
 */

import { GAME_VERSION, NATURE_NAMES, BALL_NAMES } from './pkConstants.js';
import { resolveMoveName, resolveAbilityName } from '../seed-moves.js';
import { GEN6_ITEMS } from './gen6Constants.js';
import { GEN7_ITEMS } from './gen7Constants.js';
import db from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Gen67Pokemon {
  species_id: number;
  form: number;
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
  met_date: string;
  origin_game: string;
  friendship: number;
  box: number;
  exp: number;
  ec: number;
  pid: number;
}

// ---------------------------------------------------------------------------
// PRNG — Linear Congruential Generator used by Gen 6/7 encryption
// ---------------------------------------------------------------------------

/** Advance the PRNG: seed = seed * 0x41C64E6D + 0x6073 (32-bit) */
function prngNext(seed: number): number {
  // Use BigInt for the multiply to avoid JS floating-point overflow
  const s = BigInt(seed >>> 0);
  const next = (s * 0x41C64E6Dn + 0x6073n) & 0xFFFFFFFFn;
  return Number(next);
}

// ---------------------------------------------------------------------------
// Block Shuffle Table — 24 orderings of blocks A(0), B(1), C(2), D(3)
// ---------------------------------------------------------------------------

const BLOCK_ORDER: number[][] = [
  [0,1,2,3], [0,1,3,2], [0,2,1,3], [0,3,1,2], [0,2,3,1], [0,3,2,1],
  [1,0,2,3], [1,0,3,2], [2,0,1,3], [3,0,1,2], [2,0,3,1], [3,0,2,1],
  [1,2,0,3], [1,3,0,2], [2,1,0,3], [3,1,0,2], [2,3,0,1], [3,2,0,1],
  [1,2,3,0], [1,3,2,0], [2,1,3,0], [3,1,2,0], [2,3,1,0], [3,2,1,0],
];

const BLOCK_SIZE = 56;
const HEADER_SIZE = 8;       // bytes 0x00-0x07
const DATA_SIZE = 232;       // box pokemon size
const PARTY_SIZE = 260;      // party pokemon size
const BLOCKS_START = 0x08;
const BLOCKS_END = 0xE8;     // 0x08 + 4*56
const PARTY_START = 0xE8;
const PARTY_END = 0x104;     // 0xE8 + 28 = 0x104 (but spec says 0x103 inclusive)

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

/** XOR-decrypt a region of buf in-place using PRNG seeded by ec, 2 bytes at a time */
function decryptRegion(buf: Buffer, start: number, end: number, seed: number): void {
  let s = seed;
  for (let i = start; i < end; i += 2) {
    s = prngNext(s);
    // XOR with upper 16 bits of PRNG output
    const xorVal = (s >>> 16) & 0xFFFF;
    buf[i] ^= xorVal & 0xFF;
    buf[i + 1] ^= (xorVal >> 8) & 0xFF;
  }
}

/** Unshuffle the 4 blocks from their shuffled order to canonical ABCD order */
function unshuffleBlocks(buf: Buffer, ec: number): void {
  const sv = (ec >>> 13) & 31;
  const order = BLOCK_ORDER[sv % 24];

  // Copy shuffled blocks out
  const shuffled = Buffer.alloc(BLOCK_SIZE * 4);
  buf.copy(shuffled, 0, BLOCKS_START, BLOCKS_END);

  // order[block] = shuffled position where canonical block `block` is stored.
  // Read from shuffled[order[block]], write to canonical position block.
  // (Matches PKHeX PokeCrypto: sdata[block] = data[blockPosition[sv][block]])
  for (let block = 0; block < 4; block++) {
    shuffled.copy(buf, BLOCKS_START + block * BLOCK_SIZE, order[block] * BLOCK_SIZE, (order[block] + 1) * BLOCK_SIZE);
  }
}

/** Full decrypt + unshuffle of a PK6/PK7 slot. Mutates buf in place. */
function decryptPokemon(buf: Buffer): void {
  const ec = buf.readUInt32LE(0x00);

  // Decrypt the 4 data blocks (0x08 - 0xE7)
  decryptRegion(buf, BLOCKS_START, BLOCKS_END, ec);

  // Unshuffle blocks to canonical ABCD order
  unshuffleBlocks(buf, ec);

  // For party-size pokemon, decrypt the party extension (0xE8 - 0x103)
  if (buf.length >= PARTY_SIZE) {
    decryptRegion(buf, PARTY_START, PARTY_END, ec);
  }
}

// ---------------------------------------------------------------------------
// Checksum verification
// ---------------------------------------------------------------------------

/** Compute checksum: sum of all u16 words from 0x08 to 0xE7 */
function computeChecksum(buf: Buffer): number {
  let sum = 0;
  for (let i = BLOCKS_START; i < BLOCKS_END; i += 2) {
    sum = (sum + buf.readUInt16LE(i)) & 0xFFFF;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Item name resolution (placeholder until item table is built)
// ---------------------------------------------------------------------------

function resolveItemName(id: number): string {
  if (id === 0) return '';
  // Try Gen 7 items first (superset of Gen 6), fall back to Gen 6
  return GEN7_ITEMS[id] ?? GEN6_ITEMS[id] ?? `item-${id}`;
}

// ---------------------------------------------------------------------------
// Growth Rate / Level Calculation
// ---------------------------------------------------------------------------

/**
 * Compute required EXP for a given level using the growth rate formula.
 * Growth rate IDs: 0=Medium Fast, 1=Erratic, 2=Fluctuating,
 *                  3=Medium Slow, 4=Fast, 5=Slow
 */
function expForLevel(growthRate: number, n: number): number {
  if (n <= 1) return 0;
  switch (growthRate) {
    case 0: // Medium Fast: n^3
      return n * n * n;

    case 1: // Erratic: piecewise
      if (n <= 50)       return Math.floor((n * n * n * (100 - n)) / 50);
      else if (n <= 68)  return Math.floor((n * n * n * (150 - n)) / 100);
      else if (n <= 98)  return Math.floor((n * n * n * Math.floor((1911 - 10 * n) / 3)) / 500);
      else               return Math.floor((n * n * n * (160 - n)) / 100);

    case 2: // Fluctuating: piecewise
      if (n <= 15)       return Math.floor(n * n * n * ((Math.floor((n + 1) / 3) + 24) / 50));
      else if (n <= 36)  return Math.floor(n * n * n * ((n + 14) / 50));
      else               return Math.floor(n * n * n * ((Math.floor(n / 2) + 32) / 50));

    case 3: // Medium Slow: 6n^3/5 - 15n^2 + 100n - 140
      return Math.floor(6 * n * n * n / 5) - 15 * n * n + 100 * n - 140;

    case 4: // Fast: 4n^3/5
      return Math.floor(4 * n * n * n / 5);

    case 5: // Slow: 5n^3/4
      return Math.floor(5 * n * n * n / 4);

    default:
      return n * n * n; // fallback to medium fast
  }
}

/**
 * Given a growth rate and an EXP value, find the level (1-100).
 * Finds the highest level whose required EXP is <= the given exp.
 */
export function computeLevel(growthRate: number, exp: number): number {
  for (let level = 100; level >= 1; level--) {
    if (exp >= expForLevel(growthRate, level)) return level;
  }
  return 1;
}

/**
 * Decrypt a raw 232-byte box slot just enough to read EXP at 0x10,
 * then compute the level from the given growth rate.
 */
export function computeLevelFromSlot(raw: Buffer, growthRate: number): number {
  const buf = Buffer.from(raw); // don't mutate the original
  decryptPokemon(buf);
  const exp = buf.readUInt32LE(0x10);
  return computeLevel(growthRate, exp);
}

/** Alias for computeLevel — use when you already have the EXP value decoded. */
export const computeLevelFromExp = computeLevel;

// ---------------------------------------------------------------------------
// Growth Rate Cache (shared across gen6/gen7 parsers)
// ---------------------------------------------------------------------------

let growthRateCache: Record<number, number> | null = null;

export function getGrowthRate(speciesId: number): number {
  if (!growthRateCache) {
    growthRateCache = {};
    try {
      const rows = db.prepare('SELECT id, growth_rate FROM species WHERE growth_rate IS NOT NULL').all() as any[];
      for (const r of rows) growthRateCache[r.id] = r.growth_rate;
    } catch {}
  }
  return growthRateCache[speciesId] ?? 0;
}

// ---------------------------------------------------------------------------
// Field Extraction
// ---------------------------------------------------------------------------

/**
 * Decode a PK6/PK7 binary slot into a structured Gen67Pokemon object.
 *
 * @param raw     Buffer of 232 bytes (box) or 260 bytes (party)
 * @param encrypted  Whether the data needs decryption (true for save files,
 *                   false for PKSM banks which store unencrypted data)
 * @returns Parsed pokemon or null if the slot is empty or checksum fails
 */
export function decodePokemon(raw: Buffer, encrypted: boolean = true): Gen67Pokemon | null {
  if (raw.length < DATA_SIZE) return null;

  // Make a mutable copy
  const buf = Buffer.from(raw);

  // Read EC before decryption (it's in the unencrypted header)
  const ec = buf.readUInt32LE(0x00);

  // Skip empty slots
  if (ec === 0) return null;

  // Stored checksum at 0x06
  const storedChecksum = buf.readUInt16LE(0x06);

  // Decrypt if needed
  if (encrypted) {
    decryptPokemon(buf);
  }

  // Verify checksum
  const calcChecksum = computeChecksum(buf);
  if (calcChecksum !== storedChecksum) {
    return null;
  }

  // --- Block A (0x08 - 0x3F) ---
  const speciesId = buf.readUInt16LE(0x08);
  if (speciesId === 0 || speciesId > 1025) return null;

  const heldItemId = buf.readUInt16LE(0x0A);
  const tid = buf.readUInt16LE(0x0C);
  const sid = buf.readUInt16LE(0x0E);
  const exp = buf.readUInt32LE(0x10);
  const abilityId = buf[0x14];
  const pid = buf.readUInt32LE(0x18);
  const natureIdx = buf[0x1C];

  // 0x1D: bit0=fateful, bit1=female, bit2=genderless, bits3-7=form
  const formGenderByte = buf[0x1D];
  const isFemale = (formGenderByte >> 1) & 1;
  const isGenderless = (formGenderByte >> 2) & 1;
  const form = (formGenderByte >> 3) & 0x1F;
  const gender = isGenderless ? 'genderless' : isFemale ? 'female' : 'male';

  // EVs at 0x1E-0x23
  const evHp  = buf[0x1E];
  const evAtk = buf[0x1F];
  const evDef = buf[0x20];
  const evSpe = buf[0x21];
  const evSpa = buf[0x22];
  const evSpd = buf[0x23];

  const pokerus = buf[0x2B];

  // --- Block B (0x40 - 0x77) ---
  const nickname = buf.subarray(0x40, 0x40 + 24).toString('utf16le').replace(/\0/g, '');

  const move1id = buf.readUInt16LE(0x5A);
  const move2id = buf.readUInt16LE(0x5C);
  const move3id = buf.readUInt16LE(0x5E);
  const move4id = buf.readUInt16LE(0x60);

  // IV data at 0x74 (u32)
  const ivData = buf.readUInt32LE(0x74);
  const ivHp  = ivData & 0x1F;
  const ivAtk = (ivData >> 5) & 0x1F;
  const ivDef = (ivData >> 10) & 0x1F;
  const ivSpe = (ivData >> 15) & 0x1F;
  const ivSpa = (ivData >> 20) & 0x1F;
  const ivSpd = (ivData >> 25) & 0x1F;
  const isEgg = !!((ivData >> 30) & 1);

  // --- Block D (0xB0 - 0xE7) ---
  const otName = buf.subarray(0xB0, 0xB0 + 24).toString('utf16le').replace(/\0/g, '');
  const friendship = buf[0xCA];

  // Met date at 0xD4 (year-2000, month, day)
  const metYear = buf[0xD4] ? 2000 + buf[0xD4] : 0;
  const metMonth = buf[0xD5];
  const metDay = buf[0xD6];
  const metDate = metYear > 2000 && metMonth > 0 && metDay > 0
    ? `${metYear}-${String(metMonth).padStart(2, '0')}-${String(metDay).padStart(2, '0')}`
    : '';

  const ballId = buf[0xDC];
  const metLevel = buf[0xDD] & 0x7F;
  const originGameId = buf[0xDF];

  // --- Party extension (0xE8 - 0x103) ---
  let level = metLevel; // fallback for box pokemon
  if (buf.length >= PARTY_SIZE) {
    level = buf[0xEC] || metLevel;
  }

  // --- Shiny calculation ---
  const isShiny = ((tid ^ sid) ^ ((pid >>> 16) & 0xFFFF) ^ (pid & 0xFFFF)) < 16;

  return {
    species_id: speciesId,
    form,
    nickname: nickname || '',
    level,
    is_shiny: isShiny,
    nature: NATURE_NAMES[natureIdx] || 'Hardy',
    ability: resolveAbilityName(abilityId),
    gender,
    ball: BALL_NAMES[ballId] || 'Poke Ball',
    held_item: resolveItemName(heldItemId),
    ot_name: otName,
    ot_tid: tid,
    ot_sid: sid,
    iv_hp: ivHp,
    iv_attack: ivAtk,
    iv_defense: ivDef,
    iv_speed: ivSpe,
    iv_sp_attack: ivSpa,
    iv_sp_defense: ivSpd,
    ev_hp: evHp,
    ev_attack: evAtk,
    ev_defense: evDef,
    ev_speed: evSpe,
    ev_sp_attack: evSpa,
    ev_sp_defense: evSpd,
    move1: resolveMoveName(move1id),
    move2: resolveMoveName(move2id),
    move3: resolveMoveName(move3id),
    move4: resolveMoveName(move4id),
    is_egg: isEgg,
    has_pokerus: pokerus !== 0,
    met_level: metLevel,
    met_date: metDate,
    origin_game: GAME_VERSION[originGameId] || `Game-${originGameId}`,
    friendship,
    box: -1,  // caller sets this (-1 = party, 0+ = box index)
    exp,
    ec,
    pid,
  };
}
