/**
 * Parses shop (pokemart) data from pret gen2 maps.
 *
 * Crystal/Gold flow:
 *   - `constants/mart_constants.asm` defines MART_* constants in order.
 *   - `data/items/marts.asm` defines `Mart<Name>:` labels with `db ITEM` lists
 *     in the same order as the constants (via the top `Marts:` table).
 *   - Map .asm files invoke `pokemart MARTTYPE_*, MART_*` from an NPC clerk's
 *     script. The clerk is an `object_event` pointing at that script.
 *   - `data/items/bargain_shop.asm` holds the Goldenrod Underground bargain
 *     list (MARTTYPE_BARGAIN, passed with index 0).
 *
 * MARTTYPE_ROOFTOP uses a third format (rooftop_sale.asm) and is skipped.
 *
 * Gen1 layouts differ; returns [] and warns.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ParsedShop {
  map_name: string;
  shop_name: string;       // e.g. "Goldenrod Dept Store 2F Counter 1"
  mart_type: 'standard' | 'bitter' | 'pharmacy' | 'bargain';
  mart_constant: string;   // e.g. MART_GOLDENROD_2F_1 or BARGAIN for 0-index
  items: Array<{ item_name: string; price?: number }>;
  tile_x: number;
  tile_y: number;
}

export async function parseShopsFromPret(pretRoot: string): Promise<ParsedShop[]> {
  const mapsDir = join(pretRoot, 'maps');
  const constsFile = join(pretRoot, 'constants/mart_constants.asm');
  const martsFile = join(pretRoot, 'data/items/marts.asm');
  const bargainFile = join(pretRoot, 'data/items/bargain_shop.asm');
  if (!existsSync(mapsDir) || !existsSync(constsFile) || !existsSync(martsFile)) {
    console.warn(`[shop-parser] ${pretRoot}: missing gen2 shop files, skipping`);
    return [];
  }

  // 1. Build MART_* → items map.
  const martIndex = await buildMartIndex(constsFile, martsFile);
  const bargain = existsSync(bargainFile) ? await parseBargainShop(bargainFile) : [];

  const files = await readdir(mapsDir);
  const out: ParsedShop[] = [];
  for (const f of files) {
    if (!f.endsWith('.asm')) continue;
    const mapName = f.replace(/\.asm$/, '');
    const text = await readFile(join(mapsDir, f), 'utf-8');
    out.push(...parseOneMap(mapName, text, martIndex, bargain));
  }
  return out;
}

async function buildMartIndex(constsFile: string, martsFile: string): Promise<Map<string, string[]>> {
  const constsText = await readFile(constsFile, 'utf-8');
  const martConstants: string[] = [];
  let inConstDef = false;
  for (const rawLine of constsText.split('\n')) {
    const ln = rawLine.replace(/;.*$/, '').trim();
    if (/^const_def\b/.test(ln)) {
      // Reset the const_def only for the Marts index block (second occurrence).
      if (martConstants.length > 0) break;
      inConstDef = true;
      continue;
    }
    if (!inConstDef) continue;
    const m = ln.match(/^const\s+(MART_[A-Z0-9_]+)\b/);
    if (m) martConstants.push(m[1]);
  }

  const martsText = await readFile(martsFile, 'utf-8');
  // Parse `Marts:` table → ordered label list
  const martLabels: string[] = [];
  {
    const tableStart = martsText.indexOf('Marts:');
    if (tableStart < 0) return new Map();
    const after = martsText.slice(tableStart);
    const tableEnd = after.search(/\n\s*assert_table_length|\n[A-Za-z]+:\s*\n/);
    const block = tableEnd > 0 ? after.slice(0, tableEnd) : after;
    for (const rawLine of block.split('\n')) {
      const ln = rawLine.replace(/;.*$/, '').trim();
      const m = ln.match(/^dw\s+(Mart[A-Za-z0-9_]+)/);
      if (m) martLabels.push(m[1]);
    }
  }

  // Parse each Mart<X>: block → item list
  const items: Record<string, string[]> = {};
  const labelRe = /^(Mart[A-Za-z0-9_]+):\s*$/;
  const lines = martsText.split('\n');
  let currentLabel: string | null = null;
  for (const raw of lines) {
    const ln = raw.replace(/;.*$/, '');
    const m = ln.match(labelRe);
    if (m) {
      if (martLabels.includes(m[1])) {
        currentLabel = m[1];
        items[currentLabel] = [];
      } else {
        currentLabel = null;
      }
      continue;
    }
    if (!currentLabel) continue;
    const body = ln.trim();
    if (/^db\s+-1/.test(body)) { currentLabel = null; continue; }
    const it = body.match(/^db\s+([A-Z_][A-Z0-9_]*)\b/);
    if (it) items[currentLabel].push(it[1]);
  }

  const out = new Map<string, string[]>();
  for (let i = 0; i < martConstants.length && i < martLabels.length; i++) {
    out.set(martConstants[i], items[martLabels[i]] ?? []);
  }
  return out;
}

async function parseBargainShop(file: string): Promise<Array<{ item_name: string; price: number }>> {
  const text = await readFile(file, 'utf-8');
  const out: Array<{ item_name: string; price: number }> = [];
  for (const raw of text.split('\n')) {
    const ln = raw.replace(/;.*$/, '').trim();
    const m = ln.match(/^dbw\s+([A-Z_][A-Z0-9_]*)\s*,\s*(\d+)/);
    if (m) out.push({ item_name: m[1], price: parseInt(m[2], 10) });
  }
  return out;
}

function parseOneMap(
  mapName: string,
  text: string,
  martIndex: Map<string, string[]>,
  bargain: Array<{ item_name: string; price: number }>,
): ParsedShop[] {
  const lines = text.split('\n');

  // label → body slice (top-level only; dotted sub-labels stay inside)
  const bodies = new Map<string, string[]>();
  let currentLabel: string | null = null;
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*):\s*$/);
    if (!m) continue;
    if (currentLabel) bodies.set(currentLabel, lines.slice(bodyStart, i));
    currentLabel = m[1];
    bodyStart = i + 1;
  }
  if (currentLabel) bodies.set(currentLabel, lines.slice(bodyStart));

  // For each top-level label whose body contains `pokemart`, record the
  // mart type + constant (or 0 for bargain/rooftop).
  interface Hit { mart_type: ParsedShop['mart_type']; mart_key: string; }
  const labelToMart = new Map<string, Hit>();
  const pokemartRe = /^\s*pokemart\s+MARTTYPE_([A-Z]+)\s*,\s*([A-Z0-9_]+)/;
  for (const [label, body] of bodies) {
    for (const raw of body) {
      const ln = raw.replace(/;.*$/, '');
      const m = ln.match(pokemartRe);
      if (!m) continue;
      const typeStr = m[1].toLowerCase();
      const keyRaw = m[2];
      if (typeStr === 'rooftop') continue;           // skip: separate format
      let mart_type: ParsedShop['mart_type'];
      if (typeStr === 'bargain') mart_type = 'bargain';
      else if (typeStr === 'pharmacy') mart_type = 'pharmacy';
      else if (typeStr === 'bitter') mart_type = 'bitter';
      else if (typeStr === 'standard') mart_type = 'standard';
      else continue;
      labelToMart.set(label, { mart_type, mart_key: keyRaw });
      break;
    }
  }
  if (labelToMart.size === 0) return [];

  // Attach object_event coords by matching script label.
  const out: ParsedShop[] = [];
  const objRe = /^\s*object_event\s+(-?\d+),\s*(-?\d+),\s*[A-Z0-9_]+,\s*[A-Z0-9_]+,\s*\d+,\s*\d+,\s*-?\d+,\s*-?\d+,\s*[A-Z0-9_]+,\s*OBJECTTYPE_[A-Z_]+,\s*\d+,\s*([A-Za-z][A-Za-z0-9_]*)/gm;
  let m;
  const emitted = new Set<string>();
  while ((m = objRe.exec(text)) != null) {
    const x = parseInt(m[1], 10);
    const y = parseInt(m[2], 10);
    const label = m[3];
    const hit = labelToMart.get(label);
    if (!hit) continue;
    const key = `${hit.mart_type}:${hit.mart_key}:${x}:${y}`;
    if (emitted.has(key)) continue;
    emitted.add(key);

    let items: ParsedShop['items'];
    if (hit.mart_type === 'bargain') {
      items = bargain.map(b => ({ item_name: b.item_name, price: b.price }));
    } else {
      const list = martIndex.get(hit.mart_key) ?? [];
      items = list.map(name => ({ item_name: name }));
    }
    if (items.length === 0) continue;
    out.push({
      map_name: mapName,
      shop_name: prettyShopName(mapName, hit.mart_key, labelToMart.size > 1),
      mart_type: hit.mart_type,
      mart_constant: hit.mart_key,
      items,
      tile_x: x,
      tile_y: y,
    });
  }
  return out;
}

function prettyShopName(mapName: string, martKey: string, disambiguate: boolean): string {
  const base = mapName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([0-9])/g, '$1 $2')
    .trim();
  if (!disambiguate) return base;
  // Append trailing _<number> from the mart constant to distinguish floors/counters
  const tail = martKey.match(/_(\d+F_\d+|\d+)$/);
  return tail ? `${base} (${tail[1].replace('_', ' ')})` : `${base} (${martKey})`;
}
