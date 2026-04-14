// timeline.ts — checkpoint tree and orphan save endpoints

import { Router, Request, Response } from 'express';
import { existsSync } from 'fs';
import db from '../db.js';
import {
  buildSnapshot,
  diffSnapshots,
  type SaveSnapshot,
  type CheckpointType,
  type CheckpointDiff,
} from '../services/saveSnapshot.js';
import { prettyGameName } from '../services/pkConstants.js';
import { scanCheckpoint, clearSightingsForCheckpoint } from '../services/identityService.js';
import { findBestParent, type PlacedCheckpoint } from '../services/checkpointPlacement.js';

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckpointRow {
  id: number;
  playthrough_id: number;
  save_file_id: number;
  parent_checkpoint_id: number | null;
  label: string;
  location_key: string | null;
  badge_count: number | null;
  is_branch: number;
  needs_confirmation: number;
  include_in_collection: number;
  archived: number;
  snapshot: string | null;
  created_at: string;
  file_path: string;
  game: string;
  file_mtime: string | null;
  file_save_timestamp: string | null;
}

interface PlaythroughRow {
  id: number;
  game: string;
  ot_name: string;
  ot_tid: number;
  goal: string | null;
  label: string | null;
  active_checkpoint_id: number | null;
  created_at: string;
  updated_at: string;
}

interface CheckpointNode {
  id: number;
  label: string;
  notes: string | null;
  created_at: string;
  parent_id: number | null;
  is_active: boolean;
  include_in_collection: boolean;
  archived: boolean;
  snapshot: SaveSnapshot | null;
  type: CheckpointType;
  diff: CheckpointDiff | null;
  save_file_id: number;
  file_path: string;
  file_exists: boolean;
  file_mtime: string | null;
  file_save_timestamp: string | null;
  children: CheckpointNode[];
}

// ── GET /playthroughs/:id/tree ────────────────────────────────────────────────

router.get('/playthroughs/:id/tree', (req: Request, res: Response) => {
  const playthroughId = Number(req.params.id);
  if (isNaN(playthroughId)) {
    res.status(400).json({ error: 'Invalid playthrough id' });
    return;
  }

  const playthrough = db
    .prepare('SELECT * FROM playthroughs WHERE id = ?')
    .get(playthroughId) as PlaythroughRow | undefined;

  if (!playthrough) {
    res.status(404).json({ error: 'Playthrough not found' });
    return;
  }

  const rows = db
    .prepare(
      `SELECT c.*, sf.file_path, sf.game, sf.file_mtime, sf.save_timestamp as file_save_timestamp
       FROM checkpoints c
       JOIN save_files sf ON sf.id = c.save_file_id
       WHERE c.playthrough_id = ?
       ORDER BY c.created_at ASC`,
    )
    .all(playthroughId) as CheckpointRow[];

  // Parse / backfill snapshots
  const updateSnapshot = db.prepare(
    'UPDATE checkpoints SET snapshot = ? WHERE id = ?',
  );

  const snapshotMap = new Map<number, SaveSnapshot | null>();

  for (const row of rows) {
    let snapshot: SaveSnapshot | null = null;

    if (row.snapshot) {
      try {
        snapshot = JSON.parse(row.snapshot) as SaveSnapshot;
      } catch {
        // fall through to backfill
      }
    }

    // Rebuild if missing entirely or if stale (missing box_pokemon field)
    const needsRebuild = !snapshot || !('box_pokemon' in snapshot);
    if (needsRebuild && existsSync(row.file_path)) {
      try {
        snapshot = buildSnapshot(row.file_path, row.game);
        updateSnapshot.run(JSON.stringify(snapshot), row.id);
      } catch {
        // parse failed — keep existing snapshot if we had one
      }
    }

    snapshotMap.set(row.id, snapshot);
  }

  // Build node map
  const nodeMap = new Map<number, CheckpointNode>();

  for (const row of rows) {
    const fileExists = existsSync(row.file_path);
    const snapshot = snapshotMap.get(row.id) ?? null;

    const node: CheckpointNode = {
      id: row.id,
      label: row.label,
      notes: (row as any).notes ?? null,
      created_at: row.created_at,
      parent_id: row.parent_checkpoint_id,
      is_active: row.id === playthrough.active_checkpoint_id,
      include_in_collection: row.include_in_collection === 1,
      archived: row.archived === 1,
      snapshot,
      type: 'snapshot',
      diff: null,
      save_file_id: row.save_file_id,
      file_path: row.file_path,
      file_exists: fileExists,
      file_mtime: row.file_mtime ?? null,
      file_save_timestamp: row.file_save_timestamp ?? null,
      children: [],
    };

    nodeMap.set(row.id, node);
  }

  // Compute type / diff via diffSnapshots against parent
  for (const node of nodeMap.values()) {
    const parentSnapshot =
      node.parent_id != null
        ? (snapshotMap.get(node.parent_id) ?? null)
        : null;

    if (node.snapshot) {
      const { type, diff } = diffSnapshots(node.snapshot, parentSnapshot);
      node.type = type;
      node.diff = diff;
    } else {
      // No snapshot — infer root or snapshot based on parent presence
      node.type = node.parent_id == null ? 'root' : 'snapshot';
      node.diff = null;
    }
  }

  // Assemble tree — nodes whose parent is missing or null go to roots
  const roots: CheckpointNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parent_id == null || !nodeMap.has(node.parent_id)) {
      roots.push(node);
    } else {
      nodeMap.get(node.parent_id)!.children.push(node);
    }
  }

  // Sort children by progression: play time is the most reliable indicator
  // since file_mtime can be identical after bulk sync/copy operations.
  function sortByProgression(a: CheckpointNode, b: CheckpointNode): number {
    // Primary: in-game play time (seconds) — reflects actual progression
    const aPt = Number(a.file_save_timestamp) || 0;
    const bPt = Number(b.file_save_timestamp) || 0;
    if (aPt !== bPt) return aPt - bPt;
    // Fallback: file modification time or creation date
    const aTime = a.file_mtime || a.created_at || '';
    const bTime = b.file_mtime || b.created_at || '';
    return aTime.localeCompare(bTime);
  }

  function sortChildrenChronologically(node: CheckpointNode) {
    if (node.children && node.children.length > 1) {
      node.children.sort(sortByProgression);
    }
    if (node.children) node.children.forEach(sortChildrenChronologically);
  }

  roots.sort(sortByProgression);
  roots.forEach(sortChildrenChronologically);

  res.json({
    playthrough,
    roots,
    total_checkpoints: rows.length,
  });
});

// ── GET /orphans ──────────────────────────────────────────────────────────────

router.get('/orphans', (req: Request, res: Response) => {
  const { game, limit: limitStr } = req.query as { game?: string; limit?: string };
  const limit = Math.min(Number(limitStr) || 50, 200);

  let query = `
    SELECT sf.*
    FROM save_files sf
    LEFT JOIN checkpoints c ON c.save_file_id = sf.id
    WHERE c.id IS NULL
  `;
  const params: (string | number)[] = [];

  if (game) {
    query += ' AND LOWER(sf.game) = ?';
    params.push(game.toLowerCase());
  }

  // Only show library and catches saves (not hunt instances, checkpoint backups, etc.)
  query += " AND (sf.file_path LIKE '%/library/%' OR sf.file_path LIKE '%/catches/%')";

  query += ' ORDER BY sf.discovered_at DESC LIMIT ?';
  params.push(limit);

  interface SaveFileRow {
    id: number;
    filename: string;
    file_path: string;
    game: string;
    file_size: number;
    checksum: string;
    discovered_at: string;
    notes: string | null;
  }

  const rows = db.prepare(query).all(...params) as SaveFileRow[];

  // Count total orphans for pagination info
  let countQuery = `
    SELECT COUNT(*) as total FROM save_files sf
    LEFT JOIN checkpoints c ON c.save_file_id = sf.id
    WHERE c.id IS NULL AND (sf.file_path LIKE '%/library/%' OR sf.file_path LIKE '%/catches/%')
  `;
  const countParams: (string | number)[] = [];
  if (game) {
    countQuery += ' AND LOWER(sf.game) = ?';
    countParams.push(game.toLowerCase());
  }
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  // Only parse snapshots for a small batch (avoid parsing hundreds of files)
  const enriched = rows.map(row => {
    const fileExists = existsSync(row.file_path);
    let snapshot: SaveSnapshot | null = null;

    if (fileExists && row.game) {
      try {
        snapshot = buildSnapshot(row.file_path, row.game);
      } catch {
        // parse failed — leave null
      }
    }

    return {
      ...row,
      file_exists: fileExists,
      snapshot,
    };
  });

  res.json({ saves: enriched, total });
});

// ── POST /scan — bulk auto-link existing saves ──────────────────────────────

router.post('/scan', async (req: Request, res: Response) => {
  const { game, save_file_id } = req.body as { game?: string; save_file_id?: number };

  // All games with save parsers
  const SUPPORTED_GAMES = new Set([
    'red', 'blue', 'yellow', 'gold', 'silver', 'crystal',
    'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen',
    'diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver',
    'black', 'white', 'black 2', 'white 2',
    'x', 'y', 'omega ruby', 'alpha sapphire',
    'sun', 'moon', 'ultra sun', 'ultra moon',
  ]);

  let query = `
    SELECT sf.* FROM save_files sf
    LEFT JOIN checkpoints c ON c.save_file_id = sf.id
    WHERE c.id IS NULL
      AND sf.game IS NOT NULL
      AND (sf.file_path LIKE '%/library/%' OR sf.file_path LIKE '%/catches/%')
  `;
  const params: (string | number)[] = [];

  if (save_file_id) {
    // Link a single specific save
    query = `
      SELECT sf.* FROM save_files sf
      LEFT JOIN checkpoints c ON c.save_file_id = sf.id
      WHERE c.id IS NULL AND sf.id = ?
    `;
    params.push(save_file_id);
  } else if (game) {
    query += ' AND LOWER(sf.game) = ?';
    params.push(game.toLowerCase());
  }

  if (!save_file_id) query += ' ORDER BY sf.discovered_at ASC LIMIT 200';

  const rows = db.prepare(query).all(...params) as any[];

  // ── Phase 1: parse all snapshots ──────────────────────────────────────────

  interface ParsedSave {
    row: any;
    snapshot: SaveSnapshot;
    label: string;
  }

  const parsed: ParsedSave[] = [];
  let skipped = 0;
  const results: { id: number; name: string; result: string }[] = [];

  for (const row of rows) {
    const g = (row.game ?? '').toLowerCase();
    if (!SUPPORTED_GAMES.has(g)) {
      skipped++;
      results.push({ id: row.id, name: row.filename, result: 'unsupported_gen' });
      continue;
    }
    if (!existsSync(row.file_path)) {
      skipped++;
      results.push({ id: row.id, name: row.filename, result: 'file_missing' });
      continue;
    }
    try {
      const snapshot = buildSnapshot(row.file_path, g);
      const filename = row.filename.replace(/\.(sav|dat|main)$/i, '');
      const label = filename || `${snapshot.badge_count} Badges — ${snapshot.location}`;
      parsed.push({ row, snapshot, label });
    } catch (err: any) {
      skipped++;
      results.push({ id: row.id, name: row.filename, result: `error: ${err.message}` });
    }
  }

  // ── Phase 2: sort by progression (badge count asc, then playtime, then mtime)
  //
  // NOTE: a prior version of this sort put non-daycare saves before daycare
  // ones at the same badge level, on the theory that daycare presence
  // indicated a hunt/breeding branch that should be processed after the
  // mainline. The Crystal acceptance test for save-placement-v2 caught this:
  // Crystal's true root (Charmander_hunt3, playtime 42720) has a daycare,
  // and the no-daycare Ditto_hunt15 (playtime 64320) was processed first,
  // became a root, and then the playtime hard guard in findBestParent
  // prevented anything from re-parenting to it. Now that Task 4 gives us
  // hunts.parent_checkpoint_id as a hard lineage signal for real hunt-derived
  // saves, the daycare-presence heuristic is both unnecessary and wrong for
  // breeding-heavy playthroughs.

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

  // ── Phase 3: place each save, finding best parent via snapshot similarity ─

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

  // Track placed checkpoints per playthrough key for parent matching
  const placedByPlaythrough = new Map<string, PlacedCheckpoint[]>();

  // Also load existing checkpoints so new saves can parent to them
  const existingCheckpoints = db.prepare(
    `SELECT c.id, c.snapshot, c.parent_checkpoint_id, p.game, p.ot_name, p.ot_tid, sf.file_mtime
     FROM checkpoints c
     JOIN playthroughs p ON p.id = c.playthrough_id
     JOIN save_files sf ON sf.id = c.save_file_id
     WHERE c.snapshot IS NOT NULL`,
  ).all() as Array<{ id: number; snapshot: string; parent_checkpoint_id: number | null; game: string; ot_name: string; ot_tid: number; file_mtime: string | null }>;

  for (const ec of existingCheckpoints) {
    const key = `${ec.game}|${ec.ot_name}|${ec.ot_tid}`;
    if (!placedByPlaythrough.has(key)) placedByPlaythrough.set(key, []);
    try {
      placedByPlaythrough.get(key)!.push({ id: ec.id, snapshot: JSON.parse(ec.snapshot), file_mtime: ec.file_mtime, parent_id: ec.parent_checkpoint_id });
    } catch { /* skip malformed */ }
  }

  let linked = 0;

  for (const { row, snapshot, label } of parsed) {
    const g = (row.game ?? '').toLowerCase();
    const snapshotJson = JSON.stringify(snapshot);

    // Find or create playthrough
    let playthrough = findPlaythrough.get(g, snapshot.ot_name, snapshot.ot_tid) as any;
    if (!playthrough) {
      const ptResult = createPlaythrough.run(
        g, snapshot.ot_name, snapshot.ot_tid, 'origin_collection',
        `${prettyGameName(g)} — ${snapshot.ot_name}`,
      );
      playthrough = { id: Number(ptResult.lastInsertRowid), active_checkpoint_id: null };
    }

    const ptKey = `${g}|${snapshot.ot_name}|${snapshot.ot_tid}`;
    const placed = placedByPlaythrough.get(ptKey) ?? [];

    // Find best parent by snapshot similarity
    const parentId = findBestParent(snapshot, placed, row.file_mtime);

    const cpResult = createCheckpoint.run(
      playthrough.id,
      row.id,
      parentId,
      label,
      snapshot.location,
      snapshot.badge_count,
      snapshotJson,
    );

    const newCpId = Number(cpResult.lastInsertRowid);

    // Track this checkpoint for future parent matching
    if (!placedByPlaythrough.has(ptKey)) placedByPlaythrough.set(ptKey, []);
    placedByPlaythrough.get(ptKey)!.push({ id: newCpId, snapshot, file_mtime: row.file_mtime ?? null, parent_id: parentId });

    // Update active checkpoint to the latest one placed
    updateActive.run(newCpId, playthrough.id);

    linked++;
    results.push({ id: row.id, name: row.filename, result: 'linked' });
  }

  res.json({ scanned: rows.length, linked, skipped, results });
});

// ── PATCH /checkpoints/:id/collection ────────────────────────────────────────

router.patch('/checkpoints/:id/collection', (req: Request, res: Response) => {
  const { include } = req.body;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid checkpoint id' });
  }

  // Any user toggle is an explicit intent, regardless of direction.
  db.prepare('UPDATE checkpoints SET include_in_collection = ?, include_explicit = 1 WHERE id = ?')
    .run(include ? 1 : 0, id);

  try {
    if (include) {
      const result = scanCheckpoint(id);
      return res.json({
        success: true,
        action: 'scanned' as const,
        counts: { identities: result.identities, sightings: result.sightings },
      });
    } else {
      const result = clearSightingsForCheckpoint(id);
      return res.json({
        success: true,
        action: 'cleared' as const,
        counts: { deletedSightings: result.deletedSightings, gcIdentities: result.gcIdentities },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /checkpoints/:id/archive ───────────────────────────────────────────

router.patch('/checkpoints/:id/archive', (req: Request, res: Response) => {
  const { archived } = req.body;
  db.prepare('UPDATE checkpoints SET archived = ? WHERE id = ?')
    .run(archived ? 1 : 0, Number(req.params.id));
  res.json({ success: true });
});

// ── PATCH /playthroughs/:id/collection ───────────────────────────────────────

router.patch('/playthroughs/:id/collection', (req: Request, res: Response) => {
  const { include } = req.body;
  db.prepare('UPDATE playthroughs SET include_in_collection = ? WHERE id = ?')
    .run(include ? 1 : 0, Number(req.params.id));
  res.json({ success: true });
});

export default router;
