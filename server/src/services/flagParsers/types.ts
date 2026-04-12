export interface FlagDefinition {
  index: number;
  name: string;
  category: string;
  location_key?: string;
  source: string;
}

export interface FlagResult {
  index: number;
  name: string;
  category: string;
  location_key?: string;
  set: boolean;
}

export interface SaveFlagReport {
  game: string;
  total_flags: number;
  set_flags: number;
  flags_by_location: Record<string, { total: number; set: number; flags: FlagResult[] }>;
  flags_by_category: Record<string, { total: number; set: number }>;
}

export interface FlagParser {
  parse(saveBuffer: Buffer, game: string): FlagResult[];
}

export function buildFlagReport(game: string, results: FlagResult[]): SaveFlagReport {
  const flags_by_location: SaveFlagReport['flags_by_location'] = {};
  const flags_by_category: SaveFlagReport['flags_by_category'] = {};

  for (const flag of results) {
    const locKey = flag.location_key ?? '_unknown';
    if (!flags_by_location[locKey]) {
      flags_by_location[locKey] = { total: 0, set: 0, flags: [] };
    }
    flags_by_location[locKey].total++;
    if (flag.set) flags_by_location[locKey].set++;
    flags_by_location[locKey].flags.push(flag);

    if (!flags_by_category[flag.category]) {
      flags_by_category[flag.category] = { total: 0, set: 0 };
    }
    flags_by_category[flag.category].total++;
    if (flag.set) flags_by_category[flag.category].set++;
  }

  return {
    game,
    total_flags: results.length,
    set_flags: results.filter(f => f.set).length,
    flags_by_location,
    flags_by_category,
  };
}

export function readFlag(data: Buffer, baseOffset: number, flagIndex: number): boolean {
  const byteOffset = baseOffset + (flagIndex >> 3);
  const bitMask = 1 << (flagIndex & 7);
  if (byteOffset >= data.length) return false;
  return (data[byteOffset] & bitMask) !== 0;
}
