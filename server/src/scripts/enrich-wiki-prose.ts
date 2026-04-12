/**
 * enrich-wiki-prose.ts
 *
 * Fetches Bulbapedia walkthrough content for all Kanto locations,
 * converts to markdown, extracts callouts, and stores in the DB.
 *
 * Usage: cd server && npx tsx src/scripts/enrich-wiki-prose.ts
 * Options:
 *   --force              Overwrite existing prose (default: skip)
 *   --location <key>     Process a single location (e.g. --location pallet-town)
 */

import db from '../db.js';
import { runMigrations } from '../migrate.js';
import { LOCATION_TO_PAGES } from './wiki-pages.js';
import { getPageSections, getSectionWikitext, wikitextToMarkdown } from '../services/mediawiki.js';
import { extractCallouts } from './callout-extractor.js';

// --- Section detection ---

const WALKTHROUGH_SECTION_PATTERNS = [
  /walkthrough/i,
  /description/i,
  /route description/i,
  /places of interest/i,
  /demographics/i,
  /strategy/i,
  /puzzle/i,
  /layout/i,
  /overview/i,
  // Floor/area patterns
  /\b\d+F\b/i,
  /\bB\d+F\b/i,
  /\bbasement\b/i,
  /\broof\b/i,
  /\bentrance\b/i,
  /\binterior\b/i,
];

const EXCLUDED_SECTION_PATTERNS = [
  /generation\s+(?:II|III|IV|V|VI|VII|VIII|IX)/i,
  /differences among/i,
  /trivia/i,
  /in other/i,
  /external links/i,
  /references/i,
  /see also/i,
];

function isRelevantSection(title: string): boolean {
  if (EXCLUDED_SECTION_PATTERNS.some((pat) => pat.test(title))) return false;
  return WALKTHROUGH_SECTION_PATTERNS.some((pat) => pat.test(title));
}

/**
 * Filter out paragraphs about other generations.
 * Removes sentences/paragraphs that start with "In Generation(s) II/III/IV/V/VI/VII/VIII/IX"
 * or reference FireRed/LeafGreen/HeartGold/SoulSilver/Let's Go/etc.
 */
function filterToGen1(prose: string): string {
  const NON_GEN1_PATTERNS = [
    /^.*\bGeneration(?:s)?\s+(?:II|III|IV|V|VI|VII|VIII|IX)\b.*$/gim,
    /^.*\b(?:FireRed|LeafGreen|HeartGold|SoulSilver|Let's Go|Brilliant Diamond|Shining Pearl)\b.*$/gim,
    /^.*\bIn\s+(?:Generation(?:s)?)\s+(?:II|III|IV|V|VI|VII|VIII|IX)\b.*$/gim,
  ];

  let filtered = prose;
  for (const pat of NON_GEN1_PATTERNS) {
    filtered = filtered.replace(pat, '');
  }

  // Collapse resulting blank lines
  filtered = filtered.replace(/\n{3,}/g, '\n\n');
  return filtered.trim();
}

// --- Processing ---

interface LocationRow {
  id: number;
  location_key: string;
}

async function fetchLocationProse(
  locationKey: string
): Promise<string | null> {
  const pages = LOCATION_TO_PAGES[locationKey];
  if (!pages || pages.length === 0) return null;

  const allMarkdown: string[] = [];

  for (const pageTitle of pages) {
    try {
      const sections = await getPageSections(pageTitle);
      const relevant = sections.filter((s) => isRelevantSection(s.title));

      let wikitextParts: string[] = [];

      if (relevant.length > 0) {
        for (const section of relevant) {
          const wikitext = await getSectionWikitext(pageTitle, section.index);
          if (wikitext.trim()) wikitextParts.push(wikitext);
        }
      } else {
        const wikitext = await getSectionWikitext(pageTitle, '0');
        if (wikitext.trim()) wikitextParts.push(wikitext);
      }

      for (const wt of wikitextParts) {
        const md = wikitextToMarkdown(wt);
        if (md.trim()) allMarkdown.push(md);
      }
    } catch (err) {
      console.error(`  WARNING: Failed to fetch page "${pageTitle}" for ${locationKey}:`, err);
    }
  }

  return allMarkdown.length > 0 ? allMarkdown.join('\n\n') : null;
}

async function processLocation(
  locId: number,
  locationKey: string,
  games: string[],
  force: boolean
): Promise<{ skipped: boolean; error?: string }> {
  // Check if already enriched (unless --force)
  if (!force) {
    const existing = db
      .prepare('SELECT COUNT(*) as c FROM location_wiki WHERE location_id = ?')
      .get(locId) as { c: number };
    if (existing.c > 0) {
      return { skipped: true };
    }
  }

  const rawProse = await fetchLocationProse(locationKey);
  if (!rawProse) {
    return { skipped: false, error: `No wiki page mapping or content for: ${locationKey}` };
  }

  // Filter out non-Gen 1 content
  const prose = filterToGen1(rawProse);

  const callouts = extractCallouts(prose);
  const calloutsJson = JSON.stringify(callouts);

  const upsert = db.prepare(`
    INSERT INTO location_wiki (location_id, game, wiki_prose, wiki_callouts)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(location_id, game) DO UPDATE SET
      wiki_prose = excluded.wiki_prose,
      wiki_callouts = excluded.wiki_callouts
  `);

  for (const game of games) {
    upsert.run(locId, game, prose, calloutsJson);
  }

  return { skipped: false };
}

// --- Main ---

async function main() {
  // Parse CLI flags
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const locationFlagIdx = args.indexOf('--location');
  const singleLocation = locationFlagIdx !== -1 ? args[locationFlagIdx + 1] : null;

  // Ensure wiki columns exist
  runMigrations(db);

  // Get kanto map ID
  const kantoMap = db
    .prepare("SELECT id FROM game_maps WHERE map_key = 'kanto'")
    .get() as { id: number } | undefined;

  if (!kantoMap) {
    console.error('FATAL: No game_maps row with map_key = "kanto" found.');
    process.exit(1);
  }

  const kantoMapId = kantoMap.id;
  const regionGames = ['red', 'blue', 'yellow'];

  // Query locations
  let locations: LocationRow[];

  if (singleLocation) {
    locations = db
      .prepare(
        'SELECT id, location_key FROM map_locations WHERE map_id = ? AND location_key = ?'
      )
      .all(kantoMapId, singleLocation) as LocationRow[];

    if (locations.length === 0) {
      console.error(`FATAL: No map_location found with location_key = "${singleLocation}" in kanto.`);
      process.exit(1);
    }
  } else {
    locations = db
      .prepare(
        'SELECT id, location_key FROM map_locations WHERE map_id = ? ORDER BY progression_order'
      )
      .all(kantoMapId) as LocationRow[];
  }

  console.log(
    `Processing ${locations.length} location(s)${force ? ' (force mode)' : ''}...`
  );

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const loc of locations) {
    process.stdout.write(`[${loc.location_key}] `);

    try {
      const result = await processLocation(loc.id, loc.location_key, regionGames, force);

      if (result.skipped) {
        console.log('skipped (already has prose)');
        skipped++;
      } else if (result.error) {
        console.log(`warning: ${result.error}`);
        errors++;
      } else {
        console.log('done');
        processed++;
      }
    } catch (err) {
      console.log(`ERROR: ${err}`);
      errors++;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  Processed:   ${processed}`);
  console.log(`  Skipped:     ${skipped}`);
  console.log(`  Errors/warn: ${errors}`);
  console.log(`  Total:       ${locations.length}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
