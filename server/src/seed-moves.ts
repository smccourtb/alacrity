import db from './db.js';
import pokeApi from './services/pokeApi.js';

// Seed move and ability names from PokeAPI into lookup tables

export async function seedLookupTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS move_names (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ability_names (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  const moveCount = (db.prepare('SELECT COUNT(*) as c FROM move_names').get() as any).c;
  const abilityCount = (db.prepare('SELECT COUNT(*) as c FROM ability_names').get() as any).c;

  if (moveCount > 800 && abilityCount > 250) {
    console.log(`Lookup tables already seeded (${moveCount} moves, ${abilityCount} abilities).`);
    return;
  }

  console.log('Seeding move and ability lookup tables...');

  // Fetch all moves and abilities in parallel
  const [movesList, abilitiesList] = await Promise.all([
    pokeApi.getMovesList({ limit: 10000 }),
    pokeApi.getAbilitiesList({ limit: 10000 }),
  ]);

  const insertMove = db.prepare('INSERT OR REPLACE INTO move_names (id, name) VALUES (?, ?)');
  for (const m of movesList.results) {
    const id = parseInt(m.url.split('/').filter(Boolean).pop()!);
    insertMove.run(id, m.name.replace(/-/g, ' '));
  }
  console.log(`  Seeded ${movesList.results.length} moves`);

  const insertAbility = db.prepare('INSERT OR REPLACE INTO ability_names (id, name) VALUES (?, ?)');
  for (const a of abilitiesList.results) {
    const id = parseInt(a.url.split('/').filter(Boolean).pop()!);
    insertAbility.run(id, a.name.replace(/-/g, ' '));
  }
  console.log(`  Seeded ${abilitiesList.results.length} abilities`);
}

// Sync resolve functions using the DB tables
export function resolveMoveName(id: number): string {
  if (id === 0) return '';
  const row = db.prepare('SELECT name FROM move_names WHERE id = ?').get(id) as any;
  return row?.name || `move-${id}`;
}

export function resolveAbilityName(id: number): string {
  if (id === 0) return '';
  const row = db.prepare('SELECT name FROM ability_names WHERE id = ?').get(id) as any;
  return row?.name || `ability-${id}`;
}
