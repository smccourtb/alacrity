import { readFileSync, existsSync, statSync } from 'fs';
import { readdir, stat as fsStat } from 'fs/promises';
import { join, basename, extname } from 'path';
import db from '../db.js';
import { paths } from '../paths.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';
import { parseGen3Save } from './gen3Parser.js';
import { parseGen4Save } from './gen4Parser.js';
import { parseGen5Save } from './gen5Parser.js';
import { parseGen6Save } from './gen6Parser.js';
import { parseGen7Save } from './gen7Parser.js';
import { decodePokemon } from './pkDecoder.js';

const SAVES_DIR = paths.savesDir;
const COLLECTION_DIR = join(SAVES_DIR, 'collection');

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

/**
 * Parse all save files in saves/collection/ — the single curated directory
 * for populating the Pokedex. Supports .bnk (PKSM), .sav/.dat (Gen 1/2),
 * and structured backups with main/sav.dat inside subdirectories.
 * Game is detected from parent directory name or filename.
 *
 * Uses async I/O for directory traversal so the event loop isn't starved
 * during large syncs. Individual save file parsing is still synchronous
 * (buffer reads) but we yield between files.
 */
async function parseCollectionDir(): Promise<ImportedPokemon[]> {
  if (!existsSync(COLLECTION_DIR)) return [];

  const results: ImportedPokemon[] = [];
  let filesProcessed = 0;

  async function walkDir(dir: string, relPath: string) {
    let entries: string[];
    try { entries = await readdir(dir); } catch { return; }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let entryStat: Awaited<ReturnType<typeof fsStat>>;
      try { entryStat = await fsStat(fullPath); } catch { continue; }

      if (entryStat.isDirectory()) {
        // Check for structured backup (directory containing main/sav.dat)
        const saveFile = ['main', 'sav.dat'].find(f => existsSync(join(fullPath, f)));
        if (saveFile) {
          const filePath = join(fullPath, saveFile);
          const source = relPath ? `${relPath}/${entry}` : entry;
          const detected = detectGame(entry) || detectGame(relPath) || detectGame(dir);
          if (detected && [1, 2, 3, 4, 5, 6, 7].includes(detected.gen)) {
            parseSaveFile(filePath, detected, source, results);
            // Yield every 5 files so the event loop can process other requests
            if (++filesProcessed % 5 === 0) await new Promise(r => setImmediate(r));
          }
        } else {
          await walkDir(fullPath, relPath ? `${relPath}/${entry}` : entry);
        }
        continue;
      }

      const ext = extname(entry).toLowerCase();
      const source = relPath ? `${relPath}/${entry}` : entry;

      if (ext === '.bnk') {
        const parsed = parsePKSMBank(fullPath);
        for (const p of parsed) {
          p.source_save = `collection/${source}`;
        }
        results.push(...parsed);
        if (++filesProcessed % 5 === 0) await new Promise(r => setImmediate(r));
      } else if (ext === '.sav' || ext === '.dat') {
        const detected = detectGame(entry) || detectGame(relPath) || detectGame(dir);
        if (detected && [1, 2, 3, 4, 5, 6, 7].includes(detected.gen)) {
          parseSaveFile(fullPath, detected, source, results);
          if (++filesProcessed % 5 === 0) await new Promise(r => setImmediate(r));
        }
      }
    }
  }

  function parseSaveFile(
    filePath: string,
    detected: { game: string; gen: number },
    source: string,
    out: ImportedPokemon[],
  ) {
    try {
      if (detected.gen === 1 || detected.gen === 2) {
        const parser = detected.gen === 1 ? parseGen1Save : parseGen2Save;
        const { pokemon } = parser(filePath, detected.game);
        for (const p of pokemon) {
          out.push({
            species_id: p.species_id,
            nickname: '',
            is_shiny: p.is_shiny ? 1 : 0,
            level: p.level,
            nature: '', ability: '',
            ball: 'Poke Ball',
            held_item: ('held_item' in p && typeof p.held_item === 'string') ? p.held_item : '',
            origin_game: detected.game,
            ot_name: p.ot_name,
            ot_tid: p.ot_tid,
            iv_hp: p.iv_hp, iv_attack: p.iv_attack, iv_defense: p.iv_defense,
            iv_speed: p.iv_speed, iv_sp_attack: p.iv_special, iv_sp_defense: p.iv_special,
            move1: p.move1 || '', move2: p.move2 || '', move3: p.move3 || '', move4: p.move4 || '',
            unique_key: `collection-${detected.game}-${source}-${p.species_id}-${p.ot_tid}-${p.iv_attack}${p.iv_defense}${p.iv_speed}${p.iv_special}`,
            source_game: detected.game,
            source_save: `collection/${source}`,
            is_egg: 0, met_level: p.level, caught_date: '',
            gender: computeGender(p.species_id, p.iv_attack),
          });
        }
      } else if (detected.gen === 3) {
        const { pokemon } = parseGen3Save(filePath, detected.game);
        for (const p of pokemon) {
          out.push({
            species_id: p.species_id,
            nickname: p.nickname || '',
            is_shiny: p.is_shiny ? 1 : 0,
            level: p.level,
            nature: p.nature,
            ability: p.ability,
            ball: p.ball,
            held_item: p.held_item,
            origin_game: p.origin_game,
            ot_name: p.ot_name,
            ot_tid: p.ot_tid,
            iv_hp: p.iv_hp, iv_attack: p.iv_attack, iv_defense: p.iv_defense,
            iv_speed: p.iv_speed, iv_sp_attack: p.iv_sp_attack, iv_sp_defense: p.iv_sp_defense,
            move1: p.move1 || '', move2: p.move2 || '', move3: p.move3 || '', move4: p.move4 || '',
            unique_key: `${p.pid.toString(16)}-${p.species_id}-${p.ot_tid}`,
            source_game: detected.game,
            source_save: `collection/${source}`,
            is_egg: p.is_egg ? 1 : 0,
            met_level: p.met_level,
            caught_date: '',
            gender: p.gender,
          });
        }
      } else if (detected.gen === 4 || detected.gen === 5) {
        const parser = detected.gen === 4 ? parseGen4Save : parseGen5Save;
        const { pokemon } = parser(filePath, detected.game);
        for (const p of pokemon) {
          out.push({
            species_id: p.species_id,
            nickname: p.nickname || '',
            is_shiny: p.is_shiny ? 1 : 0,
            level: p.level,
            nature: p.nature,
            ability: p.ability,
            ball: p.ball,
            held_item: p.held_item,
            origin_game: p.origin_game,
            ot_name: p.ot_name,
            ot_tid: p.ot_tid,
            iv_hp: p.iv_hp, iv_attack: p.iv_attack, iv_defense: p.iv_defense,
            iv_speed: p.iv_speed, iv_sp_attack: p.iv_sp_attack, iv_sp_defense: p.iv_sp_defense,
            move1: p.move1 || '', move2: p.move2 || '', move3: p.move3 || '', move4: p.move4 || '',
            unique_key: `${p.pid.toString(16)}-${p.species_id}-${p.ot_tid}`,
            source_game: detected.game,
            source_save: `collection/${source}`,
            is_egg: p.is_egg ? 1 : 0,
            met_level: p.met_level,
            caught_date: p.met_date,
            gender: p.gender,
          });
        }
      } else if (detected.gen === 6 || detected.gen === 7) {
        const parser = detected.gen === 6 ? parseGen6Save : parseGen7Save;
        const { pokemon } = parser(filePath, detected.game);
        for (const p of pokemon) {
          out.push({
            species_id: p.species_id,
            nickname: p.nickname || '',
            is_shiny: p.is_shiny ? 1 : 0,
            level: p.level,
            nature: p.nature,
            ability: p.ability,
            ball: p.ball,
            held_item: p.held_item,
            origin_game: p.origin_game,
            ot_name: p.ot_name,
            ot_tid: p.ot_tid,
            iv_hp: p.iv_hp, iv_attack: p.iv_attack, iv_defense: p.iv_defense,
            iv_speed: p.iv_speed, iv_sp_attack: p.iv_sp_attack, iv_sp_defense: p.iv_sp_defense,
            move1: p.move1 || '', move2: p.move2 || '', move3: p.move3 || '', move4: p.move4 || '',
            unique_key: `${p.ec.toString(16)}-${p.species_id}-${p.ot_tid}`,
            source_game: detected.game,
            source_save: `collection/${source}`,
            is_egg: p.is_egg ? 1 : 0,
            met_level: p.met_level,
            caught_date: p.met_date,
            gender: p.gender,
          });
        }
      }
    } catch (e: any) {
      console.error(`Failed to parse collection/${source}: ${e.message}`);
    }
  }

  await walkDir(COLLECTION_DIR, '');
  return results;
}

/**
 * Parse saves/collection/ and insert new pokemon. Additive only — never deletes.
 * The wipe-and-resync logic lives in the POST /api/pokemon/sync endpoint,
 * which DELETEs all unique_key IS NOT NULL rows before calling this function.
 * When called standalone (e.g. after 3DS sync), it only adds new entries
 * via INSERT OR IGNORE — existing unique_keys are skipped.
 */
export async function parseAndImportAll(): Promise<{ imported: number; skipped: number; total: number; bySource: Record<string, number> }> {
  // Ensure all columns exist
  for (const col of ['unique_key TEXT', 'source_game TEXT', 'source_save TEXT', 'nickname TEXT', 'is_egg INTEGER DEFAULT 0', 'met_level INTEGER']) {
    try { db.exec(`ALTER TABLE pokemon ADD COLUMN ${col}`); } catch {}
  }
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_pokemon_unique ON pokemon(unique_key)'); } catch {}

  // Load ignored keys (pokemon the user chose to keep as manual)
  const ignoredKeys = new Set<string>();
  try {
    const rows = db.prepare('SELECT unique_key FROM sync_ignores').all() as { unique_key: string }[];
    for (const r of rows) ignoredKeys.add(r.unique_key);
  } catch {}

  const allPokemon = await parseCollectionDir();
  const bySource: Record<string, number> = {};
  for (const p of allPokemon) {
    bySource[p.source_save] = (bySource[p.source_save] || 0) + 1;
  }

  console.log(`Parsed ${allPokemon.length} pokemon from saves/collection/ (${ignoredKeys.size} ignored)`);
  for (const [src, count] of Object.entries(bySource)) {
    console.log(`  ${src}: ${count}`);
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO pokemon (
      species_id, nickname, is_shiny, level, nature, ability, ball, held_item,
      origin_game, ot_name, ot_tid, iv_hp, iv_attack, iv_defense, iv_speed,
      iv_sp_attack, iv_sp_defense, move1, move2, move3, move4,
      unique_key, source_game, source_save, caught_date, gender,
      is_egg, met_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;
  let ignored = 0;

  // Wrap all inserts in a single transaction — without this, each INSERT is
  // its own implicit transaction with a disk fsync, making N inserts ~100x slower.
  const insertAll = db.transaction(() => {
    for (const p of allPokemon) {
      if (ignoredKeys.has(p.unique_key)) { ignored++; continue; }
      const result = insert.run(
        p.species_id, p.nickname, p.is_shiny, p.level, p.nature, p.ability, p.ball, p.held_item,
        p.origin_game, p.ot_name, p.ot_tid,
        p.iv_hp, p.iv_attack, p.iv_defense, p.iv_speed, p.iv_sp_attack, p.iv_sp_defense,
        p.move1, p.move2, p.move3, p.move4,
        p.unique_key, p.source_game, p.source_save, p.caught_date, p.gender,
        p.is_egg, p.met_level
      );
      if (result.changes > 0) imported++;
      else skipped++;
    }
  });
  insertAll();

  if (ignored > 0) console.log(`  Skipped ${ignored} ignored (kept as manual)`);
  console.log(`Imported ${imported} pokemon from collection (${skipped} already exist)`);
  return { imported, skipped, total: allPokemon.length, bySource };
}
