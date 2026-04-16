export interface BallCount {
  name: string;
  count: number;
}

export interface SaveRtc {
  days: number;    // total elapsed days since game start
  hours: number;   // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
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
  save_rtc?: SaveRtc;
}

export interface ParseResult<T> {
  pokemon: T[];
  worldState: SaveWorldState;
  daycare?: any;
}
