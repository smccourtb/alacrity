/**
 * Merge script for johto-gen2.json
 *
 * Reads:
 *   1. johto-gen2.json        — base file with encounters + milestones
 *   2. crystal-trainers.json  — 541 trainers parsed from pokecrystal
 *   3. johto-bulbapedia.json  — items, TMs, events scraped from Bulbapedia
 *
 * Writes merged result back to johto-gen2.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "..", "seeds", "data");

// ── Load sources ────────────────────────────────────────────────────────────

const johto = JSON.parse(
  readFileSync(join(DATA_DIR, "johto-gen2.json"), "utf-8")
);
const trainersRaw: any[] = JSON.parse(
  readFileSync(join(DATA_DIR, "crystal-trainers.json"), "utf-8")
);
const bulbapedia: Record<string, any> = JSON.parse(
  readFileSync(join(DATA_DIR, "johto-bulbapedia.json"), "utf-8")
);

// ── Index trainers by location ──────────────────────────────────────────────

const trainersByLocation: Record<string, any[]> = {};

for (const t of trainersRaw) {
  const loc = t.location_key;
  if (!loc) continue;
  if (!trainersByLocation[loc]) trainersByLocation[loc] = [];
  trainersByLocation[loc].push(t);
}

// ── Helper: convert a raw trainer to output format ──────────────────────────

function convertTrainer(raw: any): any {
  const out: any = {
    trainer_class: raw.trainer_class,
    trainer_name: raw.trainer_name,
    is_boss: raw.is_boss,
    is_rematchable: raw.is_rematchable,
    party: raw.party.map((p: any) => {
      const member: any = { species_id: p.species_id, level: p.level };
      if (p.moves && p.moves.length > 0) member.moves = p.moves;
      if (p.item) member.item = p.item;
      return member;
    }),
    games: ["gold", "silver", "crystal"],
  };
  return out;
}

// ── Mark rematches (2nd+ occurrence of same trainer_name at same location) ──

function markRematches(trainers: any[]): any[] {
  const seen: Record<string, number> = {};
  return trainers.map((t) => {
    const key = t.trainer_name;
    seen[key] = (seen[key] || 0) + 1;
    const converted = convertTrainer(t);
    if (seen[key] > 1) {
      converted.is_rematchable = true;
    }
    return converted;
  });
}

// ── Merge into each location ────────────────────────────────────────────────

let totalTrainers = 0;
let totalItems = 0;
let totalTMs = 0;
let totalEvents = 0;
const emptyLocations: string[] = [];

for (const [locKey, locData] of Object.entries(johto.locations) as [
  string,
  any,
][]) {
  // Trainers
  const rawTrainers = trainersByLocation[locKey] || [];
  locData.trainers = markRematches(rawTrainers);
  totalTrainers += locData.trainers.length;

  // Items, TMs, Events from Bulbapedia
  const bulb = bulbapedia[locKey];
  if (bulb) {
    locData.items = bulb.items || [];
    locData.tms = bulb.tms || [];
    locData.events = bulb.events || [];
  } else {
    locData.items = locData.items || [];
    locData.tms = locData.tms || [];
    locData.events = locData.events || [];
  }

  totalItems += locData.items.length;
  totalTMs += locData.tms.length;
  totalEvents += locData.events.length;

  // Encounters + milestones stay as-is

  // Flag locations with nothing
  const hasTrainers = locData.trainers.length > 0;
  const hasEncounters = (locData.encounters || []).length > 0;
  const hasItems = locData.items.length > 0;
  const hasTMs = locData.tms.length > 0;
  const hasEvents = locData.events.length > 0;

  if (!hasTrainers && !hasEncounters && !hasItems && !hasTMs && !hasEvents) {
    emptyLocations.push(locKey);
  }
}

// ── Write output ────────────────────────────────────────────────────────────

writeFileSync(
  join(DATA_DIR, "johto-gen2.json"),
  JSON.stringify(johto, null, 2) + "\n",
  "utf-8"
);

// ── Verification ────────────────────────────────────────────────────────────

console.log("\n=== Johto Data Merge Complete ===\n");
console.log(`Trainers:  ${totalTrainers}`);
console.log(`Items:     ${totalItems}`);
console.log(`TMs:       ${totalTMs}`);
console.log(`Events:    ${totalEvents}`);
console.log(`Locations: ${Object.keys(johto.locations).length}`);

if (emptyLocations.length > 0) {
  console.log(`\n⚠ Locations with ALL empty arrays (${emptyLocations.length}):`);
  for (const loc of emptyLocations) {
    console.log(`  - ${loc}`);
  }
}

// ── Spot checks ─────────────────────────────────────────────────────────────

console.log("\n=== Spot Checks ===\n");

// violet-city: Falkner + TM31 + Defeat Falkner event
const violet = johto.locations["violet-city"];
const hasFalkner = violet.trainers.some(
  (t: any) => t.trainer_name === "Falkner"
);
const hasTM31 = violet.tms.some((t: any) => t.tm_number === 31);
const hasFalknerEvent = violet.events.some(
  (e: any) => e.event_name === "Defeat Falkner"
);
console.log(
  `violet-city: Falkner=${hasFalkner}, TM31=${hasTM31}, Defeat Falkner event=${hasFalknerEvent}`
);

// route-30: Joey as first trainer
const route30 = johto.locations["route-30"];
const firstTrainer = route30.trainers[0];
console.log(
  `route-30: first trainer = ${firstTrainer?.trainer_name} (expected Joey)`
);
const joeyCount = route30.trainers.filter(
  (t: any) => t.trainer_name === "Joey"
).length;
const joeyRematches = route30.trainers.filter(
  (t: any) => t.trainer_name === "Joey" && t.is_rematchable
).length;
console.log(
  `route-30: Joey entries=${joeyCount}, rematchable=${joeyRematches}`
);

// goldenrod-city: Whitney + multiple trainers + items + events
const goldenrod = johto.locations["goldenrod-city"];
const hasWhitney = goldenrod.trainers.some(
  (t: any) => t.trainer_name === "Whitney"
);
console.log(
  `goldenrod-city: Whitney=${hasWhitney}, trainers=${goldenrod.trainers.length}, items=${goldenrod.items.length}, events=${goldenrod.events.length}`
);

console.log("\nDone.");
