# Gen 8+ Pokedex Support — Design

**Date:** 2026-04-27
**Status:** Drafted, awaiting review
**Author:** brainstorming session

## Goal

Add full Pokedex support for the five Gen 8/9 game families, matching the fidelity of the existing Gen 1-7 entries. Save-file integration is out of scope (no parser support); manual entry is the primary capture path.

In scope:
- Sword / Shield (Galar)
- Brilliant Diamond / Shining Pearl (Sinnoh remake)
- Legends: Arceus (Hisui)
- Scarlet / Violet (Paldea, including Kitakami and Blueberry DLCs)
- Legends: Z-A (Lumiose)

Out of scope:
- Save-file parsers for any of the above.
- Trade/transfer simulation.
- Battle mechanics modeling.

## Decisions (from brainstorm)

1. **Scope:** Full — Tera types, alpha, paradox, Gen 8 marks, regional forms, Mega Evolutions in Z-A.
2. **Z-A:** First-class. Real data, real origin mark, real regional dex. No placeholder art.
3. **Data sources:** PokeAPI primary; Bulbapedia (via existing `mediawiki.ts`) for marks catalog and any reference data PokeAPI doesn't have. WebSearch as a last resort. Reference data is committed as JSON.
4. **Manual entry UX:** Capture the full attribute set (parity with save-imported entries), but use progressive disclosure — Identity → Catch → Battle → Cosmetic groups, with advanced groups collapsed by default.
5. **Dex visualization:** Filter pills for Tera, marks, alpha, paradox, ribbon-set. New lenses for Tera (color-coded by type) and Alpha (Hisui highlight). 60+ marks live in filters/detail only — no per-mark badges in the grid.
6. **Form handling:** PokeAPI-canonical. Regional forms → `species_forms` rows. Convergents/paradoxes → independent species. Alpha → `collection_manual.is_alpha` boolean (it's a per-instance flag, not a form). Z-A megas → `species_forms` with `is_mega = 1` if catchable; battle-only mega badge on `collection_manual.is_mega` otherwise.

## Architecture

Three layers, no breaking changes:

### 1. Reference data (committed JSON)

Sourced once via fetch scripts, committed to `server/src/seeds/data/`:

| File | Source | Contents |
|---|---|---|
| `gen8-9-reference.json` | PokeAPI | Per-game regional-dex membership for species 810–1025 across all six game families; ability/move metadata gaps backfilled. |
| `marks-catalog.json` | Bulbapedia | All ~120 marks with name, category, rarity, flavor text, per-game availability. |
| `tera-types.json` | hand | 19 Tera types (18 + Stellar) with display name and color hex. |
| `alpha-species.json` | Bulbapedia | Legends: Arceus alpha-encounter species list. |
| `paradox-species.json` | PokeAPI | Past/Future paradox species IDs grouped by parent species (informational; species are already independent in PokeAPI). |
| `legends-za.json` | Bulbapedia + PokeAPI | Z-A regional dex, new Mega-Evolution roster, any Z-A-only marks/mechanics. |

### 2. Schema additions

All additive; existing rows are unaffected because `CREATE TABLE IF NOT EXISTS` and additive `ALTER TABLE` are idempotent.

```sql
-- Per-instance attributes for Gen 8/9 manual entries.
ALTER TABLE collection_manual ADD COLUMN tera_type TEXT;
ALTER TABLE collection_manual ADD COLUMN is_alpha INTEGER DEFAULT 0;
ALTER TABLE collection_manual ADD COLUMN is_mega INTEGER DEFAULT 0;

-- Reference tables (truth lives in seed JSON; these are the queryable copy).
CREATE TABLE IF NOT EXISTS marks_catalog (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'personality' | 'time' | 'weather' | 'rare' | 'mightiest' | ...
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common' | 'rare' | 'mightiest'
  flavor TEXT,
  image_path TEXT
);

CREATE TABLE IF NOT EXISTS tera_types_catalog (
  key TEXT PRIMARY KEY,          -- 'fire', 'fairy', 'stellar', ...
  name TEXT NOT NULL,
  color TEXT NOT NULL            -- '#F08030' etc.
);

CREATE TABLE IF NOT EXISTS species_marks_availability (
  species_id INTEGER NOT NULL REFERENCES species(id),
  mark_key TEXT NOT NULL REFERENCES marks_catalog(key),
  game TEXT NOT NULL,
  PRIMARY KEY (species_id, mark_key, game)
);

-- True per-game availability (replaces leaning on max_species_id).
CREATE TABLE IF NOT EXISTS species_in_dex (
  species_id INTEGER NOT NULL REFERENCES species(id),
  game TEXT NOT NULL,
  dex_name TEXT NOT NULL,        -- 'galar', 'isle-of-armor', 'crown-tundra', 'paldea', 'kitakami', 'blueberry', 'hisui', 'sinnoh-remake', 'lumiose'
  dex_number INTEGER,
  PRIMARY KEY (species_id, game, dex_name)
);
```

`is_paradox` is *not* a column on `collection_manual` — paradox species are already independent species in PokeAPI. The "is_paradox" filter pill resolves via membership in `paradox-species.json` (loaded into a `Set` client-side from `/api/reference/paradox-species`). No schema column needed.

`is_mega` lives in two places intentionally:
- `species_forms.is_mega` flags a species form as a Mega form (read-only metadata; populated by the seed).
- `collection_manual.is_mega` flags a *user's catch instance* as in Mega state (e.g. Z-A's catchable Megas where the user wants to record they have the Mega).
Querying "do I own this species' Mega?" joins both: `collection_manual` rows with `is_mega = 1` whose `form_id` points at a `species_forms` row with `is_mega = 1`.

### 3. Frontend

**New components:**
- `client/src/components/pokedex/ManualEntryForm.tsx` — progressive-disclosure form with four collapsible groups:
  - **Identity** (always open): species, form, gender, shiny, origin_game, nickname.
  - **Catch**: caught_date, caught_location, ball, level, OT name, OT TID, OT SID.
  - **Battle**: nature, ability (with hidden-ability flag), held item, IVs (×6), EVs (×6), moves (×4 with PP).
  - **Cosmetic / game-specific** (rendered only when `origin_game` triggers them): Tera type (Gen 9), alpha flag (Hisui), is_mega (Z-A catchable megas), ribbons (filtered by origin_game), marks (filtered by origin_game + species).
- `client/src/components/pokedex/lenses/TeraLens.tsx` — colors each grid cell by the user's chosen Tera type for that species (or a "no Tera entry" gray if none).
- `client/src/components/pokedex/lenses/AlphaLens.tsx` — highlights species the user has captured as alpha; Hisui-only meaningful.

**Modified components:**
- `client/src/lib/filter-options.ts` — add filter definitions: `tera_type`, `mark`, `is_alpha`, `is_paradox`, `ribbon`.
- `client/src/components/PokemonCard.tsx` — show Tera-type chip + alpha glow on detail.
- `client/src/pages/Pokedex.tsx` — register the two new lenses, surface the new filters.
- `client/src/api/client.ts` — wrap the new `/api/reference/*` endpoints with the existing 5-min cache.

**New asset:**
- `client/src/assets/sprites/origin-marks/lumiose.png` — Z-A origin mark, fetched during the seed step. If unavailable, leave file absent and the lookup in `pokemon-icons.ts` returns undefined (existing behavior renders no badge — same as Gen 3-5 entries today).

### 4. Server

**New routes** (`server/src/routes/reference.ts` is the existing reference-data router):
- `GET /api/reference/marks?game=...&species_id=...` — returns marks valid for that combination.
- `GET /api/reference/tera-types` — all 19.
- `GET /api/reference/alpha-species` — Hisui alphas.
- `GET /api/reference/active-legs` — `collection_legs` rows where `status = 'active'`.

**Modified:**
- `server/src/routes/pokemon.ts` — `POST /api/pokemon/manual` and `PATCH .../:id` accept `tera_type`, `is_alpha`, `is_mega`. Validate against catalogs server-side.

**New scripts** (`server/src/scripts/`):
- `fetch-gen8-9-reference.ts` — PokeAPI walker for species 810-1025 + version-group encounter data + form metadata. Idempotent: re-runs overwrite `gen8-9-reference.json`.
- `fetch-marks-catalog.ts` — Bulbapedia scrape for "List of Marks" + per-mark detail pages, writes `marks-catalog.json`.
- `fetch-za-data.ts` — Bulbapedia scrape for Z-A regional dex page + Mega-Evolution-in-Z-A page, plus origin-mark image fetch. Writes `legends-za.json` and copies the mark PNG into `client/src/assets/sprites/origin-marks/`.
- `seed-gen8-9.ts` — orchestrator that runs all three fetchers in order, then triggers the seeder.

**Seeder integration:**
- `server/src/seedRegionData.ts` extended to populate `marks_catalog`, `tera_types_catalog`, `species_marks_availability`, `species_in_dex` from the JSONs.
- `server/src/seeds/seedCollectionPlanner.ts` flips `galar`, `sinnoh-remake`, `hisui`, `paldea` legs to `'active'` and inserts a new `lumiose` leg for Z-A. Also adds Z-A and any missing Gen 8/9 entries to `game_versions` (verified against `legality-game-versions.json`).

## Data flow

1. **First-time setup:** `bun run seed-gen8-9` runs all three fetchers (PokeAPI + Bulbapedia + WebSearch fallback), writes the four+two seed JSONs, triggers the standard seeder. Idempotent — re-running is safe.
2. **App startup:** existing `seedRegionData.ts` reads the new JSONs and populates the new tables. `seedCollectionPlanner.ts` activates the legs and inserts Z-A. `seed-reference.ts` reads the updated `legality-game-versions.json` and upserts `game_versions` (including Z-A row).
3. **User adds a Pokemon manually:** Pokedex page → "Add" → ManualEntryForm. Origin-game choice gates which advanced fields render. Form posts `POST /api/pokemon/manual`, route inserts into `collection_manual` with the new columns.
4. **User views the Pokedex:** dex page calls `/api/pokemon` (existing) + `/api/reference/marks`, `/tera-types`, `/active-legs` (new). Filter pills and lenses use the reference data; grid renders origin-mark badges from the leg → origin_mark mapping.

## Error handling

- **Fetch scripts** retry transient failures (network) with exponential backoff. Hard-fail with clear log if a critical Bulbapedia page returns 404 or a fundamentally different shape — we want loud failure during seed, not silent missing data.
- **Schema migrations** must be idempotent (re-running app startup must not error). The implementation plan verifies the existing project's migration approach and either reuses it or wraps the new `ALTER TABLE` statements in a try/catch that swallows "duplicate column" errors.
- **Form validation:** the form filters selectable options by `origin_game` so it's *impossible* to enter a "Cetoddle with Mightiest Mark" or "Bulbasaur with Tera Stellar from Crystal." Server-side, the manual route re-validates against `marks_catalog` / `tera_types_catalog` and rejects invalid combinations with a 400.
- **Missing origin-mark image** (e.g. Z-A art not fetchable): `pokemon-icons.ts` already handles unknown origin marks gracefully (returns undefined → no badge rendered). No special-case code needed.
- **Legs that have no entries yet:** existing dex behavior handles empty legs; no change needed.

## Testing

No unit-test framework. Manual verification checklist (run after seeding):

1. Pokedex page renders all 1025 species with origin-mark badges where applicable.
2. Filter pills include Tera type, Mark, Alpha, Paradox, Ribbon.
3. Tera lens colors a Paldean grid by Tera type for entries that have one.
4. Alpha lens highlights only Hisui-origin entries with `is_alpha = 1`.
5. ManualEntryForm: selecting `origin_game = 'sword'` shows ribbons + marks fields; selecting `origin_game = 'legends-arceus'` shows alpha; selecting `origin_game = 'scarlet'` shows Tera; selecting `origin_game = 'legends-za'` shows is_mega.
6. Round-trip: add a Hisuian Voltorb (alpha), refresh page, the entry persists with all attributes.
7. Filter "marks contains Mightiest Mark" narrows the grid correctly.
8. `bun run seed-gen8-9` is idempotent — running twice produces identical DB state.

## Risks acknowledged

1. **Galar/Hisui/Paldea dex coverage** — using `species_in_dex` instead of `max_species_id` for "is this catchable in this game" is a behavioral change for any existing query that leaned on `max_species_id`. Audit `client/src/lib/filter-options.ts` and any dex query that filters by game; migrate them to `species_in_dex`.
2. **Marks catalog rarity** — the ~120 marks include ultra-rare ones (Mightiest variants, pre-set Tera marks). Default UI hides rarity=`mightiest` behind a "show all" toggle in the marks filter.
3. **Z-A Mega Evolution catchability** — if Bulbapedia documents Z-A megas as "battle-only forms" rather than catchable forms, the seed populates `collection_manual.is_mega` semantics rather than `species_forms.is_mega`. The script picks based on the Bulbapedia page text; if ambiguous, it errs toward "catchable form" (more permissive for the user).
4. **Convergent species** — already correctly modeled by PokeAPI as independent species; no special handling.
5. **Origin-mark image for Z-A** — fetched, no fallback art. If genuinely missing, no badge renders (consistent with Gen 3-5).

## Open questions for review

None. The five risks above are explicit decisions, not open questions.
