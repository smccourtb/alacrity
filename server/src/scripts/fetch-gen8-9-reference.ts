/**
 * Fetches per-game Pokédex membership for Gen 8/9 from PokeAPI's /pokedex
 * endpoint. Output: { [game]: { [dex_name]: [{ species_id, dex_number }] } }.
 *
 * Run: bun run server/src/scripts/fetch-gen8-9-reference.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POKEAPI = 'https://pokeapi.co/api/v2';

// Map game → list of pokedexes available in that game.
// Pokédex names match PokeAPI's `name` field (slug form).
const GAME_DEXES: Record<string, string[]> = {
  sword:             ['galar', 'isle-of-armor', 'crown-tundra'],
  shield:            ['galar', 'isle-of-armor', 'crown-tundra'],
  // PokeAPI has no 'updated-sinnoh' slug (404). 'original-sinnoh' is the
  // 151-entry Sinnoh regional dex shared by DP and BDSP; it is the only
  // BDSP-specific pokedex PokeAPI exposes. Extended national coverage in BDSP
  // is tracked via the national dex, not a separate BDSP pokedex object.
  'brilliant-diamond': ['original-sinnoh'],
  'shining-pearl':     ['original-sinnoh'],
  'legends-arceus':  ['hisui'],
  scarlet:           ['paldea', 'kitakami', 'blueberry'],
  violet:            ['paldea', 'kitakami', 'blueberry'],
  // Z-A pokedex(es) are filled in by fetch-za-data.ts; left empty here on
  // purpose so re-running this script doesn't clobber Z-A data.
};

interface DexEntry { species_id: number; dex_number: number; }

async function fetchDex(name: string): Promise<DexEntry[]> {
  const r = await fetch(`${POKEAPI}/pokedex/${name}`);
  if (!r.ok) throw new Error(`PokeAPI /pokedex/${name} → ${r.status}`);
  const j = await r.json() as any;
  return j.pokemon_entries.map((e: any) => ({
    species_id: Number(e.pokemon_species.url.match(/\/pokemon-species\/(\d+)\//)?.[1]),
    dex_number: e.entry_number,
  })).filter((e: DexEntry) => Number.isFinite(e.species_id));
}

async function main() {
  const out: Record<string, Record<string, DexEntry[]>> = {};
  const seen = new Map<string, DexEntry[]>();
  for (const [game, dexes] of Object.entries(GAME_DEXES)) {
    out[game] = {};
    for (const dex of dexes) {
      let entries = seen.get(dex);
      if (!entries) {
        console.log(`  fetching pokedex/${dex}`);
        entries = await fetchDex(dex);
        seen.set(dex, entries);
      }
      out[game][dex] = entries;
    }
  }
  const path = join(import.meta.dir, '..', 'seeds', 'data', 'gen8-9-reference.json');
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${path}`);
  for (const [game, dexes] of Object.entries(out)) {
    const total = Object.values(dexes).reduce((n, e) => n + e.length, 0);
    console.log(`  ${game}: ${total} entries across ${Object.keys(dexes).length} dexes`);
  }
}

await main();
