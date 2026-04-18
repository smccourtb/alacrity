import type { HuntFormValues } from './types';

export const is3DSGame = (game: string) =>
  ["Pokemon X", "Pokemon Y", "Pokemon Omega Ruby", "Pokemon Alpha Sapphire",
   "Pokemon Sun", "Pokemon Moon", "Pokemon Ultra Sun", "Pokemon Ultra Moon"].includes(game);

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

export type HuntModeKey = 'wild' | 'stationary' | 'gift' | 'egg' | 'fishing';

// Gen 6/7 encounter method — drives IV guarantees, HA rate, and shiny-boost hints.
export const ENCOUNTER_TYPES = [
  { value: 'stationary',    label: 'Stationary',    guaranteedIvs: 3, blurb: 'Legendary / interactable static — 3 guaranteed IVs' },
  { value: 'wild',          label: 'Wild',          guaranteedIvs: 0, blurb: 'Standard grass / cave / surf encounter' },
  { value: 'friend_safari', label: 'Friend Safari', guaranteedIvs: 2, blurb: '2 guaranteed IVs · ~1/3 Hidden Ability' },
  { value: 'horde',         label: 'Horde',         guaranteedIvs: 0, blurb: '5 Pokemon per battle · 5% HA per slot' },
  { value: 'dexnav_chain',  label: 'DexNav chain',  guaranteedIvs: 0, blurb: 'Search Level drives HA chance (max 25% at SL ≥100)' },
  { value: 'sos_chain',     label: 'SOS chain',     guaranteedIvs: 3, blurb: 'Chain ≥30 → 3 IVs + 15% HA; chain ≥70 boosts shiny odds' },
  { value: 'breeding',      label: 'Breeding',      guaranteedIvs: 5, blurb: 'Destiny Knot passes 5 parent IVs; Masuda → 6× shiny' },
] as const;

export type EncounterType = typeof ENCOUNTER_TYPES[number]['value'];

export const HUNT_MODE_DESCRIPTIONS: Record<HuntModeKey, string> = {
  wild: 'Walks in place to trigger random encounters — requires standing on grass or cave tiles. Does not cast a rod or use Headbutt.',
  stationary: 'Presses A to start a scripted battle (legendaries, starter resets). Save must be placed directly in front of the target with the party ready.',
  gift: 'Advances dialogue with an NPC who hands over a Pokemon (e.g. Lapras, Eevee). Save must be placed at the relevant dialogue trigger.',
  egg: 'Cycles between taking an egg from the daycare and hatching it. Requires two compatible parents deposited and at least one Pokemon in the party to hold the egg.',
  fishing: 'Casts a rod at a water tile and resets on no-bite / wrong mon. Requires rod in bag and save placed facing water. Script coming soon — selectable for categorization only.',
};
