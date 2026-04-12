// Gen 5 (Black/White/Black 2/White 2) constants

export interface Gen5GameOffsets {
  partyCount: number;
  partyStart: number;
  partySlotSize: number;
  boxStart: number;
  boxStride: number;
  numBoxes: number;
  trainerName: number;
  trainerTid: number;
  trainerSid: number;
  backupOffset: number;
  // Play time (absolute offsets — 4 bytes before trainer name)
  playTimeHours: number;    // u16 LE
  playTimeMinutes: number;  // u8
  playTimeSeconds: number;  // u8
  // Bag pockets (absolute offsets). Gen 5 has no separate balls pocket —
  // balls are in the regular items pocket, so we scan items for ball IDs.
  bagItems: number;
  bagItemsCount: number;
  bagKeyItems: number;
  bagKeyItemsCount: number;
  bagTMHM: number;
  bagTMHMCount: number;
}

export const GEN5_BW_OFFSETS: Gen5GameOffsets = {
  partyCount: 0x18E04,
  partyStart: 0x18E08,
  partySlotSize: 220,
  boxStart: 0x400,
  boxStride: 0x1000,
  numBoxes: 24,
  trainerName: 0x19404,
  trainerTid: 0x19414,
  trainerSid: 0x19416,
  backupOffset: 0x24000,
  playTimeHours: 0x19400,
  playTimeMinutes: 0x19402,
  playTimeSeconds: 0x19403,
  bagItems: 0x18400,
  bagItemsCount: 310,
  bagKeyItems: 0x188D8,
  bagKeyItemsCount: 83,
  bagTMHM: 0x18A24,
  bagTMHMCount: 109,
};

export const GEN5_B2W2_OFFSETS: Gen5GameOffsets = {
  partyCount: 0x18E04,
  partyStart: 0x18E08,
  partySlotSize: 220,
  boxStart: 0x400,
  boxStride: 0x1000,
  numBoxes: 24,
  trainerName: 0x19404,
  trainerTid: 0x19414,
  trainerSid: 0x19416,
  backupOffset: 0x26000,
  playTimeHours: 0x19400,
  playTimeMinutes: 0x19402,
  playTimeSeconds: 0x19403,
  bagItems: 0x18400,
  bagItemsCount: 310,
  bagKeyItems: 0x188D8,
  bagKeyItemsCount: 83,
  bagTMHM: 0x18A24,
  bagTMHMCount: 109,
};

export function getGen5Offsets(game: string): Gen5GameOffsets {
  const lower = game.toLowerCase();
  if (
    lower.includes('black 2') || lower.includes('white 2') ||
    lower.includes('b2') || lower.includes('w2')
  ) {
    return GEN5_B2W2_OFFSETS;
  }
  return GEN5_BW_OFFSETS;
}

// Gen 5-specific items
export const GEN5_ITEMS: Record<number, string> = {
  // Dream Ball
  577: 'Dream Ball',
  // Key items
  437: 'Xtransceiver',
  442: 'Liberty Pass',
  // Additional Gen 5 notable items
  626: 'DNA Splicers',
  627: 'DNA Splicers',
  628: 'Reveal Glass',
  629: 'Prison Bottle',
};

// Key item IDs (Gen 5 key items)
export const GEN5_KEY_ITEMS = new Set<number>([
  428, 429, 430, 431, 432, 433, 434, 435, 436, 437,
  438, 439, 440, 441, 442, 443, 444, 445, 446, 447,
  448, 449, 450, 451, 452, 453, 454, 455, 456, 457,
  458, 459, 460, 461, 462, 463, 464, 465, 466, 467,
  468, 469, 470, 471, 472, 473, 474, 475, 476, 477,
]);

// Ball item IDs: standard 1-16 plus Dream Ball (577)
export const GEN5_BALL_ITEM_IDS = new Set<number>([
  1,  // Master Ball
  2,  // Ultra Ball
  3,  // Great Ball
  4,  // Poké Ball
  5,  // Safari Ball
  6,  // Net Ball
  7,  // Dive Ball
  8,  // Nest Ball
  9,  // Repeat Ball
  10, // Timer Ball
  11, // Luxury Ball
  12, // Premier Ball
  13, // Dusk Ball
  14, // Heal Ball
  15, // Quick Ball
  16, // Cherish Ball
  577, // Dream Ball
]);
