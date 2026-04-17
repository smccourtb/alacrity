import db from '../db.js';
import type { SaveWorldState } from './worldState.js';

export type HuntMode = 'wild' | 'stationary' | 'gift' | 'egg';

export type CheckId =
  | 'mode_species'
  | 'game_species'
  | 'wild_location'
  | 'wild_encounter'
  | 'egg_daycare';

export type CheckSeverity = 'error' | 'warning' | 'skipped';

export interface CheckResult {
  id: CheckId;
  severity: CheckSeverity;
  message: string;
  detail?: string;
}

export interface ValidationInput {
  game: string;
  sav_path: string | null;
  hunt_mode: HuntMode;
  target_species_id: number | null;
}

export interface ValidationReport {
  ok: boolean;
  checks: CheckResult[];
}

export interface SaveContext {
  worldState: SaveWorldState | null;
  daycare: any | null;
  parseError?: string;
}

// Loader implemented in Task 3
export async function loadSaveContext(_sav_path: string, _game: string): Promise<SaveContext> {
  return { worldState: null, daycare: null };
}

export async function validateHuntConfig(input: ValidationInput): Promise<ValidationReport> {
  const checks: CheckResult[] = [];
  // Rules added in Tasks 2 + 4
  const ok = !checks.some(c => c.severity === 'error');
  return { ok, checks };
}
