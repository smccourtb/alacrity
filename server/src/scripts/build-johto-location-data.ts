/**
 * build-johto-location-data.ts
 *
 * Fetches each Johto location's Bulbapedia page via the MediaWiki API and
 * extracts items, TMs, and events.
 *
 * Items & TMs: Parsed from {{Itemlist|...}} wikitext templates in "Items" sections.
 * Events: Hardcoded curated list of key story beats, gym battles, gift pokemon.
 * Gym TMs: Hardcoded (stable, well-known data).
 *
 * Usage: cd server && npx tsx src/scripts/build-johto-location-data.ts
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import {
  getPageSections,
  getSectionWikitext,
} from "../services/mediawiki.js";
import { LOCATION_TO_PAGES } from "./wiki-pages.js";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = join(SCRIPT_DIR, "..", "seeds", "data");
const OUTPUT_FILE = join(DATA_DIR, "johto-bulbapedia.json");

// ── Types ──

interface ItemEntry {
  item_name: string;
  method: "field" | "hidden" | "gift" | "purchase";
  description?: string;
  price?: number;
}

interface TMEntry {
  tm_number: number;
  move_name: string;
  method: "gym_reward" | "field" | "purchase" | "gift";
  price?: number;
}

interface EventEntry {
  event_name: string;
  event_type: "gym" | "story" | "gift_pokemon" | "static_pokemon";
  description?: string;
  species_id?: number;
  games?: string[];
  progression_order?: number;
}

interface LocationData {
  items: ItemEntry[];
  tms: TMEntry[];
  events: EventEntry[];
}

type OutputData = Record<string, LocationData>;

// ── Johto location keys to process ──

const JOHTO_LOCATIONS = [
  "new-bark-town", "cherrygrove-city", "violet-city", "azalea-town",
  "goldenrod-city", "ecruteak-city", "olivine-city", "cianwood-city",
  "mahogany-town", "blackthorn-city", "lake-of-rage",
  "route-29", "route-30", "route-31", "route-32", "route-33",
  "route-34", "route-35", "route-36", "route-37", "route-38",
  "route-39", "route-40", "route-41", "route-42", "route-43",
  "route-44", "route-45", "route-46", "route-26", "route-27",
  "route-28",
  "sprout-tower", "slowpoke-well", "union-cave", "ilex-forest",
  "national-park", "ruins-of-alph", "burned-tower", "tin-tower",
  "whirl-islands", "mt-mortar", "ice-path", "dark-cave",
  "dragons-den", "tohjo-falls", "victory-road-gsc", "mt-silver",
  "indigo-plateau-gsc", "goldenrod-game-corner",

  // ── Kanto-on-Johto (GSC) — items + events scraped from Bulbapedia ────────
  "pallet-town", "viridian-city", "pewter-city", "cerulean-city",
  "vermilion-city", "lavender-town", "celadon-city", "saffron-city",
  "fuchsia-city", "cinnabar-island",
  "route-1", "route-2-south", "route-3", "route-4", "route-5",
  "route-6", "route-7", "route-8", "route-9", "route-10",
  "route-11", "route-12", "route-13", "route-14", "route-15",
  "route-16", "route-17", "route-18", "route-19", "route-20",
  "route-21", "route-22", "route-23", "route-24", "route-25",
  "mt-moon", "rock-tunnel", "digletts-cave", "seafoam-islands",
  "cerulean-cave", "power-plant", "silph-co", "fighting-dojo",
];

// ── Curated gym TMs ──

const GYM_TMS: Record<string, TMEntry> = {
  "violet-city": { tm_number: 31, move_name: "Mud-Slap", method: "gym_reward" },
  "azalea-town": { tm_number: 49, move_name: "Fury Cutter", method: "gym_reward" },
  "goldenrod-city": { tm_number: 45, move_name: "Attract", method: "gym_reward" },
  "ecruteak-city": { tm_number: 30, move_name: "Shadow Ball", method: "gym_reward" },
  "cianwood-city": { tm_number: 1, move_name: "DynamicPunch", method: "gym_reward" },
  "olivine-city": { tm_number: 23, move_name: "Iron Tail", method: "gym_reward" },
  "mahogany-town": { tm_number: 16, move_name: "Icy Wind", method: "gym_reward" },
  "blackthorn-city": { tm_number: 24, move_name: "DragonBreath", method: "gym_reward" },
};

// ── Curated events ──

const CURATED_EVENTS: Record<string, EventEntry[]> = {
  "new-bark-town": [
    { event_name: "Receive Starter Pokemon", event_type: "gift_pokemon", description: "Choose Cyndaquil, Totodile, or Chikorita from Prof. Elm", species_id: 155 },
  ],
  "violet-city": [
    { event_name: "Defeat Falkner", event_type: "gym", description: "Gym 1 — earns Zephyr Badge", progression_order: 1 },
    { event_name: "Receive Togepi Egg", event_type: "gift_pokemon", description: "From Prof. Elm's aide after first gym", species_id: 175 },
  ],
  "azalea-town": [
    { event_name: "Defeat Bugsy", event_type: "gym", description: "Gym 2 — earns Hive Badge", progression_order: 2 },
    { event_name: "Clear Slowpoke Well", event_type: "story", description: "Defeat Team Rocket in Slowpoke Well" },
  ],
  "goldenrod-city": [
    { event_name: "Defeat Whitney", event_type: "gym", description: "Gym 3 — earns Plain Badge", progression_order: 3 },
    { event_name: "Receive Squirtbottle", event_type: "story", description: "From flower shop after defeating Whitney" },
    { event_name: "Receive Eevee", event_type: "gift_pokemon", description: "From Bill", species_id: 133 },
    { event_name: "Clear Radio Tower", event_type: "story", description: "Defeat Team Rocket in Radio Tower (post-Mahogany)", progression_order: 2 },
  ],
  "ecruteak-city": [
    { event_name: "Defeat Morty", event_type: "gym", description: "Gym 4 — earns Fog Badge", progression_order: 4 },
  ],
  "burned-tower": [
    { event_name: "Legendary Beasts Flee", event_type: "story", description: "Raikou, Entei, and Suicune begin roaming Johto" },
  ],
  "cianwood-city": [
    { event_name: "Defeat Chuck", event_type: "gym", description: "Gym 5 — earns Storm Badge", progression_order: 5 },
    { event_name: "Receive SecretPotion", event_type: "story", description: "From Cianwood Pharmacy for Amphy" },
    { event_name: "Receive Shuckie", event_type: "gift_pokemon", description: "Shuckle from Kirk", species_id: 213 },
  ],
  "olivine-city": [
    { event_name: "Defeat Jasmine", event_type: "gym", description: "Gym 6 — earns Mineral Badge", progression_order: 6 },
  ],
  "lake-of-rage": [
    { event_name: "Red Gyarados Encounter", event_type: "static_pokemon", description: "Guaranteed shiny Gyarados in the lake", species_id: 130 },
  ],
  "mahogany-town": [
    { event_name: "Defeat Pryce", event_type: "gym", description: "Gym 7 — earns Glacier Badge", progression_order: 7 },
    { event_name: "Clear Team Rocket HQ", event_type: "story", description: "Defeat Team Rocket in their Mahogany hideout" },
  ],
  "blackthorn-city": [
    { event_name: "Defeat Clair", event_type: "gym", description: "Gym 8 — earns Rising Badge", progression_order: 8 },
    { event_name: "Dragon's Den Challenge", event_type: "story", description: "Pass the Dragon's Den quiz to receive Rising Badge" },
  ],
  "tin-tower": [
    { event_name: "Ho-Oh Encounter", event_type: "static_pokemon", description: "Encounter Ho-Oh at the top of Tin Tower", species_id: 250, games: ["gold"] },
  ],
  "whirl-islands": [
    { event_name: "Lugia Encounter", event_type: "static_pokemon", description: "Encounter Lugia deep within Whirl Islands", species_id: 249, games: ["silver"] },
  ],
  "indigo-plateau-gsc": [
    { event_name: "Defeat Elite Four", event_type: "story", description: "Defeat Will, Koga, Bruno, and Karen" },
    { event_name: "Defeat Champion Lance", event_type: "story", description: "Become Johto Champion" },
  ],
  "mt-silver": [
    { event_name: "Defeat Red", event_type: "story", description: "Final battle against Red at the summit" },
  ],
  "mt-mortar": [
    { event_name: "Receive Tyrogue", event_type: "gift_pokemon", description: "Defeat Karate King", species_id: 236 },
  ],
  "dragons-den": [
    { event_name: "Receive Dratini", event_type: "gift_pokemon", description: "Pass Dragon's Den quiz", species_id: 147 },
  ],
  "goldenrod-game-corner": [
    { event_name: "Purchase Pokemon", event_type: "story", description: "Abra, Ekans/Sandshrew, Dratini available" },
  ],
  "route-35": [
    { event_name: "Receive Spearow", event_type: "gift_pokemon", description: "Kenya the Spearow from guard", species_id: 21 },
  ],
};

// ── Gen 2 TM move lookup (fallback when display= is missing) ──

const GEN2_TM_MOVES: Record<number, string> = {
  1: "DynamicPunch", 2: "Headbutt", 3: "Curse", 4: "Rollout", 5: "Roar",
  6: "Toxic", 7: "Zap Cannon", 8: "Rock Smash", 9: "Psych Up", 10: "Hidden Power",
  11: "Sunny Day", 12: "Sweet Scent", 13: "Snore", 14: "Blizzard", 15: "Hyper Beam",
  16: "Icy Wind", 17: "Protect", 18: "Rain Dance", 19: "Giga Drain", 20: "Endure",
  21: "Frustration", 22: "SolarBeam", 23: "Iron Tail", 24: "DragonBreath",
  25: "Thunder", 26: "Earthquake", 27: "Return", 28: "Dig", 29: "Psychic",
  30: "Shadow Ball", 31: "Mud-Slap", 32: "Double Team", 33: "Ice Punch",
  34: "Swagger", 35: "Sleep Talk", 36: "Sludge Bomb", 37: "Sandstorm",
  38: "Fire Blast", 39: "Swift", 40: "Defense Curl", 41: "ThunderPunch",
  42: "Dream Eater", 43: "Detect", 44: "Rest", 45: "Attract",
  46: "Thief", 47: "Steel Wing", 48: "Fire Punch", 49: "Fury Cutter",
  50: "Nightmare",
};

// ── Wikitext parsing helpers ──

/**
 * Clean wikitext markup from a description string.
 * Removes templates, wiki links, italic markers, etc.
 */
function cleanDescription(desc: string): string {
  let text = desc;

  // {{Badge|Zephyr}} → Zephyr Badge
  text = text.replace(/\{\{[Bb]adge\|([^}]+)\}\}/g, "$1 Badge");

  // {{m|Cut}} → Cut (move references)
  text = text.replace(/\{\{m\|([^}|]+)(?:\|[^}]*)?\}\}/g, "$1");

  // {{p|Onix}} → Onix (pokemon references)
  text = text.replace(/\{\{p\|([^}|]+)(?:\|[^}]*)?\}\}/g, "$1");

  // {{i|Poke Ball}} → Poke Ball (item references)
  text = text.replace(/\{\{i\|([^}|]+)(?:\|[^}]*)?\}\}/g, "$1");

  // {{tc|Picnicker}} → Picnicker (trainer class)
  text = text.replace(/\{\{tc\|([^}|]+)(?:\|[^}]*)?\}\}/g, "$1");

  // {{rt|32|Johto}} → Route 32
  text = text.replace(/\{\{rt\|(\d+)\|([^}]+)\}\}/g, "Route $1");

  // {{DL|...|display}} → display
  text = text.replace(/\{\{DL\|[^|]+\|([^}]+)\}\}/gi, "$1");

  // {{TM|05|Roar}} → TM05 Roar
  text = text.replace(/\{\{TM\|(\d+)\|([^}]+)\}\}/g, "TM$1 $2");

  // {{HM|01|Cut}} → HM01 Cut
  text = text.replace(/\{\{HM\|(\d+)\|([^}]+)\}\}/g, "HM$1 $2");

  // {{dotw|Fr}} → remove (day-of-week markers)
  text = text.replace(/\{\{dotw\|[^}]*\}\}/g, "");

  // {{sup/N|GSC}} → remove (superscript game markers)
  text = text.replace(/\{\{sup\/\d+(?:\|[^}]*)?\}\}/g, "");

  // {{player}} → the player
  text = text.replace(/\{\{player\}\}/gi, "the player");

  // Remove any remaining simple templates {{...}}
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, "");
  }

  // [[Week Siblings|Frieda]] → Frieda (piped links)
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");

  // [[Pokemon Center]] → Pokemon Center (simple links)
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // ''italic'' → plain text
  text = text.replace(/''+/g, "");

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Replace Pokémon with Pokemon for consistency
  text = text.replace(/Pokémon/g, "Pokemon");

  return text;
}

/**
 * Parse {{Itemlist|...}} templates from wikitext.
 * Returns items and TMs found, filtered to GSC games only.
 */
function parseItemlistTemplates(wikitext: string): { items: ItemEntry[]; tms: TMEntry[] } {
  const items: ItemEntry[] = [];
  const tms: TMEntry[] = [];

  // Match each {{Itemlist|...}} template.
  // Templates can contain nested {{...}} so we need to handle that.
  const templateRegex = /\{\{Itemlist(?:\/\d+)?\|/gi;
  let match: RegExpExecArray | null;

  while ((match = templateRegex.exec(wikitext)) !== null) {
    const startIdx = match.index;
    // Find the matching closing }} accounting for nesting
    let depth = 1;
    let i = startIdx + match[0].length;
    while (i < wikitext.length && depth > 0) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
        depth++;
        i += 2;
      } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
        depth--;
        i += 2;
      } else {
        i++;
      }
    }

    const templateContent = wikitext.substring(startIdx + match[0].length, i - 2);

    // Split on top-level pipes (not inside nested templates)
    const params = splitTopLevelPipes(templateContent);

    // params[0] = item name or "none" / "TM Normal" / "TM Grass" etc.
    // params[1] = description
    // params[2..n] = named parameters like G=yes, S=yes, display={{TM|05|Roar}}

    if (params.length < 2) continue;

    const rawItemName = params[0].trim();
    const rawDescription = params[1].trim();

    // Parse named parameters
    const namedParams: Record<string, string> = {};
    for (let p = 2; p < params.length; p++) {
      const eqIdx = params[p].indexOf("=");
      if (eqIdx > 0) {
        const key = params[p].substring(0, eqIdx).trim();
        const val = params[p].substring(eqIdx + 1).trim();
        namedParams[key] = val;
      }
    }

    // Filter to GSC games only — must have at least one of G/S/C = yes
    const hasG = namedParams["G"] === "yes";
    const hasS = namedParams["S"] === "yes";
    const hasC = namedParams["C"] === "yes";
    if (!hasG && !hasS && !hasC) continue;

    // Check for display= parameter (overrides item name)
    const displayParam = namedParams["display"] || "";

    // Check if this is a TM
    const tmFromDisplay = displayParam.match(/\{\{TM\|(\d+)\|([^}]+)\}\}/);
    const tmFromName = rawItemName.match(/^TM\s*(\d+)$/);

    if (tmFromDisplay) {
      const tmNum = parseInt(tmFromDisplay[1]);
      const moveName = tmFromDisplay[2].trim();
      const desc = cleanDescription(rawDescription);
      const method = determineMethod(rawDescription);

      tms.push({
        tm_number: tmNum,
        move_name: moveName,
        method: method === "hidden" ? "field" : (method === "purchase" ? "purchase" : method === "gift" ? "gift" : "field"),
      });
    } else if (tmFromName) {
      const tmNum = parseInt(tmFromName[1]);
      tms.push({
        tm_number: tmNum,
        move_name: GEN2_TM_MOVES[tmNum] || "Unknown",
        method: determineMethod(rawDescription) === "purchase" ? "purchase" : "field",
      });
    } else {
      // Regular item
      // Determine actual item name from display= or raw name
      let itemName = rawItemName;
      if (displayParam) {
        // display can contain wikitext like [[Old Rod]] or {{DL|...|Relax Ribbon}}
        itemName = cleanDescription(displayParam);
      }

      // Strip quantity suffixes like " ×2", " ×5"
      itemName = itemName.replace(/\s*×\d+$/, "");

      // Skip "none" items that don't have a display name
      if (itemName === "none" || itemName === "") continue;

      // Skip sprite= param items without useful display
      if (namedParams["sprite"] && !displayParam && rawItemName === "none") continue;

      // Skip HMs
      if (/^HM\s*\d+$/i.test(itemName) || /^HM\s*\d+$/i.test(rawItemName)) continue;

      const method = determineMethod(rawDescription);
      const description = cleanDescription(rawDescription);

      items.push({
        item_name: itemName,
        method,
        ...(description ? { description } : {}),
      });
    }
  }

  return { items: dedupeItems(items), tms: dedupeTMs(tms) };
}

/**
 * Split a string on top-level pipe characters, ignoring pipes inside nested
 * {{...}} or [[...]].
 */
function splitTopLevelPipes(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1] || "";

    if (ch === '{' && next === '{') {
      braceDepth++;
      current += "{{";
      i++;
    } else if (ch === '}' && next === '}') {
      braceDepth--;
      current += "}}";
      i++;
    } else if (ch === '[' && next === '[') {
      bracketDepth++;
      current += "[[";
      i++;
    } else if (ch === ']' && next === ']') {
      bracketDepth--;
      current += "]]";
      i++;
    } else if (ch === '|' && braceDepth === 0 && bracketDepth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * Determine item method from description text.
 */
function determineMethod(desc: string): "field" | "hidden" | "gift" | "purchase" {
  const lower = desc.toLowerCase();
  if (/\(hidden\)/i.test(desc) || /'''\(hidden\)'''/.test(desc)) {
    return "hidden";
  }
  if (/from\s+\w+|receive|given|reward|gift|held by/i.test(lower)) {
    return "gift";
  }
  return "field";
}

function dedupeItems(items: ItemEntry[]): ItemEntry[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.item_name}:${item.method}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTMs(tms: TMEntry[]): TMEntry[] {
  const seen = new Set<number>();
  return tms.filter((tm) => {
    if (seen.has(tm.tm_number)) return false;
    seen.add(tm.tm_number);
    return true;
  });
}

// ── Main ──

async function main() {
  const output: OutputData = {};

  let totalItems = 0;
  let totalTMs = 0;
  let totalEvents = 0;
  let locationsWithItems = 0;
  let locationsWithTMs = 0;
  let locationsWithEvents = 0;

  console.error(`Processing ${JOHTO_LOCATIONS.length} Johto locations...\n`);

  for (const locationKey of JOHTO_LOCATIONS) {
    const pages = LOCATION_TO_PAGES[locationKey];
    if (!pages) {
      console.error(`  WARNING: No Bulbapedia mapping for ${locationKey}`);
      output[locationKey] = { items: [], tms: [], events: [] };
      continue;
    }

    let allItems: ItemEntry[] = [];
    let allTMs: TMEntry[] = [];

    for (const page of pages) {
      try {
        // 1. Get sections for this page
        const sections = await getPageSections(page);

        // 2. Find the "Items" section (usually level 2, sometimes level 3)
        const itemsSection = sections.find(
          (s) => s.title === "Items" && (s.level === "2" || s.level === "3")
        );

        if (!itemsSection) {
          // Some pages don't have an Items section
          continue;
        }

        // 3. Fetch wikitext for the Items section
        const wikitext = await getSectionWikitext(page, itemsSection.index);

        // 4. Parse {{Itemlist|...}} templates
        const { items, tms } = parseItemlistTemplates(wikitext);
        allItems.push(...items);
        allTMs.push(...tms);
      } catch (err) {
        console.error(`  ERROR processing page ${page} for ${locationKey}: ${err}`);
      }
    }

    // Dedupe across pages
    allItems = dedupeItems(allItems);
    allTMs = dedupeTMs(allTMs);

    // Add curated gym TM if applicable
    if (GYM_TMS[locationKey]) {
      const gymTM = GYM_TMS[locationKey];
      if (!allTMs.some((t) => t.tm_number === gymTM.tm_number && t.method === "gym_reward")) {
        allTMs.push(gymTM);
      }
    }

    // Add curated events
    const events = CURATED_EVENTS[locationKey] || [];

    output[locationKey] = { items: allItems, tms: allTMs, events };

    // Stats
    if (allItems.length > 0) locationsWithItems++;
    if (allTMs.length > 0) locationsWithTMs++;
    if (events.length > 0) locationsWithEvents++;
    totalItems += allItems.length;
    totalTMs += allTMs.length;
    totalEvents += events.length;

    const parts: string[] = [];
    if (allItems.length) parts.push(`${allItems.length} items`);
    if (allTMs.length) parts.push(`${allTMs.length} TMs`);
    if (events.length) parts.push(`${events.length} events`);
    if (parts.length) {
      console.error(`  ${locationKey}: ${parts.join(", ")}`);
    }
  }

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.error(`\nWrote ${OUTPUT_FILE}`);

  // Summary
  console.error(`\n=== Coverage Stats ===`);
  console.error(`  Locations processed:     ${JOHTO_LOCATIONS.length}`);
  console.error(`  Locations with items:    ${locationsWithItems} / ${JOHTO_LOCATIONS.length}`);
  console.error(`  Locations with TMs:      ${locationsWithTMs} / ${JOHTO_LOCATIONS.length}`);
  console.error(`  Locations with events:   ${locationsWithEvents} / ${JOHTO_LOCATIONS.length}`);
  console.error(`  Total items:             ${totalItems}`);
  console.error(`  Total TMs:               ${totalTMs}`);
  console.error(`  Total events:            ${totalEvents}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
