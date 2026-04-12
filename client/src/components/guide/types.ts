export interface SaveWorldState {
  playerName: string;
  trainerId: number;
  currentMapId: number;
  currentLocationKey: string;
  badges: number;
  badgeCount: number;
  keyItems: string[];
  tms: number[];
  hms: number[];
  balls: Array<{ name: string; count: number }>;
  party: Array<{
    species_id: number;
    species_name?: string;
    sprite_url?: string;
    level: number;
  }>;
}

export interface PlaythroughGoal {
  id: number;
  playthrough_id: number;
  requirement_id: number | null;
  species_id: number | null;
  status: string;
  notes: string | null;
  completed_from_save: number;
  species_name: string | null;
  sprite_url: string | null;
  requirement_description: string | null;
  requirement_type: string | null;
  move_name: string | null;
  item_name: string | null;
  priority: string;
}
