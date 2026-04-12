// Gen 4 (Diamond/Pearl/Platinum/HeartGold/SoulSilver) constants

export interface Gen4GameOffsets {
  generalSize: number;
  storageStart: number;
  storageSize: number;
  footerSize: number;
  partyCount: number;
  partyStart: number;
  trainerName: number;
  trainerTid: number;
  trainerSid: number;
  trainerGender: number;
  badges: number;
  badgesKanto?: number; // HGSS only
  boxStart: number;
  boxStride: number;
  numBoxes: number;
  // Play time (in general block)
  playTimeHours: number;    // u16 LE
  playTimeMinutes: number;  // u8
  playTimeSeconds: number;  // u8
  // Current zone (in general block, u16 LE — maps to met-location IDs)
  currentZone: number;
  // Bag pockets (in general block)
  bagItems: number;
  bagItemsCount: number;
  bagKeyItems: number;
  bagKeyItemsCount: number;
  bagTMHM: number;
  bagTMHMCount: number;
  bagBalls: number;
  bagBallsCount: number;
}

export const GEN4_DP_OFFSETS: Gen4GameOffsets = {
  generalSize: 0xC100,
  storageStart: 0xC100,
  storageSize: 0x121E0,
  footerSize: 0x14,
  partyCount: 0x94,
  partyStart: 0x98,
  trainerName: 0x64,
  trainerTid: 0x74,
  trainerSid: 0x76,
  trainerGender: 0x7C,
  badges: 0x7E,
  boxStart: 0x00,
  boxStride: 30 * 136,
  numBoxes: 18,
  playTimeHours: 0x86,
  playTimeMinutes: 0x88,
  playTimeSeconds: 0x89,
  currentZone: 0x0E7C, // Verified against Diamond save
  bagItems: 0x624,
  bagItemsCount: 165,
  bagKeyItems: 0x8B8,
  bagKeyItemsCount: 50,
  bagTMHM: 0xD28,
  bagTMHMCount: 100,
  bagBalls: 0xB40,
  bagBallsCount: 15,
};

export const GEN4_PT_OFFSETS: Gen4GameOffsets = {
  generalSize: 0xCF2C,
  storageStart: 0xCF2C,
  storageSize: 0x121E4,
  footerSize: 0x14,
  partyCount: 0x9C,
  partyStart: 0xA0,
  trainerName: 0x68,
  trainerTid: 0x78,
  trainerSid: 0x7A,
  trainerGender: 0x80,
  badges: 0x82,
  boxStart: 0x00,
  boxStride: 30 * 136,
  numBoxes: 18,
  playTimeHours: 0x8A,
  playTimeMinutes: 0x8C,
  playTimeSeconds: 0x8D,
  currentZone: 0x0E80, // Pt offset (DP shifted by 4)
  bagItems: 0x630,
  bagItemsCount: 165,
  bagKeyItems: 0x8C4,
  bagKeyItemsCount: 50,
  bagTMHM: 0xD34,
  bagTMHMCount: 100,
  bagBalls: 0xB4C,
  bagBallsCount: 15,
};

export const GEN4_HGSS_OFFSETS: Gen4GameOffsets = {
  generalSize: 0xF628,
  storageStart: 0xF700,
  storageSize: 0x12310,
  footerSize: 0x10,
  partyCount: 0x94,
  partyStart: 0x98,
  trainerName: 0x64,
  trainerTid: 0x74,
  trainerSid: 0x76,
  trainerGender: 0x7C,
  badges: 0x7E,
  badgesKanto: 0x83,
  boxStart: 0x00,
  boxStride: 0x1000, // HGSS pads boxes to 4096 bytes
  numBoxes: 18,
  playTimeHours: 0x86,
  playTimeMinutes: 0x88,
  playTimeSeconds: 0x89,
  currentZone: 0x0E7C, // Same as DP (HGSS shares trainer block layout)
  bagItems: 0x644,
  bagItemsCount: 165,
  bagKeyItems: 0x8D8,
  bagKeyItemsCount: 50,
  bagTMHM: 0xD48,
  bagTMHMCount: 100,
  bagBalls: 0xB60,
  bagBallsCount: 24, // More balls due to Apricorn Balls
};

export function getGen4Offsets(game: string): Gen4GameOffsets {
  const lower = game.toLowerCase();
  if (lower.includes('platinum')) return GEN4_PT_OFFSETS;
  if (lower.includes('heartgold') || lower.includes('soulsilver')) return GEN4_HGSS_OFFSETS;
  return GEN4_DP_OFFSETS;
}

// Sinnoh-specific items and HGSS additions
export const GEN4_ITEMS: Record<number, string> = {
  // Sinnoh orbs
  109: 'Adamant Orb', 110: 'Lustrous Orb', 111: 'Griseous Orb',
  // Mail items (137-148)
  137: 'Orange Mail', 138: 'Harbor Mail', 139: 'Glitter Mail',
  140: 'Mech Mail', 141: 'Wood Mail', 142: 'Wave Mail',
  143: 'Bead Mail', 144: 'Shadow Mail', 145: 'Tropic Mail',
  146: 'Dream Mail', 147: 'Fab Mail', 148: 'Retro Mail',
  // HGSS Apricorn Balls (492-500 via items — see GEN4_BALL_ITEM_IDS for actual ball IDs)
  485: 'Fast Ball', 486: 'Level Ball', 487: 'Lure Ball',
  488: 'Heavy Ball', 489: 'Love Ball', 490: 'Friend Ball',
  491: 'Moon Ball',
};

// Key item IDs (428-467)
export const GEN4_KEY_ITEMS = new Set<number>([
  428, 429, 430, 431, 432, 433, 434, 435, 436, 437,
  438, 439, 440, 441, 442, 443, 444, 445, 446, 447,
  448, 449, 450, 451, 452, 453, 454, 455, 456, 457,
  458, 459, 460, 461, 462, 463, 464, 465, 466, 467,
]);

// Ball item IDs: standard 1-12 plus HGSS apricorn balls 492-500
export const GEN4_BALL_ITEM_IDS = new Set<number>([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  492, 493, 494, 495, 496, 497, 498, 499, 500,
]);

// TM item IDs: 328 (TM01) through 419 (TM92)
export const GEN4_TM_START = 328;
export const GEN4_TM_END = 419;

// HM item IDs: 420 (HM01) through 427 (HM08)
export const GEN4_HM_START = 420;
export const GEN4_HM_END = 427;

export function gen4ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN4_TM_START && itemId <= GEN4_TM_END) {
    return itemId - GEN4_TM_START + 1;
  }
  return null;
}

export function gen4ItemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN4_HM_START && itemId <= GEN4_HM_END) {
    return itemId - GEN4_HM_START + 1;
  }
  return null;
}
