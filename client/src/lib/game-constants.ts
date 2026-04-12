// client/src/lib/game-constants.ts

export type SystemType = 'gb' | 'gbc' | 'gba' | 'nds' | '3ds';

export const GAME_ACCENTS: Record<string, string> = {
  Red: '#ef4444', Blue: '#3b82f6', Yellow: '#eab308',
  Gold: '#d97706', Silver: '#94a3b8', Crystal: '#06b6d4',
  Ruby: '#be123c', Sapphire: '#4338ca', Emerald: '#059669',
  FireRed: '#ea580c', LeafGreen: '#65a30d',
  Diamond: '#818cf8', Pearl: '#f9a8d4', Platinum: '#64748b',
  HeartGold: '#f59e0b', SoulSilver: '#94a3b8',
  Black: '#374151', White: '#d1d5db',
  'Black 2': '#4b1113', 'White 2': '#93c5fd',
  X: '#4f46e5', Y: '#e11d48',
  'Omega Ruby': '#9f1239', 'Alpha Sapphire': '#312e81',
  Sun: '#f97316', Moon: '#7c3aed',
  'Ultra Sun': '#dc2626', 'Ultra Moon': '#6d28d9',
};

export const GAME_RELEASE_ORDER: string[] = [
  'Red', 'Blue', 'Yellow',
  'Gold', 'Silver', 'Crystal',
  'Ruby', 'Sapphire', 'FireRed', 'LeafGreen', 'Emerald',
  'Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver',
  'Black', 'White', 'Black 2', 'White 2',
  'X', 'Y', 'Omega Ruby', 'Alpha Sapphire',
  'Sun', 'Moon', 'Ultra Sun', 'Ultra Moon',
];

export function getSystemForGame(game: string): SystemType {
  const lower = game.toLowerCase();
  if (lower.includes('red') || lower.includes('blue') || lower.includes('yellow')) return 'gb';
  if (lower.includes('gold') || lower.includes('silver') || lower.includes('crystal')) return 'gbc';
  if (lower.includes('ruby') || lower.includes('sapphire') || lower.includes('emerald')
    || lower.includes('firered') || lower.includes('leafgreen')) return 'gba';
  if (lower.includes('diamond') || lower.includes('pearl') || lower.includes('platinum')
    || lower.includes('heartgold') || lower.includes('soulsilver')
    || lower.includes('black') || lower.includes('white')) return 'nds';
  return '3ds';
}

export interface DiscoveredSave {
  id: number;
  file_path: string;
  game: string;
  generation: number | null;
  label: string;
  source: 'checkpoint' | 'catch' | 'library' | 'hunt';
  format: string;
  file_size: number;
  file_mtime: string;
  save_timestamp: string | null;
  launchable: boolean;
  rom_path: string | null;
  notes: string;
}

/** Normalize any game name variant to canonical form (e.g. "blue" | "Pokemon Blue" → "Blue") */
const CANONICAL_LOOKUP = new Map<string, string>();
for (const name of GAME_RELEASE_ORDER) {
  CANONICAL_LOOKUP.set(name.toLowerCase(), name);
}

export function normalizeGameName(raw: string): string {
  // Strip "Pokemon " prefix
  const stripped = raw.replace(/^Pokemon\s+/i, '');
  // Try exact match first, then case-insensitive
  if (CANONICAL_LOOKUP.has(stripped.toLowerCase())) {
    return CANONICAL_LOOKUP.get(stripped.toLowerCase())!;
  }
  // Fallback: capitalize first letter of each word
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

export function sortByRelease(games: string[]): string[] {
  return [...games].sort((a, b) => {
    const ai = GAME_RELEASE_ORDER.indexOf(a);
    const bi = GAME_RELEASE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
