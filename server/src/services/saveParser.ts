import { readFileSync, existsSync, statSync } from 'fs';
import { basename } from 'path';
import db from '../db.js';
import { decodePokemon } from './pkDecoder.js';

// Gender determination from attack DV and species gender_rate
// gender_rate: -1=genderless, 0=always male, 8=always female, 1-7=threshold
// In Gen 1/2: if atkDV >= threshold → male, else female
// Thresholds by gender_rate: 1→15, 2→12, 3→12, 4→8, 5→4, 6→4, 7→2
const GENDER_THRESHOLDS: Record<number, number> = { 1: 15, 2: 12, 3: 12, 4: 8, 5: 4, 6: 4, 7: 2 };

export function computeGender(speciesId: number, atkDV: number): string {
  const species = db.prepare('SELECT gender_rate FROM species WHERE id = ?').get(speciesId) as any;
  if (!species) return '';
  const rate = species.gender_rate;
  if (rate === -1) return 'genderless';
  if (rate === 0) return 'male';
  if (rate === 8) return 'female';
  const threshold = GENDER_THRESHOLDS[rate];
  if (threshold === undefined) return '';
  return atkDV >= threshold ? 'male' : 'female';
}

interface ImportedPokemon {
  species_id: number;
  nickname: string;
  is_shiny: number;
  level: number;
  nature: string;
  ability: string;
  ball: string;
  held_item: string;
  origin_game: string;
  ot_name: string;
  ot_tid: number;
  iv_hp: number;
  iv_attack: number;
  iv_defense: number;
  iv_speed: number;
  iv_sp_attack: number;
  iv_sp_defense: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  unique_key: string;
  source_game: string;
  source_save: string;
  is_egg: number;
  met_level: number;
  caught_date: string;
  gender: string;
}

function parsePKSMBank(filePath: string): ImportedPokemon[] {
  const buf = readFileSync(filePath);
  if (buf.slice(0, 8).toString('ascii') !== 'PKSMBANK') return [];

  const boxes = buf.readUInt32LE(12);
  const PKM_SIZE = 336;
  const headerSize = 16;
  const results: ImportedPokemon[] = [];
  const fileName = basename(filePath);

  for (let i = 0; i < boxes * 30; i++) {
    const offset = headerSize + i * PKM_SIZE;
    if (offset + PKM_SIZE > buf.length) break;

    const slice = buf.subarray(offset, offset + PKM_SIZE);
    if (slice.every(b => b === 0xFF) || slice.every(b => b === 0x00)) continue;

    // Skip 4-byte generation prefix, pass 232 bytes unencrypted
    const pkData = buf.subarray(offset + 4, offset + 4 + 232);
    const pk = decodePokemon(pkData, false);
    if (!pk) continue;

    results.push({
      species_id: pk.species_id,
      nickname: pk.nickname || '',
      is_shiny: pk.is_shiny ? 1 : 0,
      level: pk.met_level || 1,
      nature: pk.nature,
      ability: pk.ability,
      ball: pk.ball,
      held_item: pk.held_item,
      origin_game: pk.origin_game,
      ot_name: pk.ot_name,
      ot_tid: pk.ot_tid,
      iv_hp: pk.iv_hp, iv_attack: pk.iv_attack, iv_defense: pk.iv_defense,
      iv_speed: pk.iv_speed, iv_sp_attack: pk.iv_sp_attack, iv_sp_defense: pk.iv_sp_defense,
      move1: pk.move1, move2: pk.move2, move3: pk.move3, move4: pk.move4,
      unique_key: `${pk.ec.toString(16)}-${pk.species_id}-${pk.ot_tid}`,
      source_game: 'PKSM Bank',
      source_save: fileName,
      is_egg: pk.is_egg ? 1 : 0,
      met_level: pk.met_level,
      caught_date: pk.met_date,
      gender: pk.gender,
    });
  }

  return results;
}

export function detectGame(nameOrPath: string): { game: string; gen: number } | null {
  // First try name/path-based detection
  const patterns: [RegExp, string, number][] = [
    [/Red/i, 'Red', 1], [/Blue/i, 'Blue', 1], [/Yellow/i, 'Yellow', 1],
    [/Gold/i, 'Gold', 2], [/Silver/i, 'Silver', 2], [/Crystal/i, 'Crystal', 2],
    [/Omega Ruby/i, 'Omega Ruby', 6], [/Alpha Sapphire/i, 'Alpha Sapphire', 6],
    [/Ruby/i, 'Ruby', 3], [/Sapphire/i, 'Sapphire', 3], [/Emerald/i, 'Emerald', 3],
    [/FireRed/i, 'FireRed', 3], [/LeafGreen/i, 'LeafGreen', 3],
    [/HeartGold|POKEMON HG/i, 'HeartGold', 4], [/SoulSilver/i, 'SoulSilver', 4],
    [/Diamond/i, 'Diamond', 4], [/Pearl/i, 'Pearl', 4], [/Platinum/i, 'Platinum', 4],
    [/Black 2/i, 'Black 2', 5], [/White 2/i, 'White 2', 5],
    [/Black/i, 'Black', 5], [/White/i, 'White', 5],
    [/Ultra Sun/i, 'Ultra Sun', 7], [/Ultra Moon/i, 'Ultra Moon', 7],
    [/Sun/i, 'Sun', 7], [/Moon/i, 'Moon', 7],
    [/X$/i, 'X', 6], [/\bX\b/i, 'X', 6], [/Y$/i, 'Y', 6],
  ];
  for (const [re, game, gen] of patterns) {
    if (re.test(nameOrPath)) return { game, gen };
  }

  // Fall back to binary detection if it's a file path
  try {
    if (existsSync(nameOrPath)) {
      return detectGameFromBinary(nameOrPath);
    }
  } catch { /* non-fatal */ }

  return null;
}

/**
 * Detect game generation and title from the save file binary.
 * Uses file size and internal structure to identify the game.
 */
function detectGameFromBinary(filePath: string): { game: string; gen: number } | null {
  try {
    const st = statSync(filePath);
    const size = st.size;

    // Gen 1-2: 32KB (0x8000)
    if (size === 0x8000) {
      const buf = readFileSync(filePath);
      return detectGen1or2(buf);
    }
    // Gen 3: 128KB (0x20000)
    if (size === 0x20000) return { game: 'Ruby', gen: 3 }; // Can't easily distinguish R/S/E/FR/LG
    // Gen 4: 256KB or 512KB
    if (size === 0x40000 || size === 0x80000) return { game: 'Diamond', gen: 4 };
    // Gen 5: 256KB
    if (size === 0x24000 || size === 0x26000) return { game: 'Black', gen: 5 };
    // Gen 6: XY ~415KB, ORAS ~483KB (Checkpoint 'main' files)
    if (size === 0x65600) return { game: 'X', gen: 6 };
    if (size === 0x76000) return { game: 'Alpha Sapphire', gen: 6 };
    // Gen 7: SM ~442KB, USUM ~445KB (Checkpoint 'main' files)
    if (size === 0x6BE00) return { game: 'Sun', gen: 7 };
    if (size === 0x6CA00 || size === 0x6CC00) return { game: 'Ultra Moon', gen: 7 };

    return null;
  } catch { return null; }
}

/**
 * Distinguish Gen 1 from Gen 2 saves, and identify the specific game.
 * Both are 32KB. Key differences:
 * - Gen 2 Crystal has party count at 0x2865, Gen 2 GS at 0x288A
 * - Gen 1 has party count at 0x2F2C
 * - Crystal stores a unique checksum at 0x2D0D
 */
function detectGen1or2(buf: Buffer): { game: string; gen: number } | null {
  // Check for Crystal: party count at 0x2865 should be 0-6
  const crystalPartyCount = buf[0x2865];
  const crystalFirstSpecies = buf[0x2866];
  if (crystalPartyCount >= 1 && crystalPartyCount <= 6 && crystalFirstSpecies > 0 && crystalFirstSpecies < 0xFF) {
    // Verify by checking Crystal-specific player name offset (0x200B)
    // Crystal player name should be valid text (bytes < 0x80 or Gen 2 charset)
    const nameStart = buf[0x200B];
    if (nameStart > 0 && nameStart < 0xFE) {
      return { game: 'Crystal', gen: 2 };
    }
  }

  // Check for Gold/Silver: party count at 0x288A should be 0-6
  const gsPartyCount = buf[0x288A];
  const gsFirstSpecies = buf[0x288B];
  if (gsPartyCount >= 1 && gsPartyCount <= 6 && gsFirstSpecies > 0 && gsFirstSpecies < 0xFF) {
    return { game: 'Gold', gen: 2 };
  }

  // Check for Gen 1: party count at 0x2F2C should be 0-6
  const gen1PartyCount = buf[0x2F2C];
  if (gen1PartyCount >= 1 && gen1PartyCount <= 6) {
    // Yellow has Pikachu friendship at 0x271C (unique to Yellow)
    const pikaFriendship = buf[0x271C];
    if (pikaFriendship > 0 && pikaFriendship <= 255) {
      // Not definitive — Red/Blue have data here too. Check if player starter
      // is Pikachu (dex #25 = index 0x54) at party species slot 0
      // For now, default to Red since we can't reliably distinguish R/B/Y
    }
    return { game: 'Red', gen: 1 };
  }

  // No valid party structure detected — can't identify game
  return null;
}

