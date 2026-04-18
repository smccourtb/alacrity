import db from './db.js';
import pokeApi from './services/pokeApi.js';

// Natures never change. We seed once; subsequent calls are no-ops.
export async function seedNatures(): Promise<void> {
  const existing = db.prepare('SELECT COUNT(*) as count FROM natures').get() as { count: number };
  if (existing.count >= 25) return;

  const list = (await pokeApi.getNaturesList()) as { results: Array<{ name: string }> };
  const insert = db.prepare(
    'INSERT OR REPLACE INTO natures (id, name, increased_stat, decreased_stat, is_neutral) VALUES (?, ?, ?, ?, ?)'
  );

  let inserted = 0;
  for (const entry of list.results) {
    try {
      const nature = await pokeApi.getNatureByName(entry.name) as any;
      const increased = nature.increased_stat?.name ?? null;
      const decreased = nature.decreased_stat?.name ?? null;
      const neutral = !increased && !decreased ? 1 : 0;
      const displayName = nature.name.charAt(0).toUpperCase() + nature.name.slice(1);
      insert.run(nature.id, displayName, increased, decreased, neutral);
      inserted++;
    } catch (err) {
      console.error(`Failed to seed nature ${entry.name}:`, err);
    }
  }
  console.log(`Seeded ${inserted} natures`);
}
