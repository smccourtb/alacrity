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
  // Per-location flag stats. `total`/`set` count every flag tagged with this
  // location (including internal/branch flags). `linked_total`/`linked_set`
  // count only flags that are wired to a marker row (`location_*.flag_index`)
  // — that's the meaningful "checklist completion" number for the UI. Both
  // are populated server-side; clients should prefer `linked_*` when present.
  flags_by_location: Record<string, {
    total: number;
    set: number;
    linked_total: number;
    linked_set: number;
    flags: FlagResult[];
  }>;
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
      flags_by_location[locKey] = { total: 0, set: 0, linked_total: 0, linked_set: 0, flags: [] };
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

// Decorate a SaveFlagReport with per-location `linked_total` / `linked_set`
// computed from the actual marker rows. Pass in a function that returns the
// list of linked flag indices for a location_key — the route handler builds
// this from `location_items` ∪ `location_trainers` ∪ `location_tms` ∪
// `location_events` rows where `flag_index IS NOT NULL`.
//
// Side-effect: drops a copy of every `set` flag's index into each location's
// `flags` array if missing. Engine flags don't carry a `location_key` (they
// gate game-wide features like Pokégear or daily-NPC cycles), but linker
// rows can pin them to a location_key. Without this propagation, a row
// linked to flag 4100 (ENGINE_POKEGEAR) at new-bark-town wouldn't surface
// the set bit when the UI iterates the location's flag list.
export function decorateWithLinkedCounts(
  report: SaveFlagReport,
  linkedFlagIndicesByLocation: Map<string, number[]>,
): void {
  // Index every flag globally (set or unset) so we can copy entries into
  // location buckets that depend on location-less flags (engine bank).
  const flagsByIndex = new Map<number, FlagResult>();
  const setIndices = new Set<number>();
  for (const loc of Object.values(report.flags_by_location)) {
    for (const f of loc.flags) {
      if (!flagsByIndex.has(f.index)) flagsByIndex.set(f.index, f);
      if (f.set) setIndices.add(f.index);
    }
  }
  for (const [locKey, indices] of linkedFlagIndicesByLocation) {
    let bucket = report.flags_by_location[locKey];
    if (!bucket) {
      bucket = report.flags_by_location[locKey] = {
        total: 0, set: 0, linked_total: 0, linked_set: 0, flags: [],
      };
    }
    bucket.linked_total = indices.length;
    bucket.linked_set = indices.filter(i => setIndices.has(i)).length;
    // Pull in flag entries for indices linked to this location that aren't
    // already in this bucket (engine flags primarily). The UI's
    // `isComplete` check walks `bucket.flags` looking for `index === f.index
    // && f.set`; we make sure every linked index appears here.
    const haveIndices = new Set(bucket.flags.map(f => f.index));
    for (const idx of indices) {
      if (haveIndices.has(idx)) continue;
      const fr = flagsByIndex.get(idx);
      if (fr) bucket.flags.push({ ...fr });
    }
  }
}

export function readFlag(data: Buffer, baseOffset: number, flagIndex: number): boolean {
  const byteOffset = baseOffset + (flagIndex >> 3);
  const bitMask = 1 << (flagIndex & 7);
  if (byteOffset >= data.length) return false;
  return (data[byteOffset] & bitMask) !== 0;
}
