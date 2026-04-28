/**
 * fetch-alpha-list.ts
 *
 * Fetches the complete list of alpha Pokémon from the Bulbapedia "Alpha Pokémon" page.
 *
 * Strategy:
 *  1. Fetch the full page section list to find every section.
 *  2. Fetch ALL section wikitexts to ensure comprehensive coverage.
 *  3. Restrict extraction to sections inside the "Fixed alpha Pokémon" parent section
 *     (section index 5 in the current page), which includes all area subsections
 *     (Obsidian Fieldlands, Crimson Mirelands, etc.), the unique alpha table, and the
 *     Z-A fixed alpha tables.  This parent section wikitext from the MediaWiki API
 *     already contains all child sections in a single response.
 *  4. For robustness, we also scan any other level-2 sections whose title matches
 *     alpha-table patterns (in case Bulbapedia reorganises the page).
 *  5. Explicitly skip prose sections (intro, gameplay, animation, trivia, other-languages)
 *     to avoid false positives like Wyrdeer (ride Pokémon), Arceus (category namesake),
 *     Giratina (story boss), etc.
 *
 * NOTE: Kleavor, Lilligant, Arcanine (Hisui), Electrode (Hisui), Wyrdeer, Ursaluna,
 * Sneasler, and Basculegion are NOT alpha Pokémon. They are Noble Pokémon / Ride Pokémon
 * — distinct mechanics in Legends: Arceus. They do not appear anywhere in the Fixed alpha
 * tables and therefore are correctly absent from this list.
 */

import { getSectionWikitext, getPageSections } from '../server/src/services/mediawiki.ts';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const OUT_PATH = join(SCRIPT_DIR, '../server/src/seeds/data/meta/alpha-species.json');

const PAGE = 'Alpha Pokémon';

console.error(`Fetching section list for: ${PAGE}`);
const sections = await getPageSections(PAGE);

// Section title patterns that are purely prose — skip these to avoid false positives.
const SKIP_PATTERNS = [
  /In the core series games/i,
  /Gameplay/i,
  /Legends: Arceus$/, // The narrative/gameplay section under "In the core series games"
  /Legends: Z-A$/,   // Same for Z-A narrative
  /In animation/i,
  /Hisuian Snow/i,
  /Trivia/i,
  /Origin/i,
  /In other languages/i,
  /Related articles/i,
];

// Identify the "Fixed alpha Pokémon" parent section — this is the authoritative source.
// The MediaWiki API returns its entire subtree (all child sections) in a single wikitext
// response, so one fetch covers all area tables + unique alpha tables for both games.
const fixedAlphaSection = sections.find(s => /Fixed alpha/i.test(s.title));
if (!fixedAlphaSection) {
  throw new Error(
    `Could not locate "Fixed alpha Pokémon" section on "${PAGE}". ` +
    `Available sections: ${sections.map(s => s.title).join(', ')}`
  );
}

console.error(`Found "Fixed alpha Pokémon" at section index ${fixedAlphaSection.index}`);

// Fetch this section's wikitext (includes all child sections automatically).
const wikitexts: string[] = [];
wikitexts.push(await getSectionWikitext(PAGE, fixedAlphaSection.index));

// Also fetch any additional top-level sections with alpha-table titles, in case the page
// gains new sections in the future (e.g., a separate "Random alpha Pokémon" table).
const ALPHA_TABLE_PATTERNS = [/alpha Pokémon/i, /Unique alpha/i];
for (const s of sections) {
  if (s.index === fixedAlphaSection.index) continue;
  if (SKIP_PATTERNS.some(p => p.test(s.title))) continue;
  if (ALPHA_TABLE_PATTERNS.some(p => p.test(s.title))) {
    console.error(`  Also fetching section "${s.title}" (index ${s.index})`);
    wikitexts.push(await getSectionWikitext(PAGE, s.index));
  }
}

const combinedWikitext = wikitexts.join('\n');

// Extract {{p|Name}} templates. Handles {{p|Name}} and {{p|Name|display text}}.
const seen = new Set<string>();
const out: { name: string }[] = [];

for (const m of combinedWikitext.matchAll(/\{\{p\|([^}|]+)(?:\|[^}]*)?\}\}/g)) {
  const name = m[1].trim();
  if (!seen.has(name)) {
    seen.add(name);
    out.push({ name });
  }
}

console.error(`Extracted ${out.length} unique alpha species names.`);
console.error(`Writing to: ${OUT_PATH}`);

writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8');
