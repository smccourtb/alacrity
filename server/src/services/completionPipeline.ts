import db from '../db.js';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';
import type { SaveWorldState } from './worldState.js';

const SAVES_DIR = paths.savesDir;

interface SpecimenTarget {
  id: number;
  species_id: number;
  constraints: string;
}

interface CaughtPokemon {
  species_id: number;
  is_shiny: number;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
}

function pokemonMatchesTarget(pokemon: CaughtPokemon, target: SpecimenTarget): boolean {
  if (pokemon.species_id !== target.species_id) return false;

  let constraints: Record<string, any>;
  try {
    constraints = JSON.parse(target.constraints || '{}');
  } catch {
    return pokemon.species_id === target.species_id;
  }

  if (constraints.shiny && !pokemon.is_shiny) return false;

  if (constraints.moves && Array.isArray(constraints.moves)) {
    const pokemonMoves = [pokemon.move1, pokemon.move2, pokemon.move3, pokemon.move4]
      .filter(Boolean)
      .map(m => m!.toLowerCase());
    for (const required of constraints.moves) {
      if (!pokemonMoves.includes(required.toLowerCase())) return false;
    }
  }

  return true;
}

// Map badge count to gym milestone descriptions for matching
const KANTO_GYM_PATTERNS = [
  'Brock', 'Misty', 'Lt. Surge', 'Erika', 'Sabrina', 'Koga', 'Blaine', 'Giovanni',
];
const JOHTO_GYM_PATTERNS = [
  'Falkner', 'Bugsy', 'Whitney', 'Morty', 'Chuck', 'Jasmine', 'Pryce', 'Clair',
];

function detectGame(dirName: string): { game: string; gen: number } | null {
  const patterns: [RegExp, string, number][] = [
    [/Red/i, 'Red', 1], [/Blue/i, 'Blue', 1], [/Yellow/i, 'Yellow', 1],
    [/Gold/i, 'Gold', 2], [/Silver/i, 'Silver', 2], [/Crystal/i, 'Crystal', 2],
  ];
  for (const [re, game, gen] of patterns) {
    if (re.test(dirName)) return { game, gen };
  }
  return null;
}

function getBestWorldStatePerGame(): Map<string, SaveWorldState> {
  const best = new Map<string, SaveWorldState>();

  // Scan library and checkpoint directories for saves
  for (const baseDir of [join(SAVES_DIR, 'library'), join(SAVES_DIR, 'catches')]) {
    if (!existsSync(baseDir)) continue;

    const scanDir = (dir: string, depth: number) => {
      if (depth > 4) return;
      let entries: string[];
      try { entries = readdirSync(dir); } catch { return; }

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = require('fs').statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry === 'main' || entry === 'sav.dat' || entry.endsWith('.sav')) {
            // Try to detect game from path
            const detected = detectGame(dir) || detectGame(entry);
            if (!detected || detected.gen > 2) continue;

            try {
              const parser = detected.gen === 1 ? parseGen1Save : parseGen2Save;
              const { worldState } = parser(fullPath, detected.game);
              if (!worldState) continue;

              const gameKey = detected.game.toLowerCase();
              const existing = best.get(gameKey);
              if (!existing || worldState.badgeCount > existing.badgeCount) {
                best.set(gameKey, worldState);
              }
            } catch { /* skip unparseable saves */ }
          }
        } catch { /* skip inaccessible files */ }
      }
    };
    scanDir(baseDir, 0);
  }

  return best;
}

function autoCompleteMilestones(): number {
  const worldStates = getBestWorldStatePerGame();
  let completed = 0;

  const gameToWalkthroughGames: Record<string, string[]> = {
    'red': ['red'], 'blue': ['blue'], 'yellow': ['yellow'],
    'gold': ['gold'], 'silver': ['silver'], 'crystal': ['crystal'],
  };

  const insertProgress = db.prepare(`
    INSERT OR IGNORE INTO guide_progress (step_id, completed, completed_at)
    VALUES (?, 1, datetime('now'))
  `);

  const runAll = db.transaction(() => {
    for (const [game, ws] of worldStates) {
      const walkthroughGames = gameToWalkthroughGames[game] || [game];
      const gymPatterns = ['red', 'blue', 'yellow'].includes(game) ? KANTO_GYM_PATTERNS : JOHTO_GYM_PATTERNS;

      for (const wGame of walkthroughGames) {
        // Get all milestone steps for this game
        const milestones = db.prepare(`
          SELECT ws.id, ws.description
          FROM walkthrough_steps ws
          WHERE ws.game = ? AND ws.specimen_task_id IS NULL
        `).all(wGame) as { id: number; description: string }[];

        for (const milestone of milestones) {
          // Check gyms by badge count
          for (let i = 0; i < gymPatterns.length; i++) {
            if (milestone.description.includes(gymPatterns[i]) && ws.badgeCount > i) {
              const result = insertProgress.run(milestone.id);
              if (result.changes > 0) completed++;
              break;
            }
          }

          // Check story milestones by badge thresholds
          if (milestone.description.includes('Elite Four') && ws.badgeCount >= 8) {
            const result = insertProgress.run(milestone.id);
            if (result.changes > 0) completed++;
          }
          if (milestone.description.includes('Deliver Oak') && ws.badgeCount >= 0) {
            // If they have any save at all, they delivered the parcel
            const result = insertProgress.run(milestone.id);
            if (result.changes > 0) completed++;
          }
          if (milestone.description.includes('Pokedex') && ws.badgeCount >= 0) {
            const result = insertProgress.run(milestone.id);
            if (result.changes > 0) completed++;
          }
        }
      }
    }
  });
  runAll();

  if (completed > 0) {
    console.log(`Milestone auto-complete: marked ${completed} milestones from save world state.`);
  }

  return completed;
}

export function runCompletionScan(): { matched: number; total: number } {
  // 1. Specimen target completion from pokemon table
  const targets = db.prepare(`
    SELECT st.id, st.species_id, st.constraints
    FROM specimen_targets st
    JOIN specimen_progress sp ON sp.target_id = st.id
    WHERE sp.status NOT IN ('completed', 'obtained', 'journey_complete')
  `).all() as SpecimenTarget[];

  const allPokemon = db.prepare(`
    SELECT species_id, is_shiny, move1, move2, move3, move4
    FROM pokemon
  `).all() as CaughtPokemon[];

  const pokemonBySpecies = new Map<number, CaughtPokemon[]>();
  for (const p of allPokemon) {
    const list = pokemonBySpecies.get(p.species_id) || [];
    list.push(p);
    pokemonBySpecies.set(p.species_id, list);
  }

  const updateProgress = db.prepare(`
    UPDATE specimen_progress SET status = 'completed'
    WHERE target_id = ? AND status NOT IN ('completed', 'obtained', 'journey_complete')
  `);

  let matched = 0;

  const runSpecimens = db.transaction(() => {
    for (const target of targets) {
      const candidates = pokemonBySpecies.get(target.species_id) || [];
      const found = candidates.some(p => pokemonMatchesTarget(p, target));
      if (found) {
        const result = updateProgress.run(target.id);
        if (result.changes > 0) matched++;
      }
    }
  });
  runSpecimens();

  if (matched > 0) {
    console.log(`Completion scan: matched ${matched}/${targets.length} pending targets.`);
  }

  // 2. Milestone auto-completion from save world state
  autoCompleteMilestones();

  return { matched, total: targets.length };
}
