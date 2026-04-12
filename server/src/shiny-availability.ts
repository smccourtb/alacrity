import db from './db.js';

// Source: https://bluemoonfalls.com/pages/shinies/gen-1-shiny-hunting
// Gen 1 has a faulty RNG that prevents shiny DVs in wild grass/cave encounters.
// Only these methods can produce shiny-eligible DVs.

interface ShinySource {
  species_name: string;
  game: string;
  method: string;
  source_url: string;
}

const SOURCE_URL = 'https://bluemoonfalls.com/pages/shinies/gen-1-shiny-hunting';

const entry = (name: string, game: string, method: string): ShinySource => ({
  species_name: name, game, method, source_url: SOURCE_URL,
});

const forGames = (names: string[], games: string[], method: string): ShinySource[] =>
  games.flatMap(game => names.map(name => entry(name, game, method)));

const GEN1_SHINY_SOURCES: ShinySource[] = [
  // === Stationary encounters (same across all three games) ===
  ...forGames(
    ['voltorb', 'electrode', 'snorlax', 'articuno', 'zapdos', 'moltres', 'mewtwo'],
    ['Red', 'Blue', 'Yellow'], 'Stationary',
  ),

  // === Gift Pokemon ===
  // Shared across all three
  ...forGames(
    ['hitmonlee', 'hitmonchan', 'magikarp', 'lapras', 'eevee', 'omanyte', 'kabuto', 'aerodactyl'],
    ['Red', 'Blue', 'Yellow'], 'Gift',
  ),
  // R/B: pick one starter (Bulbasaur, Charmander, or Squirtle)
  ...forGames(['bulbasaur', 'charmander', 'squirtle'], ['Red', 'Blue'], 'Gift'),
  // Yellow: all three starters as gifts + Pikachu as starter
  ...forGames(['bulbasaur', 'charmander', 'squirtle', 'pikachu'], ['Yellow'], 'Gift'),

  // === Game Corner ===
  // All three games
  ...forGames(['abra', 'porygon'], ['Red', 'Blue', 'Yellow'], 'Game Corner'),
  // Red + Blue only
  ...forGames(['clefairy', 'dratini'], ['Red', 'Blue'], 'Game Corner'),
  // Red only
  ...forGames(['nidorina', 'scyther'], ['Red'], 'Game Corner'),
  // Blue only
  ...forGames(['nidorino', 'pinsir'], ['Blue'], 'Game Corner'),
  // Yellow only
  ...forGames(['vulpix', 'wigglytuff', 'scyther', 'pinsir'], ['Yellow'], 'Game Corner'),

  // === In-Game Trades ===
  // Shared: Mr. Mime (different trade requirement but same result)
  ...forGames(['mr-mime'], ['Red', 'Blue', 'Yellow'], 'In-Game Trade'),
  // Red/Blue only
  ...forGames(
    ['nidoran-f', 'nidorina', 'lickitung', 'jynx', 'farfetchd', 'electrode', 'tangela', 'seel'],
    ['Red', 'Blue'], 'In-Game Trade',
  ),
  // Yellow only
  ...forGames(
    ['machamp', 'dugtrio', 'parasect', 'rhydon', 'dewgong', 'muk'],
    ['Yellow'], 'In-Game Trade',
  ),

  // === Fishing ===
  // Shared across all three games
  ...forGames(
    ['magikarp', 'poliwag', 'poliwhirl', 'goldeen', 'seaking', 'tentacool', 'staryu',
     'krabby', 'kingler', 'shellder', 'horsea', 'seadra', 'dratini'],
    ['Red', 'Blue', 'Yellow'], 'Fishing',
  ),
  // Red/Blue only
  ...forGames(['psyduck', 'slowpoke', 'slowbro'], ['Red', 'Blue'], 'Fishing'),
  // Yellow only
  ...forGames(['gyarados', 'tentacruel', 'dragonair'], ['Yellow'], 'Fishing'),
];

export function seedShinyAvailability() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shiny_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species_id INTEGER NOT NULL REFERENCES species(id),
      game TEXT NOT NULL,
      method TEXT NOT NULL,
      notes TEXT,
      source_url TEXT,
      UNIQUE(species_id, game, method)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_shiny_avail_species ON shiny_availability(species_id)`);

  // Clear and reseed to pick up Red/Blue/Yellow corrections
  db.exec('DELETE FROM shiny_availability');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO shiny_availability (species_id, game, method, source_url)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  for (const src of GEN1_SHINY_SOURCES) {
    const species = db.prepare('SELECT id FROM species WHERE name = ?').get(src.species_name) as any;
    if (species) {
      insert.run(species.id, src.game, src.method, src.source_url);
      count++;
    } else {
      console.warn(`Species not found: ${src.species_name}`);
    }
  }

  // Mark all Gen 1 Pokemon NOT in the list as unavailable via wild in Gen 1
  // (they can still be shiny in Gen 2+)
  console.log(`Seeded ${count} Gen 1 shiny availability entries.`);
}
