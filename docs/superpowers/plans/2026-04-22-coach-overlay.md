# Coach Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 of the live coach overlay — player-position marker on the world map, flag-driven auto-checkoff, grass-encounter panel — driven by an mGBA Lua script that reads WRAM and streams state to the Alacrity server over a localhost WebSocket.

**Architecture:** Three-layer pipeline. An mGBA-side Lua script (`coach.lua`) reads WRAM each frame, diffs against cached state, and emits diff events to a WebSocket hosted by the Alacrity server. A new `GameStateReader` service on the server normalizes those events and re-broadcasts them over SSE at `/api/coach/events`. A React context (`GameStateStore`) subscribes to the SSE stream and feeds new UI panels while also shadowing the existing `flagReport` pipeline with live RAM-sourced flag state. A feature-registry layer on server and client is the seam for future phases (battle preview, shiny counter, etc.) and for rom-hack/randomizer support via drop-in profile JSON.

**Tech Stack:** Express 5 + `ws` (new dependency) + `bun:sqlite` on the server. Lua 5.3 via mGBA's scripting API on the emulator. React 19 + react-leaflet for the new UI panels. No automated test framework — validation is manual via curl, websocat, and the guide UI (matches existing project convention documented in `CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-04-22-coach-overlay-design.md`

---

## Phase 1a — Foundation

### Task 1: Add `ws` dependency + verify imports

**Files:**
- Modify: `package.json` (workspace root — server shares it)

- [ ] **Step 1: Add dependency**

Run: `cd /Users/shawnmccourt/WebstormProjects/alacrity && bun add ws && bun add -d @types/ws`

- [ ] **Step 2: Verify install**

Run: `bun -e "import('ws').then(m => console.log('ws ok:', typeof m.WebSocketServer))"`
Expected: `ws ok: function`

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "deps: add ws for coach websocket server"
```

---

### Task 2: Schema — add `trainer_id` and `secret_id` to `save_files`

**Files:**
- Modify: `server/src/schema.sql` (the `save_files` CREATE block around line 42)
- Modify: `server/src/db.ts` (append to the idempotent migration block near line 16-30)

- [ ] **Step 1: Add columns to fresh-install schema**

In `server/src/schema.sql`, find the `CREATE TABLE IF NOT EXISTS save_files (...)` block and add two columns to it (alongside the existing columns):

```sql
  trainer_id INTEGER,
  secret_id INTEGER,
```

- [ ] **Step 2: Add idempotent ALTER for upgrade path**

In `server/src/db.ts`, after the existing `hunts`-table `ALTER TABLE` lines, add:

```ts
const saveColsRows = db.prepare(`PRAGMA table_info(save_files)`).all() as { name: string }[];
const saveCols = new Set(saveColsRows.map(r => r.name));
if (!saveCols.has('trainer_id')) db.exec(`ALTER TABLE save_files ADD COLUMN trainer_id INTEGER`);
if (!saveCols.has('secret_id')) db.exec(`ALTER TABLE save_files ADD COLUMN secret_id INTEGER`);
```

- [ ] **Step 3: Run migration by booting server**

Run: `cd server && bun run src/index.ts --port 3099 --data-dir /tmp/coach-test-$$` (then kill with Ctrl-C). The idempotent block runs on startup.

Verify: `sqlite3 /tmp/coach-test-*/data/pokemon.db "PRAGMA table_info(save_files)" | grep -E "trainer_id|secret_id"`
Expected: two rows naming both columns with `INTEGER` type.

- [ ] **Step 4: Commit**

```bash
git add server/src/schema.sql server/src/db.ts
git commit -m "schema(save_files): add trainer_id + secret_id for coach save matching"
```

---

### Task 3: Schema — create `coord_calibrations` table

**Files:**
- Modify: `server/src/schema.sql` (append near the `game_maps` block around line 148-170)

- [ ] **Step 1: Add table to schema**

Append to `server/src/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS coord_calibrations (
  game_id TEXT PRIMARY KEY,
  map_key TEXT NOT NULL,
  landmarks TEXT NOT NULL,
  affine_matrix TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

No `ALTER` needed — `CREATE TABLE IF NOT EXISTS` handles both fresh and upgrade paths.

- [ ] **Step 2: Verify by booting server**

Run: `cd server && bun run src/index.ts --port 3099 --data-dir /tmp/coach-test-$$` and Ctrl-C.

Verify: `sqlite3 /tmp/coach-test-*/data/pokemon.db ".schema coord_calibrations"`
Expected: the CREATE TABLE statement prints.

- [ ] **Step 3: Commit**

```bash
git add server/src/schema.sql
git commit -m "schema: add coord_calibrations table for coach player-marker transform"
```

---

### Task 4: Backfill `trainer_id`/`secret_id` on existing saves

**Files:**
- Create: `server/src/scripts/backfill-save-trainer-ids.ts`

- [ ] **Step 1: Write backfill script**

Create `server/src/scripts/backfill-save-trainer-ids.ts`:

```ts
/**
 * One-shot backfill: re-parse every save_files row that has null trainer_id
 * and write trainer_id + secret_id back to the row. Uses the same genN world-
 * state parsers that saveSnapshot.ts uses.
 */
import db from '../db.js';
import { readFileSync } from 'fs';
import { paths } from '../paths.js';
import { join } from 'path';
import { extractGen2WorldState } from '../services/gen2WorldState.js';
import { extractGen1WorldState } from '../services/gen1WorldState.js';

function gameToGen(game: string): 1 | 2 | null {
  if (['red', 'blue', 'yellow'].includes(game)) return 1;
  if (['gold', 'silver', 'crystal'].includes(game)) return 2;
  return null;
}

const rows = db.prepare(`
  SELECT id, game, file_path FROM save_files WHERE trainer_id IS NULL
`).all() as { id: number; game: string; file_path: string }[];

let updated = 0, skipped = 0;
const update = db.prepare(`UPDATE save_files SET trainer_id = ?, secret_id = ? WHERE id = ?`);

for (const r of rows) {
  const gen = gameToGen(r.game);
  if (!gen) { skipped++; continue; }
  try {
    const abs = r.file_path.startsWith('/') ? r.file_path : join(paths.dataDir, r.file_path);
    const buf = readFileSync(abs);
    const ws = gen === 2 ? extractGen2WorldState(buf, r.game as any) : extractGen1WorldState(buf, r.game as any);
    if (!ws) { skipped++; continue; }
    update.run(ws.trainerId ?? null, (ws as any).trainerSid ?? null, r.id);
    updated++;
  } catch (err) {
    console.warn(`[backfill] save_files.id=${r.id}: ${(err as Error).message}`);
    skipped++;
  }
}

console.log(`Backfilled ${updated} saves (${skipped} skipped).`);
```

- [ ] **Step 2: Run backfill against real DB**

Run: `cd server && bun run src/scripts/backfill-save-trainer-ids.ts`
Expected: `Backfilled N saves (M skipped).` with N > 0 if any gen1/gen2 saves exist.

- [ ] **Step 3: Verify via SQL spot-check**

Run: `sqlite3 /Users/shawnmccourt/WebstormProjects/alacrity/data/pokemon.db "SELECT id, game, trainer_id, secret_id FROM save_files WHERE game IN ('crystal','gold','silver') LIMIT 5"`
Expected: at least some rows with non-null `trainer_id`.

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/backfill-save-trainer-ids.ts
git commit -m "script: backfill trainer_id/secret_id on existing save_files"
```

---

### Task 5: Feature registry module

**Files:**
- Create: `server/src/services/coachFeatures.ts`

- [ ] **Step 1: Write the registry**

Create `server/src/services/coachFeatures.ts`:

```ts
/**
 * Single source of truth for coach features. Each feature declares which RAM
 * symbols it needs (so a game profile missing those symbols auto-disables it)
 * plus the Lua module path that should be loaded when the feature is enabled.
 */

export type FeatureId =
  | 'player_marker'
  | 'flag_sync'
  | 'encounter_panel'
  | 'battle_preview'
  | 'counter_advisor'
  | 'shiny_counter'
  | 'directional_hint';

export interface CoachFeatureDef {
  id: FeatureId;
  displayName: string;
  description: string;
  requiredSymbols: string[];
  luaModule: string;     // relative to resources/scripts/coach/modules
  implemented: boolean;  // false until shipped; UI shows as "Coming soon"
}

export const COACH_FEATURES: CoachFeatureDef[] = [
  {
    id: 'player_marker',
    displayName: 'Player Marker',
    description: 'Live player position dot on the world map.',
    requiredSymbols: ['player_map_group', 'player_map_number', 'player_x', 'player_y', 'player_facing'],
    luaModule: 'player.lua',
    implemented: true,
  },
  {
    id: 'flag_sync',
    displayName: 'Flag Sync',
    description: 'Auto-check guide items as their flags trigger in-game.',
    requiredSymbols: ['event_flags', 'event_flag_count'],
    luaModule: 'flags.lua',
    implemented: true,
  },
  {
    id: 'encounter_panel',
    displayName: 'Encounter Panel',
    description: 'Show catchable species when standing on grass or water.',
    requiredSymbols: ['current_tile_collision', 'time_of_day'],
    luaModule: 'tile.lua',
    implemented: true,
  },
  {
    id: 'battle_preview',
    displayName: 'Opponent Preview',
    description: '(Coming soon) Show opponent species, level, and moves.',
    requiredSymbols: ['battle_state', 'enemy_mon_species'],
    luaModule: 'battle.lua',
    implemented: false,
  },
  {
    id: 'counter_advisor',
    displayName: 'Counter Advisor',
    description: '(Coming soon) Highlight super-effective moves on your party.',
    requiredSymbols: ['battle_state', 'enemy_mon_species'],
    luaModule: 'counter.lua',
    implemented: false,
  },
  {
    id: 'shiny_counter',
    displayName: 'Shiny Counter',
    description: '(Coming soon) Auto-increment encounter count and link to active hunt.',
    requiredSymbols: ['battle_state'],
    luaModule: 'shiny.lua',
    implemented: false,
  },
  {
    id: 'directional_hint',
    displayName: 'Directional Hint',
    description: '(Coming soon) Arrow pointing to your next walkthrough step.',
    requiredSymbols: ['player_map_group', 'player_x', 'player_y'],
    luaModule: 'hint.lua',
    implemented: false,
  },
];

export function featureById(id: string): CoachFeatureDef | null {
  return COACH_FEATURES.find(f => f.id === id) ?? null;
}

/**
 * Compute which features are effectively enabled for a given profile + user
 * pref combination. A feature is active iff:
 *   - it is shipped (`implemented: true`),
 *   - the profile supports it (declared in profile.supported_features),
 *   - the profile provides all required RAM symbols, and
 *   - the user has it enabled in preferences.
 */
export function computeEffectiveFeatures(
  profileSupported: string[],
  profileSymbols: Record<string, string>,
  userEnabled: string[],
): FeatureId[] {
  const supportedSet = new Set(profileSupported);
  const enabledSet = new Set(userEnabled);
  return COACH_FEATURES
    .filter(f => f.implemented && supportedSet.has(f.id) && enabledSet.has(f.id))
    .filter(f => f.requiredSymbols.every(s => s in profileSymbols))
    .map(f => f.id);
}
```

- [ ] **Step 2: Verify by importing**

Run: `cd server && bun -e "import('./src/services/coachFeatures.js').then(m => console.log(m.COACH_FEATURES.map(f => f.id).join(', ')))"`
Expected: `player_marker, flag_sync, encounter_panel, battle_preview, counter_advisor, shiny_counter, directional_hint`

- [ ] **Step 3: Commit**

```bash
git add server/src/services/coachFeatures.ts
git commit -m "feat(coach): add feature registry (3 shipped, 4 scaffolded)"
```

---

### Task 6: Profile loader + seed Crystal profile

**Files:**
- Create: `server/src/services/coachProfiles.ts`
- Create: `server/resources/coach-profiles/crystal.json` (directory is new)

- [ ] **Step 1: Write the Crystal profile**

Create `server/resources/coach-profiles/crystal.json`:

```json
{
  "game_id": "crystal",
  "display_name": "Pokemon Crystal",
  "rom_title_matches": ["PM_CRYSTAL", "CRYSTAL"],
  "rom_hash_matches": [],
  "map_key": "johto",
  "min_mgba_version": "0.10.0",
  "symbols": {
    "player_map_group": "0xD148",
    "player_map_number": "0xD149",
    "player_x": "0xD164",
    "player_y": "0xD165",
    "player_facing": "0xD166",
    "event_flags": "0xD7B7",
    "event_flag_count": 2400,
    "trainer_id": "0xD47B",
    "secret_id": "0xD47D",
    "time_of_day": "0xD269",
    "current_tile_collision": "0xC2FA",
    "battle_state": "0xD22D",
    "enemy_mon_species": "0xD204"
  },
  "supported_features": ["player_marker", "flag_sync", "encounter_panel", "battle_preview", "counter_advisor", "shiny_counter"]
}
```

> Addresses are representative and must be verified against pret `constants/wram.asm` during task 16 (flag reader) — any correction is a one-line edit here.

- [ ] **Step 2: Write the loader**

Create `server/src/services/coachProfiles.ts`:

```ts
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';

export interface CoachProfile {
  game_id: string;
  display_name: string;
  rom_title_matches: string[];
  rom_hash_matches: string[];
  map_key: string;
  min_mgba_version?: string;
  symbols: Record<string, string | number>;
  supported_features: string[];
}

let cache: CoachProfile[] | null = null;

function profilesDir(): string {
  return join(paths.resourcesDir, 'resources', 'coach-profiles');
}

export function loadAllProfiles(): CoachProfile[] {
  if (cache) return cache;
  const dir = profilesDir();
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  cache = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as CoachProfile);
  return cache;
}

/** Match by ROM title first, then by ROM hash. Returns null on no match. */
export function findProfile(romTitle: string, romHash: string): CoachProfile | null {
  const profiles = loadAllProfiles();
  const byTitle = profiles.find(p => p.rom_title_matches.some(t => romTitle.startsWith(t)));
  if (byTitle) return byTitle;
  const byHash = profiles.find(p => p.rom_hash_matches.includes(romHash));
  return byHash ?? null;
}

export function getProfile(gameId: string): CoachProfile | null {
  return loadAllProfiles().find(p => p.game_id === gameId) ?? null;
}

export function invalidateProfileCache(): void {
  cache = null;
}
```

- [ ] **Step 3: Verify load**

Run: `cd server && bun -e "import('./src/services/coachProfiles.js').then(m => { const p = m.findProfile('PM_CRYSTAL', ''); console.log(p?.game_id, p?.supported_features.length) })"`

Expected: `crystal 6`

- [ ] **Step 4: Commit**

```bash
git add server/src/services/coachProfiles.ts server/resources/coach-profiles/crystal.json
git commit -m "feat(coach): profile loader + seed Crystal RAM address profile"
```

---

### Task 7: Coach preferences in config service

**Files:**
- Modify: `server/src/services/config.ts`

- [ ] **Step 1: Inspect current config shape**

Run: `sed -n '1,80p' server/src/services/config.ts` to see the `AlacrityConfig` type.

- [ ] **Step 2: Add coach section to config**

In `server/src/services/config.ts`, extend the `AlacrityConfig` interface (find it near the top of the file) with a `coach` object, and add it to the `DEFAULTS` const. Actual code — find these existing blocks and add fields to them:

Add to the config interface (alongside existing fields):

```ts
  coach: {
    enabled_features: string[];
    websocket_port: number;
    auto_switch_save: boolean;
    rom_profile_overrides: Record<string, string>;  // rom_hash -> game_id
  };
```

Add to `DEFAULTS` (alongside existing defaults):

```ts
  coach: {
    enabled_features: ['player_marker', 'flag_sync', 'encounter_panel'],
    websocket_port: 54321,
    auto_switch_save: true,
    rom_profile_overrides: {},
  },
```

- [ ] **Step 3: Verify config reads coach defaults**

Run: `cd server && bun -e "import('./src/paths.js').then(p => { p.initPaths({dataDir:'/tmp/coach-cfg-'+Date.now(), resourcesDir:process.cwd()}); return import('./src/services/config.js') }).then(m => { m.initConfig(); console.log(JSON.stringify(m.getConfig().coach)) })"`

Expected: prints the coach defaults object including `enabled_features: ["player_marker","flag_sync","encounter_panel"]`.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/config.ts
git commit -m "feat(coach): config.coach with defaults (port, features, auto_switch_save)"
```

---

### Task 8: GameStateReader — WebSocket server skeleton

**Files:**
- Create: `server/src/services/gameStateReader.ts`

- [ ] **Step 1: Write the service**

Create `server/src/services/gameStateReader.ts`:

```ts
/**
 * Hosts a local WebSocket server (single-connection in v1) that accepts a
 * coach.lua client, runs the handshake, and broadcasts incoming RAM events
 * through the SSE bus defined in routes/coach.ts.
 *
 * Exposes:
 *   - startGameStateReader(httpServer): attaches ws upgrade handler; returns
 *     the port actually bound (after fallback).
 *   - subscribeToCoachEvents(cb): SSE-side subscription — all domain events
 *     fan out here.
 *   - getSession(): current connection snapshot (null when nobody connected).
 */
import { WebSocketServer, WebSocket } from 'ws';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createServer, Server as HttpServer } from 'http';
import { paths } from '../paths.js';
import { getConfig } from './config.js';
import { findProfile, getProfile } from './coachProfiles.js';
import { COACH_FEATURES, computeEffectiveFeatures } from './coachFeatures.js';
import db from '../db.js';

export type CoachEvent =
  | { type: 'coach_connected'; save_id: number | null; profile: string; enabled: string[] }
  | { type: 'coach_disconnected' }
  | { type: 'player_moved'; map_id: string; tile_x: number; tile_y: number; facing: string }
  | { type: 'tile_changed'; tile_type: string }
  | { type: 'flags_changed'; flag_report: unknown }
  | { type: 'unknown_rom'; rom_title: string; rom_hash: string };

interface Session {
  ws: WebSocket;
  profile: string;
  saveId: number | null;
  enabled: string[];
  lastPing: number;
}

let wss: WebSocketServer | null = null;
let session: Session | null = null;
const listeners = new Set<(ev: CoachEvent) => void>();

function broadcast(ev: CoachEvent): void {
  for (const l of listeners) { try { l(ev); } catch { /* swallow; SSE will drop */ } }
}

export function subscribeToCoachEvents(cb: (ev: CoachEvent) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getSession(): { profile: string; saveId: number | null; enabled: string[] } | null {
  return session ? { profile: session.profile, saveId: session.saveId, enabled: session.enabled } : null;
}

async function pickPort(desired: number): Promise<number> {
  for (let p = desired; p < desired + 10; p++) {
    const ok = await new Promise<boolean>((res) => {
      const probe = createServer();
      probe.once('error', () => res(false));
      probe.once('listening', () => { probe.close(() => res(true)); });
      probe.listen(p, '127.0.0.1');
    });
    if (ok) return p;
  }
  throw new Error(`No free port in range ${desired}..${desired + 9}`);
}

export async function startGameStateReader(existingHttp: HttpServer): Promise<number> {
  // v1: run on a SEPARATE port so ws traffic doesn't conflict with the Express
  // HTTP server (which also serves Vite dev assets in tauri dev). This keeps
  // the Lua script's URL simple and port-fallback self-contained.
  const desired = getConfig().coach.websocket_port;
  const port = await pickPort(desired);

  wss = new WebSocketServer({ host: '127.0.0.1', port });

  // Write chosen port so the Lua client can discover it.
  writeFileSync(join(paths.dataDir, '.coach-port'), String(port), 'utf-8');

  wss.on('connection', (ws) => {
    if (session) {
      ws.send(JSON.stringify({ type: 'busy' }));
      ws.close(1013, 'busy');
      return;
    }

    const onMessage = (raw: Buffer) => handleMessage(ws, raw.toString('utf-8'));
    ws.on('message', onMessage);
    ws.on('close', () => {
      if (session?.ws === ws) {
        session = null;
        broadcast({ type: 'coach_disconnected' });
      }
    });

    // 2s heartbeat timeout (client sends {type:"ping"} every 500ms)
    const hb = setInterval(() => {
      if (!session || session.ws !== ws) return clearInterval(hb);
      if (Date.now() - session.lastPing > 2000) {
        try { ws.terminate(); } catch { /* already gone */ }
        clearInterval(hb);
      }
    }, 500);
  });

  console.log(`[coach] WebSocket listening on 127.0.0.1:${port}`);
  return port;
}

function handleMessage(ws: WebSocket, raw: string): void {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'ping') {
    if (session?.ws === ws) session.lastPing = Date.now();
    return;
  }

  if (msg.type === 'hello') return handleHello(ws, msg);

  if (msg.type === 'event' && session?.ws === ws) return handleEvent(msg);
}

function handleHello(ws: WebSocket, hello: any): void {
  const { rom_title, rom_hash, trainer_id, secret_id } = hello;
  const override = getConfig().coach.rom_profile_overrides[rom_hash];
  const profile = override ? getProfile(override) : findProfile(rom_title || '', rom_hash || '');

  if (!profile) {
    ws.send(JSON.stringify({ type: 'unknown_rom', rom_title, rom_hash }));
    broadcast({ type: 'unknown_rom', rom_title, rom_hash });
    ws.close(1008, 'unknown rom');
    return;
  }

  // Match save by (trainer_id, secret_id) — may return null for new playthroughs
  const row = db.prepare(
    `SELECT id FROM save_files WHERE game = ? AND trainer_id = ? AND (secret_id = ? OR secret_id IS NULL) LIMIT 1`
  ).get(profile.game_id, trainer_id ?? null, secret_id ?? null) as { id: number } | undefined;
  const saveId = row?.id ?? null;

  const userEnabled = getConfig().coach.enabled_features;
  const enabled = computeEffectiveFeatures(profile.supported_features, profile.symbols as any, userEnabled);

  session = { ws, profile: profile.game_id, saveId, enabled, lastPing: Date.now() };

  ws.send(JSON.stringify({ type: 'welcome', enabled_features: enabled }));
  broadcast({ type: 'coach_connected', save_id: saveId, profile: profile.game_id, enabled });
}

function handleEvent(msg: any): void {
  // Each feature handler normalizes its raw RAM blob into a domain event.
  // For v1, feature-specific handlers live in separate files (tasks 17, 19, 21);
  // this shell just dispatches.
  const handler = featureHandlers[msg.feature];
  if (handler) handler(msg.data);
}

type FeatureHandler = (raw: unknown) => void;
const featureHandlers: Record<string, FeatureHandler> = {};

export function registerFeatureHandler(featureId: string, fn: FeatureHandler): void {
  featureHandlers[featureId] = fn;
}

export function broadcastCoachEvent(ev: CoachEvent): void {
  broadcast(ev);
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd server && bun tsc --noEmit 2>&1 | head -20`
Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/gameStateReader.ts
git commit -m "feat(coach): WebSocket server skeleton with handshake + port fallback"
```

---

### Task 9: SSE route `/api/coach/events`

**Files:**
- Create: `server/src/routes/coach.ts`
- Modify: `server/src/index.ts` (register the route + start the WS server)

- [ ] **Step 1: Write the route**

Create `server/src/routes/coach.ts`:

```ts
import { Router, Request, Response } from 'express';
import { subscribeToCoachEvents, getSession } from '../services/gameStateReader.js';
import { getConfig, setConfig } from '../services/config.js';
import { loadAllProfiles } from '../services/coachProfiles.js';

const router = Router();

// GET /api/coach/events — SSE feed of coach domain events.
router.get('/events', (_req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const send = (ev: unknown) => { res.write(`data: ${JSON.stringify(ev)}\n\n`); };

  // Send initial state snapshot so late subscribers know the session.
  const current = getSession();
  if (current) send({ type: 'coach_connected', save_id: current.saveId, profile: current.profile, enabled: current.enabled });

  const unsubscribe = subscribeToCoachEvents(send);
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { /* peer gone */ } }, 15000);

  // Handle client disconnect
  const req = _req as any;
  req.on('close', () => { unsubscribe(); clearInterval(hb); });
});

// GET /api/coach/status — one-shot state (for non-SSE clients / debugging)
router.get('/status', (_req, res) => {
  res.json({
    connected: getSession() != null,
    session: getSession(),
    profiles: loadAllProfiles().map(p => ({ game_id: p.game_id, display_name: p.display_name })),
  });
});

// GET /api/coach/settings — read coach prefs
router.get('/settings', (_req, res) => { res.json(getConfig().coach); });

// PATCH /api/coach/settings — update coach prefs (partial)
router.patch('/settings', (req, res) => {
  const current = getConfig();
  const patch = req.body ?? {};
  const next = { ...current, coach: { ...current.coach, ...patch } };
  setConfig(next);
  res.json(next.coach);
});

export default router;
```

- [ ] **Step 2: Register in `server/src/index.ts`**

Find the block where other routes are registered (search for `app.use('/api/...` near the route imports). Add:

```ts
const { default: coachRouter } = await import('./routes/coach.js');
app.use('/api/coach', coachRouter);
```

Then, after the `app.listen(...)` block (around line 259), add:

```ts
const { startGameStateReader } = await import('./services/gameStateReader.js');
await startGameStateReader(server);
```

- [ ] **Step 3: Boot server + probe**

Run (in one shell): `cd server && bun run src/index.ts --port 3099 --data-dir /Users/shawnmccourt/WebstormProjects/alacrity`

In another shell: `curl -sN http://127.0.0.1:3099/api/coach/status | head -c 500`
Expected: JSON with `"connected": false` and a `profiles` array containing Crystal.

Then: `curl -sN -H 'Accept: text/event-stream' http://127.0.0.1:3099/api/coach/events &` — should print nothing initially (connected but idle). Kill with `kill %1`.

- [ ] **Step 4: Kill server and commit**

```bash
git add server/src/routes/coach.ts server/src/index.ts
git commit -m "feat(coach): SSE /api/coach/events + /status + /settings routes"
```

---

### Task 10: `coach.lua` — ROM detection + WebSocket client

**Files:**
- Create: `server/resources/scripts/coach/main.lua`

- [ ] **Step 1: Write the Lua entry point**

Create `server/resources/scripts/coach/main.lua`:

```lua
-- Alacrity Coach - mGBA entry point
-- Loaded via: mgba-qt --script /path/to/main.lua
--
-- Responsibilities:
--   1. Detect the ROM (title + hash)
--   2. Read the WebSocket port from ~/.alacrity/data/.coach-port (falls back to 54321)
--   3. Open the WebSocket, send handshake, receive enabled_features
--   4. Load each enabled feature module, which registers a per-frame callback
--   5. Each frame: invoke registered callbacks, which diff & emit events

local socket = require("socket")
local PROTOCOL_VERSION = 1

-- Feature modules registered via register_feature(id, module)
local modules = {}
local frame_callbacks = {}

local function read_rom_title()
  -- GB/GBC cartridge title lives at ROM 0x0134..0x0143 (uppercase ASCII).
  local buf = {}
  for i = 0x0134, 0x0143 do
    local byte = emu:read8(0x8000000 + i)  -- ROM is mapped at 0x08000000 on mGBA's address space
    if byte == 0 or byte > 0x7F then break end
    buf[#buf + 1] = string.char(byte)
  end
  return table.concat(buf)
end

local function read_trainer_and_secret(profile)
  local tid_addr = tonumber(profile.symbols.trainer_id, 16)
  local sid_addr = tonumber(profile.symbols.secret_id, 16)
  if not tid_addr or not sid_addr then return nil, nil end
  local tid = emu:read8(tid_addr) * 256 + emu:read8(tid_addr + 1)
  local sid = emu:read8(sid_addr) * 256 + emu:read8(sid_addr + 1)
  return tid, sid
end

-- ── Port discovery ───────────────────────────────────────────────────────
local function read_port_file()
  -- We try a small set of known candidate paths; Alacrity writes the file to
  -- <dataDir>/.coach-port. Users with custom data dirs can set ALACRITY_PORT.
  local env_port = os.getenv("ALACRITY_PORT")
  if env_port then return tonumber(env_port) end

  local home = os.getenv("HOME") or os.getenv("USERPROFILE") or "."
  local candidates = {
    home .. "/.alacrity/.coach-port",
    home .. "/Library/Application Support/Alacrity/.coach-port",
    home .. "/WebstormProjects/alacrity/.coach-port",
  }
  for _, path in ipairs(candidates) do
    local f = io.open(path, "r")
    if f then
      local port = tonumber(f:read("*l"))
      f:close()
      if port then return port end
    end
  end
  return 54321
end

-- ── WebSocket (raw, no external library — mGBA bundles luasocket) ───────
-- We implement a minimal client-side WebSocket handshake + frame parser.

local ws = { sock = nil, connected = false, buffer = "" }

local function b64(s)
  local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  return ((s:gsub('.', function(x)
    local r,b='',x:byte()
    for i=8,1,-1 do r=r..(b%2^i-b%2^(i-1)>0 and '1' or '0') end
    return r
  end)..'0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
    if (#x < 6) then return '' end
    local c=0
    for i=1,6 do c=c+(x:sub(i,i)=='1' and 2^(6-i) or 0) end
    return b:sub(c+1,c+1)
  end)..({ '', '==', '=' })[#s%3+1])
end

function ws:connect(host, port)
  self.sock = socket.tcp()
  self.sock:settimeout(1)
  local ok, err = self.sock:connect(host, port)
  if not ok then return nil, err end
  local key = b64(string.char(math.random(0,255), math.random(0,255), math.random(0,255), math.random(0,255),
                              math.random(0,255), math.random(0,255), math.random(0,255), math.random(0,255),
                              math.random(0,255), math.random(0,255), math.random(0,255), math.random(0,255),
                              math.random(0,255), math.random(0,255), math.random(0,255), math.random(0,255)))
  local req = "GET /coach HTTP/1.1\r\n" ..
              "Host: " .. host .. ":" .. port .. "\r\n" ..
              "Upgrade: websocket\r\nConnection: Upgrade\r\n" ..
              "Sec-WebSocket-Key: " .. key .. "\r\n" ..
              "Sec-WebSocket-Version: 13\r\n\r\n"
  self.sock:send(req)
  -- Consume handshake response (terminates on \r\n\r\n)
  local headers = {}
  repeat
    local line = self.sock:receive("*l")
    if not line then return nil, "handshake failed" end
    table.insert(headers, line)
  until line == ""
  self.sock:settimeout(0) -- nonblocking from now on
  self.connected = true
  return true
end

-- Simple server-to-client frame read (text only, unmasked from server).
function ws:read_message()
  if not self.connected then return nil end
  local chunk, err = self.sock:receive(2048)
  if chunk then self.buffer = self.buffer .. chunk end
  if #self.buffer < 2 then return nil end

  local b1 = self.buffer:byte(1)
  local b2 = self.buffer:byte(2)
  local opcode = b1 % 16
  local len = b2 % 128
  local header_len = 2
  if len == 126 then
    if #self.buffer < 4 then return nil end
    len = self.buffer:byte(3) * 256 + self.buffer:byte(4)
    header_len = 4
  end
  if #self.buffer < header_len + len then return nil end
  local payload = self.buffer:sub(header_len + 1, header_len + len)
  self.buffer = self.buffer:sub(header_len + len + 1)
  if opcode == 8 then self.connected = false; return nil end
  return payload
end

function ws:send_text(payload)
  if not self.connected then return end
  local len = #payload
  local header
  if len < 126 then
    header = string.char(0x81, 0x80 + len)
  else
    header = string.char(0x81, 0x80 + 126, math.floor(len / 256), len % 256)
  end
  -- Masked frames (client → server must be masked per RFC 6455)
  local mask = string.char(math.random(0,255), math.random(0,255), math.random(0,255), math.random(0,255))
  local masked = {}
  for i = 1, #payload do
    masked[i] = string.char(payload:byte(i) ~ mask:byte(((i - 1) % 4) + 1))
  end
  self.sock:send(header .. mask .. table.concat(masked))
end

-- ── Lifecycle ─────────────────────────────────────────────────────────────

local function json_encode(t)
  -- Minimal; enough for our handshake + event envelopes.
  local function encode(v)
    if type(v) == "table" then
      local parts = {}
      for k, x in pairs(v) do
        parts[#parts + 1] = '"' .. k .. '":' .. encode(x)
      end
      return "{" .. table.concat(parts, ",") .. "}"
    elseif type(v) == "string" then
      return '"' .. v:gsub('"', '\\"') .. '"'
    elseif type(v) == "number" or type(v) == "boolean" then
      return tostring(v)
    elseif v == nil then
      return "null"
    end
  end
  return encode(t)
end

function register_feature(id, mod)
  modules[id] = mod
  if mod.on_frame then frame_callbacks[id] = mod.on_frame end
end

local function load_profile_and_modules(profile_name, enabled)
  local profile = dofile(script.dir .. "/profiles/" .. profile_name .. ".lua")
  for _, feat in ipairs(enabled) do
    local ok, mod = pcall(dofile, script.dir .. "/modules/" .. feat .. ".lua")
    if ok and mod and mod.init then
      mod.init(profile, function(evt, data)
        ws:send_text(json_encode({ type = "event", feature = feat, data = data }))
      end)
      register_feature(feat, mod)
    end
  end
end

local function tick()
  if not ws.connected then return end
  local msg
  repeat
    msg = ws:read_message()
    -- No JSON parser in stock Lua; we only care about enabling features.
    -- Welcome message is `{"type":"welcome","enabled_features":["a","b"]}`.
    if msg and msg:find('"welcome"') then
      local list_raw = msg:match('"enabled_features"%s*:%s*%[(.-)%]') or ""
      local enabled = {}
      for name in list_raw:gmatch('"([^"]+)"') do enabled[#enabled + 1] = name end
      -- Profile name derived from the ROM title match done server-side and
      -- echoed back via a second message; for now we use the local profile
      -- filename derived from ROM title.
      local profile_file = "crystal"  -- bootstrap; extended when multi-profile ships
      load_profile_and_modules(profile_file, enabled)
    elseif msg and msg:find('"busy"') then
      print("[coach] server busy, retrying in 5s")
      ws.connected = false
    end
  until not msg

  for _, cb in pairs(frame_callbacks) do
    local ok, err = pcall(cb)
    if not ok then print("[coach] module error:", err) end
  end
end

local function start()
  math.randomseed(os.time())
  local port = read_port_file()
  local ok, err = ws:connect("127.0.0.1", port)
  if not ok then
    print("[coach] connect failed:", err, "- retrying in 5s")
    return
  end

  local title = read_rom_title()
  -- Hash not implemented for v1; empty string. Server matches by title.
  local hello = {
    type = "hello",
    protocol_version = PROTOCOL_VERSION,
    rom_title = title,
    rom_hash = "",
    trainer_id = 0,
    secret_id = 0,
  }
  ws:send_text(json_encode(hello))
  print("[coach] connected to Alacrity at 127.0.0.1:" .. port .. " rom=" .. title)
end

callbacks:add("start", start)
callbacks:add("frame", tick)

-- Heartbeat 500ms; mGBA frame rate is 59.7Hz so every ~30 frames is ~500ms.
local frame_count = 0
callbacks:add("frame", function()
  frame_count = frame_count + 1
  if frame_count >= 30 then
    frame_count = 0
    if ws.connected then ws:send_text('{"type":"ping"}') end
  end
end)
```

> Known limitation: stock Lua has no cryptographic-grade JSON parser. The server always speaks back well-formed JSON with a predictable structure, so string-matching on `"welcome"` is sufficient for v1. If a richer parser becomes needed, `rxi/json.lua` can be vendored into the repo (single file).

- [ ] **Step 2: Create scaffolded profile + modules (empty stubs)**

Create `server/resources/scripts/coach/profiles/crystal.lua`:

```lua
-- Crystal-specific read helpers. For v1 the profile is mostly static metadata;
-- each module reads the addresses it cares about from the JSON profile.
return {
  game_id = "crystal",
  symbols = {
    player_map_group = 0xD148,
    player_map_number = 0xD149,
    player_x = 0xD164,
    player_y = 0xD165,
    player_facing = 0xD166,
    event_flags = 0xD7B7,
    event_flag_count = 2400,
    time_of_day = 0xD269,
    current_tile_collision = 0xC2FA,
  },
}
```

Create stub module files so the require chain can succeed even if feature modules aren't fleshed out yet:

`server/resources/scripts/coach/modules/player.lua`:

```lua
-- Filled in during Task 19.
return { init = function(_, _) end, on_frame = function() end }
```

Do the same one-liner stub for `modules/flags.lua` and `modules/tile.lua` (Tasks 21 & 24 fill them in).

- [ ] **Step 3: Commit**

```bash
git add server/resources/scripts/coach/
git commit -m "feat(coach): add coach.lua + scaffolded profile/module files"
```

---

### Task 11: End-to-end handshake smoke test

**Files:**
- None (manual verification)

- [ ] **Step 1: Boot server**

Run: `cd /Users/shawnmccourt/WebstormProjects/alacrity/src-tauri && bun run tauri dev &`

Wait ~15s. Confirm log line `[coach] WebSocket listening on 127.0.0.1:54321` (or fallback port).

- [ ] **Step 2: Simulate a coach handshake with `websocat`**

Install if missing: `brew install websocat`

Run:

```bash
echo '{"type":"hello","protocol_version":1,"rom_title":"PM_CRYSTAL","rom_hash":"","trainer_id":0,"secret_id":0}' | websocat -n1 ws://127.0.0.1:54321/coach
```

Expected stdout: `{"type":"welcome","enabled_features":["player_marker","flag_sync","encounter_panel"]}` (or a subset if some features' required symbols are missing).

- [ ] **Step 3: Watch SSE**

In another shell:

```bash
curl -sN http://127.0.0.1:3001/api/coach/events &
```

Re-run the websocat command. The SSE stream should print a line like:

```
data: {"type":"coach_connected","save_id":null,"profile":"crystal","enabled":["player_marker","flag_sync","encounter_panel"]}
```

Kill the curl with `kill %1`.

- [ ] **Step 4: No commit (manual verification only)**

If anything fails: investigate and fix. Common issues — address typos in the profile JSON (retype carefully), port collision (bump `coach.websocket_port` default), mGBA Lua missing `socket` (requires mGBA ≥ 0.10).

---

## Phase 1b — `player_marker` feature

### Task 12: Seed `coord_calibrations` with Crystal landmarks

**Files:**
- Create: `server/src/seeds/data/coord-calibrations/crystal.json`
- Create: `server/src/seeds/seedCoordCalibrations.ts`
- Modify: `server/src/seeds/index.ts` (or wherever `seedAll` lives — the entry point that runs seed functions on startup)

- [ ] **Step 1: Find the seed entry point**

Run: `grep -rn "seedAll\|seedRegionData\|export.*seed" server/src/seeds/index.ts server/src/seed.ts 2>/dev/null | head`

- [ ] **Step 2: Write the seed data**

Create `server/src/seeds/data/coord-calibrations/crystal.json` with hand-placed landmarks (values taken from `johto-locations.json` — towns the user has already calibrated):

```json
{
  "game_id": "crystal",
  "map_key": "johto",
  "landmarks": [
    { "label": "New Bark Town", "ram_map_group": 24, "ram_map_number": 1, "ram_x": 4, "ram_y": 5, "our_x": 0.5042, "our_y": 0.6500 },
    { "label": "Violet City",   "ram_map_group": 10, "ram_map_number": 1, "ram_x": 10, "ram_y": 9, "our_x": 0.3736, "our_y": 0.4844 },
    { "label": "Goldenrod City", "ram_map_group": 3, "ram_map_number": 1, "ram_x": 10, "ram_y": 30, "our_x": 0.2417, "our_y": 0.6094 },
    { "label": "Ecruteak City",  "ram_map_group": 2, "ram_map_number": 1, "ram_x": 22, "ram_y": 11, "our_x": 0.2806, "our_y": 0.3625 },
    { "label": "Olivine City",   "ram_map_group": 1, "ram_map_number": 1, "ram_x": 10, "ram_y": 19, "our_x": 0.1292, "our_y": 0.4344 },
    { "label": "Mahogany Town",  "ram_map_group": 7, "ram_map_number": 1, "ram_x": 14, "ram_y": 9, "our_x": 0.5000, "our_y": 0.3125 }
  ]
}
```

> These are bootstrap values. Exact pret `ram_map_group`/`ram_map_number` constants live in `data/maps/maps.asm` and will be verified in Task 18 — for now the seed is a placeholder that the transform code can consume.

- [ ] **Step 3: Write the seeder**

Create `server/src/seeds/seedCoordCalibrations.ts`:

```ts
import db from '../db.js';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';

/**
 * Computes a 2D affine transform (3 × 2 matrix) mapping
 * (ram_map_x_relative_to_region_origin, ram_map_y_relative) → (our_x, our_y).
 *
 * For v1 we use the simplest possible model: least-squares affine fit over all
 * landmarks, using the **absolute world-tile position** of each landmark on
 * the stitched Johto overworld as input. For Task 18 we derive world-tile
 * position by parsing pret's map layout; until then, the seeder just stores a
 * stub identity matrix — live data is useless without Task 18 wiring anyway.
 */
export function seedCoordCalibrations(): void {
  const dir = join(paths.resourcesDir ?? process.cwd(), 'server', 'src', 'seeds', 'data', 'coord-calibrations');
  let files: string[] = [];
  try { files = readdirSync(dir).filter(f => f.endsWith('.json')); } catch { return; }

  const upsert = db.prepare(`
    INSERT INTO coord_calibrations (game_id, map_key, landmarks, affine_matrix, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      map_key = excluded.map_key,
      landmarks = excluded.landmarks,
      affine_matrix = excluded.affine_matrix,
      updated_at = excluded.updated_at
  `);

  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as {
      game_id: string; map_key: string; landmarks: any[];
    };
    const matrix = JSON.stringify([[1, 0, 0], [0, 1, 0]]);  // identity; replaced by Task 18
    upsert.run(raw.game_id, raw.map_key, JSON.stringify(raw.landmarks), matrix, Date.now());
  }
  console.log(`[coach] Seeded coord_calibrations for ${files.length} game(s).`);
}
```

- [ ] **Step 4: Wire into startup**

Find the module in `server/src/seeds/` that runs seed functions on boot (likely the `seedRegionData` orchestrator or an `index.ts`). Add a call to `seedCoordCalibrations()` alongside existing seeds. If there's no shared index, add the import + call to `server/src/seed.ts`.

- [ ] **Step 5: Boot + verify**

Run: `cd src-tauri && bun run tauri dev &`, wait for boot.
Then: `sqlite3 ../data/pokemon.db "SELECT game_id, map_key, length(landmarks) FROM coord_calibrations"`
Expected: one row `crystal|johto|<integer>`.

- [ ] **Step 6: Commit**

```bash
git add server/src/seeds/
git commit -m "feat(coach): seed coord_calibrations with Crystal landmark bootstrap"
```

---

### Task 13: Affine transform utility

**Files:**
- Create: `server/src/services/coordTransform.ts`

- [ ] **Step 1: Write the utility**

Create `server/src/services/coordTransform.ts`:

```ts
/**
 * Least-squares 2D affine fit over landmark pairs. Given N ≥ 3 landmarks
 * mapping (world_x, world_y) → (our_x, our_y), fits [[a,b,tx],[c,d,ty]] such
 * that our ≈ A * world + t. Used for Level-1 coord calibration.
 *
 * World coordinates are in "overworld tiles from the origin of the stitched
 * Johto image" — computed by Task 18's warps-asm parse step. Our coords are
 * normalized [0..1] against the world-map image width/height.
 */
export interface Landmark {
  label: string;
  world_x: number;
  world_y: number;
  our_x: number;
  our_y: number;
}

export type Affine = [[number, number, number], [number, number, number]];

export function fitAffine(landmarks: Landmark[]): Affine {
  if (landmarks.length < 3) throw new Error('Need ≥3 landmarks to fit affine transform');
  // Solve the 6-parameter least-squares problem via normal equations.
  // Split X and Y independently: our_x = a*world_x + b*world_y + tx, similarly for y.
  const solveOne = (vals: number[]): [number, number, number] => {
    // M * [p,q,r]^T = vals, where each row is [world_x, world_y, 1].
    let s11=0,s12=0,s13=0,s22=0,s23=0,s33=0,v1=0,v2=0,v3=0;
    for (let i = 0; i < landmarks.length; i++) {
      const { world_x: wx, world_y: wy } = landmarks[i];
      s11 += wx*wx; s12 += wx*wy; s13 += wx;
      s22 += wy*wy; s23 += wy;
      s33 += 1;
      v1  += wx*vals[i]; v2 += wy*vals[i]; v3 += vals[i];
    }
    // 3×3 symmetric matrix solve (Cramer's rule is fine for a 3×3).
    const det =
      s11*(s22*s33 - s23*s23) - s12*(s12*s33 - s23*s13) + s13*(s12*s23 - s22*s13);
    if (Math.abs(det) < 1e-12) throw new Error('Degenerate landmarks (collinear)');
    const a = (v1*(s22*s33 - s23*s23) - s12*(v2*s33 - s23*v3) + s13*(v2*s23 - s22*v3)) / det;
    const b = (s11*(v2*s33 - s23*v3) - v1*(s12*s33 - s23*s13) + s13*(s12*v3 - v2*s13)) / det;
    const c = (s11*(s22*v3 - s23*v2) - s12*(s12*v3 - s23*v1) + v1*(s12*s23 - s22*s13)) / det;
    return [a, b, c];
  };
  const xs = landmarks.map(l => l.our_x);
  const ys = landmarks.map(l => l.our_y);
  return [solveOne(xs), solveOne(ys)];
}

export function applyAffine(a: Affine, worldX: number, worldY: number): { our_x: number; our_y: number } {
  return {
    our_x: a[0][0]*worldX + a[0][1]*worldY + a[0][2],
    our_y: a[1][0]*worldX + a[1][1]*worldY + a[1][2],
  };
}
```

- [ ] **Step 2: Verify with a synthetic test**

Run:

```bash
cd server && bun -e "
import { fitAffine, applyAffine } from './src/services/coordTransform.js';
const lms = [
  { label:'a', world_x: 0, world_y: 0, our_x: 0.1, our_y: 0.1 },
  { label:'b', world_x: 100, world_y: 0, our_x: 0.6, our_y: 0.1 },
  { label:'c', world_x: 0, world_y: 100, our_x: 0.1, our_y: 0.9 },
];
const a = fitAffine(lms);
console.log(JSON.stringify(a));
console.log('transformed (50,50):', applyAffine(a, 50, 50));
"
```

Expected: affine matrix roughly `[[0.005,0,0.1],[0,0.008,0.1]]` and transformed output `our_x≈0.35, our_y≈0.5`.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/coordTransform.ts
git commit -m "feat(coach): affine fit utility for Level-1 coord calibration"
```

---

### Task 14: Warp + overworld layout parse (build-time)

**Files:**
- Create: `server/src/scripts/build-johto-warps.ts`
- Create (output): `server/src/seeds/data/johto-warps.json`

- [ ] **Step 1: Write the parser**

Create `server/src/scripts/build-johto-warps.ts`:

```ts
/**
 * Parses pret-pokecrystal's data/maps/warps.asm and data/maps/maps.asm to
 * build a lookup:
 *   - interior (map_group, map_number) → entrance (map_group, map_number, x, y)
 *   - outdoor (map_group, map_number) → (world_tile_x, world_tile_y) origin on
 *     the stitched Johto overworld
 *
 * Only outdoor maps in the Johto region group for now.
 *
 * Writes server/src/seeds/data/johto-warps.json.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CACHE = join(process.cwd(), '.data-cache', 'pret-pokecrystal');

function readPret(relPath: string): string {
  return readFileSync(join(CACHE, relPath), 'utf-8');
}

// Each warp_def line: "warp_def x, y, target_warp, MAP_DEST"
function parseWarps(mapAsm: string): Array<{ x: number; y: number; target_warp: number; dest: string }> {
  const out: Array<{ x: number; y: number; target_warp: number; dest: string }> = [];
  const re = /warp_def\s+(\d+),\s+(\d+),\s+(\d+),\s+(\w+)/g;
  let m;
  while ((m = re.exec(mapAsm))) {
    out.push({ x: parseInt(m[1]), y: parseInt(m[2]), target_warp: parseInt(m[3]), dest: m[4] });
  }
  return out;
}

// Map_header macros: "map MAP_NAME, ..."  and later "map_const MAP_NAME, w, h"
// Both together give us block dims (1 block = 4 tiles = 32 px) per map.

function main(): void {
  // v1 ships with the 6 hand-coded outdoor origins below — enough to fit the
  // affine transform for the calibration landmarks in Task 12. A full parse
  // of maps.asm + connections.asm to cover every outdoor map is deferred to
  // the post-v1 Level-2 calibration work (see spec §7); the code path
  // through coordTransform.ts does not change when that happens, only this
  // dict grows.
  const outdoorOrigins: Record<string, { world_x: number; world_y: number }> = {
    'NEW_BARK_TOWN':    { world_x: 384, world_y: 288 },
    'VIOLET_CITY':      { world_x: 224, world_y: 192 },
    'GOLDENROD_CITY':   { world_x: 128, world_y: 320 },
    'ECRUTEAK_CITY':    { world_x: 176, world_y: 128 },
    'OLIVINE_CITY':     { world_x:  64, world_y: 160 },
    'MAHOGANY_TOWN':    { world_x: 240, world_y: 128 },
  };

  // Collect interior warp entries for Goldenrod Gym, Radio Tower, etc.
  const interiors: Record<string, { entrance_map: string; x: number; y: number }> = {};
  const interiorMaps = ['GoldenrodGym', 'RadioTower1F', 'RadioTower2F', 'RadioTower3F', 'RadioTower4F', 'RadioTower5F',
                        'TeamRocketBaseB1F', 'TeamRocketBaseB2F', 'TeamRocketBaseB3F', 'GoldenrodGameCorner'];
  for (const name of interiorMaps) {
    try {
      const asm = readPret(`maps/${name}.asm`);
      const warps = parseWarps(asm);
      // The first warp in an interior is typically its main entrance, exiting
      // back to the parent overworld tile. We use that as the anchor.
      const outbound = warps.find(w => !w.dest.match(/^(GoldenrodGym|RadioTower|TeamRocketBase|Goldenrod)/));
      if (outbound) interiors[name] = { entrance_map: outbound.dest, x: outbound.x, y: outbound.y };
    } catch { /* missing asm; skip */ }
  }

  const outPath = join(process.cwd(), 'server', 'src', 'seeds', 'data', 'johto-warps.json');
  writeFileSync(outPath, JSON.stringify({ outdoorOrigins, interiors }, null, 2) + '\n', 'utf-8');
  console.log(`[warps] Wrote ${Object.keys(outdoorOrigins).length} outdoors + ${Object.keys(interiors).length} interiors to ${outPath}`);
}

main();
```

- [ ] **Step 2: Run it**

Run: `cd server && bun run src/scripts/build-johto-warps.ts`
Expected: `[warps] Wrote 6 outdoors + N interiors to .../johto-warps.json`.

- [ ] **Step 3: Verify output**

Run: `jq 'keys' server/src/seeds/data/johto-warps.json`
Expected: `["interiors", "outdoorOrigins"]`.

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/build-johto-warps.ts server/src/seeds/data/johto-warps.json
git commit -m "build(coach): generate Johto warps + outdoor-origin lookup"
```

---

### Task 15: Finalize the affine matrix in the seeder

**Files:**
- Modify: `server/src/seeds/seedCoordCalibrations.ts`

- [ ] **Step 1: Update seeder to compute real matrix**

Replace the identity-matrix line in `seedCoordCalibrations.ts` with an actual `fitAffine` call using the outdoor-origin lookup:

```ts
import { fitAffine, type Landmark } from '../services/coordTransform.js';

// ... in the file iteration loop:
const warps = JSON.parse(readFileSync(join(dir, '..', 'johto-warps.json'), 'utf-8'));
const points: Landmark[] = raw.landmarks.map((lm: any) => {
  // Find outdoor origin for this landmark's map. The JSON landmark gives us
  // (ram_map_group, ram_map_number, ram_x, ram_y) - we lookup the origin by
  // the known label→asm-name table.
  const asmName = LANDMARK_TO_ASM[lm.label] ?? lm.label.replace(/\s/g, '_').toUpperCase();
  const origin = warps.outdoorOrigins[asmName];
  if (!origin) throw new Error(`No outdoor origin for landmark "${lm.label}"`);
  return {
    label: lm.label,
    world_x: origin.world_x + lm.ram_x,
    world_y: origin.world_y + lm.ram_y,
    our_x: lm.our_x,
    our_y: lm.our_y,
  };
});

const matrix = JSON.stringify(fitAffine(points));
```

Add a mapping constant at the top of the file:

```ts
const LANDMARK_TO_ASM: Record<string, string> = {
  'New Bark Town': 'NEW_BARK_TOWN',
  'Violet City': 'VIOLET_CITY',
  'Goldenrod City': 'GOLDENROD_CITY',
  'Ecruteak City': 'ECRUTEAK_CITY',
  'Olivine City': 'OLIVINE_CITY',
  'Mahogany Town': 'MAHOGANY_TOWN',
};
```

- [ ] **Step 2: Re-run seed + verify**

Run: `cd src-tauri && bun run tauri dev &`. Wait for boot.

Then: `sqlite3 ../data/pokemon.db "SELECT affine_matrix FROM coord_calibrations WHERE game_id='crystal'"`
Expected: a non-identity 2×3 matrix like `[[0.0012,0.0004,...],[...]]`.

- [ ] **Step 3: Commit**

```bash
git add server/src/seeds/seedCoordCalibrations.ts
git commit -m "feat(coach): compute affine matrix from landmarks on seed"
```

---

### Task 16: Lua — `player.lua` module

**Files:**
- Modify: `server/resources/scripts/coach/modules/player.lua` (replace stub from Task 10)

- [ ] **Step 1: Implement the module**

Replace the file contents with:

```lua
-- player.lua — reads player position each frame, emits player_moved on change.
local last = { map_group = nil, map_number = nil, x = nil, y = nil, facing = nil }
local sym
local emit

local FACING = { [0] = "down", [4] = "up", [8] = "left", [0xC] = "right" }

local function on_frame()
  local mg = emu:read8(sym.player_map_group)
  local mn = emu:read8(sym.player_map_number)
  local px = emu:read8(sym.player_x)
  local py = emu:read8(sym.player_y)
  local pf = emu:read8(sym.player_facing)

  -- Validate: map group non-zero, coordinates reasonable (<200 tiles).
  if mg == 0 or mg == 0xFF or px > 200 or py > 200 then return end

  if mg ~= last.map_group or mn ~= last.map_number or px ~= last.x or py ~= last.y or pf ~= last.facing then
    last.map_group, last.map_number, last.x, last.y, last.facing = mg, mn, px, py, pf
    emit("player_moved", {
      map_group = mg,
      map_number = mn,
      tile_x = px,
      tile_y = py,
      facing = FACING[pf] or "down",
    })
  end
end

local function init(profile, emit_fn)
  sym = profile.symbols
  emit = emit_fn
end

return { init = init, on_frame = on_frame }
```

- [ ] **Step 2: No commit yet — pairs with Task 17.**

---

### Task 17: Server — `player_moved` handler

**Files:**
- Create: `server/src/services/coachHandlers/playerHandler.ts`
- Modify: `server/src/services/gameStateReader.ts` (register handler on boot)

- [ ] **Step 1: Write the handler**

Create `server/src/services/coachHandlers/playerHandler.ts`:

```ts
import db from '../../db.js';
import { applyAffine, type Affine } from '../coordTransform.js';
import { broadcastCoachEvent, type CoachEvent } from '../gameStateReader.js';

/**
 * Converts raw Lua-emitted player_moved data into a domain event carrying
 * normalized our-map coordinates for the live marker.
 *
 * Interior maps (where `map_group` does not appear in outdoorOrigins lookup)
 * snap the dot to the entrance warp instead.
 */

interface WarpData {
  outdoorOrigins: Record<string, { world_x: number; world_y: number }>;
  interiors: Record<string, { entrance_map: string; x: number; y: number }>;
}

let cachedAffine: Affine | null = null;
let cachedWarps: WarpData | null = null;

function loadCache(): void {
  if (cachedAffine) return;
  const row = db.prepare(`SELECT affine_matrix FROM coord_calibrations WHERE game_id = 'crystal'`).get() as { affine_matrix: string } | undefined;
  if (!row) return;
  cachedAffine = JSON.parse(row.affine_matrix);
  const { readFileSync } = require('fs') as typeof import('fs');
  const { join } = require('path') as typeof import('path');
  const { paths } = require('../../paths.js') as typeof import('../../paths.js');
  cachedWarps = JSON.parse(readFileSync(join(paths.resourcesDir ?? process.cwd(), 'server', 'src', 'seeds', 'data', 'johto-warps.json'), 'utf-8'));
}

export function handlePlayerMoved(raw: any): void {
  loadCache();
  if (!cachedAffine || !cachedWarps) return;

  // For now, we hard-code a map-group-to-asm-name lookup that covers the 6
  // calibrated outdoor towns. This is extended in post-v1 phases.
  const mapKey = `GROUP_${raw.map_group}_MAP_${raw.map_number}`;
  // The real lookup: we pre-compute asm-name in a separate table during warps
  // parse. For MVP we use a minimal inline lookup covering the calibrated
  // towns (see johto-warps.json). Any non-matching map is treated as interior
  // and snapped to its last known outdoor location.
  const asmName = MAP_ID_TO_ASM[mapKey];
  const origin = asmName ? cachedWarps.outdoorOrigins[asmName] : undefined;
  let pixel: { our_x: number; our_y: number };
  let interiorInfo: { interior_name: string } | null = null;

  if (origin) {
    const worldX = origin.world_x + raw.tile_x;
    const worldY = origin.world_y + raw.tile_y;
    pixel = applyAffine(cachedAffine, worldX, worldY);
  } else if (asmName && cachedWarps.interiors[asmName]) {
    // Interior: snap to its outdoor entrance.
    const entrance = cachedWarps.interiors[asmName];
    const entranceOrigin = cachedWarps.outdoorOrigins[entrance.entrance_map];
    if (!entranceOrigin) return;
    pixel = applyAffine(cachedAffine, entranceOrigin.world_x + entrance.x, entranceOrigin.world_y + entrance.y);
    interiorInfo = { interior_name: asmName };
  } else {
    return;  // Unknown map — skip frame (no placeholder dot)
  }

  const ev: CoachEvent = {
    type: 'player_moved',
    map_id: asmName ?? mapKey,
    tile_x: raw.tile_x,
    tile_y: raw.tile_y,
    facing: raw.facing ?? 'down',
  } as any;
  // Include normalized pixel + interior hint in a superset shape; the SSE
  // consumer knows to read these optional fields.
  (ev as any).our_x = pixel.our_x;
  (ev as any).our_y = pixel.our_y;
  (ev as any).interior = interiorInfo;
  broadcastCoachEvent(ev);
}

// Inline lookup: populated from pret map constants. Covers the 6 calibrated
// outdoor towns for v1; a follow-up task extends to every outdoor map.
// Format: "GROUP_${group}_MAP_${number}" -> asm name from maps.asm.
const MAP_ID_TO_ASM: Record<string, string> = {
  'GROUP_24_MAP_1': 'NEW_BARK_TOWN',
  'GROUP_10_MAP_1': 'VIOLET_CITY',
  'GROUP_3_MAP_1':  'GOLDENROD_CITY',
  'GROUP_2_MAP_1':  'ECRUTEAK_CITY',
  'GROUP_1_MAP_1':  'OLIVINE_CITY',
  'GROUP_7_MAP_1':  'MAHOGANY_TOWN',
};
```

- [ ] **Step 2: Register handler on server boot**

In `server/src/services/gameStateReader.ts`, near the bottom of `startGameStateReader`, after `wss = new WebSocketServer(...)`, add:

```ts
const { handlePlayerMoved } = await import('./coachHandlers/playerHandler.js');
registerFeatureHandler('player_marker', handlePlayerMoved);
```

- [ ] **Step 3: Commit (pairs Task 16 + 17)**

```bash
git add server/src/services/coachHandlers/ server/src/services/gameStateReader.ts server/resources/scripts/coach/modules/player.lua
git commit -m "feat(coach): player_moved lua module + server handler with affine transform"
```

---

### Task 18: Client — `GameStateStore` React context

**Files:**
- Create: `client/src/state/gameState.tsx`

- [ ] **Step 1: Write the store**

Create `client/src/state/gameState.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TileType = 'grass' | 'water' | 'cave' | 'normal' | 'ledge' | 'door';

export interface PlayerState {
  map_id: string;
  tile_x: number;
  tile_y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  our_x?: number;
  our_y?: number;
  interior?: { interior_name: string } | null;
}

export interface CoachState {
  connected: boolean;
  profile: string | null;
  saveId: number | null;
  enabledFeatures: Set<string>;
  player: PlayerState | null;
  currentTile: TileType | null;
  liveFlagReport: any | null;
}

const DEFAULT: CoachState = {
  connected: false,
  profile: null,
  saveId: null,
  enabledFeatures: new Set(),
  player: null,
  currentTile: null,
  liveFlagReport: null,
};

const GameStateContext = createContext<CoachState>(DEFAULT);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoachState>(DEFAULT);

  useEffect(() => {
    const url = new URL('/api/coach/events', window.location.origin);
    const es = new EventSource(url.toString());

    es.onmessage = (e) => {
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }
      setState(s => applyEvent(s, msg));
    };
    es.onerror = () => { /* EventSource auto-reconnects; no-op */ };

    return () => { es.close(); };
  }, []);

  return <GameStateContext.Provider value={state}>{children}</GameStateContext.Provider>;
}

function applyEvent(s: CoachState, ev: any): CoachState {
  switch (ev.type) {
    case 'coach_connected':
      return {
        ...s,
        connected: true,
        profile: ev.profile,
        saveId: ev.save_id,
        enabledFeatures: new Set(ev.enabled ?? []),
      };
    case 'coach_disconnected':
      return { ...DEFAULT };
    case 'player_moved':
      return {
        ...s,
        player: {
          map_id: ev.map_id,
          tile_x: ev.tile_x,
          tile_y: ev.tile_y,
          facing: ev.facing,
          our_x: ev.our_x,
          our_y: ev.our_y,
          interior: ev.interior ?? null,
        },
      };
    case 'tile_changed':
      return { ...s, currentTile: ev.tile_type };
    case 'flags_changed':
      return { ...s, liveFlagReport: ev.flag_report };
    default:
      return s;
  }
}

export function useCoachState(): CoachState { return useContext(GameStateContext); }
export function usePlayer(): PlayerState | null { return useContext(GameStateContext).player; }
export function useCurrentTile(): TileType | null { return useContext(GameStateContext).currentTile; }
export function useCoachFeature(id: string): boolean {
  return useContext(GameStateContext).enabledFeatures.has(id);
}

/**
 * Returns the live flag report from the coach if connected, else the passed-in
 * save-file-parsed report. Existing `flagReport` call-sites import this hook
 * and swap their direct use with the hook's return value.
 */
export function useEffectiveFlagReport(saveFlagReport: any): any {
  const live = useContext(GameStateContext).liveFlagReport;
  return useMemo(() => live ?? saveFlagReport, [live, saveFlagReport]);
}
```

- [ ] **Step 2: Wrap the guide page**

In `client/src/pages/Guide.tsx`, wrap the existing return JSX with `<GameStateProvider>`:

```tsx
import { GameStateProvider } from '@/state/gameState';

// at the top of the returned JSX
return (
  <GameStateProvider>
    {/* existing content */}
  </GameStateProvider>
);
```

- [ ] **Step 3: Verify compile**

Run: `cd client && bun tsc --noEmit 2>&1 | head -10`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/state/gameState.tsx client/src/pages/Guide.tsx
git commit -m "feat(coach): GameStateProvider + hooks (SSE subscriber + state)"
```

---

### Task 19: Client — `LivePlayerMarker` + `CoachStatusBadge`

**Files:**
- Create: `client/src/components/guide/LivePlayerMarker.tsx`
- Create: `client/src/components/guide/CoachStatusBadge.tsx`
- Modify: `client/src/pages/Guide.tsx` (render both components)

- [ ] **Step 1: Write `LivePlayerMarker`**

Create `client/src/components/guide/LivePlayerMarker.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { usePlayer } from '@/state/gameState';

interface Props { mapWidth: number; mapHeight: number; }

const ICON = L.divIcon({
  html: '<div class="live-player-dot"></div>',
  className: 'live-player-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function LivePlayerMarker({ mapWidth, mapHeight }: Props) {
  const player = usePlayer();
  const lastPos = useRef<{ our_x: number; our_y: number } | null>(null);

  const position = useMemo(() => {
    if (!player?.our_x || !player?.our_y) return null;
    return L.latLng(-player.our_y * mapHeight, player.our_x * mapWidth);
  }, [player?.our_x, player?.our_y, mapWidth, mapHeight]);

  useEffect(() => {
    if (player?.our_x && player?.our_y) lastPos.current = { our_x: player.our_x, our_y: player.our_y };
  }, [player?.our_x, player?.our_y]);

  if (!position) return null;
  return <Marker position={position} icon={ICON} />;
}
```

Add the CSS somewhere (e.g. append to `client/src/index.css`):

```css
.live-player-marker .live-player-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 2px white, 0 0 8px rgba(59, 130, 246, 0.8);
  animation: player-pulse 1.5s ease-in-out infinite;
}
@keyframes player-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
}
```

- [ ] **Step 2: Write `CoachStatusBadge`**

Create `client/src/components/guide/CoachStatusBadge.tsx`:

```tsx
import { useCoachState } from '@/state/gameState';

export function CoachStatusBadge() {
  const { connected, profile, enabledFeatures } = useCoachState();
  return (
    <div className="absolute top-2 left-2 z-50 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-background/80 backdrop-blur border border-border shadow-sm">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
      {connected ? (
        <span>
          Coach · {profile} · {enabledFeatures.size} feature{enabledFeatures.size === 1 ? '' : 's'}
        </span>
      ) : (
        <span className="text-muted-foreground">Coach disconnected</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render them in `Guide.tsx`**

Inside the `GameStateProvider` block in `Guide.tsx`:

- Import the two components.
- Render `<CoachStatusBadge />` somewhere inside the map container (as a sibling to the existing badge/pill area).
- Render `<LivePlayerMarker mapWidth={mapData.width} mapHeight={mapData.height} />` inside the `<GameMap>` children, alongside existing marker layers.

- [ ] **Step 4: Smoke-test**

Restart Tauri dev. With no coach connected: badge shows "Coach disconnected."

Then send a fake `coach_connected` event + a `player_moved` event via websocat to exercise the UI:

```bash
PORT=$(cat data/.coach-port)
(echo '{"type":"hello","protocol_version":1,"rom_title":"PM_CRYSTAL","rom_hash":"","trainer_id":0,"secret_id":0}';
 sleep 1;
 echo '{"type":"event","feature":"player_marker","data":{"map_group":3,"map_number":1,"tile_x":10,"tile_y":30,"facing":"down"}}';
 sleep 5) | websocat ws://127.0.0.1:$PORT/coach
```

Expected: badge turns green, blue pulsing dot appears near Goldenrod City.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/guide/LivePlayerMarker.tsx client/src/components/guide/CoachStatusBadge.tsx client/src/pages/Guide.tsx client/src/index.css
git commit -m "feat(coach): live player marker + status badge in guide"
```

---

## Phase 1c — `flag_sync` feature

### Task 20: Lua — `flags.lua` module

**Files:**
- Modify: `server/resources/scripts/coach/modules/flags.lua` (replace stub)

- [ ] **Step 1: Implement the module**

Replace file contents with:

```lua
-- flags.lua — reads the event-flag byte array every ~10 frames (6Hz) and
-- sends diffs to the server. Full dumps are sent on first read and on every
-- 300-frame interval (5s) as a safety net.

local sym, emit
local last_bytes = {}
local frame_count = 0
local last_full_send = 0
local FULL_DUMP_EVERY_FRAMES = 300

local function on_frame()
  frame_count = frame_count + 1
  if frame_count % 10 ~= 0 then return end

  local base = sym.event_flags
  local count = sym.event_flag_count
  local byte_count = math.ceil(count / 8)

  local changed_indices = {}
  local full_bytes = {}
  for i = 0, byte_count - 1 do
    local b = emu:read8(base + i)
    full_bytes[i] = b
    if last_bytes[i] ~= nil and last_bytes[i] ~= b then
      -- Collect changed bit indices for efficient diff emit.
      for bit = 0, 7 do
        local flag_idx = i * 8 + bit
        local old_set = (last_bytes[i] >> bit) % 2 == 1
        local new_set = (b >> bit) % 2 == 1
        if old_set ~= new_set then
          changed_indices[#changed_indices + 1] = flag_idx
          changed_indices[#changed_indices + 1] = new_set and 1 or 0
        end
      end
    end
  end

  local need_full = frame_count - last_full_send > FULL_DUMP_EVERY_FRAMES or next(last_bytes) == nil

  if need_full then
    -- Pack full byte array as hex string (compact over the wire).
    local hex_parts = {}
    for i = 0, byte_count - 1 do hex_parts[#hex_parts + 1] = string.format("%02x", full_bytes[i]) end
    emit("flags_changed", { kind = "full", count = count, bytes_hex = table.concat(hex_parts) })
    last_full_send = frame_count
  elseif #changed_indices > 0 then
    emit("flags_changed", { kind = "diff", indices = changed_indices })
  end

  last_bytes = full_bytes
end

local function init(profile, emit_fn)
  sym = profile.symbols
  emit = emit_fn
end

return { init = init, on_frame = on_frame }
```

- [ ] **Step 2: No commit yet — pairs with Task 21.**

---

### Task 21: Server — flag handler with FlagReport normalization

**Files:**
- Create: `server/src/services/coachHandlers/flagsHandler.ts`
- Modify: `server/src/services/gameStateReader.ts` (register handler)

- [ ] **Step 1: Write the handler**

Create `server/src/services/coachHandlers/flagsHandler.ts`:

```ts
import db from '../../db.js';
import { broadcastCoachEvent } from '../gameStateReader.js';

/**
 * Receives raw flag bytes from Lua and emits a FlagReport in the exact shape
 * the guide UI already consumes (matches server/src/routes/flags.ts output).
 * Maintains an in-memory cache of flag state to compose diffs into full
 * snapshots for broadcast.
 */

interface FlagsByLocation {
  [locationKey: string]: { total: number; set: number; flags: Array<{ index: number; set: boolean }> };
}

let flagCache: boolean[] = [];

// Flag-index -> location_key mapping, derived from the DB's flag definitions.
let flagLocationMap: Map<number, string> | null = null;

function loadFlagMap(): void {
  if (flagLocationMap) return;
  flagLocationMap = new Map();
  // The data/flags/crystal.json (shipped) maps flag_index -> location_key.
  // Existing path pattern: server/src/data/flags/crystal.json
  const { readFileSync } = require('fs') as typeof import('fs');
  const { join } = require('path') as typeof import('path');
  const { paths } = require('../../paths.js') as typeof import('../../paths.js');
  const raw = JSON.parse(readFileSync(join(paths.resourcesDir ?? process.cwd(), 'server', 'src', 'data', 'flags', 'crystal.json'), 'utf-8')) as any[];
  for (const entry of raw) {
    if (typeof entry.index === 'number' && typeof entry.location_key === 'string') {
      flagLocationMap.set(entry.index, entry.location_key);
    }
  }
}

function emitReport(): void {
  loadFlagMap();
  const byLoc: FlagsByLocation = {};
  flagCache.forEach((set, index) => {
    const locKey = flagLocationMap!.get(index);
    if (!locKey) return;
    if (!byLoc[locKey]) byLoc[locKey] = { total: 0, set: 0, flags: [] };
    byLoc[locKey].total++;
    if (set) byLoc[locKey].set++;
    byLoc[locKey].flags.push({ index, set });
  });
  broadcastCoachEvent({ type: 'flags_changed', flag_report: { flags_by_location: byLoc } });
}

export function handleFlagsChanged(raw: any): void {
  if (raw.kind === 'full') {
    flagCache = [];
    const hex: string = raw.bytes_hex;
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16);
      for (let b = 0; b < 8; b++) flagCache.push(((byte >> b) & 1) === 1);
    }
    emitReport();
  } else if (raw.kind === 'diff' && Array.isArray(raw.indices)) {
    for (let i = 0; i < raw.indices.length; i += 2) {
      const idx = raw.indices[i];
      const set = raw.indices[i + 1] === 1;
      if (idx >= 0 && idx < flagCache.length) flagCache[idx] = set;
    }
    emitReport();
  }
}
```

- [ ] **Step 2: Register handler**

In `gameStateReader.ts`, alongside the player handler registration:

```ts
const { handleFlagsChanged } = await import('./coachHandlers/flagsHandler.js');
registerFeatureHandler('flag_sync', handleFlagsChanged);
```

- [ ] **Step 3: Commit (pairs Tasks 20 + 21)**

```bash
git add server/src/services/coachHandlers/flagsHandler.ts server/src/services/gameStateReader.ts server/resources/scripts/coach/modules/flags.lua
git commit -m "feat(coach): flag_sync - lua diff reader + server FlagReport normalizer"
```

---

### Task 22: Client — wire `useEffectiveFlagReport` into existing call sites

**Files:**
- Modify: `client/src/pages/Guide.tsx`
- Modify: `client/src/components/guide/LocationDetail.tsx`

- [ ] **Step 1: Replace direct `flagReport` pass-through in Guide.tsx**

In `Guide.tsx`, find where `flagReport` is computed (from `api.flags.parse(...)`). Wrap with `useEffectiveFlagReport`:

```tsx
import { useEffectiveFlagReport } from '@/state/gameState';

// Existing:
// const { data: flagReport } = useQuery(... api.flags.parse ...);

// Replace the prop passed to LocationDetail + other consumers:
const saveFlagReport = flagReport;  // rename the query result
const effectiveFlagReport = useEffectiveFlagReport(saveFlagReport);

// Pass `effectiveFlagReport` to LocationDetail and other consumers instead of flagReport.
```

- [ ] **Step 2: Propagate naming consistency**

In `LocationDetail.tsx` and any child component that receives `flagReport` as a prop, no code changes are needed — the prop name stays `flagReport`, and `useEffectiveFlagReport` is called once at the top level, flowing down.

- [ ] **Step 3: Smoke test**

Restart Tauri dev. Simulate a full flag dump via websocat:

```bash
PORT=$(cat data/.coach-port)
HEX=$(python3 -c "import sys; sys.stdout.write('ff' * 300)")
(echo '{"type":"hello","protocol_version":1,"rom_title":"PM_CRYSTAL","rom_hash":"","trainer_id":0,"secret_id":0}';
 sleep 1;
 echo "{\"type\":\"event\",\"feature\":\"flag_sync\",\"data\":{\"kind\":\"full\",\"count\":2400,\"bytes_hex\":\"$HEX\"}}";
 sleep 5) | websocat ws://127.0.0.1:$PORT/coach
```

Expected: guide UI shows most/all items as completed (green ✓) while the test harness is running; reverts to save-file state when websocat exits.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Guide.tsx
git commit -m "feat(coach): Guide uses useEffectiveFlagReport (live overrides save)"
```

---

## Phase 1d — `encounter_panel` feature

### Task 23: Lua — `tile.lua` module

**Files:**
- Modify: `server/resources/scripts/coach/modules/tile.lua` (replace stub)

- [ ] **Step 1: Implement**

Replace file contents with:

```lua
-- tile.lua — reads current tile collision type + time-of-day bucket; emits
-- tile_changed events (debounced to 2 consecutive frames to suppress warp
-- blinks) and periodic time_changed events.

local sym, emit
local last_tile_type = nil
local last_tod = nil
local candidate = { type = nil, frames = 0 }

-- Crystal collision constants (from pret engine/overworld/collision.asm)
local TILE_TYPE = {
  [0x00] = "normal",  -- Land
  [0x01] = "ledge",
  [0x02] = "water",
  [0x03] = "grass",
  [0x04] = "grass",   -- Tall grass
  [0x05] = "cave",
  [0x07] = "door",
  -- Default-case: any code not listed returns "normal".
}

local TOD_BUCKET = { [0] = "morning", [1] = "day", [2] = "day", [3] = "night" }

local function on_frame()
  local coll = emu:read8(sym.current_tile_collision)
  local tt = TILE_TYPE[coll] or "normal"

  if tt ~= candidate.type then
    candidate.type = tt
    candidate.frames = 1
  else
    candidate.frames = candidate.frames + 1
  end

  if candidate.frames == 2 and tt ~= last_tile_type then
    last_tile_type = tt
    emit("tile_changed", { tile_type = tt })
  end

  local tod_raw = emu:read8(sym.time_of_day)
  local tod = TOD_BUCKET[tod_raw] or "day"
  if tod ~= last_tod then
    last_tod = tod
    emit("time_changed", { time_of_day = tod })
  end
end

local function init(profile, emit_fn)
  sym = profile.symbols
  emit = emit_fn
end

return { init = init, on_frame = on_frame }
```

- [ ] **Step 2: No commit yet — pairs with Task 24.**

---

### Task 24: Server — tile + time handler

**Files:**
- Create: `server/src/services/coachHandlers/tileHandler.ts`
- Modify: `server/src/services/gameStateReader.ts` (register)

- [ ] **Step 1: Write handler**

Create `server/src/services/coachHandlers/tileHandler.ts`:

```ts
import { broadcastCoachEvent } from '../gameStateReader.js';

export function handleTileChanged(raw: any): void {
  broadcastCoachEvent({ type: 'tile_changed', tile_type: raw.tile_type });
}

export function handleTimeChanged(raw: any): void {
  // tile_changed consumer and time_of_day consumer are decoupled on the client
  // — both live in the same feature (encounter_panel) since the panel queries
  // for `(map_id, time_of_day)`. The store carries both fields.
  broadcastCoachEvent({ type: 'tile_changed', tile_type: `__time_of_day_${raw.time_of_day}` } as any);
  // Alternative: add a TimeChangedEvent type. For v1 we pack it onto the same
  // channel via a sentinel to avoid protocol expansion; client recognizes the
  // `__time_of_day_` prefix.
}
```

> The time-of-day piggyback is intentionally hacky for v1 to avoid protocol expansion. v2 should lift it to its own event type once a second consumer needs it.

- [ ] **Step 2: Register handlers**

In `gameStateReader.ts`:

```ts
const { handleTileChanged, handleTimeChanged } = await import('./coachHandlers/tileHandler.js');
registerFeatureHandler('encounter_panel', (raw: any) => {
  // Dispatch per event kind — Lua emits a single feature="encounter_panel"
  // channel with either tile_type or time_of_day in the data payload.
  if ('tile_type' in raw) handleTileChanged(raw);
  if ('time_of_day' in raw) handleTimeChanged(raw);
});
```

- [ ] **Step 3: Wait — actually the Lua emits two distinct event names. Reconcile.**

Look at `tile.lua` — it calls `emit("tile_changed", ...)` and `emit("time_changed", ...)`. Server side, `handleEvent` dispatches by `msg.feature`, not by inner event name. Fix: make tile.lua emit via the **same** feature id but pass both kinds of payloads, then discriminate server-side:

Update tile.lua's emit calls:

```lua
-- Instead of emit("tile_changed", ...) and emit("time_changed", ...):
emit("encounter_panel", { tile_type = tt })           -- on tile change
emit("encounter_panel", { time_of_day = tod })        -- on tod change
```

This makes a single feature-id channel carry both — simpler server dispatch. Update the server handler accordingly (code above already handles this shape).

- [ ] **Step 4: Update server CoachEvent type to carry time-of-day as a first-class field**

Actually simpler & cleaner: add `time_of_day` as a new event type. Modify `CoachEvent` in `gameStateReader.ts`:

```ts
export type CoachEvent =
  | ...previous variants...
  | { type: 'time_changed'; time_of_day: string };
```

Then in `tileHandler.ts`:

```ts
export function handleTimeChanged(raw: any): void {
  broadcastCoachEvent({ type: 'time_changed', time_of_day: raw.time_of_day });
}
```

Drop the sentinel-prefix hack. The client store handles `time_changed` explicitly (next task).

- [ ] **Step 5: Commit (pairs Tasks 23 + 24)**

```bash
git add server/src/services/coachHandlers/tileHandler.ts server/src/services/gameStateReader.ts server/resources/scripts/coach/modules/tile.lua
git commit -m "feat(coach): tile + time-of-day reader + handlers"
```

---

### Task 25: Client — `GrassEncounterPanel`

**Files:**
- Create: `client/src/components/guide/GrassEncounterPanel.tsx`
- Modify: `client/src/state/gameState.tsx` (add `timeOfDay` state)
- Modify: `client/src/pages/Guide.tsx` (render panel)

- [ ] **Step 1: Add `timeOfDay` to store**

In `client/src/state/gameState.tsx`:

Add `timeOfDay: string | null` to `CoachState` interface, `DEFAULT`, and `applyEvent`:

```tsx
// Interface addition:
timeOfDay: string | null;

// DEFAULT addition:
timeOfDay: null,

// applyEvent addition:
case 'time_changed':
  return { ...s, timeOfDay: ev.time_of_day };
```

Add an accessor hook:

```tsx
export function useTimeOfDay(): string | null { return useContext(GameStateContext).timeOfDay; }
```

- [ ] **Step 2: Write the panel**

Create `client/src/components/guide/GrassEncounterPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useCurrentTile, usePlayer, useTimeOfDay, useCoachFeature } from '@/state/gameState';
import { api } from '@/api/client';

interface EncounterRow {
  species_id: number;
  species_name: string;
  sprite_url: string | null;
  level_min: number;
  level_max: number;
  encounter_rate: number | null;
  method: string;
  time_of_day: string | null;
}

export function GrassEncounterPanel() {
  const enabled = useCoachFeature('encounter_panel');
  const tile = useCurrentTile();
  const player = usePlayer();
  const tod = useTimeOfDay();
  const [rows, setRows] = useState<EncounterRow[]>([]);

  useEffect(() => {
    if (!enabled || !player?.map_id) { setRows([]); return; }
    if (tile !== 'grass' && tile !== 'water') { setRows([]); return; }
    // Query existing encounters endpoint by location_key (map_id is the asm name;
    // backend /api/guide/location-detail already returns encounters for a map).
    const mapKey = player.map_id.toLowerCase().replace(/_/g, '-');
    api.guide.encountersByMap(mapKey, tod ?? 'day').then((data: any) => {
      setRows((data.encounters ?? []).filter((e: EncounterRow) => {
        if (tile === 'water') return e.method === 'surf';
        return e.method === 'grass' || e.method === 'old rod' || e.method === 'good rod' || e.method === 'super rod';
      }));
    }).catch(() => setRows([]));
  }, [enabled, player?.map_id, tile, tod]);

  if (!enabled || !rows.length) return null;

  return (
    <div className="absolute top-16 right-4 z-40 w-72 rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-lg">
      <div className="text-xs font-semibold mb-2 flex items-center gap-2">
        {tile === 'grass' ? 'Wild Grass' : 'Surfing'} · {tod ?? 'day'}
      </div>
      <ul className="space-y-1.5">
        {rows.map(r => (
          <li key={r.species_id} className="flex items-center gap-2 text-xs">
            {r.sprite_url && <img src={r.sprite_url} alt="" className="w-8 h-8 [image-rendering:pixelated]" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium capitalize truncate">{r.species_name}</div>
              <div className="text-muted-foreground">Lv {r.level_min}-{r.level_max} · {r.encounter_rate ?? '?'}%</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add `encountersByMap` to the api client**

In `client/src/api/client.ts`, find the `guide` namespace and add:

```ts
encountersByMap: (mapKey: string, tod: string) =>
  fetch(`/api/guide/encounters/${mapKey}?tod=${encodeURIComponent(tod)}`).then(r => r.json()),
```

And the corresponding server route in `server/src/routes/guide.ts`:

```ts
router.get('/encounters/:mapKey', (req, res) => {
  const mapKey = req.params.mapKey;
  const tod = (req.query.tod as string) || 'day';
  const rows = db.prepare(`
    SELECT me.species_id, s.name as species_name, s.sprite_url,
           me.level_min, me.level_max, me.encounter_rate, me.method, me.time_of_day
    FROM map_encounters me
    JOIN map_locations ml ON ml.id = me.location_id
    JOIN species s ON s.id = me.species_id
    WHERE ml.location_key = ? AND (me.time_of_day IS NULL OR me.time_of_day = ?)
  `).all(mapKey, tod);
  res.json({ encounters: rows });
});
```

- [ ] **Step 4: Render panel in Guide.tsx**

Add `<GrassEncounterPanel />` inside the `GameStateProvider`, anywhere outside the map container (it absolute-positions itself).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/guide/GrassEncounterPanel.tsx client/src/state/gameState.tsx client/src/pages/Guide.tsx client/src/api/client.ts server/src/routes/guide.ts
git commit -m "feat(coach): grass encounter panel (tile + time-of-day driven)"
```

---

## Phase 1e — Settings UI + Start/Stop Play

### Task 26: Coach settings panel

**Files:**
- Create: `client/src/components/settings/CoachSettings.tsx`
- Modify: the existing Settings page to render `<CoachSettings />`.

- [ ] **Step 1: Find the settings page**

Run: `grep -rn "Settings\b" client/src/pages/ | head`

- [ ] **Step 2: Write the component**

Create `client/src/components/settings/CoachSettings.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface CoachSettings {
  enabled_features: string[];
  websocket_port: number;
  auto_switch_save: boolean;
  rom_profile_overrides: Record<string, string>;
}

const ALL_FEATURES = [
  { id: 'player_marker', name: 'Player Marker', implemented: true },
  { id: 'flag_sync', name: 'Flag Sync', implemented: true },
  { id: 'encounter_panel', name: 'Encounter Panel', implemented: true },
  { id: 'battle_preview', name: 'Opponent Preview', implemented: false },
  { id: 'counter_advisor', name: 'Counter Advisor', implemented: false },
  { id: 'shiny_counter', name: 'Shiny Counter', implemented: false },
  { id: 'directional_hint', name: 'Directional Hint', implemented: false },
];

export function CoachSettings() {
  const [settings, setSettings] = useState<CoachSettings | null>(null);

  useEffect(() => {
    fetch('/api/coach/settings').then(r => r.json()).then(setSettings);
  }, []);

  const patch = async (patch: Partial<CoachSettings>) => {
    const r = await fetch('/api/coach/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSettings(await r.json());
  };

  if (!settings) return <div className="p-4">Loading…</div>;

  const toggleFeature = (id: string, on: boolean) => {
    const next = on
      ? [...settings.enabled_features, id]
      : settings.enabled_features.filter(f => f !== id);
    patch({ enabled_features: next });
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Coach</h2>

      <div>
        <div className="text-sm font-medium mb-2">Features</div>
        <div className="space-y-1.5">
          {ALL_FEATURES.map(f => (
            <label key={f.id} className={`flex items-center gap-2 text-sm ${f.implemented ? '' : 'opacity-50'}`}>
              <input
                type="checkbox"
                disabled={!f.implemented}
                checked={settings.enabled_features.includes(f.id)}
                onChange={e => toggleFeature(f.id, e.target.checked)}
              />
              {f.name}
              {!f.implemented && <span className="text-xs text-muted-foreground">(coming soon)</span>}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.auto_switch_save}
            onChange={e => patch({ auto_switch_save: e.target.checked })}
          />
          Auto-switch save when coach connects
        </label>
      </div>

      <div>
        <label className="block text-sm mb-1">WebSocket Port</label>
        <input
          type="number"
          value={settings.websocket_port}
          onChange={e => patch({ websocket_port: parseInt(e.target.value) || 54321 })}
          className="w-32 px-2 py-1 border border-border rounded text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Server falls back to the next 9 ports if this is taken.</p>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Install Script</div>
        <p className="text-xs text-muted-foreground mb-2">
          In mGBA: Tools → Scripting → Load script → select the file below.
        </p>
        <ScriptPathCopy />
      </div>
    </div>
  );
}

function ScriptPathCopy() {
  const [copied, setCopied] = useState(false);
  const path = '/Users/shawnmccourt/WebstormProjects/alacrity/server/resources/scripts/coach/main.lua';
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{path}</code>
      <button
        onClick={() => { navigator.clipboard.writeText(path); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
```

> The hard-coded path is correct for dev; in the packaged Tauri app this would use a Tauri `resolveResource` call. Out of scope for v1 — noted in "Open Questions" in the spec.

- [ ] **Step 3: Mount in the Settings page**

Add to the existing Settings page (wherever other settings sections like `SavesSection` live): `<CoachSettings />`.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/settings/CoachSettings.tsx client/src/pages/Settings.tsx
git commit -m "feat(coach): settings panel (feature toggles, port, script path)"
```

---

### Task 27: Start / Stop Play buttons

**Files:**
- Create: `server/src/routes/coach.ts` — add `/play/start` + `/play/stop` endpoints (modify existing file)
- Modify: `client/src/components/settings/CoachSettings.tsx` — add buttons

- [ ] **Step 1: Server endpoints**

In `server/src/routes/coach.ts` append:

```ts
import { spawn, type ChildProcess } from 'child_process';
import { paths } from '../services/paths.js';  // adjust import to actual paths module

let coachMgba: ChildProcess | null = null;

router.post('/play/start', (req, res) => {
  if (coachMgba && !coachMgba.killed) {
    return res.status(409).json({ error: 'Play session already running' });
  }
  const { rom_path, save_path } = req.body ?? {};
  if (!rom_path) return res.status(400).json({ error: 'rom_path required' });

  // Find mGBA via existing dependencies service
  const mgbaRow = db.prepare(
    `SELECT path FROM emulator_paths WHERE emulator = ? AND os = ?`
  ).get('mgba', process.platform) as { path: string } | undefined;
  if (!mgbaRow) return res.status(500).json({ error: 'mgba not installed' });

  const scriptPath = join(process.cwd(), 'server', 'resources', 'scripts', 'coach', 'main.lua');
  const args = ['--script', scriptPath, rom_path];
  if (save_path) args.push('--savefile', save_path);

  coachMgba = spawn(mgbaRow.path, args, { detached: true, stdio: 'ignore' });
  coachMgba.on('exit', () => { coachMgba = null; });
  res.json({ ok: true, pid: coachMgba.pid });
});

router.post('/play/stop', (_req, res) => {
  if (coachMgba && !coachMgba.killed) {
    try { coachMgba.kill(); } catch { /* already gone */ }
    coachMgba = null;
  }
  res.json({ ok: true });
});
```

> The `db` and `join` imports at top of file may already exist; add if missing.

- [ ] **Step 2: Client buttons**

In `CoachSettings.tsx` add after the feature checkboxes:

```tsx
<div>
  <div className="text-sm font-medium mb-2">Play session</div>
  <div className="flex gap-2">
    <button
      onClick={() => {
        // For v1, caller needs to input the ROM path manually. A subsequent
        // phase wires a ROM picker.
        const romPath = prompt('ROM path:');
        if (!romPath) return;
        fetch('/api/coach/play/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rom_path: romPath }),
        });
      }}
      className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded"
    >
      Start Play
    </button>
    <button
      onClick={() => fetch('/api/coach/play/stop', { method: 'POST' })}
      className="text-sm px-3 py-1 border border-border rounded"
    >
      Stop Play
    </button>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/coach.ts client/src/components/settings/CoachSettings.tsx
git commit -m "feat(coach): start/stop play buttons (launches mGBA with coach.lua)"
```

---

### Task 28: Unknown-ROM profile override UI

**Files:**
- Modify: `client/src/components/guide/CoachStatusBadge.tsx` — show error state with a "pick profile" prompt
- Modify: `client/src/state/gameState.tsx` — track `unknownRom` state

- [ ] **Step 1: Add unknownRom state**

In `gameState.tsx`:

```tsx
// Interface:
unknownRom: { rom_title: string; rom_hash: string } | null;

// DEFAULT:
unknownRom: null,

// applyEvent cases:
case 'unknown_rom':
  return { ...s, unknownRom: { rom_title: ev.rom_title, rom_hash: ev.rom_hash }, connected: false };
case 'coach_connected':
  return { ...s, connected: true, /* ... */, unknownRom: null };
```

- [ ] **Step 2: Surface in the badge**

In `CoachStatusBadge.tsx`:

```tsx
import { useState } from 'react';

// Inside the component, after existing logic:
const { unknownRom } = useCoachState();
if (unknownRom) {
  return <UnknownRomPrompt rom_title={unknownRom.rom_title} rom_hash={unknownRom.rom_hash} />;
}

// Then:
function UnknownRomPrompt({ rom_title, rom_hash }: { rom_title: string; rom_hash: string }) {
  const [profile, setProfile] = useState('crystal');
  const submit = async () => {
    const cur = await fetch('/api/coach/settings').then(r => r.json());
    await fetch('/api/coach/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rom_profile_overrides: { ...cur.rom_profile_overrides, [rom_hash]: profile },
      }),
    });
    alert('Saved. Reconnect mGBA to apply.');
  };
  return (
    <div className="absolute top-2 left-2 z-50 rounded-lg px-3 py-2 bg-red-50 border border-red-200 shadow-sm text-xs">
      <div className="font-medium text-red-700">Unknown ROM: {rom_title}</div>
      <div className="mt-1 flex items-center gap-2">
        <select value={profile} onChange={e => setProfile(e.target.value)} className="text-xs border rounded px-1">
          <option value="crystal">Crystal</option>
        </select>
        <button onClick={submit} className="text-xs px-2 py-0.5 bg-red-600 text-white rounded">Assign</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/state/gameState.tsx client/src/components/guide/CoachStatusBadge.tsx
git commit -m "feat(coach): unknown-ROM prompt with manual profile assignment"
```

---

## Phase 1f — Edge Cases + Hardening

### Task 29: Protocol-version handshake enforcement

**Files:**
- Modify: `server/src/services/gameStateReader.ts` (in `handleHello`)

- [ ] **Step 1: Add version check**

In `handleHello`, before the profile match:

```ts
const SUPPORTED_PROTOCOL_VERSIONS = [1];
if (!SUPPORTED_PROTOCOL_VERSIONS.includes(hello.protocol_version)) {
  ws.send(JSON.stringify({
    type: 'upgrade_needed',
    expected_version: SUPPORTED_PROTOCOL_VERSIONS[0],
    rom_title: hello.rom_title,
  }));
  ws.close(1002, 'protocol version');
  return;
}
```

- [ ] **Step 2: Client-side surface**

In `gameState.tsx` applyEvent, add:

```tsx
case 'upgrade_needed':
  return { ...s, unknownRom: { rom_title: 'UPGRADE NEEDED', rom_hash: String(ev.expected_version) } };
```

(Reuses existing prompt channel — minimal UI change, can be upgraded to a dedicated prompt in a later polish pass.)

- [ ] **Step 3: Commit**

```bash
git add server/src/services/gameStateReader.ts client/src/state/gameState.tsx
git commit -m "feat(coach): protocol-version handshake (fails fast on mismatch)"
```

---

### Task 30: Feature-validation 3-strike disable

**Files:**
- Modify: `server/src/services/coachHandlers/playerHandler.ts`
- Modify: `server/src/services/coachHandlers/flagsHandler.ts`
- Modify: `server/src/services/coachHandlers/tileHandler.ts`

- [ ] **Step 1: Add validation + strike tracking**

For each handler, wrap the input validation in a try/catch + strike counter. Example in `playerHandler.ts`, at the top of `handlePlayerMoved`:

```ts
let consecutiveFailures = 0;  // module-scope
const STRIKE_LIMIT = 3;
let disabled = false;

function validate(raw: any): boolean {
  return (
    typeof raw.map_group === 'number' && raw.map_group > 0 && raw.map_group < 100 &&
    typeof raw.tile_x === 'number' && raw.tile_x >= 0 && raw.tile_x < 200 &&
    typeof raw.tile_y === 'number' && raw.tile_y >= 0 && raw.tile_y < 200
  );
}

export function handlePlayerMoved(raw: any): void {
  if (disabled) return;
  if (!validate(raw)) {
    consecutiveFailures++;
    if (consecutiveFailures >= STRIKE_LIMIT) {
      disabled = true;
      broadcastCoachEvent({ type: 'feature_error', feature: 'player_marker', reason: 'validation strikes exceeded' } as any);
      setTimeout(() => { disabled = false; consecutiveFailures = 0; }, 5000);
    }
    return;
  }
  consecutiveFailures = 0;
  // ... existing handler code
}
```

Add similar `validate()` blocks to `flagsHandler` (check `kind === 'full' || kind === 'diff'`, sensible byte lengths) and `tileHandler` (valid tile_type enum).

- [ ] **Step 2: Client handles `feature_error`**

In `gameState.tsx` applyEvent:

```tsx
case 'feature_error':
  // Remove the feature from enabledFeatures; UI unmounts.
  const next = new Set(s.enabledFeatures);
  next.delete(ev.feature);
  return { ...s, enabledFeatures: next };
```

Add `feature_error` to the `CoachEvent` union in `gameStateReader.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/coachHandlers/ server/src/services/gameStateReader.ts client/src/state/gameState.tsx
git commit -m "feat(coach): 3-strike validation disable per feature"
```

---

### Task 31: Dropdown-mismatch banner

**Files:**
- Create: `client/src/components/guide/CoachSaveMismatchBanner.tsx`
- Modify: `client/src/pages/Guide.tsx` (render banner)

- [ ] **Step 1: Write the banner**

Create `client/src/components/guide/CoachSaveMismatchBanner.tsx`:

```tsx
import { useCoachState } from '@/state/gameState';

interface Props {
  selectedSaveId: number | null;
  onSwitch: (id: number) => void;
}

export function CoachSaveMismatchBanner({ selectedSaveId, onSwitch }: Props) {
  const { connected, saveId } = useCoachState();
  if (!connected || !saveId || saveId === selectedSaveId) return null;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs shadow-sm flex items-center gap-2">
      <span>Coach is playing a different save than the one selected.</span>
      <button onClick={() => onSwitch(saveId)} className="px-2 py-0.5 bg-amber-600 text-white rounded">
        Switch to coach's save
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Guide.tsx**

Inside the Guide's `GameStateProvider`, add:

```tsx
<CoachSaveMismatchBanner
  selectedSaveId={selectedSaveId /* whatever local state holds this */}
  onSwitch={(id) => setSelectedSaveId(id)}
/>
```

Also: auto-switch logic when `auto_switch_save` is true:

```tsx
import { useCoachState } from '@/state/gameState';

// Inside Guide component body:
const { saveId: coachSaveId } = useCoachState();
useEffect(() => {
  if (!coachSaveId || !autoSwitchSave) return;
  if (coachSaveId !== selectedSaveId) setSelectedSaveId(coachSaveId);
}, [coachSaveId, autoSwitchSave]);
```

Where `autoSwitchSave` is read from the coach settings (already exposed by the `/api/coach/settings` endpoint).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/guide/CoachSaveMismatchBanner.tsx client/src/pages/Guide.tsx
git commit -m "feat(coach): save-mismatch banner + auto-switch respect"
```

---

### Task 32: Warp-detection (no-animation on large tile jumps)

**Files:**
- Modify: `client/src/components/guide/LivePlayerMarker.tsx`

- [ ] **Step 1: Add jump detection**

Update the component to skip Leaflet's animated marker repositioning when the player jumped more than 3 tiles in a single update:

```tsx
import { useEffect, useRef, useState } from 'react';

// ...

const prev = useRef<{ x: number; y: number } | null>(null);
const [key, setKey] = useState(0);

useEffect(() => {
  if (!player) return;
  const cur = { x: player.tile_x, y: player.tile_y };
  if (prev.current) {
    const dx = Math.abs(cur.x - prev.current.x);
    const dy = Math.abs(cur.y - prev.current.y);
    // Large jump (fly/teleport/warp) — force Leaflet to remount the marker
    // by bumping the key, so no animation interpolation.
    if (dx > 3 || dy > 3) setKey(k => k + 1);
  }
  prev.current = cur;
}, [player?.tile_x, player?.tile_y]);

// Use key on Marker:
<Marker key={key} position={position} icon={ICON} />
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/guide/LivePlayerMarker.tsx
git commit -m "feat(coach): skip marker animation on warp/fly/teleport (dt>3 tiles)"
```

---

### Task 33: End-to-end manual validation pass

**Files:** none — manual QA

- [ ] **Step 1: Fresh boot**

Kill any running tauri dev. Relaunch: `cd src-tauri && bun run tauri dev`. Wait until ready.

- [ ] **Step 2: Happy path**

Launch mGBA with `--script <coach/main.lua>` and a real Crystal save. Within 10s:
- Badge goes green.
- Dropdown auto-switches to matching save.
- Player dot appears near current player location.
- Step into grass → encounter panel appears.
- Receive an item in-game → guide shows ✓ within ~100ms.

- [ ] **Step 3: Disconnect path**

Close mGBA. Within ~3s:
- Badge goes gray.
- Player dot disappears.
- Encounter panel fades.
- Guide reverts to save-file flag state (whichever save is in dropdown).

- [ ] **Step 4: Unknown ROM**

Load mGBA with any non-Crystal ROM. Confirm:
- Unknown-ROM banner appears with the title.
- "Assign" to Crystal, reload ROM → normal connection resumes.

- [ ] **Step 5: Port collision**

Start an unrelated service on 54321 (e.g. `python3 -m http.server 54321`), then relaunch Alacrity. Confirm:
- `.coach-port` file contains 54322 (or later).
- Lua client on restart connects to the fallback port.

- [ ] **Step 6: Feature toggle mid-session**

With coach connected, open settings → uncheck "Encounter Panel." Panel disappears without reconnecting. Re-check → panel returns on next grass tile.

- [ ] **Step 7: Commit QA log**

Write results to a short QA note:

```bash
echo "Coach v1 QA $(date):
  Happy path: PASS/FAIL
  Disconnect: PASS/FAIL
  Unknown ROM: PASS/FAIL
  Port collision: PASS/FAIL
  Mid-session toggle: PASS/FAIL" > docs/superpowers/qa/2026-04-22-coach-v1.md

git add docs/superpowers/qa/
git commit -m "qa(coach): v1 end-to-end validation log"
```

---

## Done Criteria

All tasks 1-33 committed. Fresh `bun run tauri dev` boots, an mGBA with `coach/main.lua` connects, and a Crystal playthrough drives:
- Live player dot on the Johto map
- Auto ✓ on items/trainers/events as their flags set
- Grass encounter panel showing species for the current map + time of day

Settings page has coach toggles. Start/Stop Play buttons launch and kill an mGBA process. Unknown ROMs prompt for a profile. Feature registry has all 7 entries (3 implemented, 4 scaffolded).
