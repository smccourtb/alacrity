# VC Gold/Silver Collector Research

Virtual Console Pokemon Gold and Silver (3DS eShop, 2017) are the **most mechanically complex single-game documents** in this research series. Gen 2 introduced **shininess as an in-game mechanic**, **breeding**, **time-of-day encounters**, **Apricorn Balls**, and an entire **Kanto post-game** -- all of which fundamentally change what a collector can obtain from a single save file. Specimens carry the **Game Boy origin mark** on transfer, same as VC Gen 1.

For Gen 1 DV mechanics, transfer overview, and nature manipulation, see [01-vc-red-blue.md](01-vc-red-blue.md). This document focuses on what Gold/Silver adds.

---

## Section A: Game-Wide Mechanics

### A.1 Shininess (DV-Based)

Generation II is the **first generation where shininess exists in-game**. A Pokemon's DVs determine shininess directly:

**Shiny DV Requirements (all must be met):**
| DV | Required Value |
|----|---------------|
| Attack | 2, 3, 6, 7, 10, 11, 14, or 15 (any of these 8 values) |
| Defense | Exactly 10 |
| Speed | Exactly 10 |
| Special | Exactly 10 |

**HP DV** is derived from the other four. A shiny Pokemon's HP DV will always be 0 or 8.

**Wild Shiny Odds:** 1/8192 (8/16 x 1/16 x 1/16 x 1/16 = 8/65536).

**Hidden Power constraint:** Shiny Pokemon in Gen 2 can only have Hidden Power type of Grass or Dragon, with power of either 49 or 69.

**CRITICAL -- Grass/Cave/Surf shiny impossibility:** According to Bulbapedia, Pokemon "encountered in those games in tall grass, on cave tiles, or by Surfing on water cannot have a set of DVs that would allow them to be Shiny in Generation II." This is due to a quirk in the Gen 2 RNG where the DV generation for these encounter types cannot produce the exact combination needed. **Only fishing encounters and gift/event Pokemon maintain the full 1/8192 shiny chance in Gen 2.** [NEEDS VERIFICATION: This is sourced from Bulbapedia's Shiny Pokemon article Generation II section. Some sources dispute whether this affects Gold/Silver or only applies to specific encounter methods. The exact RNG behavior is complex.]

**Shiny + Gender Interaction:**

Gender in Gen 2 is determined by the Attack DV (same formula as Gen 1 transfer):

| Gender Ratio | Female requires Attack DV | Shiny requires Attack DV 2+ | Shiny Female? |
|-------------|--------------------------|----------------------------|---------------|
| 87.5% male (7:1) | 0-1 | 2, 3, 6, 7, 10, 11, 14, 15 | **IMPOSSIBLE** |
| 75% male (3:1) | 0-3 | 2, 3 overlap with female range | **Possible** (Attack 2 or 3) |
| 50/50 (1:1) | 0-7 | 2, 3, 6, 7 overlap | **Possible** (Attack 2, 3, 6, or 7) |
| 25% male (1:3) | 0-11 | Full overlap | **Possible** (all shiny Attack values) |
| Male-only | N/A | N/A | N/A (no females exist) |
| Female-only | Always female | N/A | **Possible** |
| Genderless | N/A | N/A | N/A |

**87.5% male species where shiny + female is impossible:**
Bulbasaur, Charmander, Squirtle lines; Eevee and all eeveelutions; Omanyte, Kabuto, Aerodactyl, Snorlax, Dratini lines; and Hitmonlee/Hitmonchan (male-only, so no female at all).

**Unown restriction:** Only Unown forms I and V can be shiny in Gen 2.

### A.2 Lake of Rage Shiny Gyarados

The **Red Gyarados** at Lake of Rage is the first guaranteed shiny encounter in any Pokemon game:

| Property | Value |
|----------|-------|
| Species | Gyarados (#130) |
| Level | 30 |
| Gender | Always male |
| DVs | HP 0, Attack 14, Defense 10, Speed 10, Special 10 |
| Shiny | Yes (guaranteed by fixed DVs) |
| Moves | Thrash, Bite, Dragon Rage, Leer |
| Ball | Player's choice |

**Collector significance:** This is the **earliest obtainable guaranteed shiny** in any mainline game. Its fixed DVs mean Attack 14 (shiny-eligible), and all other DVs at 10 (shiny requirements met). The HP DV of 0 is derived from the other DVs.

**Breeding parent value:** Gyarados is in the **Water 2 + Dragon** egg groups. As a shiny with known DVs, it passes Defense 10 and Special 10 to offspring -- two of the three fixed requirements for shininess. See Section C for the full breeding analysis.

### A.3 Breeding

Breeding is the **most important new mechanic** Gen 2 introduces for collectors. The Day Care on **Route 34** (south of Goldenrod City) accepts two Pokemon. If compatible, they produce Eggs.

#### A.3.1 Compatibility

Two Pokemon can breed if:
1. They share at least one Egg Group
2. They are opposite genders (or one is Ditto)
3. They are NOT both in the "No Eggs Discovered" group
4. Their Defense DVs are NOT identical AND their Special DVs do NOT match or differ by exactly 8 (this "sibling check" prevents closely related Pokemon from breeding)

**Compatibility tiers (egg generation chance per 256 steps):**

| Condition | Message | Egg chance |
|-----------|---------|-----------|
| Same species, different OT | "It appears to care for [name]" | 31.25% |
| Same species, same OT | "It's friendly with [name]" | 15.63% |
| Different species, different OT | "It's friendly with [name]" | 11.72% |
| Different species, same OT | "It shows interest in [name]" | 3.91% |
| Incompatible | "It has no interest in [name]" | 0% |

**Key rule:** Two shiny Pokemon can NEVER breed in Gen 2, because shiny requires Defense DV = 10 and Special DV = 10 for both parents, which triggers the sibling check (identical Defense and Special DVs).

#### A.3.2 DV Inheritance

Gen 2 DV inheritance is **significantly different** from later generations:

| DV | Inheritance Rule |
|----|-----------------|
| Defense | Inherited directly from the **opposite-gender parent** (if breeding with Ditto, inherited from Ditto) |
| Special | 50% chance of matching the opposite-gender parent; 50% chance of differing by exactly 8 (wraps: 0-7 gets +8, 8-15 gets -8) |
| Attack | Determined randomly (0-15) |
| Speed | Determined randomly (0-15) |
| HP | Derived from the other four DVs (standard formula) |

**NOTE:** Several sources conflict on the exact inheritance mechanics. The above represents the Bulbapedia "Pokemon breeding" Generation II section. Some sources state Attack has a 50% chance of inheriting from the opposite-gender parent +/- 1. [DISPUTED: Bulbapedia's current text describes Defense as inherited from the opposite-gender parent and Special with 50% chance identical / 50% +/- 8. Attack and Speed are listed as random. Cross-reference with disassembly sources if precision matters for shiny breeding calculations.]

#### A.3.3 Shiny Breeding (~1/64 Odds)

This is the **highest shiny rate achievable through breeding in any generation**:

When a shiny parent breeds with a non-shiny Ditto (or compatible partner), the offspring inherits Defense DV = 10 (from the shiny parent) and has a 50% chance of Special DV = 10 (matching parent) or Special DV = 2 (10 - 8, which does NOT meet shiny requirements). If Special = 10, then:
- Defense = 10 (inherited, locked)
- Special = 10 (50% chance)
- Attack = shiny-eligible (8/16 = 50% chance, random)
- Speed = 10 (1/16 chance, random)

Combined probability: 1/2 (Special) x 1/2 (Attack) x 1/16 (Speed) = 1/64.

**Practical application:** The Lake of Rage Gyarados (shiny, DVs known) is an excellent breeding parent for species in the Water 2 or Dragon egg groups. Any offspring from a shiny parent has ~1/64 chance of also being shiny.

#### A.3.4 Ditto Breeding

**Ditto** can breed with any breedable Pokemon regardless of egg group. In Gold/Silver, Ditto is found on:
- **Route 34** (4% encounter rate)
- **Route 35** (4% encounter rate)

When breeding with Ditto, the non-Ditto parent's species determines the offspring species. Ditto acts as the opposite-gender parent for DV inheritance purposes.

**Collector significance:** Ditto enables breeding for species whose egg group partners are unavailable in Gold/Silver. This is critical for isolated egg groups like Mineral (Geodude, Magnemite, Voltorb, Onix, Porygon) where the only other members may not be available.

#### A.3.5 Which Gen 1 Species Cannot Breed

The following Gen 1 species are in the **No Eggs Discovered** (Undiscovered) egg group:

| Species | Reason |
|---------|--------|
| Nidorina (#030) | Inexplicably unbreedable despite being female (long-standing game quirk) |
| Nidoqueen (#031) | Same as Nidorina -- cannot breed despite being female |
| Articuno (#144) | Legendary |
| Zapdos (#145) | Legendary |
| Moltres (#146) | Legendary |
| Mewtwo (#150) | Legendary |
| Mew (#151) | Mythical |

**Note:** Nidoran-F (#029) CAN breed and produces either Nidoran-F or Nidoran-M eggs. The inability of Nidorina/Nidoqueen to breed is one of Pokemon's most notorious design decisions. If you want to breed Nidoran, you must use the base form.

**Also note:** All legendaries/mythicals listed above are **unobtainable in Gold/Silver** without trading from Gen 1.

#### A.3.6 Egg Moves

Gen 2 introduced egg moves -- moves passed from the **father** to the offspring. The father must know the move and the offspring must have it listed as a valid egg move.

**Legacy egg moves** (available as egg moves in Gen 2 but not in later generations) are particularly valuable for collectors who breed before transferring. Moves are preserved through Poke Transporter transfer, so Gen 2 egg moves that pass Transporter's legality check will arrive intact in Gen 7+, potentially creating legal transfer-only specimens.

**Notable unobtainable egg moves in Gen 2:**
- Bulbasaur: Charm (egg move exists but no valid father can pass it -- Nidoran-F learns Charm but cannot be the father)
- Snorlax: Charm (same issue)
- Staryu: Aurora Beam, Barrier, Supersonic (genderless, can only breed with Ditto, so cannot inherit egg moves)

[NEEDS VERIFICATION: A comprehensive list of Gen 1 species egg moves exclusive to Gen 2 breeding requires cross-referencing individual learnset pages. The above are confirmed unobtainable cases.]

#### A.3.7 Egg Cycles

Different species require different numbers of steps to hatch. The base egg cycle count varies by species. In Gen 2, each egg cycle is 256 steps. Notable values for Gen 1 species:

| Egg Cycles | Species Examples |
|-----------|----------------|
| 5 (1,280 steps) | Magikarp, Gyarados |
| 10 (2,560 steps) | Geodude, Zubat, Tentacool, Goldeen, Magnemite |
| 15 (3,840 steps) | Pidgey, Rattata, Spearow, Ekans, Pikachu, Vulpix, Meowth, Growlithe, Ponyta, Doduo, Abra |
| 20 (5,120 steps) | Bulbasaur, Charmander, Squirtle, Nidoran, Clefairy, Jigglypuff, Machop, Bellsprout, Gastly, Drowzee, Krabby, Exeggcute, Cubone, Koffing, Rhyhorn, Horsea, Staryu, Mr. Mime, Scyther, Pinsir, Dratini |
| 25 (6,400 steps) | Grimer, Onix, Chansey, Kangaskhan, Tauros |
| 30 (7,680 steps) | Porygon |
| 35 (8,960 steps) | Snorlax, Lapras |
| 40 (10,240 steps) | Eevee, Omanyte, Kabuto, Aerodactyl |

### A.4 Poke Balls

#### A.4.1 Standard Balls

| Ball | Availability |
|------|-------------|
| Poke Ball | Marts (all cities) |
| Great Ball | Marts (after Azalea Town) |
| Ultra Ball | Marts (after Mahogany Town) |
| Master Ball | Gift from Prof. Elm after earning all 8 Johto badges |

#### A.4.2 Apricorn Balls (Kurt, Azalea Town)

Gen 2 introduced **seven new ball types** crafted by Kurt in Azalea Town from Apricorns:

| Apricorn Color | Ball | Special Effect |
|---------------|------|---------------|
| Red | Level Ball | Better catch rate if your Pokemon's level is higher than the wild Pokemon |
| Blue | Lure Ball | Better catch rate on fishing encounters |
| Yellow | Moon Ball | Better catch rate on Pokemon that evolve with Moon Stone |
| Green | Friend Ball | Caught Pokemon starts with higher friendship |
| Pink | Love Ball | Better catch rate if wild Pokemon is opposite gender of yours |
| Black | Heavy Ball | Better catch rate on heavy Pokemon |
| White | Fast Ball | Better catch rate on Pokemon that flee (Roaming beasts, Abra, etc.) |

**Apricorn Tree Locations:**

| Apricorn | Location |
|----------|----------|
| Red | Route 37 |
| Blue | Route 37 |
| Yellow | Route 42 |
| Green | Route 42 |
| Pink | Route 42 |
| Black | Route 37, Route 33 |
| White | Route 38 |

Each tree produces **one Apricorn per day**. Kurt can only craft **one ball at a time** in Gold/Silver (unlike Crystal where he can batch). The ball is ready the following day.

#### A.4.3 Park Ball / Sport Ball

The **Bug-Catching Contest** at National Park provides **20 Sport Balls** (called "Park Balls" in Gen 2) per contest entry. These cannot be kept after the contest ends -- any remaining are confiscated. Pokemon caught during the contest are kept in Sport Balls.

#### A.4.4 CRITICAL: Ball Transfer Behavior

**All Poke Balls become standard Poke Ball on transfer through Poke Transporter.**

Gen 2 does not store ball type in the Pokemon's data structure in a way Poke Transporter can read. This means:
- Apricorn Ball catches **lose their ball** on transfer
- Sport Ball catches **lose their ball** on transfer
- Every transferred Pokemon arrives in a plain Poke Ball

**Collector implication:** Apricorn Ball specimens have value ONLY within the VC save file. If you care about ball aesthetics, keep those specimens in Gold/Silver and do not transfer. For specimens intended for transfer, ball choice is irrelevant -- use whatever catches most efficiently.

### A.5 Time of Day

Gen 2 introduced a real-time clock system. The 3DS system clock drives the VC time.

| Period | Hours | Notes |
|--------|-------|-------|
| Morning | 4:00 AM - 9:59 AM | Slightly different encounters from Day; some Bug types more common |
| Day | 10:00 AM - 5:59 PM | Widest variety of encounters; most active period |
| Night | 6:00 PM - 3:59 AM | Nocturnal species appear (Hoothoot, Oddish, Gastly, etc.); different music |

**Encounter impact:** Many routes have completely different encounter tables for Morning/Day vs Night. Some species are **exclusive** to certain time periods:
- Night-only: Hoothoot, Noctowl, Oddish, Gastly, Haunter
- Morning/Day-only: Ledyba (morning), Pidgey, Spearow, Farfetch'd
- Version + time combinations create additional restrictions

### A.6 Transfer Mechanics (VC Gen 2 to Gen 7+)

**Path:** VC Gold/Silver --> Poke Transporter (3DS) --> Pokemon Bank (3DS) --> SM/USUM or --> Pokemon HOME (one-way)

| Property | In Gold/Silver | After Transfer |
|----------|---------------|----------------|
| IVs | DVs (0-15, 4 stats) | Random IVs (0-31, 6 stats); 3 guaranteed 31 (5 for Celebi) |
| Nature | Does not exist | EXP mod 25 (controllable before transfer) |
| Ability | Does not exist | **Hidden Ability** assigned |
| Ball | Various (Poke, Great, Ultra, Apricorn, Sport, Master) | **Poke Ball (always)** |
| Gender | DV-based (Attack DV) | Preserved (same Attack DV formula) |
| Shininess | DV-based (visible in-game) | Preserved (Poke Transporter v1.3+ checks Gen 2 DV formula) |
| Origin mark | None | **Game Boy mark** |
| Held items | May exist | **NOT transferred** (Pokemon with items are rejected) |
| Pokerus | May exist | **NOT transferred** |
| Moves | Gen 2 moveset | **Preserved** (standard TM/level-up/HM/tutor moves pass through; only event-exclusive moves that fail legality check are blocked) |
| EVs/Stat EXP | Stat Experience values | Reset to 0 |

**Nature manipulation:** Same as Gen 1 -- grind EXP to control `total_exp mod 25`. See the nature table in [01-vc-red-blue.md](01-vc-red-blue.md).

### A.7 Key Progression Gates

| Gate | Requirement | What It Unlocks |
|------|------------|----------------|
| Day Care (Route 34) | Reach Goldenrod City (after 2nd badge) | Breeding |
| Kurt (Azalea Town) | Defeat Team Rocket in Slowpoke Well | Apricorn Ball crafting |
| Bug-Catching Contest | After 2nd badge (Plain Badge) | Tuesdays, Thursdays, Saturdays |
| Lake of Rage | After 7th badge (Mineral Badge) | Shiny Gyarados, shiny breeding parent |
| SS Aqua (Kanto access) | All 8 Johto badges + defeat Elite Four | Entire Kanto region |
| Snorlax (Vermilion) | EXPN Card from Lavender Radio Tower | Route 11 access, Diglett's Cave |
| Mt. Silver | All 16 badges (8 Johto + 8 Kanto) | Endgame area, Red battle |

### A.8 Version Exclusives (Gen 1 Species)

| Gold Exclusive | Silver Exclusive |
|---------------|-----------------|
| Mankey, Primeape | Meowth, Persian (wild Kanto) |
| Growlithe, Arcanine | Vulpix, Ninetales |
| Ekans (Game Corner) | Sandshrew (Game Corner) |
| Spinarak, Ariados (Gen 2) | Ledyba, Ledian (Gen 2) |

**Note:** Several Gen 1 species that are wild-exclusive to one version can be obtained in the other version through the Game Corner (Ekans in Gold / Sandshrew in Silver) or in-game trades. Growlithe appears on some Johto routes in Gold (and Route 36/37 in both versions [NEEDS VERIFICATION: some sources show Growlithe on Route 36/37 in both Gold and Silver]).

---

## Section B: Gen 1 Species Availability

### B.1 Unobtainable Gen 1 Species

The following Gen 1 species **cannot be obtained in Gold or Silver** by any means. They must be traded from Gen 1 VC games via Time Capsule:

| # | Species | Notes |
|---|---------|-------|
| 001-003 | Bulbasaur, Ivysaur, Venusaur | Starters -- no wild, gift, or bred source |
| 004-006 | Charmander, Charmeleon, Charizard | Starters -- no wild, gift, or bred source |
| 007-009 | Squirtle, Wartortle, Blastoise | Starters -- no wild, gift, or bred source |
| 138-139 | Omanyte, Omastar | Fossil Pokemon -- no fossil restoration in G/S |
| 140-141 | Kabuto, Kabutops | Fossil Pokemon -- no fossil restoration in G/S |
| 144 | Articuno | Legendary -- not present in G/S |
| 145 | Zapdos | Legendary -- not present in G/S |
| 146 | Moltres | Legendary -- not present in G/S |
| 150 | Mewtwo | Legendary -- Cerulean Cave collapsed |
| 151 | Mew | Mythical -- event-only, no G/S distribution |

**Total unobtainable: 19 species** (counting full evolutionary lines).

### B.2 Gift and Special Pokemon

| # | Species | Level | Location | Method |
|---|---------|-------|----------|--------|
| 133 | Eevee | 20 | Goldenrod City (Bill's house) | Gift from Bill after meeting him in Ecruteak City |
| 021 | Spearow | 10 | Route 31 (delivery) | Kenya the Spearow -- deliver mail from Route 35 to Route 31 |
| 143 | Snorlax | 50 | Vermilion City (in front of Diglett's Cave) | Wake with Poke Flute channel on Pokegear (requires EXPN Card from Lavender Town) |
| 130 | Gyarados | 30 | Lake of Rage | Guaranteed shiny, static encounter |
| 063 | Abra | 10 | Goldenrod Game Corner | 200 coins (both versions) |
| 023 | Ekans | 10 | Goldenrod Game Corner | 700 coins (Gold only) |
| 027 | Sandshrew | 10 | Goldenrod Game Corner | 700 coins (Silver only) |
| 147 | Dratini | 10 | Goldenrod Game Corner | 2,100 coins (both versions) |
| 122 | Mr. Mime | -- | Celadon Game Corner | 3,333 coins (both versions) |
| 133 | Eevee | -- | Celadon Game Corner | 6,666 coins (both versions) |
| 137 | Porygon | -- | Celadon Game Corner | 9,999 coins (both versions) |

### B.3 In-Game Trades

| You Give | You Receive | # | Location | OT |
|----------|------------|---|----------|-----|
| Bellsprout | Onix (male) | 095 | Violet City | Kyle |
| Drowzee | Machop (female) | 066 | Goldenrod Dept Store | Mike |
| Krabby | Voltorb | 100 | Olivine City | Tim |
| Dragonair (female) | Rhydon (female) | 112 | Blackthorn City | Emy |
| Dodrio (female) | Doris (Chansey) | 113 | Route 14 | Kim |
| Chansey | Aerodactyl (male) | 142 | Route 14 | Kim |
| Gloom | Rapidash (male) | 078 | Pewter City | Chris |
| Haunter | Xatu (male) | -- | Pewter City | Paul |
| Dugtrio | Magneton | 082 | Power Plant | Forest |

**Collector notes on trades:**
- The **Chansey for Aerodactyl** trade on Route 14 is the **only way to obtain Aerodactyl** in Gold/Silver without trading from Gen 1.
- The **Dragonair for Rhydon** trade provides Rhydon without needing to evolve Rhyhorn.
- In-game trade Pokemon have fixed OT names and random Trainer IDs / DVs.

### B.4 Wild Encounters -- Johto Region

Organized by location. Only Gen 1 species listed. Time of day: M = Morning, D = Day, N = Night.

#### Routes 29-31 (Early Johto)

| Species | Location | Method | Time | Approx Rate |
|---------|----------|--------|------|-------------|
| Pidgey | Route 29, 30, 31 | Grass | M/D | 30-55% |
| Rattata | Route 29, 30, 31 | Grass | N (mainly) | 5-40% |
| Caterpie | Route 30, 31 | Grass | M/D | 30-50% |
| Weedle | Route 31 | Grass | M/D | 30-35% |
| Bellsprout | Route 31 | Grass | M/D/N | 5-20% |
| Zubat | Route 31 | Grass | N | 5% |
| Poliwag | Route 30, 31 | Surf/Fish | All | 15-90% |
| Magikarp | Route 30, 31 | Fish | All | 20-85% |
| Spearow | Route 29 | Headbutt | All | 50-80% |
| Exeggcute | Route 29 | Headbutt | All | 15-20% |

#### Route 32 (South of Violet City)

| Species | Location | Method | Time | Approx Rate |
|---------|----------|--------|------|-------------|
| Rattata | Route 32 | Grass | All | 30-40% |
| Ekans | Route 32 | Grass | M/D | 30% |
| Bellsprout | Route 32 | Grass | All | 20-30% |
| Zubat | Route 32 | Grass | N | 5% |
| Gastly | Route 32 | Grass | N | 5% |
| Pidgey | Route 32 | Grass | M/D | 5% |
| Tentacool | Route 32 | Surf | All | 60% |
| Tentacruel | Route 32 | Surf | All | 10% |
| Magikarp | Route 32 | Fish | All | 20-85% |

#### Route 33 (Azalea Town approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Rattata | Grass | All | 40-60% |
| Spearow | Grass | M/D | 20% |
| Ekans | Grass | M/D | 30% |
| Zubat | Grass | N | Varies |
| Geodude | Grass | All | 20% |

#### Route 34 (Day Care Route)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Pidgey | Grass | M/D | 20% |
| Rattata | Grass | All | 30% |
| Abra | Grass | All | 10% |
| Jigglypuff | Grass | All | 5% |
| Ditto | Grass | All | 4% |
| Tentacool | Surf | All | 90% |
| Tentacruel | Surf | All | 10% |
| Magikarp | Fish (Old) | All | 85% |
| Krabby | Fish (Good) | All | 55% |
| Caterpie | Headbutt | All | 65% |
| Exeggcute | Headbutt | All | 15-20% |

#### Route 35 (National Park approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Pidgey | Grass | M/D | 5-30% |
| Nidoran-F | Grass | All | 30% |
| Nidoran-M | Grass | All | 30% |
| Jigglypuff | Grass | All | 5% |
| Growlithe | Grass | D | 20% |
| Psyduck | Grass/Surf | N/All | 20%/90% |
| Abra | Grass | All | 10% |
| Drowzee | Grass | All | 20-30% |
| Ditto | Grass | All | 4% |
| Poliwag | Fish | All | 15-80% |
| Magikarp | Fish | All | 20-85% |

#### Route 36-37 (Ecruteak approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Pidgey | Grass | M/D | 25-60% |
| Nidoran-F | Grass (R36) | All | 30% |
| Nidoran-M | Grass (R36) | All | 30% |
| Vulpix | Grass (R36, R37) | M/D | 10-15% |
| Growlithe | Grass (R36, R37) | M/D | 10-15% |

#### Routes 38-39 (Olivine approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Rattata | Grass | All | 30-40% |
| Raticate | Grass | All | 30% |
| Pidgeotto | Grass | M/D | 10% |
| Meowth | Grass | All | 30-40% |
| Magnemite | Grass | All | 20% |
| Farfetch'd | Grass | M/D | 10% |
| Tauros | Grass | All | 4-5% |

#### Route 42 (Mahogany approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Rattata | Grass | All | 20-30% |
| Raticate | Grass | All | 10-20% |
| Spearow | Grass | M/D | 30-40% |
| Fearow | Grass | M/D | 5% |
| Ekans | Grass | M/D | 30% |
| Arbok | Grass | M/D | 5% |
| Zubat | Grass | N | 30-40% |
| Golbat | Grass | N | 15% |
| Goldeen | Surf | All | 90% |
| Seaking | Surf | All | 10% |
| Magikarp | Fish | All | 20-85% |

#### Route 43 (Lake of Rage approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Pidgeotto | Grass | M/D | 20-25% |
| Raticate | Grass | All | 5-25% |
| Venonat | Grass | N | 5-40% |
| Farfetch'd | Grass | M/D | 20% |
| Magikarp | Surf | All | 100% |
| Poliwag | Fish | All | 15-80% |

#### Route 44 (Ice Path approach)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Bellsprout | Grass | All | 20% |
| Weepinbell | Grass | All | 35% |
| Poliwag | Grass | N | 30% |
| Poliwhirl | Grass | N | 10% |
| Lickitung | Grass | M/D | 40% |
| Tangela | Grass | All | 30% |
| Poliwag | Surf | All | 90% |
| Poliwhirl | Surf | All | 10% |
| Magikarp | Fish | All | 20-85% |

#### Routes 45-46 (Blackthorn descent)

| Species | Method | Time | Approx Rate |
|---------|--------|------|-------------|
| Geodude | Grass (R45, R46) | All | 30-45% |
| Graveler | Grass (R45) | All | 40-55% |
| Rattata | Grass (R46) | All | 20-50% |
| Spearow | Grass (R46) | M/D | 35% |
| Jigglypuff | Grass (R46) | All | 5% |
| Dratini | Fish (R45, Good Rod) | All | 10% |
| Dragonair | Fish (R45, Super Rod) | All | 10% |
| Magikarp | Fish/Surf (R45) | All | 60-100% |

#### Lake of Rage

| Species | Method | Approx Rate |
|---------|--------|-------------|
| Gyarados | Static (shiny) | Guaranteed |
| Magikarp | Surf | 90% |
| Gyarados | Surf | 10% |
| Magikarp | Fish (all rods) | 70-100% |
| Gyarados | Fish (Good/Super) | 10-30% |

#### Caves -- Johto

**Dark Cave:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Zubat | Cave | 39-85% |
| Golbat | Cave (deep) | 5% |
| Geodude | Cave | 30-60% |
| Graveler | Cave (deep) | 20% |
| Goldeen | Surf/Fish | 15-70% |
| Seaking | Fish (Super) | 10% |
| Magikarp | Surf/Fish | 20-100% |
| Krabby | Rock Smash | 90% |

**Union Cave:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Rattata | Cave | 10-40% |
| Raticate | Cave (B2F) | 10-30% |
| Sandshrew | Cave (1F, B1F) | 30% |
| Zubat | Cave | 25-50% |
| Golbat | Cave (B2F) | 20-30% |
| Geodude | Cave | 5-30% |
| Onix | Cave | 5-10% |
| Tentacool | Surf (B2F) | 60% |
| Goldeen | Fish | 15-70% |
| Magikarp | Fish | 20-85% |

**Slowpoke Well:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Zubat | Cave | 80-85% |
| Golbat | Cave (B2F) | 5% |
| Slowpoke | Cave/Surf | 15-100% |
| Slowbro | Surf (B2F) | 10% |
| Goldeen | Fish | 15-70% |
| Seaking | Fish (Super) | 10% |
| Magikarp | Fish | 20-85% |

**Mt. Mortar:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Rattata | Cave | 10-30% |
| Raticate | Cave (2F) | 10-20% |
| Zubat | Cave | 5-60% |
| Machop | Cave | 10-35% |
| Machoke | Cave (2F) | 30% |
| Geodude | Cave | 5-50% |
| Graveler | Cave (2F) | 30% |
| Goldeen | Surf/Fish | 15-90% |
| Seaking | Surf/Fish | 10% |
| Magikarp | Fish | 20-85% |

**Ice Path:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Zubat | Cave | 25% |
| Golbat | Cave | 20-30% |
| Jynx | Cave | 5-10% |

**Burned Tower:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Rattata | Cave | 40-50% |
| Raticate | Cave | 5% |
| Zubat | Cave | 5-10% |
| Koffing | Cave | 35-59% |
| Magmar | Cave | 5-10% |

**Whirl Islands:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Zubat | Cave | 30% |
| Golbat | Cave | 5% |
| Seel | Cave | 15-25% |
| Krabby | Cave | 40-50% |
| Tentacool | Surf | 60% |
| Tentacruel | Surf | 10-30% |
| Horsea | Surf/Fish | 10-90% |
| Seadra | Surf/Fish | 10% |
| Magikarp | Fish | 10-85% |
| Kingler | Fish (Super) | 20% |

**Tohjo Falls:**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Rattata | Cave | 5% |
| Raticate | Cave | 30% |
| Zubat | Cave | 30% |
| Golbat | Cave | 20% |
| Slowpoke | Cave/Surf | 15-30% |
| Goldeen | Surf/Fish | 15-70% |
| Seaking | Surf/Fish | 10% |
| Magikarp | Fish | 20-85% |

#### National Park

**Regular encounters (grass):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Caterpie | M/D | 50% |
| Metapod | M/D | 30% |
| Weedle | M/D | 50% |
| Kakuna | M/D | 30% |
| Pidgey | M/D | 5% |
| Nidoran-F | M/D | Varies |
| Nidoran-M | M/D | Varies |
| Psyduck | N | 10% |
| Venonat | N | 30% |

**Bug-Catching Contest (Tuesdays, Thursdays, Saturdays):**
| Species | Level Range | Approx Rate |
|---------|-------------|-------------|
| Caterpie | 7-18 | 20% |
| Metapod | 9-18 | 10% |
| Butterfree | 12-15 | 5% |
| Weedle | 7-18 | 20% |
| Kakuna | 9-18 | 10% |
| Beedrill | 12-15 | 5% |
| Paras | 10-18 | 10% |
| Venonat | 10-16 | 10% |
| Scyther | 13-14 | 5% |
| Pinsir | 13-14 | 5% |

**Collector note:** Scyther and Pinsir from the Bug-Catching Contest are caught in Sport Balls. They are at relatively low levels (13-14). The Sport Ball is lost on transfer.

#### Headbutt Tree Pokemon (All Johto)

Two groupings of headbutt trees exist:

**Forest Trees** (Azalea Town, Ilex Forest, Lake of Rage, Routes 26, 27, 34, 35, 36, 37, 38, 39):
- Caterpie, Metapod, Butterfree
- Weedle, Kakuna, Beedrill
- Exeggcute
- Pineco (high-encounter trees only)

**Mountain Trees** (Routes 29, 30, 31, 32, 33, 42, 43, 44):
- Spearow
- Ekans (some routes)

Headbutt encounter rates depend on the specific tree and the player's Trainer ID. Each tree has an index (0-9) that combines with Trainer ID to determine encounter chance (moderate vs high battle chance).

### B.5 Wild Encounters -- Kanto Post-Game

Kanto opens after defeating the Elite Four and Champion Lance. The SS Aqua ferry from Olivine City takes you to Vermilion City.

**Major changes from Gen 1 Kanto:**
- Cerulean Cave has **collapsed** -- inaccessible (no Mewtwo)
- Viridian Forest has been **absorbed into Route 2** -- no longer a separate dungeon
- Seafoam Islands interior has **no wild encounters** in Gen 2 (Blaine's Gym relocated here)
- The legendary birds (Articuno, Zapdos, Moltres) are **not available**
- Power Plant is a building with NPCs, not a wild encounter area
- Mt. Moon is **accessible but much smaller** (one floor)

#### Kanto Routes

**Route 1:**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Pidgey | M/D | 45% |
| Rattata | All | 30-55% |

**Route 2 (includes former Viridian Forest area):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Caterpie | M/D | 30% |
| Metapod | M/D | 20% |
| Butterfree | M | 10% |
| Weedle | M/D | 30% |
| Kakuna | M/D | 20% |
| Beedrill | M | 10% |
| Pidgey | All | Varies |
| **Pikachu** | **All** | **5%** |

**Route 2 is the only location in Gold/Silver where Pikachu can be caught wild.** This makes it a critical stop in the Kanto post-game.

**Routes 3-4 (Mt. Moon area):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 35-60% |
| Spearow | M/D | 55% |
| Ekans | M/D | 20% |
| Arbok | M/D | 5% |
| Sandshrew | M/D | 5% |
| Jigglypuff | All | 10% |
| Clefairy | N | 5% |
| Zubat | N | 10-30% |

**Routes 5-6 (Cerulean-Vermilion):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Pidgey | M/D | 40-60% |
| Rattata | All | 30% |
| Meowth | All | 20-30% |
| Oddish | N | 30-60% |
| Bellsprout | M/D | 30% |
| Jigglypuff | All | 5% |
| Abra | M/D | 10-15% |
| Magnemite | All (R6) | 10% |
| Psyduck | Surf (R6) | 90% |
| Golduck | Surf (R6) | 10% |
| Poliwag | Fish (R6) | 15-80% |

**Route 7:**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 5-40% |
| Raticate | All | 10% |
| Spearow | M/D | 30% |
| Vulpix | All | 20-25% |
| Jigglypuff | All | 5% |
| Meowth | All | 30% |
| Growlithe | M/D | 20% |
| Abra | All | 5% |

**Route 8:**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Pidgeotto | M/D | 35-65% |
| Vulpix | All | 5-10% |
| Meowth | All | 30% |
| Growlithe | M/D | 5-10% |
| Abra | All | 20% |
| Kadabra | All | 5% |
| Haunter | N | 10-30% |

**Route 9:**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 30-40% |
| Spearow | All | 20-50% |
| Fearow | All | 5-15% |
| Mankey | All | 30% |
| Primeape | All | 5% |
| Marowak | All | 5% |
| Goldeen | Surf | 90% |
| Seaking | Surf | 10% |

**Route 10 (Power Plant area):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Raticate | All | Varies |
| Spearow | All | Varies |
| Fearow | All | Varies |
| Voltorb | All | Varies |
| Electabuzz | All | Varies |
| Marowak | All | Varies |
| Goldeen | Surf | 90% |

**Route 11 (East of Vermilion):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 30-35% |
| Raticate | All | 30% |
| Pidgeotto | M/D | 10% |
| Meowth | N | 30% |
| Magnemite | All | 20% |
| Drowzee | All | 40% |
| Hypno | All | 10% |

**Routes 13-15 (South of Lavender Town):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Pidgeotto | M/D | 20% |
| Nidorina | All | 30% |
| Nidorino | All | 30% |
| Venonat | N | 30% |
| Venomoth | N | 10% |
| Chansey | All | **1%** (extremely rare) |
| Tentacool | Surf/Fish | 60-70% |
| Magikarp | Fish | 20-85% |

**Chansey at 1% on Routes 14-15** is one of the rarest wild encounters in the game.

**Routes 16-18 (Cycling Road):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Fearow | M/D | 40-45% |
| Grimer | All | 50-80% |
| Muk | All | 5-15% |

**Route 19-20 (Seafoam area, water):**
| Species | Method | Approx Rate |
|---------|--------|-------------|
| Tentacool | Surf | 90% |
| Tentacruel | Surf | 10% |
| Krabby | Fish | 15-60% |
| Magikarp | Fish | 20-85% |
| Shellder | Fish (Good/Super) | 10-30% |
| Staryu | Fish (Good/Super) | 10-30% |

**Route 21 (Cinnabar area):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 10-30% |
| Raticate | All | 10% |
| Tangela | All | 50-95% |
| Mr. Mime | All | 0-10% |
| Tentacool | Surf | 90% |
| Shellder | Fish | 10-30% |

**Route 22 (Victory Road approach):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Rattata | All | 30-95% |
| Spearow | M/D | 50% |
| Fearow | M/D | Varies |
| Ponyta | All | Varies |
| Doduo | All | Varies |
| Poliwag | Surf/Grass | 30-40% |

**Routes 24-25 (North of Cerulean):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Caterpie | M/D (R25) | 30% |
| Pidgey | M/D (R25) | 30-50% |
| Pidgeotto | M/D (R25) | 5% |
| Bellsprout | All (R24, R25) | 5-60% |
| Weepinbell | All (R24, R25) | 10-15% |
| Venonat | N (R24, R25) | 5-30% |
| Venomoth | N (R24) | 5% |
| Oddish | N (R24) | 50% |
| Abra | M/D (R24, R25) | 10-20% |
| Goldeen | Surf/Fish (R25) | 15-90% |
| Seaking | Surf/Fish (R25) | 10% |

**Routes 26-27 (Tohjo Falls / Victory Road approach):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Raticate | All | 28-30% |
| Arbok | All | 5-10% |
| Sandslash | All | 28-30% |
| Ponyta | All | 20-32% |
| Doduo | All | 28-35% |
| Dodrio | All | 5% |
| Tentacool | Surf | 90% |
| Tentacruel | Surf | 10% |
| Shellder | Fish (Good/Super) | 10-30% |

**Route 28 (Mt. Silver approach):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Ponyta | M/D | 30% |
| Rapidash | M/D | 10% |
| Tangela | M/D | 30% |
| Arbok | M/D | 10% |
| Doduo | M/D | 5% |
| Dodrio | M/D | 5% |
| Poliwhirl | N | 40% |
| Golbat | N | 30% |
| Poliwag | Surf | 90% |
| Poliwhirl | Surf | 10% |

#### Kanto Caves and Dungeons

**Mt. Moon (much smaller in Gen 2):**
| Species | Approx Rate |
|---------|-------------|
| Zubat | 30-50% |
| Geodude | 30-35% |
| Sandshrew | 20% |
| Sandslash | 5% |
| Clefairy | 5-25% (mostly night) |
| Paras | 10% |

**Rock Tunnel:**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Zubat | All | 10-40% |
| Golbat | N | 5% |
| Geodude | All | 30-50% |
| Machop | All | 20% |
| Machoke | All | 5% |
| Cubone | All | 30-35% |
| Marowak | All | 5% |
| Onix | All (B1F) | 20% |
| Kangaskhan | All (B1F) | 5% |
| Haunter | N | 5-10% |

**Rock Tunnel is the only location to catch wild Kangaskhan in Gold/Silver.**

**Diglett's Cave:**
| Species | Approx Rate |
|---------|-------------|
| Diglett | 90% |
| Dugtrio | 10% |

**Mt. Silver (endgame):**
| Species | Time | Approx Rate |
|---------|------|-------------|
| Ponyta | M/D | 30% |
| Rapidash | M/D | 10% |
| Doduo | M/D | 5% |
| Dodrio | M/D | 5% |
| Arbok | M/D | 20% |
| Tangela | M/D | 30% |
| Golbat | N | 30% |
| Poliwhirl | N | 40% |
| Poliwag | Surf | 10% |
| Poliwhirl | Surf | 90% |
| Magikarp | Fish | 20-85% |

### B.6 Snorlax -- Special Encounter

| Property | Value |
|----------|-------|
| Species | Snorlax (#143) |
| Level | 50 |
| Location | In front of Diglett's Cave entrance, east side of Vermilion City |
| How to wake | Tune Pokegear radio to Poke Flute Channel (requires EXPN Card from Lavender Radio Tower) |
| Quantity | One per game |
| Gender | Random (87.5% male) |

**How to get the EXPN Card:** After restoring power to the Power Plant (find the missing machine part in Cerulean Gym), return to the Lavender Radio Tower to receive the EXPN Card, which adds the Poke Flute channel to your Pokegear radio.

**SAVE-BEFORE:** This is a one-per-save encounter. Save before waking it if you want to manipulate DVs.

### B.7 Fishing Rod Locations

| Rod | Location | When |
|-----|----------|------|
| Old Rod | Route 32 (Fisherman in Pokemon Center) | After reaching Violet City |
| Good Rod | Olivine City (Fisherman near harbor) | After reaching Olivine |
| Super Rod | Route 12 (Fisherman in house) | Kanto post-game |

---

## Section C: Breeding Deep Dive

### C.1 Egg Group Reference for Gen 1 Species

#### Monster Group
| # | Species | Second Group |
|---|---------|-------------|
| 001-003 | Bulbasaur/Ivysaur/Venusaur | Grass |
| 004-006 | Charmander/Charmeleon/Charizard | Dragon |
| 007-009 | Squirtle/Wartortle/Blastoise | Water 1 |
| 029 | Nidoran-F | Field |
| 032-034 | Nidoran-M/Nidorino/Nidoking | Field |
| 079-080 | Slowpoke/Slowbro | Water 1 |
| 104-105 | Cubone/Marowak | -- |
| 108 | Lickitung | -- |
| 111-112 | Rhyhorn/Rhydon | Field |
| 115 | Kangaskhan | -- |
| 131 | Lapras | Water 1 |
| 143 | Snorlax | -- |

#### Water 1 Group
| # | Species | Second Group |
|---|---------|-------------|
| 007-009 | Squirtle/Wartortle/Blastoise | Monster |
| 054-055 | Psyduck/Golduck | Field |
| 060-062 | Poliwag/Poliwhirl/Poliwrath | -- |
| 079-080 | Slowpoke/Slowbro | Monster |
| 086-087 | Seel/Dewgong | Field |
| 116-117 | Horsea/Seadra | Dragon |
| 131 | Lapras | Monster |
| 138-139 | Omanyte/Omastar | Water 3 |
| 140-141 | Kabuto/Kabutops | Water 3 |
| 147-149 | Dratini/Dragonair/Dragonite | Dragon |

#### Water 2 Group
| # | Species | Second Group |
|---|---------|-------------|
| 118-119 | Goldeen/Seaking | -- |
| 129-130 | Magikarp/Gyarados | Dragon |

#### Water 3 Group
| # | Species | Second Group |
|---|---------|-------------|
| 072-073 | Tentacool/Tentacruel | -- |
| 090-091 | Shellder/Cloyster | -- |
| 098-099 | Krabby/Kingler | -- |
| 120-121 | Staryu/Starmie | -- (genderless, Ditto only) |
| 138-139 | Omanyte/Omastar | Water 1 |
| 140-141 | Kabuto/Kabutops | Water 1 |

#### Field Group
| # | Species | Second Group |
|---|---------|-------------|
| 019-020 | Rattata/Raticate | -- |
| 023-024 | Ekans/Arbok | -- |
| 025-026 | Pikachu/Raichu | Fairy |
| 027-028 | Sandshrew/Sandslash | -- |
| 029 | Nidoran-F | Monster |
| 032-034 | Nidoran-M/Nidorino/Nidoking | Monster |
| 037-038 | Vulpix/Ninetales | -- |
| 050-051 | Diglett/Dugtrio | -- |
| 052-053 | Meowth/Persian | -- |
| 054-055 | Psyduck/Golduck | Water 1 |
| 056-057 | Mankey/Primeape | -- |
| 058-059 | Growlithe/Arcanine | -- |
| 077-078 | Ponyta/Rapidash | -- |
| 083 | Farfetch'd | Flying |
| 086-087 | Seel/Dewgong | Water 1 |
| 111-112 | Rhyhorn/Rhydon | Monster |
| 128 | Tauros | -- (male-only, Ditto breeding required) |
| 133-136 | Eevee/Vaporeon/Jolteon/Flareon | -- |

#### Flying Group
| # | Species | Second Group |
|---|---------|-------------|
| 016-018 | Pidgey/Pidgeotto/Pidgeot | -- |
| 021-022 | Spearow/Fearow | -- |
| 041-042 | Zubat/Golbat | -- |
| 083 | Farfetch'd | Field |
| 084-085 | Doduo/Dodrio | -- |
| 142 | Aerodactyl | -- |

#### Bug Group
| # | Species | Second Group |
|---|---------|-------------|
| 010-012 | Caterpie/Metapod/Butterfree | -- |
| 013-015 | Weedle/Kakuna/Beedrill | -- |
| 046-047 | Paras/Parasect | Grass |
| 048-049 | Venonat/Venomoth | -- |
| 123 | Scyther | -- |
| 127 | Pinsir | -- |

#### Grass Group
| # | Species | Second Group |
|---|---------|-------------|
| 001-003 | Bulbasaur/Ivysaur/Venusaur | Monster |
| 043-045 | Oddish/Gloom/Vileplume | -- |
| 046-047 | Paras/Parasect | Bug |
| 069-071 | Bellsprout/Weepinbell/Victreebel | -- |
| 102-103 | Exeggcute/Exeggutor | -- |
| 114 | Tangela | -- |

#### Fairy Group
| # | Species | Second Group |
|---|---------|-------------|
| 025-026 | Pikachu/Raichu | Field |
| 035-036 | Clefairy/Clefable | -- |
| 039-040 | Jigglypuff/Wigglytuff | -- |
| 113 | Chansey | -- |

#### Human-Like Group
| # | Species | Second Group |
|---|---------|-------------|
| 063-065 | Abra/Kadabra/Alakazam | -- |
| 066-068 | Machop/Machoke/Machamp | -- |
| 096-097 | Drowzee/Hypno | -- |
| 106 | Hitmonlee | -- (male-only) |
| 107 | Hitmonchan | -- (male-only) |
| 122 | Mr. Mime | -- |
| 124 | Jynx | -- (female-only) |
| 125 | Electabuzz | -- |
| 126 | Magmar | -- |

#### Mineral Group
| # | Species | Second Group |
|---|---------|-------------|
| 074-076 | Geodude/Graveler/Golem | -- |
| 081-082 | Magnemite/Magneton | -- (genderless, Ditto only) |
| 095 | Onix | -- |
| 100-101 | Voltorb/Electrode | -- (genderless, Ditto only) |
| 137 | Porygon | -- (genderless, Ditto only) |

#### Amorphous Group
| # | Species | Second Group |
|---|---------|-------------|
| 088-089 | Grimer/Muk | -- |
| 092-094 | Gastly/Haunter/Gengar | -- |
| 109-110 | Koffing/Weezing | -- |

#### Dragon Group
| # | Species | Second Group |
|---|---------|-------------|
| 004-006 | Charmander/Charmeleon/Charizard | Monster |
| 116-117 | Horsea/Seadra | Water 1 |
| 129-130 | Magikarp/Gyarados | Water 2 |
| 147-149 | Dratini/Dragonair/Dragonite | Water 1 |

#### No Eggs Discovered (Cannot Breed)
| # | Species | Reason |
|---|---------|--------|
| 030 | Nidorina | Game quirk -- unbreedable |
| 031 | Nidoqueen | Game quirk -- unbreedable |
| 144 | Articuno | Legendary |
| 145 | Zapdos | Legendary |
| 146 | Moltres | Legendary |
| 150 | Mewtwo | Legendary |
| 151 | Mew | Mythical |

### C.2 Ditto-Only Breeders

These Gen 1 species can **only** breed with Ditto (due to being genderless, male-only, or having no compatible egg group partners available):

| Species | Reason |
|---------|--------|
| Magnemite/Magneton | Genderless (Mineral group) |
| Voltorb/Electrode | Genderless (Mineral group) |
| Staryu/Starmie | Genderless (Water 3 group) |
| Porygon | Genderless (Mineral group) |
| Tauros | Male-only (Field group -- could breed with female Field members, but produces the female's species, not Tauros) |
| Hitmonlee | Male-only (Human-Like -- Ditto produces Tyrogue egg in Gen 2) |
| Hitmonchan | Male-only (Human-Like -- Ditto produces Tyrogue egg in Gen 2) |

**Note on genderless Ditto breeding:** When Ditto breeds with a genderless Pokemon, the genderless Pokemon's DVs are used as the "opposite-gender parent" for inheritance. Defense DV is inherited from Ditto.

### C.3 Shiny Breeding with Lake of Rage Gyarados

The Red Gyarados has DVs: Attack 14, Defense 10, Speed 10, Special 10.

Gyarados is in **Water 2 + Dragon** egg groups. Species that share these egg groups and can breed with Gyarados:

**Water 2 Group (direct breeding):**
| # | Species | Notes |
|---|---------|-------|
| 118-119 | Goldeen/Seaking | Common throughout G/S |
| 129-130 | Magikarp/Gyarados | Same species (higher compatibility) |

**Dragon Group (via cross-group):**
| # | Species | Notes |
|---|---------|-------|
| 004-006 | Charmander line | NOT in G/S (unobtainable) |
| 116-117 | Horsea/Seadra | Available in Whirl Islands |
| 147-149 | Dratini line | Available via Game Corner or Route 45 fishing |

**Breeding chain:** Gyarados (male, shiny) + female Goldeen = ~1/64 shiny Goldeen offspring. Gyarados + female Horsea = ~1/64 shiny Horsea. And so on.

**The 1/64 math:** Gyarados passes Defense DV 10 to offspring (inherited from father as opposite-gender parent). Offspring has 50% chance of Special DV 10 (from father) or 2 (10-8). Attack is random (8/16 = 50% shiny-eligible). Speed is random (1/16 for exactly 10). Combined: 1/2 x 1/2 x 1/16 = **1/64**.

**Extending the chain:** Once you breed a shiny Goldeen (for example), that shiny Goldeen can be used as a parent for other Water 2 species, OR any species in Goldeen's egg groups. Since Goldeen is only Water 2, the chain stays within that group. But if you breed a shiny Dratini (Dragon + Water 1), that shiny Dratini can propagate shiny odds to the entire Water 1 group (Poliwag, Psyduck, Slowpoke, Seel, Horsea, Lapras, Squirtle if traded in, Omanyte/Kabuto if traded in).

### C.4 Shiny Breeding Chain Strategy

The most efficient breeding chain starting from Lake of Rage Gyarados:

1. **Gyarados** (shiny, Water 2/Dragon) --> breed with female Dratini
2. **Shiny Dratini** (Water 1/Dragon) --> breed with any female Water 1 species
3. From shiny Water 1 offspring, breed into overlapping groups:
   - Shiny Psyduck (Water 1/Field) --> breed into the massive Field group
   - Shiny Slowpoke (Water 1/Monster) --> breed into Monster group
   - Shiny Seel (Water 1/Field) --> alternative Field entry
   - Shiny Lapras (Water 1/Monster) --> alternative Monster entry

4. From a **shiny Field member** (e.g., Psyduck offspring):
   - Breed into: Rattata, Ekans, Sandshrew, Vulpix, Diglett, Meowth, Mankey, Growlithe, Ponyta, Farfetch'd, Eevee, Pikachu, Nidoran, Rhyhorn, Seel, Psyduck, etc.

5. From a **shiny Monster member** (e.g., Slowpoke offspring):
   - Breed into: Cubone, Lickitung, Kangaskhan, Snorlax, Rhyhorn, Nidoran, Bulbasaur/Charmander/Squirtle lines (if traded in), Lapras

**Each step in the chain maintains ~1/64 shiny odds** as long as the parent contributing Defense/Special DVs is shiny (Defense 10, Special 10).

**Groups NOT reachable from Gyarados without Ditto:**
- Bug (no overlap with Dragon/Water 2/Water 1/Field/Monster)
- Human-Like (no overlap)
- Mineral (no overlap, and mostly genderless)
- Amorphous (no overlap)
- Fairy (overlaps with Field via Pikachu -- so reachable from Field chain)
- Grass (overlaps with Monster via Bulbasaur line -- only if traded in; overlaps with Bug via Paras -- Bug not reachable)

For isolated groups, use a **shiny Ditto** (astronomically rare at 1/8192) or breed shinies within the group using shiny parents obtained through other means.

---

## Section D: Walkthrough Checklist

### D.1 Johto Progression (Collector-Optimized)

**New Bark Town - Cherrygrove City - Violet City:**
- [ ] Save before starter selection (Cyndaquil/Totodile/Chikorita -- Gen 2 starters, not relevant to Gen 1 collecting but DVs matter)
- [ ] Route 29-31: Catch Pidgey, Rattata, Caterpie, Weedle, Bellsprout, Poliwag, Magikarp (fishing)
- [ ] Headbutt trees: Spearow, Exeggcute

**Azalea Town:**
- [ ] Clear Slowpoke Well (unlock Kurt)
- [ ] Start collecting Apricorns daily (Black Apricorn on Route 33)
- [ ] Union Cave: Sandshrew, Zubat, Geodude, Onix, Goldeen
- [ ] Slowpoke Well: Slowpoke, Zubat

**Goldenrod City:**
- [ ] **Day Care unlocked** (Route 34) -- breeding is now possible
- [ ] Catch Ditto on Route 34 or 35 (4% encounter rate -- be patient)
- [ ] Get Eevee from Bill (visit Ecruteak City first, then return)
- [ ] Route 34: Abra, Jigglypuff, Tentacool (surf), Krabby (fish)
- [ ] Route 35: Nidoran-F, Nidoran-M, Drowzee, Growlithe, Psyduck
- [ ] Game Corner: Buy Abra (200c), Dratini (2100c), Ekans/Sandshrew (700c)
- [ ] **Start breeding immediately** -- Ditto + everything

**National Park:**
- [ ] Bug-Catching Contest (Tue/Thu/Sat): Catch Scyther, Pinsir, Paras, Venonat
- [ ] Regular grass: Nidoran-F, Nidoran-M, Caterpie, Weedle

**Ecruteak City:**
- [ ] Burned Tower: Koffing, Magmar, Rattata
- [ ] Route 38-39: Meowth, Magnemite, Farfetch'd, Tauros (rare), Raticate

**Apricorn Routes (collect daily):**
- [ ] Route 37: Red (Level Ball), Blue (Lure Ball), Black (Heavy Ball)
- [ ] Route 38: White (Fast Ball)
- [ ] Route 42: Yellow (Moon Ball), Green (Friend Ball), Pink (Love Ball)

**Olivine - Cianwood - Mahogany:**
- [ ] Route 40-41: Tentacool, Tentacruel, Krabby, Shellder, Staryu (fish)
- [ ] Whirl Islands: Seel, Krabby, Horsea, Seadra, Tentacool, Zubat
- [ ] Route 42: Spearow, Fearow, Ekans, Arbok, Goldeen, Seaking

**Lake of Rage + Mahogany:**
- [ ] **SAVE BEFORE Red Gyarados** -- it is guaranteed shiny but you can reset for nature (EXP mod 25) if planning to transfer
- [ ] Catch Red Gyarados (Water 2/Dragon, shiny breeding parent)
- [ ] Fish at Lake of Rage: Magikarp, Gyarados

**Ice Path:**
- [ ] Jynx (5-10%), Zubat, Golbat

**Route 44:**
- [ ] Lickitung (40% M/D), Tangela (30%), Bellsprout, Weepinbell, Poliwag

**Blackthorn City area:**
- [ ] Route 45: Geodude, Graveler, Dratini (fish), Dragonair (Super Rod)
- [ ] Route 46: Geodude, Jigglypuff

### D.2 Kanto Post-Game (Collector Targets)

**Vermilion City:**
- [ ] Get EXPN Card from Lavender Radio Tower
- [ ] **Wake Snorlax** (Lv. 50, SAVE BEFORE)
- [ ] Diglett's Cave: Diglett, Dugtrio

**Critical Kanto targets (Gen 1 species not available in Johto):**
- [ ] Route 2: **Pikachu** (5%, all times -- only wild location in G/S)
- [ ] Mt. Moon: Clefairy (night), Paras, Sandshrew/Sandslash
- [ ] Route 9: Mankey, Primeape, Marowak
- [ ] Rock Tunnel: Machop, Machoke, Cubone, Marowak, Onix, **Kangaskhan** (B1F, 5%)
- [ ] Routes 16-18: **Grimer, Muk** (only location)
- [ ] Route 21: **Tangela** (dominant), **Mr. Mime** (rare)
- [ ] Routes 13-15: **Chansey** (1% -- extremely rare), Nidorina, Nidorino
- [ ] Route 10: **Electabuzz**, Voltorb
- [ ] Route 8: **Kadabra**, Haunter (night)

**Celadon Game Corner (Kanto):**
- [ ] Mr. Mime (3,333 coins)
- [ ] Eevee (6,666 coins) -- second Eevee source
- [ ] Porygon (9,999 coins)

**In-Game Trades (Kanto):**
- [ ] Chansey for Aerodactyl (Route 14) -- only Aerodactyl source
- [ ] Gloom for Rapidash (Pewter City)
- [ ] Dugtrio for Magneton (Power Plant)

### D.3 Time-of-Day Planning

Plan your play sessions around time-sensitive encounters:

**Morning-only targets (4:00-9:59 AM):**
- Ledyba (various routes)

**Day-only targets (10:00 AM - 5:59 PM):**
- Growlithe (Routes 35, 36, 37)
- Lickitung (Route 44)
- Most bird Pokemon at higher rates

**Night-only targets (6:00 PM - 3:59 AM):**
- Hoothoot/Noctowl (many routes)
- Oddish/Gloom (Kanto routes)
- Gastly/Haunter (Routes 8, 32, Burned Tower)
- Clefairy at Mt. Moon (25% at night vs 5% day)
- Poliwag on some routes

### D.4 Shiny Breeding Setup

1. Catch Red Gyarados at Lake of Rage
2. Catch female Dratini (Route 45 fishing or Game Corner -- Game Corner is easier)
3. Breed Gyarados (male) + Dratini (female) at Route 34 Day Care
4. Hatch eggs (Dratini: 40 egg cycles = 10,240 steps)
5. Check each Dratini for shininess (~1/64 chance)
6. Once you have a shiny Dratini, use it to breed into Water 1, Dragon, and eventually Field/Monster groups

**Hatching efficiency:** Ride the bike back and forth on a long straight route. Route 34 (south of Goldenrod) is convenient since the Day Care is right there.

---

## Section E: Transfer and Lockout Summary

### E.1 What Transfers

| Transfers | Does Not Transfer |
|-----------|-------------------|
| Species | Held items (rejected at Transporter) |
| Shininess (DV-based, preserved) | Ball type (becomes Poke Ball) |
| Gender (Attack DV formula) | Stat Experience / EVs (reset) |
| Game Boy origin mark | Pokerus |
| Hidden Ability (assigned) | Friendship |
| Nature (EXP mod 25) | Ball type (becomes Poke Ball) |
| 3 random IVs set to 31 | Held items (rejected at Transporter) |
| Moves (preserved -- standard moves pass through) | Event-exclusive moves that fail legality check |

### E.2 Critical Lockout Warnings

1. **Apricorn Balls are lost on transfer.** If you catch a Pokemon in a Moon Ball, Love Ball, etc., that ball reverts to a standard Poke Ball when transferred through Poke Transporter. There is no way around this. If Apricorn Ball aesthetics matter to you, **keep those specimens in the VC save file** permanently.

2. **Sport Balls are lost on transfer.** Bug-Catching Contest catches lose their ball type.

3. **Breed for legacy egg moves before transferring.** Egg move inheritance only works within Gen 2's breeding system. Moves ARE preserved through Transporter, so a Pokemon with Gen 2-exclusive egg moves will keep them on transfer, creating legal transfer-only specimens in Gen 7+.

4. **Nature manipulation via EXP.** Before transferring, grind the Pokemon's EXP to control its nature (EXP mod 25). See the nature table in [01-vc-red-blue.md](01-vc-red-blue.md). This applies to all transferred specimens including bred ones.

5. **Held items block transfer.** Any Pokemon holding an item will be rejected by Poke Transporter. Remove all held items before attempting transfer.

6. **Shiny breeding chain stays in Gen 2.** The 1/64 shiny breeding advantage only works within the Gen 2 DV inheritance system. Once you transfer a shiny to Gen 7+, its DVs are discarded and new random IVs are generated. You cannot use a transferred shiny as a breeding parent for enhanced shiny odds in later generations. **Do all your shiny breeding in Gold/Silver before transferring.**

7. **3DS eShop closure impact.** The 3DS eShop closed in March 2023. Poke Transporter must already be downloaded to use it. Verify your 3DS has Poke Transporter and Pokemon Bank installed before beginning a transfer-focused playthrough. [NEEDS VERIFICATION: confirm Transporter still functions for already-downloaded copies as of 2026.]

### E.3 Recommended Approach

1. **Complete the Pokedex in-game first.** Catch everything available in Gold/Silver before worrying about transfer.
2. **Set up shiny breeding chain.** Use Lake of Rage Gyarados to breed shiny specimens of as many species as possible at 1/64 odds.
3. **Breed specimens for transfer.** Create the specific offspring you want, at desired levels.
4. **Manipulate natures via EXP** on all specimens intended for transfer.
5. **Remove held items** from all specimens.
6. **Transfer via Poke Transporter** to Bank, then to HOME or SM/USUM.
7. **Keep the save file intact.** Your Apricorn Ball specimens, breeding parents, and any Pokemon you want to keep in Gen 2 remain playable on the VC cartridge.

---

## Appendix: Complete Gen 1 Obtainability Matrix

Summary of all 151 Gen 1 species and their obtainability in Gold/Silver:

| Status | Count | Species |
|--------|-------|---------|
| **Wild (Johto)** | ~60 | Pidgey, Rattata, Spearow, Ekans, Sandshrew, Zubat, Geodude, Oddish (N), Bellsprout, Psyduck, Abra, Machop, Tentacool, Slowpoke, Magnemite, Farfetch'd, Seel, Gastly, Onix, Drowzee, Krabby, Exeggcute, Koffing, Goldeen, Magikarp, Dratini, and evolutions |
| **Wild (Kanto)** | ~25 additional | Pikachu, Clefairy, Jigglypuff, Paras, Venonat, Diglett, Meowth, Mankey, Growlithe (also Johto), Ponyta, Doduo, Grimer, Shellder, Voltorb, Cubone, Kangaskhan, Horsea, Mr. Mime, Electabuzz, Magmar (Johto too), Tangela, Chansey, Poliwag (also Johto), and evolutions |
| **Gift/Special** | 4 | Eevee (Bill), Snorlax (wake), Gyarados (Lake of Rage, shiny), Spearow (Kenya) |
| **Game Corner** | 6 | Abra, Ekans/Sandshrew, Dratini, Mr. Mime, Eevee, Porygon |
| **In-Game Trade** | 7 | Onix, Machop, Voltorb, Rhydon, Chansey, Aerodactyl, Rapidash, Magneton |
| **Breeding only** | Several | Many species obtainable as offspring of wild-caught parents |
| **Unobtainable** | 19 | Bulbasaur line (3), Charmander line (3), Squirtle line (3), Omanyte line (2), Kabuto line (2), Articuno, Zapdos, Moltres, Mewtwo, Mew, Aerodactyl (wild -- only via trade) |

**Net Gen 1 species obtainable in Gold/Silver without trading from Gen 1: ~130+ out of 151** (exact count depends on whether you include evolutionary lines accessible only through evolution of caught/bred species).

---

*Research sources: Bulbapedia (Shiny Pokemon, Pokemon breeding, Egg Group, Apricorn, Poke Transporter, individual route/location pages), Serebii.net (G/S game data, gift Pokemon, Game Corner, unobtainable list). Cross-referenced where possible. Items marked [NEEDS VERIFICATION] or [DISPUTED] require additional confirmation.*
