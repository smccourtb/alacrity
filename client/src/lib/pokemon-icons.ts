// client/src/lib/pokemon-icons.ts
// Single source of truth for all icon/sprite mappings.

// ── Type SVGs ────────────────────────────────────────────────────────────────
import bugSvg from '@/assets/icons/types/bug.svg';
import darkSvg from '@/assets/icons/types/dark.svg';
import dragonSvg from '@/assets/icons/types/dragon.svg';
import electricSvg from '@/assets/icons/types/electric.svg';
import fairySvg from '@/assets/icons/types/fairy.svg';
import fightingSvg from '@/assets/icons/types/fighting.svg';
import fireSvg from '@/assets/icons/types/fire.svg';
import flyingSvg from '@/assets/icons/types/flying.svg';
import ghostSvg from '@/assets/icons/types/ghost.svg';
import grassSvg from '@/assets/icons/types/grass.svg';
import groundSvg from '@/assets/icons/types/ground.svg';
import iceSvg from '@/assets/icons/types/ice.svg';
import normalSvg from '@/assets/icons/types/normal.svg';
import poisonSvg from '@/assets/icons/types/poison.svg';
import psychicSvg from '@/assets/icons/types/psychic.svg';
import rockSvg from '@/assets/icons/types/rock.svg';
import steelSvg from '@/assets/icons/types/steel.svg';
import waterSvg from '@/assets/icons/types/water.svg';

// ── Special icons ────────────────────────────────────────────────────────────
import shinyStarsPng from '@/assets/sprites/special/shiny-stars.png';
import maleSvg from '@/assets/icons/gender/male.svg';
import femaleSvg from '@/assets/icons/gender/female.svg';
import pokerusSvg from '@/assets/icons/pokerus.svg';

// ── Move category PNGs ───────────────────────────────────────────────────────
import physicalPng from '@/assets/sprites/move-category/physical.png';
import specialPng from '@/assets/sprites/move-category/special.png';
import statusPng from '@/assets/sprites/move-category/status.png';

// ── Type icon mapping ────────────────────────────────────────────────────────
export const TYPE_ICONS: Record<string, string> = {
  bug: bugSvg,
  dark: darkSvg,
  dragon: dragonSvg,
  electric: electricSvg,
  fairy: fairySvg,
  fighting: fightingSvg,
  fire: fireSvg,
  flying: flyingSvg,
  ghost: ghostSvg,
  grass: grassSvg,
  ground: groundSvg,
  ice: iceSvg,
  normal: normalSvg,
  poison: poisonSvg,
  psychic: psychicSvg,
  rock: rockSvg,
  steel: steelSvg,
  water: waterSvg,
};

// ── Move category icon mapping ───────────────────────────────────────────────
export const MOVE_CATEGORY_ICONS: Record<string, string> = {
  physical: physicalPng,
  special: specialPng,
  status: statusPng,
};

// ── Re-export special icons ──────────────────────────────────────────────────
export { shinyStarsPng, maleSvg, femaleSvg, pokerusSvg };

// ── Ball sprites ─────────────────────────────────────────────────────────────
export const BALL_SPRITES: Record<string, string> = {
  'Poke Ball': 'poke',
  'Great Ball': 'great',
  'Ultra Ball': 'ultra',
  'Master Ball': 'master',
  'Love Ball': 'love',
  'Moon Ball': 'moon',
  'Friend Ball': 'friend',
  'Fast Ball': 'fast',
  'Lure Ball': 'lure',
  'Level Ball': 'level',
  'Heavy Ball': 'heavy',
  'Safari Ball': 'safari',
  'Sport Ball': 'sport',
  'Dream Ball': 'dream',
  'Beast Ball': 'beast',
  'Dive Ball': 'dive',
  'Dusk Ball': 'dusk',
  'Heal Ball': 'heal',
  'Luxury Ball': 'luxury',
  'Nest Ball': 'nest',
  'Net Ball': 'net',
  'Premier Ball': 'premier',
  'Quick Ball': 'quick',
  'Repeat Ball': 'repeat',
  'Timer Ball': 'timer',
  'Cherish Ball': 'cherish',
};

const ballSpriteModules = import.meta.glob<string>(
  '/src/assets/sprites/balls/*.png',
  { eager: true, query: '?url', import: 'default' },
);

export function getBallSpriteUrl(ballName: string): string | undefined {
  const slug = BALL_SPRITES[ballName];
  if (!slug) return undefined;
  const key = `/src/assets/sprites/balls/${slug}.png`;
  return ballSpriteModules[key];
}

// ── Origin marks ─────────────────────────────────────────────────────────────
export const ORIGIN_MARK_MAP: Record<string, string> = {
  Red: 'game-boy',
  Blue: 'game-boy',
  Yellow: 'game-boy',
  Gold: 'game-boy',
  Silver: 'game-boy',
  Crystal: 'game-boy',
  X: 'pentagon',
  Y: 'pentagon',
  'Omega Ruby': 'pentagon',
  'Alpha Sapphire': 'pentagon',
  Sun: 'clover',
  Moon: 'clover',
  'Ultra Sun': 'clover',
  'Ultra Moon': 'clover',
  Sword: 'galar',
  Shield: 'galar',
  'Brilliant Diamond': 'sinnoh-gen8',
  'Shining Pearl': 'sinnoh-gen8',
  'Legends Arceus': 'hisui',
  Scarlet: 'paldea',
  Violet: 'paldea',
  'Pokemon GO': 'go',
  "Let's Go Pikachu": 'lets-go',
  "Let's Go Eevee": 'lets-go',
};

const originMarkModules = import.meta.glob<string>(
  '/src/assets/sprites/origin-marks/*.png',
  { eager: true, query: '?url', import: 'default' },
);

export function getOriginMarkUrl(game: string): string | undefined {
  const mark = ORIGIN_MARK_MAP[game];
  if (!mark) return undefined;
  const key = `/src/assets/sprites/origin-marks/${mark}.png`;
  return originMarkModules[key];
}

// ── Origin mark groups (for checklist display) ───────────────────────────────
export const ORIGIN_MARK_GROUPS = [
  {
    label: 'Gen 1-2 VC',
    mark: 'game-boy',
    games: ['Red', 'Blue', 'Yellow', 'Gold', 'Silver', 'Crystal'],
  },
  {
    label: 'Gen 6',
    mark: 'pentagon',
    games: ['X', 'Y', 'Omega Ruby', 'Alpha Sapphire'],
  },
  {
    label: 'Gen 7',
    mark: 'clover',
    games: ['Sun', 'Moon', 'Ultra Sun', 'Ultra Moon'],
  },
  { label: 'Gen 8', mark: 'galar', games: ['Sword', 'Shield'] },
  { label: 'Gen 9', mark: 'paldea', games: ['Scarlet', 'Violet'] },
  { label: 'GO', mark: 'go', games: ['Pokemon GO'] },
] as const;

// ── Game versions ────────────────────────────────────────────────────────────
export interface GameVersion {
  name: string;
  color: string;
  textColor: string;
  gen: number;
}

export const GAME_VERSIONS: Record<string, GameVersion> = {
  Red: { name: 'Red', color: '#FF1111', textColor: '#fff', gen: 1 },
  Blue: { name: 'Blue', color: '#1111FF', textColor: '#fff', gen: 1 },
  Yellow: { name: 'Yellow', color: '#FFD733', textColor: '#333', gen: 1 },
  Gold: { name: 'Gold', color: '#DAA520', textColor: '#fff', gen: 2 },
  Silver: { name: 'Silver', color: '#C0C0C0', textColor: '#333', gen: 2 },
  Crystal: { name: 'Crystal', color: '#4FD5D6', textColor: '#fff', gen: 2 },
  Ruby: { name: 'Ruby', color: '#A00000', textColor: '#fff', gen: 3 },
  Sapphire: { name: 'Sapphire', color: '#0000A0', textColor: '#fff', gen: 3 },
  Emerald: { name: 'Emerald', color: '#00A000', textColor: '#fff', gen: 3 },
  FireRed: { name: 'FireRed', color: '#FF4500', textColor: '#fff', gen: 3 },
  LeafGreen: { name: 'LeafGreen', color: '#228B22', textColor: '#fff', gen: 3 },
  Diamond: { name: 'Diamond', color: '#AAAAFF', textColor: '#333', gen: 4 },
  Pearl: { name: 'Pearl', color: '#FFAAAA', textColor: '#333', gen: 4 },
  Platinum: { name: 'Platinum', color: '#999999', textColor: '#fff', gen: 4 },
  HeartGold: { name: 'HeartGold', color: '#B69E31', textColor: '#fff', gen: 4 },
  SoulSilver: { name: 'SoulSilver', color: '#C0C0E0', textColor: '#333', gen: 4 },
  Black: { name: 'Black', color: '#444444', textColor: '#fff', gen: 5 },
  White: { name: 'White', color: '#E0E0E0', textColor: '#333', gen: 5 },
  'Black 2': { name: 'Black 2', color: '#444444', textColor: '#fff', gen: 5 },
  'White 2': { name: 'White 2', color: '#E0E0E0', textColor: '#333', gen: 5 },
  X: { name: 'X', color: '#025DA6', textColor: '#fff', gen: 6 },
  Y: { name: 'Y', color: '#EA1A3E', textColor: '#fff', gen: 6 },
  'Omega Ruby': { name: 'Omega Ruby', color: '#CF3025', textColor: '#fff', gen: 6 },
  'Alpha Sapphire': { name: 'Alpha Sapphire', color: '#26649C', textColor: '#fff', gen: 6 },
  Sun: { name: 'Sun', color: '#F5A623', textColor: '#fff', gen: 7 },
  Moon: { name: 'Moon', color: '#5599CA', textColor: '#fff', gen: 7 },
  'Ultra Sun': { name: 'Ultra Sun', color: '#E8590C', textColor: '#fff', gen: 7 },
  'Ultra Moon': { name: 'Ultra Moon', color: '#2E3192', textColor: '#fff', gen: 7 },
  Sword: { name: 'Sword', color: '#00A1E9', textColor: '#fff', gen: 8 },
  Shield: { name: 'Shield', color: '#E60033', textColor: '#fff', gen: 8 },
  'Brilliant Diamond': { name: 'Brilliant Diamond', color: '#44C8F5', textColor: '#333', gen: 8 },
  'Shining Pearl': { name: 'Shining Pearl', color: '#F0719B', textColor: '#fff', gen: 8 },
  'Legends Arceus': { name: 'Legends Arceus', color: '#36454F', textColor: '#fff', gen: 8 },
  Scarlet: { name: 'Scarlet', color: '#E85D04', textColor: '#fff', gen: 9 },
  Violet: { name: 'Violet', color: '#7B2D8B', textColor: '#fff', gen: 9 },
  'Pokemon GO': { name: 'Pokemon GO', color: '#1C94D2', textColor: '#fff', gen: 0 },
  "Let's Go Pikachu": { name: "Let's Go Pikachu", color: '#F5D442', textColor: '#333', gen: 7 },
  "Let's Go Eevee": { name: "Let's Go Eevee", color: '#C27D38', textColor: '#fff', gen: 7 },
  Colosseum: { name: 'Colosseum', color: '#8B6914', textColor: '#fff', gen: 3 },
  XD: { name: 'XD', color: '#4B0082', textColor: '#fff', gen: 3 },
};

// ── Item sprites ─────────────────────────────────────────────────────────────
const itemSpriteModules = import.meta.glob<string>(
  '/src/assets/sprites/items/**/*.png',
  { eager: true, query: '?url', import: 'default' },
);

export function getItemSpriteUrl(itemName: string): string | undefined {
  const slug = itemName.toLowerCase().replace(/\s+/g, '-');
  for (const key of Object.keys(itemSpriteModules)) {
    if (key.endsWith(`/${slug}.png`)) {
      return itemSpriteModules[key];
    }
  }
  return undefined;
}

// ── Ribbon sprites ───────────────────────────────────────────────────────────
const ribbonSpriteModules = import.meta.glob<string>(
  '/src/assets/sprites/ribbons/*.png',
  { eager: true, query: '?url', import: 'default' },
);

export function getRibbonSpriteUrl(ribbonName: string): string | undefined {
  const slug = ribbonName.toLowerCase().replace(/\s+/g, '-');
  const key = `/src/assets/sprites/ribbons/${slug}.png`;
  return ribbonSpriteModules[key];
}
