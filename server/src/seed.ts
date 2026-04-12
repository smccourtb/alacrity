import db from './db.js';
import pokeApi from './services/pokeApi.js';
import { seedMoves } from './seedMoves.js';
import { seedForms } from './seedForms.js';

const TOTAL_POKEMON = 1025;
const BATCH_SIZE = 50;

const GEN_MAP: Record<string, number> = {
  'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3,
  'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6,
  'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
};

// Growth rate name → numeric ID (matches pkDecoder.ts computeLevel)
const GROWTH_RATE_MAP: Record<string, number> = {
  'medium': 0, 'medium-fast': 0,
  'erratic': 1,
  'fluctuating': 2,
  'medium-slow': 3,
  'fast': 4,
  'slow': 5,
};

async function seedBatch(start: number, end: number) {
  const ids = [];
  for (let id = start; id <= end && id <= TOTAL_POKEMON; id++) {
    ids.push(id);
  }
  await Promise.all(ids.map(id => seedPokemon(id)));
}

async function seedPokemon(id: number) {
  try {
    const [pokemon, species] = await Promise.all([
      pokeApi.getPokemonByName(id) as Promise<any>,
      pokeApi.getPokemonSpeciesByName(id) as Promise<any>,
    ]);

    const types = pokemon.types.map((t: any) => t.type.name);
    const abilities = pokemon.abilities.filter((a: any) => !a.is_hidden).map((a: any) => a.ability.name);
    const hiddenAbility = pokemon.abilities.find((a: any) => a.is_hidden)?.ability.name || null;
    const statMap = Object.fromEntries(pokemon.stats.map((s: any) => [s.stat.name, s.base_stat]));
    const gen = GEN_MAP[species.generation.name] || 1;
    const genderRate = species.gender_rate ?? -1;
    const growthRate = GROWTH_RATE_MAP[species.growth_rate?.name] ?? null;

    const spriteBase = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon`;

    db.prepare(`
      INSERT OR REPLACE INTO species (
        id, name, type1, type2, ability1, ability2, hidden_ability,
        sprite_url, shiny_sprite_url,
        base_hp, base_attack, base_defense, base_sp_attack, base_sp_defense, base_speed,
        generation, gender_rate, growth_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, pokemon.name, types[0], types[1] || null,
      abilities[0] || null, abilities[1] || null, hiddenAbility,
      `${spriteBase}/${id}.png`, `${spriteBase}/shiny/${id}.png`,
      statMap['hp'], statMap['attack'], statMap['defense'],
      statMap['special-attack'], statMap['special-defense'], statMap['speed'],
      gen, genderRate, growthRate
    );
  } catch (err) {
    console.error(`Failed to seed Pokemon #${id}:`, err);
  }
}

async function main() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM species').get() as { count: number };
  if (existing.count >= TOTAL_POKEMON) {
    console.log(`Database already has ${existing.count} species. Skipping seed.`);
    await seedMoves();
    await seedForms();
    return;
  }

  console.log(`Seeding ${TOTAL_POKEMON} Pokemon from PokeAPI...`);
  const startTime = Date.now();

  for (let i = 1; i <= TOTAL_POKEMON; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE - 1, TOTAL_POKEMON);
    await seedBatch(i, end);
    const pct = Math.round((end / TOTAL_POKEMON) * 100);
    console.log(`  ${end}/${TOTAL_POKEMON} (${pct}%)`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const count = (db.prepare('SELECT COUNT(*) as count FROM species').get() as { count: number }).count;
  console.log(`Done! Seeded ${count} species in ${elapsed}s`);
  await seedMoves();
  await seedForms();
}

main().catch(console.error);
