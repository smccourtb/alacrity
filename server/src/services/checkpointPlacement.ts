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
 * Individual Pokémon are fuzzy-matched by (species_id, nickname, ot_name,
 * ot_tid) for the per-mon level-monotonicity guard. PIDs are not available
 * for Gen 1/2 saves, so this four-tuple is the best available fingerprint.
 * For Gen 1/2 saves where nickname/OT are unpopulated, most mons collapse
 * to the same key — the level guard silently does nothing useful (which is
 * acceptable; box_pokemon handles the heavy lifting for those games).
 *
 * Signals:
 *   - badge_count          parent must have ≤ child's badge count          [hard guard]
 *   - play_time_seconds    parent must have ≤ child's playtime              [hard guard]
 *   - party species        Jaccard-style overlap, weight 100                [soft signal]
 *   - badge proximity      penalty per badge of distance, weight -10        [soft signal]
 *   - daycare parent pair  +20 if both saves have the same egg parents      [soft signal]
 *                          -5 if both have a daycare but it differs
 *   - wall-clock mtime     bonus +0..+5 for recent, non-future candidates   [tiebreak]
 *   - box_pokemon subset    +2/match capped at +50, -8/parent-only         [strong signal]
 *   - key_items subset      +1/match capped at +30, -10/parent-only        [strong signal]
 *   - per-mon levels        -25 per party-mon level regression              [strong penalty]
 */
export function findBestParent(
  snapshot: SaveSnapshot,
  placed: PlacedCheckpoint[],
  childMtime: string | null = null,
): number | null {
  if (placed.length === 0) return null;

  const curPartyIds = new Set(snapshot.party.map(p => p.species_id));
  const curDcKey = daycareKey(snapshot);

  // Precompute the child's party mon lookup once for the level-monotonicity
  // guard below. Matched by species + nickname + OT fingerprint (PIDs aren't
  // available in Gen 1/2, so this is the best we can do for fuzzy identity).
  const childParty = new Map<string, number>();
  for (const p of snapshot.party) {
    childParty.set(monKey(p), p.level);
  }

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

    // Box composition: boxes only grow within a playthrough (modulo trades).
    // A parent whose box species are a subset of the child's is very likely
    // a real ancestor. A parent with box species the child lacks is very
    // likely NOT an ancestor.
    const childBoxIds = new Set((snapshot.box_pokemon ?? []).map(p => p.species_id));
    const parentBoxIds = new Set((s.box_pokemon ?? []).map(p => p.species_id));

    let boxScore = 0;
    if (parentBoxIds.size > 0 || childBoxIds.size > 0) {
      let parentInChild = 0;
      let parentNotInChild = 0;
      for (const id of parentBoxIds) {
        if (childBoxIds.has(id)) parentInChild++;
        else parentNotInChild++;
      }
      // Reward: each parent box mon present in child → +2, capped at +50.
      // Penalty: each parent box mon NOT present in child → -8 (uncapped,
      // this is the strong 'wrong lineage' signal).
      boxScore = Math.min(50, parentInChild * 2) - parentNotInChild * 8;
    }

    // Key items: monotonic story progression. Far more granular than badges —
    // dozens of items per playthrough. A parent must have a subset of the
    // child's key items; any parent-only item is strong evidence of wrong lineage.
    const childKeyItems = new Set(snapshot.key_items ?? []);
    const parentKeyItems = new Set(s.key_items ?? []);

    let keyItemScore = 0;
    if (parentKeyItems.size > 0 || childKeyItems.size > 0) {
      let parentInChild = 0;
      let parentNotInChild = 0;
      for (const k of parentKeyItems) {
        if (childKeyItems.has(k)) parentInChild++;
        else parentNotInChild++;
      }
      // Reward: each parent key item present in child → +1, capped at +30.
      // Penalty: each parent key item NOT in child → -10. Strong because key
      // items are basically never lost in normal play.
      keyItemScore = Math.min(30, parentInChild) - parentNotInChild * 10;
    }

    // Per-mon level monotonicity: if both saves contain the "same" individual
    // (fuzzy-matched by species + nickname + OT), the parent's level must be
    // ≤ the child's level. Each violation costs -25 — a single violation is
    // near-certain evidence of wrong lineage.
    let levelViolations = 0;
    for (const pp of s.party) {
      const childLevel = childParty.get(monKey(pp));
      if (childLevel !== undefined && pp.level > childLevel) {
        levelViolations++;
      }
    }
    const levelPenalty = levelViolations * -25;

    const score = overlapRatio * 100 - badgeDiff * 10 + dcBonus + mtimeBonus
                + boxScore + keyItemScore + levelPenalty;

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

function monKey(p: { species_id: number; nickname?: string; ot_name?: string; ot_tid?: number }): string {
  return `${p.species_id}|${(p.nickname ?? '').toLowerCase()}|${p.ot_name ?? ''}|${p.ot_tid ?? ''}`;
}
