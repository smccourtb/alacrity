# Live Coach Overlay — Design Doc

**Date:** 2026-04-22
**Status:** Design approved, pending implementation plan
**Scope:** Alacrity desktop app, Gen 2 Crystal first, generic architecture for future games

## 1. Summary

A live "second-screen" coaching overlay that reads the running emulator's memory in real time and enriches the Alacrity guide with:

- A moving player-position marker on the world map
- Automatic flag-driven checkoff as the player progresses
- A contextual encounter panel when the player steps into grass

Designed as a modular feature registry so additional coaching capabilities (battle preview, counter advisor, shiny counter, directional hints) can be added as separate phases without architectural rework. ROM hacks and randomizers are first-class via drop-in profile JSON.

## 2. Goals / Non-goals

### Goals

- Real-time player position on the Johto world map (±10-tile accuracy acceptable for v1)
- Auto-check guide items/trainers/events as their flags fire in-game
- Encounter-preview panel that appears when player is on grass, showing species + level range + encounter rate for the current map and time of day
- Clean feature-toggle UX so users can enable/disable individual coach features
- Per-game profile system that supports future ROM hacks and other generations via configuration, not code changes
- Fully offline — all transport on localhost

### Non-goals (for v1)

- Opponent/battle preview, counter recommendation (v2)
- Shiny counter integration (v3)
- Directional arrow / pathfinding (v4)
- Pixel-perfect player dot (v5 — per-map Level 2 calibration)
- Multi-emulator simultaneous connections
- Supporting non-mGBA emulators
- Netplay / linked multiplayer

## 3. Architecture

Three-layer pipeline with a feature registry sitting on top:

```
mGBA (with coach.lua) ──WebSocket──> Alacrity server ──SSE──> Guide UI
        |                                    |                     |
   reads WRAM each frame                GameStateReader        Live markers +
   emits diff events                    (state machine +       contextual panels
                                        save binding)
```

### Feature Registry Layer

```
Feature Registry               Game Profile             User Preferences
  player_marker                  symbols: {...}           enabled: {...}
  flag_sync                      supported: [...]         per_feature: {...}
  encounter_panel                        |                        |
  battle_preview                         └─── intersect ──────────┘
  counter_advisor                               │
  shiny_counter                                 ▼
  directional_hint                     effective_features
```

**Feature Registry** (code-level, `server/src/services/coachFeatures.ts`): single source of truth listing every feature, its required RAM symbols, its Lua module path, its server event handler, and its UI component.

**Game Profile** (JSON, `resources/coach-profiles/<game>.json`): declares which RAM symbols are available and which features the game supports.

**User Preferences** (settings store): which features the user has toggled on.

At coach-connect time, the server intersects the profile's `supported` list with the user's `enabled` list to produce `effective_features`, which determines which Lua modules load and which UI panels render.

### Components

1. **`coach.lua`** — mGBA-side script, ships with Alacrity. Detects ROM, opens WebSocket, loads feature modules, reads WRAM each frame, emits diff events.
2. **`GameStateReader`** — server-side WebSocket host + event normalizer + SSE broadcaster.
3. **`GameStateStore`** — client-side React context + SSE subscriber + state provider.
4. **UI panels** — `LivePlayerMarker`, `GrassEncounterPanel`, `CoachStatusBadge`, settings panel additions.

## 4. Component Detail

### 4.1 `coach.lua` (emulator-side)

```
resources/scripts/coach/
  main.lua              ← entry point loaded by mGBA
  profiles/
    crystal.lua         ← game-specific read functions
    red.lua             ← (future, stubbed)
  modules/
    player.lua          ← player_marker feature
    flags.lua           ← flag_sync feature
    tile.lua            ← encounter_panel feature (tile-type detection)
    battle.lua          ← (future) battle_preview feature
```

**`main.lua` responsibilities:**

- On load: read ROM cartridge title header (`0x0134-0x0143`) and compute a SHA-256 of the first 256KB → pick profile by title match or hash
- Open WebSocket to `ws://127.0.0.1:<port>/coach` where port is read from `~/.alacrity/coach-port`
- Handshake message: `{type: "hello", protocol_version: 1, profile: "crystal", rom_title, rom_hash, trainer_id, secret_id}`
- Receive `{enabled_features}` from server
- For each enabled feature, `require()` the module, which registers a per-frame callback
- Per frame (60Hz): call registered callbacks; each callback diffs current RAM vs cached state and emits an event only on change
- Heartbeat `{type: "ping"}` every 500ms
- On disconnect: exponential backoff retry, auto-heal

**Message rate:** ~10-20 events/sec typical. Frames without diffs produce no messages.

### 4.2 `GameStateReader` service

**File:** `server/src/services/gameStateReader.ts`

- WebSocket server on port 54321 (with fallback to 54322/54323 on collision)
- Selected port written to `~/.alacrity/coach-port` so Lua can find it
- Single coach connection at a time in v1
- On handshake:
  - Validate `protocol_version` (reject / prompt upgrade if mismatch)
  - Load profile JSON by `game_id`
  - Match `trainer_id + secret_id` against `save_files` → pick save record (may be null if unknown)
  - Load `coord_calibrations[game_id]`
  - Load user prefs → compute `effective_features = profile.supported ∩ prefs.enabled`
  - Reply to coach: `{type: "welcome", enabled_features}`
  - Broadcast SSE: `{type: "coach_connected", save_id, profile, enabled}`
- On event messages: dispatch to feature-specific handlers that normalize → domain events → SSE broadcast
- On disconnect (missed heartbeat >2s): broadcast `{type: "coach_disconnected"}`

**Domain event types (SSE payloads):**

```ts
type CoachEvent =
  | { type: 'coach_connected'; save_id: number | null; profile: string; enabled: string[] }
  | { type: 'coach_disconnected' }
  | { type: 'player_moved'; map_id: string; tile_x: number; tile_y: number; facing: 'up'|'down'|'left'|'right' }
  | { type: 'tile_changed'; tile_type: 'grass' | 'water' | 'cave' | 'normal' | 'ledge' | 'door' }
  | { type: 'flags_changed'; flag_report: FlagReport }
  | { type: 'encounter_table'; slots: EncounterSlot[] }
  | { type: 'feature_error'; feature: string; reason: string }
```

`FlagReport` uses the existing shape from `flagParsers/`:

```ts
interface FlagReport {
  flags_by_location: Record<string, { total: number; set: number; flags: Array<{ index: number; set: boolean }> }>;
}
```

### 4.3 `GameStateStore` (client)

**File:** `client/src/state/gameState.ts`

- React context provider wrapping the Guide page (later, the whole app)
- Subscribes to `/api/coach/events` SSE on mount; auto-reconnects on drop
- Maintains:
  - `coachConnected: boolean`
  - `player: { map_id, tile_x, tile_y, facing } | null`
  - `currentTile: TileType | null`
  - `liveFlagReport: FlagReport | null` — shadows save-file flagReport when present
  - `enabledFeatures: Set<FeatureId>`
- Hooks:
  - `usePlayer()`
  - `useCurrentTile()`
  - `useEffectiveFlagReport()` — returns `liveFlagReport ?? saveFlagReport`
  - `useCoachFeature(id)` — returns boolean, used by panels to mount/unmount

**Critical integration point:** existing direct reads of `flagReport` in `Guide.tsx` and `LocationDetail.tsx` get wrapped with `useEffectiveFlagReport()`. Net effect: save-flag is the default, coach-flag transparently overrides when connected, no component below this layer knows the difference.

### 4.4 v1 UI additions

**`LivePlayerMarker`** — Leaflet layer added to `Guide.tsx`:

- Reads `player` from `GameStateStore`
- Applies Level 1 affine transform from `coord_calibrations[game_id]` to convert `(map_id, tile_x, tile_y)` → pixel position
- Renders a pulsing dot
- On interior maps: renders at the building's overworld entrance (looked up via warps table), with a floating label "Inside: Radio Tower 2F, tile (5,3)"

**`GrassEncounterPanel`** — floating card, top-right of map:

- Appears (fade in) when `currentTile === 'grass'` and `player.map_id` has encounter data
- Queries `data.encounters` for the current `map_id`, filtered by current time-of-day bucket
- Renders one row per species: sprite, name, level range, encounter % (colored bar), caught-✓ from user's dex
- Clicking a species → opens species detail (existing pattern)

**`CoachStatusBadge`** — indicator top-left of map:

- States: disconnected (gray), connected-to-save (green with profile name), error (red with reason)
- Click → opens Coach settings panel

**Settings panel** — new section in existing Settings page:

- Feature checkboxes (grayed for unsupported by current profile)
- Per-feature settings (placeholder for v2+)
- Lua script install path with "Copy to clipboard" button
- ROM-hash → profile manual assignment list (for unknown ROMs)
- WebSocket port override

**Start/Stop Play buttons** — in Coach settings:

- "Start Play" launches mGBA with `--script <path-to-coach/main.lua>` and optionally pre-attaches the selected save
- "Stop Play" kills the coach-launched mGBA process (only — does not affect hunt workers)

## 5. Data Model

### 5.1 Schema changes

**`save_files` — add columns:**

```sql
ALTER TABLE save_files ADD COLUMN trainer_id INTEGER;
ALTER TABLE save_files ADD COLUMN secret_id INTEGER;
```

Backfill: one-shot script re-parses existing saves. Both Gen 1 and Gen 2 parsers already expose these fields internally.

**`coord_calibrations` — new table:**

```sql
CREATE TABLE coord_calibrations (
  game_id TEXT PRIMARY KEY,
  map_key TEXT NOT NULL,
  landmarks TEXT NOT NULL,          -- JSON: [{ram_map, ram_x, ram_y, our_x, our_y, label}]
  affine_matrix TEXT NOT NULL,      -- JSON: [[a, b, tx], [c, d, ty]]
  updated_at INTEGER NOT NULL
);
```

Seeded from `server/src/seeds/data/coord-calibrations/<game>.json`. Future Level 2 calibration UI writes here.

### 5.2 New resource files

```
resources/
  coach-profiles/
    crystal.json                    ← shipped, v1
    red.json                        ← future, scaffolded
  scripts/
    coach/
      main.lua
      profiles/crystal.lua
      modules/player.lua
      modules/flags.lua
      modules/tile.lua
      modules/battle.lua            ← stub, for v2 registration
  seed-data/
    coord-calibrations/
      crystal.json                  ← 5-8 landmarks for Johto
    johto-warps.json                ← generated from pret warps.asm at build time
```

**`coach-profiles/crystal.json` structure:**

```jsonc
{
  "game_id": "crystal",
  "display_name": "Pokemon Crystal",
  "rom_title_matches": ["PM_CRYSTAL", "CRYSTAL"],
  "rom_hash_matches": [],            // optional; populated from known-good ROMs during 1a
  "map_key": "johto",
  "min_mgba_version": "0.10.0",
  "symbols": {
    "player_map_group": "0xD148",
    "player_map_number": "0xD149",
    "player_x": "0xD164",
    "player_y": "0xD165",
    "player_facing": "0xD166",
    "event_flags": "0xD77E",
    "event_flag_count": 2400,
    "trainer_id": "0xD47B",
    "secret_id": "0xD47D",
    "time_of_day": "0xD269",
    "current_tile_collision": "0xC2FA",
    "battle_state": "0xD22D",
    "enemy_mon_species": "0xD204"
  },
  "supported_features": ["player_marker", "flag_sync", "encounter_panel"]
}
```

**Drop-in rom hack support:** any new JSON placed in `coach-profiles/` is auto-discovered at server start. ROM hackers / randomizer users can contribute community profiles without code changes. Symbol addresses not in a profile simply disable the features that need them.

### 5.3 User settings

Stored in the existing settings store (same pattern as theme, window size):

- `coach.enabled_features` → JSON array of feature IDs (default: all supported by most recent profile)
- `coach.websocket_port` → number, default 54321
- `coach.auto_switch_save` → boolean, default true
- `coach.per_feature.<id>` → JSON blob per feature (v2+ usage, schema per feature)

### 5.4 Runtime-only state

Not persisted — held in server memory or client memory only:

- Active coach connection handle
- Live `flagReport`, `player`, `currentTile`
- Feature event history / debug log (debug mode only)

### 5.5 End-to-end data flow

```
mGBA launches with coach.lua
  └── Lua reads ROM header → picks profile → opens WebSocket

Server on connect:
  ├── Loads profile JSON
  ├── Matches trainer/secret → save record
  ├── Loads coord_calibrations
  ├── Computes effective_features
  ├── Replies: {enabled_features}
  └── SSE broadcast: coach_connected

Frontend:
  ├── GameStateStore receives coach_connected
  ├── Auto-switches save dropdown
  ├── Feature UI components mount

Lua per frame:
  ├── Each enabled module reads its RAM slice
  ├── Diffs vs cached state
  └── Emits events on change

Server:
  ├── Normalizes RAM events → domain events
  └── SSE broadcast

Frontend:
  └── GameStateStore updates → UI re-renders
```

## 6. Edge Cases & Failure Modes

### Connection failures

- **Lua disconnects:** 2s heartbeat timeout → server broadcasts `coach_disconnected` → client clears `liveFlagReport` → UI falls back to save-file state → Lua retries every 2s with backoff
- **Second mGBA tries to connect:** server rejects with `busy` message; v1 is single-connection
- **Port collision:** server fallback 54321 → 54322 → 54323; chosen port written to `~/.alacrity/coach-port`

### ROM / save identification

- **Unknown ROM:** server replies `unknown_rom` with closest-match suggestions; UI shows profile-picker; assignment persists keyed by rom_hash
- **No save match for trainer_id:** coach connects with `save_id = null`; banner "Import this save? [Import from mGBA]"; marker + encounter panel still work, flag sync holds off
- **Dropdown ≠ mGBA save:** if `auto_switch_save` pref true, dropdown re-syncs; else banner with [Switch]/[Stay] choice; when mismatched, `liveFlagReport` is suppressed

### Data integrity

- **Garbage RAM reads:** each module defines `validate()`; failed validation → skip frame; 3 consecutive failures → module temporarily disables, emits `feature_error`, re-enables on next valid frame
- **Player warps:** dot jumps (no animation interpolation when tile delta > threshold); tile-type debounce (2 consecutive same frames) prevents blinks during warp transitions
- **Save state loads / resets:** treated as normal flag diff; full flag_report re-broadcast

### Version mismatch

- Lua sends `protocol_version` in hello
- Mismatch → server sends `upgrade_needed` with path to current script; UI shows "Reinstall coach.lua" one-click button

### Coord calibration missing

- `player_marker` feature silently absent if no calibration for game_id
- Settings shows disabled checkbox with "[Calibrate now]" link (wired in v5)
- Other features unaffected

### Feature toggle mid-session

- Uncheck in settings → server sends `feature_disabled` to Lua → Lua unregisters that frame callback → UI unmounts that panel
- Recheck → remount + re-subscribe; no WebSocket reconnect

### Out of scope for v1

- Mid-game ROM swap (forces reconnect via rom_hash change in heartbeat)
- Linked netplay / multi-emulator
- Interaction with headless hunt workers (they don't load coach.lua)

## 7. Phase Plan

### v1 — MVP ship

| Phase | Work | Shippable alone? | Estimate |
|---|---|---|---|
| 1a | Foundation: Lua bootstrap, WebSocket, SSE, GameStateStore, profile loader, save_files migration, status badge | No (infra) | 3-5 days |
| 1b | `player_marker`: calibration seed, affine transform, interior warps, LivePlayerMarker component | Yes | 3-4 days |
| 1c | `flag_sync`: flags.lua, FlagReport normalization, useEffectiveFlagReport integration | Yes | 2 days |
| 1d | `encounter_panel`: tile.lua, time-of-day parse, GrassEncounterPanel component | Yes | 2-3 days |
| 1e | Feature registry + settings UI + Start/Stop Play + ROM-assign override | Yes | 1-2 days |
| 1f | Edge cases, validation layer, version handshake, warp detection | Yes | 2-3 days |

**v1 total: ~2.5-3.5 weeks**

### Post-v1 (scaffolded, not built)

- **v2 — `battle_preview` + `counter_advisor`** (~1 week): battle state detection, enemy mon read, wild-move synthesis from learnsets, type chart + STAB highlighting
- **v3 — `shiny_counter`** (~3-4 days): encounter-count on battle-start, auto-sync to active hunt or standalone mode
- **v4 — `directional_hint`** (~1-2 weeks): walkthrough progression integration, cross-map pathfinding over pret's warp graph, animated arrow overlay
- **v5 — Level 2 coord calibration UI** (~1 week): per-map alignment UI, per-map transforms, calibrate-mode integration

## 8. Testing Strategy

No test framework in the repo — validation is manual via the guide:

- **1a:** Connect Lua, confirm handshake + SSE events visible in browser devtools. Load a save in mGBA → verify dropdown auto-switches.
- **1b:** Walk around in Crystal, verify dot moves on world map. Enter building → dot snaps to entrance, label shows interior.
- **1c:** Receive an item in-game → ✓ appears in guide within ~100ms. Disconnect mGBA → guide reverts to save-file state cleanly.
- **1d:** Step into grass → encounter panel appears with correct species and levels for that map + time.
- **1e:** Toggle features in settings → UI mounts/unmounts without reconnecting.
- **1f:** Break each failure mode (kill mGBA, unknown ROM, port collision, Lua version skew) → verify graceful fallbacks.

## 9. Open Questions

Resolve during implementation:

- Exact RTC decoding for Gen 2 time-of-day buckets (check `data/events/time_of_day.asm` in pret)
- Whether to bundle mGBA itself with Alacrity for friction-free Play button, or keep it user-installed
- v1 ships with a hand-placed Johto calibration; calibration-wizard UI deferred to v5
- All Crystal RAM addresses in the profile JSON (section 5.2) are representative — verify against pret `constants/wram.asm` and `engine/events/*.asm` during phases 1a/1b, and record canonical `rom_hash_matches` against a known-good Crystal ROM

## 10. Risks

- **Coord accuracy:** Level 1 single-affine may feel rough on long routes. Mitigation: start with dense landmarks (2-3 per town, 1 per route midpoint); fast-track Level 2 if needed.
- **Lua runtime stability across mGBA versions:** require `mGBA >= 0.10.0` in profile metadata; surface warning if detected version is older.
- **ROM hash portability:** patched/translated ROMs fail exact match. Mitigation: title-header match as fallback; user manual assignment as last resort.
- **First-time Lua setup friction:** mitigated by the Start Play button that pre-attaches the script. For users who launch mGBA themselves, a one-time "load this script" documentation step is acceptable.
