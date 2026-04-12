/**
 * Enriches Pokemon Red location data with:
 * 1. Trainer party data for all gym trainers, E4, rival battles, and route trainers
 * 2. Full Gen 1 TM list (50 TMs) with locations and methods
 * 3. Gift Pokemon events (starters, Eevee, Lapras, fossils, etc.)
 * 4. Ground items by location (Rare Candies, Nuggets, stat items, etc.)
 *
 * Usage:
 *   cd server && npx tsx src/scripts/enrich-red-data.ts
 *
 * Idempotent — uses INSERT OR IGNORE and UPDATE WHERE for safe re-runs.
 */

import db from '../db.js';

const GAME = 'red';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const locationIdCache = new Map<string, number | null>();

function locId(key: string): number {
  if (locationIdCache.has(key)) return locationIdCache.get(key)!;
  const row = db.prepare('SELECT id FROM map_locations WHERE location_key = ?').get(key) as
    | { id: number }
    | undefined;
  const id = row?.id ?? null;
  locationIdCache.set(key, id);
  if (!id) console.warn(`  [WARN] No location found for key: ${key}`);
  return id!;
}

function speciesId(name: string): number {
  const row = db.prepare('SELECT id FROM species WHERE name = ?').get(name.toLowerCase()) as
    | { id: number }
    | undefined;
  if (!row) {
    console.warn(`  [WARN] No species found for: ${name}`);
    return 0;
  }
  return row.id;
}

// ---------------------------------------------------------------------------
// 1. Trainer party data
// ---------------------------------------------------------------------------

interface PartyMon {
  species: string;
  level: number;
}

interface TrainerPartyUpdate {
  locationKey: string;
  trainerClass: string;
  trainerName: string;
  party: PartyMon[];
  isBoss?: boolean;
}

// Gym trainers, E4, rival, and notable trainers with their accurate Red parties
const trainerParties: TrainerPartyUpdate[] = [
  // === Pewter Gym ===
  {
    locationKey: 'pewter-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Pewter Gym Trainer 1',
    party: [{ species: 'Diglett', level: 11 }, { species: 'Sandshrew', level: 11 }],
  },

  // === Cerulean Gym ===
  {
    locationKey: 'cerulean-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cerulean Gym Trainer 1',
    party: [{ species: 'Horsea', level: 16 }, { species: 'Shellder', level: 16 }],
  },
  {
    locationKey: 'cerulean-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cerulean Gym Trainer 2',
    party: [{ species: 'Goldeen', level: 19 }],
  },

  // === Vermilion Gym ===
  {
    locationKey: 'vermilion-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Vermilion Gym Trainer 1',
    party: [{ species: 'Voltorb', level: 21 }, { species: 'Magnemite', level: 21 }],
  },
  {
    locationKey: 'vermilion-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Vermilion Gym Trainer 2',
    party: [{ species: 'Pikachu', level: 18 }, { species: 'Pikachu', level: 18 }],
  },
  {
    locationKey: 'vermilion-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Vermilion Gym Trainer 3',
    party: [{ species: 'Magnemite', level: 18 }, { species: 'Magnemite', level: 18 }, { species: 'Magneton', level: 18 }],
  },

  // === Celadon Gym ===
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 1',
    party: [{ species: 'Bellsprout', level: 23 }, { species: 'Weepinbell', level: 23 }],
  },
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 2',
    party: [{ species: 'Oddish', level: 24 }, { species: 'Bulbasaur', level: 24 }, { species: 'Ivysaur', level: 24 }],
  },
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 3',
    party: [{ species: 'Exeggcute', level: 24 }, { species: 'Exeggcute', level: 24 }, { species: 'Exeggutor', level: 24 }],
  },
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 4',
    party: [{ species: 'Bellsprout', level: 26 }, { species: 'Bellsprout', level: 26 }],
  },
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 5',
    party: [{ species: 'Weepinbell', level: 23 }, { species: 'Gloom', level: 23 }, { species: 'Ivysaur', level: 23 }],
  },
  {
    locationKey: 'celadon-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Celadon Gym Trainer 6',
    party: [{ species: 'Tangela', level: 24 }, { species: 'Tangela', level: 24 }],
  },

  // === Fuchsia Gym ===
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 1',
    party: [{ species: 'Koffing', level: 37 }, { species: 'Koffing', level: 37 }],
  },
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 2',
    party: [{ species: 'Koffing', level: 34 }, { species: 'Weezing', level: 34 }, { species: 'Koffing', level: 34 }],
  },
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 3',
    party: [{ species: 'Grimer', level: 34 }, { species: 'Grimer', level: 34 }, { species: 'Muk', level: 34 }],
  },
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 4',
    party: [{ species: 'Koffing', level: 33 }, { species: 'Koffing', level: 33 }, { species: 'Grimer', level: 33 }, { species: 'Weezing', level: 33 }],
  },
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 5',
    party: [{ species: 'Weezing', level: 36 }, { species: 'Koffing', level: 36 }],
  },
  {
    locationKey: 'fuchsia-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fuchsia Gym Trainer 6',
    party: [{ species: 'Grimer', level: 38 }],
  },

  // === Saffron Gym ===
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 1',
    party: [{ species: 'Kadabra', level: 31 }, { species: 'Hypno', level: 31 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 2',
    party: [{ species: 'Mr. Mime', level: 34 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 3',
    party: [{ species: 'Slowpoke', level: 33 }, { species: 'Slowbro', level: 33 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 4',
    party: [{ species: 'Kadabra', level: 34 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 5',
    party: [{ species: 'Drowzee', level: 34 }, { species: 'Hypno', level: 34 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 6',
    party: [{ species: 'Slowpoke', level: 31 }, { species: 'Slowpoke', level: 31 }, { species: 'Slowbro', level: 31 }],
  },
  {
    locationKey: 'saffron-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Saffron Gym Trainer 7',
    party: [{ species: 'Abra', level: 31 }, { species: 'Kadabra', level: 31 }, { species: 'Alakazam', level: 31 }],
  },

  // === Cinnabar Gym ===
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 1',
    party: [{ species: 'Growlithe', level: 34 }, { species: 'Ponyta', level: 34 }],
  },
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 2',
    party: [{ species: 'Vulpix', level: 36 }],
  },
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 3',
    party: [{ species: 'Ponyta', level: 36 }],
  },
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 4',
    party: [{ species: 'Ninetales', level: 38 }],
  },
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 5',
    party: [{ species: 'Rapidash', level: 40 }],
  },
  {
    locationKey: 'cinnabar-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Cinnabar Gym Trainer 6',
    party: [{ species: 'Growlithe', level: 34 }, { species: 'Growlithe', level: 34 }, { species: 'Vulpix', level: 34 }],
  },

  // === Viridian Gym ===
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 1',
    party: [{ species: 'Machoke', level: 40 }, { species: 'Machamp', level: 40 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 2',
    party: [{ species: 'Sandslash', level: 42 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 3',
    party: [{ species: 'Dugtrio', level: 42 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 4',
    party: [{ species: 'Arbok', level: 40 }, { species: 'Sandslash', level: 40 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 5',
    party: [{ species: 'Rhyhorn', level: 42 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 6',
    party: [{ species: 'Machoke', level: 40 }, { species: 'Machoke', level: 40 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 7',
    party: [{ species: 'Nidoking', level: 42 }],
  },
  {
    locationKey: 'viridian-gym',
    trainerClass: 'Gym Trainer',
    trainerName: 'Viridian Gym Trainer 8',
    party: [{ species: 'Nidoqueen', level: 42 }],
  },

  // === Fighting Dojo ===
  {
    locationKey: 'fighting-dojo',
    trainerClass: 'Gym Leader',
    trainerName: 'Karate Master',
    party: [
      { species: 'Hitmonlee', level: 37 },
      { species: 'Hitmonchan', level: 37 },
    ],
    isBoss: true,
  },
  {
    locationKey: 'fighting-dojo',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fighting Dojo Trainer 1',
    party: [{ species: 'Mankey', level: 31 }, { species: 'Mankey', level: 31 }, { species: 'Primeape', level: 31 }],
  },
  {
    locationKey: 'fighting-dojo',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fighting Dojo Trainer 2',
    party: [{ species: 'Machop', level: 32 }, { species: 'Machoke', level: 32 }],
  },
  {
    locationKey: 'fighting-dojo',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fighting Dojo Trainer 3',
    party: [{ species: 'Primeape', level: 36 }],
  },
  {
    locationKey: 'fighting-dojo',
    trainerClass: 'Gym Trainer',
    trainerName: 'Fighting Dojo Trainer 4',
    party: [{ species: 'Machop', level: 31 }, { species: 'Mankey', level: 31 }, { species: 'Primeape', level: 31 }],
  },

  // === Rocket Hideout Boss ===
  {
    locationKey: 'rocket-hideout',
    trainerClass: 'Team Rocket',
    trainerName: 'Rocket Hideout Giovanni',
    party: [
      { species: 'Onix', level: 25 },
      { species: 'Rhyhorn', level: 24 },
      { species: 'Kangaskhan', level: 29 },
    ],
    isBoss: true,
  },

  // === Silph Co Giovanni ===
  {
    locationKey: 'silph-co',
    trainerClass: 'Team Rocket',
    trainerName: 'Silph Co Giovanni',
    party: [
      { species: 'Nidorino', level: 37 },
      { species: 'Kangaskhan', level: 35 },
      { species: 'Rhyhorn', level: 37 },
      { species: 'Nidoqueen', level: 41 },
    ],
    isBoss: true,
  },

  // === Ghost Marowak ===
  {
    locationKey: 'lavender-town',
    trainerClass: 'Wild Pokemon',
    trainerName: 'Ghost Marowak',
    party: [{ species: 'Marowak', level: 30 }],
    isBoss: true,
  },

  // === Snorlax encounters ===
  {
    locationKey: 'route-12',
    trainerClass: 'Wild Pokemon',
    trainerName: 'Route12 Snorlax',
    party: [{ species: 'Snorlax', level: 30 }],
    isBoss: true,
  },
  {
    locationKey: 'route-16',
    trainerClass: 'Wild Pokemon',
    trainerName: 'Route16 Snorlax',
    party: [{ species: 'Snorlax', level: 30 }],
    isBoss: true,
  },

  // === Legendary encounters ===
  {
    locationKey: 'power-plant',
    trainerClass: 'Legendary',
    trainerName: 'Zapdos',
    party: [{ species: 'Zapdos', level: 50 }],
    isBoss: true,
  },
  {
    locationKey: 'seafoam-islands',
    trainerClass: 'Legendary',
    trainerName: 'Articuno',
    party: [{ species: 'Articuno', level: 50 }],
    isBoss: true,
  },
  {
    locationKey: 'mt-moon',
    trainerClass: 'Legendary',
    trainerName: 'Moltres',
    party: [{ species: 'Moltres', level: 50 }],
    isBoss: true,
  },
  {
    locationKey: 'cerulean-city',
    trainerClass: 'Legendary',
    trainerName: 'Mewtwo',
    party: [{ species: 'Mewtwo', level: 70 }],
    isBoss: true,
  },

  // === Rival battles (Cerulean City) ===
  {
    locationKey: 'cerulean-city',
    trainerClass: 'Rival',
    trainerName: 'Blue',
    party: [
      { species: 'Pidgeotto', level: 17 },
      { species: 'Abra', level: 16 },
      { species: 'Rattata', level: 15 },
      { species: 'Charmeleon', level: 18 },
    ],
  },

  // === Rival (SS Anne) ===
  {
    locationKey: 'ss-anne',
    trainerClass: 'Rival',
    trainerName: 'Blue',
    party: [
      { species: 'Pidgeotto', level: 19 },
      { species: 'Kadabra', level: 18 },
      { species: 'Raticate', level: 16 },
      { species: 'Charmeleon', level: 20 },
    ],
  },

  // === Rival (Pokemon Tower) ===
  {
    locationKey: 'pokemon-tower',
    trainerClass: 'Rival',
    trainerName: 'Blue',
    party: [
      { species: 'Pidgeotto', level: 25 },
      { species: 'Kadabra', level: 20 },
      { species: 'Gyarados', level: 23 },
      { species: 'Growlithe', level: 22 },
      { species: 'Charmeleon', level: 25 },
    ],
  },

  // === Rival (Silph Co) ===
  {
    locationKey: 'silph-co',
    trainerClass: 'Rival',
    trainerName: 'Blue',
    party: [
      { species: 'Pidgeot', level: 37 },
      { species: 'Alakazam', level: 35 },
      { species: 'Gyarados', level: 38 },
      { species: 'Growlithe', level: 35 },
      { species: 'Charizard', level: 40 },
    ],
  },

  // === Rival (Route 22 early) ===
  {
    locationKey: 'route-22',
    trainerClass: 'Rival',
    trainerName: 'Blue (early)',
    party: [
      { species: 'Pidgey', level: 9 },
      { species: 'Charmander', level: 8 },
    ],
  },

  // === Rival (Route 22 late) ===
  {
    locationKey: 'route-22',
    trainerClass: 'Rival',
    trainerName: 'Blue (late)',
    party: [
      { species: 'Pidgeot', level: 47 },
      { species: 'Alakazam', level: 45 },
      { species: 'Rhydon', level: 45 },
      { species: 'Gyarados', level: 47 },
      { species: 'Arcanine', level: 47 },
      { species: 'Charizard', level: 53 },
    ],
  },

  // === Victory Road / Indigo Plateau E4+Champion ===
  // Lance at victory-road (id 149) — there's a duplicate location
  {
    locationKey: 'victory-road',
    trainerClass: 'Elite Four',
    trainerName: 'Lance',
    party: [
      { species: 'Gyarados', level: 58 },
      { species: 'Dragonair', level: 56 },
      { species: 'Dragonair', level: 56 },
      { species: 'Aerodactyl', level: 60 },
      { species: 'Dragonite', level: 62 },
    ],
    isBoss: true,
  },
  {
    locationKey: 'victory-road',
    trainerClass: 'Champion',
    trainerName: 'Blue',
    party: [
      { species: 'Pidgeot', level: 61 },
      { species: 'Alakazam', level: 59 },
      { species: 'Rhydon', level: 61 },
      { species: 'Gyarados', level: 63 },
      { species: 'Arcanine', level: 63 },
      { species: 'Charizard', level: 67 },
    ],
    isBoss: true,
  },
];

// ---------------------------------------------------------------------------
// 2. Full Gen 1 TM list
// ---------------------------------------------------------------------------

interface TMData {
  tmNumber: string;
  moveName: string;
  locationKey: string;
  method: string;
  price?: number;
  requirements?: string;
}

const fullTMList: TMData[] = [
  // Field pickup TMs
  { tmNumber: 'TM01', moveName: 'Mega Punch', locationKey: 'mt-moon', method: 'field' },
  { tmNumber: 'TM04', moveName: 'Whirlwind', locationKey: 'route-4', method: 'field' },
  { tmNumber: 'TM05', moveName: 'Mega Kick', locationKey: 'victory-road', method: 'field' },
  { tmNumber: 'TM08', moveName: 'Body Slam', locationKey: 'ss-anne', method: 'gift' },
  { tmNumber: 'TM09', moveName: 'Take Down', locationKey: 'saffron-city', method: 'gift', requirements: 'Copycat girl (give her a Poke Doll)' },
  { tmNumber: 'TM12', moveName: 'Water Gun', locationKey: 'mt-moon', method: 'field' },
  { tmNumber: 'TM13', moveName: 'Ice Beam', locationKey: 'celadon-city', method: 'purchase', price: 5500, requirements: 'Celadon Dept Store roof (vending machine prize)' },
  { tmNumber: 'TM14', moveName: 'Blizzard', locationKey: 'pokemon-mansion', method: 'field' },
  { tmNumber: 'TM15', moveName: 'Hyper Beam', locationKey: 'celadon-city', method: 'purchase', price: 7500, requirements: 'Game Corner Prize Exchange' },
  { tmNumber: 'TM16', moveName: 'Pay Day', locationKey: 'route-12', method: 'field' },
  { tmNumber: 'TM17', moveName: 'Submission', locationKey: 'victory-road', method: 'field' },
  { tmNumber: 'TM18', moveName: 'Counter', locationKey: 'celadon-city', method: 'purchase', price: 3000, requirements: 'Celadon Dept Store' },
  { tmNumber: 'TM19', moveName: 'Seismic Toss', locationKey: 'route-25', method: 'field' },
  { tmNumber: 'TM20', moveName: 'Rage', locationKey: 'route-15', method: 'field' },
  { tmNumber: 'TM22', moveName: 'SolarBeam', locationKey: 'pokemon-mansion', method: 'field' },
  { tmNumber: 'TM23', moveName: 'Dragon Rage', locationKey: 'celadon-city', method: 'purchase', price: 3300, requirements: 'Game Corner Prize Exchange' },
  { tmNumber: 'TM25', moveName: 'Thunder', locationKey: 'power-plant', method: 'field' },
  { tmNumber: 'TM26', moveName: 'Earthquake', locationKey: 'silph-co', method: 'field' },
  { tmNumber: 'TM28', moveName: 'Dig', locationKey: 'cerulean-city', method: 'gift', requirements: 'From Rocket Grunt in house on Route 4 side' },
  { tmNumber: 'TM29', moveName: 'Psychic', locationKey: 'saffron-city', method: 'gift', requirements: 'From Mr. Psychic in his house' },
  { tmNumber: 'TM30', moveName: 'Teleport', locationKey: 'route-9', method: 'field' },
  { tmNumber: 'TM31', moveName: 'Mimic', locationKey: 'saffron-city', method: 'gift', requirements: 'Mimic Girl (give her a Poke Doll)' },
  { tmNumber: 'TM32', moveName: 'Double Team', locationKey: 'fuchsia-city', method: 'field' },
  { tmNumber: 'TM33', moveName: 'Reflect', locationKey: 'celadon-city', method: 'purchase', price: 1000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM35', moveName: 'Metronome', locationKey: 'cinnabar-island', method: 'gift', requirements: 'From scientist in Cinnabar Lab' },
  { tmNumber: 'TM36', moveName: 'Selfdestruct', locationKey: 'silph-co', method: 'field' },
  { tmNumber: 'TM37', moveName: 'Egg Bomb', locationKey: 'fuchsia-city', method: 'field' },
  { tmNumber: 'TM39', moveName: 'Swift', locationKey: 'route-12', method: 'field', requirements: 'From girl on upper Route 12' },
  { tmNumber: 'TM40', moveName: 'Skull Bash', locationKey: 'safari-zone', method: 'field' },
  { tmNumber: 'TM41', moveName: 'Softboiled', locationKey: 'celadon-city', method: 'gift', requirements: 'From man on Celadon Mansion roof' },
  { tmNumber: 'TM42', moveName: 'Dream Eater', locationKey: 'viridian-city', method: 'gift', requirements: 'From man near Trainer House' },
  { tmNumber: 'TM43', moveName: 'Sky Attack', locationKey: 'victory-road', method: 'field' },
  { tmNumber: 'TM44', moveName: 'Rest', locationKey: 'ss-anne', method: 'gift', requirements: 'From gentleman on SS Anne' },
  { tmNumber: 'TM45', moveName: 'Thunder Wave', locationKey: 'route-24', method: 'field' },
  { tmNumber: 'TM47', moveName: 'Explosion', locationKey: 'victory-road', method: 'field' },
  { tmNumber: 'TM48', moveName: 'Rock Slide', locationKey: 'celadon-city', method: 'purchase', price: 1000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM49', moveName: 'Tri Attack', locationKey: 'celadon-city', method: 'purchase', price: 1000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM50', moveName: 'Substitute', locationKey: 'celadon-city', method: 'purchase', price: 1000, requirements: 'Celadon Dept Store (2F)' },

  // Celadon Dept Store purchasable TMs
  { tmNumber: 'TM02', moveName: 'Razor Wind', locationKey: 'celadon-city', method: 'purchase', price: 2000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM07', moveName: 'Horn Drill', locationKey: 'celadon-city', method: 'purchase', price: 2000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM10', moveName: 'Double-Edge', locationKey: 'celadon-city', method: 'purchase', price: 3000, requirements: 'Celadon Dept Store (2F)' },
  { tmNumber: 'TM03', moveName: 'Swords Dance', locationKey: 'silph-co', method: 'field' },
];

// ---------------------------------------------------------------------------
// 3. Gift Pokemon events
// ---------------------------------------------------------------------------

interface GiftPokemonEvent {
  locationKey: string;
  eventName: string;
  description: string;
  speciesName?: string;
  requirements?: string;
  progressionOrder?: number;
}

const giftPokemon: GiftPokemonEvent[] = [
  // Starters already exist as a single event, but let's add individual species events
  {
    locationKey: 'pallet-town',
    eventName: 'Gift: Bulbasaur',
    description: 'Choose Bulbasaur as your starter Pokemon from Professor Oak',
    speciesName: 'bulbasaur',
    progressionOrder: 1,
  },
  {
    locationKey: 'pallet-town',
    eventName: 'Gift: Charmander',
    description: 'Choose Charmander as your starter Pokemon from Professor Oak',
    speciesName: 'charmander',
    progressionOrder: 1,
  },
  {
    locationKey: 'pallet-town',
    eventName: 'Gift: Squirtle',
    description: 'Choose Squirtle as your starter Pokemon from Professor Oak',
    speciesName: 'squirtle',
    progressionOrder: 1,
  },
  {
    locationKey: 'route-4',
    eventName: 'Gift: Magikarp',
    description: 'Purchase Magikarp from the salesman in the Route 4 Pokemon Center for 500 Pokedollars',
    speciesName: 'magikarp',
    requirements: '500 Pokedollars',
  },
  {
    locationKey: 'celadon-city',
    eventName: 'Gift: Eevee',
    description: 'Pick up Eevee from the Poke Ball on the roof of the Celadon Mansion (enter from back)',
    speciesName: 'eevee',
  },
  {
    locationKey: 'silph-co',
    eventName: 'Gift: Lapras',
    description: 'Receive Lapras from a Silph Co. employee on the 7th floor after defeating the Rocket takeover',
    speciesName: 'lapras',
    requirements: 'Defeat Team Rocket in Silph Co.',
  },
  {
    locationKey: 'fighting-dojo',
    eventName: 'Gift: Hitmonlee',
    description: 'Choose Hitmonlee as your prize for defeating the Karate Master at the Fighting Dojo',
    speciesName: 'hitmonlee',
    requirements: 'Defeat Karate Master (choose one)',
  },
  {
    locationKey: 'fighting-dojo',
    eventName: 'Gift: Hitmonchan',
    description: 'Choose Hitmonchan as your prize for defeating the Karate Master at the Fighting Dojo',
    speciesName: 'hitmonchan',
    requirements: 'Defeat Karate Master (choose one)',
  },
  {
    locationKey: 'cinnabar-island',
    eventName: 'Gift: Omanyte',
    description: 'Revive the Helix Fossil at the Cinnabar Lab to obtain Omanyte',
    speciesName: 'omanyte',
    requirements: 'Helix Fossil (choose in Mt. Moon)',
  },
  {
    locationKey: 'cinnabar-island',
    eventName: 'Gift: Kabuto',
    description: 'Revive the Dome Fossil at the Cinnabar Lab to obtain Kabuto',
    speciesName: 'kabuto',
    requirements: 'Dome Fossil (choose in Mt. Moon)',
  },
  {
    locationKey: 'cinnabar-island',
    eventName: 'Gift: Aerodactyl',
    description: 'Revive the Old Amber at the Cinnabar Lab to obtain Aerodactyl',
    speciesName: 'aerodactyl',
    requirements: 'Old Amber (from Pewter Museum)',
  },
  {
    locationKey: 'cerulean-city',
    eventName: 'Gift: Bulbasaur (NPC)',
    description: 'Receive a Bulbasaur from a girl in Cerulean City if your Pikachu is happy enough (Yellow only in vanilla, but available as gift in some guides)',
    speciesName: 'bulbasaur',
    requirements: 'Yellow version only',
  },
];

// ---------------------------------------------------------------------------
// 4. Ground items by location
// ---------------------------------------------------------------------------

interface GroundItem {
  locationKey: string;
  itemName: string;
  method: string;
  description?: string;
  requirements?: string;
}

const groundItems: GroundItem[] = [
  // Viridian Forest
  { locationKey: 'viridian-forest', itemName: 'Potion', method: 'field', description: 'Hidden in Viridian Forest' },
  { locationKey: 'viridian-forest', itemName: 'Antidote', method: 'field', description: 'Pokeball pickup in Viridian Forest' },
  { locationKey: 'viridian-forest', itemName: 'Poke Ball', method: 'field', description: 'Pokeball pickup in Viridian Forest' },

  // Mt. Moon
  { locationKey: 'mt-moon', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Mt. Moon B2F' },
  { locationKey: 'mt-moon', itemName: 'Escape Rope', method: 'field', description: 'Pokeball pickup in Mt. Moon' },
  { locationKey: 'mt-moon', itemName: 'Moon Stone', method: 'field', description: 'Pokeball pickup in Mt. Moon' },
  { locationKey: 'mt-moon', itemName: 'HP Up', method: 'field', description: 'Pokeball pickup in Mt. Moon' },
  { locationKey: 'mt-moon', itemName: 'Helix Fossil', method: 'field', description: 'Choose from Super Nerd after defeating him (choose one)', requirements: 'Defeat Super Nerd' },
  { locationKey: 'mt-moon', itemName: 'Dome Fossil', method: 'field', description: 'Choose from Super Nerd after defeating him (choose one)', requirements: 'Defeat Super Nerd' },
  { locationKey: 'mt-moon', itemName: 'Star Piece', method: 'hidden', description: 'Hidden item in Mt. Moon' },

  // Route 3
  { locationKey: 'route-3', itemName: 'Potion', method: 'field', description: 'Pokeball pickup on Route 3' },

  // Cerulean City area
  { locationKey: 'cerulean-city', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden in backyard of house near Cerulean Cape' },

  // Route 24/25
  { locationKey: 'route-24', itemName: 'Nugget', method: 'gift', description: 'Prize for defeating all 5 Nugget Bridge trainers' },

  // SS Anne
  { locationKey: 'ss-anne', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden on SS Anne' },
  { locationKey: 'ss-anne', itemName: 'Max Ether', method: 'field', description: 'Pokeball pickup on SS Anne' },

  // Route 9/10
  { locationKey: 'route-9', itemName: 'TM30', method: 'field', description: 'Teleport' },

  // Rock Tunnel
  { locationKey: 'rock-tunnel', itemName: 'Escape Rope', method: 'field', description: 'Pokeball pickup in Rock Tunnel' },
  { locationKey: 'rock-tunnel', itemName: 'Revive', method: 'field', description: 'Pokeball pickup in Rock Tunnel' },

  // Pokemon Tower
  { locationKey: 'pokemon-tower', itemName: 'Elixir', method: 'field', description: 'Pokeball pickup in Pokemon Tower' },
  { locationKey: 'pokemon-tower', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden in Pokemon Tower' },
  { locationKey: 'pokemon-tower', itemName: 'Nugget', method: 'hidden', description: 'Hidden in Pokemon Tower' },

  // Celadon City
  { locationKey: 'celadon-city', itemName: 'Coin Case', method: 'gift', description: 'From man in restaurant behind Game Corner' },
  { locationKey: 'celadon-city', itemName: 'Tea', method: 'gift', description: 'From old lady in Celadon Mansion 1F (opens Saffron gates)' },

  // Rocket Hideout
  { locationKey: 'rocket-hideout', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Rocket Hideout' },
  { locationKey: 'rocket-hideout', itemName: 'Nugget', method: 'hidden', description: 'Hidden in Rocket Hideout' },
  { locationKey: 'rocket-hideout', itemName: 'Super Potion', method: 'field', description: 'Pokeball pickup in Rocket Hideout' },
  { locationKey: 'rocket-hideout', itemName: 'Silph Scope', method: 'gift', description: 'Dropped by Giovanni after defeating him', requirements: 'Defeat Giovanni' },
  { locationKey: 'rocket-hideout', itemName: 'Lift Key', method: 'field', description: 'From Rocket Grunt on B2F' },

  // Silph Co.
  { locationKey: 'silph-co', itemName: 'Card Key', method: 'field', description: 'Found on 5F of Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Master Ball', method: 'gift', description: 'From Silph Co. President after defeating Giovanni', requirements: 'Defeat Giovanni in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'HP Up', method: 'field', description: 'Pokeball pickup in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Protein', method: 'field', description: 'Pokeball pickup in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Carbos', method: 'field', description: 'Pokeball pickup in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Iron', method: 'field', description: 'Pokeball pickup in Silph Co.' },
  { locationKey: 'silph-co', itemName: 'Calcium', method: 'field', description: 'Pokeball pickup in Silph Co.' },

  // Fuchsia City / Safari Zone
  { locationKey: 'fuchsia-city', itemName: 'Good Rod', method: 'gift', description: 'From fisherman in house on Route 12 side' },
  { locationKey: 'fuchsia-city', itemName: 'Super Rod', method: 'gift', description: 'From Fishing Guru in house south of Pokemon Center' },
  { locationKey: 'safari-zone', itemName: 'Gold Teeth', method: 'field', description: 'Found in Safari Zone Area 3 — return to Warden for HM04' },
  { locationKey: 'safari-zone', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Safari Zone' },
  { locationKey: 'safari-zone', itemName: 'Max Potion', method: 'field', description: 'Pokeball pickup in Safari Zone' },
  { locationKey: 'safari-zone', itemName: 'Protein', method: 'field', description: 'Pokeball pickup in Safari Zone' },
  { locationKey: 'safari-zone', itemName: 'Carbos', method: 'field', description: 'Pokeball pickup in Safari Zone' },

  // Route 12/13/14/15
  { locationKey: 'route-12', itemName: 'Iron', method: 'field', description: 'Pokeball pickup on Route 12' },
  { locationKey: 'route-13', itemName: 'PP Up', method: 'hidden', description: 'Hidden on Route 13' },

  // Cycling Road (Route 16-18)
  { locationKey: 'route-16', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden on Route 16' },
  { locationKey: 'route-17', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden on Route 17 (Cycling Road)' },
  { locationKey: 'route-17', itemName: 'Max Elixir', method: 'hidden', description: 'Hidden on Route 17 (Cycling Road)' },

  // Seafoam Islands
  { locationKey: 'seafoam-islands', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Seafoam Islands' },

  // Pokemon Mansion
  { locationKey: 'pokemon-mansion', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Pokemon Mansion' },
  { locationKey: 'pokemon-mansion', itemName: 'Calcium', method: 'field', description: 'Pokeball pickup in Pokemon Mansion' },
  { locationKey: 'pokemon-mansion', itemName: 'Iron', method: 'field', description: 'Pokeball pickup in Pokemon Mansion' },
  { locationKey: 'pokemon-mansion', itemName: 'Secret Key', method: 'field', description: 'Found on B1F — unlocks Cinnabar Gym', requirements: 'Navigate switch puzzles' },
  { locationKey: 'pokemon-mansion', itemName: 'Carbos', method: 'field', description: 'Pokeball pickup in Pokemon Mansion' },

  // Cinnabar Island
  { locationKey: 'cinnabar-island', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden on Cinnabar Island' },

  // Pewter City
  { locationKey: 'pewter-city', itemName: 'Old Amber', method: 'gift', description: 'From scientist in Pewter Museum of Science (back entrance, requires Cut)' },

  // Victory Road
  { locationKey: 'victory-road', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Victory Road' },
  { locationKey: 'victory-road', itemName: 'Full Heal', method: 'field', description: 'Pokeball pickup in Victory Road' },
  { locationKey: 'victory-road', itemName: 'Max Revive', method: 'field', description: 'Pokeball pickup in Victory Road' },

  // Route 2 (requires Cut)
  { locationKey: 'route-2-south', itemName: 'HP Up', method: 'field', description: 'Pokeball pickup on Route 2 (requires Cut)' },
  { locationKey: 'route-2-south', itemName: 'Moon Stone', method: 'hidden', description: 'Hidden on Route 2' },

  // Vermilion City
  { locationKey: 'vermilion-city', itemName: 'Old Rod', method: 'gift', description: 'From Fishing Guru in house near the docks' },

  // Route 11
  { locationKey: 'route-11', itemName: "Itemfinder", method: 'gift', description: "From Professor Oak's aide on Route 11 gate 2F (requires 30 Pokemon caught)" },

  // Route 23
  { locationKey: 'route-23', itemName: 'Rare Candy', method: 'hidden', description: 'Hidden on Route 23' },

  // Power Plant
  { locationKey: 'power-plant', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Power Plant' },
  { locationKey: 'power-plant', itemName: 'Carbos', method: 'field', description: 'Pokeball pickup in Power Plant' },
  { locationKey: 'power-plant', itemName: 'HP Up', method: 'field', description: 'Pokeball pickup in Power Plant' },

  // Cerulean Cave
  { locationKey: 'cerulean-cave', itemName: 'Rare Candy', method: 'field', description: 'Pokeball pickup in Cerulean Cave' },
  { locationKey: 'cerulean-cave', itemName: 'PP Up', method: 'field', description: 'Pokeball pickup in Cerulean Cave' },
  { locationKey: 'cerulean-cave', itemName: 'Max Revive', method: 'field', description: 'Pokeball pickup in Cerulean Cave' },
  { locationKey: 'cerulean-cave', itemName: 'Full Restore', method: 'field', description: 'Pokeball pickup in Cerulean Cave' },
  { locationKey: 'cerulean-cave', itemName: 'Ultra Ball', method: 'field', description: 'Pokeball pickup in Cerulean Cave' },

  // Saffron City
  { locationKey: 'saffron-city', itemName: 'Poke Doll', method: 'purchase', description: 'Purchase from Celadon Dept Store (give to Copycat for TM31)' },
];

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

function run() {
  console.log('=== Pokemon Red Data Enrichment ===\n');

  const counts = { trainersUpdated: 0, trainersInserted: 0, tmsInserted: 0, eventsInserted: 0, itemsInserted: 0 };

  // --- Trainer party data ---
  console.log('--- Updating trainer party data ---');

  const updateParty = db.prepare(`
    UPDATE location_trainers
    SET party_pokemon = ?
    WHERE location_id = ? AND game = ? AND trainer_class = ? AND trainer_name = ?
      AND (party_pokemon IS NULL OR party_pokemon = '[]')
  `);

  const insertTrainer = db.prepare(`
    INSERT OR IGNORE INTO location_trainers (location_id, game, trainer_class, trainer_name, party_pokemon, is_boss)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const trainerTransaction = db.transaction(() => {
    for (const t of trainerParties) {
      const lid = locId(t.locationKey);
      if (!lid) continue;
      const partyJson = JSON.stringify(t.party);

      // Try update first
      const result = updateParty.run(partyJson, lid, GAME, t.trainerClass, t.trainerName);
      if (result.changes > 0) {
        counts.trainersUpdated++;
        console.log(`  Updated: ${t.trainerName} (${t.trainerClass}) — ${t.party.length} Pokemon`);
      } else {
        // Check if already has party data
        const existing = db.prepare(
          'SELECT party_pokemon FROM location_trainers WHERE location_id = ? AND game = ? AND trainer_class = ? AND trainer_name = ?'
        ).get(lid, GAME, t.trainerClass, t.trainerName) as { party_pokemon: string | null } | undefined;

        if (existing && existing.party_pokemon && existing.party_pokemon !== '[]') {
          // Already has data, skip
        } else if (!existing) {
          // Insert new
          const ins = insertTrainer.run(lid, GAME, t.trainerClass, t.trainerName, partyJson, t.isBoss ? 1 : 0);
          if (ins.changes > 0) {
            counts.trainersInserted++;
            console.log(`  Inserted: ${t.trainerName} (${t.trainerClass}) — ${t.party.length} Pokemon`);
          }
        }
      }
    }
  });
  trainerTransaction();
  console.log(`  Trainers updated: ${counts.trainersUpdated}, inserted: ${counts.trainersInserted}\n`);

  // --- TMs ---
  console.log('--- Inserting TM data ---');

  const insertTM = db.prepare(`
    INSERT OR IGNORE INTO location_tms (location_id, game, tm_number, move_name, method, price, requirements)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tmTransaction = db.transaction(() => {
    for (const tm of fullTMList) {
      const lid = locId(tm.locationKey);
      if (!lid) continue;
      const result = insertTM.run(lid, GAME, tm.tmNumber, tm.moveName, tm.method, tm.price ?? null, tm.requirements ?? null);
      if (result.changes > 0) {
        counts.tmsInserted++;
        console.log(`  Inserted: ${tm.tmNumber} ${tm.moveName} (${tm.method} @ ${tm.locationKey})`);
      }
    }
  });
  tmTransaction();
  console.log(`  TMs inserted: ${counts.tmsInserted}\n`);

  // --- Gift Pokemon events ---
  console.log('--- Inserting gift Pokemon events ---');

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO location_events (location_id, game, event_name, event_type, description, species_id, requirements, progression_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const eventTransaction = db.transaction(() => {
    for (const g of giftPokemon) {
      const lid = locId(g.locationKey);
      if (!lid) continue;
      const sid = g.speciesName ? speciesId(g.speciesName) : null;
      const result = insertEvent.run(
        lid,
        GAME,
        g.eventName,
        'gift_pokemon',
        g.description,
        sid,
        g.requirements ?? null,
        g.progressionOrder ?? null
      );
      if (result.changes > 0) {
        counts.eventsInserted++;
        console.log(`  Inserted: ${g.eventName}`);
      }
    }
  });
  eventTransaction();
  console.log(`  Events inserted: ${counts.eventsInserted}\n`);

  // --- Ground items ---
  console.log('--- Inserting ground items ---');

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO location_items (location_id, game, item_name, method, description, requirements)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const itemTransaction = db.transaction(() => {
    for (const item of groundItems) {
      const lid = locId(item.locationKey);
      if (!lid) continue;
      const result = insertItem.run(lid, GAME, item.itemName, item.method, item.description ?? null, item.requirements ?? null);
      if (result.changes > 0) {
        counts.itemsInserted++;
        console.log(`  Inserted: ${item.itemName} (${item.method} @ ${item.locationKey})`);
      }
    }
  });
  itemTransaction();
  console.log(`  Items inserted: ${counts.itemsInserted}\n`);

  // --- Summary ---
  console.log('=== Summary ===');
  console.log(`  Trainers updated with party data: ${counts.trainersUpdated}`);
  console.log(`  Trainers inserted: ${counts.trainersInserted}`);
  console.log(`  TMs inserted: ${counts.tmsInserted}`);
  console.log(`  Gift Pokemon events inserted: ${counts.eventsInserted}`);
  console.log(`  Ground items inserted: ${counts.itemsInserted}`);

  const totalTrainers = (db.prepare("SELECT COUNT(*) as c FROM location_trainers WHERE game='red'").get() as any).c;
  const trainersWithParty = (db.prepare("SELECT COUNT(*) as c FROM location_trainers WHERE game='red' AND party_pokemon IS NOT NULL AND party_pokemon != '[]'").get() as any).c;
  const totalTms = (db.prepare("SELECT COUNT(*) as c FROM location_tms WHERE game='red'").get() as any).c;
  const totalEvents = (db.prepare("SELECT COUNT(*) as c FROM location_events WHERE game='red'").get() as any).c;
  const totalItems = (db.prepare("SELECT COUNT(*) as c FROM location_items WHERE game='red'").get() as any).c;

  console.log(`\n=== Current Totals (Red) ===`);
  console.log(`  Trainers: ${totalTrainers} (${trainersWithParty} with party data)`);
  console.log(`  TMs: ${totalTms}`);
  console.log(`  Events: ${totalEvents}`);
  console.log(`  Items: ${totalItems}`);
}

run();
