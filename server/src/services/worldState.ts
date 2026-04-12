export interface BallCount {
  name: string;
  count: number;
}

export interface SaveWorldState {
  playerName: string;
  trainerId: number;
  trainerSid: number;
  tsv: number;
  currentMapId: number;
  currentLocationKey: string;
  badges: number;
  badgeCount: number;
  keyItems: string[];
  tms: number[];
  hms: number[];
  balls: BallCount[];
  playTimeSeconds: number | null;
}

export interface ParseResult<T> {
  pokemon: T[];
  worldState: SaveWorldState;
  daycare?: any;
}
