/**
 * enrich-trainer-names.ts
 *
 * Reads red-trainers-raw.json and fills in trainer_name fields.
 *
 * Gen 1 trainers don't have canonical names — Bulbapedia only lists them by
 * class (e.g. "Bug Catcher", "Youngster"). Names were added in FRLG (Gen 3)
 * but those games have different trainer rosters, so names don't map 1:1.
 *
 * Strategy:
 * - Boss trainers (gym leaders, E4, rival, Giovanni): hard-coded names
 * - Regular trainers: fetch FRLG trainer names from Bulbapedia route pages
 *   and attempt to match by class + ordering within location. Fall back to
 *   numbered names ("Youngster #1") when no match found.
 *
 * Usage: cd server && npx tsx src/scripts/enrich-trainer-names.ts
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { LOCATION_TO_PAGES } from "./wiki-pages.js";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const CACHE_DIR = join(SCRIPT_DIR, ".cache", "bulbapedia");
const DATA_DIR = join(SCRIPT_DIR, "..", "seeds", "data");

const INPUT_FILE = join(DATA_DIR, "red-trainers-raw.json");
const OUTPUT_FILE = join(DATA_DIR, "red-trainers.json");

const BULBA_BASE = "https://bulbapedia.bulbagarden.net/wiki/";
const DELAY_MS = 1000;

// --- Types ---

interface PartyMember {
  species_id: number;
  level: number;
  moves: string[];
}

interface Trainer {
  location_key: string;
  trainer_class: string;
  trainer_name: string;
  is_boss: boolean;
  is_rematchable: boolean;
  party: PartyMember[];
}

// --- Boss name mapping ---

const BOSS_NAMES: Record<string, string> = {
  Brock: "Brock",
  Misty: "Misty",
  "Lt. Surge": "Lt. Surge",
  Erika: "Erika",
  Koga: "Koga",
  Sabrina: "Sabrina",
  Blaine: "Blaine",
  Giovanni: "Giovanni",
  Lorelei: "Lorelei",
  Bruno: "Bruno",
  Agatha: "Agatha",
  Lance: "Lance",
  Rival: "Blue",
};

// Class name normalization: pret uses different names than Bulbapedia sometimes
const CLASS_ALIASES: Record<string, string[]> = {
  "Team Rocket Grunt": ["Rocket", "Rocket Grunt", "Team Rocket Grunt", "Team Rocket"],
  "Jr. Trainer (F)": ["Jr. Trainer♀", "Jr. Trainer", "Camper", "Picnicker"],
  "Jr. Trainer (M)": ["Jr. Trainer♂", "Jr. Trainer", "Camper"],
  "Cooltrainer (M)": ["Cooltrainer", "Cool Trainer", "Ace Trainer"],
  "Cooltrainer (F)": ["Cooltrainer", "Cool Trainer", "Ace Trainer"],
  Blackbelt: ["Black Belt", "Blackbelt"],
  "Super Nerd": ["Super Nerd"],
  "Cue Ball": ["Cue Ball"],
  Psychic: ["Psychic"],
};

function getClassAliases(trainerClass: string): string[] {
  return CLASS_ALIASES[trainerClass] || [trainerClass];
}

// --- HTML fetching + caching ---

async function fetchPage(pageName: string): Promise<string> {
  const cacheFile = join(CACHE_DIR, `${pageName.replace(/[/%]/g, "_")}.html`);

  if (existsSync(cacheFile)) {
    return readFileSync(cacheFile, "utf-8");
  }

  const url = `${BULBA_BASE}${pageName}`;
  console.error(`  Fetching ${url}...`);

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`  WARNING: ${resp.status} for ${url}`);
    return "";
  }

  const html = await resp.text();
  writeFileSync(cacheFile, html, "utf-8");

  // Be polite
  await new Promise((r) => setTimeout(r, DELAY_MS));
  return html;
}

// --- FRLG trainer name extraction ---
// Extracts "Class Name" pairs from Bulbapedia HTML.
// FRLG trainers appear in Generation III sections with patterns like:
//   "Bug Catcher Colton" or separate class/name table cells.

interface BulbaTrainer {
  fullText: string; // e.g. "Bug Catcher Colton"
  className: string; // e.g. "Bug Catcher"
  name: string; // e.g. "Colton"
}

function extractTrainerNames(html: string): BulbaTrainer[] {
  const results: BulbaTrainer[] = [];

  // Strategy: Look for trainer header patterns in the HTML.
  // Bulbapedia trainer entries typically have the trainer's full name
  // (class + name) as linked text or in header-like elements.

  // Pattern 1: "Trainer Class Name" in bold links, e.g.:
  // <a ...>Bug Catcher Colton</a>
  // These appear in trainer table headers.
  const trainerLinkPattern =
    /title="[^"]*\(Trainer class\)"[^>]*>([^<]+)<\/a>\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;

  let match: RegExpExecArray | null;
  while ((match = trainerLinkPattern.exec(html)) !== null) {
    const className = match[1].trim();
    const name = match[2].trim();
    if (name && name !== "Pokémon" && name !== "Reward") {
      results.push({ fullText: `${className} ${name}`, className, name });
    }
  }

  // Pattern 2: Bold trainer names like <b>Bug Catcher Colton</b>
  // or within span/td elements
  const boldPattern =
    /(?:>|\n)\s*(?:<[^>]*>)*\s*((?:Bug Catcher|Youngster|Lass|Hiker|Sailor|Fisher|Swimmer|Beauty|Biker|Bird Keeper|Blackbelt|Black Belt|Burglar|Channeler|Cooltrainer|Cool Trainer|Cue Ball|Engineer|Gambler|Gentleman|Jr\. Trainer[♀♂]?|Juggler|Pokemaniac|Pok[eé]maniac|Psychic|Rocker|Rocket|Scientist|Super Nerd|Tamer|Ace Trainer|Picnicker|Camper|Team Rocket Grunt)\s+([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z]+)?))\s*(?:<|$)/g;

  while ((match = boldPattern.exec(html)) !== null) {
    const fullText = match[1].trim();
    const name = match[2].trim();
    // Extract class = fullText minus name
    const className = fullText.substring(0, fullText.length - name.length).trim();
    if (
      name &&
      name !== "Pokémon" &&
      name !== "Reward" &&
      name !== "Pokemon" &&
      !name.match(/^\d/)
    ) {
      // Deduplicate
      if (!results.some((r) => r.fullText === fullText)) {
        results.push({ fullText, className, name });
      }
    }
  }

  // Pattern 3: Simpler — look for known class names followed by capitalized words
  // in the page text content (after stripping some HTML)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const simplePattern =
    /\b(Bug Catcher|Youngster|Lass|Hiker|Sailor|Fisher|Swimmer|Beauty|Biker|Bird Keeper|Black Belt|Blackbelt|Burglar|Channeler|Cooltrainer|Cool Trainer|Cue Ball|Engineer|Gambler|Gentleman|Jr\. Trainer[♀♂]?|Juggler|Pok[eé]maniac|Psychic|Rocker|Scientist|Super Nerd|Tamer|Ace Trainer|Picnicker|Camper)\s+([A-Z][a-z]{2,})\b/g;

  while ((match = simplePattern.exec(textContent)) !== null) {
    const className = match[1];
    const name = match[2];
    const fullText = `${className} ${name}`;
    if (
      name !== "Pokémon" &&
      name !== "Pokemon" &&
      name !== "Reward" &&
      name !== "Trainer" &&
      name !== "Class" &&
      !results.some((r) => r.fullText === fullText)
    ) {
      results.push({ fullText, className, name });
    }
  }

  return results;
}

// --- Matching logic ---

function classMatches(pretClass: string, bulbaClass: string): boolean {
  const aliases = getClassAliases(pretClass);
  const lower = bulbaClass.toLowerCase();
  return aliases.some((a) => a.toLowerCase() === lower);
}

// Try to match pret trainers at a location to Bulbapedia FRLG names.
// Since FRLG rosters differ from RBY, we match by class and take names
// in order. This is imperfect but gets us reasonable names.
function matchTrainers(
  pretTrainers: Trainer[],
  bulbaTrainers: BulbaTrainer[]
): Map<number, string> {
  const result = new Map<number, string>();

  // Group pret trainers by class
  const pretByClass = new Map<string, number[]>();
  for (let i = 0; i < pretTrainers.length; i++) {
    const cls = pretTrainers[i].trainer_class;
    if (!pretByClass.has(cls)) pretByClass.set(cls, []);
    pretByClass.get(cls)!.push(i);
  }

  // Group bulba trainers by pret-compatible class
  const bulbaByPretClass = new Map<string, BulbaTrainer[]>();
  for (const bt of bulbaTrainers) {
    // Find which pret class this bulba class maps to
    for (const [pretClass] of pretByClass) {
      if (classMatches(pretClass, bt.className)) {
        if (!bulbaByPretClass.has(pretClass)) bulbaByPretClass.set(pretClass, []);
        // Avoid duplicate names
        if (!bulbaByPretClass.get(pretClass)!.some((x) => x.name === bt.name)) {
          bulbaByPretClass.get(pretClass)!.push(bt);
        }
        break;
      }
    }
  }

  // Assign names in order within each class
  for (const [pretClass, indices] of pretByClass) {
    const bulbaNames = bulbaByPretClass.get(pretClass) || [];
    for (let i = 0; i < indices.length; i++) {
      if (i < bulbaNames.length) {
        result.set(indices[i], bulbaNames[i].name);
      }
    }
  }

  return result;
}

// --- Main ---

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  const raw: Trainer[] = JSON.parse(readFileSync(INPUT_FILE, "utf-8"));
  console.error(`Loaded ${raw.length} trainers from ${INPUT_FILE}`);

  let bossNamed = 0;
  let scraperNamed = 0;
  let numberedFallback = 0;
  const unmatched: string[] = [];

  // Step 1: Name boss trainers
  for (const t of raw) {
    if (t.is_boss && BOSS_NAMES[t.trainer_class]) {
      t.trainer_name = BOSS_NAMES[t.trainer_class];
      bossNamed++;
    }
  }
  console.error(`\nBoss trainers named: ${bossNamed}`);

  // Step 2: Try Bulbapedia scraping for regular trainers
  // Group non-boss trainers by location
  const regularByLocation = new Map<string, Trainer[]>();
  for (const t of raw) {
    if (!t.is_boss && t.trainer_name === "Unknown") {
      if (!regularByLocation.has(t.location_key))
        regularByLocation.set(t.location_key, []);
      regularByLocation.get(t.location_key)!.push(t);
    }
  }

  console.error(
    `\nScraping Bulbapedia for ${regularByLocation.size} locations...`
  );

  for (const [locationKey, trainers] of regularByLocation) {
    const pages = LOCATION_TO_PAGES[locationKey];
    if (!pages) {
      console.error(`  No Bulbapedia mapping for ${locationKey}`);
      continue;
    }

    // Fetch all pages for this location and collect trainer names
    const allBulba: BulbaTrainer[] = [];
    for (const page of pages) {
      const html = await fetchPage(page);
      if (html) {
        const extracted = extractTrainerNames(html);
        allBulba.push(...extracted);
      }
    }

    if (allBulba.length > 0) {
      console.error(
        `  ${locationKey}: found ${allBulba.length} FRLG names: ${allBulba.map((b) => b.fullText).join(", ")}`
      );
    }

    // Match
    const matches = matchTrainers(trainers, allBulba);
    for (const [idx, name] of matches) {
      trainers[idx].trainer_name = name;
      scraperNamed++;
    }
  }

  console.error(`\nBulbapedia scrape named: ${scraperNamed}`);

  // Step 3: Numbered fallback for remaining unknowns
  // Group by location + class, assign sequential numbers
  const counterByLocClass = new Map<string, number>();

  for (const t of raw) {
    if (t.trainer_name === "Unknown") {
      const key = `${t.location_key}:${t.trainer_class}`;
      const count = (counterByLocClass.get(key) || 0) + 1;
      counterByLocClass.set(key, count);

      // Count total of this class at this location
      const totalAtLoc = raw.filter(
        (x) =>
          x.location_key === t.location_key &&
          x.trainer_class === t.trainer_class &&
          !x.is_boss
      ).length;

      if (totalAtLoc === 1) {
        // Only one of this class at location — no number needed, keep "Unknown"
        // Actually let's still mark with a number for consistency
        t.trainer_name = `${t.trainer_class} #${count}`;
      } else {
        t.trainer_name = `${t.trainer_class} #${count}`;
      }
      numberedFallback++;
      unmatched.push(
        `  ${t.location_key}: ${t.trainer_class} → ${t.trainer_name}`
      );
    }
  }

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(raw, null, 2) + "\n", "utf-8");
  console.error(`\nWrote ${raw.length} trainers to ${OUTPUT_FILE}`);

  // Stats
  console.error(`\n=== Match Stats ===`);
  console.error(`  Boss trainers (hard-coded): ${bossNamed}`);
  console.error(`  Bulbapedia scrape matches:  ${scraperNamed}`);
  console.error(`  Numbered fallback:          ${numberedFallback}`);
  console.error(
    `  Total named:                ${bossNamed + scraperNamed} / ${raw.length}`
  );
  console.error(
    `  Name rate:                  ${(((bossNamed + scraperNamed) / raw.length) * 100).toFixed(1)}%`
  );

  if (unmatched.length > 0) {
    console.error(`\n=== Fell back to numbered (${unmatched.length}) ===`);
    for (const u of unmatched) {
      console.error(u);
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
