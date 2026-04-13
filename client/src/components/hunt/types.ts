import type { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';

export interface HuntFormValues {
  target_name: string;
  target_species_id: number | null;
  game: string;
  rom_path: string;
  sav_path: string;
  hunt_mode: string;
  walk_dir: string;
  num_instances: number;
  engine: 'core' | 'rng';
  target_shiny: number;
  target_perfect: number;
  target_gender: string;
  min_atk: number;
  min_def: number;
  min_spd: number;
  min_spc: number;
  // RNG / Gen 6-7 fields
  encounter_type: string;
  target_nature: string | undefined;
  target_ability: string | undefined;
  target_ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } | undefined;
  shiny_charm: number;
  guaranteed_ivs: number;
}

/** Shared prop subset for sub-components that need react-hook-form access */
export interface HuntFormControl {
  control: Control<HuntFormValues>;
  watch: UseFormWatch<HuntFormValues>;
  setValue: UseFormSetValue<HuntFormValues>;
}
