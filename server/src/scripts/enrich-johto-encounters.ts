/**
 * enrich-johto-encounters.ts
 *
 * Fetches encounter data from Bulbapedia for Johto Gen II locations
 * and fills in missing encounters (headbutt, rock-smash, fishing rod tiers, etc.)
 * in johto-gen2.json.
 *
 * Usage: npx tsx src/scripts/enrich-johto-encounters.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import {
  getPageSections,
  getSectionWikitext,
} from "../services/mediawiki.ts";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const DATA_FILE = join(SCRIPT_DIR, "../seeds/data/johto-gen2.json");

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Location key → Bulbapedia page title mapping
// ---------------------------------------------------------------------------

const LOCATION_TO_WIKI: Record<string, string> = {
  "new-bark-town": "New_Bark_Town",
  "violet-city": "Violet_City",
  "azalea-town": "Azalea_Town",
  "goldenrod-city": "Goldenrod_City",
  "route-34": "Johto_Route_34",
  "ecruteak-city": "Ecruteak_City",
  "burned-tower": "Burned_Tower",
  "olivine-city": "Olivine_City",
  "cianwood-city": "Cianwood_City",
  "lake-of-rage": "Lake_of_Rage",
  "mahogany-town": "Mahogany_Town",
  "blackthorn-city": "Blackthorn_City",
  "dragons-den": "Dragon's_Den",
  "mt-silver": "Mt._Silver",
  "route-29": "Johto_Route_29",
  "route-30": "Johto_Route_30",
  "route-31": "Johto_Route_31",
  "sprout-tower": "Sprout_Tower",
  "route-32": "Johto_Route_32",
  "ruins-of-alph": "Ruins_of_Alph",
  "union-cave": "Union_Cave",
  "route-33": "Johto_Route_33",
  "slowpoke-well": "Slowpoke_Well",
  "ilex-forest": "Ilex_Forest",
  "route-35": "Johto_Route_35",
  "national-park": "National_Park",
  "route-36": "Johto_Route_36",
  "route-37": "Johto_Route_37",
  "tin-tower": "Bell_Tower",
  "route-38": "Johto_Route_38",
  "route-39": "Johto_Route_39",
  "route-40": "Johto_Route_40",
  "route-41": "Johto_Route_41",
  "whirl-islands": "Whirl_Islands",
  "route-42": "Johto_Route_42",
  "mt-mortar": "Mt._Mortar",
  "route-43": "Johto_Route_43",
  "route-44": "Johto_Route_44",
  "ice-path": "Ice_Path",
  "route-45": "Johto_Route_45",
  "route-46": "Johto_Route_46",
  "dark-cave": "Dark_Cave",
  "route-27": "Kanto_Route_27",
  "tohjo-falls": "Tohjo_Falls",
  "route-26": "Kanto_Route_26",
  "victory-road-gsc": "Victory_Road_(Kanto)",
  "route-28": "Kanto_Route_28",
  "cherrygrove-city": "Cherrygrove_City",
};

// Skip these — no wild encounters on Bulbapedia or special cases
const SKIP_LOCATIONS = new Set([
  "indigo-plateau-gsc",
  "goldenrod-game-corner", // prizes, not wild encounters
  "mahogany-town", // no wild Pokemon section
]);

// ---------------------------------------------------------------------------
// Wikitext method → our method key
// ---------------------------------------------------------------------------

function mapMethod(wikiMethod: string, locationKey: string): string | null {
  const m = wikiMethod.toLowerCase().trim();
  if (m === "grass" || m === "tall grass") return "grass";
  if (m === "cave" || m === "walking") return "cave";
  if (m === "surf" || m === "surfing") return "surf";
  if (m === "fish old" || m === "old rod") return "old-rod";
  if (m === "fish good" || m === "good rod") return "good-rod";
  if (m === "fish super" || m === "super rod") return "super-rod";
  if (m === "headbutt") return "headbutt";
  if (m === "rock smash") return "rock-smash";
  if (m === "gift") return "gift";
  if (m === "static") return "static";
  if (m === "swarm") return null; // skip swarm-specific method
  // Floor-based methods (1F, B1F, 2F-3F, 2F-9F, etc.) → cave for indoor locations
  if (/^b?\d+f(-\d+f)?$/i.test(m)) {
    return CAVE_LOCATIONS.has(locationKey) ? "cave" : "cave";
  }
  // Skip swarm-only entries, contest, etc.
  return null;
}

// ---------------------------------------------------------------------------
// Determine if a location is cave-based (uses "cave" method for walking encounters)
// ---------------------------------------------------------------------------

const CAVE_LOCATIONS = new Set([
  "burned-tower",
  "sprout-tower",
  "union-cave",
  "slowpoke-well",
  "ruins-of-alph",
  "dark-cave",
  "ice-path",
  "mt-mortar",
  "whirl-islands",
  "tin-tower",
  "mt-silver",
  "tohjo-falls",
  "victory-road-gsc",
  "dragons-den",
]);

// ---------------------------------------------------------------------------
// Parse encounter templates from wikitext
// ---------------------------------------------------------------------------

interface ParsedEncounter {
  species_id: number;
  method: string;
  level_min: number;
  level_max: number;
  encounter_rate: number;
  time_of_day?: string;
  games: string[];
  notes?: string;
}

/**
 * Parse a Catch/entry2 template.
 * Format: {{Catch/entry2|dex|Name|gold|silver|crystal|Method|levels|morn%|day%|night%|...}}
 * Or:     {{Catch/entry2|dex|Name|gold|silver|crystal|Method|levels|all=XX%|...}}
 */
function parseEntry2(
  template: string,
  locationKey: string,
  inSwarmSection: boolean
): ParsedEncounter[] {
  // Extract params from template
  const inner = template.slice(template.indexOf("|") + 1, template.lastIndexOf("}}"));
  const params = inner.split("|");

  if (params.length < 7) return [];

  const speciesId = parseInt(params[0], 10);
  // params[1] is name (unused, we have ID)
  const inGold = params[2].toLowerCase() === "yes";
  const inSilver = params[3].toLowerCase() === "yes";
  const inCrystal = params[4].toLowerCase() === "yes";
  const wikiMethod = params[5];
  const levelStr = params[6];

  // Determine method
  let method = mapMethod(wikiMethod, locationKey);
  if (!method) return [];

  // If it's a cave location and method is "grass", convert to "cave"
  if (method === "grass" && CAVE_LOCATIONS.has(locationKey)) {
    method = "cave";
  }

  // Skip swarm encounters
  if (inSwarmSection) return [];

  // Parse levels
  let levelMin: number, levelMax: number;
  if (levelStr.includes("-")) {
    const [lo, hi] = levelStr.split("-").map((s) => parseInt(s, 10));
    levelMin = lo;
    levelMax = hi;
  } else if (levelStr.includes(",")) {
    const levels = levelStr.split(",").map((s) => parseInt(s, 10));
    levelMin = Math.min(...levels);
    levelMax = Math.max(...levels);
  } else {
    levelMin = levelMax = parseInt(levelStr, 10);
  }

  if (isNaN(speciesId) || isNaN(levelMin) || isNaN(levelMax)) return [];

  // Parse rates — look for "all=XX%" or positional morning/day/night rates
  const restParams = params.slice(7);
  const allParam = restParams.find((p) => p.startsWith("all="));

  // Build games list
  const games: string[] = [];
  if (inGold) games.push("gold");
  if (inSilver) games.push("silver");
  if (inCrystal) games.push("crystal");
  if (games.length === 0) return [];

  const results: ParsedEncounter[] = [];

  if (allParam) {
    // Same rate for all times of day
    const rateStr = allParam.replace("all=", "").replace("%", "").trim();
    const rate = parseInt(rateStr, 10);
    if (isNaN(rate) || rate === 0) return [];

    results.push({
      species_id: speciesId,
      method,
      level_min: levelMin,
      level_max: levelMax,
      encounter_rate: rate,
      games,
    });
  } else {
    // Time-of-day rates: morning%, day%, night%
    // Filter out type params
    const rateParams = restParams.filter(
      (p) => !p.startsWith("type1=") && !p.startsWith("type2=")
    );

    const mornRate = parseInt((rateParams[0] || "0").replace("%", ""), 10) || 0;
    const dayRate = parseInt((rateParams[1] || "0").replace("%", ""), 10) || 0;
    const nightRate = parseInt((rateParams[2] || "0").replace("%", ""), 10) || 0;

    // If all three are the same and non-zero, emit one entry without time_of_day
    if (mornRate === dayRate && dayRate === nightRate && mornRate > 0) {
      results.push({
        species_id: speciesId,
        method,
        level_min: levelMin,
        level_max: levelMax,
        encounter_rate: mornRate,
        games,
      });
    } else {
      // Emit separate entries for each time slot
      if (mornRate > 0) {
        results.push({
          species_id: speciesId,
          method,
          level_min: levelMin,
          level_max: levelMax,
          encounter_rate: mornRate,
          time_of_day: "morning",
          games,
        });
      }
      if (dayRate > 0) {
        results.push({
          species_id: speciesId,
          method,
          level_min: levelMin,
          level_max: levelMax,
          encounter_rate: dayRate,
          time_of_day: "day",
          games,
        });
      }
      if (nightRate > 0) {
        results.push({
          species_id: speciesId,
          method,
          level_min: levelMin,
          level_max: levelMax,
          encounter_rate: nightRate,
          time_of_day: "night",
          games,
        });
      }
    }
  }

  return results;
}

function parseWikitext(
  wikitext: string,
  locationKey: string
): ParsedEncounter[] {
  const results: ParsedEncounter[] = [];
  const lines = wikitext.split("\n");

  let inSwarmSection = false;

  for (const line of lines) {
    // Detect swarm section from Catch/div headers (case-insensitive)
    if (/\{\{[Cc]atch\/div\|/i.test(line)) {
      inSwarmSection = /swarm/i.test(line);
    }

    // Parse Catch/entry2 templates (case-insensitive)
    const match = line.match(/\{\{[Cc]atch\/entry2\|(.+)\}\}/i);
    if (match) {
      const parsed = parseEntry2(
        "{{Catch/entry2|" + match[1] + "}}",
        locationKey,
        inSwarmSection
      );
      results.push(...parsed);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Deduplication logic
// ---------------------------------------------------------------------------

interface Encounter {
  species_id: number;
  method: string;
  level_min: number;
  level_max: number;
  encounter_rate: number;
  time_of_day?: string;
  games: string[];
  notes?: string;
}

/**
 * Generate a dedup key for an encounter.
 * Two encounters are "the same" if they share species + method + time_of_day + overlapping games.
 */
function dedupKey(e: Encounter): string {
  return `${e.species_id}|${e.method}|${e.time_of_day || "all"}`;
}

function hasOverlappingGames(a: string[], b: string[]): boolean {
  return a.some((g) => b.includes(g));
}

/**
 * Check if a new encounter already exists in the existing encounters list.
 */
function isDuplicate(
  existing: Encounter[],
  newEnc: ParsedEncounter
): boolean {
  const newKey = dedupKey(newEnc);
  return existing.some((e) => {
    const existingKey = dedupKey(e);
    return existingKey === newKey && hasOverlappingGames(e.games, newEnc.games);
  });
}

// ---------------------------------------------------------------------------
// Upgrade existing "fishing" entries to specific rod tiers
// ---------------------------------------------------------------------------

function upgradeFishingEntries(
  existing: Encounter[],
  bulbapediaEntries: ParsedEncounter[]
): void {
  // For each existing "fishing" entry, try to figure out which rod it is
  // by matching species + games against bulbapedia data
  for (const enc of existing) {
    if (enc.method !== "fishing") continue;

    // Look for matching bulbapedia entries with rod-specific methods
    const matches = bulbapediaEntries.filter(
      (b) =>
        b.species_id === enc.species_id &&
        ["old-rod", "good-rod", "super-rod"].includes(b.method) &&
        hasOverlappingGames(b.games, enc.games)
    );

    if (matches.length === 1) {
      // Exact match — upgrade the method
      enc.method = matches[0].method;
    } else if (matches.length > 1) {
      // Multiple rod tiers — upgrade to the most common one (highest rate)
      // Actually, the existing entry likely represents the most basic rod
      // Let's check if OLD ROD matches the level
      const oldRod = matches.find((m) => m.method === "old-rod");
      if (
        oldRod &&
        oldRod.level_min === enc.level_min &&
        oldRod.level_max === enc.level_max
      ) {
        enc.method = "old-rod";
      } else {
        // Default to the first match
        enc.method = matches[0].method;
      }
    }
    // If no matches found, leave as "fishing" (shouldn't happen much)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const locations = data.locations as Record<
    string,
    { encounters: Encounter[]; trainers: unknown[] }
  >;

  // Count before
  const beforeCounts: Record<string, number> = {};
  let totalBefore = 0;
  for (const loc of Object.values(locations)) {
    for (const enc of loc.encounters) {
      beforeCounts[enc.method] = (beforeCounts[enc.method] || 0) + 1;
      totalBefore++;
    }
  }

  console.log("=== BEFORE ===");
  for (const [m, c] of Object.entries(beforeCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${m}: ${c}`);
  }
  console.log(`  TOTAL: ${totalBefore}`);
  console.log();

  // Process each location
  let addedTotal = 0;
  let upgradedFishing = 0;

  for (const [locationKey, locationData] of Object.entries(locations)) {
    if (SKIP_LOCATIONS.has(locationKey)) {
      console.log(`Skipping ${locationKey} (in skip list)`);
      continue;
    }

    const wikiPage = LOCATION_TO_WIKI[locationKey];
    if (!wikiPage) {
      console.log(`No wiki page mapping for: ${locationKey}`);
      continue;
    }

    try {
      // Get sections
      const sections = await getPageSections(wikiPage);

      // Find Pokemon → Generation II section
      const pokemonSec = sections.find((s) => s.title === "Pokémon");
      if (!pokemonSec) {
        console.log(`No Pokémon section for: ${locationKey} (${wikiPage})`);
        continue;
      }

      // Find the Gen II subsection (first "Generation II" after the Pokemon section)
      const gen2Sec = sections.find(
        (s) =>
          s.title === "Generation II" &&
          parseInt(s.index) > parseInt(pokemonSec.index)
      );

      if (!gen2Sec) {
        console.log(`No Generation II subsection for: ${locationKey}`);
        continue;
      }

      // Fetch wikitext
      const wikitext = await getSectionWikitext(wikiPage, gen2Sec.index);

      // Parse encounters
      const bulbapediaEncounters = parseWikitext(wikitext, locationKey);

      if (bulbapediaEncounters.length === 0) {
        console.log(`No encounters parsed for: ${locationKey}`);
        continue;
      }

      // Upgrade existing "fishing" entries to specific rod tiers
      const fishingBefore = locationData.encounters.filter(
        (e) => e.method === "fishing"
      ).length;
      upgradeFishingEntries(locationData.encounters, bulbapediaEncounters);
      const fishingAfter = locationData.encounters.filter(
        (e) => e.method === "fishing"
      ).length;
      const upgraded = fishingBefore - fishingAfter;
      if (upgraded > 0) {
        upgradedFishing += upgraded;
      }

      // Add new encounters that don't already exist
      let addedForLocation = 0;
      for (const newEnc of bulbapediaEncounters) {
        if (!isDuplicate(locationData.encounters, newEnc)) {
          // Build the encounter object
          const enc: Encounter = {
            species_id: newEnc.species_id,
            method: newEnc.method,
            level_min: newEnc.level_min,
            level_max: newEnc.level_max,
            encounter_rate: newEnc.encounter_rate,
            games: newEnc.games,
          };
          if (newEnc.time_of_day) {
            enc.time_of_day = newEnc.time_of_day;
          }
          locationData.encounters.push(enc);
          addedForLocation++;
        }
      }

      if (addedForLocation > 0) {
        console.log(
          `${locationKey}: +${addedForLocation} encounters (had ${locationData.encounters.length - addedForLocation})`
        );
        addedTotal += addedForLocation;
      } else {
        console.log(`${locationKey}: no new encounters`);
      }
    } catch (err) {
      console.error(`Error processing ${locationKey}: ${err}`);
    }
  }

  // Count after
  const afterCounts: Record<string, number> = {};
  let totalAfter = 0;
  for (const loc of Object.values(locations)) {
    for (const enc of loc.encounters) {
      afterCounts[enc.method] = (afterCounts[enc.method] || 0) + 1;
      totalAfter++;
    }
  }

  console.log();
  console.log("=== AFTER ===");
  for (const [m, c] of Object.entries(afterCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    const before = beforeCounts[m] || 0;
    const diff = c - before;
    console.log(`  ${m}: ${c}${diff > 0 ? ` (+${diff})` : ""}`);
  }
  console.log(`  TOTAL: ${totalAfter} (+${totalAfter - totalBefore})`);
  console.log();
  console.log(`Fishing entries upgraded to rod tiers: ${upgradedFishing}`);
  console.log(`New encounters added: ${addedTotal}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Not writing file.");
  } else {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`\nWrote ${DATA_FILE}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
