import db from './db.js';
import pokeApi from './services/pokeApi.js';

const TOTAL_POKEMON = 1025;
const BATCH_SIZE = 10;
const SPRITE_BASE = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon`;

const COSPLAY_PIKACHU = new Set([
  'pikachu-cosplay', 'pikachu-rock-star', 'pikachu-belle',
  'pikachu-pop-star', 'pikachu-phd', 'pikachu-libre',
]);

const CAP_PIKACHU_PATTERN = /^pikachu-.*cap$/;

const GEN_MAP: Record<string, number> = {
  'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3,
  'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6,
  'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
};

type FormCategory = 'standard' | 'regional' | 'mega' | 'gmax' | 'primal' | 'battle_only' | 'cosmetic' | 'gender' | 'totem' | 'event';

// Name-based classification (PokeAPI form flags are unreliable — is_mega/is_battle_only
// often return false even for megas). We classify entirely by name patterns.
function classifyForm(name: string, isDefault: boolean, isBattleOnlyApi: boolean): FormCategory {
  if (isDefault) return 'standard';
  // Cap Pikachu must come before regional check (pikachu-alola-cap contains "-alola")
  if (CAP_PIKACHU_PATTERN.test(name)) return 'event';
  if (/-mega(-[xy])?$/.test(name)) return 'mega';
  if (name.endsWith('-gmax')) return 'gmax';
  if (name.endsWith('-primal')) return 'primal';
  if (name.includes('-alola')) return 'regional';
  if (name.includes('-galar')) return 'regional';
  if (name.includes('-hisui')) return 'regional';
  if (name.includes('-paldea')) return 'regional';
  if (name.includes('-totem')) return 'totem';
  if (name.endsWith('-female') || name.endsWith('-male')) return 'gender';
  // Use API flag as fallback for other battle-only forms
  if (isBattleOnlyApi) return 'battle_only';
  return 'cosmetic';
}

function isBattleOnlyForm(category: FormCategory): boolean {
  return category === 'mega' || category === 'gmax' || category === 'primal' || category === 'battle_only';
}

function formGeneration(name: string, category: FormCategory, speciesGen: number): number | null {
  if (category === 'mega') return 6;
  if (category === 'gmax') return 8;
  if (name.includes('-alola')) return 7;
  if (name.includes('-galar')) return 8;
  if (name.includes('-hisui')) return 8;
  if (name.includes('-paldea')) return 9;
  // For standard/other forms, inherit from species (null means inherit)
  return null;
}

function prettyFormName(pokemonName: string, baseName: string): string {
  if (pokemonName === baseName) return 'Standard';
  // Strip the base name prefix (e.g. "venusaur-mega" -> "mega")
  let suffix = pokemonName;
  if (pokemonName.startsWith(baseName + '-')) {
    suffix = pokemonName.slice(baseName.length + 1);
  }
  // Capitalize words, replace hyphens with spaces
  return suffix
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface BaseData {
  types: string[];
  abilities: string[];
  hiddenAbility: string | null;
  stats: Record<string, number>;
}

function extractPokemonData(pokemon: any): BaseData {
  const types = pokemon.types.map((t: any) => t.type.name);
  const abilities = pokemon.abilities.filter((a: any) => !a.is_hidden).map((a: any) => a.ability.name);
  const hiddenAbility = pokemon.abilities.find((a: any) => a.is_hidden)?.ability.name || null;
  const stats = Object.fromEntries(pokemon.stats.map((s: any) => [s.stat.name, s.base_stat]));
  return { types, abilities, hiddenAbility, stats };
}

function diffOrNull<T>(formVal: T, baseVal: T): T | null {
  return formVal === baseVal ? null : formVal;
}

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO species_forms (
    species_id, form_name, form_order, sprite_url, shiny_sprite_url,
    pokeapi_id, form_category, is_battle_only, is_collectible,
    type1, type2, ability1, ability2, hidden_ability,
    base_hp, base_attack, base_defense, base_sp_attack, base_sp_defense, base_speed,
    generation
  ) VALUES (
    $species_id, $form_name, $form_order, $sprite_url, $shiny_sprite_url,
    $pokeapi_id, $form_category, $is_battle_only, $is_collectible,
    $type1, $type2, $ability1, $ability2, $hidden_ability,
    $base_hp, $base_attack, $base_defense, $base_sp_attack, $base_sp_defense, $base_speed,
    $generation
  )
`);

async function seedSpeciesForms(speciesId: number): Promise<void> {
  try {
    const species = await pokeApi.getPokemonSpeciesByName(speciesId) as any;
    const baseName = species.name;
    const speciesGen = GEN_MAP[species.generation.name] || 1;

    // Sort varieties: default first
    const varieties = [...species.varieties].sort((a: any, b: any) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return 0;
    });

    // Fetch base (default) variety data first
    const defaultVariety = varieties.find((v: any) => v.is_default) || varieties[0];
    const defaultPokemonId = extractIdFromUrl(defaultVariety.pokemon.url);
    const defaultPokemon = await pokeApi.getPokemonByName(defaultPokemonId) as any;
    const base = extractPokemonData(defaultPokemon);

    for (let i = 0; i < varieties.length; i++) {
      const variety = varieties[i];
      const pokemonName = variety.pokemon.name;
      const pokemonId = extractIdFromUrl(variety.pokemon.url);
      const isDefault = variety.is_default;

      try {
        // Fetch pokemon data (reuse default if already fetched)
        const pokemon = isDefault ? defaultPokemon : await pokeApi.getPokemonByName(pokemonId) as any;

        // Fetch form data for flags
        let formData: any;
        try {
          formData = await pokeApi.getPokemonFormByName(pokemonId) as any;
        } catch {
          // Some forms don't have form data; use defaults
          formData = { is_mega: false, is_battle_only: false };
        }

        const isBattleOnlyApi = formData.is_battle_only || false;
        const category = classifyForm(pokemonName, isDefault, isBattleOnlyApi);
        const battleOnly = isBattleOnlyForm(category);
        const formName = prettyFormName(pokemonName, baseName);

        const data = extractPokemonData(pokemon);

        // Determine collectibility
        let isCollectible = battleOnly ? 0 : 1;
        if (COSPLAY_PIKACHU.has(pokemonName)) isCollectible = 0;

        // Diff against base for non-default forms
        let type1: string | null = null;
        let type2: string | null = null;
        let ability1: string | null = null;
        let ability2: string | null = null;
        let hiddenAbility: string | null = null;
        let baseHp: number | null = null;
        let baseAttack: number | null = null;
        let baseDefense: number | null = null;
        let baseSpAttack: number | null = null;
        let baseSpDefense: number | null = null;
        let baseSpeed: number | null = null;
        let generation: number | null = null;

        if (!isDefault) {
          type1 = diffOrNull(data.types[0], base.types[0]);
          // type2: if form drops type2 that base has, store '' (empty string)
          const formType2 = data.types[1] || null;
          const baseType2 = base.types[1] || null;
          if (formType2 !== baseType2) {
            type2 = formType2 === null ? '' : formType2;
          }
          ability1 = diffOrNull(data.abilities[0] || null, base.abilities[0] || null);
          ability2 = diffOrNull(data.abilities[1] || null, base.abilities[1] || null);
          hiddenAbility = diffOrNull(data.hiddenAbility, base.hiddenAbility);
          baseHp = diffOrNull(data.stats['hp'], base.stats['hp']);
          baseAttack = diffOrNull(data.stats['attack'], base.stats['attack']);
          baseDefense = diffOrNull(data.stats['defense'], base.stats['defense']);
          baseSpAttack = diffOrNull(data.stats['special-attack'], base.stats['special-attack']);
          baseSpDefense = diffOrNull(data.stats['special-defense'], base.stats['special-defense']);
          baseSpeed = diffOrNull(data.stats['speed'], base.stats['speed']);
          generation = formGeneration(pokemonName, category, speciesGen);
        }

        insertStmt.run({
          $species_id: speciesId,
          $form_name: formName,
          $form_order: formData?.form_order ?? i,
          $sprite_url: `${SPRITE_BASE}/${pokemonId}.png`,
          $shiny_sprite_url: `${SPRITE_BASE}/shiny/${pokemonId}.png`,
          $pokeapi_id: pokemonId,
          $form_category: category,
          $is_battle_only: battleOnly ? 1 : 0,
          $is_collectible: isCollectible,
          $type1: type1,
          $type2: type2,
          $ability1: ability1,
          $ability2: ability2,
          $hidden_ability: hiddenAbility,
          $base_hp: baseHp,
          $base_attack: baseAttack,
          $base_defense: baseDefense,
          $base_sp_attack: baseSpAttack,
          $base_sp_defense: baseSpDefense,
          $base_speed: baseSpeed,
          $generation: generation,
        });
      } catch (err) {
        console.error(`  Failed to seed form ${pokemonName} for species #${speciesId}:`, err);
      }
    }
  } catch (err) {
    console.error(`Failed to seed forms for species #${speciesId}:`, err);
  }
}

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

export async function seedForms(): Promise<void> {
  const existing = db.prepare(
    'SELECT COUNT(*) as count FROM species_forms WHERE pokeapi_id IS NOT NULL'
  ).get() as { count: number };

  if (existing.count > 100) {
    console.log(`species_forms already has ${existing.count} rows with pokeapi_id. Skipping form seed.`);
    return;
  }

  console.log(`Seeding forms for ${TOTAL_POKEMON} species from PokeAPI...`);
  const startTime = Date.now();

  for (let i = 1; i <= TOTAL_POKEMON; i += BATCH_SIZE) {
    const ids: number[] = [];
    for (let id = i; id < i + BATCH_SIZE && id <= TOTAL_POKEMON; id++) {
      ids.push(id);
    }
    await Promise.all(ids.map(id => seedSpeciesForms(id)));
    const end = Math.min(i + BATCH_SIZE - 1, TOTAL_POKEMON);
    const pct = Math.round((end / TOTAL_POKEMON) * 100);
    console.log(`  Forms: ${end}/${TOTAL_POKEMON} (${pct}%)`);
  }

  const count = (db.prepare('SELECT COUNT(*) as count FROM species_forms').get() as { count: number }).count;
  const nonStd = (db.prepare("SELECT COUNT(*) as c FROM species_forms WHERE form_category != 'standard'").get() as { c: number }).c;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done! Seeded ${count} forms (${nonStd} non-standard) in ${elapsed}s`);
}
