# Pickup: Gen 3+ Save Parsers — 2026-04-10

## What was done

Implemented save parsers for Gen 3-7 to bring them to parity with Gen 1/2. All world state fields now extracted: player name, TID, SID, TSV, badges, play time, location, bag contents. Snapshots and auto-linkage work for all generations.

### Files changed (20 files, ~1040 lines added)

**New files:**
- `server/src/services/gen3MapLookup.ts` — RSE Hoenn + FRLG Kanto/Sevii map tables
- `server/src/services/locationNames.ts` — Gen 4-7 location name tables (Sinnoh, Johto/Kanto, Unova, Kalos, Hoenn-ORAS, Alola/USUM zones)

**World state extractors (all expanded):**
- `gen3WorldState.ts` — play time, SID, bag (all pockets), location from Section 1 warp data
- `gen4WorldState.ts` — play time (0x86), SID, bag, location (zone 0x0E7C)
- `gen5WorldState.ts` — play time (0x19400), SID, bag
- `gen6WorldState.ts` — play time (0x01014), SID, location (Situation block)
- `gen7WorldState.ts` — play time (SM: 0x40C00, USUM: 0x41000), SID, location (SM: 0x00E02, USUM: 0x01002), Grand Trial flags

**Pipeline fixes:**
- `autoLinkage.ts` — Was Gen 1-2 only. Now calls world state extractors directly (no ability_names dependency). Smart world state parsing for all gens.
- `syncSaves.ts` — Smart placement on startup: parses snapshots, sorts by badge count + play time, finds best parent via party overlap + badge proximity. Cleans up old "Unknown" placeholder playthroughs.
- `saveSnapshot.ts` — Supports all 7 gens. Added ot_sid, tsv, play_time_seconds fields.
- `saveParser.ts` — Added Gen 6/7 binary size detection
- `index.ts` — Creates move_names/ability_names tables before sync; seeds from PokeAPI before sync/rebuild
- `timeline.ts` — `/scan` endpoint now supports all gens (was Gen 1-2 only)

### Verified against real saves

| Save | Player | Badges | Play Time | Location |
|------|--------|--------|-----------|----------|
| Diamond | Shawn | 0 | 0h 18m | twinleaf-town |
| X | GrandKai | 8 | 25h 28m | kiloude-city |
| Alpha Sapphire | GrandKai | 8 | 229h 24m | route-104 |
| Sun | GrandKai | 0 | 24h 2m | malie-city |
| Ultra Moon (34 saves) | GrandKai | 0 | various | various (USUM zone table validated) |

## Known issues to fix

### ~~Move names showing as "move ###"~~ FIXED
- `rebuildSnapshots()` now guards against empty `move_names` table — skips rebuild if seed hasn't completed.
- Removed `rebuildSnapshots()` from the `seedLookupTables` failure path in `index.ts`.

### ~~Some moves not coming through at all~~ FIXED
- Root cause was the PK6/PK7/PK4/PK5 block unshuffle bug (see below). Moves were being read from the wrong decrypted block for ~58% of Pokemon.

### Gen 7 bag not parsed
- Physical offset 0x00000 in Checkpoint exports contains block metadata, not item data
- The actual bag base is ~0x01634 (SM) / ~0x016B4 (USUM) but pocket sub-offsets from PKHeX don't match the raw layout
- Only the balls pocket (+0x8D8) worked at the empirically-found base
- **Root cause:** PKHeX uses virtual block addressing; raw Checkpoint files may have different internal pocket layout
- Lower priority since bag data is less critical for the play page

### Gen 7 Grand Trial flags unverified
- SM event flags at 0x01A00, USUM at 0x01E00
- Flag indices (0x1E1, 0x1E5, 0x1ED, 0x1F1) need testing against a save with completed trials
- Currently showing 0 badges for all Gen 7 saves

### USUM zone table coverage
- 380 zones mapped, validated against all 34 UM saves
- SM zones work via the USUM table (similar layout) but not 100% verified
- Interior maps may resolve to parent location (e.g., zone 156 → heahea-city for a Pokemon Center inside Heahea)

### Gen 5 untested
- No Gen 5 saves in the library
- Parser implemented but offsets unverified

### ~~Game name not prettified in details pane~~ FIXED
- Added `prettyGameName()` utility in `pkConstants.ts` with canonical lookup table (handles FireRed, LeafGreen, HeartGold, SoulSilver, etc.)
- Normalizes underscores, strips "Pokemon" prefix. Used in autoLinkage, syncSaves, timeline.

### ~~Gen 7 Grand Trials showing 0/4 for all saves~~ FIXED
- Event flag approach was wrong — replaced with PKHeX's Trainer Passport stamps.
- SM stamps at 0x4008, USUM at 0x4408. Bits 5-8 of a u32 = Melemele/Akala/Ula'ula/Poni.
- Verified against real saves: 0/4, 1/4, 3/4, 4/4 all correct.
- Also fixed USUM file size detection (Checkpoint exports are 0x6CC00, not 0x6CA00).

### ~~Shiny Victreebel appearing in multiple saves~~ FIXED — was block unshuffle bug
- Root cause: `unshuffleBlocks()` in `pkDecoder.ts` and `pk45Decoder.ts` used PKHeX's `blockPosition` table backwards.
- The table maps canonical→shuffled, but the code used it as shuffled→canonical. Only worked for 10/24 self-inverse permutations; 58% of Pokemon got garbled blocks.
- Checksums still passed because the PK6/PK7 checksum is an order-agnostic sum over all blocks.
- Swapped blocks caused species misreads (Victreebel/Zapdos), nickname↔OT swaps, wrong moves, and false shiny detection.
- Fixed in both `pkDecoder.ts` (Gen 6-7) and `pk45Decoder.ts` (Gen 4-5). Verified: 0 garbage entries after fix.

## Key offset reference

```
Gen 3 Section 0:  play time 0x0E, OTID 0x0A (low16=TID, high16=SID)
Gen 3 Section 1:  warp location 0x04-0x05 (mapGroup, mapNumber)
Gen 4 General:    play time DP/HGSS 0x86, Pt 0x8A; zone 0x0E7C
Gen 5 Absolute:   play time 0x19400
Gen 6 Save:       play time 0x01014 (GameTime block +0x14)
Gen 6 Situation:  XY 0x01200, ORAS 0x01400 (zone at +0x02)
Gen 7 SM:         play time 0x40C00, Situation 0x00E00, MyStatus 0x01200
Gen 7 USUM:       play time 0x41000, Situation 0x01000, MyStatus 0x01400
```
