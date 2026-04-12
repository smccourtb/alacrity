/**
 * PK4/PK5 Shared Decoder — Decryption + Field Extraction
 *
 * Handles decryption, block unshuffling, and field extraction for
 * Generation 4 (Diamond/Pearl/Platinum, HeartGold/SoulSilver) and
 * Generation 5 (Black/White, Black 2/White 2) Pokemon data.
 *
 * PK4/PK5 binary format:
 *   Box:   136 bytes
 *   Party: PK4=236 bytes, PK5=220 bytes
 *
 * Bytes 0x00-0x07: header (PID, sanity, checksum)
 * Bytes 0x08-0x87: 4 encrypted/shuffled blocks of 32 bytes each (128 bytes total)
 * Bytes 0x88+:     party extension (encrypted separately with PID seed)
 *
 * Key difference from PK6/PK7:
 *   - Block size: 32 bytes (vs 56)
 *   - Encryption seed for blocks: checksum (vs EC)
 *   - Encryption seed for party extension: PID (vs EC)
 *   - Shuffle key derived from PID (vs EC)
 */

import { GAME_VERSION, NATURE_NAMES, BALL_NAMES } from './pkConstants.js';
import { resolveMoveName, resolveAbilityName } from '../seed-moves.js';
import { GEN6_ITEMS } from './gen6Constants.js';
import { decodeGen4String } from './charDecoder.js';
import db from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Gen45Pokemon {
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
  met_date: string;
  origin_game: string;
  box: number;
  exp: number;
  pid: number;
}

// ---------------------------------------------------------------------------
// PRNG — Linear Congruential Generator (same as Gen 6/7)
// ---------------------------------------------------------------------------

/** Advance the PRNG: seed = seed * 0x41C64E6D + 0x6073 (32-bit) */
function prngNext(seed: number): number {
  const s = BigInt(seed >>> 0);
  const next = (s * 0x41C64E6Dn + 0x6073n) & 0xFFFFFFFFn;
  return Number(next);
}

// ---------------------------------------------------------------------------
// Block Shuffle Table — 24 orderings of blocks A(0), B(1), C(2), D(3)
// Same table as PK6/PK7
// ---------------------------------------------------------------------------

const BLOCK_ORDER: number[][] = [
  [0,1,2,3], [0,1,3,2], [0,2,1,3], [0,3,1,2], [0,2,3,1], [0,3,2,1],
  [1,0,2,3], [1,0,3,2], [2,0,1,3], [3,0,1,2], [2,0,3,1], [3,0,2,1],
  [1,2,0,3], [1,3,0,2], [2,1,0,3], [3,1,0,2], [2,3,0,1], [3,2,0,1],
  [1,2,3,0], [1,3,2,0], [2,1,3,0], [3,1,2,0], [2,3,1,0], [3,2,1,0],
];

const BLOCK_SIZE = 32;        // 32 bytes per block (4 blocks = 128 bytes)
const HEADER_SIZE = 8;        // bytes 0x00-0x07
const BOX_SIZE = 136;         // box pokemon size
const BLOCKS_START = 0x08;
const BLOCKS_END = 0x88;      // 0x08 + 4*32 = 0x88
const PARTY_START = 0x88;

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

/** XOR-decrypt a region of buf in-place using PRNG seeded by `seed`, 2 bytes at a time */
function decryptRegion(buf: Buffer, start: number, end: number, seed: number): void {
  let s = seed;
  for (let i = start; i < end; i += 2) {
    s = prngNext(s);
    const xorVal = (s >>> 16) & 0xFFFF;
    buf[i]     ^= xorVal & 0xFF;
    buf[i + 1] ^= (xorVal >> 8) & 0xFF;
  }
}

/** Unshuffle the 4 blocks from their shuffled order to canonical ABCD order */
function unshuffleBlocks(buf: Buffer, pid: number): void {
  const sv = (pid >>> 13) & 31;
  const order = BLOCK_ORDER[sv % 24];

  // Copy shuffled blocks out
  const shuffled = Buffer.alloc(BLOCK_SIZE * 4);
  buf.copy(shuffled, 0, BLOCKS_START, BLOCKS_END);

  // order[block] = shuffled position where canonical block `block` is stored.
  // Read from shuffled[order[block]], write to canonical position block.
  for (let block = 0; block < 4; block++) {
    shuffled.copy(buf, BLOCKS_START + block * BLOCK_SIZE, order[block] * BLOCK_SIZE, (order[block] + 1) * BLOCK_SIZE);
  }
}

/** Full decrypt + unshuffle of a PK4/PK5 slot. Mutates buf in place. */
function decryptPokemon45(buf: Buffer): void {
  const pid = buf.readUInt32LE(0x00);
  const checksum = buf.readUInt16LE(0x06);

  // Decrypt the 4 data blocks (0x08-0x87) using checksum as seed
  decryptRegion(buf, BLOCKS_START, BLOCKS_END, checksum);

  // Unshuffle blocks to canonical ABCD order (shuffle key derived from PID)
  unshuffleBlocks(buf, pid);

  // For party-size pokemon, decrypt the party extension (0x88+) using PID as seed
  if (buf.length > BOX_SIZE) {
    // Party extension ends at buf.length (may be 236 for PK4 or 220 for PK5)
    // Align end to even byte
    const partyEnd = buf.length & ~1;
    decryptRegion(buf, PARTY_START, partyEnd, pid);
  }
}

// ---------------------------------------------------------------------------
// Checksum verification
// ---------------------------------------------------------------------------

/** Compute checksum: sum of all u16 words from 0x08 to 0x87 (64 words) */
function computeChecksum45(buf: Buffer): number {
  let sum = 0;
  for (let i = BLOCKS_START; i < BLOCKS_END; i += 2) {
    sum = (sum + buf.readUInt16LE(i)) & 0xFFFF;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Item name resolution — Gen 4/5 item IDs are mostly compatible with Gen 6
// ---------------------------------------------------------------------------

function resolveItemName(id: number): string {
  if (id === 0) return '';
  return GEN6_ITEMS[id] ?? `item-${id}`;
}

// ---------------------------------------------------------------------------
// UTF-16LE string reading with 0xFFFF/0x0000 terminator
// ---------------------------------------------------------------------------

function readUtf16String(buf: Buffer, offset: number, maxChars: number): string {
  const chars: string[] = [];
  for (let i = 0; i < maxChars; i++) {
    const cp = buf.readUInt16LE(offset + i * 2);
    if (cp === 0xFFFF || cp === 0x0000) break;
    chars.push(String.fromCharCode(cp));
  }
  return chars.join('');
}

// ---------------------------------------------------------------------------
// Field Extraction
// ---------------------------------------------------------------------------

/**
 * Decode a PK4/PK5 binary slot into a structured Gen45Pokemon object.
 *
 * @param raw      Buffer of 136 bytes (box) or 236/220 bytes (party)
 * @param isGen5   If true, read nature from offset 0x41 and allow species up to 649
 * @returns Parsed pokemon or null if the slot is empty or checksum fails
 */
export function decodePK45(raw: Buffer, isGen5: boolean = false): Gen45Pokemon | null {
  if (raw.length < BOX_SIZE) return null;

  // Make a mutable copy
  const buf = Buffer.from(raw);

  // Read PID from header (unencrypted)
  const pid = buf.readUInt32LE(0x00);

  // Skip empty slots
  if (pid === 0) return null;

  // Stored checksum at 0x06
  const storedChecksum = buf.readUInt16LE(0x06);

  // Decrypt + unshuffle
  decryptPokemon45(buf);

  // Verify checksum (computed over decrypted block data)
  const calcChecksum = computeChecksum45(buf);
  if (calcChecksum !== storedChecksum) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Block A (0x08-0x27 after unshuffle)
  // ---------------------------------------------------------------------------
  const speciesId = buf.readUInt16LE(0x08);
  const maxSpecies = isGen5 ? 649 : 493;
  if (speciesId === 0 || speciesId > maxSpecies) return null;

  const heldItemId = buf.readUInt16LE(0x0A);
  const tid         = buf.readUInt16LE(0x0C);
  const sid         = buf.readUInt16LE(0x0E);
  const exp         = buf.readUInt32LE(0x10);
  // 0x14: friendship, 0x15: ability
  const friendship  = buf[0x14];
  const abilityId   = buf[0x15];

  // EVs at 0x18-0x1D
  const evHp  = buf[0x18];
  const evAtk = buf[0x19];
  const evDef = buf[0x1A];
  const evSpe = buf[0x1B];
  const evSpa = buf[0x1C];
  const evSpd = buf[0x1D];

  // ---------------------------------------------------------------------------
  // Block B (0x28-0x47 after unshuffle)
  // ---------------------------------------------------------------------------
  const move1id = buf.readUInt16LE(0x28);
  const move2id = buf.readUInt16LE(0x2A);
  const move3id = buf.readUInt16LE(0x2C);
  const move4id = buf.readUInt16LE(0x2E);

  // IV data at 0x38 (u32)
  // bits 0-4=HP, 5-9=Atk, 10-14=Def, 15-19=Spd, 20-24=SpA, 25-29=SpD,
  // bit30=isEgg, bit31=isNicknamed
  const ivData = buf.readUInt32LE(0x38);
  const ivHp   = ivData & 0x1F;
  const ivAtk  = (ivData >> 5) & 0x1F;
  const ivDef  = (ivData >> 10) & 0x1F;
  const ivSpe  = (ivData >> 15) & 0x1F;
  const ivSpa  = (ivData >> 20) & 0x1F;
  const ivSpd  = (ivData >> 25) & 0x1F;
  const isEgg  = !!((ivData >> 30) & 1);

  // 0x40: form/gender byte — bit0=fateful, bit1=female, bit2=genderless, bits3-7=form
  const formGenderByte = buf[0x40];
  const isFemale      = (formGenderByte >> 1) & 1;
  const isGenderless  = (formGenderByte >> 2) & 1;
  const gender        = isGenderless ? 'genderless' : isFemale ? 'female' : 'male';

  // Nature: PK5 reads from 0x41 directly; PK4 derives from PID % 25
  let natureIdx: number;
  if (isGen5) {
    natureIdx = buf[0x41];
  } else {
    natureIdx = (pid >>> 0) % 25;
  }

  // ---------------------------------------------------------------------------
  // Block C (0x48-0x67 after unshuffle)
  // ---------------------------------------------------------------------------
  // Nickname: 11 x u16 starting at 0x48
  // Gen 4 uses custom encoding; Gen 5 uses standard UTF-16LE
  const nickname = isGen5 ? readUtf16String(buf, 0x48, 11) : decodeGen4String(buf, 0x48, 11);

  // Origin game version at 0x5F
  const originGameId = buf[0x5F];

  // ---------------------------------------------------------------------------
  // Block D (0x68-0x87 after unshuffle)
  // ---------------------------------------------------------------------------
  // OT Name: 8 x u16 starting at 0x68
  const otName = isGen5 ? readUtf16String(buf, 0x68, 8) : decodeGen4String(buf, 0x68, 8);

  // Met date at 0x7B (year-2000, month, day)
  const metYearRaw = buf[0x7B];
  const metMonth   = buf[0x7C];
  const metDay     = buf[0x7D];
  const metDate    = metYearRaw > 0 && metMonth > 0 && metDay > 0
    ? `${2000 + metYearRaw}-${String(metMonth).padStart(2, '0')}-${String(metDay).padStart(2, '0')}`
    : '';

  // 0x82: Pokerus, 0x83: Poke Ball, 0x84: met level byte (bits 0-6=level, bit7=OT gender)
  const pokerus  = buf[0x82];
  const ballId   = buf[0x83];
  const metLevelByte = buf[0x84];
  const metLevel = metLevelByte & 0x7F;

  // ---------------------------------------------------------------------------
  // Party extension (0x88+, decrypted with PID seed)
  // ---------------------------------------------------------------------------
  // 0x8C: Level (u8) — offset from start of party extension (0x88 + 0x04 = 0x8C)
  let level = metLevel; // fallback for box pokemon
  if (buf.length > BOX_SIZE) {
    const partyLevel = buf[0x8C];
    if (partyLevel > 0) level = partyLevel;
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  // Shiny: (TID ^ SID ^ (PID >> 16) ^ (PID & 0xFFFF)) < 8
  const isShiny = ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 8;

  return {
    species_id:    speciesId,
    nickname:      nickname || '',
    level,
    is_shiny:      isShiny,
    nature:        NATURE_NAMES[natureIdx] || 'Hardy',
    ability:       resolveAbilityName(abilityId),
    gender,
    ball:          BALL_NAMES[ballId] || 'Poke Ball',
    held_item:     resolveItemName(heldItemId),
    ot_name:       otName,
    ot_tid:        tid,
    ot_sid:        sid,
    iv_hp:         ivHp,
    iv_attack:     ivAtk,
    iv_defense:    ivDef,
    iv_speed:      ivSpe,
    iv_sp_attack:  ivSpa,
    iv_sp_defense: ivSpd,
    ev_hp:         evHp,
    ev_attack:     evAtk,
    ev_defense:    evDef,
    ev_speed:      evSpe,
    ev_sp_attack:  evSpa,
    ev_sp_defense: evSpd,
    move1:         resolveMoveName(move1id),
    move2:         resolveMoveName(move2id),
    move3:         resolveMoveName(move3id),
    move4:         resolveMoveName(move4id),
    is_egg:        isEgg,
    has_pokerus:   pokerus !== 0,
    met_level:     metLevel,
    met_date:      metDate,
    origin_game:   GAME_VERSION[originGameId] || `Game-${originGameId}`,
    box:           -1,  // caller sets this (-1 = party, 0+ = box index)
    exp,
    pid,
  };
}
