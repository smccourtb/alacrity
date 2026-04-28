/**
 * audit-flag-coverage.ts
 *
 * Cross-verifies marker-row ↔ flag linkage for gen 1-2 games. Surfaces:
 *   • Flags pret tagged with a `location_key` that have NO matching DB row
 *     (curated seed missed the row, or the row exists at a different location).
 *   • DB rows with `flag_index IS NULL` AND `flag_source IS NULL` — these are
 *     the rows the linker couldn't classify at all (genuine gaps).
 *   • DB rows tagged `recurring`/`transactional`/`scripted`/`engine_pending` —
 *     untrackable by design or pending-bank-read; not gaps.
 *
 * Output is a punch list per location, organized so the user can fix in
 * batches: which curated rows to add (flag_orphans), which aliases to write
 * (unlinked_rows), and which categories are deliberately empty.
 *
 * Usage: bun run server/src/scripts/audit-flag-coverage.ts [game]
 */
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const REPO_ROOT = join(SCRIPT_DIR, '..', '..', '..');
const DB_PATH = join(REPO_ROOT, 'data', 'pokemon.db');
const FLAGS_DIR = join(SCRIPT_DIR, '..', 'data', 'flags');

interface FlagDef { index: number; name: string; category: string; location_key?: string; source: string; }
interface EngineFlagDef { name: string; synthetic_index: number; sram_offset: number; bit: number; wField: string; }

const GAMES = ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal'];

function loadFlags(game: string): { byIndex: Map<number, FlagDef>; byName: Map<string, FlagDef> } {
  const byIndex = new Map<number, FlagDef>();
  const byName = new Map<string, FlagDef>();
  try {
    const defs: FlagDef[] = JSON.parse(readFileSync(join(FLAGS_DIR, `${game}.json`), 'utf-8'));
    for (const d of defs) { byIndex.set(d.index, d); byName.set(d.name, d); }
  } catch { /* missing per-game */ }
  try {
    const engineDefs: EngineFlagDef[] = JSON.parse(readFileSync(join(FLAGS_DIR, `${game}-engine.json`), 'utf-8'));
    for (const e of engineDefs) {
      const def: FlagDef = { index: e.synthetic_index, name: e.name, category: 'engine', source: 'engine' };
      byIndex.set(e.synthetic_index, def);
      byName.set(e.name, def);
    }
  } catch { /* engine bank optional */ }
  return { byIndex, byName };
}

interface PerLocationStats {
  total_rows: number;
  linked_pret: number;
  linked_alias: number;
  linked_engine: number;
  classified_recurring: number;
  classified_transactional: number;
  classified_scripted: number;
  classified_engine_pending: number;
  unlinked_genuine: number;     // flag_index NULL AND flag_source NULL
  unlinked_rows: Array<{ table: string; id: number; name: string; method?: string }>;
  flag_orphans: Array<{ flag: FlagDef }>;  // flags pret says belong here but no row links them
}

function emptyStats(): PerLocationStats {
  return {
    total_rows: 0,
    linked_pret: 0, linked_alias: 0, linked_engine: 0,
    classified_recurring: 0, classified_transactional: 0,
    classified_scripted: 0, classified_engine_pending: 0,
    unlinked_genuine: 0,
    unlinked_rows: [],
    flag_orphans: [],
  };
}

function auditGame(db: Database, game: string) {
  const { byIndex } = loadFlags(game);
  const stats: Map<string, PerLocationStats> = new Map();
  const get = (k: string) => { let s = stats.get(k); if (!s) { s = emptyStats(); stats.set(k, s); } return s; };

  // Collect every marker row across the four tables, joined to map_locations.
  const queries: Array<{ table: string; nameCol: string; methodCol?: string }> = [
    { table: 'location_items',    nameCol: 'item_name',    methodCol: 'method' },
    { table: 'location_trainers', nameCol: 'trainer_name', methodCol: 'trainer_class' },
    { table: 'location_tms',      nameCol: 'move_name',    methodCol: 'method' },
    { table: 'location_events',   nameCol: 'event_name',   methodCol: 'event_type' },
  ];
  for (const q of queries) {
    const rows = db.prepare(`
      SELECT t.id, t.${q.nameCol} AS name, ${q.methodCol ? `t.${q.methodCol} AS method,` : ''}
             t.flag_index, t.flag_source, ml.location_key
        FROM ${q.table} t
        JOIN map_locations ml ON ml.id = t.location_id
       WHERE t.game = ?
    `).all(game) as any[];
    for (const r of rows) {
      const s = get(r.location_key);
      s.total_rows++;
      if (r.flag_index != null) {
        if (r.flag_source === 'pret') s.linked_pret++;
        else if (r.flag_source === 'engine') s.linked_engine++;
        else s.linked_alias++;
        continue;
      }
      switch (r.flag_source) {
        case 'recurring':       s.classified_recurring++; break;
        case 'transactional':   s.classified_transactional++; break;
        case 'scripted':        s.classified_scripted++; break;
        case 'engine_pending':  s.classified_engine_pending++; break;
        default:
          s.unlinked_genuine++;
          s.unlinked_rows.push({ table: q.table, id: r.id, name: r.name, method: r.method });
      }
    }
  }

  // For every event/engine flag with a location_key, check whether ANY DB row
  // at that location has flag_index = that flag's index. If not → orphan.
  const linkedIndices = new Map<string, Set<number>>();   // location_key → set of linked flag indices
  for (const q of queries) {
    const rows = db.prepare(`
      SELECT t.flag_index, ml.location_key FROM ${q.table} t
      JOIN map_locations ml ON ml.id = t.location_id
      WHERE t.game = ? AND t.flag_index IS NOT NULL
    `).all(game) as Array<{ flag_index: number; location_key: string }>;
    for (const r of rows) {
      let s = linkedIndices.get(r.location_key);
      if (!s) { s = new Set(); linkedIndices.set(r.location_key, s); }
      s.add(r.flag_index);
    }
  }
  for (const def of byIndex.values()) {
    if (!def.location_key) continue;
    // Skip "branch" / temporary / internal flags that aren't checklist-worthy.
    if (def.name.startsWith('EVENT_TEMPORARY')) continue;
    if (def.name.startsWith('EVENT_RIVAL_FIGHT_')) continue; // tempo flags
    if (/_HAS_PHONE_NUMBER$|_REMATCH$|_AVAILABLE$|_ON_PHONE$/.test(def.name)) continue;
    const linked = linkedIndices.get(def.location_key);
    if (linked?.has(def.index)) continue;
    const s = get(def.location_key);
    s.flag_orphans.push({ flag: def });
  }

  return stats;
}

const arg = process.argv[2];
const targetGames = arg ? [arg] : GAMES;
const db = new Database(DB_PATH);

for (const game of targetGames) {
  const stats = auditGame(db, game);
  if (stats.size === 0) continue;

  const totals = emptyStats();
  for (const s of stats.values()) {
    totals.total_rows += s.total_rows;
    totals.linked_pret += s.linked_pret;
    totals.linked_alias += s.linked_alias;
    totals.linked_engine += s.linked_engine;
    totals.classified_recurring += s.classified_recurring;
    totals.classified_transactional += s.classified_transactional;
    totals.classified_scripted += s.classified_scripted;
    totals.classified_engine_pending += s.classified_engine_pending;
    totals.unlinked_genuine += s.unlinked_genuine;
    totals.flag_orphans.push(...s.flag_orphans);
  }

  console.log(`\n══════════ ${game.toUpperCase()} ══════════`);
  const linked = totals.linked_pret + totals.linked_alias + totals.linked_engine;
  const tracked = linked + totals.classified_recurring + totals.classified_transactional + totals.classified_scripted + totals.classified_engine_pending;
  console.log(`Rows: ${totals.total_rows} total | ${linked} linked (${totals.linked_pret} pret + ${totals.linked_alias} alias + ${totals.linked_engine} engine) | ${tracked - linked} classified-untrackable | ${totals.unlinked_genuine} GENUINE GAP`);
  console.log(`Flag orphans: ${totals.flag_orphans.length} flags pret tagged but DB has no linked row`);

  // Sort locations by genuine gap count (most fixable first)
  const ranked = [...stats.entries()]
    .filter(([_, s]) => s.unlinked_genuine > 0 || s.flag_orphans.length > 0)
    .sort((a, b) => (b[1].unlinked_genuine + b[1].flag_orphans.length) - (a[1].unlinked_genuine + a[1].flag_orphans.length));

  for (const [locKey, s] of ranked) {
    console.log(`\n  ▸ ${locKey}  (rows: ${s.total_rows}, gaps: ${s.unlinked_genuine}, orphans: ${s.flag_orphans.length})`);
    if (s.unlinked_rows.length > 0) {
      console.log(`    Unlinked DB rows:`);
      for (const r of s.unlinked_rows.slice(0, 10)) {
        console.log(`      - [${r.table.replace('location_', '')}] "${r.name}"${r.method ? ` (${r.method})` : ''}  id=${r.id}`);
      }
      if (s.unlinked_rows.length > 10) console.log(`      ...+${s.unlinked_rows.length - 10} more`);
    }
    if (s.flag_orphans.length > 0) {
      console.log(`    Flag orphans (pret has flag at this loc, no DB row):`);
      for (const f of s.flag_orphans.slice(0, 10)) {
        console.log(`      - ${f.flag.name} (${f.flag.category}, idx ${f.flag.index})`);
      }
      if (s.flag_orphans.length > 10) console.log(`      ...+${s.flag_orphans.length - 10} more`);
    }
  }
}

db.close();
