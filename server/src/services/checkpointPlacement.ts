// server/src/services/checkpointPlacement.ts
//
// Single source of truth for parent-selection logic. Both syncSaves (background
// sync) and routes/timeline.ts (POST /scan) import findBestParent from here.
// Prior to 2026-04-14 these were two separate copies that had silently drifted.

import type { SaveSnapshot } from './saveSnapshot.js';

export interface PlacedCheckpoint {
  id: number;
  snapshot: SaveSnapshot;
  /** ISO timestamp from save_files.file_mtime — wall-clock signal for tiebreaks. */
  file_mtime: string | null;
}

/**
 * Choose the best parent checkpoint for a new save by comparing snapshots.
 *
 * Returns the checkpoint id with the highest similarity score, or null if no
 * candidate qualifies (e.g. nothing placed yet, or every existing checkpoint
 * has a higher badge count / playtime than this one — which means this save
 * is the earliest in its playthrough so far and should be a root).
 *
 * Signals (this is the merged baseline — Tasks 2/3 add more):
 *   - badge_count          parent must have ≤ child's badge count          [hard guard]
 *   - play_time_seconds    parent must have ≤ child's playtime              [hard guard]
 *   - party species        Jaccard-style overlap, weight 100                [soft signal]
 *   - badge proximity      penalty per badge of distance, weight -10        [soft signal]
 *   - daycare parent pair  +20 if both saves have the same egg parents      [soft signal]
 *                          -5 if both have a daycare but it differs
 *   - wall-clock mtime     bonus +0..+5 for recent, non-future candidates   [tiebreak]
 */
export function findBestParent(
  snapshot: SaveSnapshot,
  placed: PlacedCheckpoint[],
  childMtime: string | null = null,
): number | null {
  if (placed.length === 0) return null;

  const curPartyIds = new Set(snapshot.party.map(p => p.species_id));
  const curDcKey = daycareKey(snapshot);

  let bestId: number | null = null;
  let bestScore = -Infinity;

  for (const cp of placed) {
    const s = cp.snapshot;

    // Hard guards: a parent in the timeline can never be "ahead" of its child.
    if (s.badge_count > snapshot.badge_count) continue;
    if ((s.play_time_seconds ?? 0) > (snapshot.play_time_seconds ?? 0)) continue;

    // Party species overlap, normalised to [0..1].
    const parentPartyIds = new Set(s.party.map(p => p.species_id));
    let overlap = 0;
    for (const id of curPartyIds) if (parentPartyIds.has(id)) overlap++;
    const maxParty = Math.max(curPartyIds.size, parentPartyIds.size, 1);
    const overlapRatio = overlap / maxParty;

    const badgeDiff = snapshot.badge_count - s.badge_count;

    // Daycare bonus / mismatch penalty.
    const parentDcKey = daycareKey(s);
    let dcBonus = 0;
    if (curDcKey && parentDcKey && curDcKey === parentDcKey) dcBonus = 20;
    else if (curDcKey && parentDcKey && curDcKey !== parentDcKey) dcBonus = -5;

    // Wall-clock proximity: when scores are otherwise close, prefer the
    // candidate whose mtime is closest to (but not after) the new save's
    // mtime. Max +5 at zero age, linear decay at -1/6 per day, floored
    // at 0. Zero contribution if either timestamp is missing or the
    // candidate is newer than the child.
    let mtimeBonus = 0;
    const parentMtime = cp.file_mtime;
    if (childMtime && parentMtime) {
      const childMs = Date.parse(childMtime);
      const parentMs = Date.parse(parentMtime);
      if (Number.isFinite(childMs) && Number.isFinite(parentMs) && parentMs <= childMs) {
        const ageDays = (childMs - parentMs) / 86_400_000;
        mtimeBonus = Math.max(0, 5 - ageDays / 6);
      }
    }

    const score = overlapRatio * 100 - badgeDiff * 10 + dcBonus + mtimeBonus;

    if (score > bestScore) {
      bestScore = score;
      bestId = cp.id;
    }
  }

  return bestId;
}

function daycareKey(snapshot: SaveSnapshot): string | null {
  if (!snapshot.daycare) return null;
  const a = snapshot.daycare.parent1?.species_id ?? 0;
  const b = snapshot.daycare.parent2?.species_id ?? 0;
  return [a, b].sort().join(',');
}
