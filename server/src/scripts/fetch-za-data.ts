/**
 * Fetches Legends Z-A specific data:
 *   - Lumiose / Z-A regional dex (via PokeAPI's `lumiose-city` pokedex, id 34).
 *   - New Mega Evolutions introduced or returning in Z-A (via Bulbapedia
 *     "Mega Evolution" page, Z-A section).
 *   - Origin-mark image (saved to client/src/assets/sprites/origin-marks/lumiose.png).
 *
 * Output: server/src/seeds/data/legends-za.json with shape:
 *   { dex: [{ species_id, dex_number, name }],
 *     new_megas: [{ species_id, name, form_name }],
 *     origin_mark: { source_url, saved: boolean } }
 *
 * Deviations from the original plan:
 *   - The plan suggested scraping Bulbapedia for the regional dex. PokeAPI
 *     already exposes the Lumiose dex as the `lumiose-city` slug (id 34) with
 *     232 entries, so we use that directly — much more reliable than parsing
 *     wikitext, and consistent with sibling fetcher fetch-gen8-9-reference.ts.
 *   - The plan's snippet referenced `sec.line`; the local WikiSection type
 *     exposes the heading as `title`. Adjusted accordingly.
 *
 * Run: bun run server/src/scripts/fetch-za-data.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getPageSections, getSectionWikitext } from '../services/mediawiki.js';

const POKEAPI = 'https://pokeapi.co/api/v2';
const ROOT = join(import.meta.dir, '..', '..', '..');
const OUT_JSON = join(import.meta.dir, '..', 'seeds', 'data', 'legends-za.json');
const OUT_MARK = join(ROOT, 'client', 'src', 'assets', 'sprites', 'origin-marks', 'lumiose.png');

interface DexEntry { species_id: number; dex_number: number; name: string; }
interface MegaEntry { species_id: number; name: string; form_name: string; }

// PokeAPI species-name slugify quirks. Used only when going from a
// human-readable Bulbapedia name to a PokeAPI slug (mega list).
function slugify(name: string): string {
  const special: Record<string, string> = {
    'Nidoran♀': 'nidoran-f',
    'Nidoran♂': 'nidoran-m',
    'Mr. Mime': 'mr-mime',
    'Mr. Rime': 'mr-rime',
    'Mime Jr.': 'mime-jr',
    "Farfetch'd": 'farfetchd',
    "Sirfetch'd": 'sirfetchd',
    'Ho-Oh': 'ho-oh',
    'Type: Null': 'type-null',
    'Tapu Koko': 'tapu-koko',
    'Tapu Lele': 'tapu-lele',
    'Tapu Bulu': 'tapu-bulu',
    'Tapu Fini': 'tapu-fini',
    'Flabébé': 'flabebe',
    'Porygon-Z': 'porygon-z',
    'Porygon2': 'porygon2',
  };
  if (special[name]) return special[name];
  return name
    .toLowerCase()
    .replace(/[♀]/g, '-f')
    .replace(/[♂]/g, '-m')
    .replace(/[éè]/g, 'e')
    .replace(/['.:]/g, '')
    .replace(/\s+/g, '-');
}

async function fetchDex(): Promise<DexEntry[]> {
  console.log('  fetching pokedex/lumiose-city');
  const r = await fetch(`${POKEAPI}/pokedex/lumiose-city`);
  if (!r.ok) throw new Error(`PokeAPI /pokedex/lumiose-city → ${r.status}`);
  const j = (await r.json()) as any;
  const out: DexEntry[] = j.pokemon_entries
    .map((e: any) => {
      const id = Number(e.pokemon_species.url.match(/\/pokemon-species\/(\d+)\//)?.[1]);
      return {
        species_id: id,
        dex_number: e.entry_number,
        name: e.pokemon_species.name as string,
      };
    })
    .filter((e: DexEntry) => Number.isFinite(e.species_id));
  if (out.length === 0) throw new Error('Lumiose dex returned 0 entries');
  return out;
}

async function fetchNewMegas(): Promise<MegaEntry[]> {
  const candidates = ['Mega Evolution', 'Mega Evolution (Pokémon Legends: Z-A)'];
  for (const candidate of candidates) {
    let sections;
    try {
      sections = await getPageSections(candidate);
    } catch (err) {
      console.warn(`[za] could not fetch sections for "${candidate}": ${(err as Error).message}`);
      continue;
    }
    const za = sections.find((s) => /Z-?A|Legends Z/i.test(s.title));
    if (!za) {
      console.warn(`[za] no Z-A section on "${candidate}"`);
      continue;
    }
    console.log(`  using "${candidate}" §${za.index} (${za.title})`);
    const wt = await getSectionWikitext(candidate, za.index);
    const out: MegaEntry[] = [];
    const failures: string[] = [];
    const matches = wt.matchAll(/\{\{p\|([A-Za-z'.: \-é♀♂]+)\}\}/g);
    const seen = new Set<number>();
    for (const m of matches) {
      const name = m[1].trim();
      const slug = slugify(name);
      const r = await fetch(`${POKEAPI}/pokemon-species/${slug}`);
      if (!r.ok) {
        failures.push(`${name} (${slug}) → ${r.status}`);
        continue;
      }
      const j = (await r.json()) as any;
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      out.push({ species_id: j.id, name, form_name: `Mega ${name}` });
    }
    if (failures.length > 0) {
      console.warn(`[za] mega slug failures (${failures.length}):`);
      for (const f of failures) console.warn(`    - ${f}`);
    }
    return out;
  }
  console.warn('[za] no Z-A mega evolution section found on any candidate page');
  return [];
}

async function fetchOriginMark(): Promise<{ source_url: string; saved: boolean }> {
  let sections;
  try {
    sections = await getPageSections('Origin mark');
  } catch (err) {
    console.warn(`[za] origin-mark page fetch failed: ${(err as Error).message}`);
    return { source_url: '', saved: false };
  }
  const lumiose = sections.find((s) => /Lumiose|Legends Z|Z-?A/i.test(s.title));
  // If no dedicated section, the marks may be inline on the top-level page;
  // grab section 0 as a fallback.
  const sectionIndex = lumiose?.index ?? '0';
  const wt = await getSectionWikitext('Origin mark', sectionIndex);
  // Prefer file links that mention "Lumiose" or "Z-A" by name.
  const named = wt.match(/\[\[File:([^|\]]*(?:Lumiose|Z-?A)[^|\]]*\.png)/i);
  const generic = wt.match(/\[\[File:(Origin mark[^|\]]*\.png)/i);
  const img = named?.[1] ?? generic?.[1];
  if (!img) {
    console.warn(`[za] no origin-mark image found on Bulbapedia (section ${sectionIndex})`);
    return { source_url: '', saved: false };
  }
  const url = `https://bulbapedia.bulbagarden.net/wiki/Special:Filepath/${encodeURIComponent(img)}`;
  console.log(`  fetching origin mark image: ${img}`);
  const r = await fetch(url);
  if (!r.ok) {
    console.warn(`[za] origin-mark fetch failed (${r.status}); skipping image save`);
    return { source_url: url, saved: false };
  }
  mkdirSync(dirname(OUT_MARK), { recursive: true });
  const buf = new Uint8Array(await r.arrayBuffer());
  writeFileSync(OUT_MARK, buf);
  return { source_url: url, saved: true };
}

async function main() {
  console.log('[za] fetching regional dex…');
  const dex = await fetchDex();
  console.log(`[za] dex: ${dex.length} entries`);

  console.log('[za] fetching new megas…');
  const new_megas = await fetchNewMegas();
  console.log(`[za] new megas: ${new_megas.length} entries`);

  console.log('[za] fetching origin mark image…');
  const origin_mark = await fetchOriginMark();
  console.log(`[za] origin mark: ${origin_mark.saved ? 'saved' : 'NOT saved (will render no badge)'}`);

  writeFileSync(OUT_JSON, JSON.stringify({ dex, new_megas, origin_mark }, null, 2) + '\n');
  console.log(`Wrote ${OUT_JSON}`);
}

await main();
