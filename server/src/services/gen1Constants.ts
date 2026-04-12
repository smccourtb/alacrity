// Gen 1 item ID → name mapping (relevant items only)
export const GEN1_ITEMS: Record<number, string> = {
  0x01: 'Master Ball', 0x02: 'Ultra Ball', 0x03: 'Great Ball', 0x04: 'Poké Ball',
  0x06: 'Bicycle', 0x09: 'Moon Stone', 0x0A: 'Antidote',
  0x0B: 'Burn Heal', 0x0C: 'Ice Heal', 0x0D: 'Awakening',
  0x0E: 'Parlyz Heal', 0x0F: 'Full Restore', 0x10: 'Max Potion',
  0x11: 'Hyper Potion', 0x12: 'Super Potion', 0x13: 'Potion',
  0x14: 'BoulderBadge', 0x15: 'CascadeBadge',
  0x20: 'Escape Rope', 0x21: 'Repel',
  0x24: 'Fire Stone', 0x25: 'Thunder Stone', 0x26: 'Water Stone',
  0x28: 'HP Up', 0x29: 'Protein', 0x2A: 'Iron',
  0x2B: 'Carbos', 0x2C: 'Calcium', 0x2D: 'Rare Candy',
  0x30: 'Dome Fossil', 0x31: 'Helix Fossil', 0x32: 'Secret Key',
  0x3C: 'Bike Voucher',
  0x40: 'Safari Ball',
  0x43: 'Poké Doll',
  0x45: 'Full Heal',
  0x46: 'Revive', 0x47: 'Max Revive',
  0x48: 'Guard Spec.', 0x49: 'Super Repel', 0x4A: 'Max Repel',
  0x4C: 'Fresh Water', 0x4D: 'Soda Pop', 0x4E: 'Lemonade',
  0x4F: 'S.S. Ticket', 0x50: 'Gold Teeth',
  0x53: 'Coin Case', 0x54: 'Oak\'s Parcel',
  0x55: 'Itemfinder', 0x56: 'Silph Scope',
  0x57: 'Poké Flute', 0x58: 'Lift Key', 0x59: 'Exp. All',
  0x5A: 'Old Rod', 0x5B: 'Good Rod', 0x5C: 'Super Rod',
  0x5D: 'PP Up', 0x5E: 'Ether', 0x5F: 'Max Ether',
  0x60: 'Elixir', 0x61: 'Max Elixir',
  0xC4: 'HM01', 0xC5: 'HM02', 0xC6: 'HM03', 0xC7: 'HM04', 0xC8: 'HM05',
  0xC9: 'TM01', 0xCA: 'TM02', 0xCB: 'TM03', 0xCC: 'TM04', 0xCD: 'TM05',
  0xCE: 'TM06', 0xCF: 'TM07', 0xD0: 'TM08', 0xD1: 'TM09', 0xD2: 'TM10',
  0xD3: 'TM11', 0xD4: 'TM12', 0xD5: 'TM13', 0xD6: 'TM14', 0xD7: 'TM15',
  0xD8: 'TM16', 0xD9: 'TM17', 0xDA: 'TM18', 0xDB: 'TM19', 0xDC: 'TM20',
  0xDD: 'TM21', 0xDE: 'TM22', 0xDF: 'TM23', 0xE0: 'TM24', 0xE1: 'TM25',
  0xE2: 'TM26', 0xE3: 'TM27', 0xE4: 'TM28', 0xE5: 'TM29', 0xE6: 'TM30',
  0xE7: 'TM31', 0xE8: 'TM32', 0xE9: 'TM33', 0xEA: 'TM34', 0xEB: 'TM35',
  0xEC: 'TM36', 0xED: 'TM37', 0xEE: 'TM38', 0xEF: 'TM39', 0xF0: 'TM40',
  0xF1: 'TM41', 0xF2: 'TM42', 0xF3: 'TM43', 0xF4: 'TM44', 0xF5: 'TM45',
  0xF6: 'TM46', 0xF7: 'TM47', 0xF8: 'TM48', 0xF9: 'TM49', 0xFA: 'TM50',
};

// Key items — items the player can't buy/sell, indicate game progress
export const GEN1_KEY_ITEMS = new Set([
  0x06, // Bicycle
  0x30, // Dome Fossil
  0x31, // Helix Fossil
  0x32, // Secret Key
  0x3C, // Bike Voucher
  0x4F, // S.S. Ticket
  0x50, // Gold Teeth
  0x53, // Coin Case
  0x54, // Oak's Parcel
  0x55, // Itemfinder
  0x56, // Silph Scope
  0x57, // Poké Flute
  0x58, // Lift Key
  0x59, // Exp. All
  0x5A, // Old Rod
  0x5B, // Good Rod
  0x5C, // Super Rod
]);

// Balls (item IDs that are Poké Balls)
export const GEN1_BALL_IDS = new Set([
  0x01, // Master Ball
  0x02, // Ultra Ball
  0x03, // Great Ball
  0x04, // Poké Ball
  0x40, // Safari Ball
]);

// TM item IDs start at 0xC9 (TM01) through 0xFA (TM50)
// HM item IDs are 0xC4 (HM01) through 0xC8 (HM05)
export const GEN1_TM_START = 0xC9;
export const GEN1_TM_END = 0xFA;
export const GEN1_HM_START = 0xC4;
export const GEN1_HM_END = 0xC8;

export function itemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN1_TM_START && itemId <= GEN1_TM_END) {
    return itemId - GEN1_TM_START + 1;
  }
  return null;
}

export function itemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN1_HM_START && itemId <= GEN1_HM_END) {
    return itemId - GEN1_HM_START + 1;
  }
  return null;
}

// Move name → TM number mapping for Gen 1
// Used by goal validation to check if a TM is in inventory
export const GEN1_MOVE_TO_TM: Record<string, number> = {
  'Mega Punch': 1, 'Razor Wind': 2, 'Swords Dance': 3, 'Whirlwind': 4,
  'Mega Kick': 5, 'Toxic': 6, 'Horn Drill': 7, 'Body Slam': 8,
  'Take Down': 9, 'Double-Edge': 10, 'Bubble Beam': 11, 'Water Gun': 12,
  'Ice Beam': 13, 'Blizzard': 14, 'Hyper Beam': 15, 'Pay Day': 16,
  'Submission': 17, 'Counter': 18, 'Seismic Toss': 19, 'Rage': 20,
  'Mega Drain': 21, 'Solar Beam': 22, 'Dragon Rage': 23, 'Thunderbolt': 24,
  'Thunder': 25, 'Earthquake': 26, 'Fissure': 27, 'Dig': 28,
  'Psychic': 29, 'Teleport': 30, 'Mimic': 31, 'Double Team': 32,
  'Reflect': 33, 'Bide': 34, 'Metronome': 35, 'Self-Destruct': 36,
  'Egg Bomb': 37, 'Fire Blast': 38, 'Swift': 39, 'Skull Bash': 40,
  'Softboiled': 41, 'Dream Eater': 42, 'Sky Attack': 43, 'Rest': 44,
  'Thunder Wave': 45, 'Psywave': 46, 'Explosion': 47, 'Rock Slide': 48,
  'Tri Attack': 49, 'Substitute': 50,
};
