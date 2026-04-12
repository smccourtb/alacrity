# Gen 1 Collector Research: Overview and Species Index

## 1. Purpose

This research series, created for use in Alacrity, produces per-game collector guides for all 151 Gen 1 (Kanto) Pokemon, covering ball legality, shiny availability, breeding mechanics, legacy/egg moves, transfer routes, regional forms, nature control, and walkthrough checklists. The goal is to determine the ideal collection strategy for each species -- identifying which game provides the best origin specimen, what alternate forms must be collected separately, and where shiny or ball-specific specimens are obtainable -- and to provide game-by-game execution guides that a completionist collector can follow in order.

## 2. Methodology

Research sources in priority order:

1. **Bulbapedia** (primary) -- Species pages, mechanic articles, transfer documentation, egg group/gender ratio categories
2. **Serebii** (cross-reference) -- Pokedex entries, availability tables, Mega Evolution listings, game-specific encounter data
3. **PokeAPI** (validation) -- Cross-checked against existing Alacrity project `species` table data (1025 species seeded from PokeAPI)
4. **Smogon** (nature/competitive guidance) -- Nature recommendations, EV spread context for specimen optimization

When sources disagree, both interpretations are documented inline with a **[DISPUTED]** tag. Unverified claims from a single source are marked **[NEEDS VERIFICATION]**.

## 3. Species Index

### Key

- **Tier 1** -- High complexity: starters, fossils, legendaries, mythicals, gift/trade-only, Game Corner exclusives. These species have limited availability, require specific game progression, or involve unique acquisition methods.
- **Tier 2** -- Medium complexity: Safari Zone species, version exclusives, species with any regional form, trade evolutions. These require cross-version coordination or have form management considerations.
- **Tier 3** -- Standard: Common wild encounters available in multiple games without special constraints.

Gender ratio abbreviations: `87.5M` = 87.5% male / 12.5% female, `75M` = 75% male / 25% female, `50/50` = equal, `75F` = 25% male / 75% female, `M-only` = 100% male, `F-only` = 100% female, `--` = genderless.

| # | Name | Tier | Alolan | Galarian | Hisuian | Paldean | Mega | Gmax | Gender | Egg Groups |
|-----|-------------|------|--------|----------|---------|---------|------|------|--------|------------|
| 001 | Bulbasaur | 1 | No | No | No | No | No | No | 87.5M | Monster, Grass |
| 002 | Ivysaur | 1 | No | No | No | No | No | No | 87.5M | Monster, Grass |
| 003 | Venusaur | 1 | No | No | No | No | Yes | Yes | 87.5M | Monster, Grass |
| 004 | Charmander | 1 | No | No | No | No | No | No | 87.5M | Monster, Dragon |
| 005 | Charmeleon | 1 | No | No | No | No | No | No | 87.5M | Monster, Dragon |
| 006 | Charizard | 1 | No | No | No | No | Yes (X/Y) | Yes | 87.5M | Monster, Dragon |
| 007 | Squirtle | 1 | No | No | No | No | No | No | 87.5M | Monster, Water 1 |
| 008 | Wartortle | 1 | No | No | No | No | No | No | 87.5M | Monster, Water 1 |
| 009 | Blastoise | 1 | No | No | No | No | Yes | Yes | 87.5M | Monster, Water 1 |
| 010 | Caterpie | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 011 | Metapod | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 012 | Butterfree | 3 | No | No | No | No | No | Yes | 50/50 | Bug |
| 013 | Weedle | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 014 | Kakuna | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 015 | Beedrill | 3 | No | No | No | No | Yes | No | 50/50 | Bug |
| 016 | Pidgey | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 017 | Pidgeotto | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 018 | Pidgeot | 3 | No | No | No | No | Yes | No | 50/50 | Flying |
| 019 | Rattata | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 020 | Raticate | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 021 | Spearow | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 022 | Fearow | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 023 | Ekans | 2 | No | No | No | No | No | No | 50/50 | Field, Dragon |
| 024 | Arbok | 2 | No | No | No | No | No | No | 50/50 | Field, Dragon |
| 025 | Pikachu | 1 | No | No | No | No | No | Yes | 50/50 | Field, Fairy |
| 026 | Raichu | 2 | Yes | No | No | No | Yes (X/Y) | No | 50/50 | Field, Fairy |
| 027 | Sandshrew | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 028 | Sandslash | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 029 | Nidoran-F | 3 | No | No | No | No | No | No | F-only | Monster, Field |
| 030 | Nidorina | 3 | No | No | No | No | No | No | F-only | No Eggs |
| 031 | Nidoqueen | 3 | No | No | No | No | No | No | F-only | No Eggs |
| 032 | Nidoran-M | 3 | No | No | No | No | No | No | M-only | Monster, Field |
| 033 | Nidorino | 3 | No | No | No | No | No | No | M-only | Monster, Field |
| 034 | Nidoking | 3 | No | No | No | No | No | No | M-only | Monster, Field |
| 035 | Clefairy | 3 | No | No | No | No | No | No | 75F | Fairy |
| 036 | Clefable | 3 | No | No | No | No | Yes | No | 75F | Fairy |
| 037 | Vulpix | 2 | Yes | No | No | No | No | No | 75F | Field |
| 038 | Ninetales | 2 | Yes | No | No | No | No | No | 75F | Field |
| 039 | Jigglypuff | 3 | No | No | No | No | No | No | 75F | Fairy |
| 040 | Wigglytuff | 3 | No | No | No | No | No | No | 75F | Fairy |
| 041 | Zubat | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 042 | Golbat | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 043 | Oddish | 2 | No | No | No | No | No | No | 50/50 | Grass |
| 044 | Gloom | 2 | No | No | No | No | No | No | 50/50 | Grass |
| 045 | Vileplume | 2 | No | No | No | No | No | No | 50/50 | Grass |
| 046 | Paras | 3 | No | No | No | No | No | No | 50/50 | Bug, Grass |
| 047 | Parasect | 3 | No | No | No | No | No | No | 50/50 | Bug, Grass |
| 048 | Venonat | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 049 | Venomoth | 3 | No | No | No | No | No | No | 50/50 | Bug |
| 050 | Diglett | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 051 | Dugtrio | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 052 | Meowth | 2 | Yes | Yes | No | No | No | Yes | 50/50 | Field |
| 053 | Persian | 2 | Yes | No | No | No | No | No | 50/50 | Field |
| 054 | Psyduck | 3 | No | No | No | No | No | No | 50/50 | Water 1, Field |
| 055 | Golduck | 3 | No | No | No | No | No | No | 50/50 | Water 1, Field |
| 056 | Mankey | 2 | No | No | No | No | No | No | 50/50 | Field |
| 057 | Primeape | 2 | No | No | No | No | No | No | 50/50 | Field |
| 058 | Growlithe | 2 | No | No | Yes | No | No | No | 75M | Field |
| 059 | Arcanine | 2 | No | No | Yes | No | No | No | 75M | Field |
| 060 | Poliwag | 3 | No | No | No | No | No | No | 50/50 | Water 1 |
| 061 | Poliwhirl | 3 | No | No | No | No | No | No | 50/50 | Water 1 |
| 062 | Poliwrath | 3 | No | No | No | No | No | No | 50/50 | Water 1 |
| 063 | Abra | 3 | No | No | No | No | No | No | 75M | Human-Like |
| 064 | Kadabra | 2 | No | No | No | No | No | No | 75M | Human-Like |
| 065 | Alakazam | 2 | No | No | No | No | Yes | No | 75M | Human-Like |
| 066 | Machop | 3 | No | No | No | No | No | No | 75M | Human-Like |
| 067 | Machoke | 2 | No | No | No | No | No | No | 75M | Human-Like |
| 068 | Machamp | 2 | No | No | No | No | No | Yes | 75M | Human-Like |
| 069 | Bellsprout | 2 | No | No | No | No | No | No | 50/50 | Grass |
| 070 | Weepinbell | 2 | No | No | No | No | No | No | 50/50 | Grass |
| 071 | Victreebel | 2 | No | No | No | No | Yes | No | 50/50 | Grass |
| 072 | Tentacool | 3 | No | No | No | No | No | No | 50/50 | Water 3 |
| 073 | Tentacruel | 3 | No | No | No | No | No | No | 50/50 | Water 3 |
| 074 | Geodude | 2 | Yes | No | No | No | No | No | 50/50 | Mineral |
| 075 | Graveler | 2 | Yes | No | No | No | No | No | 50/50 | Mineral |
| 076 | Golem | 2 | Yes | No | No | No | No | No | 50/50 | Mineral |
| 077 | Ponyta | 3 | No | No | No | No | No | No | 50/50 | Field |
| 078 | Rapidash | 3 | No | No | No | No | No | No | 50/50 | Field |
| 079 | Slowpoke | 2 | No | Yes | No | No | No | No | 50/50 | Monster, Water 1 |
| 080 | Slowbro | 2 | No | Yes | No | No | Yes | No | 50/50 | Monster, Water 1 |
| 081 | Magnemite | 3 | No | No | No | No | No | No | -- | Mineral |
| 082 | Magneton | 3 | No | No | No | No | No | No | -- | Mineral |
| 083 | Farfetch'd | 2 | No | Yes | No | No | No | No | 50/50 | Flying, Field |
| 084 | Doduo | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 085 | Dodrio | 3 | No | No | No | No | No | No | 50/50 | Flying |
| 086 | Seel | 3 | No | No | No | No | No | No | 50/50 | Water 1, Field |
| 087 | Dewgong | 3 | No | No | No | No | No | No | 50/50 | Water 1, Field |
| 088 | Grimer | 2 | Yes | No | No | No | No | No | 50/50 | Amorphous |
| 089 | Muk | 2 | Yes | No | No | No | No | No | 50/50 | Amorphous |
| 090 | Shellder | 3 | No | No | No | No | No | No | 50/50 | Water 3 |
| 091 | Cloyster | 3 | No | No | No | No | No | No | 50/50 | Water 3 |
| 092 | Gastly | 3 | No | No | No | No | No | No | 50/50 | Amorphous |
| 093 | Haunter | 3 | No | No | No | No | No | No | 50/50 | Amorphous |
| 094 | Gengar | 2 | No | No | No | No | Yes | Yes | 50/50 | Amorphous |
| 095 | Onix | 3 | No | No | No | No | No | No | 50/50 | Mineral |
| 096 | Drowzee | 3 | No | No | No | No | No | No | 50/50 | Human-Like |
| 097 | Hypno | 3 | No | No | No | No | No | No | 50/50 | Human-Like |
| 098 | Krabby | 3 | No | No | No | No | No | No | 50/50 | Water 3 |
| 099 | Kingler | 3 | No | No | No | No | No | Yes | 50/50 | Water 3 |
| 100 | Voltorb | 2 | No | No | Yes | No | No | No | -- | Mineral |
| 101 | Electrode | 2 | No | No | Yes | No | No | No | -- | Mineral |
| 102 | Exeggcute | 3 | No | No | No | No | No | No | 50/50 | Grass |
| 103 | Exeggutor | 2 | Yes | No | No | No | No | No | 50/50 | Grass |
| 104 | Cubone | 3 | No | No | No | No | No | No | 50/50 | Monster |
| 105 | Marowak | 2 | Yes | No | No | No | No | No | 50/50 | Monster |
| 106 | Hitmonlee | 1 | No | No | No | No | No | No | M-only | Human-Like |
| 107 | Hitmonchan | 1 | No | No | No | No | No | No | M-only | Human-Like |
| 108 | Lickitung | 1 | No | No | No | No | No | No | 50/50 | Monster |
| 109 | Koffing | 3 | No | No | No | No | No | No | 50/50 | Amorphous |
| 110 | Weezing | 2 | No | Yes | No | No | No | No | 50/50 | Amorphous |
| 111 | Rhyhorn | 3 | No | No | No | No | No | No | 50/50 | Monster, Field |
| 112 | Rhydon | 3 | No | No | No | No | No | No | 50/50 | Monster, Field |
| 113 | Chansey | 2 | No | No | No | No | No | No | F-only | Fairy |
| 114 | Tangela | 3 | No | No | No | No | No | No | 50/50 | Grass |
| 115 | Kangaskhan | 1 | No | No | No | No | Yes | No | F-only | Monster |
| 116 | Horsea | 3 | No | No | No | No | No | No | 50/50 | Water 1, Dragon |
| 117 | Seadra | 3 | No | No | No | No | No | No | 50/50 | Water 1, Dragon |
| 118 | Goldeen | 3 | No | No | No | No | No | No | 50/50 | Water 2 |
| 119 | Seaking | 3 | No | No | No | No | No | No | 50/50 | Water 2 |
| 120 | Staryu | 3 | No | No | No | No | No | No | -- | Water 3 |
| 121 | Starmie | 3 | No | No | No | No | Yes | No | -- | Water 3 |
| 122 | Mr. Mime | 2 | No | Yes | No | No | No | No | 50/50 | Human-Like |
| 123 | Scyther | 2 | No | No | No | No | No | No | 50/50 | Bug |
| 124 | Jynx | 1 | No | No | No | No | No | No | F-only | Human-Like |
| 125 | Electabuzz | 2 | No | No | No | No | No | No | 75M | Human-Like |
| 126 | Magmar | 2 | No | No | No | No | No | No | 75M | Human-Like |
| 127 | Pinsir | 2 | No | No | No | No | Yes | No | 50/50 | Bug |
| 128 | Tauros | 2 | No | No | No | Yes | No | No | M-only | Field |
| 129 | Magikarp | 3 | No | No | No | No | No | No | 50/50 | Water 2, Dragon |
| 130 | Gyarados | 3 | No | No | No | No | Yes | No | 50/50 | Water 2, Dragon |
| 131 | Lapras | 1 | No | No | No | No | No | Yes | 50/50 | Monster, Water 1 |
| 132 | Ditto | 3 | No | No | No | No | No | No | -- | Ditto |
| 133 | Eevee | 1 | No | No | No | No | No | Yes | 87.5M | Field |
| 134 | Vaporeon | 3 | No | No | No | No | No | No | 87.5M | Field |
| 135 | Jolteon | 3 | No | No | No | No | No | No | 87.5M | Field |
| 136 | Flareon | 3 | No | No | No | No | No | No | 87.5M | Field |
| 137 | Porygon | 1 | No | No | No | No | No | No | -- | Mineral |
| 138 | Omanyte | 1 | No | No | No | No | No | No | 87.5M | Water 1, Water 3 |
| 139 | Omastar | 1 | No | No | No | No | No | No | 87.5M | Water 1, Water 3 |
| 140 | Kabuto | 1 | No | No | No | No | No | No | 87.5M | Water 1, Water 3 |
| 141 | Kabutops | 1 | No | No | No | No | No | No | 87.5M | Water 1, Water 3 |
| 142 | Aerodactyl | 1 | No | No | No | No | Yes | No | 87.5M | Flying |
| 143 | Snorlax | 1 | No | No | No | No | No | Yes | 87.5M | Monster |
| 144 | Articuno | 1 | No | Yes | No | No | No | No | -- | No Eggs |
| 145 | Zapdos | 1 | No | Yes | No | No | No | No | -- | No Eggs |
| 146 | Moltres | 1 | No | Yes | No | No | No | No | -- | No Eggs |
| 147 | Dratini | 3 | No | No | No | No | No | No | 50/50 | Water 1, Dragon |
| 148 | Dragonair | 3 | No | No | No | No | No | No | 50/50 | Water 1, Dragon |
| 149 | Dragonite | 3 | No | No | No | No | Yes | No | 50/50 | Water 1, Dragon |
| 150 | Mewtwo | 1 | No | No | No | No | Yes (X/Y) | No | -- | No Eggs |
| 151 | Mew | 1 | No | No | No | No | No | No | -- | No Eggs |

### Species with Regional Forms (Summary)

**Alolan Forms (18 species, all Gen 1):**
Rattata, Raticate, Raichu, Sandshrew, Sandslash, Vulpix, Ninetales, Diglett, Dugtrio, Meowth, Persian, Geodude, Graveler, Golem, Grimer, Muk, Exeggutor, Marowak

**Galarian Forms (10 Gen 1 species):**
Meowth, Slowpoke, Slowbro, Farfetch'd, Weezing, Mr. Mime, Articuno, Zapdos, Moltres
(Note: Galarian Slowking is the evolution of Galarian Slowpoke but Slowking is #199, a Gen 2 species)

**Hisuian Forms (4 Gen 1 species):**
Growlithe, Arcanine, Voltorb, Electrode

**Paldean Forms (1 Gen 1 species):**
Tauros (3 breeds: Combat, Blaze, Aqua)

### Species with Mega Evolutions (Summary)

**From XY (Gen 6):**
Venusaur, Charizard (X and Y), Blastoise, Alakazam, Gengar, Kangaskhan, Pinsir, Gyarados, Aerodactyl, Mewtwo (X and Y)

**From ORAS (Gen 6):**
Beedrill, Pidgeot, Slowbro

**From Legends Z-A (Gen 9) -- base game:**
Clefable, Victreebel, Starmie, Dragonite

**From Legends Z-A (Gen 9) -- Mega Dimension DLC:**
Raichu (X and Y)

### Species with Gigantamax Forms (Summary)

Venusaur, Charizard, Blastoise, Butterfree, Pikachu, Meowth, Machamp, Gengar, Kingler, Lapras, Eevee, Snorlax

### Tier Distribution

| Tier | Count | Description |
|------|-------|-------------|
| 1 | 30 | Starters + evos (9), Fossils + evos (5), Aerodactyl (1), Legendaries (3), Mythical (1), Gift/Trade Pokemon (8), Game Corner (1), Snorlax (1), Eevee (1) |
| 2 | 53 | Regional form holders, version exclusives, Safari Zone, trade evolutions |
| 3 | 68 | Standard wild encounters |

## 4. Game Document Index

The following 14 game-specific research documents will be produced, plus 3 synthesis documents:

### Game Research Documents

| # | File | Games Covered | Era |
|---|------|---------------|-----|
| 01 | `01-vc-red-blue.md` | Virtual Console Red, Blue | Gen 1 (3DS VC) |
| 02 | `02-vc-yellow.md` | Virtual Console Yellow | Gen 1 (3DS VC) |
| 03 | `03-vc-gold-silver.md` | Virtual Console Gold, Silver | Gen 2 (3DS VC) |
| 04 | `04-vc-crystal.md` | Virtual Console Crystal | Gen 2 (3DS VC) |
| 05 | `05-gen3-rse-frlg.md` | Ruby, Sapphire, Emerald, FireRed, LeafGreen | Gen 3 (GBA) |
| 06 | `06-gen4-dppt-hgss.md` | Diamond, Pearl, Platinum, HeartGold, SoulSilver | Gen 4 (DS) |
| 07 | `07-gen5-bw-b2w2.md` | Black, White, Black 2, White 2 | Gen 5 (DS) |
| 08 | `08-gen6-xy-oras.md` | X, Y, Omega Ruby, Alpha Sapphire | Gen 6 (3DS) |
| 09 | `09-gen7-sm-usum.md` | Sun, Moon, Ultra Sun, Ultra Moon | Gen 7 (3DS) |
| 10 | `10-lgpe.md` | Let's Go Pikachu, Let's Go Eevee | Gen 7 (Switch) |
| 11 | `11-gen8-swsh.md` | Sword, Shield + DLC (Isle of Armor, Crown Tundra) | Gen 8 (Switch) |
| 12 | `12-bdsp.md` | Brilliant Diamond, Shining Pearl | Gen 8 (Switch) |
| 13 | `13-pla.md` | Pokemon Legends: Arceus | Gen 8 (Switch) |
| 14 | `14-gen9-sv.md` | Scarlet, Violet + DLC (Teal Mask, Indigo Disk) | Gen 9 (Switch) |

### Synthesis Documents

| # | File | Purpose |
|---|------|---------|
| 15 | `15-species-summary.md` | Per-species best-origin recommendations across all games |
| 16 | `16-transfer-routes.md` | Optimal transfer routing for the full collection |
| 17 | `17-breeding-guide.md` | Egg move planning, ball inheritance, nature breeding |

## 5. Terminology Reference

### Specimen Types

| Term | Definition |
|------|------------|
| **Specimen target** | A specific Pokemon instance the collector intends to obtain -- defined by species, origin game, ball, nature, ability, gender, form, and shiny status |
| **Origin trophy** | A specimen valued primarily for its origin mark/game of origin -- the earliest or most prestigious source for a species |
| **Move-lab specimen** | A specimen obtained specifically to carry legacy or egg moves not available in later games |
| **Ball specimen** | A specimen caught in a specific Poke Ball for aesthetic or legality purposes (e.g., Apricorn balls, Safari Ball, Sport Ball) |
| **Shiny specimen** | A shiny variant of the species, obtained through the lowest-odds or most prestigious method available |

### Collection Status Tags

| Tag | Meaning |
|-----|---------|
| **Mandatory** | This specimen must be collected -- no alternative source exists, or this is the definitive best origin |
| **Optional** | Worth collecting but not required -- a lateral alternative to another specimen |
| **Prestige** | A harder-to-obtain variant that demonstrates collection depth (e.g., shiny legendary, VC origin) |
| **Redundant** | Another specimen already covers this species better -- skip unless completionist |
| **Dominated** | Strictly worse than another obtainable specimen in every dimension -- do not collect |
| **Impossible** | This combination (e.g., shiny + female for 87.5M VC species) cannot legally exist |
| **Consolidated** | Multiple collection goals satisfied by a single specimen (e.g., shiny + ball + nature in one catch) |
| **Split-required** | This species requires multiple specimens to cover all collection dimensions (e.g., separate shiny and ball specimens) |

### Walkthrough Action Tags

| Tag | Meaning |
|-----|---------|
| **SAVE-BEFORE** | Create a save state before this encounter -- it is one-time or has properties worth resetting for |
| **CATCH-NOW** | This Pokemon is available now and should be caught at this point in the walkthrough |
| **DELAY-UNTIL-BALLS** | Do not catch yet -- wait until better Poke Balls become available |
| **DO-NOT-TRANSFER-YET** | Keep this Pokemon in its origin game; a later step requires it there (e.g., move tutor, evolution) |
| **POINT-OF-NO-RETURN** | After this game event, an acquisition opportunity is permanently lost |
| **PARALLEL-SPECIMEN-REQUIRED** | This species needs a second (or third) specimen obtained in parallel -- e.g., one for moves, one for ball |

## 6. Transfer Chain Quick Reference

### Complete Transfer Pathways

```
VC Gen 1/2 (3DS)
  |
  v
Poke Transporter (3DS app)
  |
  v
Pokemon Bank (3DS app) -----> Pokemon HOME (Switch/Mobile) [one-way]
  |                                |
  v                                v
Gen 6: XY, ORAS                 Gen 8: Sword/Shield, BDSP, PLA
Gen 7: SM, USUM                 Gen 9: Scarlet/Violet
                                 (Legends Z-A planned Spring 2026)


Gen 3 (GBA: RSE, FRLG)
  |
  v  [DS dual-slot, Pal Park]
Gen 4 (DS: DPPt, HGSS)
  |
  v  [DS Download Play, Poke Transfer]
Gen 5 (DS: BW, B2W2)
  |
  v  [Poke Transporter]
Pokemon Bank (3DS) -----> Pokemon HOME [one-way]
  |
  v
Gen 6/7 (as above)


Gen 7 (3DS: SM, USUM, LGPE*)
  |
  v  [Pokemon Bank or direct]
Pokemon HOME
  |
  v
Compatible Switch games

* LGPE connects directly to HOME, not through Bank.
  LGPE Pokemon can only return to LGPE from HOME.
```

### VC Transfer Mechanics (Gen 1/2 to Gen 7+ via Poke Transporter)

When a Pokemon is transferred from Virtual Console Gen 1 or Gen 2 via Poke Transporter into Pokemon Bank, the following conversions occur:

#### Nature Assignment

**Formula:** `Nature = Total EXP mod 25`

The Pokemon's total accumulated experience points are divided by 25, and the remainder determines the nature. The nature index table (0=Hardy through 24=Quirky) maps the remainder to a specific nature. After transfer, the Pokemon's EXP is reset to the minimum for its current level.

This means nature can be precisely controlled before transfer by gaining or losing specific amounts of EXP. See the individual game docs for EXP manipulation techniques.

| Remainder | Nature | Stat+ | Stat- |
|-----------|--------|-------|-------|
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

Natures 0, 6, 12, 18, 24 are neutral (no stat modification). The stat columns show which stat is boosted (+10%) and reduced (-10%) for non-neutral natures.

#### IV Generation

IVs are **randomly generated** -- there is no deterministic DV-to-IV conversion formula. The original DVs (0-15 scale) are discarded entirely.

- **Standard species:** 3 random IVs are guaranteed to be 31 (perfect). The other 3 are random (0-31).
- **Mythical species (Mew, Celebi):** 5 random IVs are guaranteed to be 31.

All Stat Experience (EVs) are reset to 0.

#### Ball Conversion

Gen 1 and Gen 2 do not store which Poke Ball was used for capture. **All transferred Pokemon arrive in a standard Poke Ball.** There is no way to obtain a VC-origin Pokemon in any other ball type.

#### Hidden Ability Assignment

**All Pokemon transferred from VC receive their Hidden Ability slot.** This is one of the most significant benefits of VC transfers -- it is the only way to obtain certain species with their Hidden Ability in a Poke Ball with the Game Boy origin mark.

**Exception:** Species that had no Hidden Ability defined in Gen 7 will receive Ability Slot 1 instead. This is relevant for some species (e.g., Koffing received its HA Stench only in Gen 8 -- a Koffing transferred from VC would have Levitate, not Stench, and would NOT retroactively gain Stench when moved to Gen 8+).

#### Origin Mark

Transferred Pokemon receive the **Game Boy mark** (a small Game Boy icon), indicating Virtual Console origin. This mark is visible in Gen 7 games and in Pokemon HOME.

#### Gender Assignment

**Poke Transporter v1.3+** assigns gender based on the Pokemon's **Attack IV** using the same thresholds as Gen 2:

| Species Gender Ratio | Female if Attack DV is... |
|-----------------------|---------------------------|
| 87.5% male (7:1) | 0-1 |
| 75% male (3:1) | 0-3 |
| 50/50 (1:1) | 0-7 |
| 25% male (1:3) | 0-11 |

For genderless, male-only, or female-only species, gender is fixed regardless of DVs.

**Note:** Poke Transporter v1.2 (the initial release) assigned gender randomly. v1.3 corrected this to match Gen 2 mechanics. All current 3DS systems should have v1.3+.

#### The Shiny + Female Impossibility (87.5% Male Species)

In Gen 1/2, shininess requires specific DV values:
- **Defense DV:** 10
- **Speed DV:** 10
- **Special DV:** 10
- **Attack DV:** 2, 3, 6, 7, 10, 11, 14, or 15

For an 87.5% male species, a female requires Attack DV of **0 or 1**.

Since the minimum Attack DV for shininess is **2**, it is **mathematically impossible** for a Gen 1/2 shiny Pokemon of an 87.5% male species to be female. This affects the following Gen 1 species:

- Bulbasaur, Ivysaur, Venusaur (#001-003)
- Charmander, Charmeleon, Charizard (#004-006)
- Squirtle, Wartortle, Blastoise (#007-009)
- Eevee, Vaporeon, Jolteon, Flareon (#133-136)
- Omanyte, Omastar (#138-139)
- Kabuto, Kabutops (#140-141)
- Aerodactyl (#142)
- Snorlax (#143)

For these species from VC transfers, a collector must choose: **shiny OR female, never both.** This is a permanent, unavoidable constraint for VC-origin specimens. In Gen 3+ games, shiny and female are independent -- this impossibility is exclusive to the Gen 1/2 DV system.

**Other gender ratios CAN have shiny females from VC:**
- **75% male** (e.g., Abra, Machop, Growlithe): shiny female possible with Attack DV 2 or 3
- **50/50** (e.g., Pikachu, Rattata, Pidgey): shiny female possible with Attack DV 2, 3, 6, or 7
- **75% female** (e.g., Clefairy, Vulpix, Jigglypuff): shiny female possible with most shiny Attack DVs

Only the 87.5% male ratio creates the impossibility.

### Non-VC Transfer Notes

#### Gen 3 to Gen 4 (Pal Park)

- Requires a DS or DS Lite with GBA slot
- 6 Pokemon at a time
- 24-hour cooldown in Diamond/Pearl/Platinum (no cooldown in HGSS)
- Pokemon retain their ball, nature, IVs, EVs, moves, and ribbons
- Held items are transferred with the Pokemon
- One-way; cannot return to Gen 3

#### Gen 4 to Gen 5 (Poke Transfer)

- Uses DS Download Play between two DS systems
- 6 Pokemon at a time via a catching minigame
- Pokemon retain all data (ball, nature, IVs, EVs, moves, ribbons)
- Held items are NOT transferred (must be removed first)
- HM moves must be forgotten before transfer
- One-way; cannot return to Gen 4

#### Gen 5 to Gen 6/7 (Poke Transporter to Bank)

- Full box of 30 at a time
- Pokemon retain all data
- One-way to Bank; from Bank can go to XY, ORAS, SM, USUM
- Bank to HOME is also one-way

#### Pokemon HOME Compatibility

| Game | Direction | Notes |
|------|-----------|-------|
| Sword/Shield | Two-way | Species must be in SwSh national dex or DLC dex |
| Brilliant Diamond/Shining Pearl | Two-way | Limited to BDSP-available species |
| Legends: Arceus | Two-way | Limited to PLA-available species |
| Scarlet/Violet | Two-way | Species must be in SV or DLC dex |
| Let's Go Pikachu/Eevee | Two-way | Only LGPE-origin or GO-origin Kanto Pokemon; once sent elsewhere, cannot return |
| Pokemon GO | One-way in | Via GO Transporter; legendaries/mythicals require HOME registration |
| Pokemon Bank | One-way in | Cannot send Pokemon back to Bank from HOME |
| Legends: Z-A | Planned | Spring 2026; expected one-way from HOME into Z-A [NEEDS VERIFICATION] |

**Critical rule:** Pokemon can always move forward through the transfer chain but can never move backward to an earlier generation. Plan accordingly -- once a specimen leaves its origin game, it cannot return.

---

*Research conducted March 2026. Primary sources: Bulbapedia, Serebii. Data reflects game mechanics as of Pokemon Legends: Z-A + Mega Dimension DLC and Pokemon HOME v3.x.*

---

## 7. Methodology Retrospective

### What Was Produced
- 14 game-specific research documents (01 through 14)
- 3 synthesis documents (species summary, transfer routes, breeding guide)
- 1 overview document (this file)
- **Total: 16,939 lines across 18 documents**

### What Worked
- **Game-layered approach was correct.** Researching by game in playthrough order naturally built up species profiles and made the walkthrough checklists fall out organically.
- **Tiered species classification saved significant effort.** Tier 3 (common wild encounters) got lighter treatment without losing important data. Tier 1/2 species got the depth they needed.
- **Cross-referencing Bulbapedia + Serebii** caught inconsistencies. The [DISPUTED] and [NEEDS VERIFICATION] tags were used throughout.
- **Incremental game docs** (Yellow over Red/Blue, Crystal over G/S) avoided duplication while keeping each doc self-contained enough to use standalone.
- **The synthesis docs** (species summary, transfer routes, breeding guide) were invaluable — they transformed 14 game-scoped documents into collector-actionable reference material.

### What to Change for Phase 2 (Gen 2 Species, #152-251)
1. **Ribbon routing needs its own dedicated document.** Gen 3 contests, Gen 4 contests, Battle Tower ribbons, etc. are scattered across game docs. A ribbon routing guide per species (like the transfer routes doc) would be more useful.
2. **Egg move legacy tracking needs a structured database.** The breeding guide captures highlights but a full egg move × species × generation matrix is too large for markdown. Consider seeding this data into Alacrity's database instead.
3. **Nature recommendations were inconsistent.** Some species got Smogon-sourced nature advice, others didn't. Phase 2 should either commit to nature recommendations for every species or skip them entirely.
4. **Regional form research was thorough but scattered.** Consider a dedicated regional forms document that consolidates all regional form collector data in one place.
5. **Shiny lock data needs a master table.** Currently spread across game docs. A single "shiny lock reference" per species per game would be cleaner.

### Time and Scale Estimates
- Gen 1 (151 species, 14 games): 18 documents, ~17,000 lines
- Gen 2 (100 species, same 14 games): Estimate ~12,000 lines (fewer species, but Johto-native breeding chains add complexity)
- Gen 3-9 (remaining ~750 species): Scale depends on how many games each species appears in. Expect diminishing per-species effort as later-gen species appear in fewer games.
- **Recommended: one phase per generation, validate each before moving to the next.**

### Items Still Needing Verification
Search all game docs for `[NEEDS VERIFICATION]` and `[DISPUTED]` tags — these represent claims from single sources or conflicting information that should be verified before being used as authoritative data for Alacrity seeding.
