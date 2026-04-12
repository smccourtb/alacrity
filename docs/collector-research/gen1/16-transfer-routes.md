# Gen 1 Transfer Routes -- Master Reference

Consolidated transfer routing guide for all 151 Gen 1 species, assembled from the 14 game-specific research documents ([01-vc-red-blue.md](01-vc-red-blue.md) through [14-gen9-sv.md](14-gen9-sv.md)). See [00-overview.md](00-overview.md) for the species index and terminology.

**Purpose:** Map every transfer pathway, document what is preserved or lost at each step, identify irreversible decisions, and provide optimal routing for common collector specimen types.

---

## 1. Complete Transfer Chain Diagram

```
=============================================================================
                     COMPLETE TRANSFER PATHWAYS (2026)
=============================================================================

  GAME BOY ERA (VC on 3DS)           GBA ERA                 DS ERA
  ========================           =======                 ======

  VC Red/Blue/Yellow (Gen 1)         RSE / FRLG (Gen 3)
  VC Gold/Silver/Crystal (Gen 2)         |
          |                              | [Pal Park -- DS/DS Lite GBA slot]
          |                              | 6 at a time, items preserved
          |                              | HMs must be deleted
          |                              v
          |                         DPPt / HGSS (Gen 4)
          |                              |
          |                              | [Poke Transfer -- DS Download Play]
          |                              | 6 at a time, items STRIPPED
          |                              | HMs must be deleted
          |                              v
          |                         BW / B2W2 (Gen 5)
          |                              |
          |  [Poke Transporter]          | [Poke Transporter]
          |  Box 1, up to 30             | Box 1, up to 30
          |  DVs discarded               | Ball/nature/IVs preserved
          |  IVs regenerated             |
          |  HA assigned                 |
          |  All balls -> Poke Ball      |
          |  Moves preserved             |
          v                              v
     +==========================================+
     |          POKEMON BANK (3DS cloud)         |
     |   Holds up to 3,000 across 100 boxes     |
     |   Free since March 2023 (eShop closed)   |
     +==========================================+
          |                    |
          | [Withdraw]         | [Bank -> HOME, ONE-WAY]
          v                    v
    Gen 6: XY, ORAS     +==============================+
    Gen 7: SM, USUM      |      POKEMON HOME            |
    (bidirectional        |   (Switch / Mobile cloud)    |
     within Bank)         +==============================+
                               |         |         |         |         |
                               v         v         v         v         v
                             SwSh      BDSP       PLA       SV     Legends
                            (Gen 8)  (Gen 8)   (Gen 8)  (Gen 9)    Z-A
                                                                  (planned)


  SPECIAL ROUTES:
  ===============

  Pokemon Go -------> LGPE (one-way)
  Pokemon Go -------> Pokemon HOME (one-way, via GO Transporter)

  LGPE <-----------> Pokemon HOME (bidirectional, with restrictions)
       \-----------> SwSh / SV / etc. (via HOME, but CANNOT return to LGPE)


  KEY:
  ----
  -------> = One-way transfer (irreversible)
  <------> = Bidirectional (can move back and forth)
  [text]   = Transfer method and constraints

  ALL VERTICAL TRANSFERS ARE ONE-WAY (forward only).
  Pokemon can NEVER move backward to an earlier generation.
  Bank -> HOME is one-way. HOME -> Bank is impossible.
```

### Pathway Summary Table

| From | To | Method | Direction |
|------|----|--------|-----------|
| VC Gen 1/2 | Pokemon Bank | Poke Transporter (3DS) | One-way |
| Gen 3 (RSE/FRLG) | Gen 4 (DPPt/HGSS) | Pal Park (DS GBA slot) | One-way |
| Gen 4 (DPPt/HGSS) | Gen 5 (BW/B2W2) | Poke Transfer (DS Download Play) | One-way |
| Gen 5 (BW/B2W2) | Pokemon Bank | Poke Transporter (3DS) | One-way |
| Pokemon Bank | Gen 6 (XY/ORAS) | Bank withdrawal | Bidirectional |
| Pokemon Bank | Gen 7 (SM/USUM) | Bank withdrawal | Bidirectional |
| Pokemon Bank | Pokemon HOME | Bank -> HOME transfer | One-way |
| Pokemon HOME | SwSh | HOME transfer | Bidirectional (dex-limited) |
| Pokemon HOME | BDSP | HOME transfer | Bidirectional (Gen 1-4 only) |
| Pokemon HOME | PLA | HOME transfer | Bidirectional (PLA dex only) |
| Pokemon HOME | SV | HOME transfer | Bidirectional (SV dex only) |
| Pokemon HOME | LGPE | HOME transfer | Bidirectional (Kanto 151 + Meltan/Melmetal; tainted flag blocks return) |
| Pokemon Go | LGPE | Go Park (Fuchsia City) | One-way |
| Pokemon Go | Pokemon HOME | GO Transporter | One-way |

---

## 2. What Changes on Transfer (Comprehensive)

### 2.1 VC Gen 1/2 -> Pokemon Bank (via Poke Transporter)

This is the most transformative transfer step. The Pokemon's entire data structure is rebuilt.

| Property | Before (VC) | After (Bank/Gen 7) | Notes |
|----------|-------------|---------------------|-------|
| IVs | DVs (0-15, 4 stats) | Random IVs (0-31, 6 stats) | 3 guaranteed 31; 5 for Mew/Celebi. DVs discarded entirely. |
| Nature | Does not exist | EXP mod 25 | **Controllable before transfer.** Grind EXP to desired remainder. |
| Ability | Does not exist | Hidden Ability assigned | All VC transfers get HA. Exception: species with no HA defined in Gen 7 get Slot 1. |
| Ball | Tracked in gameplay | **Poke Ball (always)** | Gen 1/2 do not store ball data in a transferable format. Apricorn Balls, Sport Balls -- all lost. |
| Gender | Does not exist (Gen 1) / DV-based (Gen 2) | Attack DV-based | Same formula as Gen 2. Preserved for Gen 2 transfers. |
| Shininess | Does not exist (Gen 1) / DV-based (Gen 2) | DV formula checked | Shiny if Def/Spd/Spc DVs = 10 and Atk DV in {2,3,6,7,10,11,14,15}. |
| Origin mark | None | **Game Boy mark** | Permanent. Visible in Gen 7, HOME, and all receiving games. |
| EVs/Stat EXP | Stat Experience values | Reset to 0 | |
| Moves | Gen 1/2 moveset | **Preserved** | Standard TM/level-up/HM/tutor moves pass through intact. Only event-exclusive moves that fail legality check are blocked. Gen 1 TMs and Gen 2 tutor moves create legal transfer-only specimens. |
| OT/ID | Preserved | Preserved | Secret ID set to 00000. |
| Held items | May exist (Gen 2) | **Rejected** | Transporter refuses Pokemon holding items. Remove first. |
| Pokerus | N/A (Gen 1) / May exist (Gen 2) | Not transferred | |
| Friendship | Exists | Reset | |
| Experience | Used for nature calc | Reset to min for current level | After nature is determined from total EXP. |

### 2.2 Gen 3 -> Gen 4 (Pal Park)

Relatively gentle transfer. Most data preserved.

| Property | Preserved? | Notes |
|----------|-----------|-------|
| Nature | Yes | Permanent from Gen 3 onward |
| Ability | Yes | May mismatch PID; corrects on evolution |
| IVs | Yes | Full 0-31 values for all 6 stats |
| EVs | Yes | |
| Ball type | **Yes** | First gen where ball data persists through transfer |
| Ribbons | **Yes** | All earned ribbons transfer |
| Moves | Yes | HM moves must be deleted before transfer |
| OT/TID | Yes | |
| Shiny status | Yes | PID + TID/SID determines |
| Held item | **Yes** | Items transfer with the Pokemon |
| Met location | **Changed** | Replaced with "Pal Park" |
| Friendship | **Reset to 70** | |
| Level met | **Updated** | Changed to current level at time of transfer |

### 2.3 Gen 4 -> Gen 5 (Poke Transfer)

Almost identical to Pal Park except items.

| Property | Preserved? | Notes |
|----------|-----------|-------|
| Nature | Yes | |
| Ability | Yes | |
| IVs | Yes | |
| EVs | Yes | |
| Ball type | **Yes** | Including HGSS Apricorn Balls |
| Ribbons | **Yes** | |
| Moves | Yes | HM moves must be deleted before transfer |
| OT/TID | Yes | |
| Shiny status | Yes | |
| Held item | **NO -- STRIPPED** | Items are removed. Remove valuables first! |
| Met location | Preserved | |
| Friendship | Preserved | |
| Eggs | **Cannot transfer** | |
| Spiky-eared Pichu | **Cannot transfer** | |

### 2.4 Gen 5 -> Pokemon Bank (via Poke Transporter)

Clean transfer. Full data preserved.

| Property | Preserved? | Notes |
|----------|-----------|-------|
| Nature | Yes | |
| Ability | Yes | Including Hidden Abilities from Dream World/Hidden Grotto |
| IVs | Yes | |
| EVs | Yes | |
| Ball type | **Yes** | Including Dream Balls |
| Ribbons | **Yes** | |
| Moves | Yes | |
| OT/TID | Yes | |
| Shiny status | Yes | |
| Held item | Returned to Gen 5 Bag | Or deleted if Bag is full |
| Origin mark | **None assigned** | Gen 3-5 Pokemon have no origin mark |

### 2.5 Pokemon Bank -> Gen 6/Gen 7 (Withdrawal)

| Property | Notes |
|----------|-------|
| All data | Preserved |
| Gen 3/4 contest ribbons | Consolidated into **Contest Memory Ribbon** when viewed in Gen 6+ |
| Gen 3/4 battle ribbons | Consolidated into **Battle Memory Ribbon** when viewed in Gen 6+ |
| Origin mark | Gen 6 natives get Blue Pentagon; Gen 7 natives get Clover mark; VC transfers keep Game Boy mark; Gen 3-5 transfers get **no mark** |

### 2.6 Pokemon Bank -> Pokemon HOME (One-Way)

| Property | Notes |
|----------|-------|
| All data | Preserved |
| Direction | **ONE-WAY.** Cannot return to Bank. |
| Origin mark | Preserved (or absent, for Gen 3-5 origin) |
| All ribbons | Preserved |
| Ball type | Preserved |

### 2.7 Pokemon HOME -> Switch Games (SwSh/BDSP/PLA/SV)

| Property | Notes |
|----------|-------|
| Nature | Preserved |
| Ability | Preserved (unless game lacks the ability; flagged) |
| IVs | Preserved |
| EVs | Preserved (reset to 0 for PLA) |
| Ball type | Preserved (PLA balls may show as "Strange Ball" in other games) |
| Ribbons | Preserved |
| Moves | Moves not in target game's data are flagged/removed |
| Shiny status | Preserved |
| Origin mark | Preserved |
| Gmax factor (SwSh) | Preserved; no effect outside SwSh |
| Tera Type (SV) | Assigned randomly if entering SV from pre-Gen 9 origin |
| Size/Scale (SV) | Randomly generated if entering SV from pre-Gen 9 origin |
| Alpha status (PLA) | Preserved through HOME; displays as Alpha Mark in SV |
| AVs (LGPE) | **Discarded** -- Pokemon arrives with 0 EVs |

### 2.8 LGPE -> Pokemon HOME

| Property | Notes |
|----------|-------|
| Species | Must be Kanto 151 + Meltan + Melmetal |
| Nature | Preserved |
| Ability | **None in LGPE.** Receives standard ability (NOT Hidden Ability) on arrival in SwSh/SV. |
| IVs | Preserved |
| Ball | Preserved |
| AVs | **Discarded** |
| Moves | May be reset to level-appropriate in destination game |
| Shiny status | Preserved |
| Origin mark | **Let's Go mark** (unique to LGPE) |
| Return to LGPE | Only if the Pokemon has **never** entered SwSh/SV/BDSP/PLA |

### 2.9 Pokemon Go -> LGPE / HOME

| Property | In Go | After Transfer |
|----------|-------|----------------|
| IVs | 0-15 per stat (Atk/Def/HP) | Doubled + 1 (always odd; Speed random) |
| Nature | Does not exist in Go | Randomly assigned |
| Ability | Does not exist in Go | Standard ability (LGPE has none; HOME/SwSh assigns one) |
| Ball | N/A | Poke/Great/Ultra/Premier Ball based on Go ball used |
| Shiny status | Preserved | Shiny persists through transfer |
| Moves | Reset | Level-appropriate moveset assigned |
| Origin mark | Go origin mark | Visible in HOME and receiving games |

---

## 3. One-Way Restrictions

Every transfer in the chain is irreversible. This section documents each point of no return and its consequences.

### 3.1 Master List of Irreversible Transfers

| Transfer | Method | What You Lose by Proceeding |
|----------|--------|----------------------------|
| VC Gen 1/2 -> Bank | Poke Transporter | **DVs replaced** with random IVs. Ball becomes Poke Ball. Stat EXP erased. Held items blocked. Cannot use in VC game again. Moves preserved (standard moves pass through). |
| Gen 3 -> Gen 4 | Pal Park | Cannot return to Gen 3. Met location changes to "Pal Park." Friendship reset to 70. Loses access to Gen 3 contests and battle facilities. |
| Gen 4 -> Gen 5 | Poke Transfer | Cannot return to Gen 4. **Held items stripped.** Loses access to Gen 4 Super Contests, Battle Frontier ribbons, Pokewalker. |
| Gen 5 -> Bank | Poke Transporter | Cannot return to Gen 5. Loses access to B2W2 move tutors (last pre-Bank tutor set). |
| Bank -> HOME | Bank transfer | **Cannot return to Bank.** Loses ability to withdraw into Gen 6/7 games via Bank. |
| HOME -> SwSh/SV/etc. | HOME transfer | Pokemon can return to HOME but gains a "tainted" flag for LGPE (cannot return to LGPE once it enters any Gen 8/9 game). |
| Bank -> Gen 6/7 -> Bank -> HOME | Multi-step | Once in HOME, cannot go back to Bank. Must complete all Gen 6/7 activities first. |
| Pokemon Go -> LGPE | Go Park | Cannot return to Go. Stats rebuilt. |
| Pokemon Go -> HOME | GO Transporter | Cannot return to Go. |

### 3.2 The Critical Chokepoints

**Chokepoint 1: Poke Transporter (VC -> Bank)**
- This is the most destructive single transfer. DVs, moves, ball type, stat experience -- all gone.
- **Action:** Complete ALL of the following before transferring:
  - Nature manipulation (EXP mod 25)
  - Any breeding that uses the Gen 2 shiny odds (1/64 with shiny parent)
  - Confirm shiny eligibility via DV values
  - Remove held items (Gen 2)

**Chokepoint 2: Gen 4 -> Gen 5 (Items stripped)**
- Unlike Pal Park (Gen 3 -> Gen 4), Poke Transfer strips all held items.
- **Action:** Remove all valuable items (Leftovers, Lucky Egg, Master Balls, evolution items) before transferring.

**Chokepoint 3: Bank -> HOME (No return)**
- Once in HOME, you can never put Pokemon back into Bank or any Gen 6/7 game via Bank.
- **Action:** Complete ALL Gen 6/7 activities before this transfer:
  - ORAS contest ribbons (Contest Star Ribbon)
  - XY/ORAS battle ribbons
  - SM/USUM Battle Tree ribbons
  - SM/USUM Alola Champion ribbon
  - USUM move tutors
  - Any Alolan evolutions desired in Gen 7

**Chokepoint 4: LGPE taint flag**
- Sending an LGPE Pokemon to SwSh or any Gen 8/9 game permanently prevents it from returning to LGPE.
- **Action:** Complete all LGPE activities (Master Trainers, AV training) before sending to HOME/SwSh.

---

## 4. Game Compatibility Matrix

Which Gen 1 species from which origin can be deposited into each game via HOME. "Y" = species exists in that game's data and can be deposited. "N" = excluded from the game's data entirely.

### 4.1 Games Where Gen 1 Pokemon Can Reside

| Game | Platform | Dex Size (approx) | Gen 1 Available | Bidirectional with HOME? |
|------|----------|-------------------|-----------------|--------------------------|
| VC RBY | 3DS | 151 | All 151 | No (Transporter only, one-way out) |
| VC GSC | 3DS | 251 | All 151 | No (Transporter only, one-way out) |
| RSE/FRLG | GBA | 386 | All 151 | No (Pal Park only) |
| DPPt/HGSS | DS | 493 | All 151 | No (Poke Transfer only) |
| BW/B2W2 | DS | 649 | All 151 | No (Poke Transporter only) |
| XY/ORAS | 3DS | 721 | All 151 | Via Bank (bidirectional within Bank) |
| SM/USUM | 3DS | 807 | All 151 | Via Bank (bidirectional within Bank) |
| LGPE | Switch | 153 | All 151 + Meltan/Melmetal | Via HOME (bidirectional with restrictions) |
| SwSh + DLC | Switch | ~664 | ~115 (36 excluded) | Via HOME (bidirectional) |
| BDSP | Switch | 493 | All 151 | Via HOME (bidirectional) |
| PLA | Switch | ~242 | ~26 Gen 1 species | Via HOME (bidirectional) |
| SV + DLC | Switch | ~680 | ~96 (~55 excluded) | Via HOME (bidirectional) |

### 4.2 Notable Exclusions by Game

**Species cut from SwSh (confirmed absent):**
Weedle line, Pidgey line, Rattata line, Spearow line, Ekans line, Paras line, Venonat line, Mankey line, Bellsprout line, Doduo line, Seel line, Drowzee line, Voltorb line, Hitmonlee, Hitmonchan, Kangaskhan, Mew

[NEEDS VERIFICATION: Nidoran-F line, Horsea line, Tangela, Omanyte/Omastar, Dratini line, Mewtwo -- some may be available via DLC]

**Species cut from SV (confirmed absent):**
Caterpie line, Weedle line, Pidgey line, Rattata line, Spearow line, Nidoran-F line, Nidoran-M line, Zubat/Golbat, Paras line, Abra line, Machop line, Tentacool line [NEEDS VERIFICATION], Ponyta line, Farfetch'd, Onix, Krabby line, Cubone line, Hitmonlee, Hitmonchan, Lickitung, Rhyhorn line, Tangela, Kangaskhan, Goldeen line, Staryu line, Mr. Mime, Jynx, Electabuzz [NEEDS VERIFICATION], Magmar [NEEDS VERIFICATION], Pinsir, Omanyte/Omastar, Kabuto/Kabutops, Aerodactyl

**Species present in PLA (Gen 1 subset):**
~26 species including: Pikachu, Raichu, Clefairy, Clefable, Vulpix, Ninetales, Zubat, Golbat, Psyduck, Golduck, Ponyta, Rapidash, Growlithe, Arcanine (Hisuian), Geodude, Graveler, Golem, Magnemite, Magneton, Onix, Gastly, Haunter, Gengar, Voltorb, Electrode (Hisuian), Chansey, Mr. Mime, Scyther, Magikarp, Gyarados, Eevee + evolutions, Snorlax, Porygon

### 4.3 Cross-Game Reachability

For any given Gen 1 specimen, the final reachable games depend on its origin:

| Origin | Can Reach |
|--------|-----------|
| VC Gen 1/2 | Bank -> SM/USUM -> Bank -> HOME -> SwSh/BDSP/PLA/SV (species permitting) |
| Gen 3 (RSE/FRLG) | Gen 4 -> Gen 5 -> Bank -> Gen 6/7 -> Bank -> HOME -> Gen 8/9 |
| Gen 4 (DPPt/HGSS) | Gen 5 -> Bank -> Gen 6/7 -> Bank -> HOME -> Gen 8/9 |
| Gen 5 (BW/B2W2) | Bank -> Gen 6/7 -> Bank -> HOME -> Gen 8/9 |
| Gen 6 (XY/ORAS) | Bank -> Gen 7 -> Bank -> HOME -> Gen 8/9 |
| Gen 7 (SM/USUM) | Bank -> HOME -> Gen 8/9 |
| LGPE | HOME -> SwSh/SV (but cannot return to LGPE after entering Gen 8/9) |
| SwSh | HOME -> BDSP/PLA/SV (species permitting) |
| BDSP | HOME -> SwSh/PLA/SV (species permitting) |
| PLA | HOME -> SwSh/BDSP/SV (species permitting) |
| SV | HOME -> SwSh/BDSP/PLA (species permitting) |
| Pokemon Go | HOME -> any compatible game; or Go Park -> LGPE -> HOME |

---

## 5. Recommended Transfer Timing per Game

When to transfer specimens out of each game, and what to finish first.

### 5.1 VC Gen 1 (Red/Blue/Yellow)

**Transfer when:**
- Nature manipulation is complete (EXP mod 25 = desired nature index)
- All desired specimens are caught (starters, legendaries, fossils, etc.)
- You have confirmed DV values for shiny candidates

**Complete before transferring:**
- [ ] Nature via EXP grinding for every transfer candidate
- [ ] Shiny DV verification (if shiny hunting)
- [ ] All desired catches on this save (one-time encounters are gone)
- [ ] Nothing else -- Gen 1 has no breeding, no ribbons, no held items, no abilities

**Do NOT transfer yet if:**
- You still need to breed in Gen 2 using this species (trade to VC GSC first)
- You want to use the Gen 2 shiny breeding trick with this specimen's DVs

### 5.2 VC Gen 2 (Gold/Silver/Crystal)

**Transfer when:**
- Nature manipulation is complete for all candidates
- All shiny breeding is finished (1/64 odds with shiny parent -- exploit this before transferring)
- Held items are removed from all candidates

**Complete before transferring:**
- [ ] Nature via EXP grinding for every transfer candidate
- [ ] All breeding using Gen 2's favorable shiny odds
- [ ] Remove all held items (Transporter rejects Pokemon with items)
- [ ] Crystal move tutors are taught to all transfer candidates (moves are preserved through Transporter -- creates legal transfer-only specimens in Gen 7+)
- [ ] Celebi hunt is complete (Crystal exclusive, 1/8192 shiny)

**Accept that you will lose:**
- Apricorn Ball data (all balls become Poke Ball)
- Sport Ball data (same)
- Stat Experience (reset to 0)

**What is preserved:**
- Moves (standard TM/level-up/HM/tutor moves pass through Transporter intact)

### 5.3 Gen 3 (RSE/FRLG)

**Transfer when:**
- All RSE contest ribbons are earned (20 ribbons: 5 categories x 4 ranks)
- Battle Tower ribbons earned (Winning Ribbon, Victory Ribbon)
- Champion Ribbon earned
- Effort Ribbon and Artist Ribbon earned
- All desired Emerald Battle Frontier progress is complete

**Complete before transferring:**
- [ ] All 20 contest ribbons (RSE only -- FRLG has no contests)
- [ ] Winning Ribbon (Battle Tower Lv. 50, 56-win streak)
- [ ] Victory Ribbon (Battle Tower Lv. 100, 56-win streak)
- [ ] Champion Ribbon (Hall of Fame entry)
- [ ] Effort Ribbon (max EVs, Slateport NPC)
- [ ] Artist Ribbon (Lilycove Art Museum -- selected as sketch model)
- [ ] All desired ball catches (ball type is permanent and persists from Gen 3 onward)
- [ ] Delete HM moves from all transfer candidates (required for Pal Park)

**Hardware note:** Requires a DS or DS Lite with a GBA slot. DSi/3DS cannot access Pal Park.

### 5.4 Gen 4 (DPPt/HGSS)

**Transfer when:**
- All Super Contest ribbons are earned (DPPt: 20 ribbons, 5 categories x 4 ranks)
- Battle Tower/Frontier ribbons earned
- HGSS Legend Ribbon earned (defeat Red at Mt. Silver)
- All Apricorn Ball catches are complete (HGSS -- irreplaceable ball source)
- Daily ribbons collected (Mon-Sun)
- Purchasable ribbons obtained (Gorgeous, Royal, Gorgeous Royal)
- All desired Pokewalker encounters are caught

**Complete before transferring:**
- [ ] All 20 Super Contest ribbons (DPPt only)
- [ ] Battle Tower ability ribbons (DPPt)
- [ ] Legend Ribbon (HGSS exclusive -- defeat Red)
- [ ] Effort Ribbon, Footprint Ribbon
- [ ] All 7 daily ribbons (Alert through Smile)
- [ ] Gorgeous/Royal/Gorgeous Royal ribbons (Resort Area, DPPt)
- [ ] HGSS Apricorn Ball catches finalized (ball type is permanent)
- [ ] Sport Ball catches from Bug-Catching Contest finalized
- [ ] Platinum/HGSS move tutors taught (some moves unavailable in later gens)
- [ ] Remove held items (Poke Transfer strips items!)
- [ ] Delete HM moves from all transfer candidates

**Critical:** If you have an Apricorn Ball specimen in HGSS that needs DPPt contest ribbons, trade it to DPPt first, earn ribbons there, then transfer from DPPt to Gen 5.

### 5.5 Gen 5 (BW/B2W2)

**Transfer when:**
- All B2W2 move tutors have been taught (last pre-Bank tutor set)
- All breeding is complete (HA inheritance works differently in Gen 5 vs Gen 6+)
- You are satisfied with nature, IVs, and ability on all specimens

**Complete before transferring:**
- [ ] B2W2 move tutors: especially Snatch (removed from game data in Gen 8), Stealth Rock, Knock Off, Heat Wave, Iron Head, and other competitive moves
- [ ] All breeding finished (Gen 5 is last gen before Bank; breeding mechanics change in Gen 6)
- [ ] HM moves forgotten (Mistralton City Move Deleter for BW; PWT area for B2W2)
- [ ] Valuable held items removed (items go back to Bag)
- [ ] Arrange transfer candidates in Box 1 (Transporter takes entire box)

**Note:** Gen 5 has ZERO earnable ribbons (the only generation since ribbons debuted in Gen 3 with none). There is no ribbon work to do here.

### 5.6 Gen 6 (XY/ORAS)

**Transfer when (to Bank, then HOME):**
- All ORAS contest ribbons earned (5 Master Rank categories + Contest Star Ribbon)
- XY/ORAS battle facility ribbons earned
- Kalos/Hoenn Champion ribbons earned
- Training Ribbon, Best Friends Ribbon earned

**Complete before transferring:**
- [ ] Kalos Champion Ribbon (XY Hall of Fame)
- [ ] Hoenn Champion Ribbon (ORAS Hall of Fame)
- [ ] ORAS Contest Star Ribbon (all 5 Master Rank categories)
- [ ] 5 individual ORAS contest Master Rank ribbons
- [ ] Skillful Battler / Expert Battler Ribbons (Battle Maison)
- [ ] Training Ribbon (Super Training gold medals)
- [ ] Best Friends Ribbon (Pokemon-Amie max affection)
- [ ] Effort Ribbon, Footprint Ribbon
- [ ] Daily ribbons (Mon-Sun)
- [ ] Gorgeous/Royal/Gorgeous Royal ribbons (ORAS Mauville City)

### 5.7 Gen 7 (SM/USUM)

**This is the LAST 3DS generation. Bank -> HOME is one-way.**

**Transfer when (Bank -> HOME):**
- All SM/USUM ribbons earned
- USUM move tutors taught (last 3DS-era tutor set)
- All Alolan evolutions are finalized
- Hyper Training completed if needed

**Complete before transferring:**
- [ ] Alola Champion Ribbon
- [ ] Battle Tree Great and Master Ribbons
- [ ] Battle Royal Master Ribbon
- [ ] Best Friends Ribbon (Pokemon Refresh -> Malie City NPC)
- [ ] Effort Ribbon, Footprint Ribbon
- [ ] USUM move tutors (SM has no tutors!)
- [ ] Alolan evolutions: VC Pikachu -> Alolan Raichu, VC Exeggcute -> Alolan Exeggutor, VC Cubone -> Alolan Marowak (only possible in SM/USUM)
- [ ] Hyper Training for imperfect IV specimens (Level 100 + Bottle Caps)
- [ ] DO NOT send VC specimens to HOME before completing all of the above

### 5.8 LGPE

**Transfer when (HOME -> SwSh/SV):**
- All Master Trainer challenges are complete (153 total)
- AV training is done for any specimens you want at full power in LGPE
- You accept that the Pokemon can NEVER return to LGPE once it enters a Gen 8/9 game

**Complete before transferring:**
- [ ] Master Trainer challenges for relevant species
- [ ] All desired shiny hunts (LGPE has excellent catch combo shiny method)
- [ ] Understand: Pokemon gain no ribbons in LGPE (no ribbon system exists)
- [ ] Understand: AVs are discarded; EVs become 0 in destination game
- [ ] Understand: Pokemon receives standard ability (NOT Hidden Ability) when entering SwSh/SV

### 5.9 Gen 8 -- SwSh

**Transfer when (HOME -> SV or future games):**
- All Gigantamax factors applied via Max Soup (Gmax has no effect outside SwSh)
- All SwSh ribbons earned
- All desired marks are acquired
- Isle of Armor / Crown Tundra tutor moves taught
- Nature Mints and Ability Patches applied as needed

**Complete before transferring:**
- [ ] Galar Champion Ribbon
- [ ] Tower Master Ribbon (defeat Leon at Battle Tower top)
- [ ] Master Rank Ribbon (Master Ball tier ranked online -- challenging)
- [ ] Effort Ribbon, Best Friends Ribbon
- [ ] Gmax factor via Max Soup (IoA)
- [ ] Desired marks (personality, weather, time, fishing -- permanent once caught)
- [ ] IoA and Crown Tundra tutor moves
- [ ] Nature Mints applied if needed (persists through transfer)
- [ ] Ability Patch if HA desired (persists through transfer)

### 5.10 Gen 8 -- BDSP

**Transfer when:**
- All BDSP ribbons earned
- Contest ribbons complete (Contest Star, Twinkling Star, individual Master Ranks)

**Complete before transferring:**
- [ ] Sinnoh Champion Ribbon
- [ ] Tower Master Ribbon (Palmer in Master Class)
- [ ] Contest Star Ribbon + Twinkling Star Ribbon
- [ ] 5 individual contest Master Rank ribbons
- [ ] Daily ribbons (Mon-Sun)
- [ ] Gorgeous/Royal/Gorgeous Royal ribbons
- [ ] Effort Ribbon, Best Friends Ribbon, Footprint Ribbon

### 5.11 Gen 8 -- PLA

**Transfer when:**
- All desired shiny hunts complete (mass outbreak odds are excellent -- 1/128)
- Alpha specimens caught (Alpha Mark is permanent and exclusive to PLA origin)
- Research tasks completed

**Complete before transferring:**
- [ ] Alpha status confirmed (persists as Alpha Mark in SV)
- [ ] Shiny hunts finished (PLA outbreak odds are among the best)
- [ ] Ball choice finalized (PLA balls may display as "Strange Ball" elsewhere)
- [ ] Effort levels maxed if you want them for PLA use (irrelevant outside PLA)

### 5.12 Gen 9 -- SV

**Current endpoint.** Transfer timing depends on future games.

**Complete before transferring to future games:**
- [ ] Paldea Champion Ribbon
- [ ] Master Rank Ribbon (online ranked)
- [ ] Once-in-a-Lifetime Ribbon (1/100 Surprise Trade -- optional prestige)
- [ ] Effort Ribbon, Best Friends Ribbon
- [ ] Tera Type set to desired type (changeable via Tera Shards, but do it before moving)
- [ ] Desired marks acquired (personality, weather, time, size marks)

---

## 6. Point-of-No-Return Reference

Every lockout documented -- what you lose by transferring, what you can never get back.

### 6.1 Permanent Losses by Transfer Step

| Transfer Step | What You Lose Forever |
|---------------|----------------------|
| VC -> Bank | DV values (replaced by random IVs). All moves. Ball type (becomes Poke Ball). Stat Experience. Gen 2 shiny breeding capability with these DVs. |
| Gen 3 -> Gen 4 | Access to RSE contests for this specimen. Access to Emerald Battle Frontier. Access to Gen 3 move tutors. Met location data (becomes "Pal Park"). |
| Gen 4 -> Gen 5 | Held items (stripped). Access to DPPt Super Contests. Access to HGSS Safari Zone / Pokewalker. Access to Gen 4 Battle Frontier. Access to Platinum/HGSS move tutors. |
| Gen 5 -> Bank | Access to B2W2 move tutors (last pre-Bank set). Access to Gen 5 breeding (HA mechanics differ). |
| Bank -> HOME | **All Bank/Gen 6/Gen 7 access.** Cannot withdraw to XY, ORAS, SM, or USUM ever again. All Gen 6 contests, Gen 7 Battle Tree, Gen 7 ribbons permanently unavailable for this specimen. |
| HOME -> SwSh+ | LGPE return eligibility (tainted flag). For LGPE-origin specimens, this is permanent exile. |
| Go -> LGPE/HOME | Cannot return to Pokemon Go. Stats completely rebuilt. |

### 6.2 In-Game Lockouts (Within a Single Save)

These are within-game choices that permanently remove options:

| Game | Lockout | Consequence |
|------|---------|-------------|
| VC RBY | Fossil choice (Helix vs Dome) | Only one fossil per save. Two playthroughs needed. |
| VC RBY | Hitmonlee vs Hitmonchan | One per save from Fighting Dojo. |
| VC RBY | Eevee evolution | One Eevee, three stone options. |
| VC RBY | Master Ball | One per save. Used = gone. |
| VC RBY | Defeating a legendary | Legendary Pokemon do not respawn if KO'd. |
| VC Yellow | Pikachu evolution | Cannot evolve in Yellow. Must transfer first. |
| VC Yellow | Jynx | Cannot obtain at all. Must trade from RB. |
| VC GSC | Apricorn Ball catches | Ball data lost on transfer. In-game value only. |
| VC GSC | Red Gyarados | One guaranteed shiny per save. |
| VC Crystal | Celebi | One per save (GS Ball event). |
| Gen 3 | Fossil choice (FRLG) | Same as VC RBY. |
| Gen 3 | Starter choice | One per save. |
| Gen 4 | HGSS Apricorn Ball catches | Apricorn Balls are the primary collector value of HGSS. Catch the wrong species = wasted ball. |
| Gen 4 | Pokewalker routes | Some courses have exclusive encounters. |
| LGPE | Starter (Pikachu vs Eevee) | Version-locked. Cannot be shiny, cannot be traded. |
| SwSh | Mark acquisition | Marks are fixed at spawn. Missed = gone. |
| SV | Tera Type (wild) | Fixed at spawn. Can be changed later via restaurant, but requires Tera Shards. |

---

## 7. Optimal Transfer Routes for Common Specimen Types

### 7.1 Game Boy Origin Trophy

**Goal:** Earliest possible origin for a Gen 1 species, carrying the Game Boy mark.

```
VC Red/Blue/Yellow
    |
    | [Set nature via EXP mod 25]
    | [Confirm shiny DVs if shiny hunting]
    v
Poke Transporter -> Pokemon Bank
    |
    v
SM/USUM (withdraw here)
    |
    | [Hyper Train IVs if needed]
    | [Teach USUM tutor moves]
    | [Earn Alola Champion + Battle Tree ribbons]
    | [Evolve into Alolan form if desired]
    v
Pokemon Bank -> Pokemon HOME
    |
    v
SwSh -> [Galar Champion Ribbon, Tower Master Ribbon, marks if catching new]
    |
    v
SV -> [Paldea Champion Ribbon, Tera Type assignment]
    |
    v
Final destination (HOME storage or active game)
```

**Result:** A specimen with Game Boy mark, Hidden Ability, controlled nature, ribbons from Gen 7/8/9, and origin traceable to the original Game Boy games.

### 7.2 Apricorn Ball Specimen

**Goal:** A Gen 1 species in a specific Apricorn Ball, preserved through the transfer chain.

```
HGSS (catch in desired Apricorn Ball)
    |
    | [Earn DPPt Super Contest ribbons -- trade to DPPt if needed]
    | [Earn HGSS Legend Ribbon, daily ribbons, etc.]
    | [Platinum/HGSS move tutors]
    | [Remove held items, delete HM moves]
    v
Gen 5 (Poke Transfer -- ball preserved!)
    |
    | [B2W2 move tutors if needed]
    v
Pokemon Bank (Poke Transporter)
    |
    v
Gen 7 SM/USUM (withdraw)
    |
    | [USUM tutor moves, ribbons]
    v
Pokemon Bank -> Pokemon HOME
    |
    v
SwSh -> [Ribbons, Gmax if applicable, marks N/A for transferred specimens]
    |
    v
SV -> [Ribbons, Tera Type]
```

**Result:** Apricorn Ball specimen with ribbons spanning Gen 4 through Gen 9. Ball type preserved at every step from Gen 3 onward.

### 7.3 Ribbon Master Route

**Goal:** Maximum ribbon count on a single specimen. Must start in the earliest possible generation.

```
FRLG or Emerald (Gen 3) -- START HERE
    |
    | [20 Contest Ribbons (RSE only)]
    | [Winning Ribbon + Victory Ribbon (Battle Tower)]
    | [Champion Ribbon, Effort Ribbon, Artist Ribbon]
    | [Total: up to 25 ribbons]
    v
DPPt (Pal Park) -- Gen 4 contests + battle
    |
    | [20 Super Contest Ribbons]
    | [Battle Tower/Frontier ribbons (Ability Ribbon, etc.)]
    | [Legend Ribbon (trade to HGSS, defeat Red, trade back)]
    | [Daily ribbons x7, Gorgeous/Royal/Gorgeous Royal]
    | [Effort Ribbon, Footprint Ribbon]
    v
B2W2 (Poke Transfer) -- Gen 5 (NO ribbons available)
    |
    | [B2W2 move tutors only]
    v
Pokemon Bank -> XY (Gen 6)
    |
    | [Kalos Champion Ribbon]
    | [Skillful/Expert Battler Ribbons (Battle Maison)]
    | [Training Ribbon, Best Friends Ribbon]
    | [Daily ribbons, Effort Ribbon, Footprint Ribbon]
    v
Pokemon Bank -> ORAS
    |
    | [Hoenn Champion Ribbon]
    | [5 Contest Master Ribbons + Contest Star Ribbon]
    | [Gorgeous/Royal/Gorgeous Royal]
    v
Pokemon Bank -> SM/USUM (Gen 7)
    |
    | [Alola Champion Ribbon]
    | [Battle Tree Great + Master Ribbons]
    | [Battle Royal Master Ribbon]
    | [Best Friends Ribbon, Effort Ribbon, Footprint Ribbon]
    v
Pokemon Bank -> Pokemon HOME -> SwSh (Gen 8)
    |
    | [Galar Champion Ribbon]
    | [Tower Master Ribbon]
    | [Master Rank Ribbon (online ranked)]
    | [Effort Ribbon, Best Friends Ribbon]
    v
Pokemon HOME -> BDSP (optional side trip)
    |
    | [Sinnoh Champion Ribbon]
    | [Tower Master Ribbon]
    | [Contest Star + Twinkling Star Ribbons]
    | [Daily ribbons, purchasable ribbons]
    v
Pokemon HOME -> SV (Gen 9)
    |
    | [Paldea Champion Ribbon]
    | [Master Rank Ribbon]
    | [Once-in-a-Lifetime Ribbon (1/100 Surprise Trade)]
    | [Effort Ribbon, Best Friends Ribbon]
    v
RIBBON MASTER COMPLETE
```

**Approximate maximum ribbon count:** 80+ ribbons across all generations (exact count depends on event ribbons and daily ribbons collected).

**Critical rule:** The specimen must start in Gen 3 or earlier. Gen 3 is the earliest generation from which ribbons persist through the chain. VC specimens (Game Boy mark) miss all Gen 3-5 ribbons because they bypass those games entirely.

### 7.4 Shiny VC Specimen (Game Boy Mark Shiny)

**Goal:** A shiny Pokemon with Game Boy origin mark.

```
VC Red/Blue/Yellow or Gold/Silver/Crystal
    |
    | [Hunt for shiny DVs: Atk 2/3/6/7/10/11/14/15, Def=10, Spd=10, Spc=10]
    | [Gen 2: visible shiny in-game; Gen 1: verify DVs manually]
    | [Set nature via EXP mod 25 AFTER confirming shiny]
    v
Poke Transporter -> Bank -> SM/USUM
    |
    | [Shiny status confirmed on arrival]
    | [HA assigned, 3 perfect IVs, Game Boy mark]
    | [Hyper Train remaining IVs]
    v
Bank -> HOME -> destination game
```

**Key constraint for 87.5% male species:** Shiny + female is **impossible** from VC origin. Attack DV must be 2+ for shiny, but female requires 0-1. Collector must choose one.

### 7.5 Hidden Ability in Poke Ball with Game Boy Mark

**Goal:** HA specimen with the earliest possible origin.

```
VC Red/Blue/Yellow (or GSC)
    |
    | [Catch any specimen -- ball irrelevant (becomes Poke Ball)]
    | [Set nature via EXP mod 25]
    v
Poke Transporter -> Bank -> SM/USUM
    |
    | [HA automatically assigned on transfer]
    | [Game Boy mark applied]
    | [Result: HA + Poke Ball + Game Boy mark]
    v
Bank -> HOME -> breed in any modern game
    |
    | [Offspring inherits HA (60% chance from HA parent)]
    | [Offspring can be in ANY ball via female parent's ball]
    | [But offspring loses Game Boy mark]
```

**Note:** The Game Boy mark only exists on the directly transferred specimen. Bred offspring from that specimen will have whatever origin mark corresponds to the game they hatched in.

### 7.6 LGPE Shiny Specimen

**Goal:** Shiny with Let's Go origin mark.

```
LGPE (catch combo shiny hunting -- overworld visible!)
    |
    | [Complete Master Trainer challenge for this species first]
    | [Max AVs if desired for LGPE use]
    v
Pokemon HOME
    |
    | [DO NOT send to SwSh/SV yet if you might want it back in LGPE]
    v
SwSh or SV (when ready -- point of no return for LGPE)
    |
    | [Gains standard ability (NOT HA)]
    | [AVs discarded, EVs = 0]
    | [Let's Go origin mark preserved]
```

### 7.7 Alpha Mark Hisuian Form

**Goal:** Alpha-origin Hisuian form with permanent Alpha Mark.

```
PLA (catch Alpha version of Hisuian Growlithe, Voltorb, etc.)
    |
    | [Confirm Alpha status]
    | [Shiny hunt via outbreaks if desired (1/128 odds)]
    v
Pokemon HOME
    |
    | [Alpha flag stored in HOME data]
    v
SV
    |
    | [Alpha Mark displayed as "Former Alpha"]
    | [Hisuian form preserved]
    | [Alpha's oversized model does NOT carry over]
    | [Can breed Hisuian offspring in SV -- but offspring have no Alpha Mark]
```

### 7.8 Dream Ball Specimen (Gen 5 Origin)

**Goal:** Gen 1 species in a Dream Ball from the Dream World/Dream Radar era.

```
Gen 5 Dream World or Dream Radar (now defunct for new acquisitions)
    |
    | [Pokemon arrives in Dream Ball with Hidden Ability]
    v
Poke Transporter -> Bank
    |
    v
Gen 7 -> Bank -> HOME -> SwSh/SV
    |
    | [Dream Ball preserved throughout]
    | [HA preserved throughout]
```

**Note:** Dream World shut down in 2014. Dream Radar requires 3DS eShop (closed 2023). Existing Dream Ball specimens are finite and historically valuable. Gen 8+ introduced Dream Balls as obtainable items, but catching a new specimen in a Dream Ball in Gen 8/9 gives it a Gen 8/9 origin, not a Gen 5 origin.

---

## Hardware Requirements Summary

| Transfer | Hardware Needed |
|----------|----------------|
| Gen 3 -> Gen 4 (Pal Park) | Nintendo DS or DS Lite (GBA slot required) |
| Gen 4 -> Gen 5 (Poke Transfer) | Two DS-family systems (DS/DS Lite/DSi/3DS) |
| Gen 5 -> Bank (Poke Transporter) | 3DS with Poke Transporter installed (no longer downloadable) |
| VC -> Bank (Poke Transporter) | 3DS with Poke Transporter installed |
| Bank -> Gen 6/7 | 3DS with Pokemon Bank installed |
| Bank -> HOME | 3DS with Bank + Switch/mobile with HOME |
| HOME <-> Switch games | Switch with HOME + target game |
| LGPE <-> HOME | Switch with both apps |
| Go -> LGPE | Mobile (Go) + Switch (LGPE) via Bluetooth |
| Go -> HOME | Mobile (Go) + Switch/mobile (HOME) |

**Critical hardware bottleneck:** The DS/DS Lite with GBA slot is required for Gen 3 -> Gen 4 transfer. These are aging hardware. The 3DS is required for Bank and Transporter -- no longer available for new purchase, and the eShop is closed. Plan transfers while hardware is functional.

---

## Appendix: Nature Table Quick Reference

Used for VC transfer nature manipulation (Total EXP mod 25):

| Index | Nature | +Stat | -Stat |
|-------|--------|-------|-------|
| 0 | Hardy | -- | -- |
| 1 | Lonely | Atk | Def |
| 2 | Brave | Atk | Spe |
| 3 | Adamant | Atk | SpA |
| 4 | Naughty | Atk | SpD |
| 5 | Bold | Def | Atk |
| 6 | Docile | -- | -- |
| 7 | Relaxed | Def | Spe |
| 8 | Impish | Def | SpA |
| 9 | Lax | Def | SpD |
| 10 | Timid | Spe | Atk |
| 11 | Hasty | Spe | Def |
| 12 | Serious | -- | -- |
| 13 | Jolly | Spe | SpA |
| 14 | Naive | Spe | SpD |
| 15 | Modest | SpA | Atk |
| 16 | Mild | SpA | Def |
| 17 | Quiet | SpA | Spe |
| 18 | Bashful | -- | -- |
| 19 | Rash | SpA | SpD |
| 20 | Calm | SpD | Atk |
| 21 | Gentle | SpD | Def |
| 22 | Sassy | SpD | Spe |
| 23 | Careful | SpD | SpA |
| 24 | Quirky | -- | -- |

---

*Research consolidated March 2026. Primary sources: game-specific research documents 01-14 in this series. Cross-referenced against Bulbapedia and Serebii.*
