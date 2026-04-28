/**
 * Generates engine-flag definitions for gen 1-2 games by parsing pret's
 * `ram/wram.asm` (for byte offsets), `data/events/engine_flags.asm` (for
 * the ENGINE_* → (wField, bit) table), and `constants/engine_flags.asm`
 * (for the ENGINE_* names in declaration order).
 *
 * Output: `server/src/data/flags/<game>-engine.json`. Each entry:
 *   {
 *     name:           "ENGINE_POKEGEAR",
 *     synthetic_index: 4096,            // base + ordinal; non-overlapping with event flags
 *     sram_offset:    0x24E5,           // absolute SRAM offset for byte-bank read
 *     bit:            7,                // bit position within that byte
 *     wField:         "wPokegearFlags",
 *   }
 *
 * The synthetic_index lets the existing FlagResult[] system carry engine
 * flags alongside event flags without schema changes — we just keep event
 * flag indices below 4096 and engine indices at 4096+. The linker writes
 * synthetic_index into `location_*.flag_index` for engine-gated rows.
 *
 * Usage: bun run server/src/scripts/generate-engine-flag-defs.ts [game]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWramOffsets, buildEngineFlagTable, buildBitConstants } from './lib/pret-wram-offsets.js';

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const REPO_ROOT = join(SCRIPT_DIR, '..', '..', '..');
const FLAGS_OUT_DIR = join(SCRIPT_DIR, '..', 'data', 'flags');
const PRET_CACHE_DIR = join(REPO_ROOT, '.data-cache');

// Synthetic index base — well above the max event flag index (~2000 for
// crystal/gold) so engine and event flags coexist in one index space.
const ENGINE_INDEX_BASE = 4096;

interface GameSource {
  pretName: string;            // .data-cache/pret-<name>
  flagFiles: string[];         // games to generate (gold + silver share files)
  eventFlagsAnchorSram: number; // SRAM offset of wEventFlags in this game
}

const SOURCES: GameSource[] = [
  {
    pretName: 'pokecrystal',
    flagFiles: ['crystal'],
    eventFlagsAnchorSram: 0x2600,
  },
  {
    pretName: 'pokegold',
    flagFiles: ['gold', 'silver'],
    eventFlagsAnchorSram: 0x261F,    // pokegold/pokesilver use a slightly different offset
  },
  // Gen 1 has wEventFlags + separate hidden-item / missable-object banks,
  // but no `engine_flags.asm` of comparable structure — added in gen2.
];

const arg = process.argv[2];

async function generate(src: GameSource) {
  const pretRoot = join(PRET_CACHE_DIR, `pret-${src.pretName}`);

  // Build wField byte offsets, anchored at wPlayerData (the start of the
  // saved player block — every engine-flag wField lives inside it).
  const offsets = await buildWramOffsets(`${pretRoot}/ram/wram.asm`, 'wPlayerData');
  const eventFlagsRel = offsets.get('wEventFlags');
  if (eventFlagsRel == null) throw new Error(`No wEventFlags label in ${pretRoot}/ram/wram.asm`);

  // Build (BIT_NAME → bit_index) by parsing const_def blocks in ram_constants.
  const bitConsts = await buildBitConstants(`${pretRoot}/constants`, ['ram_constants.asm']);

  // Build engine flag table.
  const tbl = await buildEngineFlagTable(
    `${pretRoot}/data/events/engine_flags.asm`,
    `${pretRoot}/constants/engine_flags.asm`,
    bitConsts,
  );

  // For each entry, compute SRAM offset relative to wEventFlags's known SRAM,
  // then write to per-game file. Skip entries whose wField isn't in the wram
  // offsets map (rare — usually pret comments-only wFields or aliased
  // sub-fields like wDayCareLady which shares wDayCareMan's space + offset).
  const out: Array<{
    name: string; synthetic_index: number;
    sram_offset: number; bit: number; wField: string;
  }> = [];
  let skipped = 0;
  for (const e of tbl) {
    const wFieldRel = offsets.get(e.wField);
    if (wFieldRel == null || e.bit < 0) { skipped++; continue; }
    const sram = src.eventFlagsAnchorSram + (wFieldRel - eventFlagsRel);
    out.push({
      name: e.name,
      synthetic_index: ENGINE_INDEX_BASE + e.index,
      sram_offset: sram,
      bit: e.bit,
      wField: e.wField,
    });
  }

  for (const game of src.flagFiles) {
    const path = join(FLAGS_OUT_DIR, `${game}-engine.json`);
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n', 'utf-8');
    console.log(`[${game}] wrote ${out.length} engine flags (skipped ${skipped} with unresolved wField/bit) → ${path}`);
  }
}

const targets = arg ? SOURCES.filter(s => s.flagFiles.includes(arg) || s.pretName === `pret-${arg}`) : SOURCES;
if (targets.length === 0) {
  console.error(`No source matches: ${arg}`);
  process.exit(1);
}
for (const src of targets) {
  await generate(src);
}
