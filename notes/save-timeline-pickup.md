# Save Timeline — Pickup Notes (2026-04-05)

## What's Done

### Server
- `checkpoints.snapshot` column added (stores JSON SaveSnapshot at checkpoint creation time)
- `saveSnapshot.ts` — `buildSnapshot()` normalization (Gen 1-2), `diffSnapshots()` type detection
- `autoLinkage.ts` — stores snapshot on checkpoint creation, skips Gen 3+ saves
- `timeline.ts` — `/api/timeline/playthroughs/:id/tree` (enriched tree) + `/api/timeline/orphans` + `/api/timeline/scan` (bulk auto-link)
- `hunts.ts` — save-catch auto-creates checkpoint linked to source save
- `sessionManager.ts` — optional `createCheckpoint` on session resolution
- `save_files` table deduplicated (3375 → 182), unique index on `file_path`
- Bad Gen 3+ playthroughs cleaned from DB

### Client
- `SaveTimeline.tsx` — main page at `/saves` with tree + grouped views, search, filters, orphan sidebar
- `GitGraph.tsx` — SVG git-graph rail with layout algorithm
- `TimelineNode.tsx` — node cards with label, type badge, file path, date
- `NodeDetail.tsx` — expanded detail with info pills, party sprites, daycare card, actions
- `GroupedView.tsx` — category-based view
- `SavePicker.tsx` — reusable modal for save selection
- `SessionDialog.tsx` — "Add to save timeline" Switch toggle
- `App.tsx` — `/saves` route + "Saves" nav item (GitBranchIcon)
- API client updated with `timeline` group + `scan` endpoint

## Known Issues (Must Fix)

### 1. Git-graph branching not rendering
The SVG rail shows nodes but branches/forks aren't visually appearing. The layout algorithm assigns columns but the connecting lines between parent and child across different columns may not be drawing correctly. Need to debug `GitGraph.tsx` `computeLayout()` and the edge rendering — check that fork bezier curves actually render when parent.x !== child.x.

### 2. Checkpoint detail overflow
When clicking a node to expand its detail, the panel doesn't push subsequent nodes down properly. The tree uses absolute positioning for SVG alignment which means detail panels overlay instead of pushing. The current approach renders the detail panel below the tree (separate section), but this may not be ideal UX.

Possible fix: render the tree as a flex column (not absolutely positioned) and regenerate SVG positions dynamically. Or use a side panel instead of inline expansion.

### 3. Daycare data shape mismatch
The `SnapshotDaycare` in `saveSnapshot.ts` stores parents as objects `{species_id, species_name, is_shiny}`, but several frontend components (TimelineNode diff labels, GroupedView, SavePicker) may still assume string values. The NodeDetail DaycareCard was fixed but check the others — grep for `daycare.parent1` across timeline components and ensure they extract `.species_name`.

### 4. Type mismatch between server and client
`client/src/components/timeline/types.ts` defines `SaveSnapshot.daycare` as `{ parent1: string; parent2: string; offspring: string; shiny_odds: string }` but the server's `SnapshotDaycare` uses objects with `{species_id, species_name, is_shiny}` for parent1/parent2 and `{species_id, species_name}` for offspring. The client types need updating to match the actual API response shape.

### 5. Missing save metadata in node display
The timeline nodes should show more of the data that the Play page shows:
- File name and relative path (partially done)
- Notes (from save_files.notes)
- Source badge (checkpoint/library/catch)
- File size
- The Play page's `SavePreview` component could potentially be reused for the detail panel

### 6. "Link to timeline" only triggers game-wide scan
Clicking "Link to timeline" on an orphan card runs `scan(game)` which links ALL orphans for that game. Should ideally just link that specific save. Could add a dedicated endpoint or accept a save_file_id parameter in the scan.

### 7. Orphan sidebar — `original_name` used as label
The orphan cards show `original_name` from `save_files` which is often just `main` or `sav.dat` for 3DS saves. Should show the parent directory name or a more descriptive label.

### 8. Design polish needed
- Padding/spacing still not matching Play page patterns
- Cards need consistent rounded-[20px] + shadow treatment
- Filter chips and search input need style alignment
- Empty states could be more informative

## Architecture Notes

### Data Flow
```
save_files (3194 → 182 unique, scanned from disk)
  ↓ autoLinkSave() or scan endpoint
playthroughs (game + ot_name + ot_tid)
  ↓
checkpoints (parent_checkpoint_id tree, snapshot JSON)
  ↓ /api/timeline/playthroughs/:id/tree
CheckpointNode[] tree (enriched with type, diff, file_exists)
  ↓
GitGraph SVG + TimelineNode cards
```

### Key Files
| File | Purpose |
|------|---------|
| `server/src/services/saveSnapshot.ts` | Snapshot normalization + diffing |
| `server/src/services/autoLinkage.ts` | Auto-link saves to playthroughs/checkpoints |
| `server/src/routes/timeline.ts` | Tree builder, orphans, scan endpoints |
| `client/src/pages/SaveTimeline.tsx` | Main page |
| `client/src/components/timeline/GitGraph.tsx` | SVG layout + rendering |
| `client/src/components/timeline/types.ts` | Client-side TypeScript interfaces |

### Scan Behavior
The `/api/timeline/scan` endpoint bypasses `autoLinkSave`'s significance checking and creates a checkpoint for every save. This is intentional — breeding saves at the same badge/location are meaningful even if they don't represent "progression." The scan groups saves by (game, ot_name, ot_tid) and chains them linearly by upload order.

### What Gets Excluded
- `saves/checkpoint/` — 3DS backup folder (excluded from orphans + scan)
- `hunts/instance_*` — ephemeral hunt copies (excluded)
- Gen 3+ saves — parsers not supported yet, excluded from linking
- Files under 32KB — size guard prevents misidentified saves from crashing parser

## Commits (chronological)
1. `5321960` schema: add snapshot column
2. `d59c240` feat: SaveSnapshot normalization service
3. `0d98c6d` feat: store snapshot on checkpoint creation
4. `cee6982` feat: timeline API endpoints
5. `1166318` feat: hunt catch → checkpoint
6. `9e9c489` feat: session resolution checkpoint
7. `ec19351` feat: client API methods
8. `2fda173` feat: timeline UI components
9. `c8c5caf` feat: SaveTimeline page + routing
10. `a9fa5ab` feat: SavePicker modal
11. `83b58ac` feat: SessionDialog checkpoint toggle
12. `0ece2b9` fix: restyle to light theme
13. Various fixes: parse guards, dedup, prop threading, daycare objects
