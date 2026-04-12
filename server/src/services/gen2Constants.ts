// Gen 2 item IDs (Bulbapedia: "List of items by index number (Generation II)")
export const GEN2_ITEMS: Record<number, string> = {
  0x01: 'Master Ball', 0x02: 'Ultra Ball', 0x03: 'Great Ball', 0x04: 'Poké Ball',
  0x06: 'Bicycle',
  0x09: 'Moon Stone', 0x0A: 'Antidote',
  0x0F: 'Full Restore', 0x10: 'Max Potion',
  0x11: 'Hyper Potion', 0x12: 'Super Potion', 0x13: 'Potion',
  0x1E: 'Escape Rope', 0x1F: 'Repel',
  0x23: 'Fire Stone', 0x24: 'Thunder Stone', 0x25: 'Water Stone',
  0x2D: 'Rare Candy',
  0x3E: 'Coin Case',
  0x42: 'Old Rod', 0x43: 'Good Rod', 0x44: 'Super Rod',
  0x46: 'S.S. Ticket',
  0x47: 'Mystery Egg',
  0x48: 'Clear Bell',      // Crystal only
  0x49: 'Silver Wing',
  0x4A: 'Moomoo Milk',
  0x4E: 'SecretPotion',
  0x4F: 'Red Scale',
  0x50: 'Card Key',
  0x52: 'Basement Key',
  0x54: 'Machine Part',
  0x55: 'Rainbow Wing',
  0x5A: 'Squirtbottle',
  0x73: 'Park Ball',
  0x78: 'Fast Ball', 0x79: 'Level Ball', 0x7A: 'Lure Ball',
  0x7B: 'Heavy Ball', 0x7C: 'Love Ball', 0x7D: 'Friend Ball',
  0x7E: 'Moon Ball',
  0xBF: 'HM01', 0xC0: 'HM02', 0xC1: 'HM03', 0xC2: 'HM04',
  0xC3: 'HM05', 0xC4: 'HM06', 0xC5: 'HM07',
  0xC6: 'TM01', 0xC7: 'TM02', 0xC8: 'TM03', 0xC9: 'TM04', 0xCA: 'TM05',
  0xCB: 'TM06', 0xCC: 'TM07', 0xCD: 'TM08', 0xCE: 'TM09', 0xCF: 'TM10',
  0xD0: 'TM11', 0xD1: 'TM12', 0xD2: 'TM13', 0xD3: 'TM14', 0xD4: 'TM15',
  0xD5: 'TM16', 0xD6: 'TM17', 0xD7: 'TM18', 0xD8: 'TM19', 0xD9: 'TM20',
  0xDA: 'TM21', 0xDB: 'TM22', 0xDC: 'TM23', 0xDD: 'TM24', 0xDE: 'TM25',
  0xDF: 'TM26', 0xE0: 'TM27', 0xE1: 'TM28', 0xE2: 'TM29', 0xE3: 'TM30',
  0xE4: 'TM31', 0xE5: 'TM32', 0xE6: 'TM33', 0xE7: 'TM34', 0xE8: 'TM35',
  0xE9: 'TM36', 0xEA: 'TM37', 0xEB: 'TM38', 0xEC: 'TM39', 0xED: 'TM40',
  0xEE: 'TM41', 0xEF: 'TM42', 0xF0: 'TM43', 0xF1: 'TM44', 0xF2: 'TM45',
  0xF3: 'TM46', 0xF4: 'TM47', 0xF5: 'TM48', 0xF6: 'TM49', 0xF7: 'TM50',
};

export const GEN2_KEY_ITEMS = new Set([
  0x06, // Bicycle
  0x3E, // Coin Case
  0x42, // Old Rod
  0x43, // Good Rod
  0x44, // Super Rod
  0x46, // S.S. Ticket
  0x47, // Mystery Egg
  0x48, // Clear Bell
  0x49, // Silver Wing
  0x4E, // SecretPotion
  0x4F, // Red Scale
  0x50, // Card Key
  0x52, // Basement Key
  0x54, // Machine Part
  0x55, // Rainbow Wing
  0x5A, // Squirtbottle
]);

export const GEN2_BALL_IDS = new Set([
  0x01, // Master Ball
  0x02, // Ultra Ball
  0x03, // Great Ball
  0x04, // Poké Ball
  0x73, // Park Ball
  0x78, // Fast Ball
  0x79, // Level Ball
  0x7A, // Lure Ball
  0x7B, // Heavy Ball
  0x7C, // Love Ball
  0x7D, // Friend Ball
  0x7E, // Moon Ball
]);

export const GEN2_TM_START = 0xC6;
export const GEN2_TM_END = 0xF7;
export const GEN2_HM_START = 0xBF;
export const GEN2_HM_END = 0xC5;

export function gen2ItemIdToTmNumber(itemId: number): number | null {
  if (itemId >= GEN2_TM_START && itemId <= GEN2_TM_END) {
    return itemId - GEN2_TM_START + 1;
  }
  return null;
}

export function gen2ItemIdToHmNumber(itemId: number): number | null {
  if (itemId >= GEN2_HM_START && itemId <= GEN2_HM_END) {
    return itemId - GEN2_HM_START + 1;
  }
  return null;
}
