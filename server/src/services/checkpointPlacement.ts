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
  /** The parent checkpoint id this save is currently assigned to in the placed
   *  tree, or null if it's a root. Used by the chain-flattening tiebreak to
   *  walk up the parent chain. */
  parent_id: number | null;
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
 *
 * For Gen 1/2 where nickname isn't decoded, same-species same-trainer mons
 * collapse to the same key — so the guard still fires on same-species level
 * regressions. Within one playthrough that's usually correct (a legitimate
 * ancestor shouldn't have a higher-level version of a species than its
 * descendant), but it can false-positive if the player released their
 * original mon and caught a lower-level replacement of the same species,
 * because the ancestor save still has the higher-level original. The -25
 * per violation is small enough that box_pokemon can still carry a correct
 * lineage through one or two spurious matches.
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

  // Precompute the child's party mon lookup once for the level-monotonicity
  // guard (used by scoreCandidate).
  const childParty = new Map<string, number>();
  for (const p of snapshot.party) {
    childParty.set(monKey(p), p.level);
  }

  let bestId: number | null = null;
  let bestScore = -Infinity;

  for (const cp of placed) {
    const s = cp.snapshot;

    // Hard guard: badge counts only go up in a playthrough.
    if (s.badge_count > snapshot.badge_count) continue;

    // NOTE: the play_time_seconds hard guard was dropped. It turned out to
    // be unreliable for hunt-derived saves — the shiny-hunter binaries copy
    // a base save and its recorded playtime can be disconnected from
    // real-world chronology (a dev/test save at "17h" can contain post-E4
    // content because of save manipulation). Dropping the guard lets real-
    // world-earlier saves (per mtime) become ancestors of real-world-later
    // saves even when the in-game playtime counter disagrees.

    const score = scoreCandidate(snapshot, cp, childParty, childMtime);

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

/**
 * Score a single candidate parent against a new save. Pure function — no
 * hard guards (callers must enforce badge_count and play_time_seconds
 * monotonicity before calling). Returns the composite score using all the
 * same signals as findBestParent's main loop.
 */
function scoreCandidate(
  snapshot: SaveSnapshot,
  cp: PlacedCheckpoint,
  childParty: Map<string, number>,
  childMtime: string | null,
): number {
  const s = cp.snapshot;

  // Party species overlap, normalised to [0..1].
  const curPartyIds = new Set(snapshot.party.map(p => p.species_id));
  const parentPartyIds = new Set(s.party.map(p => p.species_id));
  let overlap = 0;
  for (const id of curPartyIds) if (parentPartyIds.has(id)) overlap++;
  const maxParty = Math.max(curPartyIds.size, parentPartyIds.size, 1);
  const overlapRatio = overlap / maxParty;

  const badgeDiff = snapshot.badge_count - s.badge_count;

  // Daycare bonus / mismatch penalty.
  const curDcKey = daycareKey(snapshot);
  const parentDcKey = daycareKey(s);
  let dcBonus = 0;
  if (curDcKey && parentDcKey && curDcKey === parentDcKey) dcBonus = 20;
  else if (curDcKey && parentDcKey && curDcKey !== parentDcKey) dcBonus = -5;

  // Wall-clock mtime proximity (0..+5, 30-day linear decay).
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

  // Box composition: monotonic accumulation signal.
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
    boxScore = Math.min(50, parentInChild * 2) - parentNotInChild * 8;
  }

  // Key items: monotonic story progression signal.
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
    keyItemScore = Math.min(30, parentInChild) - parentNotInChild * 10;
  }

  // Per-mon level monotonicity (fuzzy-matched by species + nickname + OT).
  let levelViolations = 0;
  for (const pp of s.party) {
    const childLevel = childParty.get(monKey(pp));
    if (childLevel !== undefined && pp.level > childLevel) {
      levelViolations++;
    }
  }
  const levelPenalty = levelViolations * -25;

  return overlapRatio * 100 - badgeDiff * 10 + dcBonus + mtimeBonus
       + boxScore + keyItemScore + levelPenalty;
}
