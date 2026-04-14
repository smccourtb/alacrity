// server/src/scripts/relinkCheckpoints.ts
//
// One-shot: rebuild parent_checkpoint_id for every checkpoint in a
// playthrough using the current findBestParent algorithm. Always takes
// a backup of data/pokemon.db before mutating.
//
// Usage:
//   bun src/scripts/relinkCheckpoints.ts                # all playthroughs
//   bun src/scripts/relinkCheckpoints.ts 12             # only playthrough 12
//
// Rationale: the old placement made bushy, badly-parented trees. The new
// algorithm only runs against unlinked saves on each sync, so existing
// checkpoint rows keep their (wrong) parents forever unless we relink.
// This is a deliberate one-shot — not a recurring job — because re-running
// it would clobber any user-curated parent edits (which we don't have a
// concept of yet, but might add).

import db from '../db.js';
import { findBestParent, type PlacedCheckpoint } from '../services/checkpointPlacement.js';
import type { SaveSnapshot } from '../services/saveSnapshot.js';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function backupDb() {
  const src = resolve(process.cwd(), 'data/pokemon.db');
  const dst = `${src}.before-relink-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (!existsSync(src)) {
    console.error(`[relink] No DB at ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dst);
  console.log(`[relink] Backup → ${dst}`);
}

interface CheckpointRow {
  id: number;
  playthrough_id: number;
  snapshot: string | null;
  file_mtime: string | null;
}

function relinkPlaythrough(playthroughId: number) {
  const rows = db.prepare(`
    SELECT c.id, c.playthrough_id, c.snapshot,
           sf.file_mtime
    FROM checkpoints c
    JOIN save_files sf ON sf.id = c.save_file_id
    WHERE c.playthrough_id = ?
  `).all(playthroughId) as CheckpointRow[];

  if (rows.length === 0) {
    console.log(`[relink] Playthrough ${playthroughId}: no checkpoints`);
    return;
  }

  // Parse snapshots; drop any that won't parse (they'll keep their old parent).
  interface Parsed { id: number; snapshot: SaveSnapshot; mtime: string | null }
  const parsed: Parsed[] = [];
  for (const r of rows) {
    if (!r.snapshot) continue;
    try {
      parsed.push({ id: r.id, snapshot: JSON.parse(r.snapshot), mtime: r.file_mtime });
    } catch {
      console.warn(`[relink]   skipping checkpoint ${r.id}: snapshot parse failed`);
    }
  }

  // Sort by progression order, matching routes/timeline.ts /scan:
  //   (badge_count asc, play_time_seconds asc, mtime asc)
  // The earliest in-game playtime within a badge tier is processed first
  // so it becomes the root candidate. Daycare-presence is not in the sort
  // key — hunt lineage is recorded directly via hunts.parent_checkpoint_id
  // (Task 4), so we don't need heuristics for "is this a hunt branch."
  parsed.sort((a, b) => {
    if (a.snapshot.badge_count !== b.snapshot.badge_count)
      return a.snapshot.badge_count - b.snapshot.badge_count;
    const apt = a.snapshot.play_time_seconds ?? 0;
    const bpt = b.snapshot.play_time_seconds ?? 0;
    if (apt !== bpt) return apt - bpt;
    const am = a.mtime ? Date.parse(a.mtime) : 0;
    const bm = b.mtime ? Date.parse(b.mtime) : 0;
    return am - bm;
  });

  const placed: PlacedCheckpoint[] = [];
  const update = db.prepare('UPDATE checkpoints SET parent_checkpoint_id = ? WHERE id = ?');

  const tx = db.transaction(() => {
    for (const p of parsed) {
      const parentId = findBestParent(p.snapshot, placed, p.mtime);
      update.run(parentId, p.id);
      placed.push({ id: p.id, snapshot: p.snapshot, file_mtime: p.mtime });
    }
  });
  tx();

  console.log(`[relink] Playthrough ${playthroughId}: relinked ${parsed.length} checkpoints`);
}

function main() {
  const arg = process.argv[2];
  backupDb();

  if (arg) {
    relinkPlaythrough(Number(arg));
  } else {
    const all = db.prepare('SELECT id FROM playthroughs ORDER BY id').all() as { id: number }[];
    for (const p of all) relinkPlaythrough(p.id);
  }
}

main();
