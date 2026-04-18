import db from './db.js';
import pokeApi from './services/pokeApi.js';

/**
 * Backfill breeding metadata on existing species rows: hatch_counter, is_baby,
 * and egg group memberships. Runs at startup; no-op once every species has
 * been filled. PokeAPI caches responses for 5 days so repeated runs are free.
 */
export async function backfillHatchCounters(): Promise<void> {
  const missing = db.prepare(`
    SELECT id FROM species
    WHERE hatch_counter IS NULL
       OR NOT EXISTS (SELECT 1 FROM species_egg_groups WHERE species_id = species.id)
    ORDER BY id
  `).all() as Array<{ id: number }>;

  if (missing.length === 0) return;

  console.log(`[breeding-backfill] filling ${missing.length} species from PokeAPI...`);
  const updateSpecies = db.prepare(
    'UPDATE species SET hatch_counter = ?, is_baby = ? WHERE id = ?'
  );
  const deleteGroups = db.prepare('DELETE FROM species_egg_groups WHERE species_id = ?');
  const insertGroup = db.prepare('INSERT OR IGNORE INTO species_egg_groups (species_id, egg_group) VALUES (?, ?)');

  const BATCH = 50;
  let filled = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    await Promise.all(batch.map(async ({ id }) => {
      try {
        const species = await pokeApi.getPokemonSpeciesByName(id) as any;
        const hc = typeof species?.hatch_counter === 'number' ? species.hatch_counter : null;
        const baby = species?.is_baby ? 1 : 0;
        updateSpecies.run(hc, baby, id);

        const groups: string[] = (species?.egg_groups ?? []).map((g: any) => g.name);
        deleteGroups.run(id);
        for (const g of groups) insertGroup.run(id, g);
        filled++;
      } catch {
        // network blip — skip; next startup retries
      }
    }));
  }
  console.log(`[breeding-backfill] filled ${filled} species`);
}
