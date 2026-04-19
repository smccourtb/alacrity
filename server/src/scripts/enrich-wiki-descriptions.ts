/**
 * enrich-wiki-descriptions.ts
 *
 * Fills in missing item/TM descriptions in region seed JSON from Bulbapedia.
 * Reads the Items section of each location's wiki page, parses the {{Itemlist}}
 * + {{TM}} templates, and matches entries by item_name (for items) or tm_number
 * (for TMs). Only overwrites existing descriptions if --overwrite is passed.
 *
 * Usage:
 *   cd server && bunx tsx src/scripts/enrich-wiki-descriptions.ts [--overwrite] [--region johto]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { getPageSections, getSectionWikitext } from '../services/mediawiki.js';
import { LOCATION_TO_PAGES } from './wiki-pages.js';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const SEED_DIR = join(SCRIPT_DIR, '../seeds/data');

const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');
const regionArg = args[args.indexOf('--region') + 1];
const REGION_FILES = [
  { file: 'kanto-gen1.json', region: 'kanto' },
  { file: 'johto-gen2.json', region: 'johto' },
].filter(r => !regionArg || r.region === regionArg);

const DOTW_MAP: Record<string, string> = {
  Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday',
  Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
};
const GAME_FLAG_MAP: Record<string, string> = {
  R: 'red', B: 'blue', Y: 'yellow',
  G: 'gold', S: 'silver', C: 'crystal',
  HG: 'heartgold', SS: 'soulsilver',
  FR: 'firered', LG: 'leafgreen',
};

function cleanWikiText(s: string): string {
  return s
    .replace(/\{\{sup\/\d+\|[^}]+\}\}/g, '')
    .replace(/\{\{badge\|([^}]+)\}\}/gi, '$1 Badge')
    .replace(/\{\{dotw\|([A-Za-z]+)\}\}/g, (_, d) => ` (${DOTW_MAP[d] ?? d})`)
    .replace(/\{\{rt\|(\d+)\|[^}]+\}\}/g, 'Route $1')
    .replace(/\{\{TM\|(\d+)\|([^}|]+)\}\}/g, (_, n, name) => `TM${n.padStart(2, '0')} ${name}`)
    .replace(/\{\{HM\|(\d+)\|([^}|]+)\}\}/g, (_, n, name) => `HM${n.padStart(2, '0')} ${name}`)
    .replace(/\{\{(?:p|m|i|type|ga|tc)\|([^}|]+)\|?[^}]*\}\}/g, '$1')
    .replace(/\{\{OBP\|([^}|]+)\|[^}]+\}\}/g, '$1')
    .replace(/\{\{DL\|[^|]+\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{player\}\}/gi, 'player')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,5}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, buf = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], c2 = s[i + 1];
    if ((c === '{' && c2 === '{') || (c === '[' && c2 === '[')) { depth++; buf += c + c2; i++; continue; }
    if ((c === '}' && c2 === '}') || (c === ']' && c2 === ']')) { depth--; buf += c + c2; i++; continue; }
    if (c === '|' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts;
}

interface ParsedItem { name: string; desc: string; games: Set<string>; }

function parseItemlistLines(raw: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\{\{Itemlist\|(.+)\}\}\s*$/);
    if (!m) continue;
    const parts = splitTopLevel(m[1]);
    const first = parts[0]?.trim() ?? '';
    const descRaw = parts[1] ?? '';
    const kv: Record<string, string> = {};
    for (const p of parts.slice(2)) {
      const eq = p.indexOf('=');
      if (eq > 0) kv[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
    }
    let name = first;
    if (first.toLowerCase() === 'none' && kv.display) name = cleanWikiText(kv.display);
    else if (kv.display) name = cleanWikiText(kv.display);
    else name = cleanWikiText(first);
    const games = new Set<string>();
    for (const key of Object.keys(kv)) {
      if (GAME_FLAG_MAP[key] && kv[key].toLowerCase() === 'yes') games.add(GAME_FLAG_MAP[key]);
    }
    out.push({ name, desc: cleanWikiText(descRaw), games });
  }
  return out;
}

function tmNumberFromName(name: string): number | null {
  const m = name.match(/^TM0*(\d+)\b/);
  return m ? Number(m[1]) : null;
}

function gamesOverlap(a: string[] | undefined, b: Set<string>): boolean {
  if (!a || a.length === 0) return true;
  return a.some(g => b.has(g));
}

function pickItemMatch(parsed: ParsedItem[], itemName: string, itemGames: string[] | undefined): ParsedItem | null {
  const candidates = parsed.filter(p => p.name.toLowerCase() === itemName.toLowerCase());
  if (candidates.length === 0) return null;
  return candidates.find(c => gamesOverlap(itemGames, c.games)) ?? candidates[0];
}

function pickTmMatch(parsed: ParsedItem[], tmNumber: number, tmGames: string[] | undefined): ParsedItem | null {
  const candidates = parsed.filter(p => tmNumberFromName(p.name) === tmNumber);
  if (candidates.length === 0) return null;
  return candidates.find(c => gamesOverlap(tmGames, c.games)) ?? candidates[0];
}

// Kanto uses tm_number like "TM42" (string); Johto uses the integer 42. Normalize.
function normalizeTmNumber(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/^TM0*(\d+)$/i);
    if (m) return Number(m[1]);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function enrichLocation(locKey: string, loc: any): Promise<{ filled: number; skipped: number; missing: string[] }> {
  const pages = LOCATION_TO_PAGES[locKey];
  if (!pages || pages.length === 0) return { filled: 0, skipped: 0, missing: [] };
  const pageTitle = pages[0];

  let sections;
  try {
    sections = await getPageSections(pageTitle);
  } catch (err) {
    console.warn(`  [${locKey}] failed to fetch sections: ${(err as Error).message}`);
    return { filled: 0, skipped: 0, missing: [] };
  }

  const itemsSec = sections.find(s => /^items$/i.test(s.title));
  if (!itemsSec) return { filled: 0, skipped: 0, missing: [] };

  let parsed: ParsedItem[];
  try {
    const raw = await getSectionWikitext(pageTitle, itemsSec.index);
    parsed = parseItemlistLines(raw);
  } catch (err) {
    console.warn(`  [${locKey}] failed to fetch wikitext: ${(err as Error).message}`);
    return { filled: 0, skipped: 0, missing: [] };
  }

  let filled = 0, skipped = 0;
  const missing: string[] = [];

  for (const item of loc.items ?? []) {
    const hasDesc = typeof item.description === 'string' && item.description.trim().length > 0;
    if (hasDesc && !overwrite) { skipped++; continue; }
    const match = pickItemMatch(parsed, item.item_name, item.games);
    if (!match) { missing.push(`item:${item.item_name}`); continue; }
    if (match.desc === item.description) { skipped++; continue; }
    item.description = match.desc;
    filled++;
  }

  for (const tm of loc.tms ?? []) {
    const existing = (typeof tm.description === 'string' && tm.description.trim())
      || (typeof tm.requirements === 'string' && tm.requirements.trim());
    if (existing && !overwrite) { skipped++; continue; }
    const tmNum = normalizeTmNumber(tm.tm_number);
    if (tmNum == null) { skipped++; continue; }
    const match = pickTmMatch(parsed, tmNum, tm.games);
    if (!match) { missing.push(`tm:TM${String(tmNum).padStart(2, '0')}`); continue; }
    if (match.desc === tm.description) { skipped++; continue; }
    tm.description = match.desc;
    filled++;
  }

  return { filled, skipped, missing };
}

async function main() {
  console.log(`Mode: ${overwrite ? 'OVERWRITE existing descriptions' : 'fill-empty only'}`);
  console.log(`Regions: ${REGION_FILES.map(r => r.region).join(', ')}\n`);

  let totalFilled = 0, totalSkipped = 0, totalMissing: string[] = [];

  for (const { file, region } of REGION_FILES) {
    const filePath = join(SEED_DIR, file);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`=== ${region} (${file}) ===`);

    for (const [locKey, loc] of Object.entries(data.locations ?? {})) {
      const result = await enrichLocation(locKey, loc);
      if (result.filled > 0 || result.missing.length > 0) {
        console.log(`  ${locKey}: ${result.filled} filled, ${result.skipped} skipped${result.missing.length ? `, missing: ${result.missing.join(', ')}` : ''}`);
      }
      totalFilled += result.filled;
      totalSkipped += result.skipped;
      totalMissing.push(...result.missing.map(m => `${region}/${locKey}/${m}`));
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`  → wrote ${file}\n`);
  }

  console.log(`\nTotals: ${totalFilled} filled, ${totalSkipped} skipped, ${totalMissing.length} not found on wiki`);
  if (totalMissing.length > 0 && totalMissing.length <= 30) {
    console.log('Missing entries:');
    for (const m of totalMissing) console.log(`  ${m}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
