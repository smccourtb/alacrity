/**
 * compute-movesets.ts
 *
 * Reads a trainer JSON file, fetches PokeAPI learnset data, and computes
 * what moves each Pokemon would know at its level in Gen 1.
 *
 * Gen 1 rule: collect all level-up moves where level_learned_at <= pokemon_level,
 * sort by level ascending, take the last 4.
 *
 * Usage: cd server && npx tsx src/scripts/compute-movesets.ts [filename]
 * Default filename: red-trainers-raw.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const CACHE_DIR = join(SCRIPT_DIR, ".cache", "pokeapi");
const DATA_DIR = join(SCRIPT_DIR, "..", "seeds", "data");

const POKEAPI_BASE = "https://pokeapi.co/api/v2/pokemon";
const DELAY_MS = 200;

interface VersionGroupDetail {
  level_learned_at: number;
  move_learn_method: { name: string };
  version_group: { name: string };
}

interface MoveEntry {
  move: { name: string };
  version_group_details: VersionGroupDetail[];
}

interface PokeApiPokemon {
  moves: MoveEntry[];
}

interface PartyMember {
  species_id: number;
  level: number;
  moves?: string[];
}

interface Trainer {
  location_key: string;
  trainer_class: string;
  trainer_name: string;
  is_boss: boolean;
  is_rematchable: boolean;
  party: PartyMember[];
}

function toTitleCase(hyphenated: string): string {
  return hyphenated
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPokemon(speciesId: number): Promise<PokeApiPokemon> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `pokemon-${speciesId}.json`);

  if (existsSync(cachePath)) {
    const raw = readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as PokeApiPokemon;
  }

  const url = `${POKEAPI_BASE}/${speciesId}`;
  console.log(`  Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokeAPI error ${res.status} for species ${speciesId}`);
  }
  const data = (await res.json()) as PokeApiPokemon;
  writeFileSync(cachePath, JSON.stringify(data, null, 2));
  await sleep(DELAY_MS);
  return data;
}

function computeMoves(pokemon: PokeApiPokemon, level: number): string[] {
  const eligible: Array<{ level: number; name: string }> = [];

  for (const entry of pokemon.moves) {
    for (const detail of entry.version_group_details) {
      if (
        detail.version_group.name === "red-blue" &&
        detail.move_learn_method.name === "level-up" &&
        detail.level_learned_at >= 1 &&
        detail.level_learned_at <= level
      ) {
        eligible.push({
          level: detail.level_learned_at,
          name: entry.move.name,
        });
        break; // only need the first matching detail per move
      }
    }
  }

  // Sort by level ascending, then take the last 4
  eligible.sort((a, b) => a.level - b.level);
  const last4 = eligible.slice(-4);
  return last4.map((m) => toTitleCase(m.name));
}

async function main() {
  const filename = process.argv[2] ?? "red-trainers-raw.json";
  const inputPath = join(DATA_DIR, filename);

  if (!existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading ${inputPath}`);
  const trainers: Trainer[] = JSON.parse(readFileSync(inputPath, "utf-8"));

  // Collect unique species IDs
  const uniqueSpecies = new Set<number>();
  for (const trainer of trainers) {
    for (const member of trainer.party) {
      uniqueSpecies.add(member.species_id);
    }
  }
  console.log(`Found ${uniqueSpecies.size} unique species across ${trainers.length} trainers`);

  // Fetch all species data (with caching)
  const pokemonCache = new Map<number, PokeApiPokemon>();
  let fetched = 0;
  let cached = 0;

  for (const speciesId of uniqueSpecies) {
    const cachePath = join(CACHE_DIR, `pokemon-${speciesId}.json`);
    const wasCached = existsSync(cachePath);
    const data = await fetchPokemon(speciesId);
    pokemonCache.set(speciesId, data);
    if (wasCached) {
      cached++;
    } else {
      fetched++;
    }
  }
  console.log(`API calls: ${fetched} fetched, ${cached} served from cache`);

  // Compute movesets
  for (const trainer of trainers) {
    for (const member of trainer.party) {
      const pokemon = pokemonCache.get(member.species_id)!;
      member.moves = computeMoves(pokemon, member.level);
    }
  }

  // Write back in-place
  writeFileSync(inputPath, JSON.stringify(trainers, null, 2));
  console.log(`\nWrote ${inputPath}`);

  // Spot-check: find Brock's Geodude (species 74) and Onix (species 95)
  console.log("\n--- Spot check ---");
  const brock = trainers.find(
    (t) =>
      t.trainer_class === "Brock" ||
      (t.trainer_name === "Brock") ||
      t.party.some((m) => m.species_id === 74 || m.species_id === 95)
  );
  if (brock) {
    console.log(`Trainer: ${brock.trainer_class} ${brock.trainer_name} @ ${brock.location_key}`);
    for (const m of brock.party) {
      console.log(`  Species ${m.species_id} L${m.level}: ${(m.moves ?? []).join(", ")}`);
    }
  } else {
    // Show first trainer with Geodude or Onix
    for (const t of trainers) {
      for (const m of t.party) {
        if (m.species_id === 74 || m.species_id === 95) {
          console.log(`  Species ${m.species_id} L${m.level}: ${(m.moves ?? []).join(", ")}`);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
