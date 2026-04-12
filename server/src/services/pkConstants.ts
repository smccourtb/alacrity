// Game version IDs as stored in pk6/pk7 binary format
// Source: https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Game/Enums/GameVersion.cs
export const GAME_VERSION: Record<number, string> = {
  1: 'Sapphire', 2: 'Ruby', 3: 'Emerald', 4: 'FireRed', 5: 'LeafGreen',
  7: 'HeartGold', 8: 'SoulSilver',
  10: 'Diamond', 11: 'Pearl', 12: 'Platinum',
  15: 'Colosseum/XD',
  20: 'White', 21: 'Black', 22: 'White 2', 23: 'Black 2',
  24: 'X', 25: 'Y', 26: 'Alpha Sapphire', 27: 'Omega Ruby',
  30: 'Sun', 31: 'Moon', 32: 'Ultra Sun', 33: 'Ultra Moon',
  34: 'Pokemon GO',
  35: 'Red', 36: 'Blue', 37: 'Blue (JP)', 38: 'Yellow',
  39: 'Gold', 40: 'Silver', 41: 'Crystal',
  42: "Let's Go Pikachu", 43: "Let's Go Eevee",
  44: 'Sword', 45: 'Shield',
  47: 'Legends Arceus', 48: 'Brilliant Diamond', 49: 'Shining Pearl',
  50: 'Scarlet', 51: 'Violet',
};

export const NATURE_NAMES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
];

export const BALL_NAMES: Record<number, string> = {
  1: 'Master Ball', 2: 'Ultra Ball', 3: 'Great Ball', 4: 'Poke Ball',
  5: 'Safari Ball', 6: 'Net Ball', 7: 'Dive Ball', 8: 'Nest Ball',
  9: 'Repeat Ball', 10: 'Timer Ball', 11: 'Luxury Ball', 12: 'Premier Ball',
  13: 'Dusk Ball', 14: 'Heal Ball', 15: 'Quick Ball', 16: 'Cherish Ball',
  17: 'Fast Ball', 18: 'Level Ball', 19: 'Lure Ball', 20: 'Heavy Ball',
  21: 'Love Ball', 22: 'Friend Ball', 23: 'Moon Ball', 24: 'Sport Ball',
  25: 'Dream Ball', 26: 'Beast Ball',
};

// Canonical display names for games used in the save pipeline.
// Keys are the lowercase forms used for DB matching throughout the app.
const PRETTY_GAME_NAMES: Record<string, string> = {
  red: 'Red', blue: 'Blue', yellow: 'Yellow',
  gold: 'Gold', silver: 'Silver', crystal: 'Crystal',
  ruby: 'Ruby', sapphire: 'Sapphire', emerald: 'Emerald',
  firered: 'FireRed', leafgreen: 'LeafGreen',
  diamond: 'Diamond', pearl: 'Pearl', platinum: 'Platinum',
  heartgold: 'HeartGold', soulsilver: 'SoulSilver',
  black: 'Black', white: 'White', 'black 2': 'Black 2', 'white 2': 'White 2',
  x: 'X', y: 'Y', 'omega ruby': 'Omega Ruby', 'alpha sapphire': 'Alpha Sapphire',
  sun: 'Sun', moon: 'Moon', 'ultra sun': 'Ultra Sun', 'ultra moon': 'Ultra Moon',
};

/** Convert a lowercase game key (spaces or underscores) to its canonical display name. */
export function prettyGameName(game: string): string {
  const normalized = game.toLowerCase().replace(/_/g, ' ').replace(/^pok[eé]mon\s+/i, '');
  return PRETTY_GAME_NAMES[normalized]
    ?? normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Ability/move resolution via pokedex-promise-v2 (has built-in caching)
import pokeApi from './pokeApi.js';

export async function resolveAbility(id: number): Promise<string> {
  try {
    const ability = await pokeApi.getAbilityByName(id);
    return (ability as any).name;
  } catch { return `ability-${id}`; }
}

export async function resolveMove(id: number): Promise<string> {
  if (id === 0) return '';
  try {
    const move = await pokeApi.getMoveByName(id);
    return (move as any).name.replace(/-/g, ' ');
  } catch { return `move-${id}`; }
}

// Batch resolve moves (faster)
export async function resolveMoves(ids: number[]): Promise<string[]> {
  return Promise.all(ids.map(id => resolveMove(id)));
}
