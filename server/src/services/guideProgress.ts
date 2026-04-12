import db from '../db.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';

interface StepProgress {
  step_id: number;
  completed: boolean;
  source: 'save' | 'manual' | 'pending';
  detail?: string;
}

export function computeProgress(game: string, savePath: string | null, saveFileId: number | null, playthroughId?: number): {
  progress: StepProgress[];
  total: number;
  completed: number;
} {
  const steps = db.prepare(`
    SELECT ws.id, ws.species_id, ws.auto_trackable, ws.action_tag
    FROM walkthrough_steps ws
    WHERE ws.game = ?
    ORDER BY ws.id
  `).all(game) as { id: number; species_id: number | null; auto_trackable: number; action_tag: string | null }[];

  // Parse save file for auto-tracking
  const caughtSpecies = new Set<number>();
  if (savePath) {
    try {
      const isGen1 = ['red', 'blue', 'yellow'].includes(game);
      const { pokemon } = isGen1
        ? parseGen1Save(savePath, game)
        : parseGen2Save(savePath, game);

      for (const p of pokemon) {
        caughtSpecies.add(p.species_id);
      }
    } catch (err) {
      console.error(`Failed to parse save for progress: ${err}`);
    }
  }

  // Get manual progress (scoped to playthrough when provided)
  const manualProgress = saveFileId
    ? db.prepare('SELECT step_id, completed FROM guide_progress WHERE save_file_id = ? AND (playthrough_id = ? OR playthrough_id IS NULL)')
        .all(saveFileId, playthroughId ?? null) as { step_id: number; completed: number }[]
    : [];
  const manualMap = new Map(manualProgress.map(p => [p.step_id, p.completed === 1]));

  const progress: StepProgress[] = steps.map(step => {
    // Manual overrides first
    if (manualMap.has(step.id)) {
      return { step_id: step.id, completed: manualMap.get(step.id)!, source: 'manual' as const };
    }

    // Auto-track from save: catch steps with species_id
    if (step.auto_trackable && step.species_id && step.action_tag === 'CATCH-NOW') {
      const caught = caughtSpecies.has(step.species_id);
      return {
        step_id: step.id,
        completed: caught,
        source: caught ? 'save' as const : 'pending' as const,
        detail: caught ? 'Found in save' : undefined,
      };
    }

    return { step_id: step.id, completed: false, source: 'pending' as const };
  });

  return {
    progress,
    total: steps.length,
    completed: progress.filter(p => p.completed).length,
  };
}
