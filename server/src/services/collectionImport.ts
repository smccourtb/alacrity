import { readdirSync } from 'fs';
import { join } from 'path';
import db from '../db.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function importFromDirectory(dirPath: string): ImportResult {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  let files: string[];
  try {
    files = readdirSync(dirPath);
  } catch (e: any) {
    return { created: 0, updated: 0, skipped: 0, errors: [`Cannot read directory: ${e.message}`] };
  }

  for (const file of files) {
    const fullPath = join(dirPath, file);
    const ext = file.toLowerCase().split('.').pop();

    // Skip non-save files
    if (!ext || !['sav', 'dat', 'bak', 'srm'].includes(ext)) continue;

    let pokemon: any[] = [];
    try {
      // Determine game name hint from filename for Gen 2 Crystal detection
      const lowerFile = file.toLowerCase();
      let gameName = 'unknown';
      if (lowerFile.includes('crystal')) gameName = 'crystal';
      else if (lowerFile.includes('gold')) gameName = 'gold';
      else if (lowerFile.includes('silver')) gameName = 'silver';
      else if (lowerFile.includes('red')) gameName = 'red';
      else if (lowerFile.includes('blue')) gameName = 'blue';
      else if (lowerFile.includes('yellow')) gameName = 'yellow';

      // Try Gen 1 first, then Gen 2. Both parsers read the file themselves.
      let parsed = false;
      const gen1Games = ['red', 'blue', 'yellow'];
      const gen2Games = ['gold', 'silver', 'crystal'];

      if (gen1Games.includes(gameName)) {
        try {
          const result = parseGen1Save(fullPath, gameName);
          pokemon = result.pokemon;
          parsed = true;
        } catch (e: any) {
          errors.push(`${file}: Gen 1 parse failed: ${e.message}`);
          continue;
        }
      } else if (gen2Games.includes(gameName)) {
        try {
          const result = parseGen2Save(fullPath, gameName);
          pokemon = result.pokemon;
          parsed = true;
        } catch (e: any) {
          errors.push(`${file}: Gen 2 parse failed: ${e.message}`);
          continue;
        }
      } else {
        // Unknown game — try Gen 1 first, fall back to Gen 2
        try {
          const result = parseGen1Save(fullPath, gameName);
          if (result.pokemon.length > 0) {
            pokemon = result.pokemon;
            parsed = true;
          }
        } catch {
          // Gen 1 failed, try Gen 2
        }

        if (!parsed) {
          try {
            const result = parseGen2Save(fullPath, gameName);
            pokemon = result.pokemon;
            parsed = true;
          } catch {
            // both failed
          }
        }

        if (!parsed) {
          errors.push(`${file}: Could not parse as Gen 1 or Gen 2`);
          continue;
        }
      }
    } catch (e: any) {
      errors.push(`${file}: ${e.message}`);
      continue;
    }

    if (pokemon.length === 0) continue;

    for (const p of pokemon) {
      if (!p.species_id) continue;

      // Normalize is_shiny to integer for SQLite
      const normalizedP: Record<string, any> = { ...p };
      if (typeof normalizedP.is_shiny === 'boolean') {
        normalizedP.is_shiny = normalizedP.is_shiny ? 1 : 0;
      }
      // Gen 1 has iv_special; map to iv_sp_attack for DB compatibility
      if ('iv_special' in normalizedP && !('iv_sp_attack' in normalizedP)) {
        normalizedP.iv_sp_attack = normalizedP.iv_special;
        normalizedP.iv_sp_defense = normalizedP.iv_special;
        delete normalizedP.iv_special;
      }
      // Remove move fields if they're empty strings (avoid overwriting real data)
      for (const moveField of ['move1', 'move2', 'move3', 'move4']) {
        if (normalizedP[moveField] === '') {
          delete normalizedP[moveField];
        }
      }
      // held_item in Gen2 is an integer item ID — store as-is (DB field is TEXT but SQLite is flexible)

      // Check if this pokemon already exists (match by species + OT + TID + source=auto)
      const existing = db.prepare(
        'SELECT * FROM pokemon WHERE species_id = ? AND ot_name = ? AND ot_tid = ? AND source = ?'
      ).get(normalizedP.species_id, normalizedP.ot_name || null, normalizedP.ot_tid || null, 'auto') as any;

      if (existing) {
        // Update auto fields, skip manual_fields
        const manualFields = new Set(JSON.parse(existing.manual_fields || '[]'));
        const updates: Record<string, any> = {};

        for (const [key, value] of Object.entries(normalizedP)) {
          if (key !== 'id' && key !== 'species_id' && !manualFields.has(key)) {
            updates[key] = value;
          }
        }

        if (Object.keys(updates).length > 0) {
          const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
          db.prepare(`UPDATE pokemon SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
            .run(...Object.values(updates), existing.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new auto entry
        const fields = ['species_id', 'source', ...Object.keys(normalizedP).filter(k => k !== 'species_id')];
        const values = [normalizedP.species_id, 'auto', ...Object.keys(normalizedP).filter(k => k !== 'species_id').map(k => normalizedP[k])];
        const placeholders = fields.map(() => '?').join(', ');

        try {
          db.prepare(`INSERT INTO pokemon (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
          created++;
        } catch (e: any) {
          errors.push(`${file}/${normalizedP.species_id}: ${e.message}`);
        }
      }
    }
  }

  return { created, updated, skipped, errors };
}
