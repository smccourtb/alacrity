import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paths } from './paths.js';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const FORMS_BATCH_SIZE = 50;

function loadJson(filename: string) {
  return JSON.parse(readFileSync(join(paths.referenceDataDir, filename), 'utf-8'));
}

export function seedRibbons(db: Database) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM ribbons').get() as any;
  if (existing.count >= 93) return;

  const ribbonsData = loadJson('ribbons.json');

  const insert = db.prepare(`
    INSERT OR REPLACE INTO ribbons (name, category, how_to_obtain, games, prerequisites, sprite_key, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const r of ribbonsData) {
      insert.run(
        r.name,
        r.category,
        r.how_to_obtain,
        JSON.stringify(r.games),
        r.prerequisites ? JSON.stringify(r.prerequisites) : null,
        r.sprite_key,
        r.sort_order
      );
    }
  });
  tx();
  console.log(`Seeded ${ribbonsData.length} ribbons`);
}

export function seedMarks(db: Database) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM marks').get() as any;
  if (existing.count >= 54) return;

  const marksData = loadJson('marks.json');

  const insert = db.prepare(`
    INSERT OR REPLACE INTO marks (name, category, how_to_obtain, games, title_suffix, sprite_key, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const m of marksData) {
      insert.run(m.name, m.category, m.how_to_obtain, JSON.stringify(m.games), m.title_suffix, m.sprite_key, m.sort_order);
    }
  });
  tx();
  console.log(`Seeded ${marksData.length} marks`);
}

export function seedBalls(db: Database) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM balls').get() as any;
  if (existing.count >= 28) return;

  const ballsData = loadJson('balls.json');

  const insert = db.prepare(`
    INSERT OR REPLACE INTO balls (name, games, sprite_key, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const b of ballsData) {
      insert.run(b.name, JSON.stringify(b.games), b.sprite_key, b.sort_order);
    }
  });
  tx();
  console.log(`Seeded ${ballsData.length} balls`);
}

export function seedShinyMethods(db: Database) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM shiny_methods').get() as any;
  if (existing.count > 0) return;
  const data = loadJson('shiny-methods.json');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO shiny_methods (species_id, game, method, odds, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const m of data) {
      insert.run(m.species_id, m.game, m.method, m.odds, m.notes);
    }
  });
  tx();
  console.log(`Seeded ${data.length} shiny methods`);
}

function extractPokemonIdFromUrl(url: string): number {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractFormName(speciesName: string, varietyName: string): string {
  if (varietyName === speciesName) return 'Standard';
  // Remove species name prefix (e.g. "charizard-mega-x" -> "mega-x")
  const prefix = speciesName + '-';
  const remainder = varietyName.startsWith(prefix)
    ? varietyName.slice(prefix.length)
    : varietyName;
  // Split by hyphen, titlecase each word, join with space
  return remainder
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface SpeciesApiResponse {
  name: string;
  has_gender_differences: boolean;
  varieties: Array<{
    is_default: boolean;
    pokemon: { name: string; url: string };
  }>;
}

async function fetchSpeciesData(speciesId: number): Promise<SpeciesApiResponse> {
  const res = await fetch(`${POKEAPI_BASE}/pokemon-species/${speciesId}`);
  if (!res.ok) throw new Error(`PokeAPI species ${speciesId} returned ${res.status}`);
  return res.json() as Promise<SpeciesApiResponse>;
}

export function seedLegality(db: Database) {
  // Skip if already seeded (check if ball_permit is populated)
  const check = db.prepare('SELECT ball_permit FROM species WHERE id = 1').get() as any;
  if (check?.ball_permit > 0) return;

  console.log('Seeding legality data...');

  // 1. Ball permits
  const ballPermits: number[] = loadJson('legality-ball-permits.json');
  const updatePermit = db.prepare('UPDATE species SET ball_permit = ? WHERE id = ?');
  const txPermits = db.transaction(() => {
    for (let i = 0; i < ballPermits.length; i++) {
      updatePermit.run(ballPermits[i], i + 1); // index 0 = species 1
    }
  });
  txPermits();
  console.log(`  Updated ${ballPermits.length} species with ball_permit`);

  // 2. Species categories
  const categories: Record<string, string> = loadJson('legality-species-categories.json');
  const updateCategory = db.prepare('UPDATE species SET category = ? WHERE id = ?');
  const txCategories = db.transaction(() => {
    for (const [id, category] of Object.entries(categories)) {
      updateCategory.run(category, Number(id));
    }
  });
  txCategories();
  console.log(`  Updated ${Object.keys(categories).length} species with category`);

  // 3. HA availability — most species got HA in Gen 5 (Dream World) or their debut gen
  // Default: ha_gen = MAX(5, generation) for species with a hidden_ability
  db.exec(`UPDATE species SET ha_gen = MAX(5, generation) WHERE hidden_ability IS NOT NULL`);
  // Override for species that got HA later than their debut gen:
  // Gen 1-4 species that didn't get HA until Gen 7+ (Island Scan, SOS, etc.)
  // or species whose HA was unavailable in Gen 5 Dream World
  const haOverrides: Record<number, number> = {
    // Kanto starters got HA in Gen 5 via Dream World event (correct at 5)
    // Fossil Pokemon: HA available via Dream World Gen 5 (correct)
    // Gen 7 new Pokemon with HA via SOS only:
    // (most Gen 7 mons debut at gen 7, so MAX(5,7)=7 is correct)
    // Species that only got HA via Ability Patch in Gen 8:
    // Galarian forms debuted in Gen 8, so MAX(5,8)=8 is correct
    // No widespread exceptions needed — the MAX(5, generation) formula
    // is correct for the vast majority of cases.
  };
  if (Object.keys(haOverrides).length > 0) {
    const updateHa = db.prepare('UPDATE species SET ha_gen = ? WHERE id = ?');
    for (const [id, gen] of Object.entries(haOverrides)) {
      updateHa.run(gen, Number(id));
    }
  }
  const haCount = db.prepare('SELECT COUNT(*) as count FROM species WHERE ha_gen IS NOT NULL').get() as any;
  console.log(`  Updated ${haCount.count} species with ha_gen`);

  // 4. Shiny locks
  const shinyLocks: Array<{ species_id: number; form: number; game: string }> = loadJson('legality-shiny-locks.json');
  const insertLock = db.prepare('INSERT OR IGNORE INTO shiny_locks (species_id, form, game) VALUES (?, ?, ?)');
  const txLocks = db.transaction(() => {
    for (const lock of shinyLocks) {
      insertLock.run(lock.species_id, lock.form, lock.game);
    }
  });
  txLocks();
  console.log(`  Seeded ${shinyLocks.length} shiny locks`);

  // 5. Game versions
  const gameVersions: any[] = loadJson('legality-game-versions.json');
  const insertVersion = db.prepare(`
    INSERT OR REPLACE INTO game_versions (id, name, generation, origin_mark, max_species_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const txVersions = db.transaction(() => {
    for (const gv of gameVersions) {
      insertVersion.run(gv.id, gv.name, gv.generation, gv.origin_mark, gv.max_species_id, gv.sort_order);
    }
  });
  txVersions();
  console.log(`  Seeded ${gameVersions.length} game versions`);
}

export async function seedForms(db: Database): Promise<void> {
  const existing = db.prepare('SELECT COUNT(*) as count FROM species_forms').get() as any;
  if (existing.count > 0) {
    console.log(`Forms already seeded (${existing.count} rows). Skipping.`);
    return;
  }

  const allSpecies = db.prepare('SELECT id, name FROM species ORDER BY id').all() as Array<{ id: number; name: string }>;
  const total = allSpecies.length;
  console.log(`Seeding forms for ${total} species...`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO species_forms (species_id, form_name, form_order, sprite_url, shiny_sprite_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  let totalForms = 0;

  for (let i = 0; i < total; i += FORMS_BATCH_SIZE) {
    const batch = allSpecies.slice(i, i + FORMS_BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (species) => {
        try {
          const data = await fetchSpeciesData(species.id);
          return { species, data };
        } catch (err) {
          console.error(`  Failed to fetch species ${species.id} (${species.name}):`, err);
          return null;
        }
      })
    );

    const tx = db.transaction(() => {
      for (const result of results) {
        if (!result) continue;
        const { species, data } = result;

        for (let vi = 0; vi < data.varieties.length; vi++) {
          const variety = data.varieties[vi];
          const pokemonId = extractPokemonIdFromUrl(variety.pokemon.url);
          const formName = extractFormName(species.name, variety.pokemon.name);

          insert.run(
            species.id,
            formName,
            vi,
            pokemonId ? `${SPRITE_BASE}/${pokemonId}.png` : null,
            pokemonId ? `${SPRITE_BASE}/shiny/${pokemonId}.png` : null
          );
          totalForms++;
        }

        // Add Female form for species with gender differences
        if (data.has_gender_differences) {
          insert.run(
            species.id,
            'Female',
            data.varieties.length,
            `${SPRITE_BASE}/female/${species.id}.png`,
            `${SPRITE_BASE}/shiny/female/${species.id}.png`
          );
          totalForms++;
        }
      }
    });
    tx();

    const processed = Math.min(i + FORMS_BATCH_SIZE, total);
    console.log(`Forms: processed ${processed}/${total}`);
  }

  console.log(`Seeded ${totalForms} species forms`);
}
