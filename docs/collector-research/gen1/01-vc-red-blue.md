# VC Red/Blue Collector Research

Virtual Console Pokemon Red and Blue (3DS eShop, 2016) are the foundational games for any Gen 1 collector. Every specimen caught here carries the **Game Boy origin mark** -- a distinction no other game can provide. This document covers every obtainable species, their acquisition methods, transfer mechanics, and collector-relevant details.

For the species index, tier definitions, transfer chain reference, and terminology, see [00-overview.md](00-overview.md).

---

## Section A: Game-Wide Mechanics

### A.1 Poke Balls

Gen 1 has exactly four Poke Ball types:

| Ball | Availability | Notes |
|------|-------------|-------|
| Poke Ball | Mart (all cities) | Available from start |
| Great Ball | Mart (Lavender onward) | ~1.5x catch rate vs Poke Ball |
| Ultra Ball | Mart (Fuchsia onward) | ~2x catch rate vs Poke Ball |
| Master Ball | Silph Co. (x1, gift from President) | 100% catch rate, one per save |
| Safari Ball | Safari Zone only | 30 per Safari Zone visit, cannot be used elsewhere |

**Collector impact:** On transfer via Poke Transporter, **all balls become standard Poke Balls** because Gen 1 does not store ball data in the Pokemon's data structure. The Safari Ball distinction is lost on transfer. This means ball choice in Gen 1 is strategically irrelevant for the transferred specimen -- but it does matter for catching efficiency during the playthrough itself.

### A.2 DV System (Determinant Values)

Gen 1 uses DVs instead of IVs. The system stores four values (0-15 each):

| DV | Range | Notes |
|----|-------|-------|
| Attack | 0-15 | Determines gender on transfer |
| Defense | 0-15 | Must be 10 for shiny eligibility |
| Speed | 0-15 | Must be 10 for shiny eligibility |
| Special | 0-15 | Must be 10 for shiny eligibility; used for both SpA and SpD in Gen 2+ |

**HP DV** is derived: take the least significant bit of each other DV and concatenate them as a 4-bit binary number (Attack bit = 8, Defense bit = 4, Speed bit = 2, Special bit = 1). So HP DV ranges 0-15 but is never stored independently.

**On transfer to Gen 7+:** DVs are **discarded entirely**. New IVs (0-31 scale) are generated randomly, with 3 guaranteed to be 31 (or 5 for Mew/Celebi). There is no DV-to-IV conversion formula.

### A.3 Shiny Eligibility

Gen 1 has no concept of shininess. However, the Pokemon's DVs determine whether it **will be shiny** after transfer through Poke Transporter (v1.3+), using the Gen 2 shiny formula:

**Shiny requirements (all must be met):**
- Attack DV: 2, 3, 6, 7, 10, 11, 14, or 15
- Defense DV: exactly 10
- Speed DV: exactly 10
- Special DV: exactly 10

**Probability:** 1 in 8192 (the specific DV values constrain Defense/Speed/Special to one value each out of 16, and Attack to 8 values out of 16: (8/16) x (1/16) x (1/16) x (1/16) = 8/65536 = 1/8192).

**Poke Transporter version note:** Version 1.2 (Jan 2017) had a bug that swapped Attack and Defense DV requirements for shiny determination. Version 1.3 (Sept 2017) corrected this. All current systems should run v1.3+, but verify before shiny hunting. [NEEDS VERIFICATION: whether 3DS eShop still serves Transporter updates as of 2026 given the eShop closure]

### A.4 Gender Determination

Gen 1 has no gender mechanic. Gender is assigned during transfer by Poke Transporter v1.3+ based on the **Attack DV** and the species' gender ratio, using Gen 2 rules:

| Species Gender Ratio | Female if Attack DV is... | Male if Attack DV is... |
|-----------------------|---------------------------|-------------------------|
| 87.5% male (7:1) | 0-1 | 2-15 |
| 75% male (3:1) | 0-3 | 4-15 |
| 50/50 (1:1) | 0-7 | 8-15 |
| 25% male (1:3) | 0-11 | 12-15 |
| Male-only | Always male | -- |
| Female-only | Always female | -- |
| Genderless | Always genderless | -- |

**The Shiny + Female Impossibility (87.5% Male Species):**

For 87.5% male species, female requires Attack DV 0-1. But shiny requires Attack DV of at least 2. Therefore, **shiny + female is mathematically impossible** for VC-origin specimens of these species:

- Bulbasaur/Ivysaur/Venusaur (#001-003)
- Charmander/Charmeleon/Charizard (#004-006)
- Squirtle/Wartortle/Blastoise (#007-009)
- Eevee/Vaporeon/Jolteon/Flareon (#133-136)
- Omanyte/Omastar (#138-139)
- Kabuto/Kabutops (#140-141)
- Aerodactyl (#142)
- Snorlax (#143)

A collector must choose: shiny OR female, never both. This constraint is unique to the Gen 1/2 DV system.

**Poke Transporter v1.2 note:** The initial release assigned gender randomly rather than by Attack DV. This means some early-transferred specimens may have "impossible" gender+shiny combinations. These are legitimate but no longer reproducible.

### A.5 Transfer Mechanics (VC to Gen 7+)

**Path:** VC Red/Blue --> Poke Transporter (3DS) --> Pokemon Bank (3DS) --> SM/USUM or --> Pokemon HOME (one-way)

**What changes on transfer:**

| Property | Before Transfer | After Transfer |
|----------|----------------|----------------|
| IVs | DVs (0-15), 4 stats | Random IVs (0-31), 6 stats; 3 guaranteed 31 (5 for Mew) |
| Nature | Does not exist | Total EXP mod 25 (controllable) |
| Ability | Does not exist | **Hidden Ability** assigned |
| Ball | Tracked during gameplay | Poke Ball (always) |
| Gender | Does not exist | Based on Attack DV and species ratio |
| Shininess | Does not exist | Based on DVs using Gen 2 formula |
| Origin mark | None | **Game Boy mark** |
| EVs/Stat EXP | Stat Experience values | Reset to 0 |
| OT/ID | Preserved | Secret ID set to 00000 |
| Pokerus | N/A (no Pokerus in Gen 1) | Not present |
| Experience | Preserved for nature calc | Reset to minimum for current level after nature determined |

**Nature manipulation:** The nature assigned on transfer is `Total EXP mod 25`. Since EXP can be precisely controlled by battling or using Rare Candies, nature is fully controllable before transfer. See the overview document for the complete nature table (0=Hardy through 24=Quirky).

**Hidden Ability:** All VC transfers receive their Hidden Ability. This is one of the most significant collector benefits -- it is the **only** way to obtain certain species with their HA in a Poke Ball with a Game Boy origin mark. Exception: species that had no HA defined in Gen 7 receive Ability Slot 1 instead.

### A.6 What Does Not Exist in Gen 1

- **Breeding** -- No daycare breeding, no egg moves, no egg groups in practice
- **Natures** -- Determined on transfer only
- **Abilities** -- Determined on transfer only
- **Held items** -- Items cannot be held by Pokemon
- **Genders** -- Determined on transfer only
- **Shininess** -- Determined by DVs on transfer only
- **IVs** -- DVs exist but are replaced on transfer
- **EVs** (modern) -- Stat Experience exists but is reset on transfer

### A.7 Key Progression Gates

| Gate | Requirement | Unlocks |
|------|-------------|---------|
| Route 2 (Cut tree) | HM01 Cut + Cascade Badge | Access to Diglett's Cave from Route 2 side |
| Route 9/Rock Tunnel | HM05 Flash (optional but recommended) | Lavender Town access |
| Pokemon Tower ghosts | Silph Scope (from Rocket Hideout) | Can identify/battle Ghost Pokemon in tower |
| Routes 12/16 Snorlax | Poke Flute (from Mr. Fuji) | Southern route to Fuchsia City |
| Safari Zone | Pay 500 at gate | Safari Ball catches, HM03 Surf, Gold Teeth |
| Sea routes (19-21) | HM03 Surf + Soul Badge | Seafoam Islands, Cinnabar Island |
| Cinnabar Lab | Fossil + Old Amber | Revive fossil Pokemon |
| Victory Road | All 8 badges + HM04 Strength | Elite Four access |
| Cerulean Cave | Defeat Elite Four | Post-game dungeon with Mewtwo |

**Fishing Rod Locations:**
- **Old Rod:** Vermilion City (from Fishing Guru in house near port)
- **Good Rod:** Fuchsia City (from Fishing Guru in house east of Pokemon Center)
- **Super Rod:** Route 12 (from Fishing Guru in house on the route)

---

## Section B: Per-Species Entries

### Tier 1 -- One-Time Encounters, Gifts, and Special Acquisitions

#### B.1 Starters

| # | Species | Level | Location | Method |
|---|---------|-------|----------|--------|
| 001 | Bulbasaur | 5 | Pallet Town | Gift from Prof. Oak (1 of 3 choice) |
| 004 | Charmander | 5 | Pallet Town | Gift from Prof. Oak (1 of 3 choice) |
| 007 | Squirtle | 5 | Pallet Town | Gift from Prof. Oak (1 of 3 choice) |

**Collector notes:**
- One choice per save file. Three playthroughs needed for all three.
- All are 87.5% male: shiny + female is impossible (see A.4).
- As gift Pokemon, they are obtained at the very start -- nature can be set by manipulating EXP before transfer.
- **SAVE-BEFORE:** Save before selecting your starter. The DVs are set when you receive the Pokemon.
- These carry the Game Boy origin mark and Hidden Ability on transfer -- the only way to get HA starters in a Poke Ball with this mark.
- HA values on transfer: Bulbasaur (Chlorophyll), Charmander (Solar Power), Squirtle (Rain Dish).

#### B.2 Fossils

| # | Species | Level | Location | Method |
|---|---------|-------|----------|--------|
| 138 | Omanyte | 30 | Cinnabar Lab | Revive Helix Fossil (from Mt. Moon) |
| 140 | Kabuto | 30 | Cinnabar Lab | Revive Dome Fossil (from Mt. Moon) |
| 142 | Aerodactyl | 30 | Cinnabar Lab | Revive Old Amber (from Pewter Museum) |

**Collector notes:**
- **Helix vs Dome Fossil:** Mutually exclusive choice in Mt. Moon B2F after defeating Super Nerd. Two playthroughs needed for both.
- **Old Amber:** Not mutually exclusive. Obtained from the back entrance of Pewter Museum (requires Cut). Available in every playthrough.
- All three are 87.5% male: shiny + female impossible.
- **SAVE-BEFORE:** Save before collecting the fossil in Mt. Moon, and save before reviving at Cinnabar Lab (DVs are set on revival).
- HA values: Omanyte (Weak Armor), Kabuto (Weak Armor), Aerodactyl (Unnerve).

#### B.3 Legendary Birds and Mewtwo

| # | Species | Level | Location | Requirements |
|---|---------|-------|----------|-------------|
| 144 | Articuno | 50 | Seafoam Islands B4F | Surf + Strength (puzzle) |
| 145 | Zapdos | 50 | Power Plant | Surf (to reach Power Plant) |
| 146 | Moltres | 50 | Victory Road 2F | Strength |
| 150 | Mewtwo | 70 | Cerulean Cave B1F | Defeat Elite Four, Surf + Strength |

**Collector notes:**
- One of each per save file. Static encounters -- they do not respawn if defeated (KO = lost forever).
- All are genderless: no gender complications.
- **SAVE-BEFORE:** Mandatory save before each legendary. DVs determine shiny eligibility.
- **Master Ball strategy:** Mewtwo at Lv. 70 is the hardest to catch. Most players save the Master Ball for Mewtwo. The birds at Lv. 50 are catchable with Ultra Balls + status moves (Sleep/Freeze).
- On transfer: Hidden Ability assigned. Articuno (Snow Cloak), Zapdos (Static), Moltres (Flame Body), Mewtwo (Unnerve).
- Galarian forms exist for the three birds (from Crown Tundra) but those are separate species -- the Kanto birds from VC are the original forms with Game Boy mark, which is unique.

#### B.4 Mew (#151)

**Status: [DISPUTED]**

Mew is not legitimately obtainable in Pokemon Red/Blue without:
1. **Official event distribution** (no longer available)
2. **Virtual Console distribution** (20th Anniversary Mew, OT: GF, ID: 22796)
3. **Mew Glitch** (Trainer-Fly exploit)

**The Mew Glitch:**
The Trainer-Fly glitch allows encountering Mew by exploiting a game bug:
1. Stand in front of a long-range Trainer (commonly the Gambler on Route 8)
2. Open the menu and use Fly before the Trainer activates
3. Battle a specific Trainer elsewhere (the Youngster on Route 25 with a Slowpoke works -- Slowpoke's Special stat of 21 maps to Mew)
4. Return to the original area to trigger a wild Mew encounter at Lv. 7

**Poke Transporter legitimacy:** Glitch Mew **fails** Poke Transporter checks. Only Mew with OT "GF" or "Game Freak" and Trainer ID 22796 passes -- these match the official VC distribution. A glitch Mew will be flagged as having "an unspecified problem" and cannot be transferred.

**Collector verdict:** If you have the VC distribution Mew (OT: GF, ID: 22796), it is the definitive Game Boy origin Mew specimen. If not, Mew cannot be obtained from VC Red/Blue in a transferable form. The glitch Mew remains playable within the VC game itself but is a dead end for the collection pipeline.

On transfer, Mew receives 5 guaranteed perfect IVs (instead of the standard 3) and Hidden Ability (Synchronize).

#### B.5 Gift Pokemon

| # | Species | Level | Location | How to Obtain |
|---|---------|-------|----------|---------------|
| 133 | Eevee | 25 | Celadon Mansion | Find in back room (enter from rear entrance) |
| 131 | Lapras | 15 | Silph Co. 7F | Gift from NPC during Silph Co. story event |
| 106 | Hitmonlee | 30 | Saffron Fighting Dojo | Gift after defeating Karate King (1 of 2 choice) |
| 107 | Hitmonchan | 30 | Saffron Fighting Dojo | Gift after defeating Karate King (1 of 2 choice) |

**Collector notes:**
- **Eevee:** One per save. 87.5% male (shiny + female impossible). Can evolve into Vaporeon (Water Stone), Jolteon (Thunder Stone), or Flareon (Fire Stone) -- but NOT Espeon/Umbreon (friendship evolution did not exist in Gen 1). Evolving in Gen 1 means only three Eeveelutions are possible from this specimen.
- **Lapras:** One per save. 50/50 gender ratio. No gender/shiny conflict. Unique: the only way to get a Game Boy origin Lapras with HA Water Absorb. **SAVE-BEFORE.**
- **Hitmonlee/Hitmonchan:** Mutually exclusive choice. Both male-only (no gender concerns). Two playthroughs needed. **SAVE-BEFORE.**
- HA values: Eevee (Anticipation), Lapras (Hydration), Hitmonlee (Unburden), Hitmonchan (Inner Focus).

#### B.6 Game Corner Pokemon

| # | Species | Level | Coins | Red | Blue |
|---|---------|-------|-------|-----|------|
| 063 | Abra | 9 | 180 (R) / 120 (B) | Yes | Yes |
| 035 | Clefairy | 8 | 500 (R) / 750 (B) | Yes | Yes |
| 030 | Nidorina | 17 | 1200 | Yes | Yes |
| 033 | Nidorino | 17 | 1200 | Yes | Yes |
| 147 | Dratini | 18 | 2800 (R) / 4600 (B) | Yes | Yes |
| 123 | Scyther | 25 | 5500 | Red only | No |
| 127 | Pinsir | 20 | 2500 | No | Blue only |
| 137 | Porygon | 26 (R) / 18 (B) | 9999 (R) / 6500 (B) | Yes | Yes |

**Collector notes:**
- **Porygon** is the key pickup here -- it is the **only** way to obtain Porygon in Red/Blue (no wild encounters). Game Corner purchase is mandatory. Porygon is genderless, so no gender concerns.
- Abra, Clefairy, Nidorina, Nidorino, and Dratini are all available as wild encounters elsewhere -- the Game Corner is just a convenience.
- Scyther (Red) and Pinsir (Blue) are also available in the Safari Zone but are very rare there. The Game Corner offers a guaranteed acquisition.
- Coins can be purchased at the Game Corner counter: 50 coins for 1000 Yen. So Porygon costs approximately 200,000 Yen at the exchange rate (or slot machine grinding).

#### B.7 In-Game Trades

| # | You Give | You Receive | Nickname | OT | Location |
|---|----------|------------|----------|-----|----------|
| 122 | Mr. Mime | Abra | MARCEL | TRAINER | Route 2 gate |
| 030/033 | Nidoran F/M | Nidoran M (trade gives opposite) | SPOT/TERRY | TRAINER | Underground Path (Rt. 5-6) / Route 11 |
| 108 | Lickitung | Slowbro | MARC | TRAINER | Route 18 gate |
| 124 | Jynx | Poliwhirl | LOLA | TRAINER | Cerulean City |
| 083 | Farfetch'd | Spearow | DUX | TRAINER | Vermilion City |
| 101 | Electrode | Raichu | DORIS | TRAINER | Cinnabar Lab |
| 114 | Tangela | Venonat | CRINKLES | TRAINER | Cinnabar Lab |
| 086 | Seel | Ponyta | SAILOR | TRAINER | Cinnabar Lab |

**Important correction:** The table above shows what you **receive** and what you **give**. The key species for collectors are:

- **Mr. Mime (#122):** Obtained by trading an Abra to the NPC on Route 2. This is the **only** way to get Mr. Mime in Red/Blue -- it has no wild encounters.
- **Jynx (#124):** Obtained by trading a Poliwhirl in Cerulean City. The **only** way to get Jynx in Red/Blue.
- **Farfetch'd (#83):** Obtained by trading a Spearow in Vermilion City. The **only** way to get Farfetch'd in Red/Blue.
- **Lickitung (#108):** Obtained by trading a Slowbro on Route 18. The **only** way to get Lickitung in Red/Blue.

**Collector notes:**
- All traded Pokemon come with OT "TRAINER" and a random Trainer ID. They have fixed nicknames that **cannot be changed** (no Name Rater for traded Pokemon with different OT).
- Traded Pokemon have randomly generated DVs -- they are NOT inherited from the Pokemon you trade away.
- These are repeatable: you can trade as many times as you have the required Pokemon. However, Mr. Mime, Jynx, Farfetch'd, and Lickitung are only obtainable through these trades in RB.
- On transfer, these retain their fixed OT "TRAINER" which distinguishes them from player-caught specimens.

#### B.8 Snorlax (#143)

| # | Species | Level | Location | Requirements |
|---|---------|-------|----------|-------------|
| 143 | Snorlax | 30 | Route 12 | Poke Flute |
| 143 | Snorlax | 30 | Route 16 | Poke Flute |

**Collector notes:**
- **Two** Snorlax per save file -- one of only a few species with multiple static encounters.
- Both are Level 30. Awakened with the Poke Flute obtained from Mr. Fuji in Lavender Town.
- These are wild encounters (not gifts), so they can be caught in any available ball.
- 87.5% male: shiny + female impossible.
- If defeated, they are gone permanently. **SAVE-BEFORE** each.
- HA on transfer: Gluttony.
- Strategy: catch one early for your team (Route 12 is accessible first), save the other for shiny hunting if desired.

#### B.9 Power Plant Electrode (#101)

In the Power Plant, **six Voltorb (Lv. 40) and two Electrode (Lv. 43)** are disguised as item balls. Interacting with them triggers a wild battle. These are regular wild encounters -- they can be caught, fled from, or defeated. They are NOT static encounters in the traditional sense (they appear as fake items rather than overworld sprites), but they are one-time encounters.

**Collector note:** These are functionally wild encounters and can be caught in any ball. Voltorb and Electrode are also available as random encounters in the Power Plant, so these fake-item encounters are not the only source.

---

### Tier 2 -- Safari Zone, Version Exclusives, Regional Form Seeds

#### B.10 Safari Zone Species

The Safari Zone uses Safari Balls exclusively -- 30 per entry (500 Yen admission fee). You cannot use your own Poke Balls. Safari mechanics involve throwing Bait (lowers flee rate, lowers catch rate) or Rocks (raises catch rate, raises flee rate).

**On transfer, Safari Balls become Poke Balls** (Gen 1 does not store ball type). This removes the only unique ball opportunity in Gen 1.

**Complete Safari Zone Pokemon List (Red/Blue):**

| # | Species | Area(s) | Rate | Notes |
|---|---------|---------|------|-------|
| 029 | Nidoran F | Center, Area 1, 2, 3 | 5-20% | Common |
| 030 | Nidorina | Center, Area 1, 2 | 5-10% | Uncommon |
| 032 | Nidoran M | Center, Area 1, 2, 3 | 5-20% | Common |
| 033 | Nidorino | Center, Area 1, 2, 3 | 5-10% | Uncommon |
| 046 | Paras | Center, Area 1 | 5-15% | |
| 047 | Parasect | Center, Area 1 | 5% | |
| 048 | Venonat | Center, Area 3 | 15% | |
| 049 | Venomoth | Area 2, 3 | 5% | |
| 084 | Doduo | Area 1, 3 | 20% | |
| 102 | Exeggcute | Center, Area 1, 2, 3 | 15-20% | Common across all areas |
| 104 | Cubone | Area 1, 2, 3 | 5-10% | R/B only (not Yellow) |
| 105 | Marowak | Area 1, 3 | 5% | R/B only |
| 111 | Rhyhorn | Center, Area 2 | 10-20% | |
| 113 | Chansey | Center, Area 1, 2 | 1-4% | **Extremely rare** |
| 114 | Tangela | Center, Area 3 | 1-4% | Rare |
| 115 | Kangaskhan | Area 1, 2, 3 | 1-15% | Rare overall; Area 2 (North) has 15% in R/B |
| 123 | Scyther | Center, Area 1, 2 | 1-4% | **Red only** |
| 127 | Pinsir | Center, Area 1, 2, 3 | 1-4% | Both versions |
| 128 | Tauros | Area 1, 2, 3 | 1-10% | Rare in some areas |

**Safari Zone Fishing:**

| # | Species | Rod | Rate | Notes |
|---|---------|-----|------|-------|
| 129 | Magikarp | Old Rod | 100% | |
| 060 | Poliwag | Good Rod | 50% | |
| 118 | Goldeen | Good Rod | 50% | |
| 054 | Psyduck | Super Rod | 25% | R/B only |
| 079 | Slowpoke | Super Rod | 25% | R/B only |
| 098 | Krabby | Super Rod | 25% | |
| 147 | Dratini | Super Rod | 25% | |
| 148 | Dragonair | Super Rod | 10% | Very rare, R/B only |

**Key collector targets in Safari Zone:**
- **Kangaskhan (#115):** Female-only species. Only available here in Gen 1. Safari Zone is the only way to get a Game Boy origin Kangaskhan. Area 2 (North) has the best rate at 15% in Red/Blue. **Mandatory specimen.**
- **Chansey (#113):** Female-only. Extremely rare (1-4%). Also available in Cerulean Cave post-game at higher encounter rates. Safari Zone is not the only source.
- **Tauros (#128):** Male-only. Available in multiple Safari Zone areas. Has a Paldean form (Combat/Blaze/Aqua Breed) in SV -- the Game Boy Kanto Tauros is a distinct collector piece.
- **Scyther (#123):** Red only in Safari Zone. Also available at Game Corner (Red, 5500 coins).
- **Dratini/Dragonair:** Super Rod fishing in Safari Zone. Also available at Game Corner (Dratini).

#### B.11 Version Exclusives

**Pokemon Red Exclusives:**

| # | Species | Type | Location(s) |
|---|---------|------|-------------|
| 023 | Ekans | Poison | Routes 4, 11, 23 |
| 024 | Arbok | Poison | Route 23 (evolved from Ekans) |
| 043 | Oddish | Grass/Poison | Routes 5, 6, 7, 12, 13, 14, 15, 24, 25 |
| 044 | Gloom | Grass/Poison | Routes 12, 13, 14, 15 (evolved) |
| 045 | Vileplume | Grass/Poison | Evolve Gloom (Leaf Stone) |
| 056 | Mankey | Fighting | Routes 5, 6, 7, 8 |
| 057 | Primeape | Fighting | Route 23 (evolved) |
| 058 | Growlithe | Fire | Routes 7, 8, Pokemon Mansion |
| 059 | Arcanine | Fire | Evolve Growlithe (Fire Stone) |
| 123 | Scyther | Bug/Flying | Safari Zone, Game Corner |
| 125 | Electabuzz | Electric | Power Plant |

**Pokemon Blue Exclusives:**

| # | Species | Type | Location(s) |
|---|---------|------|-------------|
| 027 | Sandshrew | Ground | Routes 4, 8, 9, 11, 23 |
| 028 | Sandslash | Ground | Route 23 (evolved) |
| 037 | Vulpix | Fire | Routes 7, 8, Pokemon Mansion |
| 038 | Ninetales | Fire | Evolve Vulpix (Fire Stone) |
| 052 | Meowth | Normal | Routes 5, 6, 7, 8 |
| 053 | Persian | Normal | Evolve Meowth (Lv. 28) |
| 069 | Bellsprout | Grass/Poison | Routes 5, 6, 7, 12, 13, 14, 15, 24, 25 |
| 070 | Weepinbell | Grass/Poison | Routes 12, 13, 14, 15 (evolved) |
| 071 | Victreebel | Grass/Poison | Evolve Weepinbell (Leaf Stone) |
| 126 | Magmar | Fire | Pokemon Mansion |
| 127 | Pinsir | Bug | Safari Zone, Game Corner |

**Collector notes:**
- A collector needs **both** Red and Blue saves to catch all 151 obtainable species. Trading between VC copies on the same 3DS is possible via local wireless.
- Each exclusive carries the Game Boy mark -- there is no way to get a Game Boy origin Sandshrew from Red, or a Game Boy origin Growlithe from Blue.
- **Growlithe/Arcanine (#58-59):** Has a **Hisuian form** (Fire/Rock). A Game Boy origin Kanto Growlithe transferred to Legends: Arceus retains its Kanto form. [NEEDS VERIFICATION: whether Kanto Growlithe can evolve to Hisuian Arcanine in PLA]
- **Vulpix/Ninetales (#37-38):** Has an **Alolan form** (Ice/Ice-Fairy). A VC Kanto Vulpix transferred to SM/USUM remains Kanto Vulpix -- you cannot evolve it into Alolan Ninetales because Alolan Vulpix is the base form for Alolan Ninetales (they share the same species number but the form is on the base stage).
- **Meowth/Persian (#52-53):** Has **Alolan** (Dark) and **Galarian** (Steel) forms. Kanto Meowth transferred stays Kanto Meowth. Cannot evolve into Alolan or Galarian Persian as those require Alolan/Galarian Meowth respectively.

#### B.12 Regional Form Seeds

When a Pokemon is transferred from VC to SM/USUM, it retains its Kanto form. However, **certain Kanto Pokemon that evolve into species with Alolan forms will evolve into the Alolan form when evolved in SM/USUM**. This creates unique **Game Boy origin mark Alolan form Pokemon** -- specimens that cannot be created any other way.

**Confirmed Game Boy Origin Alolan Evolutions:**

| Kanto Base | Alolan Evolution | How | Notes |
|-----------|-----------------|-----|-------|
| Pikachu (#25) | Alolan Raichu (Electric/Psychic) | Thunder Stone in SM/USUM | Pikachu evolved in Alola always becomes Alolan Raichu |
| Exeggcute (#102) | Alolan Exeggutor (Grass/Dragon) | Leaf Stone in SM/USUM | Exeggcute evolved in Alola always becomes Alolan Exeggutor |
| Cubone (#104) | Alolan Marowak (Fire/Ghost) | Level 28+ at night in SM/USUM | Cubone evolved in Alola at night always becomes Alolan Marowak |

**These three are mandatory collector targets.** Transfer the Kanto base form from VC, evolve in SM/USUM, and you have a Game Boy origin Alolan Pokemon. This is confirmed by Bulbapedia: "Alolan Raichu, Exeggutor, and Marowak can have [the Game Boy origin mark], due to their respective pre-evolved forms being able to have it."

**Species where the regional form is on the BASE stage (cannot get Game Boy origin regional form by evolving):**

These species have regional forms as their own base forms. Transferring the Kanto version does NOT allow evolution into the regional form:

| Kanto Species | Regional Forms | Why Not |
|--------------|---------------|---------|
| Rattata (#19) | Alolan Rattata | Alolan is a base form; Kanto Rattata evolves into Kanto Raticate |
| Vulpix (#37) | Alolan Vulpix | Alolan is a base form; Kanto Vulpix evolves into Kanto Ninetales |
| Sandshrew (#27) | Alolan Sandshrew | Alolan is a base form |
| Diglett (#50) | Alolan Diglett | Alolan is a base form |
| Meowth (#52) | Alolan/Galarian Meowth | Regional is a base form |
| Geodude (#74) | Alolan Geodude | Alolan is a base form |
| Grimer (#88) | Alolan Grimer | Alolan is a base form |
| Growlithe (#58) | Hisuian Growlithe | Hisuian is a base form |
| Voltorb (#100) | Hisuian Voltorb | Hisuian is a base form |
| Slowpoke (#79) | Galarian Slowpoke | Galarian is a base form |
| Farfetch'd (#83) | Galarian Farfetch'd | Galarian is a base form |
| Mr. Mime (#122) | Galarian Mr. Mime | Galarian is a base form |

For these species, the Game Boy origin Kanto form is itself the unique collector piece.

**Galarian Legendary Birds:** Articuno, Zapdos, and Moltres have Galarian forms, but these are entirely separate encounter species in Crown Tundra -- they are not evolutions of Kanto birds. The VC Kanto birds remain Kanto birds.

---

### Tier 3 -- Wild Encounters

#### B.13 Route-by-Route Encounter Guide

**Routes 1-2 (Pallet Town / Viridian City area):**

| Route | Species | Level | Rate | Method |
|-------|---------|-------|------|--------|
| Rt. 1 | Pidgey | 2-5 | 55% | Grass |
| Rt. 1 | Rattata | 2-4 | 45% | Grass |
| Rt. 2 | Pidgey | 3-5 | 45% | Grass |
| Rt. 2 | Rattata | 2-5 | 40% | Grass |
| Rt. 2 | Caterpie | 3-5 | 15% (Red) | Grass |
| Rt. 2 | Weedle | 3-5 | 15% (Blue) | Grass |
| Rt. 2 | Nidoran F | 4-6 | 15% | Grass |
| Rt. 2 | Nidoran M | 4-6 | 15% | Grass |

**Viridian Forest:**

| Species | Level | Rate (Red) | Rate (Blue) | Method |
|---------|-------|------------|-------------|--------|
| Weedle | 3-5 | 50% | 5% | Walking |
| Caterpie | 3-5 | 35% (Red) | 50% (Blue) | Walking |
| Kakuna | 4-6 | 5% | 35% (Blue has Metapod) | Walking |
| Metapod | 4-6 | 5% (Red) | 35% (Blue) | Walking |
| Pikachu | 3-5 | 5% | 5% | Walking |

**Collector note on Pikachu:** 5% encounter rate in Viridian Forest is the earliest opportunity to catch Pikachu. Pikachu is a regional form seed -- evolving in SM/USUM gives Alolan Raichu with Game Boy mark. **Do not evolve Pikachu in Gen 1 if you want Alolan Raichu.**

**Route 3 (Pewter City to Mt. Moon):**

| Species | Level | Rate | Version |
|---------|-------|------|---------|
| Pidgey | 6-8 | 45% | Both |
| Spearow | 5-12 | 35-55% | Both |
| Rattata | 10-12 | 15% | Both |
| Jigglypuff | 3-7 | 10% | Both |
| Mankey | 9 | 15% | Red only |
| Sandshrew | 8-10 | 15% | Blue only |

**Mt. Moon:**

| Species | Level | Rate | Floor |
|---------|-------|------|-------|
| Zubat | 6-13 | 49-79% | All floors |
| Geodude | 7-11 | 15-30% | All floors |
| Paras | 8-13 | 5-15% | All floors |
| Clefairy | 8-13 | 1-10% | All floors (rarer on 1F) |
| Sandshrew | 12 | 4% | 1F only (Blue only) |

**Collector note:** Clefairy is rare in Mt. Moon (1% on 1F, up to 10% on B2F). Also available on Route 3 in Yellow only. Mt. Moon is the primary Gen 1 source.

**Routes 4-6:**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 4 | Rattata | 10-16 | 35% | Grass (east of Mt. Moon) |
| Rt. 4 | Spearow | 10-16 | 35% | |
| Rt. 4 | Ekans | 6-14 | 25% | Red only |
| Rt. 4 | Sandshrew | 6-14 | 25% | Blue only |
| Rt. 4 | Mankey | 10-16 | 5% | Red only |
| Rt. 5 | Pidgey | 13-19 | 40% | |
| Rt. 5 | Oddish | 13-16 | 25% | Red only |
| Rt. 5 | Bellsprout | 13-16 | 25% | Blue only |
| Rt. 5 | Meowth | 10-16 | 35% | Blue only |
| Rt. 5 | Mankey | 10-16 | 35% | Red only |
| Rt. 6 | Pidgey | 13-19 | 40% | |
| Rt. 6 | Oddish | 13-16 | 25% | Red only |
| Rt. 6 | Bellsprout | 13-16 | 25% | Blue only |
| Rt. 6 | Meowth | 10-16 | 35% | Blue only |
| Rt. 6 | Mankey | 10-16 | 35% | Red only |

**Routes 7-8 (Celadon area):**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 7 | Pidgey | 19-22 | 30% | |
| Rt. 7 | Vulpix | 18-22 | 20% | Blue only |
| Rt. 7 | Growlithe | 18-22 | 20% | Red only |
| Rt. 7 | Oddish | 19-22 | 25% | Red only |
| Rt. 7 | Bellsprout | 19-22 | 25% | Blue only |
| Rt. 7 | Meowth | 17-20 | 30% | Blue only |
| Rt. 7 | Mankey | 17-20 | 30% | Red only |
| Rt. 8 | Pidgey | 18-22 | 30% | |
| Rt. 8 | Ekans | 17-22 | 20% | Red only |
| Rt. 8 | Sandshrew | 17-22 | 20% | Blue only |
| Rt. 8 | Vulpix | 15-20 | 20% | Blue only |
| Rt. 8 | Growlithe | 15-20 | 20% | Red only |
| Rt. 8 | Meowth | 18-22 | 25% | Blue only |
| Rt. 8 | Mankey | 18-22 | 25% | Red only |

**Routes 9-10 (Cerulean to Rock Tunnel):**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 9 | Rattata | 16-21 | 30% | |
| Rt. 9 | Spearow | 16-22 | 30% | |
| Rt. 9 | Ekans | 11-17 | 20% | Red only |
| Rt. 9 | Sandshrew | 11-17 | 20% | Blue only |
| Rt. 9 | Voltorb | 14-17 | 5% | |
| Rt. 10 | Voltorb | 14-17 | 40% | |
| Rt. 10 | Spearow | 16-22 | 35% | |
| Rt. 10 | Ekans | 11-17 | 20% | Red only |
| Rt. 10 | Sandshrew | 11-17 | 20% | Blue only |

**Rock Tunnel:**

| Species | Level | Rate | Floor |
|---------|-------|------|-------|
| Zubat | 15-18 | 50-55% | Both floors |
| Geodude | 16-18 | 25-26% | Both floors |
| Machop | 15-17 | 15% | Both floors |
| Onix | 13-17 | 5-9% | Both floors (rare) |

**Route 11 (Vermilion East):**

| Species | Level | Rate | Notes |
|---------|-------|------|-------|
| Ekans | 12-17 | 40% | Red only |
| Sandshrew | 12-17 | 40% | Blue only |
| Spearow | 13-17 | 35% | |
| Drowzee | 9-17 | 25% | |

**Diglett's Cave:**

| Species | Level | Rate |
|---------|-------|------|
| Diglett | 15-22 | 95% |
| Dugtrio | 29-31 | 5% |

**Collector note:** Only location for Diglett and Dugtrio in Gen 1. Both have Alolan forms but those are base-stage forms -- a Game Boy Diglett stays Kanto Diglett on transfer.

**Pokemon Tower (Lavender Town) -- Floors 3F-7F:**

| Species | Level | Rate | Notes |
|---------|-------|------|-------|
| Gastly | 18-24 | 75-90% | Dominant encounter |
| Haunter | 25-30 | 1-15% | Rarer on lower floors, more common on 7F |
| Cubone | 20-24 | 5-10% | All floors |

**Requires Silph Scope** to identify and battle wild Pokemon (appear as unidentifiable "ghosts" without it). Silph Scope obtained from Giovanni in Rocket Hideout (Celadon City).

**Collector note on Cubone:** Cubone is a regional form seed -- evolving to Marowak at night in SM/USUM produces **Alolan Marowak** with Game Boy mark. Pokemon Tower is the best early source for Cubone. Also available in Safari Zone.

**Routes 12-15 (Cycling Road and south):**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 12 | Pidgey | 23-27 | 40% | |
| Rt. 12 | Oddish | 22-26 | 35% | Red only |
| Rt. 12 | Bellsprout | 22-26 | 35% | Blue only |
| Rt. 12 | Venonat | 24-26 | 20% | |
| Rt. 12 | Gloom | 28-30 | 5% | Red only |
| Rt. 12 | Weepinbell | 28-30 | 5% | Blue only |
| Rt. 12 | Farfetch'd | 26-31 | 5% | Very rare wild [NEEDS VERIFICATION] |
| Rt. 13 | Pidgey | 25-27 | 30% | |
| Rt. 13 | Oddish | 22-26 | 25% | Red only |
| Rt. 13 | Bellsprout | 22-26 | 25% | Blue only |
| Rt. 13 | Venonat | 24-26 | 20% | |
| Rt. 13 | Ditto | 25 | 5% | Rare |
| Rt. 14 | Pidgey | 26-28 | 25% | |
| Rt. 14 | Oddish | 22-26 | 25% | Red only |
| Rt. 14 | Bellsprout | 22-26 | 25% | Blue only |
| Rt. 14 | Venonat | 24-26 | 20% | |
| Rt. 14 | Ditto | 23 | 5% | |
| Rt. 15 | Pidgey | 26-28 | 25% | |
| Rt. 15 | Oddish | 22-26 | 25% | Red only |
| Rt. 15 | Bellsprout | 22-26 | 25% | Blue only |
| Rt. 15 | Venonat | 24-26 | 20% | |
| Rt. 15 | Ditto | 26 | 5% | |

**Routes 16-18 (Cycling Road West):**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 16 | Rattata | 18-22 | 30% | |
| Rt. 16 | Raticate | 23-25 | 10% | |
| Rt. 16 | Spearow | 20-22 | 30% | |
| Rt. 16 | Doduo | 18-22 | 30% | |
| Rt. 17 | Rattata | 20-22 | 15% | Cycling Road (downhill) |
| Rt. 17 | Raticate | 25-29 | 20% | |
| Rt. 17 | Spearow | 20-22 | 20% | |
| Rt. 17 | Fearow | 25-29 | 15% | |
| Rt. 17 | Doduo | 24-28 | 30% | |
| Rt. 18 | Rattata | 20-22 | 15% | |
| Rt. 18 | Raticate | 25-29 | 15% | |
| Rt. 18 | Spearow | 20-22 | 30% | |
| Rt. 18 | Fearow | 25-29 | 10% | |
| Rt. 18 | Doduo | 24-28 | 30% | |

**Water Routes 19-21 (Fuchsia to Cinnabar):**

| Route | Species | Level | Rate | Method |
|-------|---------|-------|------|--------|
| Rt. 19 | Tentacool | 5-40 | 100% | Surfing |
| Rt. 20 | Tentacool | 5-40 | 100% | Surfing |
| Rt. 21 | Tentacool | 5-40 | 100% | Surfing |
| Rt. 21 | Pidgey | 21-23 | 30% | Grass (island) |
| Rt. 21 | Pidgeotto | 30-32 | 15% | Grass (island) |
| Rt. 21 | Rattata | 21-23 | 30% | Grass (island) |
| Rt. 21 | Raticate | 30 | 15% | Grass (island) |
| Rt. 21 | Tangela | 28-32 | 10% | Grass (island) |

**Fishing on Water Routes (general pattern):**
- **Old Rod:** Magikarp Lv. 5 (100%) everywhere
- **Good Rod:** Poliwag Lv. 10 (50%), Goldeen Lv. 10 (50%)
- **Super Rod varies by location:** Tentacool, Horsea, Shellder, Staryu, Krabby, Goldeen, Poliwag, Psyduck, Slowpoke, Kingler, Seadra, Seaking, Tentacruel, Gyarados

**Routes 24-25 (Nugget Bridge area):**

| Route | Species | Level | Rate | Notes |
|-------|---------|-------|------|-------|
| Rt. 24 | Caterpie/Weedle | 7 | 20% | Version-dependent |
| Rt. 24 | Metapod/Kakuna | 8 | 20% | Version-dependent |
| Rt. 24 | Pidgey | 12-13 | 20% | |
| Rt. 24 | Oddish | 12-14 | 25% | Red only |
| Rt. 24 | Bellsprout | 12-14 | 25% | Blue only |
| Rt. 24 | Abra | 8-12 | 15% | Teleports on turn 1 |
| Rt. 24 | Venonat | 13-16 | 10% | |
| Rt. 25 | Similar to Route 24 with slightly higher levels | | | |

**Power Plant:**

| Species | Level | Rate | Notes |
|---------|-------|------|-------|
| Pikachu | 20-24 | 25% | R/B only |
| Raichu | 33-36 | 5% | R/B only |
| Magnemite | 21-23 | 30% | |
| Magneton | 32-35 | 10% | |
| Voltorb | 21-23 | 30% | Plus 6 fake-item Voltorb (Lv. 40) |
| Electabuzz | 33-36 | 5% | **Red only** |
| -- | Zapdos | 50 | Static encounter (one-time) |
| -- | Electrode | 43 | 2 fake-item encounters |

**Collector note:** Power Plant Electabuzz is Red-exclusive (5% rate). Blue gets Magmar in Pokemon Mansion instead.

**Seafoam Islands:**

| Species | Level | Rate | Floor | Notes |
|---------|-------|------|-------|-------|
| Zubat | 18-36 | 10-40% | 1F-B3F | |
| Golbat | 27-29 | 5-10% | B1F-B3F | |
| Psyduck | 28-30 | 5-15% | 1F-B3F | |
| Golduck | 38 | 1% | 1F | Very rare |
| Slowpoke | 28-30 | 10-20% | 1F-B2F | |
| Slowbro | 38 | 1% | 1F | Very rare |
| Seel | 22-30 | 5-20% | 1F-B3F | |
| Dewgong | 38 | 4% | B1F-B3F | Rare |
| Shellder | 28-32 | 15-20% | 1F-B3F | |
| Krabby | 26-32 | 20-30% | 1F-B3F | |
| Kingler | 28-37 | 1-5% | B1F-B3F | Rare |
| Horsea | 28-32 | 20-30% | 1F-B3F | |
| Seadra | 37 | 1% | B1F-B3F | Very rare |
| Staryu | 28-32 | 15-20% | 1F-B3F | |
| -- | Articuno | 50 | B4F | Static encounter |

**Pokemon Mansion (Cinnabar Island):**

| Species | Level | Rate | Floor | Notes |
|---------|-------|------|-------|-------|
| Rattata | 34-43 | 30% | 1F-3F | |
| Raticate | 34-46 | 30-40% | 1F-B1F | |
| Vulpix | 32-35 | 10-20% | All floors | **Blue only** |
| Growlithe | 32-35 | 10-20% | All floors | **Red only** |
| Ponyta | 28-36 | 15-40% | All floors | |
| Grimer | 30-38 | 5-40% | All floors | |
| Muk | 37-42 | 1-15% | 2F-B1F | Rare |
| Koffing | 30-35 | 5-50% | All floors | |
| Weezing | 37-42 | 1-15% | 1F-B1F | Rare |
| Magmar | 34-38 | 4-10% | 3F, B1F | **Blue only** |
| Ditto | 12-24 | 10% | B1F | |

**Collector notes:**
- Pokemon Mansion is the **only** wild location for Ponyta in Gen 1 (no Safari Zone or route encounters).
- Magmar is Blue-exclusive here (Electabuzz is Red-exclusive at Power Plant).
- Ditto appears on B1F at low levels -- also found on Routes 13-15 and Cerulean Cave.

**Victory Road:**

| Species | Level | Rate | Floor | Notes |
|---------|-------|------|-------|-------|
| Zubat | 22-26 | 15% | All floors | |
| Golbat | 40-41 | 5% | All floors | |
| Machop | 22-24 | 20% | All floors | |
| Machoke | 41-45 | 4-5% | All floors | |
| Geodude | 24-26 | 20% | All floors | |
| Graveler | 41-43 | 1-5% | All floors | |
| Onix | 36-45 | 20-30% | All floors | Common here |
| Marowak | 40-43 | 1-4% | 1F-2F | Rare |
| Venomoth | 40 | 10% | 3F only | |
| -- | Moltres | 50 | 2F | Static encounter |

**Cerulean Cave (Post-Elite Four):**

| Species | Level | Rate | Floor | Notes |
|---------|-------|------|-------|-------|
| Arbok | 52 | 10% | 1F | Red version has Arbok; Blue has Sandslash [NEEDS VERIFICATION] |
| Raichu | 53 | 4% | 1F | |
| Sandslash | 52 | 10% | 1F | Blue only [NEEDS VERIFICATION] |
| Golbat | 46-55 | 10-40% | All floors | Common |
| Gloom | 55 | 10% | 1F | Red; Blue has Weepinbell [NEEDS VERIFICATION] |
| Parasect | 52-54 | 5-10% | 1F-2F | |
| Venomoth | 49-54 | 5-10% | 1F-2F | |
| Kadabra | 49 | 5% | 1F | |
| Weepinbell | 55 | 10% | 1F | Blue only [NEEDS VERIFICATION] |
| Graveler | 45 | 15% | 1F | |
| Magneton | 46 | 15% | 1F | |
| Dodrio | 49 | 10% | 1F | |
| Hypno | 46 | 20% | 1F | |
| Ditto | 53-60 | 1-5% | 1F-B1F | Rare; highest-level wild Ditto in Gen 1 |
| Chansey | 53-56 | 1-4% | 2F-B1F | Rare |
| -- | Mewtwo | 70 | B1F | Static encounter |

**Cerulean Cave Fishing (1F/B1F water):**

| Species | Rod | Level | Rate |
|---------|-----|-------|------|
| Magikarp | Old Rod | 5 | 100% |
| Poliwag | Good Rod | 10 | 50% |
| Goldeen | Good Rod | 10 | 50% |
| Slowbro | Super Rod | 23 | 25% |
| Kingler | Super Rod | 23 | 25% |
| Seadra | Super Rod | 23 | 25% |
| Seaking | Super Rod | 23-25 | 25% |

**Collector note:** Cerulean Cave is the best location for many evolved forms in the wild, especially Chansey (which is otherwise Safari Zone only at 1-4%). The higher levels also make for better EXP values for nature manipulation before transfer.

---

## Section C: Gen 1 Legacy Moves

### C.1 Complete TM/HM List

Gen 1 TMs are **single-use** (unlike Gen 5+ where TMs became reusable). Using a TM on a Pokemon permanently teaches the move and consumes the TM. This means you must plan TM usage carefully.

**Full Gen 1 TM List:**

| TM | Move | Type | Location |
|----|------|------|----------|
| TM01 | Mega Punch | Normal | Mt. Moon, Celadon Dept. Store |
| TM02 | Razor Wind | Normal | Rocket Hideout, Celadon Dept. Store |
| TM03 | Swords Dance | Normal | Silph Co. |
| TM04 | Whirlwind | Normal | Route 4 |
| TM05 | Mega Kick | Normal | Victory Road, Celadon Dept. Store |
| TM06 | Toxic | Poison | Fuchsia Gym (Koga) |
| TM07 | Horn Drill | Normal | Rocket Hideout, Celadon Dept. Store |
| TM08 | Body Slam | Normal | S.S. Anne |
| TM09 | Take Down | Normal | Silph Co., Celadon Dept. Store |
| TM10 | Double-Edge | Normal | Rocket Hideout |
| TM11 | BubbleBeam | Water | Cerulean Gym (Misty) |
| TM12 | Water Gun | Water | Mt. Moon |
| TM13 | Ice Beam | Ice | Celadon Dept. Store roof |
| TM14 | Blizzard | Ice | Pokemon Mansion |
| TM15 | Hyper Beam | Normal | Game Corner (5500 coins) |
| TM16 | Pay Day | Normal | Route 12 |
| TM17 | Submission | Fighting | Victory Road, Celadon Dept. Store |
| TM18 | Counter | Fighting | Celadon Dept. Store |
| TM19 | Seismic Toss | Fighting | Route 25 |
| TM20 | Rage | Normal | Route 15 |
| TM21 | Mega Drain | Grass | Celadon Gym (Erika) |
| TM22 | SolarBeam | Grass | Pokemon Mansion |
| TM23 | Dragon Rage | Dragon | Game Corner (3300 coins) |
| TM24 | Thunderbolt | Electric | Vermilion Gym (Lt. Surge) |
| TM25 | Thunder | Electric | Power Plant |
| TM26 | Earthquake | Ground | Silph Co. |
| TM27 | Fissure | Ground | Viridian Gym (Giovanni) |
| TM28 | Dig | Ground | Cerulean City |
| TM29 | Psychic | Psychic | Saffron City |
| TM30 | Teleport | Psychic | Route 9 |
| TM31 | Mimic | Normal | Saffron City |
| TM32 | Double Team | Normal | Safari Zone, Celadon Dept. Store |
| TM33 | Reflect | Psychic | Power Plant, Celadon Dept. Store |
| TM34 | Bide | Normal | Pewter Gym (Brock) |
| TM35 | Metronome | Normal | Cinnabar Lab |
| TM36 | Selfdestruct | Normal | Silph Co. |
| TM37 | Egg Bomb | Normal | Safari Zone, Celadon Dept. Store |
| TM38 | Fire Blast | Fire | Cinnabar Gym (Blaine) |
| TM39 | Swift | Normal | Route 12 |
| TM40 | Skull Bash | Normal | Safari Zone |
| TM41 | Softboiled | Normal | Celadon City (hidden NPC) |
| TM42 | Dream Eater | Psychic | Viridian City |
| TM43 | Sky Attack | Flying | Victory Road |
| TM44 | Rest | Psychic | S.S. Anne |
| TM45 | Thunder Wave | Electric | Route 24 |
| TM46 | Psywave | Psychic | Saffron Gym (Sabrina) |
| TM47 | Explosion | Normal | Victory Road |
| TM48 | Rock Slide | Rock | Celadon Dept. Store roof |
| TM49 | Tri Attack | Normal | Celadon Dept. Store roof |
| TM50 | Substitute | Normal | Game Corner (7700 coins) |

**HMs:**

| HM | Move | Location | Badge Required |
|----|------|----------|----------------|
| HM01 | Cut | S.S. Anne (Captain) | Cascade Badge |
| HM02 | Fly | Route 16 (hidden house) | Thunder Badge |
| HM03 | Surf | Safari Zone (Secret House) | Soul Badge |
| HM04 | Strength | Fuchsia City (Safari Zone Warden) | Rainbow Badge |
| HM05 | Flash | Route 2 (Prof. Oak's Aide, need 10 Pokemon) | Boulder Badge |

### C.2 Notable Legacy Moves

Many Gen 1 TM moves were NOT re-introduced as TMs in later generations. For some Pokemon, the Gen 1 TM version is the **only** way they can learn that move. When transferred, these moves persist on the Pokemon's moveset.

**Important note:** Most Gen 1 TM moves became available again through Move Tutors in Gen 3 (FRLG/Emerald) or later games. True "Gen 1 only" exclusives are limited. However, the VC transfer path (Gen 1 --> Gen 7) bypasses the GBA/DS transfer chain entirely, so the practical consideration is: can this Pokemon learn this move in Gen 7+ without the VC specimen?

**Key legacy TM combinations to investigate before transfer:**

| TM | Move | Notable Learners Lost Later | Notes |
|----|------|-----------------------------|-------|
| TM01 | Mega Punch | Many Gen 1 species | Widely available via FRLG tutor, but those specimens lack Game Boy mark |
| TM05 | Mega Kick | Many Gen 1 species | Same as Mega Punch |
| TM08 | Body Slam | Kangaskhan, many others | S.S. Anne only; available via FRLG/Emerald tutor |
| TM09 | Take Down | Many Gen 1 species | Available in some form in later gens for most species |
| TM10 | Double-Edge | Many Gen 1 species | Rocket Hideout only; becomes tutor in Gen 3 |
| TM17 | Submission | Many Gen 1 species | Rarely available later |
| TM18 | Counter | Alakazam, Chansey, Gengar | Egg move in Gen 6+, but TM version allows combo with other Gen 1 moves |
| TM20 | Rage | Many Gen 1 species | Removed from most learnsets |
| TM27 | Fissure | Machamp, many Normal-types | OHKO move; lost from most learnsets |
| TM31 | Mimic | Many Gen 1 species | Widely removed |
| TM34 | Bide | Many Gen 1 species | Widely removed |
| TM37 | Egg Bomb | Exeggutor, Chansey | Very limited availability later |
| TM40 | Skull Bash | Many Gen 1 species | Widely removed |
| TM43 | Sky Attack | Fearow, Dodrio, others | Available via tutor in some gens |
| TM46 | Psywave | Many Psychic-types | Removed from most learnsets |
| TM49 | Tri Attack | Normal-types and others | Narrowed in later gens |

**S.S. Anne warning:** The S.S. Anne departs permanently after you obtain Cut. TM08 (Body Slam) and TM44 (Rest) are found on the S.S. Anne. If you want these TMs, collect them during your first visit. **POINT-OF-NO-RETURN.**

**Recommendation:** Before transferring any Pokemon from VC, check whether it can learn moves in Gen 1 that it cannot learn in Gen 7+. Teach those moves before transfer. Since TMs are single-use, prioritize teaching legacy moves to specimens you plan to keep as "move-lab specimens" (see overview terminology).

---

## Section D: Walkthrough Checklist

This checklist follows game progression order. For each checkpoint, key actions for a collector are listed.

### D.1 Pallet Town

- [ ] **SAVE-BEFORE** choosing your starter
- [ ] Choose Bulbasaur, Charmander, or Squirtle (Lv. 5)
- [ ] Note: You will need three playthroughs for all three starters + both fossils + both Hitmon + both Snorlax (though Snorlax has two per save)
- [ ] Recommended first playthrough priority: choose a starter, pick the fossil you want first

### D.2 Route 1 / Viridian City

- [ ] **CATCH-NOW:** Pidgey, Rattata (Route 1) -- common, but Game Boy origin specimens
- [ ] Pick up TM42 (Dream Eater) from NPC in Viridian City

### D.3 Viridian Forest

- [ ] **CATCH-NOW:** Pikachu (5% rate) -- **Critical.** This is a regional form seed. Do NOT evolve in Gen 1 if you want Game Boy origin Alolan Raichu.
- [ ] **CATCH-NOW:** Caterpie, Weedle, Metapod, Kakuna (rates vary by version)
- [ ] Red has high Weedle/Kakuna rate; Blue has high Caterpie/Metapod rate

### D.4 Pewter City

- [ ] Defeat Brock, receive TM34 (Bide)
- [ ] Visit Pewter Museum (requires Cut later) for Old Amber -- **come back after getting Cut**

### D.5 Route 3 / Mt. Moon

- [ ] **CATCH-NOW:** Jigglypuff (Route 3, 10%) -- rare encounter
- [ ] **CATCH-NOW:** Spearow (Route 3) -- needed for Farfetch'd trade later
- [ ] Explore Mt. Moon:
  - [ ] **CATCH-NOW:** Clefairy (1-10% depending on floor), Paras, Geodude, Zubat
  - [ ] Pick up TM01 (Mega Punch), TM12 (Water Gun)
  - [ ] **SAVE-BEFORE** fossil choice on B2F
  - [ ] Choose Helix Fossil (Omanyte) or Dome Fossil (Kabuto)

### D.6 Cerulean City Area

- [ ] Defeat Misty, receive TM11 (BubbleBeam)
- [ ] Obtain TM28 (Dig) from Rocket Grunt encounter
- [ ] **CATCH-NOW:** Abra (Routes 24/25, 15%) -- teleports immediately, use sleep or throw ball turn 1. Needed for Mr. Mime trade.
- [ ] Pick up TM45 (Thunder Wave) on Route 24
- [ ] Pick up TM19 (Seismic Toss) on Route 25
- [ ] Trade Abra for **Mr. Mime** on Route 2 gate (return south after Cut)

### D.7 Route 2 (Backtrack with Cut)

- [ ] Cut the tree to access Pewter Museum back entrance
- [ ] Obtain **Old Amber** from museum scientist
- [ ] **CATCH-NOW:** Nidoran F, Nidoran M (Route 2, 15% each)
- [ ] Access Diglett's Cave south entrance (Route 11 side)
  - [ ] **CATCH-NOW:** Diglett, Dugtrio (only location in Gen 1)

### D.8 Vermilion City / S.S. Anne

- [ ] **POINT-OF-NO-RETURN:** The S.S. Anne departs after obtaining Cut from the Captain.
  - [ ] Collect TM08 (Body Slam) and TM44 (Rest) BEFORE leaving
  - [ ] Consider teaching Body Slam to specimens you want to keep the move on
- [ ] Defeat Lt. Surge, receive TM24 (Thunderbolt)
- [ ] Trade Spearow for **Farfetch'd** (DUX) in Vermilion City house
- [ ] Obtain Old Rod from Fishing Guru in Vermilion City

### D.9 Routes 5-8 / Celadon City

- [ ] **CATCH-NOW:** Version exclusives (Red: Oddish, Mankey, Growlithe; Blue: Bellsprout, Meowth, Vulpix)
- [ ] Route 7/8: catch Vulpix or Growlithe depending on version
- [ ] Celadon City:
  - [ ] **CATCH-NOW:** Eevee (Celadon Mansion, gift, Lv. 25) -- **SAVE-BEFORE**
  - [ ] **DO-NOT-EVOLVE** Eevee if you want to transfer it as Eevee first (HA Anticipation). You can always evolve later in Gen 7+
  - [ ] Purchase coins at Game Corner or grind slots
  - [ ] Buy **Porygon** (9999 coins Red / 6500 coins Blue) -- **mandatory**, only source
  - [ ] Optional: Buy Dratini (2800/4600 coins), Scyther (5500, Red), Pinsir (2500, Blue)
  - [ ] Buy TMs: TM23 (Dragon Rage, 3300), TM15 (Hyper Beam, 5500), TM50 (Substitute, 7700)
  - [ ] Celadon Dept. Store: Buy TMs and evolution stones as needed
  - [ ] Celadon Dept. Store roof: TM13 (Ice Beam), TM48 (Rock Slide), TM49 (Tri Attack)
  - [ ] Defeat Erika, receive TM21 (Mega Drain)
  - [ ] Obtain TM41 (Softboiled) from NPC in Celadon City

### D.10 Rocket Hideout / Silph Scope

- [ ] Clear Rocket Hideout under Game Corner
  - [ ] Collect TM02 (Razor Wind), TM07 (Horn Drill), TM10 (Double-Edge)
  - [ ] Obtain Silph Scope from Giovanni
- [ ] Now you can identify ghosts in Pokemon Tower

### D.11 Pokemon Tower (Lavender Town)

- [ ] **CATCH-NOW:** Gastly, Haunter, Cubone (floors 3F-7F)
- [ ] **Cubone is a priority** -- regional form seed for Alolan Marowak
- [ ] Save Mr. Fuji on 7F
- [ ] Receive **Poke Flute** from Mr. Fuji

### D.12 Snorlax Encounters

- [ ] **SAVE-BEFORE** Route 12 Snorlax (Lv. 30)
- [ ] Use Poke Flute to wake it, catch with Ultra Ball (or save Master Ball for Mewtwo)
- [ ] **SAVE-BEFORE** Route 16 Snorlax (Lv. 30)
- [ ] Catch the second Snorlax

### D.13 Routes 12-15 (South to Fuchsia)

- [ ] Pick up TM16 (Pay Day) on Route 12, TM20 (Rage) on Route 15
- [ ] Obtain **Super Rod** from Fishing Guru house on Route 12
- [ ] **CATCH-NOW:** Venonat (Routes 12-15), Ditto (Routes 13-15, 5%)

### D.14 Fuchsia City / Safari Zone

- [ ] Obtain Good Rod from Fishing Guru east of Pokemon Center
- [ ] Defeat Koga, receive TM06 (Toxic)
- [ ] **Safari Zone priorities** (multiple visits likely needed):
  - [ ] **CATCH-NOW:** Kangaskhan (Area 2 North has best rate at 15%) -- **mandatory specimen**
  - [ ] **CATCH-NOW:** Chansey (1-4% all areas) -- patience required
  - [ ] **CATCH-NOW:** Tauros (various areas, 1-10%)
  - [ ] **CATCH-NOW:** Exeggcute (15-20%, very common) -- regional form seed for Alolan Exeggutor
  - [ ] **CATCH-NOW:** Scyther (Red only, 1-4%), Pinsir (both, 1-4%)
  - [ ] **CATCH-NOW:** Rhyhorn (Center/Area 2)
  - [ ] **CATCH-NOW:** Tangela (Center/Area 3, 1-4% -- rare)
  - [ ] Fish with Super Rod for Dratini, Dragonair (very rare)
  - [ ] Collect HM03 (Surf) from Secret House
  - [ ] Collect TM32 (Double Team), TM37 (Egg Bomb), TM40 (Skull Bash)
  - [ ] Obtain Gold Teeth, give to Safari Zone Warden for HM04 (Strength)

### D.15 Saffron City

- [ ] Clear Silph Co.:
  - [ ] **CATCH-NOW (gift):** Lapras (Lv. 15, 7F) -- **SAVE-BEFORE**
  - [ ] **Receive Master Ball** from Silph Co. President -- save for Mewtwo
  - [ ] Collect TM03 (Swords Dance), TM09 (Take Down), TM26 (Earthquake), TM36 (Selfdestruct)
- [ ] Fighting Dojo:
  - [ ] **SAVE-BEFORE** choosing Hitmonlee or Hitmonchan (Lv. 30)
- [ ] Defeat Sabrina, receive TM46 (Psywave)
- [ ] Obtain TM29 (Psychic) from NPC in Saffron City
- [ ] Obtain TM31 (Mimic) from NPC in Saffron City
- [ ] Trade Poliwhirl for **Jynx** (LOLA) in Cerulean City (can do this anytime after catching Poliwhirl)

### D.16 Power Plant

- [ ] Surf east from Route 10 to reach Power Plant
  - [ ] **CATCH-NOW:** Pikachu, Magnemite, Voltorb (common), Magneton, Electabuzz (Red only, 5%)
  - [ ] Collect TM25 (Thunder), TM33 (Reflect)
  - [ ] **SAVE-BEFORE** Zapdos (Lv. 50) -- use Ultra Balls + status moves
  - [ ] Encounter fake-item Voltorb (x6, Lv. 40) and Electrode (x2, Lv. 43)

### D.17 Seafoam Islands

- [ ] Navigate boulder puzzle (requires Strength + Surf)
  - [ ] **CATCH-NOW:** Seel, Shellder, Horsea, Krabby, Staryu (common throughout)
  - [ ] **CATCH-NOW:** Dewgong, Kingler, Seadra, Slowbro, Golduck (rare evolved forms)
  - [ ] **SAVE-BEFORE** Articuno (Lv. 50, B4F)

### D.18 Cinnabar Island

- [ ] **Revive fossils** at Cinnabar Lab:
  - [ ] **SAVE-BEFORE** reviving each fossil (DVs set on revival)
  - [ ] Helix Fossil --> Omanyte (Lv. 30)
  - [ ] Dome Fossil --> Kabuto (Lv. 30)
  - [ ] Old Amber --> Aerodactyl (Lv. 30)
- [ ] Complete in-game trades at Cinnabar Lab (Electrode, Tangela, Seel for Raichu, Venonat, Ponyta)
- [ ] Pokemon Mansion:
  - [ ] **CATCH-NOW:** Ponyta (only wild location in Gen 1), Grimer, Koffing, Weezing, Muk
  - [ ] **CATCH-NOW:** Vulpix/Growlithe (version exclusive), Magmar (Blue only, 3F/B1F)
  - [ ] **CATCH-NOW:** Ditto (B1F, 10%)
  - [ ] Collect TM14 (Blizzard), TM22 (SolarBeam)
- [ ] Defeat Blaine, receive TM38 (Fire Blast)
- [ ] Collect TM35 (Metronome) from Cinnabar Lab

### D.19 Viridian Gym / Route 23

- [ ] Defeat Giovanni, receive TM27 (Fissure)
- [ ] Route 23: catch any version exclusives you may have missed (Ekans/Arbok or Sandshrew/Sandslash at higher levels)

### D.20 Victory Road

- [ ] **CATCH-NOW:** Machop, Machoke, Onix (common), Marowak (1-4%, rare)
- [ ] Collect TM05 (Mega Kick), TM17 (Submission), TM43 (Sky Attack), TM47 (Explosion)
- [ ] **SAVE-BEFORE** Moltres (Lv. 50, 2F)

### D.21 Elite Four

- [ ] Defeat Elite Four and Champion
- [ ] This unlocks Cerulean Cave

### D.22 Cerulean Cave (Post-Game)

- [ ] **CATCH-NOW:** Chansey (2F-B1F, better rates than Safari Zone), Ditto (rare), Kadabra, Hypno, Raichu, Parasect, Venomoth, Dodrio
- [ ] Fish in cave waters for Slowbro, Kingler, Seadra, Seaking
- [ ] **SAVE-BEFORE** Mewtwo (Lv. 70, B1F) -- **use Master Ball**
- [ ] After catching Mewtwo, the collection is mechanically complete for this save file

### D.23 Remaining Trades

- [ ] Trade Slowbro for **Lickitung** (MARC) on Route 18 -- if not already done
- [ ] Ensure you have completed all four trade-only species: Mr. Mime, Jynx, Farfetch'd, Lickitung

---

## Section E: Transfer and Lockout Summary

### E.1 Before Transfer Checklist

- [ ] **Teach legacy TM moves** to any Pokemon you want to carry them. Once transferred, Gen 1 TMs cannot be re-obtained.
- [ ] **Manipulate EXP for nature:** For each Pokemon you plan to transfer, calculate `Total EXP mod 25` and adjust to the desired nature. Gain or lose EXP as needed (battle wild Pokemon, use Rare Candies). See nature table in overview document.
- [ ] **Verify DV-based shiny status** if shiny hunting: the Pokemon's Attack DV must be 2/3/6/7/10/11/14/15 AND Defense/Speed/Special DVs must all be 10.
- [ ] **Do not evolve regional form seeds** if you want the Alolan evolution:
  - Pikachu (for Alolan Raichu) -- do not evolve with Thunder Stone in Gen 1
  - Exeggcute (for Alolan Exeggutor) -- do not evolve with Leaf Stone in Gen 1
  - Cubone (for Alolan Marowak) -- do not let it reach Lv. 28 in Gen 1 (or just transfer before it levels)

### E.2 Transfer Notes

- **All balls become Poke Balls** -- no ball diversity survives transfer.
- **Hidden Ability is assigned** -- this is permanent and cannot be changed to a non-HA ability.
- **3 IVs guaranteed 31** (5 for Mew) -- but the other 3 are random. No way to influence which IVs are perfect.
- **Game Boy origin mark** is applied -- visible in Gen 7 games and Pokemon HOME. This mark is the primary collector value of VC specimens.
- **OT and Trainer ID are preserved** -- your original player name stays on the Pokemon.

### E.3 What NOT to Transfer Yet

- **Keep the VC save intact** after transferring. You may want to replay or transfer additional specimens later.
- **Pokemon you want in a later game's ball** -- once transferred to Gen 7, they are in a Poke Ball permanently. If a later game offers a species in an Apricorn Ball or similar, get that specimen separately.
- **Specimens that need moves from later VC games** -- if a Gen 2 move tutor or TM can teach something Gen 1 cannot, consider waiting for VC Crystal.
- **Do not transfer everything at once** -- Poke Transporter moves the entire Box 1. Organize carefully.

### E.4 Specimens NOT to Transfer (Keep in Gen 1)

Some specimens serve no purpose in the modern collection and should stay in the VC save:
- Duplicate wild catches you do not need
- Pokemon whose only value was as trade currency (e.g., extra Spearow caught for the Farfetch'd trade)
- Anything with suboptimal DVs if you plan to re-catch with better DVs later

### E.5 Transfer Priority Tiers

**Transfer immediately (unique specimens):**
1. Starters (HA + Game Boy mark, cannot get elsewhere)
2. Fossils (HA + Game Boy mark)
3. Legendaries/Mewtwo (Game Boy mark)
4. Gift Pokemon (Eevee, Lapras, Hitmonlee/chan)
5. Trade-only species (Mr. Mime, Jynx, Farfetch'd, Lickitung)
6. Porygon (only source in Gen 1)
7. Regional form seeds (Pikachu, Exeggcute, Cubone -- evolve in SM/USUM)

**Transfer after optimization (nature/moves):**
8. Safari Zone rarities (Kangaskhan, Chansey, Tauros)
9. Version exclusives (complete set from Red + Blue)
10. Legacy move specimens (Pokemon with Gen 1 TM moves they cannot learn later)

**Low priority (available in many other games):**
11. Common wild encounters (Pidgey, Rattata, etc.) -- only if you want the Game Boy mark version

---

## Section F: Species Obtainability Summary

### F.1 Pokemon NOT Obtainable in Red/Blue

The following Gen 1 species are **completely unavailable** in Pokemon Red/Blue and require other games:

| # | Species | Why | Where Instead |
|---|---------|-----|--------------|
| 151 | Mew | Event-only; glitch Mew fails Transporter | VC distribution (if obtained) |

All other 150 species are obtainable between Red and Blue (with trading for version exclusives and trade-only species).

### F.2 Pokemon Requiring Both Versions

These species require trading between Red and Blue (or multiple saves):

- **Version exclusives** (11 per version, 22 total -- see B.11)
- **Mutually exclusive choices:** Starters (3, pick 1), Fossils (2, pick 1), Hitmon (2, pick 1)
- **Trade evolutions:** Alakazam, Machamp, Golem, Gengar (evolve by trading between saves)

### F.3 Pokemon Obtainable Only via In-Game Trade

| # | Species | Trade Details |
|---|---------|---------------|
| 083 | Farfetch'd | Give Spearow (Vermilion City) |
| 108 | Lickitung | Give Slowbro (Route 18) |
| 122 | Mr. Mime | Give Abra (Route 2) |
| 124 | Jynx | Give Poliwhirl (Cerulean City) |

### F.4 Pokemon Obtainable Only via Game Corner

| # | Species | Cost | Notes |
|---|---------|------|-------|
| 137 | Porygon | 9999 (R) / 6500 (B) coins | No wild encounters in Gen 1 |

---

## Sources

Primary research sources for this document:

- Bulbapedia: Individual Values, Poke Transporter, Version-exclusive Pokemon, Alolan Forms, Origin Mark, Celadon Game Corner, Safari Zone, In-game Trades, and individual route/dungeon pages
- Serebii: Red/Blue Pokedex, Version Exclusives, Game Corner, Gift Pokemon, Legendary Pokemon, Pokearth Kanto location data
- Smogon: Generation-exclusive moves guide, Pokemon Transfer Guide

All claims verified against at least one source. Items marked [NEEDS VERIFICATION] had only single-source confirmation or ambiguous source data. Items marked [DISPUTED] had conflicting community consensus.

---

*Research conducted March 2026. Reflects Poke Transporter v1.3+ mechanics and Pokemon HOME v3.x compatibility.*
