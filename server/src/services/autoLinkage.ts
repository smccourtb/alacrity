import { readFileSync } from 'fs';
import db from '../db.js';
import { parseGen1Save } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';
import { extractGen3WorldState } from './gen3WorldState.js';
import { extractGen4WorldState } from './gen4WorldState.js';
import { extractGen5WorldState, } from './gen5WorldState.js';
import { extractGen6WorldState } from './gen6WorldState.js';
import { extractGen7WorldState } from './gen7WorldState.js';
import { getGen4Offsets } from './gen4Constants.js';
import { getGen5Offsets } from './gen5Constants.js';
import type { SaveWorldState } from './worldState.js';
import { buildSnapshot } from './saveSnapshot.js';
import { prettyGameName } from './pkConstants.js';

interface LinkageResult {
  playthrough_id: number | null;
  checkpoint_id: number | null;
  is_new_playthrough: boolean;
  is_new_checkpoint: boolean;
  needs_confirmation: boolean;
  label: string | null;
}

function resolveGeneration(game: string): number {
  const g = game.toLowerCase();
  if (['red', 'blue', 'yellow'].includes(g)) return 1;
  if (['gold', 'silver', 'crystal'].includes(g)) return 2;
  if (['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'].includes(g)) return 3;
  if (['diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver'].includes(g)) return 4;
  if (['black', 'white', 'black 2', 'white 2'].includes(g)) return 5;
  if (['x', 'y', 'omega ruby', 'alpha sapphire'].includes(g)) return 6;
  if (['sun', 'moon', 'ultra sun', 'ultra moon'].includes(g)) return 7;
  return 0;
}

/**
 * Extract world state (OT, TID, badges, location, play time) WITHOUT decoding
 * individual Pokemon. This avoids the ability_names/move_names DB dependency
 * that full parsers need.
 */
export function parseWorldStateLight(filePath: string, game: string): SaveWorldState {
  return parseWorldState(filePath, game);
}

function parseWorldState(filePath: string, game: string): SaveWorldState {
  const gen = resolveGeneration(game);
  if (gen === 0) throw new Error(`Unknown game: ${game}`);

  // Gen 1-2: use full parsers (they don't need ability_names)
  if (gen === 1) return parseGen1Save(filePath, game).worldState;
  if (gen === 2) return parseGen2Save(filePath, game).worldState;

  const buf = readFileSync(filePath);

  // Gen 3: extract world state from sections 0 and 1
  if (gen === 3) {
    const SECTION_SIZE = 0x1000;
    const FOOTER_SECTION_ID = 0x0FF4;
    const FOOTER_MAGIC = 0x0FF8;
    const FOOTER_SAVE_INDEX = 0x0FFC;
    const MAGIC = 0x08012025;

    // Parse both slots, pick active
    function parseSlot(base: number) {
      const sections = new Map<number, Buffer>();
      let saveIndex = 0;
      for (let i = 0; i < 14; i++) {
        const start = base + i * SECTION_SIZE;
        if (start + SECTION_SIZE > buf.length) break;
        if (buf.readUInt32LE(start + FOOTER_MAGIC) !== MAGIC) continue;
        const id = buf.readUInt16LE(start + FOOTER_SECTION_ID);
        const idx = buf.readUInt32LE(start + FOOTER_SAVE_INDEX);
        if (idx > saveIndex) saveIndex = idx;
        sections.set(id, Buffer.from(buf.subarray(start, start + FOOTER_SECTION_ID)));
      }
      return { sections, saveIndex };
    }
    const slotA = parseSlot(0x00000);
    const slotB = parseSlot(0x0E000);
    const active = slotA.saveIndex >= slotB.saveIndex ? slotA : slotB;
    const section0 = active.sections.get(0) ?? Buffer.alloc(0x200);
    const section1 = active.sections.get(1) ?? null;
    return extractGen3WorldState(section0, section1, game);
  }

  // Gen 4: extract general block from active partition
  if (gen === 4) {
    const offsets = getGen4Offsets(game);
    const footerOff = offsets.generalSize - offsets.footerSize;
    let c0 = buf.readUInt32LE(footerOff + 4);
    let c1 = buf.readUInt32LE(0x40000 + footerOff + 4);
    if (c0 === 0xFFFFFFFF) c0 = 0;
    if (c1 === 0xFFFFFFFF) c1 = 0;
    const base = c0 >= c1 ? 0 : 0x40000;
    const generalBuf = Buffer.from(buf.subarray(base, base + offsets.generalSize));
    return extractGen4WorldState(generalBuf, offsets, game);
  }

  // Gen 5: extract from fixed offsets
  if (gen === 5) {
    const lc = game.toLowerCase();
    const isB2W2 = lc.includes('black 2') || lc.includes('white 2') || lc.includes('b2') || lc.includes('w2');
    const offsets = getGen5Offsets(game);
    return extractGen5WorldState(buf as Buffer, offsets, isB2W2);
  }

  // Gen 6-7: extract directly from buffer
  if (gen === 6) return extractGen6WorldState(buf as Buffer, game);
  if (gen === 7) return extractGen7WorldState(buf as Buffer, game);

  throw new Error(`No parser for Gen ${gen}`);
}

function generateLabel(worldState: SaveWorldState, prevState: SaveWorldState | null): string {
  if (!prevState) {
    if (worldState.badgeCount > 0) {
      return `${worldState.badgeCount} Badge${worldState.badgeCount > 1 ? 's' : ''} — ${formatLocationKey(worldState.currentLocationKey)}`;
    }
    return `Start — ${formatLocationKey(worldState.currentLocationKey)}`;
  }

  // Badge change is the most significant
  if (worldState.badgeCount > prevState.badgeCount) {
    return `${worldState.badgeCount} Badge${worldState.badgeCount > 1 ? 's' : ''} — ${formatLocationKey(worldState.currentLocationKey)}`;
  }

  // Location change
  if (worldState.currentLocationKey !== prevState.currentLocationKey && worldState.currentLocationKey !== 'unknown') {
    return `Reached ${formatLocationKey(worldState.currentLocationKey)}`;
  }

  return `Checkpoint at ${formatLocationKey(worldState.currentLocationKey)}`;
}

function formatLocationKey(key: string): string {
  if (key === 'unknown') return 'Unknown Location';
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function isSignificantChange(worldState: SaveWorldState, prevState: SaveWorldState | null): boolean {
  if (!prevState) return true;

  // Badge count increased
  if (worldState.badgeCount > prevState.badgeCount) return true;

  // Location changed to a known location with higher progression
  if (worldState.currentLocationKey !== prevState.currentLocationKey
      && worldState.currentLocationKey !== 'unknown') {
    // Check if this is a higher progression_order
    const prevOrder = db.prepare(
      'SELECT progression_order FROM map_locations WHERE location_key = ?'
    ).get(prevState.currentLocationKey) as any;
    const newOrder = db.prepare(
      'SELECT progression_order FROM map_locations WHERE location_key = ?'
    ).get(worldState.currentLocationKey) as any;

    if (prevOrder && newOrder && newOrder.progression_order > prevOrder.progression_order) {
      return true;
    }
  }

  // New key items (progress markers)
  const prevKeys = new Set(prevState.keyItems);
  if (worldState.keyItems.some(k => !prevKeys.has(k))) return true;

  // New HMs
  const prevHms = new Set(prevState.hms);
  if (worldState.hms.some(h => !prevHms.has(h))) return true;

  return false;
}

/**
 * Link a save by game name only — used for generations we can't parse.
 * Finds or creates a single playthrough per game, links the save as a checkpoint.
 */
function linkByGameOnly(saveFileId: number, game: string, rawGame: string): LinkageResult {
  // Check if already linked
  const existing = db.prepare('SELECT id FROM checkpoints WHERE save_file_id = ?').get(saveFileId) as any;
  if (existing) {
    return { playthrough_id: null, checkpoint_id: existing.id, is_new_playthrough: false, is_new_checkpoint: false, needs_confirmation: false, label: null };
  }

  // Find or create a playthrough for this game (use first one found, or create with placeholder OT)
  let playthrough = db.prepare('SELECT * FROM playthroughs WHERE game = ?').get(game) as any;
  let isNewPlaythrough = false;

  if (!playthrough) {
    const result = db.prepare(
      'INSERT INTO playthroughs (game, ot_name, ot_tid, goal, label) VALUES (?, ?, ?, ?, ?)'
    ).run(game, 'Unknown', 0, 'origin_collection', prettyGameName(game));
    playthrough = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(result.lastInsertRowid);
    isNewPlaythrough = true;
  }

  // Get save file label for checkpoint name
  const saveFile = db.prepare('SELECT label FROM save_files WHERE id = ?').get(saveFileId) as any;
  const label = saveFile?.label || 'Save';

  const checkpointResult = db.prepare(
    `INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch, needs_confirmation, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL)`
  ).run(playthrough.id, saveFileId, playthrough.active_checkpoint_id ?? null, label, 'unknown', 0);

  // Set as active if this is the first checkpoint
  if (!playthrough.active_checkpoint_id) {
    db.prepare("UPDATE playthroughs SET active_checkpoint_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(checkpointResult.lastInsertRowid, playthrough.id);
  }

  return {
    playthrough_id: playthrough.id,
    checkpoint_id: Number(checkpointResult.lastInsertRowid),
    is_new_playthrough: isNewPlaythrough,
    is_new_checkpoint: true,
    needs_confirmation: false,
    label,
  };
}

export function autoLinkSave(saveFileId: number, filePath: string, rawGame: string): LinkageResult {
  // Normalize game name to lowercase to match guide conventions
  const game = rawGame.toLowerCase();
  let worldState: SaveWorldState | null = null;
  try {
    worldState = parseWorldState(filePath, game);
  } catch (err) {
    console.warn(`Auto-linkage: could not parse ${rawGame} save ${filePath}:`, (err as Error).message);
  }

  // For unparseable saves, link by game name only (no OT/TID matching)
  if (!worldState) {
    return linkByGameOnly(saveFileId, game, rawGame);
  }

  // Step 2: Match to playthrough by OT + TID + game
  let playthrough = db.prepare(
    'SELECT * FROM playthroughs WHERE game = ? AND ot_name = ? AND ot_tid = ?'
  ).get(game, worldState.playerName, worldState.trainerId) as any;

  let isNewPlaythrough = false;
  if (!playthrough) {
    // Auto-create playthrough
    const result = db.prepare(
      'INSERT INTO playthroughs (game, ot_name, ot_tid, goal, label) VALUES (?, ?, ?, ?, ?)'
    ).run(game, worldState.playerName, worldState.trainerId, 'origin_collection', `${prettyGameName(game)} — ${worldState.playerName}`);

    playthrough = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(result.lastInsertRowid);
    isNewPlaythrough = true;

    // Pre-fill goals from origin_requirements
    const requirements = db.prepare(
      "SELECT * FROM origin_requirements WHERE source_games LIKE ?"
    ).all(`%"${game}"%`) as any[];

    const insertGoal = db.prepare(
      'INSERT INTO playthrough_goals (playthrough_id, requirement_id, species_id) VALUES (?, ?, ?)'
    );
    for (const req of requirements) {
      insertGoal.run(playthrough.id, req.id, req.species_id);
    }
  }

  // Step 3: Check significance against current active checkpoint
  let prevState: SaveWorldState | null = null;
  if (playthrough.active_checkpoint_id) {
    const prevCheckpoint = db.prepare(
      'SELECT sf.file_path, sf.game FROM checkpoints c JOIN save_files sf ON sf.id = c.save_file_id WHERE c.id = ?'
    ).get(playthrough.active_checkpoint_id) as any;

    if (prevCheckpoint) {
      try {
        prevState = parseWorldState(prevCheckpoint.file_path, prevCheckpoint.game ?? game);
      } catch {
        // Previous save may be unavailable — treat as new
      }
    }
  }

  const significant = isSignificantChange(worldState, prevState);
  if (!significant && !isNewPlaythrough) {
    return {
      playthrough_id: playthrough.id,
      checkpoint_id: playthrough.active_checkpoint_id,
      is_new_playthrough: false,
      is_new_checkpoint: false,
      needs_confirmation: false,
      label: null,
    };
  }

  // Step 4: Build snapshot and create checkpoint
  const label = generateLabel(worldState, prevState);

  let snapshotJson: string | null = null;
  try {
    const snapshot = buildSnapshot(filePath, game);
    snapshotJson = JSON.stringify(snapshot);
  } catch (err) {
    console.warn(`Auto-linkage: snapshot build failed for save ${saveFileId}:`, err);
  }

  const checkpointResult = db.prepare(
    `INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch, needs_confirmation, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)`
  ).run(
    playthrough.id,
    saveFileId,
    playthrough.active_checkpoint_id ?? null,
    label,
    worldState.currentLocationKey,
    worldState.badgeCount,
    snapshotJson,
  );

  // Update active checkpoint
  const cpId = Number(checkpointResult.lastInsertRowid);
  db.prepare("UPDATE playthroughs SET active_checkpoint_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(cpId, playthrough.id);
  db.prepare('UPDATE checkpoints SET include_in_collection = 1 WHERE id = ?').run(cpId);

  // Step 5: Validate goals
  validateGoals(playthrough.id, worldState, game);

  return {
    playthrough_id: playthrough.id,
    checkpoint_id: Number(checkpointResult.lastInsertRowid),
    is_new_playthrough: isNewPlaythrough,
    is_new_checkpoint: true,
    needs_confirmation: true,
    label,
  };
}

function validateSpecimenProgress(game: string, caughtSpeciesIds: Set<number>): void {
  const pendingTasks = db.prepare(`
    SELECT st.id as task_id, st.target_id, st.task_type, t.species_id
    FROM specimen_tasks st
    JOIN specimen_targets t ON t.id = st.target_id
    WHERE st.game = ? AND st.status = 'pending'
      AND st.task_type IN ('catch', 'breed')
      AND t.species_id IS NOT NULL
  `).all(game) as any[];

  const updateTask = db.prepare("UPDATE specimen_tasks SET status = 'completed' WHERE id = ?");
  const checkAllDone = db.prepare(`
    SELECT COUNT(*) as remaining FROM specimen_tasks
    WHERE target_id = ? AND required = 1 AND status != 'completed'
  `);
  const updateProgress = db.prepare(
    "UPDATE specimen_progress SET status = 'obtained' WHERE target_id = ? AND status = 'pending'"
  );

  for (const task of pendingTasks) {
    if (caughtSpeciesIds.has(task.species_id)) {
      updateTask.run(task.task_id);
      const remaining = checkAllDone.get(task.target_id) as any;
      if (remaining.remaining === 0) {
        updateProgress.run(task.target_id);
      }
    }
  }
}

function validateGoals(playthroughId: number, worldState: SaveWorldState, game: string) {
  const goals = db.prepare(
    `SELECT pg.*, orq.requirement_type, orq.move_name, orq.item_name
     FROM playthrough_goals pg
     LEFT JOIN origin_requirements orq ON orq.id = pg.requirement_id
     WHERE pg.playthrough_id = ? AND pg.status = 'pending'`
  ).all(playthroughId) as any[];

  // Get all pokemon species from the active checkpoint's save file
  const playthrough = db.prepare('SELECT * FROM playthroughs WHERE id = ?').get(playthroughId) as any;
  if (!playthrough?.active_checkpoint_id) return;

  const checkpoint = db.prepare(
    'SELECT sf.file_path, sf.game FROM checkpoints c JOIN save_files sf ON sf.id = c.save_file_id WHERE c.id = ?'
  ).get(playthrough.active_checkpoint_id) as any;

  if (!checkpoint) return;

  const pokemonSpecies = new Set<number>();
  try {
    const isGen1 = ['red', 'blue', 'yellow'].includes((checkpoint.game ?? '').toLowerCase());
    const result = isGen1
      ? parseGen1Save(checkpoint.file_path, checkpoint.game)
      : parseGen2Save(checkpoint.file_path, checkpoint.game);

    for (const p of result.pokemon) {
      pokemonSpecies.add(p.species_id);
    }
  } catch { return; }

  const keyItemSet = new Set(worldState.keyItems);

  const updateGoal = db.prepare(
    "UPDATE playthrough_goals SET status = 'completed', completed_from_save = 1 WHERE id = ?"
  );

  for (const goal of goals) {
    let completed = false;

    switch (goal.requirement_type) {
      case 'catch':
      case 'event':
        completed = goal.species_id ? pokemonSpecies.has(goal.species_id) : false;
        break;
      case 'tm_move':
        // Species ownership is primary — TM gets consumed when taught
        completed = goal.species_id ? pokemonSpecies.has(goal.species_id) : false;
        break;
      case 'item':
        completed = goal.item_name ? keyItemSet.has(goal.item_name) : false;
        break;
      case 'trade_evo':
        completed = goal.species_id ? pokemonSpecies.has(goal.species_id) : false;
        break;
    }

    if (completed) {
      updateGoal.run(goal.id);
    }
  }

  // Validate specimen progress tasks from the caught species set
  validateSpecimenProgress(game, pokemonSpecies);
}
