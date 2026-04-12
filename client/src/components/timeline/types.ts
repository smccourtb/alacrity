export interface SnapshotDaycareMon {
  species_id: number;
  species_name: string;
  is_shiny: boolean;
}

export interface SnapshotDaycareOffspring {
  species_id: number;
  species_name: string;
}

export interface SnapshotDaycare {
  parent1: SnapshotDaycareMon | null;
  parent2: SnapshotDaycareMon | null;
  offspring: SnapshotDaycareOffspring | null;
  shiny_odds: string | null;
}

export interface StatSpread {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
}

export interface SnapshotBoxMember {
  species_id: number;
  species_name: string;
  box: number;
  level: number;
  is_shiny: boolean;
  moves?: string[];
  nature?: string;
  ability?: string;
  ball?: string;
  has_pokerus?: boolean;
  ivs?: StatSpread;
  evs?: StatSpread;
}

export interface SaveSnapshot {
  generation: number;
  game: string;
  ot_name: string;
  ot_tid: number;
  location: string;
  badge_count: number;
  max_badges?: number;
  party: { species_id: number; species_name: string; level: number; is_shiny: boolean; is_egg: boolean; moves?: string[]; nature?: string; ability?: string; ball?: string; has_pokerus?: boolean; ivs?: StatSpread; evs?: StatSpread }[];
  box_pokemon?: SnapshotBoxMember[];
  daycare?: SnapshotDaycare;
  key_items?: string[];
  play_time_seconds?: number;
}

export interface CheckpointDiff {
  new_badges?: number;
  new_shinies?: { species_id: number; species_name: string }[];
  daycare_changed?: boolean;
  location_changed?: boolean;
  party_changed?: boolean;
}

export type CheckpointType = 'root' | 'progression' | 'catch' | 'snapshot' | 'hunt_base' | 'daycare_swap';

export interface CheckpointNode {
  id: number;
  label: string;
  notes: string | null;
  created_at: string;
  parent_id: number | null;
  is_active: boolean;
  include_in_collection: boolean;
  archived: boolean;
  snapshot: SaveSnapshot | null;
  type: CheckpointType;
  diff: CheckpointDiff | null;
  save_file_id: number;
  file_path: string;
  file_exists: boolean;
  file_mtime?: string;
  file_save_timestamp?: string;
  children: CheckpointNode[];
}

export interface Playthrough {
  id: number;
  game: string;
  ot_name: string;
  ot_tid: number;
  label: string | null;
  active_checkpoint_id: number | null;
}
