// Gen 6 (X/Y/ORAS) item ID → name mapping (relevant items only)
// Item IDs from Bulbapedia: "List of items by index number (Generation VI)"
export const GEN6_ITEMS: Record<number, string> = {
  // Poké Balls
  1: 'Master Ball', 2: 'Ultra Ball', 3: 'Great Ball', 4: 'Poké Ball',
  5: 'Safari Ball', 6: 'Net Ball', 7: 'Dive Ball', 8: 'Nest Ball',
  9: 'Repeat Ball', 10: 'Timer Ball', 11: 'Luxury Ball', 12: 'Premier Ball',
  13: 'Dusk Ball', 14: 'Heal Ball', 15: 'Quick Ball', 16: 'Cherish Ball',
  // Apricorn / Dream / Sport Balls
  492: 'Fast Ball', 493: 'Level Ball', 494: 'Lure Ball',
  495: 'Heavy Ball', 496: 'Love Ball', 497: 'Friend Ball', 498: 'Moon Ball',
  576: 'Dream Ball', 499: 'Sport Ball',
  // Medicine
  17: 'Potion', 18: 'Antidote', 19: 'Burn Heal', 20: 'Ice Heal',
  21: 'Awakening', 22: 'Parlyz Heal', 23: 'Full Restore', 24: 'Max Potion',
  25: 'Hyper Potion', 26: 'Super Potion', 27: 'Full Heal',
  28: 'Revive', 29: 'Max Revive',
  30: 'Fresh Water', 31: 'Soda Pop', 32: 'Lemonade', 33: 'Moomoo Milk',
  34: 'EnergyPowder', 35: 'Energy Root', 36: 'Heal Powder', 37: 'Revival Herb',
  38: 'Ether', 39: 'Max Ether', 40: 'Elixir', 41: 'Max Elixir',
  42: 'Lava Cookie', 43: 'Berry Juice',
  45: 'Sacred Ash', 46: 'HP Up', 47: 'Protein', 48: 'Iron',
  49: 'Carbos', 50: 'Calcium', 51: 'Rare Candy', 52: 'PP Up',
  53: 'Zinc', 54: 'PP Max',
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
  90: 'Odd Keystone',
  135: 'Exp. Share', 136: 'Quick Claw', 137: 'Soothe Bell', 138: 'Mental Herb',
  139: 'Choice Band', 140: 'King\'s Rock', 141: 'Silverpowder', 142: 'Amulet Coin',
  143: 'Cleanse Tag', 144: 'Soul Dew', 145: 'DeepSeaTooth', 146: 'DeepSeaScale',
  147: 'Smoke Ball', 148: 'Everstone', 149: 'Focus Band',
  150: 'Lucky Egg', 151: 'Scope Lens', 152: 'Metal Coat', 153: 'Leftovers',
  154: 'Dragon Scale', 155: 'Light Ball', 156: 'Soft Sand', 157: 'Hard Stone',
  158: 'Miracle Seed', 159: 'BlackGlasses', 160: 'Black Belt',
  161: 'Magnet', 162: 'Mystic Water', 163: 'Sharp Beak', 164: 'Poison Barb',
  165: 'NeverMeltIce', 166: 'Spell Tag', 167: 'TwistedSpoon', 168: 'Charcoal',
  169: 'Dragon Fang', 170: 'Silk Scarf',
  175: 'Macho Brace', 176: 'Exp. Share',
  226: 'Lax Incense', 227: 'Lucky Punch',
  // Fossils
  99: 'Dome Fossil', 100: 'Helix Fossil', 101: 'Old Amber',
  102: 'Root Fossil', 103: 'Claw Fossil',
  104: 'Skull Fossil', 105: 'Armor Fossil',
  106: 'Cover Fossil', 107: 'Plume Fossil',
  // Key Items (selection)
  216: 'HM01', 217: 'HM02', 218: 'HM03', 219: 'HM04',
  // TMs 328–427 are named dynamically via gen6ItemIdToTmNumber
};

// Key items — items that indicate game progress
export const GEN6_KEY_ITEMS = new Set([
  // Bikes / transport
  259, // Bicycle
  // Rods
  563, 564, 565, // Old Rod, Good Rod, Super Rod (XY)
  // Badges / progress items
  173, // Dowsing Machine
  174, // Devon Scope
  // Important key items
  216, 217, 218, 219, // HM01–HM04
  434, // Eon Ticket (ORAS)
  435, // S.S. Ticket
  436, // Contest Pass
  225, // Coin Case
  437, // Wailmer Pail
  438, // Devon Parts
  439, // Letter
  440, // EON Ticket
  441, // MysticTicket
  442, // AuroraTicket
  443, // Magma Emblem
  444, // Old Sea Map
  445, // Loto-ID Ticket
  446, // Devon Scuba Gear
  447, // Contest Costume
  449, // Intriguing Stone
  450, // Common Stone
  628, // Roller Skates
  629, // Exp. Share (XY key item)
  631, // TMV Pass
  632, // Holo Caster
  633, // Prof's Letter
  634, // Roller Skates
  636, // Mega Ring
  637, // Sprinklotad
  638, // Looker Ticket
  639, // Discount Coupon
  642, // Eon Flute (ORAS)
  643, // Devon Scope (ORAS)
  644, // Prison Bottle
]);

// Balls (item IDs that are Poké Balls)
export const GEN6_BALL_ITEM_IDS = new Set([
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
]);

// TM item IDs: 328 (TM01) through 427 (TM100)
// HM item IDs: 420 (HM01) through 426 (HM06) — overlaps TM range
export const GEN6_TM_START = 328;
export const GEN6_TM_END = 427;
export const GEN6_HM_START = 420;
export const GEN6_HM_END = 426;

export function gen6ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN6_TM_START && itemId <= GEN6_TM_END) {
    return itemId - GEN6_TM_START + 1;
  }
  return null;
}

export function gen6ItemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN6_HM_START && itemId <= GEN6_HM_END) {
    return itemId - GEN6_HM_START + 1;
  }
  return null;
}
