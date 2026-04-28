/**
 * Computes byte offsets of named WRAM fields by parsing pret's `ram/wram.asm`.
 *
 * Used by the engine flag bank reader: each `ENGINE_*` flag in pokecrystal /
 * pokegold maps to a (wField, bit) pair via `data/events/engine_flags.asm`.
 * To read those flags from a save file, we need the byte offset of each
 * wField from a known SRAM anchor — `wEventFlags`, whose SRAM offset is
 * already hardcoded in `flagParsers/index.ts` (0x2600 for Crystal).
 *
 * The parser walks wram.asm linearly between two anchors and tracks the byte
 * size of each line. Handles:
 *   - `db` (1), `dw` (2), `dl` (3) declarations
 *   - `ds <expr>` with constant expression evaluation
 *   - `flag_array N` (= ceil(N/8))
 *   - `<label>:: <op>` prefix forms
 *   - Macros: `object_struct` (40 bytes), `map_object` (16), `mailmsg` (32),
 *     `sprite_oam_struct` (4)
 *   - `for n, X, Y / endr` loops — multiplies body size by (Y - X)
 *
 * Constants table is hardcoded for Crystal/Gold/Silver since they share
 * gen-2 layout. Add new constants when extending to more games.
 */
import { readFile } from 'node:fs/promises';

// Gen-2 (pokecrystal/pokegold) constants. Most have explicit `EQU` definitions
// in pret/constants; a few use `const_value` counters that resolve at build
// time. We use the well-known final values rather than counting const blocks.
const GEN2_CONSTS: Record<string, number> = {
  NAME_LENGTH: 11,
  PARTY_LENGTH: 6,
  NUM_BOXES: 14,
  BOX_NAME_LENGTH: 9,
  NUM_BADGES: 16,
  NUM_JOHTO_BADGES: 8,
  NUM_KANTO_BADGES: 8,
  NUM_TMS: 50,
  NUM_HMS: 7,
  MAX_ITEMS: 20,
  MAX_KEY_ITEMS: 25,
  MAX_BALLS: 12,
  MAX_PC_ITEMS: 50,
  NUM_OBJECT_STRUCTS: 13,
  NUM_OBJECTS: 16,
  OBJECT_LENGTH: 40,        // object_struct macro: 29 db + dw + 2 ds 1 + ds 7
  MAPOBJECT_LENGTH: 16,     // map_object macro: 9 db + 2 dw + ds 2
  CMDQUEUE_CAPACITY: 4,
  CMDQUEUE_ENTRY_SIZE: 6,   // 6 rb counters in script_constants
  MAIL_MSG_LENGTH: 0x20,    // 32 bytes
  MAILBOX_CAPACITY: 10,
  NUM_NPC_TRADES: 7,         // pokecrystal removed mobile-stadium trades; pokegold has more

  NUM_FLAGS: 2048,
  NUM_EVENTS: 2048,
  HOF_LENGTH: 0x62,         // 1 + HOF_MON_LENGTH * PARTY_LENGTH + 1
  HOF_MON_LENGTH: 16,
  NUM_HOF_TEAMS: 30,
  SPRITE_VARS: 0x40,
  NUM_VARS: 32,             // approximate — used only in script subsystem regions
  NUM_NON_TROPHY_DECOS: 64,
  STRING_BUFFER_LENGTH: 19,
  NUM_STRING_BUFFERS: 7,
  NUM_PLAYER_EVENTS: 32,
  NUM_PLAYER_MOVEMENTS: 16,
  // Sub-struct sizes inside larger structs — only needed if fields appear in
  // the range we walk; safe to default to 0 and add as needed.
};

interface ParseState {
  bytes: number;
  positions: Record<string, number>;
  /** Names we want to capture; if non-empty, others are skipped from the map. */
  filter?: Set<string>;
}

function evalExpr(expr: string, consts: Record<string, number>): number {
  // Replace identifiers with values, then eval the arithmetic expression.
  const cleaned = expr
    .replace(/[A-Z_][A-Z0-9_]*/gi, m => {
      if (consts[m] != null) return String(consts[m]);
      // Unknown identifier — return 0; unsafe but caller will log if total
      // diverges from expected.
      return '0';
    })
    .replace(/[^0-9+\-*/().% ]/g, ''); // strip anything else (whitespace/op safety)
  if (!cleaned.trim()) return 0;
  try {
    const v = Function('return (' + cleaned + ')')();
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

function lineSize(line: string, consts: Record<string, number>): number {
  const stripped = line.replace(/;.*$/, '').trimEnd();
  if (!stripped.trim()) return 0;

  // Match: optional `<label>::` prefix, then op + operand
  // Operations we recognize:
  //   db [args]    → 1 byte
  //   dw [args]    → 2 bytes
  //   dl [args]    → 3 bytes
  //   ds <expr>    → eval(expr) bytes
  //   flag_array N → ceil(N/8) bytes
  //   object_struct / map_object / mailmsg / sprite_oam_struct → known sizes
  const opMatch = stripped.match(/^\s*(?:[A-Za-z_][A-Za-z0-9_]*::\s*)?\s*(db|dw|dl|ds|flag_array|object_struct|map_object|mailmsg|sprite_oam_struct|union)\b\s*(.*)$/);
  if (!opMatch) return 0;
  const op = opMatch[1];
  const arg = opMatch[2].split(';')[0].trim();
  switch (op) {
    case 'db': return 1;
    case 'dw': return 2;
    case 'dl': return 3;
    case 'ds': return Math.ceil(evalExpr(arg, consts));
    case 'flag_array': return Math.ceil(evalExpr(arg, consts) / 8);
    case 'object_struct': return consts.OBJECT_LENGTH ?? 40;
    case 'map_object':    return consts.MAPOBJECT_LENGTH ?? 16;
    case 'mailmsg':       return consts.MAIL_MSG_LENGTH ?? 32;
    case 'sprite_oam_struct': return 4;
    case 'union':         return 0; // unions use the largest member; we don't track them, treat as 0 and hope
    default: return 0;
  }
}

interface ForLoop {
  startLine: number;
  varName: string;
  start: number;
  end: number;
}

/**
 * Walk pret/ram/wram.asm and compute byte offsets of `wField` labels,
 * relative to the position of `anchorLabel` (which gets offset 0).
 */
export async function buildWramOffsets(wramPath: string, anchorLabel: string): Promise<Map<string, number>> {
  const text = await readFile(wramPath, 'utf-8');
  const allLines = text.split('\n');

  // Two-pass approach: first pre-process to expand `for` loops by repeating
  // their body lines (Y - X) times. RGBDS for-loops are exclusive-upper
  // (`for n, 1, 13` iterates 12 times for n in [1..12]).
  const expanded: string[] = [];
  let i = 0;
  while (i < allLines.length) {
    const ln = allLines[i];
    const forMatch = ln.match(/^\s*for\s+(\w+)\s*,\s*([^,]+?)\s*,\s*([^;]+?)\s*(?:;.*)?$/);
    if (forMatch) {
      const varName = forMatch[1];
      const start = evalExpr(forMatch[2], GEN2_CONSTS);
      const end = evalExpr(forMatch[3], GEN2_CONSTS);
      // Find matching `endr`
      let depth = 1;
      const body: string[] = [];
      let j = i + 1;
      while (j < allLines.length && depth > 0) {
        const lnj = allLines[j].replace(/;.*$/, '').trim();
        if (/^for\b/.test(lnj)) depth++;
        else if (/^endr\b/.test(lnj)) {
          depth--;
          if (depth === 0) break;
        }
        if (depth > 0) body.push(allLines[j]);
        j++;
      }
      // Repeat body (end - start) times — RGBDS for-loops are exclusive on
      // the upper bound. Substitute `{d:varName}` references with the iteration
      // index so labels stay distinct (we don't actually track these labels,
      // but the substitution keeps lines parseable).
      for (let n = start; n < end; n++) {
        for (const bln of body) {
          expanded.push(bln.replace(new RegExp(`\\{d:${varName}\\}`, 'g'), String(n)));
        }
      }
      i = j + 1;
      continue;
    }
    expanded.push(ln);
    i++;
  }

  // Now walk the expanded lines, tracking byte offset from anchorLabel.
  // Before encountering the anchor we don't track. After the anchor we
  // accumulate byte sizes and capture each `<label>::` we see.
  const positions = new Map<string, number>();
  let inSection = false;
  let bytes = 0;
  for (const ln of expanded) {
    const labelMatch = ln.match(/^([A-Za-z_][A-Za-z0-9_]*)::/);
    if (labelMatch) {
      const lbl = labelMatch[1];
      if (lbl === anchorLabel) { inSection = true; bytes = 0; }
      if (inSection) {
        if (!positions.has(lbl)) positions.set(lbl, bytes);
      }
    }
    if (inSection) bytes += lineSize(ln, GEN2_CONSTS);
  }
  return positions;
}

/**
 * Parse pret's `data/events/engine_flags.asm` to map ENGINE_* names to
 * their (wField, bit) pairs. Pret format:
 *
 *   engine_flag wPokegearFlags, POKEGEAR_OBTAINED_F
 *
 * The ENGINE_* names come from `constants/engine_flags.asm` in declaration
 * order (which matches the engine_flags.asm table order).
 */
export async function buildEngineFlagTable(
  engineFlagsAsmPath: string,
  engineConstantsAsmPath: string,
  bitConstants: Record<string, number>,
): Promise<Array<{ name: string; wField: string; bit: number; index: number }>> {
  const tableText = await readFile(engineFlagsAsmPath, 'utf-8');
  const constsText = await readFile(engineConstantsAsmPath, 'utf-8');

  // Names: every `const ENGINE_*` line, in order.
  const names: string[] = [];
  for (const ln of constsText.split('\n')) {
    const m = ln.replace(/;.*$/, '').match(/^\s*const\s+(ENGINE_[A-Z0-9_]+)/);
    if (m) names.push(m[1]);
  }

  // Entries: every `engine_flag wField, BIT_F` line in order, paired by index.
  const entries: Array<{ wField: string; bit: number }> = [];
  for (const ln of tableText.split('\n')) {
    const m = ln.replace(/;.*$/, '').match(/^\s*engine_flag\s+(\w+)\s*,\s*(\w+)/);
    if (!m) continue;
    const wField = m[1];
    const bitName = m[2];
    const bit = bitConstants[bitName] ?? -1;
    entries.push({ wField, bit });
  }

  if (names.length !== entries.length) {
    console.warn(`[engine-flags] count mismatch: ${names.length} names, ${entries.length} table entries`);
  }
  const out: Array<{ name: string; wField: string; bit: number; index: number }> = [];
  for (let i = 0; i < Math.min(names.length, entries.length); i++) {
    out.push({ name: names[i], wField: entries[i].wField, bit: entries[i].bit, index: i });
  }
  return out;
}

/**
 * Parse pret bit-constant `_F` definitions. RGBDS uses `const_def` blocks
 * with auto-incrementing counters and `const_skip N` jumps. We extract
 * `<NAME>_F` constants by walking each `const_def` block.
 */
export async function buildBitConstants(constantsDir: string, files: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const f of files) {
    let text: string;
    try { text = await readFile(`${constantsDir}/${f}`, 'utf-8'); } catch { continue; }
    let counter = 0;
    let inBlock = false;
    for (const ln of text.split('\n')) {
      const stripped = ln.replace(/;.*$/, '').trim();
      if (/^const_def\b/.test(stripped)) { inBlock = true; counter = 0; continue; }
      // `DEF X EQU N` syntax — pret uses this for one-off bit constants that
      // don't fit the const_def pattern (LUCKYNUMBERSHOW_GAME_OVER_F,
      // DAYCAREMAN_HAS_MON_F, etc.). The value can be a literal number or a
      // simple constant we already know.
      const defM = stripped.match(/^DEF\s+([A-Z][A-Z0-9_]*)\s+EQU\s+([0-9]+|\$[0-9a-fA-F]+|[A-Z][A-Z0-9_]*)\s*$/);
      if (defM) {
        const valStr = defM[2];
        let v: number;
        if (valStr.startsWith('$')) v = parseInt(valStr.slice(1), 16);
        else if (/^\d+$/.test(valStr)) v = parseInt(valStr, 10);
        else v = out[valStr] ?? -1;
        if (v >= 0) out[defM[1]] = v;
        continue;
      }
      if (!inBlock) continue;
      const constM = stripped.match(/^const\s+([A-Z][A-Z0-9_]*)/);
      if (constM) {
        out[constM[1]] = counter;
        counter++;
        continue;
      }
      const skipM = stripped.match(/^const_skip\s+(\d+)/);
      if (skipM) { counter += parseInt(skipM[1], 10); continue; }
      const setM = stripped.match(/^const_value\s*=\s*(\d+)/);
      if (setM) { counter = parseInt(setM[1], 10); continue; }
      // Encountering a `DEF X EQU const_value` ends the conventional const_def
      // block in pret usage — we leave inBlock true since pret often re-uses
      // the same block; the next const_def resets counter anyway.
    }
  }
  return out;
}
