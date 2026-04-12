/**
 * Gen 3 Save Parser — Ruby/Sapphire/Emerald/FireRed/LeafGreen
 *
 * Gen 3 saves use a unique sectored format: 128KB with 14 rotating sections.
 * Section positions shift on each save, so section IDs must be read from footers.
 *
 * File layout:
 *   0x00000–0x0DFFF  Slot A (14 × 0x1000-byte sections)
 *   0x0E000–0x1BFFF  Slot B (14 × 0x1000-byte sections)
 *
 * Active slot = slot with the higher Save Index in any section footer.
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './worldState.js';
import type { Gen3Pokemon } from './pk3Decoder.js';
import { decodePK3 } from './pk3Decoder.js';
import { extractGen3WorldState } from './gen3WorldState.js';
import { computeLevel, getGrowthRate } from './pkDecoder.js';

// ---------------------------------------------------------------------------
// Save structure constants
// ---------------------------------------------------------------------------

const FILE_SIZE      = 0x20000;  // 128 KB
const SECTION_SIZE   = 0x1000;   // 4 KB per section
const NUM_SECTIONS   = 14;

// Slot offsets
const SLOT_A_OFFSET  = 0x00000;
const SLOT_B_OFFSET  = 0x0E000;

// Section footer offsets (relative to section start)
const FOOTER_SECTION_ID = 0x0FF4; // u16 — which logical section this is (0-13)
const FOOTER_MAGIC      = 0x0FF8; // u32 — must equal 0x08012025
const FOOTER_SAVE_INDEX = 0x0FFC; // u32 — increments each save

const MAGIC_VALUE = 0x08012025;

// Data sizes per section (how many bytes of real data, rest is padding)
// Sections 5-12 each have 0x0F80 bytes; section 13 has 0x07D0 bytes.
const BOX_SECTION_DATA_SIZE   = 0x0F80;
const BOX_SECTION_13_DATA_SIZE = 0x07D0;

// Party (Section 1) offsets
const RSE_PARTY_COUNT_OFFSET = 0x0234;
const RSE_PARTY_DATA_OFFSET  = 0x0238;
const FRLG_PARTY_COUNT_OFFSET = 0x0034;
const FRLG_PARTY_DATA_OFFSET  = 0x0038;

const PARTY_SLOTS     = 6;
const PARTY_SLOT_SIZE = 100; // PK3 party format

// Box (Sections 5-13) layout
const BOX_CURRENT_BOX_SIZE = 4;   // u32 at start of box buffer
const NUM_BOXES             = 14;
const SLOTS_PER_BOX         = 30;
const BOX_SLOT_SIZE         = 80;  // PK3 box format

// ---------------------------------------------------------------------------
// Section parsing
// ---------------------------------------------------------------------------

interface SectionMap {
  /** section data (everything before the footer) indexed by logical section ID */
  data: Map<number, Buffer>;
  /** highest save index seen across all sections in this slot */
  saveIndex: number;
}

function parseSlot(buf: Buffer, slotOffset: number): SectionMap {
  const data  = new Map<number, Buffer>();
  let saveIndex = 0;

  for (let i = 0; i < NUM_SECTIONS; i++) {
    const sectionStart = slotOffset + i * SECTION_SIZE;
    if (sectionStart + SECTION_SIZE > buf.length) break;

    const magic = buf.readUInt32LE(sectionStart + FOOTER_MAGIC);
    if (magic !== MAGIC_VALUE) continue;

    const sectionId  = buf.readUInt16LE(sectionStart + FOOTER_SECTION_ID);
    const sectionIdx = buf.readUInt32LE(sectionStart + FOOTER_SAVE_INDEX);

    if (sectionIdx > saveIndex) saveIndex = sectionIdx;

    // Store the full section data (0x0FF4 bytes — everything before the footer)
    const sectionData = Buffer.from(buf.subarray(sectionStart, sectionStart + FOOTER_SECTION_ID));
    data.set(sectionId, sectionData);
  }

  return { data, saveIndex };
}

// ---------------------------------------------------------------------------
// FRLG detection
// ---------------------------------------------------------------------------

function isFRLG(game: string): boolean {
  const lc = game.toLowerCase();
  return lc.includes('firered') || lc.includes('leafgreen');
}

// ---------------------------------------------------------------------------
// Party parsing
// ---------------------------------------------------------------------------

function parseParty(section1: Buffer, frlg: boolean): Gen3Pokemon[] {
  const countOffset = frlg ? FRLG_PARTY_COUNT_OFFSET : RSE_PARTY_COUNT_OFFSET;
  const dataOffset  = frlg ? FRLG_PARTY_DATA_OFFSET  : RSE_PARTY_DATA_OFFSET;

  if (countOffset + 4 > section1.length) return [];
  const count = Math.min(section1.readUInt32LE(countOffset), PARTY_SLOTS);

  const pokemon: Gen3Pokemon[] = [];

  for (let i = 0; i < count; i++) {
    const slotStart = dataOffset + i * PARTY_SLOT_SIZE;
    if (slotStart + PARTY_SLOT_SIZE > section1.length) break;

    const raw = Buffer.from(section1.subarray(slotStart, slotStart + PARTY_SLOT_SIZE));
    const pk  = decodePK3(raw);
    if (pk) {
      pk.box = -1;
      pokemon.push(pk);
    }
  }

  return pokemon;
}

// ---------------------------------------------------------------------------
// Box buffer assembly
// ---------------------------------------------------------------------------

function buildBoxBuffer(sections: Map<number, Buffer>): Buffer {
  const parts: Buffer[] = [];

  for (let id = 5; id <= 13; id++) {
    const sec = sections.get(id);
    if (!sec) {
      // Fill with zeros for missing sections so offsets stay consistent
      const fillSize = id === 13 ? BOX_SECTION_13_DATA_SIZE : BOX_SECTION_DATA_SIZE;
      parts.push(Buffer.alloc(fillSize, 0));
      continue;
    }
    const dataSize = id === 13 ? BOX_SECTION_13_DATA_SIZE : BOX_SECTION_DATA_SIZE;
    parts.push(Buffer.from(sec.subarray(0, dataSize)));
  }

  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// Box parsing
// ---------------------------------------------------------------------------

function parseBoxes(boxBuf: Buffer): Gen3Pokemon[] {
  const pokemon: Gen3Pokemon[] = [];

  // First 4 bytes = current box number (unused for parsing)
  const dataStart = BOX_CURRENT_BOX_SIZE;

  for (let box = 0; box < NUM_BOXES; box++) {
    for (let slot = 0; slot < SLOTS_PER_BOX; slot++) {
      const slotStart = dataStart + (box * SLOTS_PER_BOX + slot) * BOX_SLOT_SIZE;
      if (slotStart + BOX_SLOT_SIZE > boxBuf.length) break;

      const raw = Buffer.from(boxBuf.subarray(slotStart, slotStart + BOX_SLOT_SIZE));

      // Quick skip for empty slots (PID == 0 && OTID == 0)
      if (raw.readUInt32LE(0) === 0 && raw.readUInt32LE(4) === 0) continue;

      const pk = decodePK3(raw);
      if (pk) {
        pk.box   = box;
        pk.level = computeLevel(getGrowthRate(pk.species_id), pk.exp);
        pokemon.push(pk);
      }
    }
  }

  return pokemon;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGen3Save(filePath: string, game: string): ParseResult<Gen3Pokemon> {
  const buf = readFileSync(filePath);

  if (buf.length < FILE_SIZE) {
    throw new Error(`Gen 3 save too small: ${buf.length} bytes (expected ${FILE_SIZE})`);
  }

  // Parse both slots
  const slotA = parseSlot(buf, SLOT_A_OFFSET);
  const slotB = parseSlot(buf, SLOT_B_OFFSET);

  // Active slot = higher save index
  const active = slotA.saveIndex >= slotB.saveIndex ? slotA : slotB;
  const sections = active.data;

  const frlg = isFRLG(game);

  // --- Party (Section 1) ---
  const pokemon: Gen3Pokemon[] = [];

  const section1 = sections.get(1);
  if (section1) {
    pokemon.push(...parseParty(section1, frlg));
  }

  // --- Boxes (Sections 5-13) ---
  const boxBuf  = buildBoxBuffer(sections);
  pokemon.push(...parseBoxes(boxBuf));

  // --- World state (Section 0 + Section 1) ---
  const section0   = sections.get(0) ?? Buffer.alloc(0x200);
  const worldState = extractGen3WorldState(section0, section1 ?? null, game);

  return { pokemon, worldState };
}
