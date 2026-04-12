// Gen 7 (SM/USUM) item ID → name mapping (relevant items only)
// Item IDs from Bulbapedia: "List of items by index number (Generation VII)"
export const GEN7_ITEMS: Record<number, string> = {
  // Poké Balls
  1: 'Master Ball', 2: 'Ultra Ball', 3: 'Great Ball', 4: 'Poké Ball',
  5: 'Safari Ball', 6: 'Net Ball', 7: 'Dive Ball', 8: 'Nest Ball',
  9: 'Repeat Ball', 10: 'Timer Ball', 11: 'Luxury Ball', 12: 'Premier Ball',
  13: 'Dusk Ball', 14: 'Heal Ball', 15: 'Quick Ball', 16: 'Cherish Ball',
  // Apricorn / Dream / Sport / Beast Balls
  492: 'Fast Ball', 493: 'Level Ball', 494: 'Lure Ball',
  495: 'Heavy Ball', 496: 'Love Ball', 497: 'Friend Ball', 498: 'Moon Ball',
  576: 'Dream Ball', 499: 'Sport Ball',
  851: 'Beast Ball',
  // Medicine
  17: 'Potion', 18: 'Antidote', 19: 'Burn Heal', 20: 'Ice Heal',
  21: 'Awakening', 22: 'Parlyz Heal', 23: 'Full Restore', 24: 'Max Potion',
  25: 'Hyper Potion', 26: 'Super Potion', 27: 'Full Heal',
  28: 'Revive', 29: 'Max Revive',
  30: 'Fresh Water', 31: 'Soda Pop', 32: 'Lemonade', 33: 'Moomoo Milk',
  34: 'EnergyPowder', 35: 'Energy Root', 36: 'Heal Powder', 37: 'Revival Herb',
  38: 'Ether', 39: 'Max Ether', 40: 'Elixir', 41: 'Max Elixir',
  45: 'Sacred Ash',
  46: 'HP Up', 47: 'Protein', 48: 'Iron', 49: 'Carbos',
  50: 'Calcium', 51: 'Rare Candy', 52: 'PP Up', 53: 'Zinc', 54: 'PP Max',
  // Battle items
  56: 'Guard Spec.', 57: 'Dire Hit', 58: 'X Attack', 59: 'X Defense',
  60: 'X Speed', 61: 'X Accuracy', 62: 'X Sp. Atk', 63: 'X Sp. Def',
  // Repels
  76: 'Repel', 77: 'Super Repel', 78: 'Max Repel',
  79: 'Escape Rope',
  // Evolution Stones
  80: 'Fire Stone', 81: 'Water Stone', 82: 'Thunder Stone',
  83: 'Leaf Stone', 84: 'Moon Stone', 85: 'Sun Stone',
  86: 'Shiny Stone', 87: 'Dusk Stone', 88: 'Dawn Stone', 89: 'Oval Stone',
  // Held items (selection)
  135: 'Exp. Share', 136: 'Quick Claw', 137: 'Soothe Bell', 138: 'Mental Herb',
  139: 'Choice Band', 140: 'King\'s Rock', 141: 'Silverpowder', 142: 'Amulet Coin',
  143: 'Cleanse Tag', 148: 'Everstone', 149: 'Focus Band',
  150: 'Lucky Egg', 151: 'Scope Lens', 152: 'Metal Coat', 153: 'Leftovers',
  154: 'Dragon Scale', 155: 'Light Ball',
  // Fossils
  99: 'Dome Fossil', 100: 'Helix Fossil', 101: 'Old Amber',
  102: 'Root Fossil', 103: 'Claw Fossil',
  104: 'Skull Fossil', 105: 'Armor Fossil',
  // Z-Crystals (776–808)
  776: 'Normalium Z', 777: 'Firium Z', 778: 'Waterium Z', 779: 'Electrium Z',
  780: 'Grassium Z', 781: 'Icium Z', 782: 'Fightinium Z', 783: 'Poisonium Z',
  784: 'Groundium Z', 785: 'Flyinium Z', 786: 'Psychium Z', 787: 'Buginium Z',
  788: 'Rockium Z', 789: 'Ghostium Z', 790: 'Dragonium Z', 791: 'Darkinium Z',
  792: 'Steelium Z', 793: 'Fairium Z', 794: 'Pikanium Z',
  795: 'Decidium Z', 796: 'Incinium Z', 797: 'Primarium Z',
  798: 'Tapunium Z', 799: 'Marshadium Z', 800: 'Aloraichium Z',
  801: 'Snorlium Z', 802: 'Eevium Z', 803: 'Mewnium Z',
  804: 'Pikashunium Z',
  805: 'Kommonium Z', 806: 'Lycanium Z', 807: 'Mimikium Z',
  808: 'Lunalium Z',
  // Key items (selection)
  216: 'HM01', 217: 'HM02', 218: 'HM03', 219: 'HM04',
  // TMs 328–427 are named dynamically via gen7ItemIdToTmNumber
};

// Key items — items that indicate game progress
export const GEN7_KEY_ITEMS = new Set([
  // Bikes / transport
  259, // Bicycle (not in Gen 7 but keep for compatibility)
  // Rods
  563, 564, 565, // Old Rod, Good Rod, Super Rod
  // Z-Ring / Z-Power Ring
  689, // Z-Ring
  // Important progression items
  225, // Coin Case
  628, // Roller Skates
  632, // Holo Caster
  // Ride Pager / Rotom Dex
  847, // Ride Pager
  // Sun/Moon specific
  660, // Sun Flute
  661, // Moon Flute
  662, // Tidal Bell
  // USUM specific
  923, // Z-Power Ring
  // Legendary items
  841, // Sparkling Stone
  849, // Ilima Normalium Z (story)
  // Adrenaline Orb
  846, // Adrenaline Orb
]);

// Balls (item IDs that are Poké Balls) — same as Gen 6 plus Beast Ball
export const GEN7_BALL_ITEM_IDS = new Set([
  1,   // Master Ball
  2,   // Ultra Ball
  3,   // Great Ball
  4,   // Poké Ball
  5,   // Safari Ball
  6,   // Net Ball
  7,   // Dive Ball
  8,   // Nest Ball
  9,   // Repeat Ball
  10,  // Timer Ball
  11,  // Luxury Ball
  12,  // Premier Ball
  13,  // Dusk Ball
  14,  // Heal Ball
  15,  // Quick Ball
  16,  // Cherish Ball
  492, // Fast Ball
  493, // Level Ball
  494, // Lure Ball
  495, // Heavy Ball
  496, // Love Ball
  497, // Friend Ball
  498, // Moon Ball
  499, // Sport Ball
  576, // Dream Ball
  851, // Beast Ball
]);

// TM item IDs: 328 (TM01) through 427 (TM100)
// Gen 7 has no HMs — field moves are replaced by Ride Pokémon
export const GEN7_TM_START = 328;
export const GEN7_TM_END = 427;

export function gen7ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN7_TM_START && itemId <= GEN7_TM_END) {
    return itemId - GEN7_TM_START + 1;
  }
  return null;
}
