export interface LocationInfo {
  slug: string;
  displayName: string;
}

export interface MoveEntry {
  name: string;
  versions: string[];
}

export interface EncounterEntry {
  species_id: number;
  name: string;
  method: string;
  min_level: number;
  max_level: number;
  chance: number;
  conditions: string[];
}

// Map PokeAPI version slugs to display names matching GAME_VERSIONS keys
export const VERSION_SLUG_TO_DISPLAY: Record<string, string> = {
  'red': 'Red', 'blue': 'Blue', 'yellow': 'Yellow',
  'gold': 'Gold', 'silver': 'Silver', 'crystal': 'Crystal',
  'ruby': 'Ruby', 'sapphire': 'Sapphire', 'emerald': 'Emerald',
  'firered': 'FireRed', 'leafgreen': 'LeafGreen',
  'diamond': 'Diamond', 'pearl': 'Pearl', 'platinum': 'Platinum',
  'heartgold': 'HeartGold', 'soulsilver': 'SoulSilver',
  'black': 'Black', 'white': 'White', 'black-2': 'Black 2', 'white-2': 'White 2',
  'x': 'X', 'y': 'Y', 'omega-ruby': 'Omega Ruby', 'alpha-sapphire': 'Alpha Sapphire',
  'sun': 'Sun', 'moon': 'Moon', 'ultra-sun': 'Ultra Sun', 'ultra-moon': 'Ultra Moon',
  'sword': 'Sword', 'shield': 'Shield', 'scarlet': 'Scarlet', 'violet': 'Violet',
  'lets-go-pikachu': "Let's Go Pikachu", 'lets-go-eevee': "Let's Go Eevee",
};

// Map PokeAPI version-group slugs to individual display game names
export const VERSION_GROUP_TO_GAMES: Record<string, string[]> = {
  'red-blue': ['Red', 'Blue'], 'yellow': ['Yellow'],
  'gold-silver': ['Gold', 'Silver'], 'crystal': ['Crystal'],
  'ruby-sapphire': ['Ruby', 'Sapphire'], 'emerald': ['Emerald'],
  'firered-leafgreen': ['FireRed', 'LeafGreen'],
  'diamond-pearl': ['Diamond', 'Pearl'], 'platinum': ['Platinum'],
  'heartgold-soulsilver': ['HeartGold', 'SoulSilver'],
  'black-white': ['Black', 'White'], 'black-2-white-2': ['Black 2', 'White 2'],
  'x-y': ['X', 'Y'], 'omega-ruby-alpha-sapphire': ['Omega Ruby', 'Alpha Sapphire'],
  'sun-moon': ['Sun', 'Moon'], 'ultra-sun-ultra-moon': ['Ultra Sun', 'Ultra Moon'],
  'sword-shield': ['Sword', 'Shield'], 'scarlet-violet': ['Scarlet', 'Violet'],
};

// Method-to-hunt-mode mapping (mirrors server METHOD_TO_MODE)
export const METHOD_TO_HUNT_MODE: Record<string, string> = {
  walk: 'wild', surf: 'wild', 'old-rod': 'wild', 'good-rod': 'wild',
  'super-rod': 'wild', headbutt: 'wild', 'rock-smash': 'wild',
  gift: 'gift', 'only-one': 'gift',
};
