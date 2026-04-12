import db from './db.js';

const POKE_API = 'https://pokeapi.co/api/v2';
const BATCH_SIZE = 50;

async function fetchMove(id: number): Promise<void> {
  try {
    const res = await fetch(`${POKE_API}/move/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    db.prepare(`
      INSERT OR IGNORE INTO moves (name, type, category, power, accuracy, pp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.name, data.type.name, data.damage_class.name, data.power, data.accuracy, data.pp);
  } catch (err) {
    console.error(`Failed to seed move #${id}:`, err);
  }
}

export async function seedMoves(): Promise<void> {
  const existing = db.prepare('SELECT COUNT(*) as count FROM moves').get() as { count: number };
  if (existing.count > 800) {
    console.log(`Moves table already has ${existing.count} entries. Skipping.`);
    return;
  }
  const totalMoves = 920;
  console.log(`Seeding ${totalMoves} moves from PokeAPI...`);
  const startTime = Date.now();
  for (let i = 1; i <= totalMoves; i += BATCH_SIZE) {
    const ids = [];
    for (let id = i; id < i + BATCH_SIZE && id <= totalMoves; id++) ids.push(id);
    await Promise.all(ids.map(id => fetchMove(id)));
    const pct = Math.round((Math.min(i + BATCH_SIZE - 1, totalMoves) / totalMoves) * 100);
    console.log(`  Moves: ${Math.min(i + BATCH_SIZE - 1, totalMoves)}/${totalMoves} (${pct}%)`);
  }
  const count = (db.prepare('SELECT COUNT(*) as count FROM moves').get() as { count: number }).count;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done! Seeded ${count} moves in ${elapsed}s`);
}
