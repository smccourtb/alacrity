import type { FilterOption } from '@/components/FilterDropdown';

export const MODE_OPTIONS: FilterOption[] = [
  { value: 'living', label: 'Living' },
  { value: 'shiny', label: 'Shiny' },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'caught', label: 'Caught' },
  { value: 'missing', label: 'Missing' },
];

export const GEN_OPTIONS: FilterOption[] = [
  { value: '1', label: 'Gen 1' },
  { value: '2', label: 'Gen 2' },
  { value: '3', label: 'Gen 3' },
  { value: '4', label: 'Gen 4' },
  { value: '5', label: 'Gen 5' },
  { value: '6', label: 'Gen 6' },
  { value: '7', label: 'Gen 7' },
  { value: '8', label: 'Gen 8' },
  { value: '9', label: 'Gen 9' },
];

export const GAMES_BY_GEN: Record<number, string[]> = {
  1: ['Red', 'Blue', 'Yellow'],
  2: ['Gold', 'Silver', 'Crystal'],
  3: ['Ruby', 'Sapphire', 'Emerald', 'FireRed', 'LeafGreen', 'Colosseum', 'XD'],
  4: ['Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver'],
  5: ['Black', 'White', 'Black 2', 'White 2'],
  6: ['X', 'Y', 'Omega Ruby', 'Alpha Sapphire'],
  7: ['Sun', 'Moon', 'Ultra Sun', 'Ultra Moon', "Let's Go Pikachu", "Let's Go Eevee"],
  8: ['Sword', 'Shield', 'Brilliant Diamond', 'Shining Pearl', 'Legends Arceus'],
  9: ['Scarlet', 'Violet'],
};

export const GAME_OPTIONS: FilterOption[] = Object.entries(GAMES_BY_GEN).flatMap(([gen, games]) =>
  games.map(game => ({ value: game, label: game, group: `Gen ${gen}` }))
);

export const FORM_OPTIONS: FilterOption[] = [
  { value: 'standard', label: 'Base' },
  { value: 'regional', label: 'Regional' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'gender', label: 'Gender' },
  { value: 'event', label: 'Event' },
  { value: 'totem', label: 'Totem' },
];

export const ORIGIN_OPTIONS: FilterOption[] = [
  { value: 'GB', label: 'Game Boy' },
  { value: 'None', label: 'No Mark' },
  { value: 'Pentagon', label: 'Pentagon' },
  { value: 'Clover', label: 'Clover' },
  { value: 'LetsGo', label: "Let's Go" },
  { value: 'Galar', label: 'Galar' },
  { value: 'BDSP', label: 'BDSP' },
  { value: 'Hisui', label: 'Hisui' },
  { value: 'Paldea', label: 'Paldea' },
];

export interface GameVersion {
  id: number;
  name: string;
  generation: number;
  origin_mark: string;
  max_species_id: number;
  sort_order: number;
}

/** Derive GAME_TO_ORIGIN, GAME_MAX_SPECIES, and ORIGIN_MAX_SPECIES from API data */
export function deriveGameMaps(versions: GameVersion[]) {
  const gameToOrigin: Record<string, string> = {};
  const gameMaxSpecies: Record<string, number> = {};
  const originMaxSpecies: Record<string, number> = {};

  for (const v of versions) {
    gameToOrigin[v.name] = v.origin_mark;
    gameMaxSpecies[v.name] = v.max_species_id;
    // Origin max = highest max_species_id across all games with that origin mark
    if (!originMaxSpecies[v.origin_mark] || v.max_species_id > originMaxSpecies[v.origin_mark]) {
      originMaxSpecies[v.origin_mark] = v.max_species_id;
    }
  }

  return { gameToOrigin, gameMaxSpecies, originMaxSpecies };
}

// Balls that are legal for each origin mark after transfer
// GB: VC transfer always sets Poke Ball regardless of original catch ball
// null = no additional restriction beyond ball_permit + ball.games
export const ORIGIN_LEGAL_BALLS: Record<string, string[] | null> = {
  GB: ['Poke Ball'],
  None: null,
  Pentagon: null,
  Clover: null,
  LetsGo: ['Poke Ball', 'Great Ball', 'Ultra Ball', 'Master Ball', 'Premier Ball'],
  Galar: null,
  BDSP: null,
  Hisui: null,  // LA balls become Strange Ball on transfer, but we track by origin
  Paldea: null,
};

// Ribbon categories that ban certain species categories
// Battle facility ribbons: legendaries and mythicals are banned
export const BATTLE_FACILITY_BANNED: Set<string> = new Set([
  'legendary', 'mythical',
]);

// Ribbon categories that are battle-facility restricted
export const BATTLE_FACILITY_RIBBON_CATEGORIES: Set<string> = new Set([
  'battle-facility',
  'colosseum-xd',  // National/Earth ribbons from Colosseum/XD battle facilities
]);

export const GENDER_OPTIONS: FilterOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'genderless', label: 'Genderless' },
];

export const GEN_RANGE: Record<number, [number, number]> = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1025],
};

// GAME_TO_ORIGIN is now derived from game_versions API via deriveGameMaps().
// Kept as a fallback for components that haven't loaded API data yet.
export const GAME_TO_ORIGIN: Record<string, string> = {
  Red: 'GB', Blue: 'GB', Yellow: 'GB', Gold: 'GB', Silver: 'GB', Crystal: 'GB',
  Ruby: 'None', Sapphire: 'None', Emerald: 'None', FireRed: 'None', LeafGreen: 'None',
  Colosseum: 'None', XD: 'None',
  Diamond: 'None', Pearl: 'None', Platinum: 'None', HeartGold: 'None', SoulSilver: 'None',
  Black: 'None', White: 'None', 'Black 2': 'None', 'White 2': 'None',
  X: 'Pentagon', Y: 'Pentagon', 'Omega Ruby': 'Pentagon', 'Alpha Sapphire': 'Pentagon',
  Sun: 'Clover', Moon: 'Clover', 'Ultra Sun': 'Clover', 'Ultra Moon': 'Clover',
  "Let's Go Pikachu": 'LetsGo', "Let's Go Eevee": 'LetsGo',
  Sword: 'Galar', Shield: 'Galar',
  'Brilliant Diamond': 'BDSP', 'Shining Pearl': 'BDSP',
  'Legends Arceus': 'Hisui',
  Scarlet: 'Paldea', Violet: 'Paldea',
};

export interface FilterState {
  mode: string;
  status: string;
  generations: string[];
  games: string[];
  formCategories: string[];
  balls: string[];
  origins: string[];
  genders: string[];
  ribbons: string[];
  marks: string[];
  abilities: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  mode: 'living',
  status: 'all',
  generations: [],
  games: [],
  formCategories: ['standard'],
  balls: [],
  origins: [],
  genders: [],
  ribbons: [],
  marks: [],
  abilities: [],
};

export function isFilterActive(filters: FilterState): boolean {
  return filters.mode !== 'living'
    || filters.status !== 'all'
    || filters.generations.length > 0
    || filters.games.length > 0
    || filters.formCategories.length > 1
    || (filters.formCategories.length === 1 && filters.formCategories[0] !== 'standard')
    || filters.balls.length > 0
    || filters.origins.length > 0
    || filters.genders.length > 0
    || filters.ribbons.length > 0
    || filters.marks.length > 0
    || filters.abilities.length > 0;
}

export function buildSummary(filters: FilterState, count: number, total: number, achievable?: number): string {
  const parts: string[] = [];

  if (filters.status === 'caught') parts.push('caught');
  if (filters.status === 'missing') parts.push('missing');
  if (filters.mode === 'shiny') parts.push('shiny');

  if (filters.generations.length > 0) {
    const gens = filters.generations.map(g => `Gen ${g}`).join(', ');
    parts.push(gens);
  }

  if (filters.games.length > 0) {
    if (filters.games.length <= 2) {
      parts.push(filters.games.join(', '));
    } else {
      parts.push(`${filters.games[0]} +${filters.games.length - 1} games`);
    }
  }

  const formLabels = filters.formCategories
    .filter(f => f !== 'standard')
    .map(f => f.charAt(0).toUpperCase() + f.slice(1));
  if (formLabels.length > 0) {
    parts.push(formLabels.join(' + ') + ' forms');
  }

  if (filters.balls.length > 0) {
    parts.push(`in ${filters.balls.length === 1 ? filters.balls[0] : filters.balls.length + ' balls'}`);
  }

  if (filters.origins.length > 0) {
    parts.push(`from ${filters.origins.length === 1 ? filters.origins[0] : filters.origins.length + ' origins'}`);
  }

  if (filters.ribbons.length > 0) parts.push(`with ${filters.ribbons.length} ribbon${filters.ribbons.length > 1 ? 's' : ''}`);
  if (filters.marks.length > 0) parts.push(`with ${filters.marks.length} mark${filters.marks.length > 1 ? 's' : ''}`);
  if (filters.genders.length > 0) parts.push(filters.genders.join('/'));
  if (filters.abilities.length > 0) parts.push(`ability: ${filters.abilities.join(', ')}`);

  const denom = achievable !== undefined && achievable < total ? achievable : total;

  if (parts.length === 0) {
    return `Showing all ${total.toLocaleString()} species`;
  }
  return `${count.toLocaleString()} / ${denom.toLocaleString()} ${parts.join(' · ')}`;
}
