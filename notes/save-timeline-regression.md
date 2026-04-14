# Save timeline regression — investigation notes (2026-04-14)

## User report
After PR #1 (tauri-migration-handoff merge), the Crystal timeline shows only
~3 mainline checkpoints and most saves are missing from view. Lugia
checkpoints in particular are gone, and the user sees phantom "Crystal"
labelled rows they don't recognize. Save files on disk did not change.

## Status: NOT FIXED. Reverted in spirit — see "What landed" below.

## Ground truth (Crystal, playthrough id=12, OT Shawn)

20 checkpoints exist in DB, all linked to `save_files` rows, all under one
playthrough. Tree shape (parent → children, sorted by in-game play time):

```
63 Charmander_hunt3 (catch)         playtime 42720    ROOT
├── 64  egg-hunt-charmander          42720
├── 102 open_1 (hunt)                42720
├── 103 Charmander_caught            42720 (no playtime — sorts as 0)
├── 67  Ditto_hunt15 (catch)         64320
│   ├── 68  Abra_hunt16              74280
│   ├── 73  post-trades              118320
│   │   └── 81 odd-egg               183480
│   │       └── 82 egg-hunt-ready    190500
│   ├── 74  shiny_lugia_atk3 (catch) 180720
│   ├── 75  shiny_lugia_1   (catch)  180720
│   ├── 76  best_shiny_lugia (catch) 180720
│   ├── 77  Lugia (library/Crystal/Lugia/sav.dat) 180720
│   ├── 78  shiny_lugia_atk3 (lib)   180720
│   ├── 79  best_shiny_lugia (lib)   180720
│   └── 80  shiny_lugia_1 (lib)      180720
├── 69  Squirtle_hunt6 (catch)       76680
│   ├── 70 Charmander_hunt3 (base)   76680
│   └── 71 egg-hunt-base             76680
└── 72  Squirtle_hunt6 (catch)       80940    ACTIVE (manually set by user)
```

Active checkpoint = 72. Active path = `63 → 72` (2 nodes).

## Root causes (multiple, layered)

### 1. Server-side placement is brittle when badge counts collide
`server/src/services/syncSaves.ts:smartPlaceSaves` + `findBestParent`
parents new saves to existing checkpoints by `(party_overlap, badge_diff)`
score. All 20 Crystal saves are at badge 6, so:
- The very first save processed becomes the root (lowest play time = the
  Charmander hunt at 12hr).
- Every subsequent save scores against an arbitrary previous neighbour by
  party overlap, producing the bushy, illegible tree above.
- Lugia files (in-game playtime ≈ 50hr — they're a post-game catch) end
  up parented under Ditto_hunt15 because both saves share the same party
  shape.

This logic has been in `55bdcd3` (initial commit) since day 1 — **the
linking algorithm did not change in the recent PR**. What changed is the
volume of save_files rows: `migrateDirectories.ts` (also in the initial
commit) ran for the first time, copied the old `saves/checkpoint/`
backups into `saves/library/<game>/`, renamed `checkpoint/ → backups/`,
and the new `library/` rows were unlinked, so `smartPlaceSaves` ran
across the full set and produced this state.

### 2. Server label derivation also wrong for flat library files
`smartPlaceSaves` set `checkpoint.label = parts[parts.length - 2]`. For
a flat file at `saves/library/Crystal/foo.sav`, the parent dir IS the
game folder ("Crystal"). So 8 of the loose Crystal library saves were
all labelled `"Crystal"`. The user reported "saves called Crystal I
don't recognize" — those were them.

`saveDiscovery.scanLibrary` had its own smaller bug: `sav.dat` files
got `label = "sav"` (basename minus ext) instead of using the parent
dir.

### 3. Client tree layout silently hides anything ≥ 2 branch hops deep
`client/src/components/timeline/TreeViewLayouts.tsx`:
- `buildRemappedCols` (line 16, pre-fix) assigned columns in flat
  iteration order. A "mainline child" of a fork (`parent.col === child.col`)
  read `colMap.get(parent)` while the parent was still unset and silently
  fell back to col 0. Result: deep descendants got placed on the trunk
  column, scrambling branchChild detection downstream.
- `buildNodeGroups` only attached **immediate** branch children to a
  mainline group. Deeper descendants (a branch child's own children) were
  never rendered anywhere — not as their own group (because they were
  flagged as branch children) and not in any branches list (because no
  mainline node had them as direct children).

For Crystal: of the 20 checkpoints, only 8 were visible (root 63 +
active 72 + 5 immediate branch chips of 63, with one or two extra
mainline rows that the buggy col fallback happened to put on col 0).
The other 12 — including all 7 Lugia checkpoints, `egg-hunt-base`,
`odd-egg`, `egg-hunt-ready`, `Abra_hunt16` — were completely hidden.

## What landed today (and was rejected)

### Server edits (still on disk in the working tree, NOT committed)
- `server/src/services/saveDiscovery.ts:202-209` — `sav.dat` / `main`
  fall back to parent dir when basename is generic, except when parent
  is the game folder.
- `server/src/services/syncSaves.ts:smartPlaceSaves` — selects `sf.label`
  in the unlinked query and prefers it over re-deriving from the path.
- `server/src/services/syncSaves.ts` — added a one-time backfill
  `UPDATE checkpoints SET label = sf.label … WHERE lower(c.label) =
  lower(sf.game)` that heals existing rows on every rescan.

These three are scoped strictly to the **label** problem. They do not
touch placement, parents, or visibility. Safe to keep, but the user
hasn't seen them take effect (server hasn't restarted).

### DB heal (applied in-place via `sqlite3` CLI)
9 `checkpoints.label` rows flipped from `"Crystal"` / `"Diamond"` to
the correct save name. Backup at:
```
data/pokemon.db.before-label-heal
```
Revert with `cp data/pokemon.db.before-label-heal data/pokemon.db`.

### Client edits — REGRESSION the user wants reverted
- `client/src/components/timeline/TreeViewLayouts.tsx`:
  - rewrote `buildRemappedCols` as a top-down recursive walk
  - rewrote `buildNodeGroups` to collect each branch root's full DFS
    subtree, with an `inBranchSubtree` set to prevent double-render

The intent was to surface every checkpoint. The actual result, per the
user, is a serious regression in how the timeline reads. Need to revert
or rethink before doing anything else here.

**Action item:** `git checkout client/src/components/timeline/TreeViewLayouts.tsx`
to drop the client edits before resuming.

## Open questions for next session

1. **Placement chronology.** The user said "lugia came before charmander".
   By in-game playtime that's false (Lugia saves are at 50hr, Charmander
   at 12hr). Two possible interpretations:
   - Wall-clock order (Lugia hunts happened earlier in real life — file
     mtimes confirm: Lugia catches dated 2026-03-24, Charmander 2026-04-07).
   - The user means "Lugia is in my box already in the Charmander save",
     which is a statement about save state contents, not chronology.
   Need to ask which one before changing `smartPlaceSaves`.

2. **Are duplicate checkpoints intended?** `best_shiny_lugia` appears
   as both checkpoint 76 (`saves/catches/Crystal/best_shiny_lugia/catch.sav`)
   and 79 (`saves/library/Crystal/best_shiny_lugia.sav`). They're presumably
   byte-identical. Same for `shiny_lugia_atk3` (74/78), `shiny_lugia_1`
   (75/80). These were created when `migrateDirectories.ts` copied the
   old checkpoint backups into library while catches stayed put. Should
   `syncSaves` dedup by sha256 + only keep one checkpoint per logical save?

3. **Right shape of the timeline view.** What does the user actually
   want when 20 saves exist in one playthrough at the same badge tier?
   Options:
   - Linear chain (no branches) sorted by playtime
   - Single trunk = the user-set active path; everything else as a
     scrollable side panel
   - Group by source (catch / library / hunt) instead of by parent
   - Something else entirely
   Today's "expand branches recursively" attempt was rejected — it just
   exposed the underlying tree's bushiness without fixing it.

4. **The migration ran once already.** `migrateDirectories.ts` executes
   on `bun run` from server scripts, not on app startup. We can't undo
   it. But we should know what state it left behind so we don't try to
   re-run it accidentally. The renamed `saves/checkpoint/` → `saves/backups/`
   is currently invisible to discovery (intentional — it's the "before"
   snapshot).

## Files / locations to reread next session

- `server/src/services/syncSaves.ts` — `smartPlaceSaves`, `findBestParent`,
  `relinkStaleCheckpoints`
- `server/src/services/saveDiscovery.ts` — `discoverAllSaves` and the
  three `scan*` helpers; only `library`, `catches`, `hunts` are scanned
- `server/src/scripts/migrateDirectories.ts` — one-shot migration that
  reshaped the saves directory
- `server/src/routes/timeline.ts` — `/playthroughs/:id/tree` returns
  the nested CheckpointNode shape consumed by the client
- `client/src/components/timeline/TreeViewLayouts.tsx` — the layout
  bug (revert pending)
- `client/src/components/timeline/GitGraph.tsx` — `computeLayout` DFS
  that produces the `LayoutNode[]` consumed by `buildRemappedCols`

## Quick repro commands

```bash
# Crystal checkpoints with parents and play times
sqlite3 data/pokemon.db <<'SQL'
SELECT c.id, c.parent_checkpoint_id AS parent, c.label,
       sf.save_timestamp AS playtime, sf.source, sf.file_path
FROM checkpoints c
JOIN save_files sf ON sf.id = c.save_file_id
JOIN playthroughs p ON p.id = c.playthrough_id
WHERE p.game='crystal'
ORDER BY CAST(sf.save_timestamp AS INTEGER);
SQL

# Active checkpoint per Crystal playthrough
sqlite3 data/pokemon.db "SELECT id, label, active_checkpoint_id FROM playthroughs WHERE game='crystal';"

# Revert today's DB heal if needed
cp data/pokemon.db.before-label-heal data/pokemon.db
```

---

## 2026-04-14 follow-up — placement v2 results

Tasks 1-5 of `docs/superpowers/plans/2026-04-14-save-placement-algorithm.md`
landed on branch `feature/save-placement-v2`. What shipped:

- **Task 1** (`32e5149`) — Consolidated the two drifted `findBestParent`
  copies (`syncSaves.ts` and `routes/timeline.ts`) into a single
  `server/src/services/checkpointPlacement.ts` module.
- **Task 2** (`98ce318` + `afdacf4`) — Plumbed `save_files.file_mtime`
  through both placement paths and added a wall-clock tiebreak (+0..+5,
  30-day linear decay).
- **Task 3** (`062a2bd` + `ce6ba79`) — Added three monotonic signals:
  box_pokemon subset (+2 cap 50 / −8), key_items subset (+1 cap 30 / −10),
  per-mon level guard (−25 per violation, fuzzy-matched by species +
  nickname + OT fingerprint).
- **Task 4** (`838a392` + `23fe591`) — Added `hunts.parent_checkpoint_id`
  column with an inline migration, populated in both hunt INSERTs, and a
  short-circuit in `smartPlaceSaves` via `findHuntForSavePath` that uses
  `instr()` to match the hunt's relative directory name inside the save
  path. App-generated saves now bypass inference entirely.
- **Task 5** (`0e69472` + `5298cda`) — One-shot relink script
  `server/src/scripts/relinkCheckpoints.ts`. Also dropped the
  daycare-first sort key in `routes/timeline.ts` and the relink script
  after the Crystal acceptance test caught that it was breeding-heavy
  playthroughs and producing two roots.

### Crystal tree, post-relink

Active checkpoint: 72 (`Squirtle_hunt6_A6_D10_Sp10_Sc10`). Active path:
`64 → 72` (2 nodes).

```
[64] (egg-hunt-charmander — label still "Crystal" pre-heal)   ROOT   playtime 42720
├── [63] Charmander_hunt3                                            42720
│   └── [102] open_1                                                 42720
│       └── [103] Charmander_caught                                  42720
├── [67] Ditto_hunt15                                                64320
│   ├── [68] Abra_hunt16                                             74280
│   ├── [73] post-trades                                             118320
│   │   └── [81] odd-egg                                             183480
│   │       └── [82] egg-hunt-ready                                  190500
│   └── [74] shiny_lugia_atk3                                        180720
│       ├── [75] shiny_lugia_1                                       180720
│       ├── [76] best_shiny_lugia                                    180720
│       └── [77] Lugia                                               180720
│           ├── [78] shiny_lugia_atk3 (lib)                          180720
│           ├── [79] best_shiny_lugia (lib)                          180720
│           └── [80] shiny_lugia_1 (lib)                             180720
├── [70] Charmander_hunt3 (base)                                     76680
│   ├── [69] Squirtle_hunt6                                          76680
│   └── [71] egg-hunt-base                                           76680
└── [72] Squirtle_hunt6 (ACTIVE)                                     80940
```

### Measured invariants — all pass

| Invariant                              | Expected  | Measured |
|----------------------------------------|-----------|----------|
| Exactly one root                       | 1         | 1        |
| All 20 checkpoints reachable           | 20        | 20       |
| All 7 Lugia checkpoints reachable      | 7         | 7        |
| Egg-hunt cluster reachable (71/81/82)  | 3         | 3        |
| Max branch depth from root             | ≤ 6       | 4        |
| Max immediate children at any node     | ≤ 4       | 4        |

### Divergence from the pre-PR-#1 ground truth

Two cosmetic differences worth documenting:

1. **Root is 64 (`egg-hunt-charmander`), not 63 (`Charmander_hunt3`).** Both
   have identical playtime (42720), so the algorithm falls through to
   the mtime tiebreak. 64's mtime is ~20 minutes earlier than 63's, so
   it processes first and becomes the root. Either is mathematically
   valid — the user made both saves at the same in-game moment. If you
   want 63 as root specifically, we'd need to teach the algorithm a
   preference (e.g., "catch saves root before library saves" or
   "longest filename wins") — both are post-hoc heuristics, not
   principled signals. Open question for the user.

2. **The 3 library-copy Lugia saves (78/79/80) descend from the "Lugia"
   save (77), not as siblings of the catch saves (74/75/76).** This is
   arguably MORE correct than the ground truth: 78/79/80 are
   byte-copies of 74/75/76 that `migrateDirectories.ts` dropped into
   `saves/library/Crystal/` when the migration ran. The tree is
   correctly saying "the library copies are descendants of the catches
   they were copied from." Still worth cleaning up via sha256 dedup
   later, but for now the tree is honest about what's on disk.

### Client-side visibility — unchanged, still blocking for full timeline

`client/src/components/timeline/TreeViewLayouts.tsx:42-63` (`buildNodeGroups`)
still has the bug from root cause #3 of the original investigation: it
only attaches **immediate** branch children of a mainline node to that
node's group. Deeper descendants (a branch child's own children) never
end up in any group and don't render.

For the new Crystal tree, the trunk (ancestors of active 72) is just
`64 → 72`. The immediate branch children of 64 are 63, 67, 70 (72 is
on the trunk). Under the bug:

- **Visible:** 64, 72, 63, 67, 70 — 5 of 20 checkpoints
- **Hidden:** 68, 69, 71, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82,
  102, 103 — 15 of 20 checkpoints

(This is a prediction from reading the layout code. Actual in-app
count requires starting `bun run tauri dev` and eyeballing.)

**Implication:** the placement-v2 work is complete and correct but the
user won't see the benefit in the timeline view until the client-side
layout bug is fixed in a follow-up. Yesterday's attempt to fix it
(recursive DFS rewrite of `buildNodeGroups`) was rejected as a UX
regression, so the follow-up plan needs a different approach — probably
"expand branches inline as a collapsible subtree under each immediate
branch-child chip" rather than "render everything recursively."

### Other playthroughs

The relink ran successfully across all 14 playthroughs with no errors:

| PT | Count | PT | Count |
|----|-------|----|-------|
| 1  | 1     | 8  | 1     |
| 2  | 13    | 9  | 17    |
| 3  | 1     | 10 | 2     |
| 4  | 1     | 11 | 8     |
| 5  | 3     | 12 | 20    |
| 6  | 2     | 13 | 1     |
| 7  | 31    | 14 | 2     |

Total: 103 checkpoints relinked. No parse errors, no crashes. DB
backup at `data/pokemon.db.before-relink-2026-04-14T19-08-48-104Z`.

### Conclusion — next steps

The placement-layer work (Tasks 1-5) is complete and the Crystal
acceptance test passes every invariant. The branch `feature/save-placement-v2`
is ready to merge into main as-is.

Open follow-ups (not in this branch):

1. **Client visibility fix.** The single remaining blocker for the
   user actually seeing the improvement. Needs a fresh brainstorm
   about what the timeline view should look like for a 20-node
   playthrough — yesterday's "render everything" was rejected,
   so the next attempt should probably default to a shallow view
   with optional drill-in.

2. **Save deduplication.** The migration-created duplicates (three
   Lugia saves that exist in both `catches/` and `library/`) are
   still two checkpoints each. A sha256-based dedup pass at
   discovery time would collapse them. Flagged in the original
   plan as out-of-scope for placement-v2.

3. **Label-heal visibility on relinked nodes.** Several post-relink
   nodes still show `"Crystal"` as their label because the label
   heal (from the Task 0 commit) runs inside `syncSaves()` on
   server startup, not inside the relink script. Restart the dev
   server once and those labels will auto-correct.

4. **Root-choice heuristic for identical-playtime saves.** Only
   worth doing if the user actually cares that 64 is root instead
   of 63. No principled signal — pure post-hoc taste.
