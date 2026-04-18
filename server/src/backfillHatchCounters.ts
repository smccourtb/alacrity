import db from './db.js';
import pokeApi from './services/pokeApi.js';

/**
 * One-time backfill for hatch_counter on existing species rows. Runs at
 * startup; no-op once every species has a counter. PokeAPI caches responses
 * for 5 days so repeated runs are essentially free after the first.
 */
export async function backfillHatchCounters(): Promise<void> {
  const missing = db.prepare(
    'SELECT id FROM species WHERE hatch_counter IS NULL ORDER BY id'
  ).all() as Array<{ id: number }>;

  if (missing.length === 0) return;

  console.log(`[hatch_counter] backfilling ${missing.length} species from PokeAPI...`);
  const update = db.prepare('UPDATE species SET hatch_counter = ? WHERE id = ?');

  const BATCH = 50;
  let filled = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    await Promise.all(batch.map(async ({ id }) => {
      try {
        const species = await pokeApi.getPokemonSpeciesByName(id) as any;
        if (typeof species?.hatch_counter === 'number') {
          update.run(species.hatch_counter, id);
          filled++;
        }
      } catch {
        // network blip — skip, next startup will retry the remainder
      }
    }));
  }
  console.log(`[hatch_counter] filled ${filled} species`);
}
