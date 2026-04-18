import type { HuntFormValues } from './types';

export const is3DSGame = (game: string) =>
  ["Pokemon X", "Pokemon Y", "Pokemon Omega Ruby", "Pokemon Alpha Sapphire",
   "Pokemon Sun", "Pokemon Moon", "Pokemon Ultra Sun", "Pokemon Ultra Moon"].includes(game);

export const ENCOUNTER_TYPES: Record<string, { value: string; label: string }[]> = {
  "Pokemon X": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "horde", label: "Horde" },
    { value: "friend_safari", label: "Friend Safari" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Y": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "horde", label: "Horde" },
    { value: "friend_safari", label: "Friend Safari" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Omega Ruby": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "horde", label: "Horde" },
    { value: "dexnav", label: "DexNav" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Alpha Sapphire": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "horde", label: "Horde" },
    { value: "dexnav", label: "DexNav" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Sun": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "sos", label: "SOS Chain" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Moon": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "sos", label: "SOS Chain" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Ultra Sun": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "sos", label: "SOS Chain" },
    { value: "wormhole", label: "Ultra Wormhole" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
  "Pokemon Ultra Moon": [
    { value: "stationary", label: "Stationary" },
    { value: "wild", label: "Wild" },
    { value: "sos", label: "SOS Chain" },
    { value: "wormhole", label: "Ultra Wormhole" },
    { value: "breeding", label: "Breeding" },
    { value: "gift", label: "Gift" },
  ],
};

export const NATURES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
];

export const IV_STATS: { key: keyof NonNullable<HuntFormValues['target_ivs']>; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'Atk' },
  { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' },
  { key: 'spd', label: 'SpD' },
  { key: 'spe', label: 'Spe' },
];

export const SHINY_ATK_VALUES = [2, 3, 6, 7, 10, 11, 14, 15];

export const RNG_PRESETS = [
  { value: 'quick_shiny', label: 'Quick Shiny', activeClassName: 'bg-yellow-500/10 text-amber-600 border border-yellow-500/25 shadow-sm' },
  { value: 'competitive_shiny', label: 'Comp Shiny', activeClassName: 'bg-yellow-500/10 text-amber-600 border border-yellow-500/25 shadow-sm' },
  { value: 'perfect_shiny', label: 'Perfect Shiny', activeClassName: 'bg-purple-500/10 text-purple-600 border border-purple-500/25 shadow-sm' },
  { value: 'competitive', label: 'Competitive', activeClassName: 'bg-blue-500/10 text-blue-600 border border-blue-500/25 shadow-sm' },
  { value: 'custom', label: 'Custom', activeClassName: 'bg-surface-sunken text-foreground border border-border shadow-sm' },
];

export const CONDITION_OPTIONS = [
  { value: 'shiny', label: 'Shiny', activeClassName: 'bg-yellow-500/10 text-amber-600 border border-yellow-500/25 shadow-sm' },
  { value: 'perfect', label: 'Perfect', activeClassName: 'bg-blue-500/10 text-blue-600 border border-blue-500/25 shadow-sm' },
];

export const HUNT_MODE_DESCRIPTIONS: Record<'wild' | 'stationary' | 'gift' | 'egg', string> = {
  wild: 'Walks in place to trigger random encounters — requires standing on grass, cave tiles, or water. Does not cast a rod or use Headbutt.',
  stationary: 'Presses A to start a scripted battle (legendaries, starter resets). Save must be placed directly in front of the target with the party ready.',
  gift: 'Advances dialogue with an NPC who hands over a Pokemon (e.g. Lapras, Eevee). Save must be placed at the relevant dialogue trigger.',
  egg: 'Cycles between taking an egg from the daycare and hatching it. Requires two compatible parents deposited and at least one Pokemon in the party to hold the egg.',
};
