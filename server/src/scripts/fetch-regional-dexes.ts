/**
 * Fetches per-game Pokédex membership for every mainline game from PokeAPI's
 * /pokedex endpoint. Output: { [game]: { [dex_name]: [{ species_id, dex_number }] } }.
 *
 * Run: bun run server/src/scripts/fetch-regional-dexes.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POKEAPI = 'https://pokeapi.co/api/v2';

// Map game → list of pokedexes available in that game.
// Pokédex names match PokeAPI's `name` field (slug form).
// Colosseum, XD, and Pokémon GO have no regional Pokédex on PokeAPI; intentionally omitted.
const GAME_DEXES: Record<string, string[]> = {
  red:                 ['kanto'],
  blue:                ['kanto'],
  yellow:              ['kanto'],
  gold:                ['original-johto'],
  silver:              ['original-johto'],
  crystal:             ['original-johto'],
  ruby:                ['hoenn'],
  sapphire:            ['hoenn'],
  emerald:             ['hoenn'],
  firered:             ['kanto'],
  leafgreen:           ['kanto'],
  diamond:             ['original-sinnoh'],
  pearl:               ['original-sinnoh'],
  platinum:            ['extended-sinnoh'],
  heartgold:           ['updated-johto'],
  soulsilver:          ['updated-johto'],
  black:               ['original-unova'],
  white:               ['original-unova'],
  'black-2':           ['updated-unova'],
  'white-2':           ['updated-unova'],
  x:                   ['kalos-central', 'kalos-coastal', 'kalos-mountain'],
  y:                   ['kalos-central', 'kalos-coastal', 'kalos-mountain'],
  'omega-ruby':        ['updated-hoenn'],
  'alpha-sapphire':    ['updated-hoenn'],
  sun:                 ['original-alola', 'original-melemele', 'original-akala', 'original-ulaula', 'original-poni'],
  moon:                ['original-alola', 'original-melemele', 'original-akala', 'original-ulaula', 'original-poni'],
  'ultra-sun':         ['updated-alola', 'updated-melemele', 'updated-akala', 'updated-ulaula', 'updated-poni'],
  'ultra-moon':        ['updated-alola', 'updated-melemele', 'updated-akala', 'updated-ulaula', 'updated-poni'],
  'lets-go-pikachu':   ['letsgo-kanto'],
  'lets-go-eevee':     ['letsgo-kanto'],
  sword:               ['galar', 'isle-of-armor', 'crown-tundra'],
  shield:              ['galar', 'isle-of-armor', 'crown-tundra'],
  'brilliant-diamond': ['original-sinnoh'],
  'shining-pearl':     ['original-sinnoh'],
  'legends-arceus':    ['hisui'],
  scarlet:             ['paldea', 'kitakami', 'blueberry'],
  violet:              ['paldea', 'kitakami', 'blueberry'],
  'legends-z-a':       ['lumiose-city'],
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

function validate(seen: Map<string, DexEntry[]>) {
  const expected: Record<string, number> = {
    'kanto': 151,
    'paldea': 400,
    'galar': 400,
    'hisui': 242,
    'original-johto': 251,
    'updated-johto': 256,
    'hoenn': 202,
  };
  const errors: string[] = [];
  console.log('\nValidation:');
  for (const [dex, entries] of seen) {
    const exp = expected[dex];
    const tag = exp === undefined ? '' : entries.length === exp ? ' OK' : ` !! expected ${exp}`;
    console.log(`  ${dex}: ${entries.length}${tag}`);
    if (exp !== undefined && entries.length !== exp) {
      errors.push(`${dex} expected ${exp}, got ${entries.length}`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n  ${errors.join('\n  ')}`);
  }
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
  const path = join(import.meta.dir, '..', 'seeds', 'data', 'regional-dexes.json');
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${path}`);
  for (const [game, dexes] of Object.entries(out)) {
    const total = Object.values(dexes).reduce((n, e) => n + e.length, 0);
    const counts = Object.entries(dexes).map(([n, e]) => `${n}=${e.length}`).join(', ');
    console.log(`  ${game}: ${total} total (${counts})`);
  }
  validate(seen);
}

await main();
