# ALA-7: Pokemon Card Save-Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-populate linked save info on pokemon card for managed-save entries, and add a dropdown with "Show on Play page" and "Copy save file" actions.

**Architecture:** Thread save-file fields (`save_file_id`, `save_filename`, `save_file_path`) from the backend `resolveCollection` query through `SpeciesDetail.fromIdentity` into `SummaryCard`. Replace the hard-coded "Unlink" button with a shadcn `DropdownMenu`. Add a `save` URL param handoff on PlayPage that scrolls and pulses the matching row via a `data-save-file-id` DOM attribute. Add a zero-deps Tauri command `copy_file_to_clipboard` that shells out per platform.

**Tech Stack:** Express 5 + `bun:sqlite`, React 19 + `react-router-dom`, shadcn `DropdownMenu`, Tauri 2 (`@tauri-apps/api/core`), platform shell-out (osascript / PowerShell / xclip).

**Repo conventions:** No test framework. TypeScript + ESLint are the only automated checks. "Verify it works" = run the dev loop (`cd src-tauri && bun run tauri dev`) and click through. Prefer small, commit-per-task increments — the repo follows Conventional Commits (see `git log`).

**Scope note:** The empty-state "Link a save file..." button's TODO stub (`SummaryCard.tsx:290`) is **out of scope** for this plan. It only affects manual entries and will be handled in a follow-up ticket. This plan touches it only to the extent of not breaking it.

---

## File Structure

**Modified:**
- `server/src/services/identityService.ts` — extend `CollectionEntry`, `SightingRow`, and the `checkpointQuery` to include save file fields
- `client/src/components/pokemon/SpeciesDetail.tsx` — propagate new fields in `fromIdentity` mapper
- `client/src/components/pokemon/SummaryCard.tsx` — replace inline "Unlink" with actions dropdown; wire navigate + Tauri invoke
- `client/src/pages/PlayPage.tsx` — read `save` URL param on mount; dispatch scroll/pulse to GroupedView
- `client/src/components/timeline/GroupedView.tsx` — add `scrollToSaveFileId`/`pulseSaveFileId` props; tag rows with `data-save-file-id`; implement scroll + pulse effect
- `src-tauri/src/main.rs` — add `copy_file_to_clipboard` command; register in `invoke_handler!`

**Not modified:**
- `client/src/components/SavePicker.tsx` — untouched
- `src-tauri/Cargo.toml` — no new deps (shell-out approach)

---

## Task 1: Backend — extend `CollectionEntry` and `resolveCollection`

**Files:**
- Modify: `server/src/services/identityService.ts:53-69` (interface)
- Modify: `server/src/services/identityService.ts:504-517` (SightingRow)
- Modify: `server/src/services/identityService.ts:521-553` (checkpointQuery)
- Modify: `server/src/services/identityService.ts:556-574` (bankQuery)
- Modify: `server/src/services/identityService.ts:609-630` (entries.push)

- [ ] **Step 1: Extend `CollectionEntry` interface**

Edit `server/src/services/identityService.ts:53-69` to add three fields after `playthrough_id`:

```ts
export interface CollectionEntry {
  identity_id: number;
  fingerprint: string;
  gen: number;
  species_id: number;
  level: number | null;
  box_slot: string | null;
  snapshot_data: string | null;
  checkpoint_id: number | null;
  bank_file_id: number | null;
  sighting_created_at: string;
  is_home: boolean;
  game: string | null;
  playthrough_id: number | null;
  save_file_id: number | null;
  save_filename: string | null;
  save_file_path: string | null;
  ot_name: string | null;
  ot_tid: number | null;
}
```

- [ ] **Step 2: Extend `SightingRow` interface**

Edit `server/src/services/identityService.ts:504-517`:

```ts
interface SightingRow {
  identity_id: number;
  fingerprint: string;
  gen: number;
  species_id: number;
  level: number | null;
  box_slot: string | null;
  snapshot_data: string | null;
  checkpoint_id: number | null;
  bank_file_id: number | null;
  created_at: string;
  game: string | null;
  playthrough_id: number | null;
  save_file_id: number | null;
  save_filename: string | null;
  save_file_path: string | null;
}
```

- [ ] **Step 3: Add save_files join + fields to `checkpointQuery`**

Edit `server/src/services/identityService.ts:521-542`:

```ts
  let checkpointQuery = `
    SELECT
      s.identity_id,
      pi.fingerprint,
      pi.gen,
      s.species_id,
      s.level,
      s.box_slot,
      s.snapshot_data,
      s.checkpoint_id,
      NULL as bank_file_id,
      s.created_at,
      pt.game,
      pt.id as playthrough_id,
      sf.id as save_file_id,
      sf.filename as save_filename,
      sf.file_path as save_file_path
    FROM collection_saves s
    JOIN pokemon_identity pi ON pi.id = s.identity_id
    JOIN checkpoints c ON c.id = s.checkpoint_id
    JOIN playthroughs pt ON pt.id = c.playthrough_id
    JOIN save_files sf ON sf.id = c.save_file_id
    WHERE c.include_in_collection = 1
      AND c.archived = 0
      AND pt.include_in_collection = 1
  `;
```

- [ ] **Step 4: Add NULL save file fields to `bankQuery`**

Edit `server/src/services/identityService.ts:556-574`:

```ts
  const bankQuery = `
    SELECT
      s.identity_id,
      pi.fingerprint,
      pi.gen,
      s.species_id,
      s.level,
      s.box_slot,
      s.snapshot_data,
      NULL as checkpoint_id,
      s.bank_file_id,
      s.created_at,
      sf.game,
      NULL as playthrough_id,
      NULL as save_file_id,
      NULL as save_filename,
      NULL as save_file_path
    FROM collection_bank s
    JOIN pokemon_identity pi ON pi.id = s.identity_id
    JOIN save_files sf ON sf.id = s.bank_file_id
    WHERE (sf.format = 'bank' OR sf.source IN ('pksm', 'bank'))
  `;
```

- [ ] **Step 5: Propagate fields into `entries.push`**

Edit `server/src/services/identityService.ts:613-629`:

```ts
    entries.push({
      identity_id: sighting.identity_id,
      fingerprint: sighting.fingerprint,
      gen: sighting.gen,
      species_id: sighting.species_id,
      level: sighting.level,
      box_slot: sighting.box_slot,
      snapshot_data: sighting.snapshot_data,
      checkpoint_id: sighting.checkpoint_id,
      bank_file_id: sighting.bank_file_id,
      sighting_created_at: sighting.created_at,
      is_home: true,
      game: sighting.game,
      playthrough_id: sighting.playthrough_id,
      save_file_id: sighting.save_file_id,
      save_filename: sighting.save_filename,
      save_file_path: sighting.save_file_path,
      ot_name: ot?.ot_name ?? null,
      ot_tid: ot?.ot_tid ?? null,
    });
```

- [ ] **Step 6: Typecheck the server**

Run: `cd server && bun run tsc --noEmit` (or `cd server && bunx tsc --noEmit`)
Expected: exits 0 with no errors.

If the script name differs, check `server/package.json` for a `typecheck` / `check` script and use that. As a last resort, run `bunx tsc --noEmit -p server/tsconfig.json` from the repo root.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/identityService.ts
git commit -m "feat(server): include save file fields in resolveCollection output (ALA-7)"
```

---

## Task 2: Frontend — propagate save fields through `SpeciesDetail.fromIdentity`

**Files:**
- Modify: `client/src/components/pokemon/SpeciesDetail.tsx:39-74`

- [ ] **Step 1: Add fields to the `fromIdentity` mapper**

Edit `client/src/components/pokemon/SpeciesDetail.tsx:39-74`. Add four new fields after `checkpoint_id: e.checkpoint_id,`:

```ts
      const fromIdentity = identityAll
        .filter((e: any) => e.species_id === species.id)
        .map((e: any) => {
          const snap = e.snapshot_data
            ? (typeof e.snapshot_data === 'string' ? JSON.parse(e.snapshot_data) : e.snapshot_data)
            : {};
          return {
            id: `identity_${e.identity_id}`,
            species_id: e.species_id,
            species_name: snap.species_name || species.name,
            level: e.level ?? snap.level,
            is_shiny: snap.is_shiny ? 1 : 0,
            origin_game: snap.origin_game ?? e.game ?? null,
            ball: snap.ball ?? null,
            nature: snap.nature ?? null,
            ability: snap.ability ?? null,
            gender: snap.gender ?? null,
            nickname: snap.nickname ?? null,
            ot_name: snap.ot_name ?? e.ot_name ?? null,
            ot_tid: snap.ot_tid ?? e.ot_tid ?? null,
            sprite_url: species.sprite_url,
            shiny_sprite_url: species.shiny_sprite_url,
            ribbons: '[]',
            marks: '[]',
            move1: snap.moves?.[0] ?? null,
            move2: snap.moves?.[1] ?? null,
            move3: snap.moves?.[2] ?? null,
            move4: snap.moves?.[3] ?? null,
            ivs: snap.ivs ?? null,
            evs: snap.evs ?? null,
            source: e.checkpoint_id ? 'save' : 'bank',
            identity_id: e.identity_id,
            checkpoint_id: e.checkpoint_id,
            save_file_id: e.save_file_id ?? null,
            save_filename: e.save_filename ?? null,
            save_file_path: e.save_file_path ?? null,
            game: e.game ?? null,
            _readonly: true,
          };
        });
```

- [ ] **Step 2: Verify visually in dev**

Run: `cd src-tauri && bun run tauri dev`
Wait for the window to open. Open Pokedex, click a pokemon that was imported from a managed save. In the SummaryCard, the save-file row should now show the filename + path instead of the dashed "Link a save file..." button.

Expected: Linked state renders automatically for managed-save entries. Bank entries still show the empty-state dashed button. No TypeScript errors in the Vite output.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pokemon/SpeciesDetail.tsx
git commit -m "feat(client): pass save file info through SpeciesDetail fromIdentity mapper (ALA-7)"
```

---

## Task 3: Tauri — `copy_file_to_clipboard` command

**Files:**
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add the command function**

Edit `src-tauri/src/main.rs`. Add this function after the existing `get_server_port` command (around line 23):

```rust
#[tauri::command]
async fn copy_file_to_clipboard(path: String) -> Result<(), String> {
    let pb = std::path::PathBuf::from(&path);
    if !pb.is_file() {
        return Err(format!("Not a file: {path}"));
    }

    #[cfg(target_os = "macos")]
    {
        let escaped = path.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(r#"set the clipboard to (POSIX file "{escaped}")"#);
        let status = std::process::Command::new("osascript")
            .args(["-e", &script])
            .status()
            .map_err(|e| format!("osascript failed: {e}"))?;
        if !status.success() {
            return Err(format!("osascript exited with status {status}"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        let escaped = path.replace('\'', "''");
        let script = format!("Set-Clipboard -Path '{escaped}'");
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| format!("powershell failed: {e}"))?;
        if !status.success() {
            return Err(format!("powershell exited with status {status}"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let uri = format!("file://{path}\n");
        let mut child = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-t", "text/uri-list", "-i"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("xclip not available: {e}"))?;
        child
            .stdin
            .as_mut()
            .ok_or_else(|| "failed to open xclip stdin".to_string())?
            .write_all(uri.as_bytes())
            .map_err(|e| format!("xclip write failed: {e}"))?;
        let status = child.wait().map_err(|e| format!("xclip wait failed: {e}"))?;
        if !status.success() {
            return Err(format!("xclip exited with status {status}"));
        }
    }

    Ok(())
}
```

- [ ] **Step 2: Register the command in `invoke_handler!`**

Edit `src-tauri/src/main.rs:72` — change:

```rust
        .invoke_handler(tauri::generate_handler![get_server_port])
```

to:

```rust
        .invoke_handler(tauri::generate_handler![get_server_port, copy_file_to_clipboard])
```

- [ ] **Step 3: Build the Rust side**

Run: `cd src-tauri && cargo check`
Expected: exits 0 with no errors. Warnings about unused imports are OK.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat(tauri): add copy_file_to_clipboard command (ALA-7)"
```

---

## Task 4: SummaryCard — actions dropdown

**Files:**
- Modify: `client/src/components/pokemon/SummaryCard.tsx:265-297`

Context: the shadcn dropdown-menu component lives at `client/src/components/ui/dropdown-menu.tsx`. There is no toast library in this project — use `window.alert()` for error feedback and no feedback for success (the clipboard state is observable by the user). Keep it consistent with the rest of the app.

- [ ] **Step 1: Add imports**

Edit the top of `client/src/components/pokemon/SummaryCard.tsx`. Add these imports (merging with any existing imports — check the current top of file first):

```tsx
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

- [ ] **Step 2: Get `navigate` inside the component**

Find the function body of `SummaryCard` (the default export). At the top, alongside existing hook calls, add:

```tsx
  const navigate = useNavigate();
```

- [ ] **Step 3: Add the action handlers**

In the same function body, above the `return` statement, add:

```tsx
  const handleShowOnPlayPage = () => {
    if (entry.save_file_id == null) return;
    navigate(`/play?save=${entry.save_file_id}`);
  };

  const handleCopySaveFile = async () => {
    if (!entry.save_file_path) return;
    try {
      await invoke('copy_file_to_clipboard', { path: entry.save_file_path });
    } catch (err: any) {
      window.alert(`Failed to copy save file: ${err?.toString?.() ?? 'unknown error'}`);
    }
  };
```

- [ ] **Step 4: Replace the "Unlink" button with the dropdown**

Replace `client/src/components/pokemon/SummaryCard.tsx:281-286` (the `<button>` with `onClick={() => onUpdate({ source_save: null, checkpoint_id: null })}`) with:

```tsx
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded"
                  aria-label="Save file actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={handleShowOnPlayPage}
                  disabled={entry.save_file_id == null}
                >
                  Show on Play page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopySaveFile}
                  disabled={!entry.save_file_path}
                >
                  Copy save file
                </DropdownMenuItem>
                {entry.source === 'manual' && (
                  <DropdownMenuItem
                    onClick={() => onUpdate({ source_save: null, checkpoint_id: null })}
                    className="text-red-600 focus:text-red-600"
                  >
                    Unlink
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
```

Leave the rest of the linked-state block (lines 268-280 — the 💾 icon, filename, badges, path) unchanged. Leave the empty-state branch (lines 288-296) unchanged.

- [ ] **Step 5: Typecheck the client**

Run: `cd client && bunx tsc --noEmit`
Expected: exits 0.

If there's a compile error about `entry.save_file_id` / `entry.save_file_path` / `entry.game` / `entry.source` not existing on the entry type, check whether `SummaryCard` has a local `Props`/`entry` type and widen it (these fields come in via `SpeciesDetail.tsx` Task 2 and may not be declared in a local interface). If a local type exists, add the three fields as optional.

- [ ] **Step 6: Verify in dev**

Dev server should still be running from Task 2. Hot-reload; open a managed-save pokemon. Click the kebab button: should see "Show on Play page" and "Copy save file" items. Click "Copy save file", switch to Finder, press Cmd+V — the `.sav` file should paste. Click "Show on Play page" — route changes to `/play?save=<id>` (highlight happens in Task 6, not yet).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pokemon/SummaryCard.tsx
git commit -m "feat(client): SummaryCard actions dropdown with Show/Copy (ALA-7)"
```

---

## Task 5: GroupedView — `data-save-file-id` attribute and scroll/pulse props

**Files:**
- Modify: `client/src/components/timeline/GroupedView.tsx:177-191` (SortableSaveRow)
- Modify: `client/src/components/timeline/GroupedView.tsx` (top — component props interface and effect)

- [ ] **Step 1: Tag `SortableSaveRow` with `data-save-file-id`**

Edit `client/src/components/timeline/GroupedView.tsx:186-190`:

```tsx
  return (
    <div ref={setNodeRef} style={style} data-save-file-id={props.node.save_file_id}>
      <SaveRow {...props} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
```

- [ ] **Step 2: Add props to `GroupedView`**

Find the `GroupedView` component's props interface (search for `interface GroupedViewProps` or `GroupedView` function signature). Add two optional fields:

```tsx
  scrollToSaveFileId?: number | null;
  pulseSaveFileId?: number | null;
```

Destructure them in the function signature alongside the other props.

- [ ] **Step 3: Implement scroll + pulse effect**

Inside the `GroupedView` function body, add this effect near the other `useEffect` calls (import `useEffect` if not already imported):

```tsx
  useEffect(() => {
    if (scrollToSaveFileId == null && pulseSaveFileId == null) return;
    const targetId = scrollToSaveFileId ?? pulseSaveFileId;
    const el = document.querySelector<HTMLElement>(
      `[data-save-file-id="${targetId}"]`,
    );
    if (!el) return;
    if (scrollToSaveFileId != null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (pulseSaveFileId != null) {
      el.classList.add('ring-2', 'ring-primary', 'transition-all');
      const timer = setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary', 'transition-all');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [scrollToSaveFileId, pulseSaveFileId]);
```

Document query is fine here because rows live within a single mounted view and the `data-save-file-id` attribute is unique per row.

- [ ] **Step 4: Typecheck the client**

Run: `cd client && bunx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/timeline/GroupedView.tsx
git commit -m "feat(client): GroupedView scroll/pulse handoff props (ALA-7)"
```

---

## Task 6: PlayPage — read `save` URL param and dispatch highlight

**Files:**
- Modify: `client/src/pages/PlayPage.tsx`

Context: The `GroupedView` component is rendered somewhere inside `PlayPage`'s JSX. We need to pass `scrollToSaveFileId` / `pulseSaveFileId` props to it whenever the `save` URL param is set, then clear the param so it doesn't retrigger on re-render.

- [ ] **Step 1: Add `useSearchParams` import**

At the top of `client/src/pages/PlayPage.tsx`, if `useSearchParams` isn't already imported from `react-router-dom`, add it. Merge into an existing import line if possible:

```tsx
import { useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2: Add state for handoff**

Near the other `useState` calls in `PlayPage`, add:

```tsx
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightSaveId, setHighlightSaveId] = useState<number | null>(null);
```

- [ ] **Step 3: Wire the handoff effect**

After `treeRoots` has been loaded (find the existing effect that populates `treeRoots` or a place where it's already populated), add a new effect that reacts to `searchParams` + `treeRoots` becoming ready:

```tsx
  useEffect(() => {
    const rawSave = searchParams.get('save');
    if (!rawSave) return;
    const saveFileId = Number(rawSave);
    if (Number.isNaN(saveFileId)) {
      setSearchParams({}, { replace: true });
      return;
    }
    if (treeRoots.length === 0) return;

    const findNode = (nodes: CheckpointNode[]): CheckpointNode | null => {
      for (const n of nodes) {
        if (n.save_file_id === saveFileId) return n;
        const child = findNode(n.children ?? []);
        if (child) return child;
      }
      return null;
    };
    const match = findNode(treeRoots);
    if (!match) {
      setSearchParams({}, { replace: true });
      return;
    }

    if (match.game) setSelectedGame(normalizeGameName(match.game));
    setSelectedNodeId(match.id);
    setDetailNodeId(match.id);
    setHighlightSaveId(saveFileId);
    setSearchParams({}, { replace: true });
  }, [searchParams, treeRoots, setSearchParams]);
```

If `CheckpointNode` lacks a `children` field (inspect `client/src/components/timeline/types.ts`), adapt the recursion to use whatever the actual child field is. If the tree is flat via `allNodes` from `useTimelineFilters`, use that instead:

```tsx
    const match = allNodes.find((n: CheckpointNode) => n.save_file_id === saveFileId) ?? null;
```

Prefer `allNodes` if it already exists in scope (it does — see `PlayPage.tsx:88`).

- [ ] **Step 4: Clear highlight after one cycle**

Add a separate effect that clears `highlightSaveId` shortly after it's set, so a re-render doesn't re-trigger the pulse:

```tsx
  useEffect(() => {
    if (highlightSaveId == null) return;
    const timer = setTimeout(() => setHighlightSaveId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightSaveId]);
```

- [ ] **Step 5: Pass props to `GroupedView`**

Find the `<GroupedView ... />` usage in `PlayPage.tsx` and add two props:

```tsx
          scrollToSaveFileId={highlightSaveId}
          pulseSaveFileId={highlightSaveId}
```

- [ ] **Step 6: Typecheck the client**

Run: `cd client && bunx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 7: Verify in dev**

Hot-reload. From Pokedex, open a managed-save pokemon → kebab → "Show on Play page". Expected:
1. Route changes to Play page.
2. Correct game tab is auto-selected.
3. The corresponding save row scrolls into view (smooth scroll).
4. The row shows a primary-colored ring for ~2 seconds, then fades.
5. Returning to this Play page directly (no `save` param) does not retrigger any highlight.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/PlayPage.tsx
git commit -m "feat(client): PlayPage handoff for save highlight deep-link (ALA-7)"
```

---

## Task 7: End-to-end manual verification

No test framework exists in this repo; this task is a manual sweep across all acceptance points in the spec.

**Files:**
- None (verification only)

- [ ] **Step 1: Restart dev cleanly**

Stop any running dev session. Run: `cd src-tauri && bun run tauri dev`
Wait for the Alacrity window to appear.

- [ ] **Step 2: Managed-save auto-link display**

Open Pokedex → click any pokemon that was resolved from a managed save (checkpoint sighting, "synced" badge). Verify the save-file row in SummaryCard shows:
- 💾 icon
- save filename
- "synced" badge
- full file path underneath

No dashed "Link a save file..." button for this entry.

- [ ] **Step 3: Dropdown — Show on Play page**

Click the kebab on the linked save row → "Show on Play page". Verify:
- Route becomes `/play` (URL param cleared after handoff)
- Correct game tab selected
- Row scrolls into view
- Row pulses with a primary-color ring for ~2s

- [ ] **Step 4: Dropdown — Copy save file**

Navigate back to the same pokemon in Pokedex. Click kebab → "Copy save file". Open Finder, navigate to `~/Downloads/` (or any folder), press Cmd+V. Verify a `.sav` file with the expected filename is pasted.

- [ ] **Step 5: Bank entry (no save file)**

Open a pokemon that came from a bank (PKSM / bank file). Verify either:
- The empty-state dashed "Link a save file..." button shows (unchanged behavior), OR
- The linked row still renders but `save_file_id`/`save_file_path` are null; the dropdown items are disabled.

Either is acceptable as long as there is no crash and no stray data.

- [ ] **Step 6: Manual entry (unchanged)**

Create a manual entry (+ Add in EntrySidebar). Verify:
- Empty state dashed button still shows (existing TODO stub behavior).
- No regression in the manual entry creation path.

- [ ] **Step 7: Commit verification notes (optional)**

If nothing needs fixing, no commit. If anything fails, return to the task that owns the broken area, fix it, and re-verify.

---

## Self-Review Notes

- **Spec coverage:** Sections 1 (data flow), 2 (actions dropdown), 3 (play page handoff), 4 (Tauri command) all map to Tasks 1→6. Task 7 covers the spec's "Testing" section.
- **Scope note:** The spec's mention of wiring up `SavePicker` to the empty-state button is intentionally deferred — called out at the top of this plan and in the spec is narrower than the plan.
- **Type consistency:** `save_file_id` / `save_filename` / `save_file_path` / `game` are used consistently across server interface, frontend mapper, and component props.
- **Code completeness:** Every step that changes code shows the code.
