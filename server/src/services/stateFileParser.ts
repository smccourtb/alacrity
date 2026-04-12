// mGBA save state (.ss1) parser — PNG chunk extraction for WRAM and SRAM
// mGBA save states are valid PNG files with custom chunks:
//   gbAs — zlib-compressed system state (contains WRAM at offset 0x4400)
//   gbAx — zlib-compressed extended data blocks (SRAM is tag=2)
//
// References:
//   https://github.com/mgba-emu/mgba/blob/master/src/gb/gb.c
//   https://github.com/mgba-emu/mgba/blob/master/src/gb/serialize.c

import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';
import type { Gen2Pokemon } from './gen2Parser.js';
import type { Gen1Pokemon } from './gen1Parser.js';
import { decodeGen1String, decodeGen2String } from './charDecoder.js';
import type { ParseResult } from './worldState.js';
import { parseGen1Save, INDEX_TO_DEX, GEN1_MOVES } from './gen1Parser.js';
import { parseGen2Save, GEN2_MOVES, decodeItem } from './gen2Parser.js';

export interface StateData {
  wram: Buffer;        // 32KB WRAM (8 banks × 4KB)
  sram: Buffer | null; // SRAM snapshot, or null if not present in state
}

// PNG file signature: 8 bytes
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// mGBA GB state chunk: WRAM starts at this offset within the decompressed gbAs blob
const WRAM_OFFSET = 0x4400;
const WRAM_SIZE = 0x8000; // 32KB

// gbAx extended data tag for battery-backed SRAM
const EXTDATA_TAG_SAVEDATA = 2;

/**
 * Read an mGBA .ss1 save state and extract the WRAM and SRAM buffers.
 *
 * The .ss1 format is a standard PNG with two custom chunk types:
 *   - `gbAs`: one chunk, zlib-compressed, holds the full GB hardware state.
 *             WRAM lives at [WRAM_OFFSET, WRAM_OFFSET + WRAM_SIZE).
 *   - `gbAx`: zero or more chunks, each is a tagged extended-data block.
 *             Layout: uint32LE tag | uint32LE uncompressedSize | zlib data...
 *             Tag 2 = save data (SRAM).
 */
export function extractStateData(ss1Path: string): StateData {
  const file = readFileSync(ss1Path);

  // --- Verify PNG signature ---
  if (file.length < PNG_SIGNATURE.length) {
    throw new Error(`File too small to be a PNG: ${ss1Path}`);
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (file[i] !== PNG_SIGNATURE[i]) {
      throw new Error(`Not a valid PNG file (bad signature): ${ss1Path}`);
    }
  }

  // --- Walk PNG chunks ---
  let wram: Buffer | null = null;
  let sram: Buffer | null = null;

  let offset = PNG_SIGNATURE.length; // start after 8-byte signature

  while (offset + 12 <= file.length) {
    // Each chunk: [4-byte length BE][4-byte type ASCII][data][4-byte CRC]
    const chunkLength = file.readUInt32BE(offset);
    const chunkType = file.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    // next chunk starts after data + 4-byte CRC
    const nextOffset = dataEnd + 4;

    if (nextOffset > file.length) {
      // Truncated file — stop walking
      break;
    }

    if (chunkType === 'gbAs') {
      // Full hardware state blob — WRAM is at a fixed offset after decompression
      const compressed = file.slice(dataStart, dataEnd);
      const decompressed = inflateSync(compressed);

      const wramEnd = WRAM_OFFSET + WRAM_SIZE;
      if (decompressed.length < wramEnd) {
        throw new Error(
          `gbAs chunk decompressed to ${decompressed.length} bytes, expected at least ${wramEnd}`
        );
      }
      wram = Buffer.from(decompressed.slice(WRAM_OFFSET, wramEnd));
    } else if (chunkType === 'gbAx') {
      // Extended data block: uint32LE tag, uint32LE uncompressedSize, then zlib data
      if (chunkLength < 8) {
        offset = nextOffset;
        continue;
      }
      const tag = file.readUInt32LE(dataStart);
      // uncompressedSize at dataStart + 4 (informational — inflateSync handles size)
      const zlibData = file.slice(dataStart + 8, dataEnd);

      if (tag === EXTDATA_TAG_SAVEDATA) {
        const decompressed = inflateSync(zlibData);
        sram = Buffer.from(decompressed);
      }
    } else if (chunkType === 'IEND') {
      // End of PNG — no more chunks
      break;
    }

    offset = nextOffset;
  }

  if (wram === null) {
    throw new Error(`No gbAs chunk found in save state — cannot extract WRAM: ${ss1Path}`);
  }

  return { wram, sram };
}

// ── WRAM address constants (offsets relative to 32KB WRAM buffer) ────────────
//
// GBC WRAM is 32KB = 8 banks × 4KB.
// Bank 0 = bytes 0x0000-0x0FFF, Bank 1 = 0x1000-0x1FFF, etc.
// All party data lives in Bank 1 (the switched bank, default bank 1 at WRAM offset 0x1000).
// RAM address $Dxxx → WRAM offset (address - 0xC000). $D162 → 0x1162, etc.

// Crystal / Gold / Silver WRAM layout
// DVs within the 48-byte party struct are at +0x15 (byte1) and +0x16 (byte2),
// matching the box struct layout — NOT +0x0F/+0x10 as the SRAM party struct.
const CRYSTAL_WRAM = {
  partyCount:    0x1CD7, // $DCD7
  partySpecies:  0x1CD8, // $DCD8 — 7 bytes (6 species + 0xFF terminator)
  partyData:     0x1CDF, // $DCDF — 48 bytes per pokemon
  partyOTNames:  0x1DFF, // $DDFF — 11 bytes per OT name (6 entries)
  partyNicknames:0x1E41, // $DE41 — 11 bytes per nickname (6 entries)
  playerName:    0x147D, // $D47D
  playerTID:     0x147B, // $D47B — big-endian uint16
} as const;

// Yellow WRAM layout (Red/Blue use the same addresses + 1)
const YELLOW_WRAM = {
  partyCount:    0x1162, // $D162
  partySpecies:  0x1163, // $D163
  partyData:     0x116A, // $D16A — 44 bytes per pokemon
  playerName:    0x1158, // $D158
  playerTID:     0x1359, // $D359 — big-endian uint16
} as const;

const RB_WRAM = {
  partyCount:    0x1163, // $D163
  partySpecies:  0x1164, // $D164
  partyData:     0x116B, // $D16B — 44 bytes per pokemon
  playerName:    0x1158, // $D158 (same as Yellow)
  playerTID:     0x1359, // $D359 (same as Yellow)
} as const;

// ── Shared helper: DV parsing + shiny check ──────────────────────────────────

function parseDVBytes(byte1: number, byte2: number): {
  atk: number; def: number; spd: number; spc: number; hp: number; shiny: boolean;
} {
  const atk = (byte1 >> 4) & 0xF;
  const def = byte1 & 0xF;
  const spd = (byte2 >> 4) & 0xF;
  const spc = byte2 & 0xF;
  const hp = ((atk & 1) << 3) | ((def & 1) << 2) | ((spd & 1) << 1) | (spc & 1);
  const shiny = [2, 3, 6, 7, 10, 11, 14, 15].includes(atk) && def === 10 && spd === 10 && spc === 10;
  return { atk, def, spd, spc, hp, shiny };
}

// ── WRAM party parsers ────────────────────────────────────────────────────────

/**
 * Parse the active party from a Gen 2 WRAM buffer (Crystal, Gold, Silver).
 *
 * Reads party pokemon directly from WRAM using live RAM addresses captured
 * in the .ss1 save state. Returns pokemon with box = -1 (party slot).
 */
export function parseWramPartyGen2(wram: Buffer, gameName: string): Gen2Pokemon[] {
  // Crystal and Gold/Silver share the same WRAM layout for party data
  const addrs = CRYSTAL_WRAM;

  // Guard: buffer must cover at least through the end of party nicknames area
  if (wram.length < addrs.partyNicknames + 6 * 11) return [];

  const partyCount = wram[addrs.partyCount];
  if (partyCount === 0 || partyCount > 6) return [];

  const playerName = decodeGen2String(wram, addrs.playerName, 11);
  const playerTID = wram.readUInt16BE(addrs.playerTID);

  const PKM_SIZE = 48;
  const isCrystal = gameName.toLowerCase().includes('crystal');
  const results: Gen2Pokemon[] = [];

  for (let i = 0; i < partyCount; i++) {
    const species = wram[addrs.partySpecies + i];
    if (species === 0 || species === 0xFF || species > 251) continue;

    const offset = addrs.partyData + i * PKM_SIZE;

    const dvByte1 = wram[offset + 0x15]; // Atk(hi) | Def(lo)
    const dvByte2 = wram[offset + 0x16]; // Spd(hi) | Spc(lo)
    const { atk, def, spd, spc, hp, shiny } = parseDVBytes(dvByte1, dvByte2);

    const level = wram[offset + 0x1F];
    const heldItemId = wram[offset + 0x01];

    const otName = decodeGen2String(wram, addrs.partyOTNames + i * 11, 11);

    // EXP: 3 bytes big-endian at offset + 0x08
    const exp = (wram[offset + 0x08] << 16) | (wram[offset + 0x09] << 8) | wram[offset + 0x0A];

    // Stat EXP: 2 bytes each at 0x0B-0x14
    const statExpHp      = wram.readUInt16BE(offset + 0x0B);
    const statExpAttack  = wram.readUInt16BE(offset + 0x0D);
    const statExpDefense = wram.readUInt16BE(offset + 0x0F);
    const statExpSpeed   = wram.readUInt16BE(offset + 0x11);
    const statExpSpecial = wram.readUInt16BE(offset + 0x13);

    // PP Ups: top 2 bits of each PP byte at 0x17-0x1A
    const ppUps = ((wram[offset + 0x17] >> 6) & 3) |
                  (((wram[offset + 0x18] >> 6) & 3) << 2) |
                  (((wram[offset + 0x19] >> 6) & 3) << 4) |
                  (((wram[offset + 0x1A] >> 6) & 3) << 6);

    // Friendship, Pokerus, Caught data (Crystal only)
    const friendship = wram[offset + 0x1B];
    const pokerus    = wram[offset + 0x1C];
    const caughtByte1 = wram[offset + 0x1D];
    const caughtByte2 = wram[offset + 0x1E];
    const caughtTime     = isCrystal ? (caughtByte1 >> 6) & 0x3 : 0;
    const caughtLevel    = isCrystal ? caughtByte1 & 0x3F : 0;
    const caughtLocation = isCrystal ? caughtByte2 & 0x7F : 0;

    results.push({
      species_id: species,
      level,
      iv_attack: atk,
      iv_defense: def,
      iv_speed: spd,
      iv_special: spc,
      iv_hp: hp,
      is_shiny: shiny,
      ot_name: otName || playerName,
      ot_tid: playerTID,
      held_item: decodeItem(heldItemId),
      move1: GEN2_MOVES[wram[offset + 0x02]] || '',
      move2: GEN2_MOVES[wram[offset + 0x03]] || '',
      move3: GEN2_MOVES[wram[offset + 0x04]] || '',
      move4: GEN2_MOVES[wram[offset + 0x05]] || '',
      box: -1,
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

  return results;
}

/**
 * Parse the active party from a Gen 1 WRAM buffer (Red, Blue, Yellow).
 *
 * Gen 1 party pokemon use internal species indices (not national dex numbers).
 * Returns pokemon with box = -1 (party slot).
 */
export function parseWramPartyGen1(wram: Buffer, gameName: string): Gen1Pokemon[] {
  const isYellow = gameName.toLowerCase().includes('yellow');
  const addrs = isYellow ? YELLOW_WRAM : RB_WRAM;

  if (wram.length < addrs.partyData + 6 * 44) return [];

  const partyCount = wram[addrs.partyCount];
  if (partyCount === 0 || partyCount > 6) return [];

  const playerName = decodeGen1String(wram, addrs.playerName, 11);
  const playerTID = wram.readUInt16BE(addrs.playerTID);

  const PKM_SIZE = 44;
  const results: Gen1Pokemon[] = [];

  for (let i = 0; i < partyCount; i++) {
    const speciesIdx = wram[addrs.partySpecies + i];
    if (speciesIdx === 0xFF) break; // terminator
    const dexNum = INDEX_TO_DEX[speciesIdx];
    if (dexNum === undefined || dexNum > 151) continue;

    const offset = addrs.partyData + i * PKM_SIZE;

    const dvByte1 = wram[offset + 27]; // Atk(hi) | Def(lo)
    const dvByte2 = wram[offset + 28]; // Spd(hi) | Spc(lo)
    const { atk, def, spd, spc, hp, shiny } = parseDVBytes(dvByte1, dvByte2);

    const level = wram[offset + 33];

    results.push({
      species_id: dexNum,
      level,
      iv_attack: atk,
      iv_defense: def,
      iv_speed: spd,
      iv_special: spc,
      iv_hp: hp,
      is_shiny: shiny,
      ot_name: playerName,
      ot_tid: playerTID,
      move1: GEN1_MOVES[wram[offset + 8]] || '',
      move2: GEN1_MOVES[wram[offset + 9]] || '',
      move3: GEN1_MOVES[wram[offset + 10]] || '',
      move4: GEN1_MOVES[wram[offset + 11]] || '',
      box: -1,
      exp: (wram[offset + 14] << 16) | (wram[offset + 15] << 8) | wram[offset + 16],
      stat_exp_hp: (wram[offset + 17] << 8) | wram[offset + 18],
      stat_exp_attack: (wram[offset + 19] << 8) | wram[offset + 20],
      stat_exp_defense: (wram[offset + 21] << 8) | wram[offset + 22],
      stat_exp_speed: (wram[offset + 23] << 8) | wram[offset + 24],
      stat_exp_special: (wram[offset + 25] << 8) | wram[offset + 26],
      pp_ups: ((wram[offset + 29] >> 6) & 3) | (((wram[offset + 30] >> 6) & 3) << 2) | (((wram[offset + 31] >> 6) & 3) << 4) | (((wram[offset + 32] >> 6) & 3) << 6),
    });
  }

  return results;
}

/**
 * Parse a save using .ss1 state file for reliable data:
 * - Party: from WRAM (always current)
 * - Boxes + daycare + world state: from SRAM in the state (more reliable than .sav)
 * - Falls back to .sav for boxes if state has no SRAM extdata
 */
export function parseWithStateFile(
  savPath: string | null,
  ss1Path: string,
  gameName: string,
): ParseResult<Gen1Pokemon | Gen2Pokemon> {
  const { wram, sram } = extractStateData(ss1Path);

  const g = gameName.toLowerCase();
  const isGen1 = ['red', 'blue', 'yellow'].includes(g);
  const isGen2 = ['gold', 'silver', 'crystal'].includes(g);

  if (!isGen1 && !isGen2) {
    throw new Error(`parseWithStateFile: unsupported game "${gameName}"`);
  }

  // 1. Parse SRAM for boxes, world state, daycare
  //    Prefer SRAM from state; fall back to .sav file
  const sramSource = sram ?? (savPath ? savPath : null);
  if (!sramSource) {
    throw new Error('No SRAM source: state has no SAVEDATA extdata and no .sav path provided');
  }

  const sramResult: ParseResult<any> = isGen1
    ? parseGen1Save(sramSource, gameName)
    : parseGen2Save(sramSource, gameName);

  // 2. Parse party from WRAM
  const wramParty: Array<Gen1Pokemon | Gen2Pokemon> = isGen1
    ? parseWramPartyGen1(wram, gameName)
    : parseWramPartyGen2(wram, gameName);

  // 3. Merge: WRAM party + SRAM boxes (filter out SRAM party)
  const sramBoxPokemon = sramResult.pokemon.filter((p: any) => p.box >= 0);

  return {
    pokemon: [...wramParty, ...sramBoxPokemon],
    worldState: sramResult.worldState,
    daycare: sramResult.daycare,
  };
}
