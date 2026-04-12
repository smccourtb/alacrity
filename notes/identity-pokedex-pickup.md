# Identity System → Pokedex Integration — Pickup Notes (2026-04-11)

## What's Done

### Identity System (fully working)
- `pokemon_identity` + `identity_sightings` tables populated
- Checkpoint scanning: 789 Pokemon across Gen 1/2/4/6/7 saves, 15 shinies identified
- Collection resolution: `GET /api/identity/collection` returns deduped entries from opted-in checkpoints
- Pokedex `usePokedexFilters` now fetches from identity collection (with legacy fallback)
- Cards show **caught/missing** status correctly based on identity collection

### What's visible
- Species cards mark caught vs missing ✓
- Shiny caught detection works ✓
- 789 unique mons across all saves ✓

## What's Broken / Missing

### 1. Snapshot data is too thin for Pokedex features

The `snapshot_data` stored per sighting is a `SnapshotPartyMember`/`SnapshotBoxMember`. These contain:
- ✓ `species_id`, `species_name`, `level`, `is_shiny`, `is_egg`
- ✓ `moves[]`, `ivs{}`, `exp`, `stat_exp{}`
- ✓ `nature`, `ability`, `ball` (Gen 3+ only)
- ✗ `origin_game` — not in snapshot, needed for origin mark filters
- ✗ `gender` — not in snapshot, needed for gender filters
- ✗ `nickname` — not in snapshot
- ✗ `ot_name`, `ot_tid` — stored on the checkpoint's parent snapshot, not per-mon
- ✗ `ribbons`, `marks` — not parsed in any gen
- ✗ `form_id` — not in snapshot
- ✗ `caught_date` — not in snapshot
- ✗ `ev_*` — Gen 1/2 have `stat_exp`, Gen 3+ have `evs` in snapshot but field name differs

**Fix approach:** Either:
- (A) Enrich `SnapshotPartyMember`/`SnapshotBoxMember` with missing fields when building snapshots (preferred — data is available in the parsers, just not passed through)
- (B) Store a richer `snapshot_data` in `identity_sightings` that includes the checkpoint-level OT info + any extra fields
- (C) JOIN identity sightings with checkpoint snapshot to pull OT info at query time

For `origin_game`: Available from the checkpoint's save_file game column. Could be added to the collection resolution query.

For `ot_name`/`ot_tid`: Available from checkpoint snapshot's top-level fields. Could be added to the resolution query.

For `gender`: Gen 1/2 can compute from Attack DV + species gender rate. Gen 3+ parsers already have it but it's not in the snapshot interface.

### 2. Completion endpoints still query `pokemon` table

These endpoints read from the old `pokemon` table (empty now):

- `GET /api/pokemon/completion` — global stats (total caught, shiny caught, by gen)
- `GET /api/pokemon/completion/species/:id` — per-species detail (origins, ribbons, marks, balls, abilities, IVs, forms)

The Pokedex uses these for:
- ProgressRing (`caughtCount / total`)
- SpeciesDetail panel (living/shiny/origins/ribbons/marks/balls/abilities/perfect IVs/form completion)

**Fix approach:** Create identity-aware versions of these endpoints, or modify the existing ones to also query `identity_sightings`. The per-species completion is the harder one — it needs to aggregate data from sighting snapshot_data.

### 3. Collection filter pipeline partially works

The client maps identity entries to the filter pipeline shape in `usePokedexFilters.ts`. Currently:
- `species_id` ✓
- `is_shiny` ✓ (from snapshot_data)
- `origin_game` ✗ (null — snapshot doesn't have it)
- `ball` ✗ for Gen 1/2 (not in snapshot), ✓ for Gen 3+
- `nature` ✗ for Gen 1/2, ✓ for Gen 3+
- `ability` ✗ for Gen 1/2, ✓ for Gen 3+
- `gender` ✗ (not in snapshot for any gen)
- `ribbons`, `marks` ✗ (never parsed)
- `form_id` ✗ (not in snapshot)

So filters by ball/nature/ability work for Gen 3+ but not Gen 1/2. Gender/origin/ribbon/mark filters don't work at all.

### 4. PokemonCard doesn't show collection entry details

When you click a species card, the SpeciesDetail panel fetches from `GET /api/pokemon/completion/species/:id` which queries the empty `pokemon` table. It shows no caught entries, no IVs, no stats.

**Fix:** SpeciesDetail should also (or instead) pull from identity sightings for that species.

### 5. Manual pokemon entry still writes to `pokemon` table

The "Add to collection" form on SpeciesDetail (`POST /api/pokemon`) writes to the `pokemon` table. This is disconnected from the identity system. Need to decide:
- Should manual entries create a `pokemon_identity` + sighting?
- Or keep manual entries in the `pokemon` table and have the collection resolution merge both sources?

## Schema Refactor (Do First)

Rename and split `identity_sightings` into three source-specific tables + a unified view:

### New tables:
- **`collection_saves`** — Pokemon found in checkpoint saves (auto-scanned from identity system)
  - `identity_id` FK, `checkpoint_id` FK, `species_id`, `box_slot`, `level`, `snapshot_data`
  - Replaces the checkpoint side of `identity_sightings`
- **`collection_bank`** — Pokemon from PKSM banks / future Alacrity bank
  - `identity_id` FK, `bank_file_id` FK, `species_id`, `box_slot`, `level`, `snapshot_data`
  - Replaces the bank side of `identity_sightings`
- **`collection_manual`** — User-entered Pokemon (manual form on SpeciesDetail)
  - Full user-entered fields: `species_id`, `is_shiny`, `ball`, `nature`, `ability`, `gender`, `origin_game`, `ot_name`, `ot_tid`, `ribbons`, `marks`, `form_id`, `nickname`, IVs, EVs, moves, notes, caught_date
  - Optionally `identity_id` FK if user links it to a known identity
  - Replaces the old `pokemon` table for manual entries

### Unified view:
- **`collection` (VIEW)** — UNION ALL of all three tables, normalized to a common shape
  - Common columns: `species_id`, `level`, `is_shiny`, `origin_game`, `ball`, `nature`, `ability`, `gender`, `source` ('save'|'bank'|'manual')
  - All completion endpoints + Pokedex filters query this view
  - One place to merge logic, not duplicated across endpoints

### Migration:
- Rename `identity_sightings` → `collection_saves` (or create new + migrate data)
- Create `collection_bank` (move bank rows from old `identity_sightings`)
- Create `collection_manual` (migrate any existing `pokemon` table entries)
- Create `collection` view
- Update `identityService.ts` to write to `collection_saves`/`collection_bank`
- Update `resolveCollection()` to query the `collection` view
- Drop old `pokemon` table once everything is migrated (or keep as legacy)

## Priority Order (After Refactor)

1. **Enrich collection_saves with game/OT data** — expand `resolveCollection` query to JOIN checkpoint + save_file for `origin_game`, `ot_name`, `ot_tid`. Or store these on the `collection_saves` row directly.

2. **Add `gender` to snapshot members** — compute from DVs (Gen 1/2) or read from parser (Gen 3+). Unblocks gender filter.

3. **Rewrite completion endpoints against `collection` view** — replace the existing `/pokemon/completion` and `/pokemon/completion/species/:id` to query the unified view. Fixes ProgressRing and SpeciesDetail panel.

4. **Wire manual entry form to `collection_manual`** — SpeciesDetail "Add to collection" writes to the new table instead of old `pokemon`.

5. **Enrich snapshot members with remaining fields** — `nickname`, `form_id`, etc. Lower priority since these are used for display, not core caught/missing logic.

6. **Update Pokedex cards** — Cards need to show richer data from the collection (IVs, nature, ball, OT, shiny status, level, etc.). Currently just showing caught/missing. Design what info belongs on the card vs in the detail panel.

7. **Convert right sidebar to floating sidebar** — The Pokedex detail panel (SpeciesDetail) currently renders as a fixed right sidebar. Convert to a floating sidebar pattern (consistent with how the Guide's floating sidebar works).

8. **Link Pokedex cards to save location** — Each collected mon knows its "home" checkpoint. Show a link/button on the card that navigates to that save in the timeline (e.g. "Crystal — Route 34" clickable → opens PlayPage at that checkpoint). This is the collection ↔ saves bridge.

9. **Guide ↔ Collection integration** — The guide already has a `collection-status` endpoint showing caught/needed per location. Wire this into the Guide UI more fully: encounter lists show caught indicators, location markers show collection progress (e.g. "3/7 species"). Also consider linking from Guide encounters back to the Pokedex species card.

10. **Save page review** — Audit the Play/Timeline page for anything that needs updating now that collection toggles and identity data exist. Possible items: showing collection count per playthrough, visual indicator on opted-in checkpoints, collection summary in playthrough header.

## Key Files

| File | What needs changing |
|------|-------------------|
| `server/src/services/identityService.ts` | `resolveCollection()` — expand query to include game, ot_name, ot_tid from checkpoint/save_file |
| `server/src/services/saveSnapshot.ts` | Add `gender` to SnapshotPartyMember/SnapshotBoxMember, populate in buildSnapshot() |
| `server/src/routes/pokemon.ts` | `/completion` and `/completion/species/:id` — add identity-aware queries |
| `client/src/hooks/usePokedexFilters.ts` | Update identity→collection mapping to use new fields |
| `client/src/components/pokemon/SpeciesDetail.tsx` | Fetch identity sightings for species detail |

## Data Shape Reference

### What the Pokedex filter pipeline needs per collection entry:
```typescript
{
  species_id: number,      // ✓ from sighting
  is_shiny: 0 | 1,        // ✓ from snapshot_data
  origin_game: string,     // ✗ need from checkpoint→save_file
  ball: string,            // partial (Gen 3+ only)
  nature: string,          // partial (Gen 3+ only)
  ability: string,         // partial (Gen 3+ only)
  gender: string,          // ✗ need to add
  ribbons: string (JSON),  // ✗ not parsed
  marks: string (JSON),    // ✗ not parsed
  form_id: number | null,  // ✗ not in snapshot
}
```

### What SpeciesDetail needs:
```typescript
{
  living: boolean,
  shiny: boolean,
  origins: number,
  ribbons: number,
  marks: number,
  balls: Set<string>,
  abilities: Set<string>,
  has_perfect_ivs: boolean,
  entries_count: number,
  forms: { [form_id]: { living, shiny } },
}
```
