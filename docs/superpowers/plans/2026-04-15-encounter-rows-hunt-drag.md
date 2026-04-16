# Encounter Rows + Hunt Group Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface shiny.ss1 encounter files in Play page hunt cards with a playable launch action, and make hunt card groups draggable as a single unit to tag sections.

**Architecture:** Discovery emits shiny.ss1 as a save_file row. A post-placement step in syncSaves links .ss1 checkpoints to sibling playthroughs. GroupedView gains encounter role rendering and hunt-group drag-and-drop via dnd-kit, with tagged hunt groups preserving their card layout.

**Tech Stack:** TypeScript, React, Express 5, SQLite (bun:sqlite), dnd-kit, mGBA CLI

**Spec:** `docs/superpowers/specs/2026-04-15-encounter-rows-hunt-drag-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/services/saveDiscovery.ts` | Modify | Add shiny.ss1 to catch folder scan |
| `server/src/services/syncSaves.ts` | Modify | Post-placement step for .ss1 checkpoint linking |
| `server/src/routes/launcher.ts` | Modify | New play-encounter endpoint |
| `client/src/api/client.ts` | Modify | Add playEncounter API method |
| `client/src/components/timeline/GroupedView.tsx` | Modify | Encounter role, hunt-group drag, tagged hunt cards |
| `client/src/pages/PlayPage.tsx` | Modify | Route encounter play to new endpoint |

---

### Task 1: Discover shiny.ss1 in catch folders

**Files:**
- Modify: `server/src/services/saveDiscovery.ts:104-134`

- [ ] **Step 1: Add shiny.ss1 to the catch folder scan loop**

In `scanCatches()`, the loop at line 105 currently iterates `['catch.sav', 'base.sav']`. Add `'shiny.ss1'` and handle the label + analysis differences for state files.

```ts
// Replace line 105:
for (const saveFile of ['catch.sav', 'base.sav']) {

// With:
for (const saveFile of ['catch.sav', 'base.sav', 'shiny.ss1']) {
```

Then adjust the label and analysis logic inside the loop. Replace the label assignment at line 113 and the analysis call at line 117:

```ts
const isStateFile = saveFile === 'shiny.ss1';
const label = saveFile === 'catch.sav'
  ? catchFolder
  : saveFile === 'base.sav'
    ? `${catchFolder} (base)`
    : `${catchFolder} (encounter)`;

const romRel = gen ? ROM_MAP[game] ?? null : null;
const romPath = romRel ? join(paths.resourcesDir, romRel) : null;
// .ss1 files are binary mGBA state — can't parse for play time or meaningful checksum
const { playTimeSeconds, checksum } = isStateFile
  ? { playTimeSeconds: null, checksum: null }
  : analyzeFile(filePath, game, gen);
```

- [ ] **Step 2: Verify discovery works**

Run the dev server (`cd src-tauri && bun run tauri dev`), open the app, navigate to Play page. Trigger a save sync (the scan button or page load). Check server logs for the new shiny.ss1 rows being discovered. Verify in the DB:

```sql
SELECT id, filename, file_path, format, label FROM save_files WHERE filename = 'shiny.ss1';
```

Should show rows with format `.ss1` and labels like `Charmander_hunt3_A14_D10_Sp10_Sc10 (encounter)`.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/saveDiscovery.ts
git commit -m "feat: discover shiny.ss1 encounter files in catch folders (ALA-18)"
```

---

### Task 2: Link .ss1 checkpoints to sibling playthroughs

**Files:**
- Modify: `server/src/services/syncSaves.ts:280-384`

The `smartPlaceSaves()` function calls `buildSnapshot()` which will throw for `.ss1` files (binary state, not a game save). The `try/catch` at line 286 silently skips them. We need a follow-up step that finds these orphaned `.ss1` save_files and links them to their sibling's playthrough.

- [ ] **Step 1: Add linkEncounterSaves function**

Add this function after `smartPlaceSaves()` (after line 384):

```ts
function linkEncounterSaves() {
  // Find .ss1 save_files with no checkpoint
  const orphanedStates = db.prepare(`
    SELECT sf.id, sf.file_path, sf.game, sf.label, sf.file_mtime
    FROM save_files sf
    WHERE sf.format = '.ss1'
      AND sf.stale = 0
      AND NOT EXISTS (SELECT 1 FROM checkpoints c WHERE c.save_file_id = sf.id)
  `).all() as Array<{ id: number; file_path: string; game: string; label: string | null; file_mtime: string | null }>;

  if (orphanedStates.length === 0) return 0;

  const createCheckpoint = db.prepare(
    `INSERT INTO checkpoints (playthrough_id, save_file_id, parent_checkpoint_id, label, location_key, badge_count, is_branch, needs_confirmation, include_in_collection, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
  );

  let linked = 0;

  for (const sf of orphanedStates) {
    // Derive the catch folder from the .ss1 path: .../catches/<game>/<folder>/shiny.ss1
    const dir = sf.file_path.replace(/\/[^/]+$/, ''); // parent directory

    // Find a sibling checkpoint (catch.sav or base.sav in the same directory)
    const sibling = db.prepare(`
      SELECT c.id, c.playthrough_id, c.parent_checkpoint_id, c.snapshot, c.location_key, c.badge_count
      FROM checkpoints c
      JOIN save_files ssf ON ssf.id = c.save_file_id
      WHERE ssf.file_path LIKE ? AND ssf.format != '.ss1'
      ORDER BY ssf.filename = 'catch.sav' DESC
      LIMIT 1
    `).get(dir + '/%') as any;

    if (!sibling) continue; // No sibling checkpoint yet — skip, will link on next sync

    createCheckpoint.run(
      sibling.playthrough_id,
      sf.id,
      sibling.parent_checkpoint_id,
      sf.label || 'Encounter',
      sibling.location_key,
      sibling.badge_count,
      sibling.snapshot, // Copy sibling's snapshot for display
    );
    linked++;
  }

  if (linked > 0) console.log(`[syncSaves] Linked ${linked} encounter state files to playthroughs`);
  return linked;
}
```

- [ ] **Step 2: Call linkEncounterSaves after smartPlaceSaves**

In `syncSaves()`, after the `smartPlaceSaves(unlinked)` call (around line 138), add:

```ts
  // Link .ss1 encounter state files to their sibling's playthrough
  linkEncounterSaves();
```

- [ ] **Step 3: Verify checkpoint creation**

Restart the server, trigger a sync. Check:

```sql
SELECT c.id, sf.filename, sf.format, c.playthrough_id, c.include_in_collection
FROM checkpoints c
JOIN save_files sf ON sf.id = c.save_file_id
WHERE sf.format = '.ss1';
```

Should show checkpoints with `include_in_collection = 0` and matching playthrough IDs to their sibling saves.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/syncSaves.ts
git commit -m "feat: link encounter .ss1 checkpoints to sibling playthroughs (ALA-18)"
```

---

### Task 3: Play-encounter endpoint

**Files:**
- Modify: `server/src/routes/launcher.ts`
- Modify: `client/src/api/client.ts`

- [ ] **Step 1: Add play-encounter endpoint**

Add this endpoint in `launcher.ts` near the other play endpoints (after the existing `play` handler around line 143):

```ts
router.post('/play-encounter', (req, res) => {
  const { saveFileId } = req.body;
  if (!saveFileId) return res.status(400).json({ error: 'saveFileId required' });

  const saveRow = db.prepare('SELECT * FROM save_files WHERE id = ?').get(saveFileId) as any;
  if (!saveRow) return res.status(404).json({ error: 'Save not found' });
  if (saveRow.format !== '.ss1') return res.status(400).json({ error: 'Not a save state file' });

  // Find companion .sav in the same directory (prefer base.sav, fall back to catch.sav)
  const dir = saveRow.file_path.replace(/\/[^/]+$/, '');
  const basePath = join(dir, 'base.sav');
  const catchPath = join(dir, 'catch.sav');
  const companionPath = existsSync(basePath) ? basePath : existsSync(catchPath) ? catchPath : null;
  if (!companionPath) return res.status(400).json({ error: 'No companion save file found in catch folder' });

  // Find ROM
  const game = saveRow.game;
  const detected = detectGame(game);
  const gen = detected?.gen || null;
  const romRel = gen ? ROM_MAP[game] ?? null : null;
  const romPath = romRel ? join(paths.resourcesDir, romRel) : null;
  if (!romPath || !existsSync(romPath)) return res.status(400).json({ error: 'ROM not found for this game' });

  // Create temp directory
  const tempDir = join(dir, '.encounter_play');
  mkdirSync(tempDir, { recursive: true });

  // ROM extension — match what the ROM file actually is
  const romExt = extname(romPath);
  const romDst = join(tempDir, `rom${romExt}`);
  const savDst = join(tempDir, `rom.sav`);
  const ssDst = join(tempDir, `rom.ss1`);

  // Symlink ROM, copy save + state
  if (!existsSync(romDst)) {
    try { symlinkSync(romPath, romDst); } catch { copyFileSync(romPath, romDst); }
  }
  copyFileSync(companionPath, savDst);
  copyFileSync(saveRow.file_path, ssDst);

  // Backdate the .sav mtime so the "save modified" heuristic doesn't fire
  const companionStat = statSync(companionPath);
  utimesSync(savDst, companionStat.atime, companionStat.mtime);

  let mgbaBinary: string;
  try {
    mgbaBinary = getMgbaBinary();
  } catch (err) {
    if (err instanceof EmulatorNotInstalledError) {
      return res.status(400).json({ error: 'mGBA is not installed. Install it from Settings → Emulators.' });
    }
    throw err;
  }

  const child = spawn(mgbaBinary, [romDst, '-t', ssDst], {
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
    stdio: 'ignore',
    detached: true,
  });
  registerProcess(child, 'Encounter-play');

  res.json({ ok: true, pid: child.pid });
});
```

You'll need these imports at the top of `launcher.ts` if not already present — check and add only what's missing:

```ts
import { existsSync, mkdirSync, copyFileSync, symlinkSync, statSync, utimesSync } from 'fs';
import { join, extname } from 'path';
import { spawn } from 'child_process';
```

Also import `ROM_MAP` from saveDiscovery and `detectGame` from saveParser if not already imported. Check the file's existing imports first.

- [ ] **Step 2: Add API client method**

In `client/src/api/client.ts`, inside the `launcher` object (after the `play` method), add:

```ts
playEncounter: (saveFileId: number) => {
  invalidateCache('/launcher');
  return request<any>('/launcher/play-encounter', {
    method: 'POST',
    body: JSON.stringify({ saveFileId }),
  });
},
```

- [ ] **Step 3: Verify endpoint works**

Test with curl or the browser console:

```bash
# Find a shiny.ss1 save_file id
sqlite3 data/pokemon.db "SELECT id FROM save_files WHERE filename='shiny.ss1' LIMIT 1"
# Hit the endpoint
curl -X POST http://localhost:3001/api/launcher/play-encounter \
  -H 'Content-Type: application/json' \
  -d '{"saveFileId": <id>}'
```

mGBA should open with the encounter loaded.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/launcher.ts client/src/api/client.ts
git commit -m "feat: play-encounter endpoint launches mGBA with save state (ALA-18)"
```

---

### Task 4: GroupedView encounter rendering + play routing

**Files:**
- Modify: `client/src/components/timeline/GroupedView.tsx:38-57,119-126`
- Modify: `client/src/pages/PlayPage.tsx:317-328`

- [ ] **Step 1: Update detectSource for encounter files**

In `GroupedView.tsx`, update `detectSource()` (line 38). Add a new branch before the `catchMatch` regex that checks for `shiny.ss1`:

```ts
function detectSource(filePath: string): SaveSourceInfo {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/hunts/')) {
    return { source: 'hunt-instance', huntFolder: null, role: 'other' };
  }
  // Encounter state file: catches/{game}/{folder}/shiny.ss1
  const encounterMatch = p.match(/\/saves\/catches\/[^/]+\/([^/]+)\/shiny\.ss1$/);
  if (encounterMatch) {
    return { source: 'hunt-catch', huntFolder: encounterMatch[1], role: 'encounter' };
  }
  const catchMatch = p.match(/\/saves\/catches\/[^/]+\/([^/]+)\/(base|catch)\.sav$/);
  if (catchMatch) {
    const huntFolder = catchMatch[1];
    const filename = catchMatch[2];
    return {
      source: filename === 'base' ? 'hunt-base' : 'hunt-catch',
      huntFolder,
      role: filename === 'base' ? 'setup' : 'catch',
    };
  }
  if (p.includes('/saves/library/')) {
    return { source: 'library', huntFolder: null, role: 'library' };
  }
  return { source: 'other', huntFolder: null, role: 'other' };
}
```

- [ ] **Step 2: Add encounter to role badge variants and sort order**

Update `ROLE_BADGE_VARIANT` (line 121):

```ts
const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'secondary'> = {
  catch: 'success',
  setup: 'info',
  encounter: 'warning',
  library: 'warning',
  other: 'secondary',
};
```

Update the hunt member sort order. In the `hunts` useMemo (around line 598), replace the role sort:

```ts
const members = g.members.sort((a, b) => {
  const order: Record<string, number> = { setup: 0, encounter: 1, catch: 2, other: 3, library: 4 };
  return (order[a.info.role] ?? 99) - (order[b.info.role] ?? 99);
});
```

- [ ] **Step 3: Route encounter play to new endpoint**

In `PlayPage.tsx`, update `handleDesktopPlay` (line 317) to detect encounter files:

```ts
const handleDesktopPlay = async (node: CheckpointNode) => {
  // Encounter save state — use dedicated endpoint
  if (node.file_path.endsWith('.ss1')) {
    await api.launcher.playEncounter(node.save_file_id);
    const updated = await api.launcher.sessions();
    setSessions(updated);
    return;
  }
  const game = node.snapshot?.game ?? '';
  const system = getSystemForGame(game);
  if (system === 'nds' || system === '3ds' || system === 'gba') {
    const fullName = game.startsWith('Pokemon ') ? game : `Pokemon ${game}`;
    await api.stream.launch(fullName, node.file_path);
  } else {
    await api.launcher.play(String(node.save_file_id));
  }
  const updated = await api.launcher.sessions();
  setSessions(updated);
};
```

- [ ] **Step 4: Verify in browser**

Navigate to the Play page. Select a game with catch folders (e.g., Crystal). The hunt cards should now show three rows: setup, encounter, catch — with encounter having an amber badge. Click on an encounter row, verify the play button calls the encounter endpoint and mGBA opens at the shiny moment.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/timeline/GroupedView.tsx client/src/pages/PlayPage.tsx
git commit -m "feat: render encounter rows in hunt cards with play support (ALA-18)"
```

---

### Task 5: Hunt-as-a-group drag — drag handle on card header

**Files:**
- Modify: `client/src/components/timeline/GroupedView.tsx`

This task moves the drag interaction from individual hunt member rows to the hunt card header, making the entire card a single draggable unit.

- [ ] **Step 1: Add hunt drag ID helpers**

Near the existing `saveId` / `parseSaveId` helpers (line 156), add:

```ts
function huntId(folder: string): string {
  return `hunt:${folder}`;
}

function parseHuntId(id: string): string | null {
  if (!id.startsWith('hunt:')) return null;
  return id.slice(5);
}
```

- [ ] **Step 2: Track active drag type in state**

Update the state to track whether a hunt group is being dragged. Replace the `activeDragId` state (line 471):

```ts
const [activeDragId, setActiveDragId] = useState<number | null>(null);
const [activeDragHunt, setActiveDragHunt] = useState<string | null>(null);
```

- [ ] **Step 3: Update handleDragStart to handle hunt groups**

Replace `handleDragStart` (line 672):

```ts
function handleDragStart(event: DragStartEvent) {
  const idStr = String(event.active.id);
  const sid = parseSaveId(idStr);
  if (sid != null) { setActiveDragId(sid); return; }
  const hid = parseHuntId(idStr);
  if (hid != null) { setActiveDragHunt(hid); return; }
}
```

- [ ] **Step 4: Update handleDragEnd to handle hunt group drops**

Replace `handleDragEnd` (line 677):

```ts
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveDragId(null);
  setActiveDragHunt(null);
  if (!over) return;

  const overIdStr = String(over.id);

  // Hunt group drag
  const huntFolder = parseHuntId(String(active.id));
  if (huntFolder != null) {
    // Find all member save_file_ids for this hunt folder
    const members = hunts.find(g => g.folder === huntFolder)?.members ?? [];
    if (members.length === 0) return;

    if (overIdStr.startsWith('tag:')) {
      const tag = overIdStr.slice(4);
      for (const m of members) updateTag(m.node.save_file_id, tag);
    } else if (overIdStr === 'default') {
      for (const m of members) updateTag(m.node.save_file_id, null);
    }
    return;
  }

  // Individual save drag (existing logic)
  const activeSaveFileId = parseSaveId(String(active.id));
  if (activeSaveFileId == null) return;

  const overSaveFileId = parseSaveId(overIdStr);

  if (overSaveFileId != null) {
    if (overSaveFileId === activeSaveFileId) return;
    const sourceSection = saveToSection.get(activeSaveFileId);
    const targetSection = saveToSection.get(overSaveFileId);
    if (!sourceSection || !targetSection) return;

    if (sourceSection !== targetSection) {
      if (targetSection.startsWith('tag:')) {
        updateTag(activeSaveFileId, targetSection.slice(4));
      } else if (targetSection === 'default') {
        updateTag(activeSaveFileId, null);
      }
      return;
    }

    const ids = sectionIdsFor(targetSection);
    if (ids.length === 0) return;
    const oldIndex = ids.indexOf(activeSaveFileId);
    const newIndex = ids.indexOf(overSaveFileId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    persistOrder(newOrder);
    return;
  }

  if (overIdStr.startsWith('tag:')) {
    updateTag(activeSaveFileId, overIdStr.slice(4));
  } else if (overIdStr === 'default') {
    updateTag(activeSaveFileId, null);
  }
}
```

- [ ] **Step 5: Add drag handle to hunt card headers**

Replace the hunt card rendering block (lines 838-858). The card header gains a drag handle, and individual member rows lose theirs:

```tsx
{hunts.map((group) => (
  <DraggableHuntCard
    key={`hunt-${group.folder}`}
    folder={group.folder}
    members={group.members}
    meta={meta}
    selectedId={selectedId}
    onSelect={onSelect}
    getMeta={(sfId) => getMeta(meta, sfId)}
  />
))}
```

Create the `DraggableHuntCard` component before the main export:

```tsx
function DraggableHuntCard({
  folder,
  members,
  meta,
  selectedId,
  onSelect,
  getMeta: getMetaFn,
}: {
  folder: string;
  members: Array<{ node: CheckpointNode; info: SaveSourceInfo }>;
  meta: MetaMap;
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
  getMeta: (sfId: number) => SaveMeta;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: huntId(folder),
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1.5 rounded-md border border-border/40 bg-muted/15 overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground px-0.5 py-1 rounded touch-none"
          title="Drag hunt group to a tag section"
        >
          <GripVerticalIcon className="size-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{folder}</span>
      </div>
      <div className="divide-y divide-border/15">
        {members.map(({ node, info }) => (
          <SaveRow
            key={`hunt-${folder}-${node.id}`}
            node={node}
            meta={getMetaFn(node.save_file_id)}
            roleLabel={info.role}
            isSelected={selectedId === node.id}
            onSelect={() => onSelect(node)}
            onTagChange={() => {}}
            small
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update DragOverlay for hunt groups**

Near the existing DragOverlay render (around line 900), update to handle hunt group drags:

```tsx
<DragOverlay>
  {activeNode ? (
    <SaveRow
      node={activeNode}
      meta={getMeta(meta, activeNode.save_file_id)}
      roleLabel={activeRoleLabel}
      isSelected={false}
      onSelect={() => {}}
      onTagChange={() => {}}
      isOverlay
    />
  ) : activeDragHunt ? (
    <div className="bg-card shadow-lg ring-1 ring-border rounded-md px-3 py-2 flex items-center gap-2">
      <GripVerticalIcon className="size-3.5 text-muted-foreground" />
      <span className="text-sm font-semibold">{activeDragHunt}</span>
      <Badge variant="secondary">{hunts.find(g => g.folder === activeDragHunt)?.members.length ?? 0}</Badge>
    </div>
  ) : null}
</DragOverlay>
```

- [ ] **Step 7: Verify hunt group drag in browser**

In the Play page, drag a hunt card by its header grip handle onto a tag section. All member saves should receive the tag. The card should disappear from the hunts section and appear in the tag section.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/timeline/GroupedView.tsx
git commit -m "feat: hunt-as-a-group drag-and-drop to tag sections (ALA-11)"
```

---

### Task 6: Tagged hunt groups render as cards in tag sections

**Files:**
- Modify: `client/src/components/timeline/GroupedView.tsx`

When all members of a hunt folder share a tag, they should render as a grouped mini-card (same visual as the hunts section) inside the tag section, not as individual rows.

- [ ] **Step 1: Add hunt folder grouping to tag section data**

In the `tagSections` useMemo (around line 563), after building `tagSections`, post-process each section's rows to detect hunt groups. Replace the `tagSections` computation:

```ts
const rawTagSections = Array.from(tagMap.entries())
  .filter(([tag]) => !RESERVED_KEYS.has(tag))
  .map(([tag, rows]) => ({
    tag,
    rows: rows.sort((a, b) => compareSaves(a.node, b.node, meta)),
  }))
  .sort((a, b) => a.tag.localeCompare(b.tag));

// Post-process: group tagged saves that share a hunt folder into sub-groups
const tagSections = rawTagSections.map(section => {
  const huntGroups = new Map<string, typeof section.rows>();
  const standalone: typeof section.rows = [];

  for (const row of section.rows) {
    if (row.info.huntFolder) {
      if (!huntGroups.has(row.info.huntFolder)) huntGroups.set(row.info.huntFolder, []);
      huntGroups.get(row.info.huntFolder)!.push(row);
    } else {
      standalone.push(row);
    }
  }

  const groups = Array.from(huntGroups.entries()).map(([folder, members]) => ({
    folder,
    members: members.sort((a, b) => {
      const order: Record<string, number> = { setup: 0, encounter: 1, catch: 2, other: 3, library: 4 };
      return (order[a.info.role] ?? 99) - (order[b.info.role] ?? 99);
    }),
  }));

  return { ...section, huntGroups: groups, standalone };
});
```

- [ ] **Step 2: Render grouped hunt cards inside tag sections**

Update the tag section rendering (around line 808). Replace the inner content of each tag section:

```tsx
{tagSections.map(({ tag, rows, huntGroups, standalone }) => {
  const color = tagColors[tag] ?? DEFAULT_TAG_COLOR;
  const sectionKey = `tag:${tag}`;
  const standaloneIds = standalone.map(r => saveId(r.node.save_file_id));
  return (
    <Section
      key={sectionKey}
      title={tag}
      count={rows.length}
      color={color}
      sectionKey={sectionKey}
      isDropTarget={true}
      onPickColor={(c) => updateTagColor(tag, c)}
    >
      {/* Hunt groups within this tag */}
      {huntGroups.map((group) => (
        <div key={`tagged-hunt-${group.folder}`} className="mb-1.5 rounded-md border border-border/40 bg-muted/15 overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
            <span className="text-sm font-semibold text-foreground flex-1 truncate">{group.folder}</span>
            <button
              type="button"
              onClick={() => {
                for (const m of group.members) updateTag(m.node.save_file_id, null);
              }}
              className="text-muted-foreground/40 hover:text-muted-foreground"
              title="Remove tag from hunt group"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border/15">
            {group.members.map(({ node, info }) => (
              <SaveRow
                key={`tagged-hunt-${group.folder}-${node.id}`}
                node={node}
                meta={getMeta(meta, node.save_file_id)}
                roleLabel={info.role}
                isSelected={selectedId === node.id}
                onSelect={() => onSelect(node)}
                onTagChange={() => {}}
                small
              />
            ))}
          </div>
        </div>
      ))}
      {/* Standalone (non-hunt) saves — sortable */}
      <SortableContext items={standaloneIds} strategy={verticalListSortingStrategy}>
        {standalone.map(({ node, info }) => renderSortableRow(node, info.role === 'other' ? null : info.role))}
      </SortableContext>
    </Section>
  );
})}
```

- [ ] **Step 3: Filter tagged hunt members from the hunts section**

The hunts section should not show members that have been tagged. In the hunts useMemo (around line 588), the `untagged` array already only contains saves without tags, so this should work automatically. Verify that when a hunt group is tagged, it disappears from the hunts section.

If any members show in both places, the issue is that `untagged` isn't being filtered. Check: the `for (const row of enriched)` loop (line 568) puts rows with a tag into `tagMap` and those without into `untagged`. This means tagged hunt members go to tagMap and not to the hunts bucket. Correct.

- [ ] **Step 4: Add X button to remove tag from hunt groups in hunts section (not needed)**

Hunt groups in the hunts section don't have tags, so no X button needed there. The X button was already added to tagged hunt cards in Step 2. When clicked, all members lose their tag and flow back to the hunts section on re-render.

- [ ] **Step 5: Verify tagged hunt card behavior in browser**

1. Drag a hunt card from the hunts section to a user tag section.
2. Verify: the card appears as a grouped mini-card in the tag section with an X button.
3. Verify: the card no longer appears in the hunts section.
4. Click the X button on the tagged card.
5. Verify: the card returns to the hunts section.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/timeline/GroupedView.tsx
git commit -m "feat: tagged hunt groups render as cards in tag sections (ALA-11)"
```

---

### Task 7: Final integration verification

- [ ] **Step 1: End-to-end test of encounter feature**

1. Navigate to Play page → select a game with catch folders (Crystal or Yellow).
2. Verify hunt cards show three rows: setup (blue badge) → encounter (amber badge) → catch (green badge).
3. Click the encounter row to select it. Verify NodeDetail panel opens.
4. Click play on the encounter. Verify mGBA opens at the shiny moment.
5. Close mGBA.

- [ ] **Step 2: End-to-end test of hunt group drag**

1. On the Play page, drag a hunt card by the header grip to a tag section (create one if needed by tagging any individual save first).
2. Verify: entire group moves to the tag section as a card.
3. Verify: X button on the card removes the tag and sends it back to hunts.
4. Verify: other drag-and-drop still works (individual saves in default bucket, reordering within tag sections).

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for encounter rows + hunt group drag"
```
