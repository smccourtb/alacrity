// saveSnapshot.ts — normalize parsed save data into a stable snapshot shape,
// and diff two snapshots to classify checkpoint type.

import { statSync } from 'fs';
import db from '../db.js';
import { parseGen1Save } from './gen1Parser.js';
import type { Gen1Pokemon } from './gen1Parser.js';
import { parseGen2Save } from './gen2Parser.js';
import type { DaycareInfo, Gen2Pokemon } from './gen2Parser.js';
import { parseGen3Save } from './gen3Parser.js';
import { parseGen4Save } from './gen4Parser.js';
import { parseGen5Save } from './gen5Parser.js';
import { parseGen6Save } from './gen6Parser.js';
import { parseGen7Save } from './gen7Parser.js';
import { computeGender } from './saveParser.js';
import type { SaveRtc } from './worldState.js';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SnapshotPartyMember {
  species_id: number;
  species_name: string;
  level: number;
  is_shiny: boolean;
  is_egg: boolean;
  moves?: string[];
  nature?: string;
  ability?: string;
  ball?: string;
  has_pokerus?: boolean;
  ivs?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  evs?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  pid?: number;
  ec?: number;
  exp?: number;
  stat_exp?: { hp: number; atk: number; def: number; spd: number; spc: number };
  friendship?: number;
  pokerus?: number;
  caught_data?: { level: number; location: number; time: number };
  gender?: string;        // 'male' | 'female' | 'genderless'
  nickname?: string;
  origin_game?: string;   // game where this mon was originally caught
  form?: number;          // form index (Gen 6+)
  ot_name?: string;       // original trainer name (per-mon, Gen 3+)
  ot_tid?: number;        // original trainer ID (per-mon, Gen 3+)
  met_level?: number;     // level when caught (Gen 3+)
}

export interface SnapshotDaycare {
  parent1: { species_id: number; species_name: string; is_shiny: boolean } | null;
  parent2: { species_id: number; species_name: string; is_shiny: boolean } | null;
  offspring: { species_id: number; species_name: string } | null;
  shiny_odds: string | null;
}

export interface SnapshotBoxMember {
  species_id: number;
  species_name: string;
  box: number;
  level: number;
  is_shiny: boolean;
  moves?: string[];
  nature?: string;
  ability?: string;
  ball?: string;
  has_pokerus?: boolean;
  ivs?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  evs?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  pid?: number;
  ec?: number;
  exp?: number;
  stat_exp?: { hp: number; atk: number; def: number; spd: number; spc: number };
  friendship?: number;
  pokerus?: number;
  caught_data?: { level: number; location: number; time: number };
  gender?: string;        // 'male' | 'female' | 'genderless'
  nickname?: string;
  origin_game?: string;   // game where this mon was originally caught
  form?: number;          // form index (Gen 6+)
  ot_name?: string;       // original trainer name (per-mon, Gen 3+)
  ot_tid?: number;        // original trainer ID (per-mon, Gen 3+)
  met_level?: number;     // level when caught (Gen 3+)
}

export interface SaveSnapshot {
  generation: number;
  game: string;
  ot_name: string;
  ot_tid: number;
  ot_sid: number;
  tsv: number;
  location: string;
  badge_count: number;
  max_badges: number;
  play_time_seconds: number | null;
  party: SnapshotPartyMember[];
  box_pokemon?: SnapshotBoxMember[];
  daycare?: SnapshotDaycare;
  key_items?: string[];
  save_rtc?: SaveRtc;
}

export type CheckpointType =
  | 'root'
  | 'progression'
  | 'hunt_base'
  | 'catch'
  | 'daycare_swap'
  | 'snapshot';

export interface CheckpointDiff {
  new_badges?: number;
  new_shinies?: Array<{ species_id: number; species_name: string }>;
  daycare_changed?: boolean;
  location_changed?: boolean;
  party_changed?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const speciesNameCache = new Map<number, string>();

function getSpeciesName(species_id: number): string {
  if (speciesNameCache.has(species_id)) return speciesNameCache.get(species_id)!;
  const row = db.prepare('SELECT name FROM species WHERE id = ?').get(species_id) as { name: string } | undefined;
  const name = row?.name ?? `#${species_id}`;
  speciesNameCache.set(species_id, name);
  return name;
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
  return 0; // unknown
}

/** Prettify a location key slug, or return null for unknown/empty */
function formatLocation(key: string | undefined | null): string | null {
  if (!key || key === 'unknown' || /^\?+$/.test(key)) return null;
  if (key === 'pokecenter') return 'Pokémon Center';
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Max badge count per generation */
function maxBadges(generation: number, game: string): number {
  if (generation === 2) return 16; // Johto + Kanto
  if (generation === 4) {
    const lc = game.toLowerCase();
    if (lc.includes('heartgold') || lc.includes('soulsilver')) return 16;
    return 8;
  }
  if (generation === 7) return 4; // Grand Trials
  return 8;
}

// Minimum save file sizes by generation
const MIN_SAVE_SIZE: Record<number, number> = {
  1: 32768,      // 32KB
  2: 32768,      // 32KB
  3: 131072,     // 128KB
  4: 524288,     // 512KB
  5: 524288,     // 512KB
  6: 415232,     // ~406KB (XY minimum)
  7: 441856,     // ~432KB (SM minimum)
};

// ── Generic Pokemon → Snapshot mapping ──────────────────────────────────────

interface PokemonLike {
  species_id: number;
  level: number;
  is_shiny: boolean | number;
  is_egg?: boolean | number;
  box: number;
  move1?: string;
  move2?: string;
  move3?: string;
  move4?: string;
  nature?: string;
  ability?: string;
  ball?: string;
  has_pokerus?: boolean;
  iv_hp?: number;
  iv_attack?: number;
  iv_defense?: number;
  iv_speed?: number;
  iv_sp_attack?: number;
  iv_sp_defense?: number;
  iv_special?: number;  // Gen 1-2 single Special stat
  ev_hp?: number;
  ev_attack?: number;
  ev_defense?: number;
  ev_speed?: number;
  ev_sp_attack?: number;
  ev_sp_defense?: number;
  pid?: number;
  ec?: number;
  exp?: number;
  gender?: string;
  nickname?: string;
  origin_game?: string;
  form?: number;
  ot_name?: string;
  ot_tid?: number;
  ot_sid?: number;
  met_level?: number;
}

function buildExtras(p: PokemonLike) {
  const extras: Partial<SnapshotPartyMember> = {};
  if (p.nature) extras.nature = p.nature;
  if (p.ability) extras.ability = p.ability;
  if (p.ball && p.ball !== 'Poke Ball') extras.ball = p.ball;
  if (p.has_pokerus) extras.has_pokerus = true;
  if (p.iv_hp != null) {
    extras.ivs = {
      hp: p.iv_hp, atk: p.iv_attack ?? 0, def: p.iv_defense ?? 0,
      spa: p.iv_sp_attack ?? p.iv_special ?? 0,
      spd: p.iv_sp_defense ?? p.iv_special ?? 0,
      spe: p.iv_speed ?? 0,
    };
  }
  if (p.ev_hp != null && (p.ev_hp + (p.ev_attack ?? 0) + (p.ev_defense ?? 0) + (p.ev_sp_attack ?? 0) + (p.ev_sp_defense ?? 0) + (p.ev_speed ?? 0)) > 0) {
    extras.evs = {
      hp: p.ev_hp, atk: p.ev_attack ?? 0, def: p.ev_defense ?? 0,
      spa: p.ev_sp_attack ?? 0, spd: p.ev_sp_defense ?? 0, spe: p.ev_speed ?? 0,
    };
  }
  if (p.pid != null) extras.pid = p.pid;
  if (p.ec != null) extras.ec = p.ec;
  if (p.exp != null) extras.exp = p.exp;
  if (p.gender) extras.gender = p.gender;
  if (p.nickname) extras.nickname = p.nickname;
  if (p.origin_game) extras.origin_game = p.origin_game;
  if (p.form != null && p.form > 0) extras.form = p.form;
  if (p.ot_name) extras.ot_name = p.ot_name;
  if (p.ot_tid != null) extras.ot_tid = p.ot_tid;
  if (p.met_level != null && p.met_level > 0) extras.met_level = p.met_level;
  return extras;
}

function toPartyMember(p: PokemonLike): SnapshotPartyMember {
  const moves = [p.move1, p.move2, p.move3, p.move4].filter(Boolean) as string[];
  return {
    species_id: p.species_id,
    species_name: getSpeciesName(p.species_id),
    level: p.level,
    is_shiny: !!p.is_shiny,
    is_egg: !!p.is_egg,
    ...(moves.length > 0 ? { moves } : {}),
    ...buildExtras(p),
  };
}

function toBoxMember(p: PokemonLike): SnapshotBoxMember {
  const moves = [p.move1, p.move2, p.move3, p.move4].filter(Boolean) as string[];
  return {
    species_id: p.species_id,
    species_name: getSpeciesName(p.species_id),
    box: p.box,
    level: p.level,
    is_shiny: !!p.is_shiny,
    ...(moves.length > 0 ? { moves } : {}),
    ...buildExtras(p),
  };
}

// ── buildSnapshot ─────────────────────────────────────────────────────────────

export function buildSnapshot(filePath: string, game: string): SaveSnapshot {
  const generation = resolveGeneration(game);

  if (generation === 0) {
    throw new Error(`Unknown game: ${game}`);
  }

  // Guard against misidentified or truncated saves
  try {
    const size = statSync(filePath).size;
    const minSize = MIN_SAVE_SIZE[generation] ?? 32768;
    if (size < minSize) {
      throw new Error(`Save file too small (${size} bytes) for Gen ${generation} (need ${minSize})`);
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') throw new Error(`Save file not found: ${filePath}`);
    if (err.message.includes('too small') || err.message.includes('Unknown game')) throw err;
  }

  // --- Gen 1 ---
  if (generation === 1) {
    const result = parseGen1Save(filePath, game);
    const { worldState, pokemon } = result;

    const addGen1Fingerprint = (member: SnapshotPartyMember | SnapshotBoxMember, p: Gen1Pokemon) => {
      member.exp = p.exp;
      member.stat_exp = {
        hp: p.stat_exp_hp,
        atk: p.stat_exp_attack,
        def: p.stat_exp_defense,
        spd: p.stat_exp_speed,
        spc: p.stat_exp_special,
      };
      const gender = computeGender(p.species_id, p.iv_attack);
      if (gender) member.gender = gender;
    };

    const partyGen1 = pokemon.filter(p => p.box === -1);
    const boxGen1   = pokemon.filter(p => p.box >= 0);
    const party = partyGen1.map(p => { const m = toPartyMember(p); addGen1Fingerprint(m, p); return m; });
    const box   = boxGen1.map(p => { const m = toBoxMember(p); addGen1Fingerprint(m, p); return m; });

    return {
      generation: 1,
      game,
      ot_name: worldState.playerName,
      ot_tid: worldState.trainerId,
      ot_sid: 0,
      tsv: 0,
      location: formatLocation(worldState.currentLocationKey) ?? '',
      badge_count: worldState.badgeCount,
      max_badges: 8,
      play_time_seconds: worldState.playTimeSeconds,
      party,
      box_pokemon: box.length > 0 ? box : undefined,
      key_items: worldState.keyItems,
    };
  }

  // --- Gen 2 ---
  if (generation === 2) {
    const result = parseGen2Save(filePath, game);
    const { worldState, pokemon, daycare } = result;

    let snapshotDaycare: SnapshotDaycare | undefined;
    const dc = daycare as DaycareInfo | undefined;
    if (dc?.active) {
      snapshotDaycare = {
        parent1: dc.mon1
          ? { species_id: dc.mon1.species_id, species_name: getSpeciesName(dc.mon1.species_id), is_shiny: dc.mon1.is_shiny }
          : null,
        parent2: dc.mon2
          ? { species_id: dc.mon2.species_id, species_name: getSpeciesName(dc.mon2.species_id), is_shiny: dc.mon2.is_shiny }
          : null,
        offspring: dc.offspringSpeciesId
          ? { species_id: dc.offspringSpeciesId, species_name: getSpeciesName(dc.offspringSpeciesId) }
          : null,
        shiny_odds: dc.shinyOdds,
      };
    }

    const addGen2Fingerprint = (member: SnapshotPartyMember | SnapshotBoxMember, p: Gen2Pokemon) => {
      member.exp = p.exp;
      member.stat_exp = {
        hp: p.stat_exp_hp,
        atk: p.stat_exp_attack,
        def: p.stat_exp_defense,
        spd: p.stat_exp_speed,
        spc: p.stat_exp_special,
      };
      member.friendship = p.friendship;
      member.pokerus = p.pokerus;
      if (p.caught_level > 0) {
        member.caught_data = { level: p.caught_level, location: p.caught_location, time: p.caught_time };
      }
      const gender = computeGender(p.species_id, p.iv_attack);
      if (gender) member.gender = gender;
    };

    const partyGen2 = pokemon.filter(p => p.box === -1);
    const boxGen2   = pokemon.filter(p => p.box >= 0);
    const party = partyGen2.map(p => { const m = toPartyMember(p); addGen2Fingerprint(m, p); return m; });
    const box   = boxGen2.map(p => { const m = toBoxMember(p); addGen2Fingerprint(m, p); return m; });

    return {
      generation: 2,
      game,
      ot_name: worldState.playerName,
      ot_tid: worldState.trainerId,
      ot_sid: 0,
      tsv: 0,
      location: formatLocation(worldState.currentLocationKey) ?? '',
      badge_count: worldState.badgeCount,
      max_badges: 16,
      play_time_seconds: worldState.playTimeSeconds,
      party,
      box_pokemon: box.length > 0 ? box : undefined,
      daycare: snapshotDaycare,
      key_items: worldState.keyItems,
      save_rtc: worldState.save_rtc,
    };
  }

  // --- Gen 3-7: generic path ---
  type ParseFn = (filePath: string, game: string) => { pokemon: PokemonLike[]; worldState: import('./worldState.js').SaveWorldState };
  const parsers: Record<number, ParseFn> = {
    3: parseGen3Save as unknown as ParseFn,
    4: parseGen4Save as unknown as ParseFn,
    5: parseGen5Save as unknown as ParseFn,
    6: parseGen6Save as unknown as ParseFn,
    7: parseGen7Save as unknown as ParseFn,
  };

  const parse = parsers[generation];
  if (!parse) {
    throw new Error(`No parser for Gen ${generation}`);
  }

  const { pokemon, worldState } = parse(filePath, game);

  const partyPokemon = pokemon.filter(p => p.box === -1).map(toPartyMember);
  const boxPokemon   = pokemon.filter(p => p.box >= 0).map(toBoxMember);

  return {
    generation,
    game,
    ot_name: worldState.playerName,
    ot_tid: worldState.trainerId,
    ot_sid: worldState.trainerSid,
    tsv: worldState.tsv,
    location: formatLocation(worldState.currentLocationKey) ?? '',
    badge_count: worldState.badgeCount,
    max_badges: maxBadges(generation, game),
    play_time_seconds: worldState.playTimeSeconds,
    party: partyPokemon,
    box_pokemon: boxPokemon.length > 0 ? boxPokemon : undefined,
    key_items: worldState.keyItems.length > 0 ? worldState.keyItems : undefined,
    save_rtc: worldState.save_rtc,
  };
}

// ── diffSnapshots ─────────────────────────────────────────────────────────────

export function diffSnapshots(
  current: SaveSnapshot,
  parent: SaveSnapshot | null,
): { type: CheckpointType; diff: CheckpointDiff } {
  if (!parent) {
    return { type: 'root', diff: {} };
  }

  const diff: CheckpointDiff = {};

  // Badge increase
  if (current.badge_count > parent.badge_count) {
    diff.new_badges = current.badge_count - parent.badge_count;
  }

  // Location changed
  if (current.location !== parent.location && current.location) {
    diff.location_changed = true;
  }

  // New shinies — check both party and boxes
  const parentShinyIds = new Set([
    ...parent.party.filter(p => p.is_shiny).map(p => p.species_id),
    ...(parent.box_pokemon ?? []).filter(p => p.is_shiny).map(p => p.species_id),
  ]);
  const currentShinies = [
    ...current.party.filter(p => p.is_shiny).map(p => ({ species_id: p.species_id, species_name: p.species_name })),
    ...(current.box_pokemon ?? []).filter(p => p.is_shiny).map(p => ({ species_id: p.species_id, species_name: p.species_name })),
  ];
  const newShinies = currentShinies.filter(p => !parentShinyIds.has(p.species_id));
  if (newShinies.length > 0) {
    diff.new_shinies = newShinies;
  }

  // Daycare changes
  const parentDc = parent.daycare;
  const currentDc = current.daycare;
  if (currentDc) {
    const wasEmpty = !parentDc;
    const parent1Changed = currentDc.parent1?.species_id !== parentDc?.parent1?.species_id;
    const parent2Changed = currentDc.parent2?.species_id !== parentDc?.parent2?.species_id;
    if (wasEmpty) {
      diff.daycare_changed = true;
    } else if (parent1Changed || parent2Changed) {
      diff.daycare_changed = true;
    }
  }

  // Party changed (species composition)
  const parentPartyIds = parent.party.map(p => p.species_id).sort().join(',');
  const currentPartyIds = current.party.map(p => p.species_id).sort().join(',');
  if (parentPartyIds !== currentPartyIds) {
    diff.party_changed = true;
  }

  // Classify type based on most significant change
  if (diff.new_shinies && diff.new_shinies.length > 0) {
    return { type: 'catch', diff };
  }

  if (diff.new_badges) {
    return { type: 'progression', diff };
  }

  return { type: 'snapshot', diff };
}

// ── rebuildSnapshots ─────────────────────────────────────────────────────────
// Re-parse saves for all checkpoints to pick up new snapshot fields.

export function rebuildSnapshots(): void {
  // Guard: skip if move/ability lookup tables are empty — snapshots would
  // cache "move-###" placeholders that persist until the next rebuild.
  const moveCount = (db.prepare('SELECT COUNT(*) as c FROM move_names').get() as any).c;
  if (moveCount === 0) {
    console.warn('[rebuildSnapshots] Skipped — move_names table is empty (seed may have failed).');
    return;
  }

  const rows = db.prepare(`
    SELECT c.id, sf.file_path, p.game
    FROM checkpoints c
    JOIN save_files sf ON sf.id = c.save_file_id
    JOIN playthroughs p ON p.id = c.playthrough_id
    WHERE sf.file_path IS NOT NULL
  `).all() as { id: number; file_path: string; game: string }[];

  const update = db.prepare('UPDATE checkpoints SET snapshot = ? WHERE id = ?');
  let rebuilt = 0;

  for (const row of rows) {
    try {
      const snapshot = buildSnapshot(row.file_path, row.game);
      update.run(JSON.stringify(snapshot), row.id);
      rebuilt++;
    } catch {
      // Skip files that can't be parsed (missing, wrong gen, etc.)
    }
  }

  if (rebuilt > 0) {
    console.log(`[rebuildSnapshots] Rebuilt ${rebuilt}/${rows.length} checkpoint snapshots.`);
  }
}
