import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import db from '../db.js';
import { discoverAllSaves, type DiscoveredSave } from './saveDiscovery.js';
import { autoLinkSave } from './autoLinkage.js';
import { buildSnapshot, type SaveSnapshot } from './saveSnapshot.js';
import { prettyGameName } from './pkConstants.js';
import { reconcileTipsInclusion } from './identityService.js';
import { findBestParent, type PlacedCheckpoint } from './checkpointPlacement.js';

export interface SyncSavesResult {
  added: number;
  stale: number;
  updated: number;
  reconcileErrors: string[];
}

/**
 * Reconcile filesystem saves with the save_files DB table.
 * - New files on disk → INSERT
 * - Files in DB but missing from disk → mark stale
 * - Files in both → update mtime/size if changed
 *
 * After reconciling, runs reconcileTipsInclusion() so newly-created
 * checkpoints that became active tips get flagged + scanned. Any errors
 * from that step are returned in reconcileErrors so callers can surface
 * them rather than relying on console.
 */
export function syncSaves(): SyncSavesResult {
  const discovered = discoverAllSaves();
  const discoveredPaths = new Set(discovered.map(d => d.filePath));

  let added = 0, stale = 0, updated = 0;

  // Prepared statements (created outside transaction, executed inside)
  const markStale = db.prepare('UPDATE save_files SET stale = 1 WHERE id = ?');
  const unStale = db.prepare('UPDATE save_files SET stale = 0 WHERE id = ?');
  const upsert = db.prepare(`
    INSERT INTO save_files (filename, file_path, game, generation, label, source, format,
                            file_size, file_mtime, save_timestamp, checksum, stale, launchable, rom_path)
    VALUES ($filename, $filePath, $game, $generation, $label, $source, $format,
            $fileSize, $lastModified, $saveTimestamp, $checksum, 0, $launchable, $romPath)
    ON CONFLICT(file_path) DO UPDATE SET
      file_size = $fileSize,
      file_mtime = $lastModified,
      save_timestamp = COALESCE($saveTimestamp, save_timestamp),
      stale = 0,
      launchable = $launchable,
      rom_path = $romPath
  `);

  const existing = db.prepare('SELECT file_path, file_mtime FROM save_files').all() as any[];
  const existingMap = new Map(existing.map((r: any) => [r.file_path, r.file_mtime]));

  // Wrap stale-marking, un-staling, and upserting in a single transaction
  const reconcile = db.transaction((saves: DiscoveredSave[]) => {
    // Mark DB rows not on disk as stale
    const allDbSaves = db.prepare('SELECT id, file_path FROM save_files WHERE stale = 0').all() as any[];
    for (const row of allDbSaves) {
      if (!existsSync(row.file_path) && !discoveredPaths.has(row.file_path)) {
        markStale.run(row.id);
        stale++;
      }
    }

    // Un-stale any DB rows that are back on disk
    const staleRows = db.prepare('SELECT id, file_path FROM save_files WHERE stale = 1').all() as any[];
    for (const row of staleRows) {
      if (existsSync(row.file_path)) {
        unStale.run(row.id);
      }
    }

    // Upsert discovered saves
    for (const save of saves) {
      const prev = existingMap.get(save.filePath);
      const isNew = !prev;

      let checksum: string | null = save.checksum ?? null;
      if (!checksum && (isNew || prev !== save.lastModified)) {
        try {
          checksum = createHash('sha256').update(readFileSync(save.filePath)).digest('hex');
        } catch { /* non-fatal */ }
      }

      upsert.run({
        $filename: save.filePath.split('/').pop() || '',
        $filePath: save.filePath,
        $game: save.game,
        $generation: save.generation,
        $label: save.label,
        $source: save.source,
        $format: save.format,
        $fileSize: save.fileSize,
        $lastModified: save.lastModified,
        $saveTimestamp: save.playTimeSeconds != null ? String(save.playTimeSeconds) : null,
        $checksum: checksum,
        $launchable: save.launchable ? 1 : 0,
        $romPath: save.romPath,
      });

      if (isNew) added++;
      else if (prev !== save.lastModified) updated++;
    }
  });

  reconcile(discovered);

  // Clean up placeholder linkages from before Gen 3+ parsing was wired up:
  // delete checkpoints whose playthrough has ot_name='Unknown', so they get re-linked properly
  const placeholderPts = db.prepare(
    "SELECT id FROM playthroughs WHERE ot_name = 'Unknown' AND ot_tid = 0"
  ).all() as Array<{ id: number }>;
  if (placeholderPts.length > 0) {
    const ptIds = placeholderPts.map(r => r.id);
    const inClause = ptIds.join(',');
    // Temporarily disable FK checks for cascading cleanup
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare(`UPDATE playthroughs SET active_checkpoint_id = NULL WHERE id IN (${inClause})`).run();
    db.prepare(`DELETE FROM checkpoints WHERE playthrough_id IN (${inClause})`).run();
    db.prepare(`DELETE FROM playthrough_goals WHERE playthrough_id IN (${inClause})`).run();
    db.prepare(`DELETE FROM playthroughs WHERE id IN (${inClause})`).run();
    db.exec('PRAGMA foreign_keys = ON');
    console.log(`[syncSaves] Cleaned ${placeholderPts.length} placeholder playthroughs`);
  }

  // Auto-link saves that have no checkpoint yet.
  // Uses smart placement: parse snapshots, sort by badge count, then find
  // best parent for each via party overlap + badge proximity (handles branching).
  const unlinked = db.prepare(`
    SELECT sf.id, sf.file_path, sf.game, sf.label, sf.file_mtime FROM save_files sf
    WHERE sf.game IS NOT NULL AND sf.game != 'Unknown' AND sf.stale = 0
      AND NOT EXISTS (SELECT 1 FROM checkpoints c WHERE c.save_file_id = sf.id)
  `).all() as Array<{ id: number; file_path: string; game: string; label: string | null; file_mtime: string | null }>;

  if (unlinked.length > 0) {
    smartPlaceSaves(unlinked);
  }

  // Backfill: an earlier version of smartPlaceSaves derived checkpoint labels
  // from the parent directory, which for a flat file in `library/Crystal/foo.sav`
  // is the game folder ("Crystal"). That made every loose library save appear
  // as an indistinguishable "Crystal" row in the timeline. Heal those rows by
  // copying the (now-correct) save_files.label, but only where the checkpoint
  // label literally matches the game name — anything else may be user-edited.
  const healed = db.prepare(`
    UPDATE checkpoints
    SET label = (SELECT label FROM save_files WHERE id = checkpoints.save_file_id)
    WHERE save_file_id IN (
      SELECT sf.id FROM save_files sf
      WHERE sf.label IS NOT NULL AND sf.label != ''
        AND lower(sf.label) != lower(sf.game)
        AND lower((SELECT label FROM checkpoints WHERE save_file_id = sf.id)) = lower(sf.game)
    )
  `).run();
  if (healed.changes > 0) console.log(`[syncSaves] Healed ${healed.changes} checkpoint labels that were stuck on the game name`);

  // Re-link checkpoints pointing at stale saves to their non-stale replacements
  const relinked = relinkStaleCheckpoints();

  // Clean up stale rows no longer referenced by anything
  const cleaned = cleanUnreferencedStale();

  console.log(`[syncSaves] added=${added} updated=${updated} stale=${stale} relinked=${relinked} cleaned=${cleaned} total_discovered=${discovered.length}`);

  // Reconcile auto-tip inclusion: newly-created checkpoints that became
  // active tips get include_in_collection=1 + scanned; old tips that are
  // no longer tip get flipped off (unless the user explicitly flagged them).
  const reconcileErrors: string[] = [];
  try {
    const r = reconcileTipsInclusion();
    if (r.errors.length > 0) {
      reconcileErrors.push(...r.errors.map(e => `checkpoint ${e.checkpointId}: ${e.reason}`));
    }
  } catch (err: any) {
    console.error('[syncSaves] reconcileTipsInclusion failed:', err);
    reconcileErrors.push(err?.message || String(err));
  }

  return { added, stale, updated, reconcileErrors };
}

/**
 * Checkpoints may point at stale save_files after a directory migration.
 * Re-link them to the matching non-stale save by game + label or path similarity.
 */
function relinkStaleCheckpoints(): number {
  const broken = db.prepare(`
    SELECT c.id as cp_id, c.save_file_id, sf.file_path, sf.game, sf.label, sf.filename
    FROM checkpoints c
    JOIN save_files sf ON c.save_file_id = sf.id
    WHERE sf.stale = 1
  `).all() as any[];

  if (broken.length === 0) return 0;

  const updateCp = db.prepare('UPDATE checkpoints SET save_file_id = ? WHERE id = ?');
  const byGameLabel = db.prepare('SELECT id FROM save_files WHERE game = ? AND label = ? AND stale = 0 LIMIT 1');
  const byGamePath = db.prepare('SELECT id FROM save_files WHERE game = ? AND file_path LIKE ? AND stale = 0 LIMIT 1');
  const byGameFilename = db.prepare('SELECT id FROM save_files WHERE game = ? AND file_path LIKE ? AND stale = 0 LIMIT 1');

  let fixed = 0;
  for (const b of broken) {
    const parts = b.file_path.split('/');
    const parentDir = parts[parts.length - 2] || '';
    const fname = parts[parts.length - 1] || '';

    let match: any = null;

    // Try label match
    if (b.label) match = byGameLabel.get(b.game, b.label);

    // Try parent directory as label
    if (!match && parentDir) match = byGameLabel.get(b.game, parentDir);

    // Try path containing parent dir
    if (!match && parentDir) match = byGamePath.get(b.game, `%/${parentDir}/%`);

    // Try sav.dat → {label}.sav conversion (checkpoint migration format)
    if (!match && parentDir && fname === 'sav.dat') match = byGameFilename.get(b.game, `%/${parentDir}.sav`);

    if (match) {
      updateCp.run(match.id, b.cp_id);
      fixed++;
    }
  }

  if (fixed > 0) console.log(`[syncSaves] Re-linked ${fixed}/${broken.length} checkpoints from stale to active saves`);
  return fixed;
}

/**
 * Delete stale save_files rows that are no longer referenced by any checkpoint,
 * guide_progress, specimen_task, or walkthrough_step.
 */
function cleanUnreferencedStale(): number {
  const result = db.prepare(`
    DELETE FROM save_files WHERE stale = 1
    AND NOT EXISTS (SELECT 1 FROM checkpoints WHERE save_file_id = save_files.id)
    AND NOT EXISTS (SELECT 1 FROM guide_progress WHERE save_file_id = save_files.id)
    AND NOT EXISTS (SELECT 1 FROM specimen_tasks WHERE save_file_id = save_files.id)
    AND NOT EXISTS (SELECT 1 FROM walkthrough_steps WHERE save_file_id = save_files.id)
  `).run();
  return result.changes;
}

// ---------------------------------------------------------------------------
// Hunt-spawn lineage: look up the recorded parent checkpoint for a save
// that was produced by a hunt (instance backups in hunts/<hunt_dir>/open_*/).
// ---------------------------------------------------------------------------

/**
 * Return the hunt row (id + parent_checkpoint_id) whose hunt_dir is a path
 * component of `filePath`, meaning this save was produced by that hunt.
 *
 * `hunt_dir` is stored as a bare name (e.g. "Crystal-Charmander-2026-04-13"),
 * while `filePath` is an absolute path. We check whether the string
 * `/hunts/<hunt_dir>/` appears inside `filePath` using SQLite's `instr`.
 *
 * Catch saves (saves/catches/<game>/<target>/) are NOT matched here because
 * their path contains no hunt_dir component. Those fall through to
 * findBestParent inference, which already has a strong fingerprint signal
 * from party + box pokemon. This is an intentional gap — documented here so
 * a future task can add a catches-path matcher if needed.
 */
function findHuntForSavePath(filePath: string): { id: number; parent_checkpoint_id: number | null } | null {
  const row = db.prepare(`
    SELECT id, parent_checkpoint_id FROM hunts
    WHERE hunt_dir IS NOT NULL
      AND instr(?, '/hunts/' || hunt_dir || '/') > 0
    LIMIT 1
  `).get(filePath) as { id: number; parent_checkpoint_id: number | null } | undefined;
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Smart save placement — same algorithm as timeline /scan
// ---------------------------------------------------------------------------

function smartPlaceSaves(saves: Array<{ id: number; file_path: string; game: string; label: string | null; file_mtime: string | null }>) {
  // Phase 1: parse snapshots
  interface ParsedSave { row: typeof saves[0]; snapshot: SaveSnapshot; label: string }
  const parsed: ParsedSave[] = [];
  for (const row of saves) {
    try {
      const snapshot = buildSnapshot(row.file_path, row.game);
      // Prefer the label saveDiscovery already computed (it knows how to
      // distinguish "library/Crystal/foo.sav" → "foo" from "library/Crystal/
      // Lugia/sav.dat" → "Lugia"). Fall back only if it's missing or matches
      // the bare game folder name.
      const sfLabel = row.label?.trim() ?? '';
      const looksLikeGameFolder = sfLabel.toLowerCase() === row.game.toLowerCase();
      const label = sfLabel && !looksLikeGameFolder
        ? sfLabel
        : `${snapshot.badge_count} Badges — ${snapshot.location}`;
      parsed.push({ row, snapshot, label });
    } catch {
      // Can't parse — skip
    }
  }

  // Phase 2: sort by badge count ascending, then play time ascending, then mtime ascending
  parsed.sort((a, b) => {
    if (a.snapshot.badge_count !== b.snapshot.badge_count)
      return a.snapshot.badge_count - b.snapshot.badge_count;
    const apt = a.snapshot.play_time_seconds ?? 0;
    const bpt = b.snapshot.play_time_seconds ?? 0;
    if (apt !== bpt) return apt - bpt;
    const am = a.row.file_mtime ? Date.parse(a.row.file_mtime) : 0;
    const bm = b.row.file_mtime ? Date.parse(b.row.file_mtime) : 0;
    return am - bm;
  });

  // Phase 3: place each save, finding best parent via snapshot similarity
  const findPlaythrough = db.prepare(
    'SELECT * FROM playthroughs WHERE game = ? AND ot_name = ? AND ot_tid = ?',
  );
  const createPlaythrough = db.prepare(
    'INSERT INTO playthroughs (game, ot_name, ot_tid, goal, label) VALUES (?, ?, ?, ?, ?)',
  );
  const createCheckpoint = db.prepare(
    `INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch, needs_confirmation, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
  );
  const updateActive = db.prepare(
    "UPDATE playthroughs SET active_checkpoint_id = ?, updated_at = datetime('now') WHERE id = ?",
  );

  const placedByPt = new Map<string, PlacedCheckpoint[]>();

  // Load existing checkpoints so new saves can parent to them
  const existing = db.prepare(`
    SELECT c.id, c.snapshot, c.parent_checkpoint_id, p.game, p.ot_name, p.ot_tid, sf.file_mtime
    FROM checkpoints c
    JOIN playthroughs p ON p.id = c.playthrough_id
    JOIN save_files sf ON sf.id = c.save_file_id
    WHERE c.snapshot IS NOT NULL
  `).all() as Array<{ id: number; snapshot: string; parent_checkpoint_id: number | null; game: string; ot_name: string; ot_tid: number; file_mtime: string | null }>;
  for (const ec of existing) {
    const key = `${ec.game}|${ec.ot_name}|${ec.ot_tid}`;
    if (!placedByPt.has(key)) placedByPt.set(key, []);
    try { placedByPt.get(key)!.push({ id: ec.id, snapshot: JSON.parse(ec.snapshot), file_mtime: ec.file_mtime, parent_id: ec.parent_checkpoint_id }); } catch {}
  }

  let linked = 0;
  for (const { row, snapshot, label } of parsed) {
    const g = row.game.toLowerCase();

    let playthrough = findPlaythrough.get(g, snapshot.ot_name, snapshot.ot_tid) as any;
    if (!playthrough) {
      const r = createPlaythrough.run(
        g, snapshot.ot_name, snapshot.ot_tid, 'origin_collection',
        `${prettyGameName(g)} — ${snapshot.ot_name}`,
      );
      playthrough = { id: Number(r.lastInsertRowid), active_checkpoint_id: null };
    }

    const ptKey = `${g}|${snapshot.ot_name}|${snapshot.ot_tid}`;
    const placed = placedByPt.get(ptKey) ?? [];
    // Short-circuit: if this save lives under a known hunt's directory, use the
    // hunt's recorded parent checkpoint directly instead of inferring via
    // findBestParent. Falls back to inference if parent_checkpoint_id is null
    // (legacy hunt created before this column existed).
    const huntMatch = findHuntForSavePath(row.file_path);
    const parentId = huntMatch?.parent_checkpoint_id
      ?? findBestParent(snapshot, placed, row.file_mtime);

    const cpResult = createCheckpoint.run(
      playthrough.id, row.id, parentId, label,
      snapshot.location, snapshot.badge_count, JSON.stringify(snapshot),
    );
    const cpId = Number(cpResult.lastInsertRowid);

    if (!placedByPt.has(ptKey)) placedByPt.set(ptKey, []);
    placedByPt.get(ptKey)!.push({ id: cpId, snapshot, file_mtime: row.file_mtime, parent_id: parentId });
    updateActive.run(cpId, playthrough.id);
    linked++;
  }

  if (linked > 0) console.log(`[syncSaves] Smart-placed ${linked}/${saves.length} saves`);
}
