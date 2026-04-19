# Custom Map Markers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create/edit custom map markers (notes, buildings, POIs, paired connections) from the guide's calibration mode, persisted to SQLite and rendered with hover tooltips and click-to-navigate behavior for connections.

**Architecture:** Extend the existing `custom_markers` table with a `paired_marker_id` self-reference column for connection pairs. Add a small set of REST endpoints (extend PATCH, add link/unlink/unlinked list). On the client, add a dedicated `CustomMarkerLayer` + `CustomMarkerEditor` and wire `Guide.tsx` to switch maps when a connection marker is clicked.

**Tech Stack:** Express 5 + `bun:sqlite` (server), React 19 + react-leaflet + Tailwind v4 (client). No test framework — verification is manual (curl + browser).

**Spec:** `docs/superpowers/specs/2026-04-19-custom-map-markers-design.md`

---

### Task 1: Add `paired_marker_id` column

**Files:**
- Modify: `server/src/schema.sql` (around line 270, the `custom_markers` CREATE)
- Modify: `server/src/db.ts` (append to the migration block near other `ALTER TABLE` additions)

- [ ] **Step 1: Update schema for fresh installs**

In `server/src/schema.sql`, find the `custom_markers` CREATE and add the column at the end of the column list (before the closing `)`):

```sql
CREATE TABLE IF NOT EXISTS custom_markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL REFERENCES game_maps(id),
  game TEXT,
  label TEXT NOT NULL,
  marker_type TEXT NOT NULL DEFAULT 'note',
  description TEXT,
  x REAL NOT NULL,
  y REAL NOT NULL,
  color TEXT,
  icon TEXT,
  paired_marker_id INTEGER REFERENCES custom_markers(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Add idempotent migration in db.ts**

In `server/src/db.ts`, append near the other `try { db.exec('ALTER TABLE ...') } catch {}` lines:

```ts
try { db.exec('ALTER TABLE custom_markers ADD COLUMN paired_marker_id INTEGER REFERENCES custom_markers(id) ON DELETE SET NULL'); } catch {}
```

- [ ] **Step 3: Run the server once to apply the migration**

```bash
cd src-tauri && bun run tauri dev
```

Expected: no SQLite error. Stop the process once the server logs "Server listening".

- [ ] **Step 4: Verify column exists**

```bash
sqlite3 data/pokemon.db "PRAGMA table_info(custom_markers);"
```

Expected: output includes a row for `paired_marker_id` with type `INTEGER`.

- [ ] **Step 5: Commit**

```bash
git add server/src/schema.sql server/src/db.ts
git commit -m "feat(guide): add paired_marker_id to custom_markers"
```

---

### Task 2: Extend PATCH to accept all editable fields

**Files:**
- Modify: `server/src/routes/subMarkers.ts` (the `PATCH /custom-markers/:id` handler, currently lines 207–216)

- [ ] **Step 1: Replace the x/y-only PATCH with a dynamic-field PATCH**

Replace the existing `router.patch('/custom-markers/:id', ...)` handler with:

```ts
router.patch('/custom-markers/:id', (req, res) => {
  const allowed = ['x', 'y', 'label', 'description', 'marker_type', 'color', 'icon'] as const;
  const sets: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (key in req.body) {
      sets.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No editable fields provided' });
  values.push(Number(req.params.id));
  const result = db.prepare(`UPDATE custom_markers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) return res.status(404).json({ error: 'Custom marker not found' });
  res.json({ ok: true });
});
```

- [ ] **Step 2: Smoke-test both x/y and label updates**

With the server running:

```bash
# Create a throwaway marker (use any existing map_id from your DB; 1 is usually kanto)
curl -s -X POST http://localhost:3001/api/guide/custom-markers \
  -H 'Content-Type: application/json' \
  -d '{"map_id":1,"game":"red","label":"test","marker_type":"note","x":0.5,"y":0.5}'
# Note the returned id, then:
curl -s -X PATCH http://localhost:3001/api/guide/custom-markers/<id> \
  -H 'Content-Type: application/json' \
  -d '{"label":"renamed","description":"hi"}'
curl -s -X PATCH http://localhost:3001/api/guide/custom-markers/<id> \
  -H 'Content-Type: application/json' \
  -d '{"x":0.6,"y":0.6}'
sqlite3 data/pokemon.db "SELECT id,label,description,x,y FROM custom_markers WHERE id=<id>;"
```

Expected: final row shows `renamed|hi|0.6|0.6`. Then delete it: `curl -X DELETE http://localhost:3001/api/guide/custom-markers/<id>`.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/subMarkers.ts
git commit -m "feat(guide): allow editing label/description/type on custom markers"
```

---

### Task 3: Add link / unlink / unlinked-list endpoints

**Files:**
- Modify: `server/src/routes/subMarkers.ts` (append before `export default router`)

- [ ] **Step 1: Add link endpoint**

Append to `server/src/routes/subMarkers.ts`:

```ts
// POST /api/guide/custom-markers/:id/link { partnerId } — pair two connection markers
router.post('/custom-markers/:id/link', (req, res) => {
  const id = Number(req.params.id);
  const partnerId = Number(req.body?.partnerId);
  if (!partnerId || id === partnerId) return res.status(400).json({ error: 'partnerId required and must differ' });

  const rows = db.prepare(
    `SELECT id, marker_type, game, paired_marker_id FROM custom_markers WHERE id IN (?, ?)`
  ).all(id, partnerId) as { id: number; marker_type: string; game: string | null; paired_marker_id: number | null }[];

  if (rows.length !== 2) return res.status(404).json({ error: 'Both markers must exist' });
  for (const r of rows) {
    if (r.marker_type !== 'connection') return res.status(400).json({ error: 'Both markers must be type=connection' });
    if (r.paired_marker_id != null) return res.status(400).json({ error: `Marker ${r.id} is already linked` });
  }
  if (rows[0].game !== rows[1].game) return res.status(400).json({ error: 'Markers must belong to the same game' });

  const upd = db.prepare('UPDATE custom_markers SET paired_marker_id = ? WHERE id = ?');
  db.transaction(() => {
    upd.run(partnerId, id);
    upd.run(id, partnerId);
  })();
  res.json({ ok: true });
});

// DELETE /api/guide/custom-markers/:id/link — unlink both sides
router.delete('/custom-markers/:id/link', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT paired_marker_id FROM custom_markers WHERE id = ?').get(id) as { paired_marker_id: number | null } | undefined;
  if (!row) return res.status(404).json({ error: 'Marker not found' });
  if (row.paired_marker_id == null) return res.json({ ok: true });
  const upd = db.prepare('UPDATE custom_markers SET paired_marker_id = NULL WHERE id = ?');
  db.transaction(() => { upd.run(id); upd.run(row.paired_marker_id); })();
  res.json({ ok: true });
});

// GET /api/guide/custom-markers/unlinked?game=red — connection markers without a partner
router.get('/custom-markers/unlinked', (req, res) => {
  const game = req.query.game as string | undefined;
  if (!game) return res.status(400).json({ error: 'game query param required' });
  const rows = db.prepare(`
    SELECT cm.id, cm.label, cm.map_id, gm.map_key, gm.display_name AS map_name, cm.x, cm.y
    FROM custom_markers cm
    JOIN game_maps gm ON gm.id = cm.map_id
    WHERE cm.marker_type = 'connection' AND cm.paired_marker_id IS NULL AND cm.game = ?
    ORDER BY gm.display_name, cm.label
  `).all(game);
  res.json(rows);
});
```

- [ ] **Step 2: Smoke-test link flow**

With server running:

```bash
# Create two connection markers on the same map
A=$(curl -s -X POST http://localhost:3001/api/guide/custom-markers -H 'Content-Type: application/json' \
  -d '{"map_id":1,"game":"red","label":"A","marker_type":"connection","x":0.1,"y":0.1}' | sed 's/.*"id":\([0-9]*\).*/\1/')
B=$(curl -s -X POST http://localhost:3001/api/guide/custom-markers -H 'Content-Type: application/json' \
  -d '{"map_id":1,"game":"red","label":"B","marker_type":"connection","x":0.2,"y":0.2}' | sed 's/.*"id":\([0-9]*\).*/\1/')
echo "A=$A B=$B"

# Unlinked list should contain both
curl -s 'http://localhost:3001/api/guide/custom-markers/unlinked?game=red'

# Link them
curl -s -X POST "http://localhost:3001/api/guide/custom-markers/$A/link" -H 'Content-Type: application/json' -d "{\"partnerId\":$B}"

# Unlinked list should now be empty (for these two)
curl -s 'http://localhost:3001/api/guide/custom-markers/unlinked?game=red'

# Unlink
curl -s -X DELETE "http://localhost:3001/api/guide/custom-markers/$A/link"

# Cleanup
curl -s -X DELETE "http://localhost:3001/api/guide/custom-markers/$A"
curl -s -X DELETE "http://localhost:3001/api/guide/custom-markers/$B"
```

Expected: link returns `{"ok":true}`, unlinked list reflects state changes, no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/subMarkers.ts
git commit -m "feat(guide): link/unlink endpoints for paired connection markers"
```

---

### Task 4: Extend unified GET to include paired fields

**Files:**
- Modify: `server/src/routes/subMarkers.ts` (the `custom` block inside `GET /:mapKey`, currently lines 185–201)

- [ ] **Step 1: Replace the custom-block query with one that self-joins**

In the `GET /:mapKey` handler, replace the `custom` query with:

```ts
const customGameFilter = game ? ' AND cm.game = ?' : '';
const customParams = game ? [map.id, game] : [map.id];
const custom = db.prepare(`
  SELECT
    cm.id,
    'custom' AS type,
    cm.label AS name,
    cm.description AS detail,
    '' AS location_key,
    '' AS location_name,
    0 AS location_id,
    cm.x,
    cm.y,
    cm.marker_type AS method,
    cm.paired_marker_id,
    pm.x AS paired_x,
    pm.y AS paired_y,
    pm.label AS paired_label,
    pgm.map_key AS paired_map_key,
    pgm.display_name AS paired_map_name
  FROM custom_markers cm
  LEFT JOIN custom_markers pm ON pm.id = cm.paired_marker_id
  LEFT JOIN game_maps pgm ON pgm.id = pm.map_id
  WHERE cm.map_id = ?${customGameFilter}
`).all(...customParams);
```

- [ ] **Step 2: Smoke-test the response**

With two linked markers from Task 3 still present (or recreated):

```bash
curl -s 'http://localhost:3001/api/guide/sub-markers/kanto?game=red' | python3 -m json.tool | grep -A8 '"type": "custom"' | head -40
```

Expected: each custom row now includes `paired_marker_id`, `paired_x`, `paired_y`, `paired_label`, `paired_map_key`, `paired_map_name` (null for unlinked, populated for linked).

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/subMarkers.ts
git commit -m "feat(guide): include paired fields in unified sub-markers response"
```

---

### Task 5: Extend client API wrappers

**Files:**
- Modify: `client/src/api/client.ts` (around line 432, the `createCustomMarker` block)

- [ ] **Step 1: Extend existing custom-marker methods and add new ones**

Replace `updateCustomMarkerPosition` with a more general `updateCustomMarker`, and add link/unlink/unlinked helpers. Place these next to the existing methods:

```ts
updateCustomMarker(id: number, data: Partial<{ x: number; y: number; label: string; description: string; marker_type: string; color: string; icon: string }>) {
  return request(`/guide/custom-markers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
},
linkCustomMarkers(id: number, partnerId: number) {
  return request(`/guide/custom-markers/${id}/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partnerId }),
  });
},
unlinkCustomMarker(id: number) {
  return request(`/guide/custom-markers/${id}/link`, { method: 'DELETE' });
},
unlinkedConnectionMarkers(game: string) {
  return request<Array<{ id: number; label: string; map_id: number; map_key: string; map_name: string; x: number; y: number }>>(
    `/guide/custom-markers/unlinked?game=${encodeURIComponent(game)}`
  );
},
```

Then delete the now-redundant `updateCustomMarkerPosition` (or keep it as a thin alias if search shows it used elsewhere — check first with a grep).

- [ ] **Step 2: Check for call sites of `updateCustomMarkerPosition`**

```bash
grep -rn "updateCustomMarkerPosition" client/src
```

If used, update the caller to `updateCustomMarker(id, { x, y })`. Otherwise remove the old method.

- [ ] **Step 3: Update the `SubMarker` type (if needed) to expose paired fields**

```bash
grep -n "export type SubMarker\|export interface SubMarker" client/src/api/client.ts
```

If the type is declared there, add to it:

```ts
paired_marker_id?: number | null;
paired_x?: number | null;
paired_y?: number | null;
paired_label?: string | null;
paired_map_key?: string | null;
paired_map_name?: string | null;
```

If no such type exists (rows are typed as `any`), skip.

- [ ] **Step 4: Verify typecheck passes**

```bash
cd client && bun run build
```

Expected: build succeeds (or at least no errors from the edited file).

- [ ] **Step 5: Commit**

```bash
git add client/src/api/client.ts
git commit -m "feat(guide): client helpers for custom-marker edit/link/unlink"
```

---

### Task 6: CustomMarkerLayer (rendering + hover + click-navigate)

**Files:**
- Create: `client/src/components/guide/CustomMarkerLayer.tsx`
- Modify: `client/src/components/guide/SubMarkerLayer.tsx` (drop custom handling — see Task 9)

- [ ] **Step 1: Create the layer**

Create `client/src/components/guide/CustomMarkerLayer.tsx`:

```tsx
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

export interface CustomMarker {
  id: number;
  name: string;           // = label
  detail: string | null;  // = description
  method: string;         // = marker_type ('connection' | 'note' | 'building' | 'poi')
  x: number;
  y: number;
  paired_marker_id?: number | null;
  paired_x?: number | null;
  paired_y?: number | null;
  paired_label?: string | null;
  paired_map_key?: string | null;
  paired_map_name?: string | null;
}

interface Props {
  markers: CustomMarker[];
  mapWidth: number;
  mapHeight: number;
  onMarkerClick: (m: CustomMarker) => void;
}

const ICON_GLYPH: Record<string, string> = {
  connection: '⇄',
  note: '💡',
  building: '🏠',
  poi: '📍',
};

function makeIcon(type: string) {
  const glyph = ICON_GLYPH[type] ?? '📍';
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="font-size:18px;line-height:1;text-shadow:0 0 3px rgba(0,0,0,0.8)">${glyph}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function CustomMarkerLayer({ markers, mapWidth, mapHeight, onMarkerClick }: Props) {
  return (
    <>
      {markers.map(m => {
        const coordX = m.x * mapWidth;
        const coordY = m.y * mapHeight;
        const isConnection = m.method === 'connection';
        const linked = isConnection && m.paired_marker_id != null;

        const tooltipHeader = isConnection
          ? (linked
              ? `→ ${m.paired_map_name ?? ''}${m.paired_map_name && m.paired_label ? ' — ' : ''}${m.paired_label ?? ''}`
              : 'unlinked connection')
          : m.name;

        return (
          <Marker
            key={`custom-${m.id}`}
            position={L.latLng(-coordY, coordX)}
            icon={makeIcon(m.method)}
            eventHandlers={{ click: () => onMarkerClick(m) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} className="guide-marker-tooltip">
              <div className="font-medium">{tooltipHeader}</div>
              {!isConnection && m.detail && (
                <div className="text-xs opacity-80 mt-0.5 leading-snug">{m.detail}</div>
              )}
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Commit (rendering only; wiring is later tasks)**

```bash
git add client/src/components/guide/CustomMarkerLayer.tsx
git commit -m "feat(guide): CustomMarkerLayer for rendering custom markers"
```

---

### Task 7: Wire navigate-to-paired-map in GameMap + Guide

**Files:**
- Modify: `client/src/components/guide/GameMap.tsx` (already supports `selectedLocation` flyTo — reuse it; no changes needed unless the focus behavior differs)
- Modify: `client/src/pages/Guide.tsx`

- [ ] **Step 1: Add a navigation handler in Guide.tsx**

Near other handlers in `client/src/pages/Guide.tsx`, add:

```ts
async function navigateToPairedMarker(mapKey: string, x: number, y: number) {
  if (!mapData) return;
  if (mapData.map_key === mapKey) {
    // Same map: just pan
    setFlyTo({ x: x * mapData.width, y: y * mapData.height });
    setTimeout(() => setFlyTo(null), 600);
    return;
  }
  // Different map: load it, then pan once loaded
  const map = await api.guide.map(mapKey);
  setMapData(map);
  const locs = await api.guide.locations(map.map_key);
  setLocations(locs);
  setTimeout(() => {
    setFlyTo({ x: x * map.width, y: y * map.height });
    setTimeout(() => setFlyTo(null), 600);
  }, 50);
}
```

If `api.guide.map(mapKey)` does not exist, check available helpers:

```bash
grep -n "guide: {" client/src/api/client.ts | head
grep -n "gameMap\|mapByKey\|guide.map" client/src/api/client.ts
```

If only `gameMap(game)` exists, add a `map(mapKey)` helper:

```ts
map(mapKey: string) {
  return request<any>(`/guide/maps/${mapKey}`);
},
```

(The server already exposes `GET /guide/maps/:mapKey` — confirmed in `server/src/routes/guide.ts:25`.)

- [ ] **Step 2: Render `CustomMarkerLayer` inside GameMap's children**

In `client/src/pages/Guide.tsx`, find where `SubMarkerLayer` is rendered (around line 248). Immediately after it, add:

```tsx
{zoom >= (mapData.sub_marker_zoom_threshold ?? 0) && subMarkers.length > 0 && (
  <CustomMarkerLayer
    markers={subMarkers.filter((m: any) => m.type === 'custom') as any}
    mapWidth={mapData.width}
    mapHeight={mapData.height}
    onMarkerClick={(m) => {
      if (isCalibrating) {
        setEditingCustomMarker(m);
        return;
      }
      if (m.method === 'connection' && m.paired_marker_id != null && m.paired_map_key != null && m.paired_x != null && m.paired_y != null) {
        navigateToPairedMarker(m.paired_map_key, m.paired_x, m.paired_y);
      }
    }}
  />
)}
```

Add the import at the top:

```tsx
import CustomMarkerLayer from '@/components/guide/CustomMarkerLayer';
```

And add the new state near the other `useState` lines:

```ts
const [editingCustomMarker, setEditingCustomMarker] = useState<any | null>(null);
```

- [ ] **Step 3: Verify typecheck + build**

```bash
cd client && bun run build
```

Expected: no new errors. `editingCustomMarker` will be "unused" until Task 8 wires the editor; if the build is strict about unused vars, add a `// eslint-disable-next-line` or simply proceed (it'll be used next task).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Guide.tsx client/src/api/client.ts
git commit -m "feat(guide): navigate to paired map on connection-marker click"
```

---

### Task 8: CustomMarkerEditor (create form + edit + link UI)

**Files:**
- Create: `client/src/components/guide/CustomMarkerEditor.tsx`
- Modify: `client/src/pages/Guide.tsx` to render the editor when `editingCustomMarker` is set or during "add new" flow

- [ ] **Step 1: Create the editor component**

Create `client/src/components/guide/CustomMarkerEditor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import FilterDropdown from '@/components/FilterDropdown';

type MarkerType = 'connection' | 'note' | 'building' | 'poi';

interface ExistingMarker {
  id: number;
  name: string;              // label
  detail: string | null;     // description
  method: string;            // marker_type
  x: number;
  y: number;
  paired_marker_id?: number | null;
  paired_label?: string | null;
  paired_map_name?: string | null;
}

interface Props {
  mode: 'create' | 'edit';
  game: string;
  mapId: number;
  marker?: ExistingMarker;                                    // required in edit mode
  pendingPosition?: { x: number; y: number };                 // required in create mode
  onClose: () => void;
  onSaved: () => void;                                        // refetch markers
}

const TYPE_OPTIONS: { value: MarkerType; label: string }[] = [
  { value: 'connection', label: 'Connection' },
  { value: 'note', label: 'Note / Tip' },
  { value: 'building', label: 'Building' },
  { value: 'poi', label: 'Point of Interest' },
];

export default function CustomMarkerEditor({ mode, game, mapId, marker, pendingPosition, onClose, onSaved }: Props) {
  const [label, setLabel] = useState(marker?.name ?? '');
  const [description, setDescription] = useState(marker?.detail ?? '');
  const [markerType, setMarkerType] = useState<MarkerType>((marker?.method as MarkerType) ?? 'note');
  const [unlinked, setUnlinked] = useState<Array<{ id: number; label: string; map_name: string }>>([]);

  useEffect(() => {
    if (mode === 'edit' && markerType === 'connection' && marker && marker.paired_marker_id == null) {
      api.guide.unlinkedConnectionMarkers(game).then(rows => {
        setUnlinked(rows.filter(r => r.id !== marker.id));
      });
    }
  }, [mode, markerType, marker, game]);

  async function handleCreate() {
    if (!label.trim() || !pendingPosition) return;
    await api.guide.createCustomMarker({
      map_id: mapId,
      game,
      label: label.trim(),
      marker_type: markerType,
      description: description.trim() || undefined,
      x: pendingPosition.x,
      y: pendingPosition.y,
    });
    onSaved();
    onClose();
  }

  async function handleUpdate(patch: Record<string, any>) {
    if (!marker) return;
    await api.guide.updateCustomMarker(marker.id, patch);
    onSaved();
  }

  async function handleDelete() {
    if (!marker) return;
    if (!confirm(`Delete "${marker.name}"?`)) return;
    await api.guide.deleteCustomMarker(marker.id);
    onSaved();
    onClose();
  }

  async function handleLink(partnerId: number) {
    if (!marker) return;
    await api.guide.linkCustomMarkers(marker.id, partnerId);
    onSaved();
    onClose();
  }

  async function handleUnlink() {
    if (!marker) return;
    await api.guide.unlinkCustomMarker(marker.id);
    onSaved();
  }

  return (
    <div className="p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{mode === 'create' ? 'New Custom Marker' : 'Edit Custom Marker'}</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Label</label>
        <Input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={() => mode === 'edit' && marker && label !== marker.name && handleUpdate({ label })}
          placeholder="e.g. Mt. Moon east entrance"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Type</label>
        <FilterDropdown
          label="Type"
          options={TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          selected={[markerType]}
          onChange={(sel) => {
            const next = (sel[0] as MarkerType) ?? 'note';
            setMarkerType(next);
            if (mode === 'edit' && marker && next !== marker.method) handleUpdate({ marker_type: next });
          }}
          multiSelect={false}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Description / tip</label>
        <Input
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => mode === 'edit' && marker && description !== (marker.detail ?? '') && handleUpdate({ description })}
          placeholder="Shown on hover"
        />
      </div>

      {mode === 'edit' && markerType === 'connection' && marker && (
        <div className="pt-2 border-t border-border space-y-1.5">
          {marker.paired_marker_id != null ? (
            <>
              <div className="text-xs text-muted-foreground">
                Linked to: <span className="text-foreground">{marker.paired_map_name} — {marker.paired_label}</span>
              </div>
              <button onClick={handleUnlink} className="text-xs py-1 px-2 rounded bg-muted hover:bg-muted/70">
                Unlink
              </button>
            </>
          ) : (
            <>
              <label className="text-xs text-muted-foreground">Link to…</label>
              <FilterDropdown
                label="Pick unlinked connection"
                options={unlinked.map(u => ({ value: String(u.id), label: `${u.map_name} — ${u.label}` }))}
                selected={[]}
                onChange={(sel) => { if (sel[0]) handleLink(Number(sel[0])); }}
                multiSelect={false}
              />
              {unlinked.length === 0 && (
                <div className="text-xs text-muted-foreground italic">No other unlinked connection markers for this game.</div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        {mode === 'create' ? (
          <button
            onClick={handleCreate}
            disabled={!label.trim()}
            className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
          >
            Create
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className="text-xs py-1 px-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire create + edit in Guide.tsx**

In `client/src/pages/Guide.tsx`:

Add imports:

```tsx
import CustomMarkerEditor from '@/components/guide/CustomMarkerEditor';
```

Add state:

```ts
const [pendingCustomPosition, setPendingCustomPosition] = useState<{ x: number; y: number } | null>(null);
const [creatingCustom, setCreatingCustom] = useState(false);
```

Extend the map click handler (the existing one that handles calibration clicks near line 155). When `creatingCustom` is true and the user clicks the map, capture the position:

```ts
if (creatingCustom) {
  setPendingCustomPosition({ x: pixel.x / mapData.width, y: pixel.y / mapData.height });
  setCreatingCustom(false);
  return;
}
```

Render the editor as a floating panel in the same layer where `CalibrationPanel` would normally sit (top-left, below existing chrome). Add this inside the JSX near the existing calibration UI, only while `isCalibrating`:

```tsx
{isCalibrating && (editingCustomMarker || pendingCustomPosition) && (
  <div className="absolute top-14 left-3 z-[1000] w-72 rounded-lg border border-border bg-card/95 backdrop-blur-xl shadow-lg pointer-events-auto">
    <CustomMarkerEditor
      mode={editingCustomMarker ? 'edit' : 'create'}
      game={game!}
      mapId={mapData.id}
      marker={editingCustomMarker ?? undefined}
      pendingPosition={pendingCustomPosition ?? undefined}
      onClose={() => { setEditingCustomMarker(null); setPendingCustomPosition(null); }}
      onSaved={() => api.guide.markers(mapData.map_key, game!).then(setSubMarkers)}
    />
  </div>
)}

{isCalibrating && !editingCustomMarker && !pendingCustomPosition && (
  <button
    onClick={() => setCreatingCustom(true)}
    className="absolute top-14 left-3 z-[1000] text-xs py-1.5 px-3 rounded bg-primary text-primary-foreground shadow-lg pointer-events-auto"
  >
    {creatingCustom ? 'Click map to place…' : '+ Custom Marker'}
  </button>
)}
```

- [ ] **Step 3: Typecheck + build**

```bash
cd client && bun run build
```

Expected: build passes.

- [ ] **Step 4: Manual UI smoke test**

```bash
cd src-tauri && bun run tauri dev
```

1. Open the Guide, pick Red, enter calibration mode (`?calibrate=1` or the calibrate button)
2. Click "+ Custom Marker" → map prompts for placement → click somewhere → fill label "Mt. Moon east", type=connection → Create
3. Click "+ Custom Marker" again → place another → label "Mt. Moon F1 west", type=connection → Create
4. Click the first marker in calibration mode → editor shows → "Link to…" dropdown shows the second → pick it
5. Exit calibration mode → hover either marker → tooltip shows "→ {map name} — {label}"
6. Click a linked connection (outside calibration) → map flies to the paired point
7. Re-enter calibration, click a marker, delete it → gone, pair reverts to unlinked

Expected: all seven steps succeed with no console errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/guide/CustomMarkerEditor.tsx client/src/pages/Guide.tsx
git commit -m "feat(guide): custom marker editor with create/edit/link/delete"
```

---

### Task 9: Remove custom handling from SubMarkerLayer + delete dead CalibrationPanel

**Files:**
- Modify: `client/src/components/guide/SubMarkerLayer.tsx`
- Delete: `client/src/components/guide/CalibrationPanel.tsx` (confirmed unused — only self-references)

- [ ] **Step 1: Confirm CalibrationPanel is unused**

```bash
grep -rn "CalibrationPanel" client/src | grep -v "CalibrationPanel.tsx"
```

Expected: no results. If results exist, STOP and treat this file as still in use.

- [ ] **Step 2: Delete the dead file**

```bash
git rm client/src/components/guide/CalibrationPanel.tsx
```

- [ ] **Step 3: Filter `type=custom` out of SubMarkerLayer**

In `client/src/components/guide/SubMarkerLayer.tsx`, tighten the `visible` memo. The layer's `SubMarkerType` already excludes `'custom'`, but confirm `filters[m.marker_type]` returns falsy for custom rows by adding an explicit skip at the top of the filter callback:

```ts
const visible = useMemo(() => {
  return markers.filter(m => {
    if ((m.marker_type as string) === 'custom') return false;
    if (!filters[m.marker_type]) return false;
    // ...existing hideDone logic...
  });
}, [markers, filters, flagReport]);
```

This is defensive — if the upstream `SubMarkerData` type changes to include `custom`, nothing will render twice.

- [ ] **Step 4: Verify nothing breaks**

```bash
cd client && bun run build
```

Then re-run the Task 8 manual test quickly to confirm markers still render and tooltip behavior is unchanged for non-custom types.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/guide/SubMarkerLayer.tsx
git commit -m "refactor(guide): drop dead CalibrationPanel, isolate custom markers to new layer"
```

---

### Task 10: Final end-to-end verification

- [ ] **Step 1: Run full Tauri dev loop**

```bash
cd src-tauri && bun run tauri dev
```

- [ ] **Step 2: Walk through the spec's testing checklist**

1. Place a note, reload the page → note persists, tooltip shows label + description
2. Place two connection markers (ideally on different maps if your game has them; otherwise same map different points), link them via the editor → click one → map pans/switches to the paired point
3. Unlink from the editor; delete one side via the editor → confirm the other side reverts to "unlinked" tooltip
4. Switch `game` in the GamePicker → markers from the prior game do not appear
5. In calibration mode, drag a custom marker → position persists after reload (via existing x/y PATCH)

All five should succeed. If any fail, fix before reporting done.

- [ ] **Step 3: Spot-check DB**

```bash
sqlite3 data/pokemon.db "SELECT id, label, marker_type, paired_marker_id FROM custom_markers;"
```

Expected: pair rows reference each other bidirectionally.

- [ ] **Step 4: Final commit if there are fixup changes**

```bash
git status
git add -A
git commit -m "fix(guide): address custom marker end-to-end issues" # only if needed
```
