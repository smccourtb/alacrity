# ALA-7: Pokemon Card Save-File Link — Auto-Populate + Actions

## Problem

The Pokemon card's "Link a save file..." control in `SummaryCard.tsx` shows the
empty-state button even when the pokemon was resolved from a managed save. The
`_readonly` identity entries built in `SpeciesDetail.tsx:39-74` never propagate
the source save's filename or path onto the entry shape, so the card falls
through to the empty-state branch at `SummaryCard.tsx:288`. The click handler is
a `/* TODO: open save picker */` stub.

## Goals

1. Pokemon from managed saves automatically display their source save file in
   the card (filename, path, existing "synced" badge).
2. Add a per-entry dropdown with two actions:
   - **Show on Play page** — navigate to `/play`, select the matching row in the
     Grouped view, scroll it into view, and briefly pulse it.
   - **Copy save file** — copy the actual file to the OS clipboard so the user
     can paste it into Finder/Explorer/file manager.
3. Preserve the existing manual-entry flow: unlinked manual entries still show
   the "Link a save file..." empty state and can pick a save via `SavePicker`.

## Non-Goals

- Converting a manually-edited identity entry into a manual entry. Identity
  entries are hard read-only today (`SpeciesDetail.tsx:106`); the user will
  file a separate ticket for edit-creates-manual-copy behavior.
- Changing how checkpoints / save files are modeled in the DB.
- Any change to bank entries — they have no single source save file.

## Architecture

Four changes, in dependency order:

### 1. Backend: include save file fields in `resolveCollection`

File: `server/src/services/identityService.ts`

The `checkpointQuery` at line 521 joins `checkpoints c` and `playthroughs pt`
but not `save_files`. Add a `JOIN save_files sf ON sf.id = c.save_file_id` and
select:

- `sf.id AS save_file_id`
- `sf.filename AS save_filename`
- `sf.file_path AS save_file_path`

Add matching fields to `SightingRow` and to the `CollectionEntry` shape
(`server/src/services/identityService.ts` — the `entries.push(...)` block
around line 613).

Bank entries already don't have a single linked save file; leave their
`save_file_id`/`save_filename`/`save_file_path` as `null`.

### 2. Frontend: propagate fields through `SpeciesDetail.fromIdentity`

File: `client/src/components/pokemon/SpeciesDetail.tsx:39-74`

Add `save_file_id: e.save_file_id`, `save_filename: e.save_filename`,
`save_file_path: e.save_file_path`, and `game: e.game` to the object returned
from the `fromIdentity` mapper. No other changes — `SummaryCard`'s existing
linked-state branch (`SummaryCard.tsx:267-287`) already renders
`entry.save_filename` and `entry.save_file_path`, so display works once the
data is present.

### 3. SummaryCard: actions dropdown

File: `client/src/components/pokemon/SummaryCard.tsx:265-297`

Replace the hard-coded "Unlink" button with a shadcn `DropdownMenu` triggered
by a kebab icon button. Menu contents are source-dependent:

**All linked entries:**
- `Show on Play page` — calls `navigate(`/play?save=${entry.save_file_id}`)`
  via `react-router-dom`.
- `Copy save file` — calls
  `invoke('copy_file_to_clipboard', { path: entry.save_file_path })` then
  shows a toast (`Copied save file to clipboard` on success, error text on
  failure). Uses `@tauri-apps/api/core`.

**Manual entries only** (`entry.source === 'manual'`):
- `Unlink` — preserves existing
  `onUpdate({ source_save: null, checkpoint_id: null })` behavior.

**Empty state** (unchanged conditions): dashed "Link a save file..." button,
shown only when both `save_filename` and `source_save` are falsy. Wire up the
click to open the existing `SavePicker` component (already imported into the
project — see `client/src/components/SavePicker.tsx`) in a dialog. Selecting
a save calls `onUpdate({ source_save: <filename>, checkpoint_id: <id> })` and
closes the dialog. For identity entries this branch is unreachable because
they always carry a save filename after Change #2.

Identity entries see the dropdown but never the "Unlink" item, matching their
read-only semantics.

### 4. PlayPage: deep-link highlight

File: `client/src/pages/PlayPage.tsx`

Read `save` from the URL search params on mount (`useSearchParams`). When
present:

1. After `treeRoots` loads, find the `CheckpointNode` whose `save_file_id`
   matches. If none found, clear the param and do nothing.
2. Set `selectedGame` to the matching playthrough's normalized game name.
3. Set `selectedNodeId` and `detailNodeId` to the node's checkpoint `id`, so
   the existing `isSelected` styling in `GroupedView.tsx:245` applies.
4. Trigger a scroll + pulse on the row via new `GroupedView` props
   `scrollToSaveFileId` and `pulseSaveFileId`. Clear both after the effect
   fires so they don't re-trigger on re-render.
5. Clear the `save` query param after handoff (via `setSearchParams({})`) so
   revisiting the page doesn't re-scroll.

File: `client/src/components/timeline/GroupedView.tsx`

Add two new optional props:

- `scrollToSaveFileId?: number`
- `pulseSaveFileId?: number`

Implementation:

- Maintain a `Map<number, HTMLElement>` via a ref, populated by
  `SortableSaveRow` registering/unregistering its outer element in a `useEffect`.
- When `scrollToSaveFileId` changes to a defined value, call
  `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the matching
  element inside a `useEffect`.
- When `pulseSaveFileId` changes, add a `ring-2 ring-primary` class (plus
  `transition-all`) to the matching element, set a 2000 ms timer to remove
  it. Clean up the timer on unmount / prop change.

### 5. Tauri: `copy_file_to_clipboard` command

File: `src-tauri/src/lib.rs` (plus `main.rs` invoke handler registration)

New Tauri command, shell-out per platform, no new Rust crates:

```rust
#[tauri::command]
async fn copy_file_to_clipboard(path: String) -> Result<(), String> {
    // Validate: path must exist and be a regular file
    let pb = std::path::PathBuf::from(&path);
    if !pb.is_file() {
        return Err(format!("Not a file: {path}"));
    }

    #[cfg(target_os = "macos")]
    {
        // Use arg array, not string concat — avoids AppleScript injection
        // via quotes in the filename.
        let script = format!(
            r#"set the clipboard to (POSIX file "{}")"#,
            path.replace('"', "\\\"")
        );
        std::process::Command::new("osascript")
            .args(["-e", &script])
            .status()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        let script = format!("Set-Clipboard -Path '{}'", path.replace('\'', "''"));
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let uri = format!("file://{}", path);
        let mut child = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-t", "text/uri-list", "-i"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("xclip not available: {e}"))?;
        child.stdin.as_mut().unwrap().write_all(uri.as_bytes())
            .map_err(|e| e.to_string())?;
        child.wait().map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

Register in the `invoke_handler!` macro. Frontend calls via
`import { invoke } from '@tauri-apps/api/core'`.

Escaping details matter: on macOS, paths containing `"` need the `\"` escape
shown; on Windows PowerShell, `'` needs doubling. Both escapes are applied in
the code above. The `pb.is_file()` guard rejects obviously-bad input before
any shell handoff.

## Data Shapes

**Extended `CollectionEntry`:**

```ts
interface CollectionEntry {
  // ...existing fields
  save_file_id: number | null;      // null for bank entries
  save_filename: string | null;
  save_file_path: string | null;
  game: string | null;               // already present for some paths
}
```

**URL param contract:**

- `/play?save=<save_file_id>` — Play page finds the node, scrolls, pulses, clears the param.

**Tauri command:**

- `invoke('copy_file_to_clipboard', { path: string }) -> Promise<void>` (rejects with error string).

## Error Handling

- `copy_file_to_clipboard` rejects early if the path is not a regular file.
- Frontend catches rejection and surfaces the error via toast.
- On PlayPage, if the `save` param doesn't match any node, clear the param
  silently (no toast). The user may have stale state or an old URL.
- Shell command failures bubble up as `Result::Err` and surface as toast text.

## Testing

No test framework in this repo. Manual verification:

1. Open a pokemon from a managed save in the card — confirm save filename +
   path + "synced" badge appear automatically.
2. Click the dropdown → Show on Play page — confirm navigation, correct game
   selected, row highlighted and scrolled into view with a pulse.
3. Click the dropdown → Copy save file — paste into Finder/Explorer; confirm
   the actual save file is pasted, not a text path.
4. Open a manual pokemon with no linked save — confirm dashed "Link a save
   file..." button appears and opens `SavePicker`.
5. Link a manual pokemon to a save via the picker — confirm the linked state
   renders and the dropdown has the "Unlink" option (identity entries do not).
6. Unlink a manual entry — confirm the dashed button returns.
7. Open a bank entry — confirm no save-file section or a graceful empty state
   (no crash from null `save_file_path`).
8. Edge case: paste a path containing `"` (macOS) or `'` (Windows) and confirm
   the escape works.
