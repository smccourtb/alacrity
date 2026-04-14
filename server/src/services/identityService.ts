// identityService.ts — fingerprint computation, identity matching, sighting recording,
// checkpoint scanning, and collection resolution.

import db from '../db.js';
import type { SaveSnapshot, SnapshotPartyMember, SnapshotBoxMember } from './saveSnapshot.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FingerprintInput {
  // Gen 6+ (EC-based)
  ec?: number;
  // Gen 3-5 (PID-based)
  pid?: number;
  // Gen 1-2 (DV-based)
  dv_atk?: number;
  dv_def?: number;
  dv_spd?: number;
  dv_spc?: number;
  exp?: number;
  stat_exp_hp?: number;
  stat_exp_atk?: number;
  stat_exp_def?: number;
  stat_exp_spd?: number;
  stat_exp_spc?: number;
  // Common
  ot_tid?: number;
  // Fallback (weak fingerprint)
  species_id?: number;
  level?: number;
  // IVs from snapshot (Gen 1/2 fallback)
  ivs?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
}

export interface IdentityRecord {
  id: number;
  fingerprint: string;
  gen: number;
  first_seen_checkpoint_id: number | null;
  confirmed: number;
  created_at: string;
}

export interface SightingInput {
  identity_id: number;
  checkpoint_id?: number | null;
  bank_file_id?: number | null;
  species_id: number;
  box_slot?: string | null;
  level?: number | null;
  snapshot_data?: string | null;
}

export interface CollectionEntry {
  identity_id: number;
  fingerprint: string;
  gen: number;
  species_id: number;
  level: number | null;
  box_slot: string | null;
  snapshot_data: string | null;
  checkpoint_id: number | null;
  bank_file_id: number | null;
  sighting_created_at: string;
  is_home: boolean;
  game: string | null;
  playthrough_id: number | null;
  ot_name: string | null;
  ot_tid: number | null;
}

export interface ScanResult {
  identities: number;
  sightings: number;
}

// ── Generation resolution ─────────────────────────────────────────────────────

export function resolveGen(game: string): number {
  const g = game.toLowerCase().replace(/[ _-]+/g, '');
  if (['red', 'blue', 'yellow'].includes(g)) return 1;
  if (['gold', 'silver', 'crystal'].includes(g)) return 2;
  if (['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'].includes(g)) return 3;
  if (['diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver'].includes(g)) return 4;
  if (['black', 'white', 'black2', 'white2'].includes(g)) return 5;
  if (['x', 'y', 'omegaruby', 'alphasapphire'].includes(g)) return 6;
  if (['sun', 'moon', 'ultrasun', 'ultramoon'].includes(g)) return 7;
  return 0;
}

// ── Fingerprint computation ────────────────────────────────────────────────────

export function computeFingerprint(gen: number, mon: FingerprintInput): string {
  const tid = mon.ot_tid ?? 0;

  // Gen 6+: use Encryption Constant
  if (gen >= 6 && mon.ec != null) {
    const ecHex = mon.ec.toString(16).padStart(8, '0');
    return `g6:${ecHex}:${tid}`;
  }

  // Gen 3-5: use PID
  if (gen >= 3 && gen <= 5 && mon.pid != null) {
    const pidHex = mon.pid.toString(16).padStart(8, '0');
    return `g3:${pidHex}:${tid}`;
  }

  // Gen 1-2: use DVs + exp + stat exp
  if (gen <= 2) {
    // If we have explicit DV fields, use them
    if (mon.dv_atk != null) {
      const dvs = `${mon.dv_atk}:${mon.dv_def}:${mon.dv_spd}:${mon.dv_spc}`;
      const exp = mon.exp ?? 0;
      const statExp = [
        mon.stat_exp_hp ?? 0,
        mon.stat_exp_atk ?? 0,
        mon.stat_exp_def ?? 0,
        mon.stat_exp_spd ?? 0,
        mon.stat_exp_spc ?? 0,
      ].join(':');
      return `g2:${tid}:${dvs}:${exp}:${statExp}`;
    }

    // Fallback: use IVs from snapshot (atk IV = dv_atk for Gen 1/2)
    if (mon.ivs) {
      // In Gen 1/2, DVs are 0-15. The snapshot IVs map directly: atk=atk, def=def, spd=spe, spc=spa (=spd)
      const dvs = `${mon.ivs.atk}:${mon.ivs.def}:${mon.ivs.spe}:${mon.ivs.spa}`;
      const exp = mon.exp ?? 0;
      const statExp = [
        mon.stat_exp_hp ?? 0,
        mon.stat_exp_atk ?? 0,
        mon.stat_exp_def ?? 0,
        mon.stat_exp_spd ?? 0,
        mon.stat_exp_spc ?? 0,
      ].join(':');
      return `g2:${tid}:${dvs}:${exp}:${statExp}`;
    }
  }

  // Weak fallback — works for any gen when detailed data is unavailable
  const speciesId = mon.species_id ?? 0;
  const level = mon.level ?? 0;
  return `weak:${speciesId}:${level}:${tid}`;
}

// ── Prepared statements ────────────────────────────────────────────────────────

const stmtFindIdentity = db.prepare<IdentityRecord, [string]>(
  'SELECT * FROM pokemon_identity WHERE fingerprint = ?'
);

const stmtInsertIdentity = db.prepare(
  `INSERT INTO pokemon_identity (fingerprint, gen, first_seen_checkpoint_id)
   VALUES (?, ?, ?)`
);

const stmtInsertSave = db.prepare(
  `INSERT INTO collection_saves (identity_id, checkpoint_id, species_id, box_slot, level, snapshot_data)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const stmtInsertBank = db.prepare(
  `INSERT INTO collection_bank (identity_id, bank_file_id, species_id, box_slot, level, snapshot_data)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const stmtDeleteSightingsByCheckpoint = db.prepare(
  'DELETE FROM collection_saves WHERE checkpoint_id = ?'
);

// ── findOrCreateIdentity ──────────────────────────────────────────────────────

export function findOrCreateIdentity(
  fingerprint: string,
  gen: number,
  checkpointId?: number | null,
): { id: number; isNew: boolean } {
  const existing = stmtFindIdentity.get(fingerprint);
  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const result = stmtInsertIdentity.run(fingerprint, gen, checkpointId ?? null);
  return { id: result.lastInsertRowid as number, isNew: true };
}

// ── recordSightings ───────────────────────────────────────────────────────────

export const recordSightings = db.transaction((sightings: SightingInput[]): void => {
  for (const s of sightings) {
    if (s.checkpoint_id != null) {
      stmtInsertSave.run(
        s.identity_id,
        s.checkpoint_id,
        s.species_id,
        s.box_slot ?? null,
        s.level ?? null,
        s.snapshot_data ?? null,
      );
    } else if (s.bank_file_id != null) {
      stmtInsertBank.run(
        s.identity_id,
        s.bank_file_id,
        s.species_id,
        s.box_slot ?? null,
        s.level ?? null,
        s.snapshot_data ?? null,
      );
    }
  }
});

// ── scanCheckpoint ────────────────────────────────────────────────────────────

interface CheckpointRow {
  id: number;
  snapshot: string | null;
  game: string;
}

const stmtLoadCheckpoint = db.prepare<CheckpointRow, [number]>(`
  SELECT c.id, c.snapshot, p.game
  FROM checkpoints c
  JOIN playthroughs p ON p.id = c.playthrough_id
  WHERE c.id = ?
`);

export function scanCheckpoint(checkpointId: number): ScanResult {
  const row = stmtLoadCheckpoint.get(checkpointId);
  if (!row) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }
  if (!row.snapshot) {
    return { identities: 0, sightings: 0 };
  }

  let snapshot: SaveSnapshot;
  try {
    snapshot = JSON.parse(row.snapshot) as SaveSnapshot;
  } catch {
    throw new Error(`Invalid snapshot JSON for checkpoint ${checkpointId}`);
  }

  const gen = resolveGen(row.game) || snapshot.generation || 1;
  const otTid = snapshot.ot_tid;

  // Clear existing sightings for idempotency
  stmtDeleteSightingsByCheckpoint.run(checkpointId);

  const sightings: SightingInput[] = [];
  let newIdentities = 0;

  // Helper: build fingerprint input from a snapshot member
  function buildFingerprintInput(
    mon: (SnapshotPartyMember | SnapshotBoxMember) & {
      pid?: number;
      ec?: number;
      exp?: number;
      stat_exp?: { hp?: number; atk?: number; def?: number; spd?: number; spc?: number };
    },
  ): FingerprintInput {
    const input: FingerprintInput = {
      ot_tid: otTid,
      species_id: mon.species_id,
      level: mon.level,
    };

    if (mon.ec != null) {
      input.ec = mon.ec;
    } else if (mon.pid != null) {
      input.pid = mon.pid;
    } else if (mon.ivs) {
      input.ivs = mon.ivs;
      input.exp = mon.exp;
      input.stat_exp_hp = mon.stat_exp?.hp ?? 0;
      input.stat_exp_atk = mon.stat_exp?.atk ?? 0;
      input.stat_exp_def = mon.stat_exp?.def ?? 0;
      input.stat_exp_spd = mon.stat_exp?.spd ?? 0;
      input.stat_exp_spc = mon.stat_exp?.spc ?? 0;
    }

    return input;
  }

  // Process all pokemon (party + box)
  const allMon: Array<{ mon: SnapshotPartyMember | SnapshotBoxMember; boxSlot: string | null }> = [];

  for (const mon of snapshot.party) {
    if (!mon.is_egg) {
      allMon.push({ mon, boxSlot: 'party' });
    }
  }
  for (const mon of snapshot.box_pokemon ?? []) {
    const boxMon = mon as SnapshotBoxMember;
    const boxSlot = `box${boxMon.box}`;
    allMon.push({ mon, boxSlot });
  }

  const processMon = db.transaction(() => {
    for (const { mon, boxSlot } of allMon) {
      const fpInput = buildFingerprintInput(mon as any);
      const fingerprint = computeFingerprint(gen, fpInput);
      const { id: identityId, isNew } = findOrCreateIdentity(fingerprint, gen, checkpointId);
      if (isNew) newIdentities++;

      sightings.push({
        identity_id: identityId,
        checkpoint_id: checkpointId,
        bank_file_id: null,
        species_id: mon.species_id,
        box_slot: boxSlot,
        level: mon.level,
        snapshot_data: JSON.stringify(mon),
      });
    }
  });

  processMon();

  if (sightings.length > 0) {
    recordSightings(sightings);
  }

  return { identities: newIdentities, sightings: sightings.length };
}

// ── clearSightingsForCheckpoint ───────────────────────────────────────────────────────

const stmtGcOrphanedIdentities = db.prepare(`
  DELETE FROM pokemon_identity
  WHERE id NOT IN (SELECT identity_id FROM collection_saves)
    AND id NOT IN (SELECT identity_id FROM collection_bank)
    AND id NOT IN (SELECT identity_id FROM collection_manual WHERE identity_id IS NOT NULL)
`);

/**
 * Delete all collection_saves rows for a checkpoint and garbage-collect any
 * pokemon_identity rows that are now referenced by zero sightings.
 *
 * Safe to call on a checkpoint that has no sightings — it's a no-op.
 */
export const clearSightingsForCheckpoint = db.transaction((checkpointId: number): { deletedSightings: number; gcIdentities: number } => {
  const del = stmtDeleteSightingsByCheckpoint.run(checkpointId);
  const gc = stmtGcOrphanedIdentities.run();
  return {
    deletedSightings: del.changes ?? 0,
    gcIdentities: gc.changes ?? 0,
  };
});

// ── reconcileTipsInclusion ────────────────────────────────────────────────────

const stmtListActiveTips = db.prepare<{ id: number }, []>(`
  SELECT active_checkpoint_id AS id
  FROM playthroughs
  WHERE active_checkpoint_id IS NOT NULL
    AND include_in_collection = 1
`);

const stmtListNonExplicitIncluded = db.prepare<{ id: number }, []>(`
  SELECT id
  FROM checkpoints
  WHERE include_in_collection = 1
    AND include_explicit = 0
`);

const stmtSetIncludeAutoOn = db.prepare(`
  UPDATE checkpoints
  SET include_in_collection = 1
  WHERE id = ?
    AND include_explicit = 0
`);

const stmtSetIncludeAutoOff = db.prepare(`
  UPDATE checkpoints
  SET include_in_collection = 0
  WHERE id = ?
    AND include_explicit = 0
`);

const stmtListCheckpointsNeedingScan = db.prepare<{ id: number }, []>(`
  SELECT c.id
  FROM checkpoints c
  LEFT JOIN collection_saves cs ON cs.checkpoint_id = c.id
  WHERE c.include_in_collection = 1
    AND c.archived = 0
    AND cs.id IS NULL
  GROUP BY c.id
`);

/**
 * Reconcile auto-tip inclusion across the whole DB:
 *   - For every playthrough's active_checkpoint_id, set include_in_collection=1
 *     (no-op if the row already has include_explicit=1).
 *   - For every non-tip checkpoint currently with include_in_collection=1 AND
 *     include_explicit=0, flip it off and clear its sightings + GC identities.
 *   - Scan every tip that now has include_in_collection=1 but no sightings yet.
 *
 * Idempotent — running twice is a no-op after the first run.
 */
export function reconcileTipsInclusion(): {
  tipsFlaggedOn: number;
  staleFlaggedOff: number;
  scanned: number;
  totalIdentities: number;
  totalSightings: number;
} {
  const tipIds = new Set(stmtListActiveTips.all().map(r => r.id));
  const currentAutoIncluded = new Set(stmtListNonExplicitIncluded.all().map(r => r.id));

  let tipsFlaggedOn = 0;
  let staleFlaggedOff = 0;

  // Flip off any non-explicit, non-tip checkpoints that are currently included
  for (const id of currentAutoIncluded) {
    if (!tipIds.has(id)) {
      const result = stmtSetIncludeAutoOff.run(id);
      if ((result.changes ?? 0) > 0) {
        clearSightingsForCheckpoint(id);
        staleFlaggedOff++;
      }
    }
  }

  // Flip on any tip that isn't already flagged (respects explicit: won't change rows where include_explicit=1 and include_in_collection=0)
  for (const id of tipIds) {
    const result = stmtSetIncludeAutoOn.run(id);
    if ((result.changes ?? 0) > 0) {
      tipsFlaggedOn++;
    }
  }

  // Scan every checkpoint that is now flagged (tip or explicit) but has no sightings yet
  const needsScan = stmtListCheckpointsNeedingScan.all();

  let scanned = 0;
  let totalIdentities = 0;
  let totalSightings = 0;
  for (const { id } of needsScan) {
    try {
      const r = scanCheckpoint(id);
      totalIdentities += r.identities;
      totalSightings += r.sightings;
      scanned++;
    } catch (err) {
      console.error(`[reconcileTipsInclusion] scanCheckpoint(${id}) failed:`, err);
    }
  }

  return { tipsFlaggedOn, staleFlaggedOff, scanned, totalIdentities, totalSightings };
}

// ── resolveCollection ─────────────────────────────────────────────────────────

interface ResolveScope {
  playthroughId?: number;
  game?: string;
}

interface SightingRow {
  identity_id: number;
  fingerprint: string;
  gen: number;
  species_id: number;
  level: number | null;
  box_slot: string | null;
  snapshot_data: string | null;
  checkpoint_id: number | null;
  bank_file_id: number | null;
  created_at: string;
  game: string | null;
  playthrough_id: number | null;
}

export function resolveCollection(scope?: ResolveScope): CollectionEntry[] {
  // Build query for opted-in checkpoint sightings
  let checkpointQuery = `
    SELECT
      s.identity_id,
      pi.fingerprint,
      pi.gen,
      s.species_id,
      s.level,
      s.box_slot,
      s.snapshot_data,
      s.checkpoint_id,
      NULL as bank_file_id,
      s.created_at,
      pt.game,
      pt.id as playthrough_id
    FROM collection_saves s
    JOIN pokemon_identity pi ON pi.id = s.identity_id
    JOIN checkpoints c ON c.id = s.checkpoint_id
    JOIN playthroughs pt ON pt.id = c.playthrough_id
    WHERE c.include_in_collection = 1
      AND c.archived = 0
      AND pt.include_in_collection = 1
  `;

  const params: Array<string | number> = [];

  if (scope?.playthroughId != null) {
    checkpointQuery += ' AND pt.id = ?';
    params.push(scope.playthroughId);
  }
  if (scope?.game) {
    checkpointQuery += ' AND pt.game = ?';
    params.push(scope.game);
  }

  // Bank sightings (save_files where format = 'bank' or source = 'pksm' etc.)
  const bankQuery = `
    SELECT
      s.identity_id,
      pi.fingerprint,
      pi.gen,
      s.species_id,
      s.level,
      s.box_slot,
      s.snapshot_data,
      NULL as checkpoint_id,
      s.bank_file_id,
      s.created_at,
      sf.game,
      NULL as playthrough_id
    FROM collection_bank s
    JOIN pokemon_identity pi ON pi.id = s.identity_id
    JOIN save_files sf ON sf.id = s.bank_file_id
    WHERE (sf.format = 'bank' OR sf.source IN ('pksm', 'bank'))
  `;

  // Run queries separately to avoid parameter mismatch (bankQuery has no placeholders)
  const checkpointSightings = db.prepare(checkpointQuery + ' ORDER BY s.created_at DESC').all(...params) as SightingRow[];
  const bankSightings = db.prepare(bankQuery + ' ORDER BY s.created_at DESC').all() as SightingRow[];
  const allSightings = [...checkpointSightings, ...bankSightings].sort(
    (a, b) => (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : 0),
  );

  // Dedup by identity_id — keep most recent sighting per identity
  const seen = new Map<number, SightingRow>();
  for (const sighting of allSightings) {
    if (!seen.has(sighting.identity_id)) {
      seen.set(sighting.identity_id, sighting);
    }
  }

  // Pre-fetch OT data from checkpoint snapshots
  const checkpointIds = [...seen.values()]
    .filter(s => s.checkpoint_id != null)
    .map(s => s.checkpoint_id!);
  const otMap = new Map<number, { ot_name: string; ot_tid: number }>();
  if (checkpointIds.length > 0) {
    const placeholders = checkpointIds.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT id, snapshot FROM checkpoints WHERE id IN (${placeholders})`
    ).all(...checkpointIds) as { id: number; snapshot: string }[];
    for (const row of rows) {
      try {
        const snap = JSON.parse(row.snapshot);
        otMap.set(row.id, { ot_name: snap.ot_name, ot_tid: snap.ot_tid });
      } catch {}
    }
  }

  // Convert to CollectionEntry
  const entries: CollectionEntry[] = [];
  for (const [, sighting] of seen) {
    const ot = sighting.checkpoint_id ? otMap.get(sighting.checkpoint_id) : undefined;
    entries.push({
      identity_id: sighting.identity_id,
      fingerprint: sighting.fingerprint,
      gen: sighting.gen,
      species_id: sighting.species_id,
      level: sighting.level,
      box_slot: sighting.box_slot,
      snapshot_data: sighting.snapshot_data,
      checkpoint_id: sighting.checkpoint_id,
      bank_file_id: sighting.bank_file_id,
      sighting_created_at: sighting.created_at,
      is_home: true, // most recent sighting is "home"
      game: sighting.game,
      playthrough_id: sighting.playthrough_id,
      ot_name: ot?.ot_name ?? null,
      ot_tid: ot?.ot_tid ?? null,
    });
  }

  return entries;
}
