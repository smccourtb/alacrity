/**
 * Fetches the complete marks catalog from Bulbapedia and writes it to
 * seeds/data/marks-catalog.json. Subsequent seed run merges this with the
 * existing `marks` table — keeping IDs stable for marks already present,
 * inserting new ones with auto-incremented IDs.
 *
 * The plan originally targeted a "List of marks" page that does not exist
 * on Bulbapedia. The canonical page is "Mark", which has two "List of marks"
 * sections (one per generation introduced) inside §"Generation VIII" and
 * §"Generation IX". Each is a single wikitable; categories are not encoded
 * as sub-headings, so we infer them from the mark name.
 *
 * Run: bun run server/src/scripts/fetch-marks-catalog.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPageSections, getSectionWikitext } from '../services/mediawiki.js';

interface MarkEntry {
  name: string;          // 'Lunchtime Mark'
  category: string;      // 'Time' | 'Weather' | 'Personality' | 'Rare' | 'Mightiest'
  title_suffix: string;  // 'the Peckish'
  games: string[];       // ['sword','shield','scarlet','violet','legends-arceus']
  how_to_obtain: string;
}

// Manual category overrides for marks that don't fit the heuristic.
// Default category is 'Personality' for anything not matched here.
const CATEGORY_TIME = new Set(['Lunchtime Mark', 'Sleepy-Time Mark', 'Dusk Mark', 'Dawn Mark']);
const CATEGORY_WEATHER = new Set([
  'Cloudy Mark', 'Rainy Mark', 'Stormy Mark', 'Snowy Mark', 'Blizzard Mark',
  'Dry Mark', 'Sandstorm Mark', 'Misty Mark',
]);
const CATEGORY_RARE = new Set([
  'Uncommon Mark', 'Rare Mark', 'Destiny Mark', 'Fishing Mark', 'Curry Mark',
  'Jumbo Mark', 'Mini Mark', 'Boosted Mark', 'Itemfinder Mark', 'Partner Mark',
  'Gourmand Mark',
]);
const CATEGORY_MIGHTIEST = new Set(['Mightiest Mark', 'Titan Mark', 'Alpha Mark']);

function classify(name: string): string {
  if (CATEGORY_TIME.has(name)) return 'Time';
  if (CATEGORY_WEATHER.has(name)) return 'Weather';
  if (CATEGORY_MIGHTIEST.has(name)) return 'Mightiest';
  if (CATEGORY_RARE.has(name)) return 'Rare';
  return 'Personality';
}

// Strip Japanese name (after first <br>) and trim.
function stripJa(s: string): string {
  return s.split(/<br\s*\/?>/i)[0].trim();
}

// Pull the first non-trivial sentence out of a wikitable cell describing
// how the mark is obtained. Drops Japanese, templates, and small tags.
function cleanHowTo(cell: string): string {
  let s = cell;
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<small>[^<]*<\/small>/gi, '');
  s = s.replace(/<ref[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<ref[^/]*\/>/gi, '');
  // [[Page#Anchor|display]] -> display ; [[Page]] -> Page
  s = s.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // {{tt|text|tip}} -> text
  s = s.replace(/\{\{tt\|([^|}]+)\|[^}]*\}\}/g, '$1');
  // {{weather|key|display}} -> display ; {{weather|key}} -> key
  s = s.replace(/\{\{weather\|[^|}]+\|([^}]+)\}\}/gi, '$1');
  s = s.replace(/\{\{weather\|([^}]+)\}\}/gi, '$1');
  // {{pkmn|Name}} / {{g|Name}} / {{game|Name}} -> Name (with optional display arg variants)
  s = s.replace(/\{\{(?:pkmn|g|game2?)\|[^|}]+\|[^|}]+\|([^}]+)\}\}/gi, '$1');
  s = s.replace(/\{\{(?:pkmn|g|game2?)\|([^|}]+)(?:\|[^}]+)?\}\}/gi, '$1');
  // Bare game-abbreviation templates: {{LA}}, {{SwSh}}, {{BDSP}}, {{SV}}, {{PLA}} -> the abbr itself
  s = s.replace(/\{\{(LA|SwSh|BDSP|SV|PLA)\}\}/g, '$1');
  // Drop any other template entirely (iterate to fixed point for nested templates)
  let prev: string;
  do { prev = s; s = s.replace(/\{\{[^{}]*\}\}/g, ''); } while (s !== prev);
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Parse one §"List of marks" wikitext into entries (name -> partial entry).
function parseListSection(wt: string): Map<string, { titleSuffix: string; how: string }> {
  const out = new Map<string, { titleSuffix: string; how: string }>();
  const rows = wt.split(/\n\|-/).slice(1);
  for (const row of rows) {
    // Cells in a wikitable row are lines starting with `| ` (one cell per line
    // in this page's formatting). We split on lines and pick the cells we want.
    const cells = row.split(/\n\| /).slice(1).map((c) => c.replace(/^\|\s*/, ''));
    if (cells.length < 6) continue;

    // Cell layout (1-indexed in wiki, but here 0-indexed after slicing the
    // leading index/image/...):
    //   0: index number
    //   1: image
    //   2: name (with <br>JapaneseName)
    //   3: title (with <br>JapaneseTitle)
    //   4: description
    //   5: conditions / how to obtain
    const nameRaw = cells[2];
    const titleRaw = cells[3];
    const condRaw = cells[5];

    const name = stripJa(nameRaw);
    if (!/ Mark$/.test(name)) continue;

    const titleSuffix = stripJa(titleRaw);
    const how = cleanHowTo(condRaw);

    if (!out.has(name)) {
      out.set(name, { titleSuffix, how });
    }
  }
  return out;
}

async function main() {
  const sections = await getPageSections('Mark');

  // Find the two §"List of marks" sections — one inside Gen VIII, one inside Gen IX.
  const listSections = sections.filter((s) => s.title === 'List of marks');
  if (listSections.length < 2) {
    throw new Error(
      `Expected at least 2 "List of marks" sections on Mark page, got ${listSections.length}`,
    );
  }
  // Order on the page is Gen VIII first, then Gen IX.
  const [gen8Sec, gen9Sec] = listSections;

  const gen8 = parseListSection(await getSectionWikitext('Mark', gen8Sec.index));
  const gen9 = parseListSection(await getSectionWikitext('Mark', gen9Sec.index));

  const allNames = new Set<string>([...gen8.keys(), ...gen9.keys()]);
  const out: MarkEntry[] = [];

  for (const name of allNames) {
    const g8 = gen8.get(name);
    const g9 = gen9.get(name);
    const games: string[] = [];
    if (g8) {
      games.push('sword', 'shield');
    }
    if (g9) {
      games.push('scarlet', 'violet');
    }
    // Alpha Mark originated in Legends: Arceus and is recognised in Gen IX.
    if (name === 'Alpha Mark') {
      if (!games.includes('legends-arceus')) games.unshift('legends-arceus');
    }

    // Prefer Gen IX text where present (more recent / canonical), else Gen VIII.
    const src = g9 ?? g8!;

    out.push({
      name,
      category: classify(name),
      title_suffix: src.titleSuffix,
      games,
      how_to_obtain: src.how,
    });
  }

  // Stable sort: category order, then by name within category.
  const catOrder = ['Time', 'Weather', 'Personality', 'Rare', 'Mightiest'];
  out.sort((a, b) => {
    const ca = catOrder.indexOf(a.category);
    const cb = catOrder.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  const path = join(import.meta.dir, '..', 'seeds', 'data', 'marks-catalog.json');
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${out.length} marks to ${path}`);

  // Sanity: per-category counts
  const byCat = out.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + 1;
    return acc;
  }, {});
  for (const cat of catOrder) {
    if (byCat[cat]) console.log(`  ${cat}: ${byCat[cat]}`);
  }
}

await main();
