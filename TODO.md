# Alacrity TODO

## 🚨 Tauri Migration Regressions (priority)

Discovered during first packaged-install smoke test on 2026-04-12. Smoke test itself passed (wiring, path resolution, AppData creation, DB seeding, sidecar arg plumbing — all correct after adding `schema.sql` + `seeds/data/` to `tauri.conf.json` resources), but uncovered four distinct issues:

- [x] ~~**P1: Attempt counter not updating in UI**~~ — Fixed in `0126992` (2026-04-13). Two real causes, neither Qt-related: (a) the HuntDashboard poll-merge in `hunts.ts` was dropping `total_attempts` on every status update, so the history row always rendered "0 encounters" even when the panel showed the real count; (b) `watchFile` (1–2 s polling) was swapped for `fs.watch` (kqueue on mac, inotify on Linux) at hit-detection + SSE log-stream sites, fixing the "logs batch right before the shiny hits" regression. Verified on mac.

- [x] ~~**P2: Lua egg hunt race condition — `!!!` logged before save state written**~~ — Moot after `0126992` (2026-04-13). Qt/Lua was the only runtime consumer of the Lua scripts, and that path was dropped on the client. The race no longer fires in any live code path. Lua scripts stay on disk as reference (see Qt/Lua cleanup section — do **not** delete). C binaries already had the two-phase pattern.

- [ ] **P3: Bundled DB / first-launch path leakage — "found my roms/saves/emulators"** — Fixed on mac in `0126992`. Real root cause (TODO's original guesses were wrong): `hunts.ts` had hardcoded `~/pokemon/roms` + `~/pokemon/saves` paths. Replaced with `paths.romsDir` / `libraryDir` / `catchesDir`, computed per-request so settings changes apply immediately. **Linux unverified** — on dev-linux the roms/saves show up on launch anyway because the real directories exist at the resolved paths; a clean Linux install with empty AppData still needs to be smoke-tested before closing this.
  - Related followup: settings UI should surface the ROM/save/emulator/BIOS directories as user-editable fields (native directory picker already wired in `1c49a5d` + `6fe745f`). Confirm those settings are exposed on the Settings page, not buried.

- [ ] **P4: Rendering lag — BLOCKING, must fix before ship** — App runs perceptibly laggy in the packaged Tauri window. **This is a regression** — the exact same client code ran perfectly smooth in Chrome via the Vite dev server before the migration. Same JS, different runtime = WebKitGTK is the variable under suspicion. "Unacceptable for shipping" per user — not a deferred optimization.

  **Step 1 — Diagnose (do NOT start fixing before this):**
  - [ ] **Chrome vs WebKit comparison test** (highest-value single action). Start the packaged sidecar manually: `/usr/lib/Alacrity/alacrity-server --data-dir ~/.local/share/com.alacrity.app --resources-dir /usr/lib/Alacrity --port 3001`. Open `http://localhost:3001` in system Chrome. Compare perceived perf against the Tauri window side-by-side on the same hunt dashboard. If Chrome is snappy → problem is 100% WebKitGTK, go to Step 2B. If Chrome is also laggy → problem is in the React code, go to Step 2A.
  - [ ] **Enable Tauri devtools in release build** via Cargo feature flag, record a Chrome DevTools Performance trace of 10s of hunt-dashboard interaction. Identify whether frames drop during JS execution, layout/style, paint, or compositing.
  - [ ] **Sidecar RTT sanity check**: `time curl http://localhost:<port>/api/hunts` — rules out server-side lag masquerading as UI lag.
  - [ ] **GPU accel check**: `glxinfo | grep -i renderer`. On the game-server this may be software-only, which would tank WebKitGTK specifically (Chromium has better software-render fallbacks).

  **Step 2A — Frontend fixes (if Chrome is also laggy):**
  - [ ] Ship client bundle code-splitting (see existing item under "Portable / Offline App"). Current client is a single 1.4MB JS chunk with zero splits — first-paint loads everything. Route-level `React.lazy` on Pokedex/Guide/SaveManager/HuntDashboard should cut first-paint cost to ~300-400KB.
  - [ ] Audit HuntDashboard SSE log rendering. 30 parallel hunt instances streaming log lines via SSE into an unmemoized list = classic re-render storm. Needs `React.memo` on log row, stable keys, and virtualized log list (not just the species grid).
  - [ ] Audit PokemonGrid under React 19 concurrent mode. Some apps regressed vs React 18 because Suspense boundaries aren't tuned.
  - [ ] Profile-and-measure before/after each change. "Feels better" isn't evidence.

  **Step 2B — Architectural options (if Chrome is snappy, WebKit isn't):**
  This is a real decision, not a knob-turn. No amount of React tuning fixes "the runtime is slow". Options in rough order of preference:
  - [ ] **B1: CEF (Chromium) backend for Tauri on Linux.** Wry (Tauri's webview abstraction) has experimental CEF support. If it's stable enough, this is the "do it right" path — same Tauri shell, same APIs, just a faster runtime on Linux. Evaluate maturity before committing.
  - [ ] **B2: Electron build for Linux specifically, keep Tauri for macOS/Windows.** Server is already a standalone sidecar and frontend is a static build; wrapping in Electron for Linux only is ~days of work. Bundle is bigger on Linux but performant. Keep the small Tauri bundle on macOS/Windows where WebKit (Safari's engine) is actually fast.
  - [ ] **B3: "Open in browser" mode on Linux.** Ship sidecar + desktop launcher that opens `http://localhost:<port>` in user's real Chrome/Firefox. Loses native window/tray/notifications, but sidesteps the entire WebKit problem and keeps the bundle tiny. Reasonable for a dev-tool-like app where users already have Chrome open.
  - [ ] **B4: Env var hacks** — `WEBKIT_DISABLE_DMABUF_RENDERER=1`, `WEBKIT_DISABLE_COMPOSITING_MODE=1`, forcing GPU accel via `WEBKIT_FORCE_SANDBOX=0`. These *sometimes* help marginally but are not a real fix; listed only for completeness / quick experiments during diagnosis.

  **Gotcha for measurement**: "Before Tauri" the client was served by Vite dev server in Chrome with HMR + source maps + no minification. The production packaged build is minified + code-eliminated, which means *production code in Chrome should be even faster than dev code was*. If production-in-Chrome doesn't feel at least as smooth as dev-in-Chrome did, the regression is partly in the build config, not just the runtime.

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

## Post-Shiny Workflow & Saves Structure — Followups

Surfaced during the first mac smoke test (2026-04-13) after running the redesigned `PostShinyWorkflow.tsx`. These are open items from that UX pass.

- [ ] **Saves page restructure: Play Saves vs Shiny Archive** — The merged Play/Saves page currently lumps archived shiny catches together with real playable library saves, but they are fundamentally different artifacts. Library saves are the real save files you pick up and continue from. Archived shiny catches are standalone transferable snapshots (share with a friend, import to another save, quick-in-quick-out trade to Bank/HOME) — not meant to be played from continuously. Split into two clearly-labeled sections with different iconography and affordances. Consider surfacing the archive's `manifest.json` data (species, DVs, hunt ID, date caught) as card metadata.
- [x] ~~**Bring saves into the app: import flow**~~ — Shipped 2026-04-13. Settings now has a "Saves" section where users register external source directories; adding a source immediately copies its save files into `libraryDir/imported/<source>/...` (sha256-deduped), then `syncSaves()` reconciles them into `save_files` / `playthroughs` / `collection_saves`. The legacy `/api/saves/import-directory` route + `collectionImport.ts` were retired in the same change. See `docs/superpowers/specs/2026-04-13-saves-import-design.md`.
- [ ] **Investigate parallel `pokemon`-table save-import pipeline** — The new collection system (`collection_saves` / `collection_bank` / `collection_manual` + `collection` VIEW) is what the Pokedex UI reads, but the old `pokemon`-table pipeline is still being run by `server/src/services/saveParser.ts:443` (`INSERT OR IGNORE INTO pokemon`), `server/src/routes/pokemon.ts /sync` and `/sync/preview`, and `parseAndImportAll`. Find out which one is canonical for which UI surface, retire the dead one. Surfaced during the saves-import design pass on 2026-04-13.
- [ ] **3DS push as a standalone feature** — Removed from `PostShinyWorkflow.tsx` during the 2026-04-13 redesign because it was a niche action buried in the per-hit workflow. Should become a dedicated feature with a broader scope: "pick any save file → push it to a 3DS over FTP". Primary use case is shuttling files through Pokémon Transporter → Bank → HOME. Sits naturally in Settings or a new "3DS Sync" page. Check existing `server/src/services/ftpSync.ts` — core logic already exists.
- [ ] **Future hunt modes: SOS, horde, chain** — Gen 6/7 introduce encounter patterns we don't model yet (SOS in S/M, horde in X/Y and ORAS, chain-style for some stationary legendaries). When these land, they slot into the `catch` vs `receive` dichotomy in `PostShinyWorkflow.tsx:deriveCatchMode()`. SOS and hordes are `catch`; chain-style radar encounters are `catch`. No `receive`-style Gen 6+ modes come to mind. Add hunt_mode enum values + update the `HuntGameSelector.tsx` PillToggle.
- [ ] **Pokedex sync button 404s on `/saves/collection`** — Button on the Pokedex page calls a route that was renamed during the `/api/identity/*` → `/api/collection/*` rewrite. Hangs silently. Find the caller in the client, repoint at the new collection endpoints, verify.
- [ ] **Missing Gen 3 entries in `GAME_METADATA`** — `server/src/routes/hunts.ts` has no Gen 3 entries at all (Ruby, Sapphire, Emerald, FireRed, LeafGreen). Add them with `romPattern` regexes that match typical filename conventions.
- [ ] **`.nds` missing from `ROM_EXTS`** — `server/src/routes/hunts.ts` omits the `.nds` extension, so Gen 4/5 ROMs never get scanned even though `GAME_METADATA` has entries for them. One-line fix.

### Qt/Lua engine removal — remaining cleanup

Dropped the Qt/Lua hunt path on 2026-04-13 (client UI removed, engine toggle gone, egg → qt auto-switch killed). Server-side cleanup completed in a follow-up pass: `scanLuaScripts` deleted, `/game-configs` no longer ships a `scripts` map, `spawnHuntProcesses` collapsed to the single core-binary path, `lua_script` removed from request body / inserts / form types / API client typings, `engine` union narrowed to `'core' | 'rng'`, and a migration drops the `lua_script` column on existing dev DBs. **`scripts/lua/*.lua` files are intentionally kept on disk as reference material** for anyone writing future hunt logic — do not delete.

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

### Done
- [x] **Pre-seeded database** — `data/pokemon.db` bundled via `tauri.conf.json` resources; `src-tauri/src/main.rs` copies it to `<dataDir>/data/pokemon.db` on first launch if missing. Seed.ts still runs in CI to produce the bundled copy.
- [x] **Bun migration** — `server/src/db.ts` and `server/src/migrate.ts` use `bun:sqlite`. No more `better-sqlite3` native addon.
- [x] **Tauri wrapper** — `src-tauri/` shell with system webview, Bun sidecar spawn, tray icon, native notifications, portable-mode sentinel detection.
- [x] **Cross-platform hunt binaries** — Linux CI builds real binaries via `scripts/build-hunters.sh`; macOS matrix leg added (untested); Windows stub deferred (see Dependency Auto-Install followups above).

### Still Needed
- [ ] **Offline update mechanism** — Version check on launch (skips silently if offline). Species/availability updates ship as .db patch files, applied via SQLite ATTACH DATABASE.
- [ ] **AppImage bundling (blocked: Bun + patchelf incompatibility)** — Adding `appimage` to `tauri.conf.json` targets fails with `linuxdeploy-plugin-gtk` aborting on `ldd` exit 1. Root cause: Tauri's AppImage path runs `patchelf` to set `rpath=$ORIGIN/../lib` on the bundled sidecar, which corrupts the Bun `--compile` binary (Bun appends a large bytecode archive after the ELF sections; patchelf's in-place section rewrite breaks parsing). Pre-patch `ldd` works, post-patch returns no output + exit 1. `.deb`/`.rpm` unaffected because they don't rpath-patch. Possible workarounds: (a) shell-script wrapper as externalBin that execs the real Bun binary shipped as a resource, (b) file upstream Tauri issue, (c) switch server away from `bun build --compile` to a different packaging strategy. Deferred — `.deb`+`.rpm` cover most Linux distros for v1.
- [ ] **First packaged install smoke test** — Build + install a release bundle on a clean machine (nuke `~/.local/share/com.alacrity.app` first), verify Tauri's AppData wiring end-to-end: DB copy, sidecar `--data-dir` arg, hunt dir creation under AppData (not bundle), libmgba.so resolution for hunt binaries, config.json read/write. Run an actual hunt as the final check.
- [ ] **Client bundle code-splitting** — Vite warns chunks exceed 500 kB after minification. Split heavy routes (Pokedex with virtualized grid, Guide, SaveManager) via dynamic `import()` / `React.lazy` so initial load isn't dragging the whole app. Affects first-launch perceived perf on the desktop app.
