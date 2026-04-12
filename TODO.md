# Alacrity TODO

## Collection System

### Done (2026-04-11)
- [x] Schema: `identity_sightings` split into `collection_saves` + `collection_bank` + `collection_manual` with unified `collection` VIEW
- [x] Snapshot enrichment: gender, nickname, origin_game, form, ot_name, ot_tid, met_level for all gens
- [x] Gen 1-2 gender computed from Attack DV + species gender_rate
- [x] `resolveCollection()` returns game, playthrough_id, ot_name, ot_tid via JOINs
- [x] Completion endpoints (`/pokemon/completion`, `/pokemon/completion/species/:id`) rewritten to query identity system
- [x] SpeciesDetail wired to identity sightings + manual entries
- [x] Manual entry CRUD wired to `collection_manual` table
- [x] Rebuild-snapshots endpoint for backfilling enriched data
- [x] Source toggle group in Pokedex header (Saves / Bank / Manual pills with counts)
- [x] Source auto-detect + localStorage-persisted user overrides
- [x] Routes renamed: `/api/identity/*` → `/api/collection/*`, `api.collection.*` client namespace

### Still Needed
- [ ] **Denormalize `is_shiny` on collection_saves/collection_bank** — Currently shiny detection requires parsing `snapshot_data` JSON in JS. Add `is_shiny` column, backfill from snapshot_data, simplify completion SQL.
- [ ] **Enrich Pokedex cards** — Cards currently show caught/missing. Show richer data: ball icon, nature, level, OT, shiny status. Design what belongs on card vs detail panel.
- [ ] **Floating sidebar for SpeciesDetail** — Convert the fixed right sidebar to a floating pattern (consistent with Guide's floating sidebar).
- [ ] **Link Pokedex cards to save location** — Each collected mon knows its "home" checkpoint. Add link/button that navigates to that save in the timeline (e.g. "Crystal — Route 34" → opens PlayPage at that checkpoint).
- [ ] **Guide ↔ Collection integration** — Wire `collection-status` endpoint into Guide UI: encounter lists show caught indicators, location markers show collection progress (e.g. "3/7 species"). Link from Guide encounters back to Pokedex species card.
- [ ] **Save page audit** — Review Play/Timeline page with collection data: collection count per playthrough, visual indicator on opted-in checkpoints, collection summary in playthrough header.

## Hunt Dashboard — UI
- [ ] Show hunt notes in the active hunt card (transfer info, nature guide, etc.)
- [ ] Turn the hunt results section into a proper TanStack table with sorting, filtering, action button columns, progress bar, pagination

## Shiny Hunting
- [ ] **Breeding odds calculator** — Currently hard-coded "1/64" (shiny parent) or "~1/8,192". Need a real DV inheritance model: Def/Spd/Spc inherited from parent ±1, Atk 50% from opposite-gender parent, Spc top bit random. Compute actual odds from specific parent DVs.
- [ ] **Parent DV manual input** — Hunt form shows detected daycare DVs read-only. Add optional manual input fields for when daycare detection fails or for hypothetical planning (pre-fill common setups like Lake of Rage Gyarados).
- [ ] **Egg cycle / hatch step data** — No per-species egg cycle table. Scripts hard-code 15,000 steps max. Need species → egg_cycles mapping (e.g. Magikarp = 1,280 steps, Charmander = 5,120) for time estimates and smarter hatch loops.

## Pokedex
- [ ] Add a "Hunt Notes" or "Facts" section on species cards — transfer guides, nature tips, evolution notes, availability quirks, etc. (currently using shiny_availability.notes as a stopgap)

## Save Timeline
- [ ] **User-defined save tags** — Free-form tags on checkpoints (e.g. "hunt base", "pre-elite-four", "trade ready") to replace the dropped auto-classification of hunt_base/daycare_swap. Tags should be filterable and usable for grouping in the grouped view. Schema: `checkpoint_tags` join table with `checkpoint_id` + `tag` string. UI: tag chips on the detail panel with inline add/remove.

## Save System — Deferred
- [ ] **TanStack Query on frontend** — Replace manual fetch + useState with TanStack Query for saves/hunts. Gives optimistic updates, cache invalidation, refetch-on-focus for free. Currently using a simple in-memory cache with 5-min TTL.

## Live Game Overlay (HUD)
- [ ] **Emulator memory reading for live game state** — Lua scripts (mGBA) read player location, party, badges, bag contents from known memory addresses and report via stdout. Server relays to frontend via SSE. Gen 1–3 first (mGBA Lua), Gen 4–5 later (melonDS external memory read or save state polling), Gen 6–7 deferred (Azahar maturity / FTP save polling).
- [ ] **Map ID → location lookup tables** — Gen 1–4 and Gen 7 done. Still need Gen 5 (Unova) and Gen 6 (Kalos) tables.
- [ ] **Zone-based map calibration** — Calibration UI for location markers exists (CalibrationPanel, SubMarkerCalibration). Still need zone bounding box mapping and player position interpolation within zones for smooth tracking.
- [ ] **WebRTC overlay components** — React HUD layer over the emulator video stream. Floating UI with `pointer-events: none` for passive elements, interactive for expandable panels. Toggle-able with a hotkey. Possible overlays:
  - Current location objectives from the guide (auto-checked on completion)
  - Live party viewer (HP bars, levels, status)
  - Encounter counter / shiny odds tracker
  - "Missed item" nudges based on guide data
  - Minimap with player position dot
  - Route encounter table on grass/cave/surf entry — show available Pokemon with rates, levels, and collection status (caught/need) by cross-referencing PokeAPI encounter data with the player's current pokedex flags in memory
- [ ] **Auto-journal** — Save-level diffing exists via `diffSnapshots()` (badges, shinies, party, location). Still need live memory polling to detect events between saves for continuous journaling.

## Dependency Auto-Install — Followups

Shipped 2026-04-12 on `main` (merge `47872b7`). The auto-install feature works end-to-end on Linux; these are the open items that landed either partially, deferred, or were discovered during implementation.

- [ ] **BGB trade-route rewire** — `server/src/routes/launcher.ts` `/trade` endpoint currently spawns mGBA even in link-capable mode. Needs rewiring to spawn BGB (`bgb.exe` under Wine on Linux/macOS, native on Windows) with its listen/connect link args, plus a 2-instance orchestration for Gen 1↔2 trades. Deferred per original spec. Memory: `project_bgb_trade_rewire.md`.
- [ ] **Windows hunt-binary CI build** — `release.yml` still stubs `shiny_hunter_{core,wild,egg}` + `libmgba.dll` to empty files on the windows-latest matrix leg. Core-engine hunts are non-functional on packaged Windows releases until fixed. Plan:
  - Set up MSYS2 via `msys2/setup-msys2@v2` GitHub action
  - `pacman -S mingw-w64-x86_64-{gcc,cmake,make,lua,libzip,libpng}`
  - Clone mGBA at pinned commit `c80f3afd7708e2e7d2f0f5175ba21fa2b70a424c`, cmake + build
  - Compile hunt binaries with mingw-w64 gcc → `.exe` output
  - Copy `libmgba.dll` next to `shiny_hunter_*.exe` (Windows searches exe dir first, no rpath needed)
  - Update `hunts.ts` so `CORE_HUNTER` / `WILD_HUNTER` / `EGG_HUNTER` append `.exe` on `process.platform === 'win32'`
  - Add third resource mapping in `tauri.conf.json` for `.exe` + `.dll` filenames
- [ ] **macOS hunt-binary CI validation** — `release.yml` has a full macOS matrix build (brew + cmake + `@loader_path` rpath + `install_name_tool -change`), but it's untested — never run in actual GitHub Actions. First release tag will tell us if the yaml is right. Track the first run and iterate if it fails.
- [ ] **Previously-installed versions cleanup UI** — When the user updates mGBA from 0.10.3 → 0.10.5, the spec calls for keeping the old version on disk side-by-side (already supported at the filesystem level via versioned subdirs). The v1 `DependencyCard` doesn't surface this — needs a "Previously installed versions" disclosure with per-version delete buttons.
- [ ] **Runtime BIOS file validation** — `BiosSection` currently shows a static "Expected files by emulator" list. Backend should actually `statSync` the expected files in `paths.biosDir` and return `{ found: [], missing: [] }` per emulator. Small v1.1 polish.
- [ ] **`freeze-manifest.ts` at release time** — `scripts/freeze-manifest.ts` exists but isn't wired into the release workflow. Before tagging a release, manually run `bun scripts/freeze-manifest.ts` to populate real SHA256s and `sizeBytes` in `server/src/data/dependency-manifest.json`, then commit. CI has a check (`release.yml` "Verify dependency manifest is frozen" step) that fails if any `PLACEHOLDER_*` strings remain, so a forgotten freeze will fail the release build instead of silently shipping broken hashes.
- [ ] **Azahar manifest URLs** — populated for 2125.0.1 but URLs need re-verification at each Azahar release. The `coreAbiLock: false` (Azahar isn't hunt-ABI-locked) means you can bump it independently of the hunt binaries. `freeze-manifest.ts` handles the SHA256 update automatically.

## Portable / Offline App
- [ ] **PWA support** — Add `vite-plugin-pwa`, service worker, and manifest.json for installable offline app (home screen icon, standalone window, no browser chrome)
- [ ] **Pre-seeded database** — Ship pokemon.db with species table already populated so first launch doesn't need PokeAPI. Seed.ts becomes an optional "update species data" command.
- [ ] **Bun migration** — Replace Node + better-sqlite3 with Bun (built-in SQLite, single binary, cross-platform). Eliminates native addon compilation per platform.
- [ ] **Cross-platform hunt binaries** — CI pipeline (GitHub Actions) to cross-compile mGBA headless + C++ hunt binaries for x86_64-linux, aarch64-linux, darwin-arm64, darwin-x64, windows-x64.
- [ ] **Tauri wrapper** — Native app shell using system webview. Launches Express server as sidecar, manages hunt binary lifecycle. Produces single distributable per platform (.AppImage, .dmg, .exe).
- [ ] **Offline update mechanism** — Version check on launch (skips silently if offline). Species/availability updates ship as .db patch files, applied via SQLite ATTACH DATABASE.
- [ ] **Single-directory distribution** — Everything in one folder: server dist, client dist, platform binaries, pre-seeded DB, saves. One command (or double-click via Tauri) to run.
