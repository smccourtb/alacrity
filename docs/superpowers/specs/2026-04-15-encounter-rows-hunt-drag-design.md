# Encounter Rows + Hunt Group Drag

**Issues**: ALA-18 (encounter display), ALA-11 (hunt-as-a-group drag)  
**Date**: 2026-04-15

## Context

Hunt catch folders (`saves/catches/<game>/<hunt>/`) contain three files:
- `base.sav` — the pre-hunt starting save
- `catch.sav` — the post-catch save with the shiny in the box
- `shiny.ss1` — an mGBA save state captured at the exact moment of shiny detection

Today, discovery and the Play page only surface `base.sav` and `catch.sav`. The `shiny.ss1` file is invisible. Users should be able to see it and play it — it drops them right into the encounter moment.

Separately, hunt cards in GroupedView render 2–3 individual rows (setup, catch) that can be dragged individually but should behave as a single unit for drag-and-drop into tag sections.

## 1. Discovery — shiny.ss1 in catch folders

**File**: `server/src/services/saveDiscovery.ts`

`scanCatches()` currently loops `['catch.sav', 'base.sav']` per catch folder. Add `'shiny.ss1'` to that list.

Discovered `.ss1` saves get:
- `source: 'catch'`
- `format: '.ss1'`
- `label: '<folder> (encounter)'` — mirrors the `'<folder> (base)'` convention
- `launchable: true` when a ROM is available
- No `playTimeSeconds` or `checksum` — `.ss1` files aren't parseable game saves

The existing `SAVE_EXTENSIONS` set already includes `.ss1`, so downstream file-type checks pass.

## 2. Timeline scan — checkpoint placement for encounters

**File**: `server/src/routes/timeline.ts` (`POST /scan`)

Normal saves go through snapshot parsing → OT matching → playthrough placement. `.ss1` files can't be parsed for OT/badge/Pokemon data, so they need special handling:

1. After the main placement loop completes, iterate any unplaced `.ss1` save_files whose path is in a catch folder.
2. For each, find the sibling `catch.sav` or `base.sav` checkpoint in the same directory.
3. Attach the `.ss1` to the same playthrough as its sibling.
4. Copy the sibling's snapshot onto the encounter checkpoint (for display — game name, OT, badge count).
5. Set `include_in_collection = 0` always — encounters have no parseable Pokemon and should never feed the Pokedex.

If no sibling checkpoint exists (catch folder with only a `shiny.ss1` and no linked `base.sav`/`catch.sav`), skip placement — the encounter is orphaned until its siblings are scanned.

## 3. GroupedView — encounter as third row

**File**: `client/src/components/timeline/GroupedView.tsx`

### detectSource changes

New pattern in `detectSource()`:

```
/saves/catches/<game>/<hunt>/shiny.ss1
  → { source: 'hunt-catch', huntFolder: <hunt>, role: 'encounter' }
```

The existing catch regex (`(base|catch)\.sav$`) doesn't match `.ss1`, so this is a new branch before the library check.

### Role badge

Add to `ROLE_BADGE_VARIANT`:
```ts
encounter: 'warning'  // amber — echoes shiny gold
```

### Sort order within hunt cards

Members within a hunt folder group are sorted: `setup → encounter → catch`. This places the encounter between "where you started" and "the result." Sort key mapping:

```ts
const order = { setup: 0, encounter: 1, catch: 2, other: 3, library: 4 };
```

## 4. Play action for encounters

**New endpoint**: `POST /api/launcher/play-encounter`

**File**: `server/src/routes/launcher.ts`

Request body: `{ save_file_id: number }`

Behavior:
1. Look up the save_file row — verify it's a `.ss1` file.
2. Find the companion `.sav` in the same directory: prefer `base.sav`, fall back to `catch.sav`.
3. Find the ROM: use the game's ROM from the ROM map (same logic as existing hunt `/open`).
4. Create a temp directory, copy the companion `.sav` and the `.ss1` into it.
5. Symlink the ROM (never modified).
6. Launch mGBA: `[rom_path, '-t', ss1_path]`.
7. Return `{ ok: true, pid }`.

The temp directory is read-only from the user's perspective — if they save in-game it writes to the temp copy, not the original. No "save changed" dialog needed; the temp is ephemeral.

**Client integration**: The play handler in `NodeDetail` (or `PlayPage` handlers) checks if the checkpoint's `file_path` ends in `.ss1`. If so, calls `api.launcher.playEncounter(save_file_id)` instead of the normal play path.

**API client**: Add `launcher.playEncounter(saveFileId: number)` to `client/src/api/client.ts`.

## 5. Hunt-as-a-group drag (ALA-11)

**File**: `client/src/components/timeline/GroupedView.tsx`

### Drag source

Move the drag handle from individual hunt member rows to the hunt card header. The folder header bar (currently just a label) gains a `GripVerticalIcon` drag handle. Individual member rows inside hunt cards lose their drag handles entirely.

### Drag item ID scheme

New ID prefix: `hunt:<folder_name>`. The existing `save:<id>` prefix is for individual saves. `parseSaveId` returns null for `hunt:` IDs, so existing logic is unaffected.

Add `parseHuntId(id: string): string | null` that extracts the folder name from `hunt:<folder>`.

### handleDragEnd — group operations

When `handleDragEnd` receives a `hunt:<folder>` active item:

1. Look up all member save_file_ids for that folder from the `hunts` data structure.
2. If dropped on a tag section (`tag:<name>`): set the tag on ALL members via batch `updateTag` calls.
3. If dropped on `default`: clear tag on all members (they go to default bucket).
4. If dropped on `hunts` or no valid target: no-op.

### Tag section rendering — grouped cards

After the tag bucketing pass, detect when multiple tagged saves share a hunt folder. Re-group them into a mini-card with the same visual as the hunts section (bordered card, folder header, member rows inside).

The grouped card in a tag section has:
- A drag handle on the header (for re-dragging the group)
- A remove-tag button (×) on the header that clears the tag on all members, returning them to the hunts section
- No individual drag handles on member rows

Detection: for each tag section's rows, group by `huntFolder` from `detectSource()`. Rows with a shared `huntFolder` render as a card; standalone rows render as individual `SortableSaveRow`s.

### DragOverlay

When the active drag ID is a `hunt:<folder>`, render a compact overlay: the folder name + member count badge, styled like a condensed hunt card. Not the full expanded card — just enough to identify what's being dragged.

### Drop back to hunts

Hunts section is currently `isDropTarget={false}`. Keep it that way — removing the tag (via the × button on the grouped card header) is the way to send a group back. Alternatively, if the user drags a tagged hunt group and drops it on nothing / outside, cancel the drag (no change).

## What doesn't change

- No new DB tables or columns
- `save_file_meta` table (tags, sort order) used as-is
- Identity/collection pipeline untouched — encounters are never scanned
- Orphan sidebar unaffected (`.ss1` files in catch folders are checkpoints, not orphans)
- Hunt Dashboard / PostShinyWorkflow unchanged
- Individual save drag within tag sections and default bucket works as before
- The hunts section remains non-reorderable (auto-grouped by folder, sorted by mtime)
