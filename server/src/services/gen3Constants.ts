// Gen 3 (Ruby/Sapphire/Emerald/FireRed/LeafGreen) constants

// Internal Gen 3 species index → National Dex number
// Indices 1-251 map 1:1 (Bulbasaur–Celebi)
// Gen 3 Pokemon (Treecko–Deoxys) use internal indices 277-411 → national 252-386
export const GEN3_SPECIES_TO_NATIONAL: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  // Kanto + Johto: 1:1
  for (let i = 1; i <= 251; i++) {
    map[i] = i;
  }
  // Hoenn: internal 277-411 → national 252-386
  for (let i = 277; i <= 411; i++) {
    map[i] = i - 25; // 277-25=252, 411-25=386
  }
  return map;
})();

// Origin game ID → game name
export const GEN3_ORIGIN_GAME: Record<number, string> = {
  1: 'Sapphire',
  2: 'Ruby',
  3: 'Emerald',
  4: 'FireRed',
  5: 'LeafGreen',
  15: 'Colosseum/XD',
};

// Ball ID → name (only 4 bits available in PK3 format, IDs 1-12)
export const GEN3_BALL_NAMES: Record<number, string> = {
  1: 'Master Ball',
  2: 'Ultra Ball',
  3: 'Great Ball',
  4: 'Poké Ball',
  5: 'Safari Ball',
  6: 'Net Ball',
  7: 'Dive Ball',
  8: 'Nest Ball',
  9: 'Repeat Ball',
  10: 'Timer Ball',
  11: 'Luxury Ball',
  12: 'Premier Ball',
};

// Item ID → name
export const GEN3_ITEMS: Record<number, string> = {
  // Poké Balls (1-12)
  1: 'Master Ball', 2: 'Ultra Ball', 3: 'Great Ball', 4: 'Poké Ball',
  5: 'Safari Ball', 6: 'Net Ball', 7: 'Dive Ball', 8: 'Nest Ball',
  9: 'Repeat Ball', 10: 'Timer Ball', 11: 'Luxury Ball', 12: 'Premier Ball',
  // Medicine (13-29)
  13: 'Potion', 14: 'Antidote', 15: 'Burn Heal', 16: 'Ice Heal',
  17: 'Awakening', 18: 'Parlyz Heal', 19: 'Full Restore', 20: 'Max Potion',
  21: 'Hyper Potion', 22: 'Super Potion', 23: 'Full Heal',
  24: 'Revive', 25: 'Max Revive',
  26: 'Fresh Water', 27: 'Soda Pop', 28: 'Lemonade', 29: 'Moomoo Milk',
  // Vitamins (63-71)
  63: 'HP Up', 64: 'Protein', 65: 'Iron', 66: 'Carbos',
  67: 'Calcium', 68: 'Rare Candy', 69: 'PP Up', 70: 'Zinc', 71: 'PP Max',
  // Battle items (73-79)
  73: 'Guard Spec.', 74: 'Dire Hit', 75: 'X Attack', 76: 'X Defend',
  77: 'X Speed', 78: 'X Accuracy', 79: 'X Special',
  // Repels (83-85)
  83: 'Repel', 84: 'Super Repel', 85: 'Max Repel',
  // Evolution Stones (93-98)
  93: 'Fire Stone', 94: 'Thunder Stone', 95: 'Water Stone',
  96: 'Moon Stone', 97: 'Leaf Stone', 98: 'Sun Stone',
  // Hold items (175-207)
  175: 'Bright Powder', 176: 'White Herb', 177: 'Macho Brace',
  178: 'Exp. Share', 179: 'Quick Claw', 180: 'Soothe Bell',
  181: 'Mental Herb', 182: 'Choice Band', 183: 'King\'s Rock',
  184: 'Silverpowder', 185: 'Amulet Coin', 186: 'Cleanse Tag',
  187: 'Soul Dew', 188: 'DeepSeaTooth', 189: 'DeepSeaScale',
  190: 'Smoke Ball', 191: 'Everstone', 192: 'Focus Band',
  193: 'Lucky Egg', 194: 'Scope Lens', 195: 'Metal Coat',
  196: 'Leftovers', 197: 'Dragon Scale', 198: 'Light Ball',
  199: 'Soft Sand', 200: 'Hard Stone', 201: 'Miracle Seed',
  202: 'BlackGlasses', 203: 'Black Belt', 204: 'Magnet',
  205: 'Mystic Water', 206: 'Sharp Beak', 207: 'Poison Barb',
};

// Key item IDs
export const GEN3_KEY_ITEMS = new Set<number>([
  259, 260, 261, 262, 263, 264, 265, 266, 267, 268,
  269, 270, 271, 272, 273, 274, 275, 276, 277, 278,
  279, 280, 281, 282, 283, 284, 285, 286, 287, 288,
]);

// Ball item IDs
export const GEN3_BALL_ITEM_IDS = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

// TM item IDs: 289 (TM01) through 338 (TM50)
export const GEN3_TM_START = 289;
export const GEN3_TM_END = 338;

// HM item IDs: 339 (HM01) through 346 (HM08)
export const GEN3_HM_START = 339;
export const GEN3_HM_END = 346;

export function gen3ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN3_TM_START && itemId <= GEN3_TM_END) {
    return itemId - GEN3_TM_START + 1;
  }
  return null;
}

export function gen3ItemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN3_HM_START && itemId <= GEN3_HM_END) {
    return itemId - GEN3_HM_START + 1;
  }
  return null;
}
