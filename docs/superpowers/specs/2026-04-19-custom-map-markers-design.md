# Custom Map Markers

Author-time custom markers on the guide maps: notes, buildings, POIs, and paired connections between maps. Users create/edit/delete them from calibration mode; players see hover tooltips and can click connection markers to teleport to the paired map.

## Goals

- Let the user place arbitrary labeled markers on any guide map
- Support a generic "connection" type that links two points across maps (e.g., Route 4 ↔ Mt. Moon F1), with click-to-navigate
- Support free-form "note" markers that act like trainer-tip tooltips
- Persist everything to the DB (`custom_markers` table, already exists)
- Per-game scope (shared across playthroughs of that game)

## Non-goals

- Multi-map walking paths / chains of >2 points
- Per-playthrough personal notes (explicitly per-game only)
- JSON round-trip / import-export UI (free later since `export/:mapKey` already includes custom markers)
- Filter-pill toggles for individual custom marker types

## Data model

The `custom_markers` table already exists with: `id, map_id, game, label, marker_type, description, x, y, color, icon, created_at`.

Add one column:

```sql
ALTER TABLE custom_markers ADD COLUMN paired_marker_id INTEGER
  REFERENCES custom_markers(id) ON DELETE SET NULL;
```

- `marker_type` values used by the UI: `'connection' | 'note' | 'building' | 'poi'`. The column stays TEXT (extendable).
- `game` is required from the UI (per-game scope); column stays nullable to leave room for a future "global" override.
- `paired_marker_id` only meaningful when `marker_type='connection'`. Bidirectional: both rows point at each other. Null until linked. `ON DELETE SET NULL` prevents dangling references if one end is deleted.

## Marker behaviors

| Type | Hover shows | Click outside calibration |
|---|---|---|
| `connection` | `→ {paired marker's location_name or label}`, or "unlinked" | switches map to paired marker's map, pans Leaflet to paired point |
| `note` | `label` (bold) + `description` | nothing |
| `building` | `label` + `description` | nothing |
| `poi` | `label` + `description` | nothing |

Inside calibration mode, clicking any custom marker opens the editor.

Icons are picked by `marker_type` with sensible defaults (door/arrow for connection, speech bubble for note, house for building, pin for poi). The existing `color` column overrides icon tint when set.

## Rendering

Add `CustomMarkerLayer.tsx` (new) alongside the existing `SubMarkerLayer`. It consumes the same unified `/api/guide/sub-markers/:mapKey` response but filters to `type='custom'` and handles tooltips + click behavior specific to custom markers.

Remove custom-row handling from `SubMarkerLayer` to keep it focused on flag-completable gameplay sub-markers.

## Placement & editing (UI)

All creation/editing lives inside calibration mode. Extend `CalibrationPanel` with a **"Custom"** section.

### Creating
1. User clicks "Add custom marker" in the Custom section
2. Picks `marker_type`, enters a `label`, optional `description` and `color`
3. Clicks somewhere on the map → POST `/api/guide/custom-markers` with the current `map_id` and selected `game`
4. Marker appears immediately; editor stays open on the new marker for further edits

### Editing
Clicking an existing custom marker in calibration mode opens `CustomMarkerEditor.tsx` (new), a side panel with:
- label, description, type, color fields (PATCH on change)
- delete button (DELETE)
- For `connection` type only: a **"Link to…"** dropdown listing unlinked connection markers for the same game (formatted `{map_name} — {label}`). Selecting one POSTs to the link endpoint, which updates both rows' `paired_marker_id` in a transaction. "Unlink" button clears both sides.

### Repositioning
Existing drag-to-reposition flow already works for custom markers via `PATCH /api/guide/custom-markers/:id` (x/y). No change needed.

## Connection navigation

When a user clicks a linked connection marker outside calibration mode:

1. `CustomMarkerLayer` calls `onNavigateToMap(mapKey, {x, y})` (new prop)
2. `GameMap` bubbles it up to `Guide.tsx`
3. `Guide.tsx` switches its selected map to the target `mapKey` and passes a one-shot `focusPoint={{x, y}}` prop to `GameMap`
4. `GameMap` effect: on `focusPoint` change, `map.setView([-y*mapHeight, x*mapWidth], map.getZoom())`, then clears `focusPoint` via a callback so it doesn't re-fire

If the paired marker was somehow lost (deleted while UI stale), the tooltip shows "unlinked" and the click is a no-op.

## API changes

Existing endpoints (in `server/src/routes/subMarkers.ts`):

- `POST /api/guide/custom-markers` — already exists, already accepts all fields.
- `DELETE /api/guide/custom-markers/:id` — already exists.
- `PATCH /api/guide/custom-markers/:id` — **extend** from x/y-only to also accept `label`, `description`, `marker_type`, `color`, `icon`. Builds a dynamic UPDATE from provided fields.

New endpoints:

- `POST /api/guide/custom-markers/:id/link` — body `{ partnerId: number }`. Validates both rows exist, both are `marker_type='connection'`, both are currently unlinked, and both belong to the same `game`. Sets each row's `paired_marker_id` to the other in a single transaction.
- `DELETE /api/guide/custom-markers/:id/link` — clears `paired_marker_id` on both sides in a transaction.
- `GET /api/guide/custom-markers/unlinked?game=red` — returns unlinked connection markers across all maps for that game, with a joined `map_name` field, for the "Link to…" dropdown.

Extend the unified `GET /api/guide/sub-markers/:mapKey` custom block to self-join so each custom row includes `paired_marker_id`, `paired_map_key`, `paired_x`, `paired_y`, `paired_label`. This lets the client render and navigate without a second fetch.

## File changes

**Server**
- `server/src/schema.sql` — add the `paired_marker_id` column
- `server/src/routes/subMarkers.ts` — extend PATCH, add link/unlink/unlinked endpoints, self-join for paired fields in GET

**Client**
- `client/src/components/guide/CustomMarkerLayer.tsx` *(new)*
- `client/src/components/guide/CustomMarkerEditor.tsx` *(new)*
- `client/src/components/guide/CalibrationPanel.tsx` — add "Custom" section that opens the editor
- `client/src/components/guide/GameMap.tsx` — accept `focusPoint` prop, wire `onNavigateToMap`
- `client/src/pages/Guide.tsx` — handle `onNavigateToMap` (switch map + pass focusPoint)
- `client/src/components/guide/SubMarkerLayer.tsx` — drop `type='custom'` handling (moved)

## Error handling

- Invalid link (wrong type, already-linked, cross-game): 400 with message
- Deletion cascade: `ON DELETE SET NULL` on `paired_marker_id` handles the edge cleanly
- Missing paired marker on navigation: treat as unlinked, no-op

## Testing

No test framework in this project. Verification is manual:
- Place a note, reload, confirm persistence + tooltip
- Place two connection markers on different maps, link them, click one → map switches and centers on the paired point
- Unlink, delete one side, confirm the other reverts to "unlinked"
- Switch games; confirm markers from other games don't appear
