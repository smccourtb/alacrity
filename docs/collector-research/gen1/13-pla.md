# PLA (Pokemon Legends: Arceus) Collector Research

Pokemon Legends: Arceus (2022, Nintendo Switch) is a **radical mechanical departure** from every other mainline game. Set in ancient Hisui (proto-Sinnoh), PLA replaces turn-based wild battles with real-time action catching, eliminates breeding entirely, introduces Alpha Pokemon (oversized specimens with guaranteed high IVs), replaces EVs/IVs with effort levels, and features Hisuian regional forms -- including four Gen 1 species. The Hisui Pokedex contains **242 species**, of which roughly **46 are Gen 1 lines** (counting base forms, evolutions, and Hisuian variants).

**The headline features for collectors are Alpha Pokemon, Hisuian forms, mass outbreak shiny hunting, and space-time distortions.** Alpha Pokemon are larger specimens with at least 3 perfect IVs and unique collector status (they receive the Alpha Mark when transferred to Scarlet/Violet). Hisuian Growlithe/Arcanine and Voltorb/Electrode are the four Gen 1 species with Hisuian forms, obtainable only here or through transfer. Mass outbreaks provide the best shiny odds in the game at up to 1/128.49 (perfect research + Shiny Charm). Space-time distortions are the sole source for several species including Magnemite, Porygon, and the Gen 1 Eeveelutions in certain areas.

**PLA has no breeding, no held items, no abilities in the traditional sense, and a unique ball system.** Every specimen must be caught directly. The game uses a simplified stat system (effort levels 0-10) and a unique move mastery mechanic. All Pokemon carry the PLA origin mark -- a golden halo resembling Arceus's ring.

For BDSP mechanics (Poke Radar, Ramanas Park, Grand Underground), see [12-bdsp.md](12-bdsp.md). PLA shares the Sinnoh region conceptually but is mechanically unrelated.

---

## Section A: Game-Wide Mechanics

### A.1 Origin Mark

PLA Pokemon receive the **Arceus Mark** -- a golden halo-like decoration resembling the ring around Arceus's body. This mark is visible in Pokemon HOME and later games. It is unique to PLA and cannot be obtained in any other game.

### A.2 Catching Mechanics (REAL-TIME ACTION)

PLA fundamentally changes how Pokemon are caught. The player controls a trainer in a third-person open world and throws Poke Balls in real time at overworld Pokemon -- no mandatory battle encounter screen.

**Core mechanics:**
- Pokemon roam the overworld visibly -- you see them before engaging
- Throw Poke Balls directly at Pokemon from behind for **back strike** bonus (higher catch rate)
- Some Pokemon are docile and can be caught without battling; others are aggressive and must be battled first
- Stealth matters: crouching in tall grass, using Smoke Bombs, and approaching from behind increase catch success
- Heavy Balls work best on unaware Pokemon; Feather Balls fly farther for distant/airborne targets
- **No False Swipe / status move catching** -- catch rate is determined by ball type, back strike, awareness state, species catch rate, and level

**Collector implication:** Ball choice is a strategic decision at throw time, not a post-battle selection. The PLA ball system is entirely unique (see A.3).

### A.3 Ball Types

PLA introduces a unique ball system with three parallel lines, each with a different tactical role. These are **not the same balls** as in other games despite shared names -- they function differently and display as PLA-specific balls when transferred.

**Standard Line** (all-purpose):

| Ball | Catch Rate | Notes |
|------|-----------|-------|
| Poke Ball | 1x | Available from start |
| Great Ball | 1.5x | Unlocked mid-game |
| Ultra Ball | 2x | Unlocked late-game |

**Heavy Line** (high catch rate on unaware/stationary targets, poor range):

| Ball | Catch Rate (unaware) | Catch Rate (aware) | Notes |
|------|---------------------|-------------------|-------|
| Heavy Ball | 2x | 1x | Short range, drops quickly |
| Leaden Ball | 2.5x | 1x | Heavier version |
| Gigaton Ball | 3x | 1x | Highest catch rate in game on unaware targets |

**Feather Line** (long range, lower catch rate, good for flyers):

| Ball | Catch Rate | Notes |
|------|-----------|-------|
| Feather Ball | 1x | Flies far and fast |
| Wing Ball | 1.5x | Extended range |
| Jet Ball | 2x | Longest range in game |

**Special:**

| Ball | Use |
|------|-----|
| Origin Ball | Story item -- used to catch the final boss (Dialga/Palkia Origin Forme). Single use, guaranteed catch. |

**Collector note:** When PLA Pokemon are transferred to other games, their ball displays as the PLA variant (e.g., "Poke Ball (Hisui)"). In some receiving games, non-standard PLA balls may display as a "Strange Ball" since the ball IDs do not exist in those games' data. The ball selection is extremely limited compared to other modern games -- no Apricorn Balls, no Beast Balls, no Luxury Balls, no Dusk Balls, nothing cosmetic. Ball collecting in PLA is functionally irrelevant.

### A.4 Effort Levels (REPLACES EVs AND IVs)

PLA replaces both EVs and IVs with a single unified system: **effort levels**, scaled 0 to 10 per stat.

#### A.4.1 How Effort Levels Work

A Pokemon's **initial effort level** for each stat is derived from its underlying IV:

| IV Range | Starting Effort Level |
|----------|----------------------|
| 0-19 | 0 |
| 20-25 | 1 |
| 26-30 | 2 |
| 31 | 3 |

Effort levels can then be raised using **Grit items**:

| Item | Raises Levels | Source |
|------|--------------|-------|
| Grit Dust | 0 to 3 | Releasing Pokemon, defeating wild Pokemon |
| Grit Gravel | 3 to 6 | Releasing Pokemon, defeating Alphas |
| Grit Pebble | 6 to 9 | Releasing Pokemon, defeating Alphas |
| Grit Rock | 9 to 10 | Rare -- defeating Alphas, releasing high-level Pokemon |

#### A.4.2 Stat Bonus by Effort Level

| Level | Stat Bonus |
|-------|-----------|
| 0 | +0 |
| 1 | +2 |
| 2 | +3 |
| 3 | +4 |
| 4 | +7 |
| 5 | +8 |
| 6 | +9 |
| 7 | +14 |
| 8 | +15 |
| 9 | +16 |
| 10 | +25 |

#### A.4.3 Transfer Behavior

Effort levels are **PLA-exclusive data**. When a Pokemon is transferred to HOME, its effort levels are stored in the PLA-specific data set and are not visible or functional in other games. The underlying IVs (which determined the initial effort levels) are preserved and used normally in destination games. EVs are set to 0 upon transfer.

**Collector note:** Effort level training is purely for PLA in-game use. It has no impact on the specimen's value in other games.

### A.5 Alpha Pokemon (UNIQUE COLLECTOR MECHANIC)

Alpha Pokemon are **larger-than-normal specimens** with glowing red eyes, increased aggression, and guaranteed high stats. They are PLA's signature collector feature.

#### A.5.1 Properties

- **Size:** Significantly larger than normal specimens of the same species
- **Red eyes:** Visible in the overworld (disappear after capture)
- **Wild Might:** In battle, Alphas gain a stat boost independent of normal stat stages and take reduced damage from status conditions
- **Guaranteed IVs:** At least 3 stats will have IVs of 31 (translating to starting effort level 3)
- **Higher level:** Fixed Alphas spawn at higher levels than surrounding wild Pokemon

#### A.5.2 Alpha Mark on Transfer

When an Alpha Pokemon is transferred to Pokemon Scarlet/Violet, it receives the **Alpha Mark** -- a unique mark visible in the summary screen. The Pokemon is labeled "Former Alpha" in SV. **The Alpha's unique size does not carry over** to other games, but if returned to PLA via HOME, the Alpha size is restored.

The Alpha flag is stored in HOME's PLA data set. It persists through transfers -- HOME associates the alpha flag with the Pokemon's HOME tracker value. This means an Alpha caught in PLA will always be identifiable as a former Alpha.

**Collector value:** An Alpha-origin specimen is a genuine prestige item. The Alpha Mark in SV is exclusive to PLA-origin Alphas and cannot be obtained any other way. Combined with shiny status, an Alpha shiny from PLA is one of the rarer collector trophies in the series.

#### A.5.3 Fixed Alpha Spawns (Gen 1 Species)

These Alphas spawn at guaranteed locations and respawn after two in-game days if defeated/caught:

| Pokemon | Area | Notes |
|---------|------|-------|
| Alakazam | Obsidian Fieldlands | Fixed spawn |
| Rapidash | Obsidian Fieldlands | Fixed spawn |
| Magikarp | Obsidian Fieldlands | Fixed spawn |
| Gyarados | Obsidian Fieldlands | Fixed spawn |
| Raichu | Crimson Mirelands | Fixed spawn |
| Onix | Crimson Mirelands | Fixed spawn |
| Ninetales | Cobalt Coastlands | Fixed spawn |
| Golduck | Cobalt Coastlands | Fixed spawn |
| Tentacruel | Cobalt Coastlands | Fixed spawn |
| Chansey | Cobalt Coastlands | Fixed spawn |
| Gyarados | Cobalt Coastlands | Second fixed spawn location |
| Clefable | Coronet Highlands | Fixed spawn |
| Electabuzz | Alabaster Icelands | Fixed spawn |

#### A.5.4 Random Alphas

Any wild Pokemon has a small chance (0.2% to 2%) of spawning as an Alpha after the area's Noble Pokemon has been quelled. Random Alphas are rarer and their spawn rate varies by species.

### A.6 No Breeding

PLA has **no Daycare, no eggs, no breeding, no egg moves, no egg groups**. Every specimen must be caught directly in the wild, through space-time distortions, or via mass outbreaks.

**Collector implications:**
- No ball inheritance -- every specimen's ball is determined at catch time
- No IV breeding -- Alphas and space-time distortion spawns are the best IV sources
- No egg move specimens -- irrelevant since PLA has a unique move system
- No Masuda Method -- mass outbreaks replace breeding as the primary shiny method
- No nature breeding -- natures are set at spawn time with no external control (no Synchronize, no Everstone inheritance, no fortune teller)

### A.7 No Held Items / No Traditional Abilities

PLA removes both held items and the traditional ability system.

- Pokemon do not have abilities in PLA. When transferred to HOME and then to a game with abilities, they receive an ability based on their species data.
- Items exist in the bag but cannot be given to Pokemon to hold
- Mega Evolution, Z-Moves, and Dynamax do not exist in PLA

### A.8 Move System: Mastery, Agile/Strong Styles

PLA introduces a unique move system:

- **Move Tutor (Zisu):** The Training Grounds in Jubilife Village allow any Pokemon to learn any move in its moveset for a fee. No TMs/HMs exist.
- **Move Mastery:** Each move can be "mastered" by using it enough times in battle. A mastered move can be used in **Agile Style** (faster, weaker) or **Strong Style** (slower, stronger).
- **PLA-exclusive moves:** 24 new moves were introduced in PLA (see A.8.1). Move mastery data is stored in the PLA data set and does not transfer to other games.

#### A.8.1 PLA-Exclusive Moves Relevant to Gen 1 Species

Of the 24 new moves introduced in PLA, none are signature moves of Gen 1 species. However, several Gen 1 species can learn PLA-exclusive moves via the move tutor:

**Notable PLA-exclusive moves available to Gen 1 species:**
- **Raging Fury** (Fire, Physical, 90 BP) -- learnable by Arcanine (Hisuian)
- **Psyshield Bash** (Psychic, Physical, 70 BP) -- learnable by Mr. Mime **[NEEDS VERIFICATION]**
- **Power Shift** (Normal, Status) -- available to certain Gen 1 species via tutor **[NEEDS VERIFICATION]**

These moves exist only in PLA's data. When a Pokemon knowing a PLA-exclusive move is transferred to another game, the move is replaced or flagged as incompatible.

### A.9 Shiny Hunting

PLA offers several shiny hunting methods with varying odds. **Shiny Pokemon are visible in the overworld** with distinct audio cues (sparkle sound) and visual effects, similar to LGPE.

#### A.9.1 Shiny Odds Table (Complete)

The shiny roll system in PLA stacks bonuses additively. Base rate is 1 roll per encounter (1/4096). Each bonus adds extra rolls:

- **Research Level 10:** +1 roll
- **Perfect Research:** +3 rolls (includes the +1 from Lv. 10)
- **Shiny Charm:** +3 rolls
- **Mass Outbreak:** +25 rolls
- **Massive Mass Outbreak:** +12 rolls

| Method | Base | + Lv. 10 | + Perfect | + Lv. 10 + Charm | + Perfect + Charm |
|--------|------|----------|-----------|------------------|-------------------|
| Wild Encounter | 1/4096 | 1/2048 | 1/1024 | 1/819 | **1/585** |
| Massive Mass Outbreak | 1/315 | 1/293 | 1/256 | 1/241 | **1/216** |
| Mass Outbreak | 1/158 | 1/152 | 1/141 | 1/137 | **1/128** |

**Best possible odds: 1/128.49** (Mass outbreak + Perfect research + Shiny Charm). This is among the best non-guaranteed shiny rates in the series.

#### A.9.2 Mass Outbreaks

Mass outbreaks appear on the world map when traveling to/from Jubilife Village. Each area has a 20% chance of generating an outbreak per visit. An outbreak spawns 4 Pokemon of the same species at a time, with 10-15 total spawns per outbreak.

**How to farm:**
1. Travel to Jubilife Village
2. Check the map for outbreak icons
3. Travel to the outbreak area
4. Catch or defeat all spawns to cycle through the 10-15 pool
5. Return to village and repeat

#### A.9.3 Massive Mass Outbreaks (Daybreak Update)

Unlocked after completing the Daybreak questline (post-game). Massive mass outbreaks occur during rainstorms or snowstorms and feature **multiple simultaneous outbreaks** across an entire area.

**Key differences from regular outbreaks:**
- Time-limited: 7 minutes (75% chance), 9 minutes (15%), or 11 minutes (10%)
- Each outbreak node spawns 8-10 Pokemon
- **Second waves:** After clearing a node, there is a chance of a second wave spawning with 6-8 Pokemon. Second waves have an 81% chance of being evolved forms, 10% chance of being Alpha variants, and 9% chance of being evolved Alpha forms
- Lower per-encounter shiny odds than regular outbreaks, but higher total volume

#### A.9.4 Research Levels

Each species in PLA has research tasks (catch X, defeat X, use move Y against it, observe behavior Z, etc.). Completing enough tasks raises the species' research level:

- **Research Level 10:** Completes the Pokedex entry. Adds +1 shiny roll for that species.
- **Perfect Research:** Completing ALL research tasks for a species. Adds +3 total shiny rolls.

Reaching Research Level 10 for every species in the Hisui Pokedex is required to obtain the **Shiny Charm** from Professor Laventon.

#### A.9.5 Shiny Locks

**Shiny locked in PLA:**
- All Legendary Pokemon (Dialga, Palkia, Giratina, Arceus, Lake Trio, Heatran, Regigigas, Cresselia, Darkrai, Shaymin, etc.)
- Gift Pokemon (starter from Professor Laventon, the two unchosen starters gifted post-game)
- Certain static encounters during Missions and Requests (e.g., the Alpha Pokemon in Lake caves during Missions 14-16)
- The Peculiar Ponyta from Request 19 is a **guaranteed shiny** (scripted, not random)

**NOT shiny locked:**
- All wild encounters (overworld spawns)
- Mass outbreak spawns
- Massive mass outbreak spawns
- Space-time distortion spawns (including starters that appear there post-game)
- Random Alpha spawns

**Gen 1 shiny lock status:** No Gen 1 species are shiny locked in PLA. All Gen 1 species present in the game can be obtained as shinies through wild encounters, outbreaks, or space-time distortions.

### A.10 Transfer: PLA <-> HOME

PLA gained HOME connectivity on May 18, 2023. Transfer is **bidirectional** for compatible species.

**Key details:**
- PLA Pokemon carry the Arceus origin mark when viewed in HOME and other games
- Alpha status is preserved through HOME (displayed as Alpha Mark in SV)
- Effort levels, move mastery, and Zisu's tutor moves are stored only in the PLA data set
- PLA-exclusive ball types may display as "Strange Ball" in games that lack those ball IDs
- **Compatibility restriction:** Pokemon that have been transferred to Legends: Z-A become incompatible with PLA **[NEEDS VERIFICATION on exact restrictions]**

**Which games can receive PLA Pokemon:**
- Pokemon Scarlet/Violet (if the species exists in SV's data)
- Pokemon Sword/Shield (limited -- many PLA species including Hisuian forms are not in SwSh's data)
- Pokemon BDSP (limited to Gens 1-4 species, and PLA balls display as Strange Ball)

---

## Section B: Gen 1 Species in PLA

### B.1 Complete Gen 1 Species List

PLA contains approximately **46 Gen 1 species** (including pre-evolutions counted as separate entries and Hisuian forms). This is a limited roster -- roughly 30% of the original 151.

**Gen 1 species present in the Hisui Pokedex:**

| # | Species | Hisui # | Hisuian Form? |
|-----|---------|---------|---------------|
| 025 | Pikachu | #056 | No |
| 026 | Raichu | #057 | No |
| 035 | Clefairy | #200 | No |
| 036 | Clefable | #201 | No |
| 037 | Vulpix | #168 | No |
| 038 | Ninetales | #169 | No |
| 041 | Zubat | #034 | No |
| 042 | Golbat | #035 | No |
| 046 | Paras | #053 | No |
| 047 | Parasect | #054 | No |
| 054 | Psyduck | #068 | No |
| 055 | Golduck | #069 | No |
| 058 | Growlithe | #150 | **Yes -- Fire/Rock** |
| 059 | Arcanine | #151 | **Yes -- Fire/Rock** |
| 063 | Abra | #058 | No |
| 064 | Kadabra | #059 | No |
| 065 | Alakazam | #060 | No |
| 066 | Machop | #154 | No |
| 067 | Machoke | #155 | No |
| 068 | Machamp | #156 | No |
| 072 | Tentacool | #170 | No |
| 073 | Tentacruel | #171 | No |
| 074 | Geodude | #046 | No |
| 075 | Graveler | #047 | No |
| 076 | Golem | #048 | No |
| 077 | Ponyta | #023 | No |
| 078 | Rapidash | #024 | No |
| 081 | Magnemite | #177 | No |
| 082 | Magneton | #178 | No |
| 092 | Gastly | #136 | No |
| 093 | Haunter | #137 | No |
| 094 | Gengar | #138 | No |
| 095 | Onix | #118 | No |
| 100 | Voltorb | #192 | **Yes -- Electric/Grass** |
| 101 | Electrode | #193 | **Yes -- Electric/Grass** |
| 108 | Lickitung | #125 | No |
| 111 | Rhyhorn | #120 | No |
| 112 | Rhydon | #121 | No |
| 113 | Chansey | #087 | No |
| 122 | Mr. Mime | #077 | No |
| 123 | Scyther | -- | No |
| 125 | Electabuzz | #183 | No |
| 126 | Magmar | #175 | No |
| 129 | Magikarp | #080 | No |
| 130 | Gyarados | #081 | No |
| 133 | Eevee | #025 | No |
| 134 | Vaporeon | #026 | No |
| 135 | Jolteon | #027 | No |
| 136 | Flareon | #028 | No |
| 143 | Snorlax | #052 | No |

**Notable Gen 1 species NOT in PLA:** All starters (Bulbasaur/Charmander/Squirtle lines), Caterpie/Weedle lines, Pidgey line, Rattata line, Nidoran lines, Oddish line, Diglett line, Mankey line, Bellsprout line, Slowpoke line, Farfetch'd, Doduo line, Seel line, Grimer line, Shellder line, Drowzee line, Krabby line, Exeggcute line, Cubone line, Hitmonlee/Hitmonchan, Kangaskhan, Horsea line, Goldeen line, Staryu line, Tauros, Ditto, Porygon (overworld -- but see B.3), Aerodactyl, Dratini line, and all Gen 1 legendaries/mythicals (Articuno, Zapdos, Moltres, Mewtwo, Mew).

### B.2 Overworld Spawns by Area

#### B.2.1 Obsidian Fieldlands (First Area)

The starting area has the highest concentration of Gen 1 species, many available early:

| Pokemon | Sub-locations | Alpha? |
|---------|--------------|--------|
| Pichu | Various | No |
| Pikachu | Nature's Pantry, others | No |
| Zubat | Caves | No |
| Golbat | Caves | No |
| Paras | Nature's Pantry, Heartwood | No |
| Parasect | Various | No |
| Psyduck | Various water areas | No |
| Golduck | Various | No |
| Abra | Windswept Run | No |
| Kadabra | Sandgem Flats | No |
| Alakazam | Sandgem Flats | **Fixed Alpha** |
| Machop | Various | No |
| Machoke | Various | No |
| Geodude | Various rocky areas | No |
| Graveler | Various | No |
| Ponyta | Horseshoe Plains | No |
| Rapidash | Horseshoe Plains | **Fixed Alpha** |
| Gastly | Night only | No |
| Haunter | Night only | No |
| Chansey | Various | No |
| Mr. Mime | Various | No |
| Scyther | Grandtree Arena | No |
| Magikarp | Various water | **Fixed Alpha** |
| Gyarados | Lake Verity | **Fixed Alpha** |
| Eevee | Horseshoe Plains | No |
| Snorlax | Various | No |

#### B.2.2 Crimson Mirelands

| Pokemon | Notable Locations | Alpha? |
|---------|------------------|--------|
| Pichu / Pikachu / Raichu | Various | Raichu: **Fixed Alpha** |
| Zubat / Golbat | Caves | No |
| Paras / Parasect | Marshlands | No |
| Psyduck / Golduck | Water areas | No |
| Geodude / Graveler | Rocky areas | No |
| Gastly / Haunter / Gengar | Night, Shrouded Ruins | No |
| Onix | Bolderoll Slope | **Fixed Alpha** |
| Rhyhorn / Rhydon | Diamond Heath | No |
| Chansey | Various | No |
| Tangela | Gapejaw Bog | No |
| Lickitung | Shrouded Ruins | No |
| Eevee / Flareon | Various | No |
| Snorlax | Various | No |

#### B.2.3 Cobalt Coastlands

| Pokemon | Notable Locations | Alpha? |
|---------|------------------|--------|
| Pikachu | Various | No |
| Clefairy / Clefable | Tombolo Walk (night) | No |
| Vulpix / Ninetales | Firespit Island | Ninetales: **Fixed Alpha** |
| Paras / Parasect | Various | No |
| Psyduck / Golduck | Various water | Golduck: **Fixed Alpha** |
| **Growlithe (Hisuian)** | Windbreak Stand, Veilstone Cape | No |
| **Arcanine (Hisuian)** | Evolve, or Noble encounter | No |
| Machop / Machoke / Machamp | Castaway Shore | No |
| Tentacool / Tentacruel | Ocean areas | Tentacruel: **Fixed Alpha** |
| Geodude / Graveler / Golem | Rocky areas | No |
| Onix | Various | No |
| Rhydon | Various | No |
| Chansey | Various | **Fixed Alpha** |
| Tangela | Various | No |
| Mr. Mime | Tombolo Walk | No |
| Magmar | Firespit Island | No |
| Magikarp / Gyarados | Water areas | Gyarados: **Fixed Alpha** |
| Eevee / Vaporeon / Flareon | Various | No |

#### B.2.4 Coronet Highlands

| Pokemon | Notable Locations | Alpha? |
|---------|------------------|--------|
| Clefairy / Clefable | Fabled Spring | Clefable: **Fixed Alpha** |
| Zubat / Golbat | Caves | No |
| Paras / Parasect | Various | No |
| Psyduck / Golduck | Various | No |
| Machop / Machoke | Various | No |
| Geodude / Graveler / Golem | Rocky areas | No |
| Ponyta / Rapidash | Wayward Wood | No |
| Gastly / Haunter / Gengar | Sacred Plaza, night | No |
| Onix | Various caves | No |
| **Voltorb (Hisuian)** | Celestica Ruins, Sacred Plaza (in crates) | No |
| **Electrode (Hisuian)** | Evolve with Leaf Stone | No |
| Rhyhorn / Rhydon | Celestica Trail | No |
| Chansey | Various | No |
| Mr. Mime | Various | No |
| Scyther | Various | No |
| Electabuzz | Cloudcap Pass | No |
| Magmar | Various | No |
| Magikarp / Gyarados | Water areas | No |
| Eevee / Jolteon | Various | No |

#### B.2.5 Alabaster Icelands

| Pokemon | Notable Locations | Alpha? |
|---------|------------------|--------|
| Pikachu / Raichu | Various | No |
| Vulpix / Ninetales | Avalugg's Legacy area | No |
| Zubat / Golbat | Ice caves | No |
| Abra / Kadabra / Alakazam | Snowpoint Temple area | No |
| Machop / Machoke / Machamp | Various | No |
| Graveler | Various | No |
| Gastly / Haunter / Gengar | Night | No |
| Lickitung | Various | No |
| Chansey | Various | No |
| Scyther | Glacier Terrace | No |
| Electabuzz | Arena's Approach | **Fixed Alpha** |
| Magmar | Various | No |
| Eevee | Various | No |
| Snorlax | Snowfall Hot Spring | No |

### B.3 Space-Time Distortion Exclusives

Space-time distortions are **temporary rifts** that appear in each area after spending time exploring. They spawn rare Pokemon and items that are unobtainable through normal overworld exploration.

**Trigger mechanics:**
- Chance increases with time spent in an area: 10% at 5 min, 30% at 10 min, 50% at 15 min, 75% at 25 min, 100% at 40 min
- Cannot form during intense sun, snowstorms, or thunderstorms
- Disappear if you save and reload
- Duration varies; all spawned Pokemon are aggressive
- Pokemon despawn after ~20 seconds if not engaged
- Three rare spawn slots per distortion

**Gen 1 species in space-time distortions:**

| Pokemon | Area | Distortion-Exclusive? |
|---------|------|----------------------|
| Eevee | All areas | No (also overworld), but more common here |
| Leafeon | Obsidian Fieldlands | **Yes** |
| Sylveon | Obsidian Fieldlands | **Yes** (also Coronet Highlands distortions) |
| Haunter / Gengar | Obsidian Fieldlands | No (also night spawns) |
| Onix | Obsidian Fieldlands | No |
| Lickitung | Obsidian Fieldlands | No |
| Flareon | Crimson Mirelands | **Yes** (as distortion spawn) |
| Umbreon | Crimson Mirelands | **Yes** |
| Snorlax | Crimson Mirelands | No |
| Porygon | Crimson Mirelands | **Yes -- distortion exclusive** |
| Kadabra / Alakazam | Cobalt Coastlands | No |
| Rhydon | Cobalt Coastlands | No |
| Mr. Mime | Cobalt Coastlands | No |
| Vaporeon | Cobalt Coastlands | **Yes** (as distortion spawn) |
| Flareon | Cobalt Coastlands | **Yes** (as distortion spawn) |
| Magnemite / Magneton | Cobalt Coastlands | **Yes -- distortion exclusive** |
| Magmar | Coronet Highlands | No |
| Jolteon | Coronet Highlands | **Yes** (as distortion spawn) |
| Pikachu / Raichu | Alabaster Icelands | No (also overworld) |
| Rapidash | Alabaster Icelands | No |
| Scyther | Alabaster Icelands | No |
| Electabuzz | Alabaster Icelands | No |
| Espeon | Alabaster Icelands | **Yes** |
| Glaceon | Alabaster Icelands | **Yes** |

**Critical distortion-exclusive Gen 1 species:**
- **Porygon** (Crimson Mirelands only) -- the only source of Porygon in PLA
- **Magnemite / Magneton** (Cobalt Coastlands only) -- the only source in PLA

**Eeveelution distortion note:** While Eevee itself spawns in the overworld, several Eeveelutions are **only available as already-evolved forms** in space-time distortions. Since there is no breeding in PLA, distortions are the primary source for specific Eeveelutions (though Eevee can also be evolved manually using items/friendship/time of day).

### B.4 Mass Outbreak Species

Mass outbreaks can feature the following Gen 1 species (confirmed -- list may not be exhaustive):

**Obsidian Fieldlands:** Pichu, Pikachu, Zubat, Golbat, Paras, Parasect, Psyduck, Golduck, Abra, Kadabra, Ponyta, Rapidash, Chansey, Mr. Mime, Scyther, Magikarp, Gyarados, Eevee

**Crimson Mirelands:** Pikachu, Psyduck, Golduck, Geodude, Graveler, Onix, Rhyhorn, Rhydon, Tangela, Eevee, Snorlax

**Cobalt Coastlands:** Tentacool, Tentacruel, Machop, Machoke, Geodude, Graveler, Growlithe (Hisuian), Magikarp, Gyarados, Chansey

**Coronet Highlands:** Clefairy, Zubat, Golbat, Machop, Geodude, Graveler, Voltorb (Hisuian), Rhyhorn, Electabuzz, Magmar, Magikarp

**Alabaster Icelands:** Pikachu, Vulpix, Zubat, Golbat, Machop, Machoke, Snorlax, Electabuzz

**Massive mass outbreaks** can feature any species that appears in regular outbreaks for that area, plus additional species. Second waves may contain evolved forms or Alpha variants.

### B.5 Static / Quest Encounters

| Pokemon | Source | Notes |
|---------|--------|-------|
| Ponyta (shiny) | Request 19: "A Peculiar Ponyta" | **Guaranteed shiny** -- scripted encounter in Obsidian Fieldlands. The only guaranteed shiny in PLA. |
| Arcanine (Hisuian) | Noble Pokemon battle | Story encounter at Cobalt Coastlands. This is a boss battle, not a catch opportunity. |

---

## Section C: Hisuian Form Deep Dive

### C.1 Hisuian Growlithe (#058) and Hisuian Arcanine (#059)

#### C.1.1 Type and Stats

| Form | Type | Key Stat Differences |
|------|------|---------------------|
| Kantonian Growlithe | Fire | Atk 70, HP 55 |
| **Hisuian Growlithe** | **Fire/Rock** | Atk 75, HP 60 (slightly higher) |
| Kantonian Arcanine | Fire | BST 555 |
| **Hisuian Arcanine** | **Fire/Rock** | BST 555 (redistributed -- higher Atk, lower SpA) |

#### C.1.2 Abilities

In PLA, abilities are not active but are stored in the data:
- **Standard ability:** Intimidate (Kantonian) / **Rock Head** (Hisuian -- replaces Flash Fire)
- **Hidden ability:** Justified (Kantonian) / **Rock Head** (Hisuian)

**[NEEDS VERIFICATION]** PLA uses a placeholder ability system. When transferred to games with active abilities, Hisuian Growlithe/Arcanine receive Rock Head as their primary ability.

#### C.1.3 Where to Catch

- **Hisuian Growlithe:** Cobalt Coastlands -- Windbreak Stand, Veilstone Cape. Overworld spawns.
- **Hisuian Arcanine:** Evolve Hisuian Growlithe using a **Fire Stone**. No wild Hisuian Arcanine spawns outside the Noble encounter (which is a battle, not a catch).

**Kantonian Growlithe/Arcanine are NOT available in PLA.** Only the Hisuian form exists.

#### C.1.4 Evolution

Hisuian Growlithe evolves into Hisuian Arcanine via **Fire Stone** (same method as Kantonian, same stone).

#### C.1.5 Unique Moves

Hisuian Growlithe/Arcanine gain Rock-type coverage reflecting their dual typing:
- **Rock Slide** (learned by level-up)
- Access to Rock-type moves via the move tutor
- **Raging Fury** (PLA-exclusive Fire move) available to Hisuian Arcanine

### C.2 Hisuian Voltorb (#100) and Hisuian Electrode (#101)

#### C.2.1 Type and Stats

| Form | Type | Key Differences |
|------|------|----------------|
| Kantonian Voltorb | Electric | Standard Electric-type |
| **Hisuian Voltorb** | **Electric/Grass** | Same BST (330), gains Grass typing |
| Kantonian Electrode | Electric | Standard Electric-type |
| **Hisuian Electrode** | **Electric/Grass** | Same BST (490), gains Grass typing |

#### C.2.2 Abilities

- **Standard ability:** Soundproof / Static (Kantonian) / **Soundproof / Static** (Hisuian)
- **Hidden ability:** Aftermath (Kantonian) / **Aftermath** (Hisuian)

**[NEEDS VERIFICATION]** Ability assignments may differ when transferred to games with active ability systems.

#### C.2.3 Where to Catch

- **Hisuian Voltorb:** Coronet Highlands -- **Celestica Ruins and Sacred Plaza**, found inside wooden crates. Unique spawn mechanic: the Voltorb are disguised as item crates and must be approached.
- **Hisuian Electrode:** Evolve Hisuian Voltorb using a **Leaf Stone** (different from Kantonian, which evolves at level 30).

**Kantonian Voltorb/Electrode are NOT available in PLA.** Only the Hisuian form exists.

#### C.2.4 Unique Moves

Hisuian Voltorb/Electrode gain Grass-type coverage:
- **Energy Ball** (learned by level-up)
- **Bullet Seed** (level-up)
- **Grassy Terrain** (level 50)
- **Stun Spore** (unique to Hisuian form)
- **Chloroblast** (PLA-exclusive Grass move, 120 BP with recoil) -- available via tutor **[NEEDS VERIFICATION]**

### C.3 Breeding Hisuian Forms in Other Games

Since PLA has no breeding, the question becomes: can Hisuian forms be bred after transfer?

**In Pokemon Scarlet/Violet:**
- Hisuian Growlithe and Hisuian Voltorb **can be bred** using the Everstone mechanic
- A Hisuian form parent holding an Everstone will produce Hisuian offspring
- Without an Everstone, offspring default to the regional form native to Paldea (Kantonian for both lines)
- This means PLA-origin Hisuian specimens can be used as breeding stock in SV to produce more Hisuian forms

**In Pokemon Sword/Shield:**
- Hisuian Growlithe and Voltorb lines **cannot enter SwSh** (their species forms are not in SwSh's data)

**Collector value:** A Hisuian form with the PLA origin mark (Arceus Mark) is a genuine collector item -- it proves the specimen originated in the game where these forms were introduced. However, breeding in SV can produce Hisuian forms with the Paldea origin mark, diluting the exclusivity slightly.

### C.4 Collector Value of Hisuian Forms

| Attribute | Assessment |
|-----------|-----------|
| PLA-origin Hisuian Growlithe/Arcanine | High value -- original source game, Arceus Mark |
| PLA-origin Hisuian Voltorb/Electrode | High value -- original source game, Arceus Mark |
| SV-bred Hisuian form (via Everstone) | Moderate value -- Paldea mark, not "authentic" PLA origin |
| Shiny Hisuian form from PLA | Very high value -- mass outbreak hunting required, no breeding shortcut |
| Alpha Hisuian Growlithe from PLA | Very high value -- Alpha Mark + Hisuian form + PLA origin |

---

## Section D: Collector Walkthrough and Transfer

### D.1 PLA Progression for Gen 1 Collection

**Early game (Obsidian Fieldlands):**
1. Catch Ponyta, Eevee, Pikachu, Zubat, Paras, Psyduck, Abra, Geodude, Machop early
2. Magikarp and Gyarados available in water areas
3. Gastly/Haunter available at night
4. Chansey, Mr. Mime, Scyther available with exploration
5. Fixed Alpha Alakazam, Rapidash, Gyarados, Magikarp available from first visit
6. **Request 19:** Guaranteed shiny Ponyta (unique collectible)

**Mid-game (Crimson Mirelands + Cobalt Coastlands):**
7. Crimson Mirelands adds: Onix, Rhyhorn, Rhydon, Tangela, Lickitung, Snorlax
8. Begin watching for space-time distortions -- **Porygon** is distortion-exclusive in Crimson Mirelands
9. Cobalt Coastlands: **Hisuian Growlithe** at Windbreak Stand/Veilstone Cape (priority catch)
10. Cobalt Coastlands adds: Tentacool, Vulpix, Magmar, Clefairy
11. **Magnemite/Magneton** only in Cobalt Coastlands distortions

**Late game (Coronet Highlands + Alabaster Icelands):**
12. Coronet Highlands: **Hisuian Voltorb** at Celestica Ruins/Sacred Plaza (in crates)
13. Electabuzz and Magmar both available in Coronet Highlands
14. Alabaster Icelands adds: Vulpix/Ninetales, Snorlax, final species gaps
15. Space-time distortions in Alabaster Icelands for Scyther/Electabuzz and Eeveelutions

**Post-game:**
16. Shiny Charm available after completing all Pokedex entries to Research Level 10
17. Mass outbreaks and massive mass outbreaks become the primary farming loop
18. Remaining Eeveelutions via distortions or manual evolution
19. Evolve Hisuian Growlithe (Fire Stone) and Voltorb (Leaf Stone)

### D.2 Mass Outbreak Farming Strategy

**Optimal mass outbreak loop for shinies:**
1. Complete Research Level 10 (minimum) or Perfect Research (ideal) for your target species
2. Obtain the Shiny Charm (requires all Pokedex entries at Lv. 10)
3. Travel to Jubilife Village
4. Check map for outbreaks of your target species
5. If no target outbreak, return to village and re-enter the area (20% chance per area per visit)
6. When target outbreak appears: save before approaching, then catch/defeat all spawns
7. Listen for the shiny sparkle sound -- shinies are visible and audible in the overworld
8. With Perfect Research + Shiny Charm, each encounter in an outbreak has a 1/128 chance

**Time estimate:** At 1/128 per encounter with 10-15 encounters per outbreak, each outbreak has roughly a 7.5-11% chance of containing a shiny. Expect to reset outbreaks 10-15 times on average.

### D.3 Alpha Hunting Approach

**Fixed Alphas:**
- Visit the fixed Alpha locations listed in Section A.5.3
- Fixed Alphas respawn every 2 in-game days
- Save before engaging -- Alphas are aggressive and will attack
- Use Gigaton Balls from behind for best catch rate on unaware Alphas

**Random Alphas:**
- Any wild spawn has a 0.2-2% chance of being Alpha after the area's Noble is quelled
- Mass outbreaks can produce Alpha spawns (especially second waves of massive mass outbreaks)
- A shiny Alpha is extremely rare -- the shiny roll and Alpha roll are independent

**Shiny Alpha odds:** The shiny chance applies normally to Alpha spawns. A shiny Alpha in a mass outbreak with Perfect Research + Shiny Charm is approximately 1/128 (shiny) x 0.2-2% (Alpha) = roughly 1/6,400 to 1/64,000 per encounter. These are among the rarest specimens in the series.

### D.4 Space-Time Distortion Guide

**How to trigger distortions reliably:**
1. Enter any area and stay there without returning to camp
2. Move around actively (standing still may slow the timer)
3. After 5 minutes: 10% chance. After 40 minutes: guaranteed
4. "A space-time distortion seems to be forming!" announces the rift
5. Wait ~60 seconds for it to fully activate (a dome of distorted space appears)
6. Enter the dome -- rare Pokemon and items spawn inside

**Farming distortion-exclusive species (Porygon, Magnemite):**
1. Enter the correct area (Crimson Mirelands for Porygon, Cobalt Coastlands for Magnemite)
2. Move around and wait for a distortion to form
3. Quickly enter and check spawns -- focus on the 3 rare spawn slots
4. Rare spawns persist until caught, defeated, or the distortion ends
5. If the target doesn't appear, wait for the next distortion

**Tip:** Distortions also drop evolution items (Linking Cord for trade evolutions, elemental stones) and valuable items (Star Pieces, nuggets). Always check the ground inside distortions.

### D.5 Pre-Transfer Checklist

Before sending PLA Pokemon to HOME:

- [ ] **Effort levels:** Max to 10 if you want the specimen optimized for PLA use (irrelevant for other games)
- [ ] **Move mastery:** Master key moves if you want the data stored in the PLA save (does not transfer functionally)
- [ ] **Alpha status:** Verify Alpha flag is present (it persists through HOME -- this is permanent collector value)
- [ ] **Shiny status:** Complete any shiny hunts before transfer (PLA's outbreak odds are excellent)
- [ ] **Ball type:** Verify the ball is what you want -- PLA balls may display as "Strange Ball" in some games
- [ ] **Research tasks:** Complete research tasks before transferring specimens, as released/transferred Pokemon may affect task completion
- [ ] **Hisuian forms:** Ensure you have kept at least one Hisuian Growlithe and Voltorb in PLA for potential future use (they are breedable in SV but the PLA-origin mark adds value)
- [ ] **Porygon:** Since Porygon is distortion-exclusive, ensure you have enough before transferring
- [ ] **Eeveelutions:** Verify you have all 8 Eeveelutions if needed (several are distortion-dependent)

### D.6 Honest Assessment

**PLA is a niche but valuable source for Gen 1 collectors.** The limited roster (roughly 46 Gen 1 species out of 151) means PLA cannot serve as a primary Gen 1 collection game. However, it offers several things no other game can provide:

1. **Hisuian Growlithe/Arcanine and Voltorb/Electrode** -- the original source game for these forms. PLA-origin Hisuian specimens carry the Arceus Mark and represent the "authentic" origin.
2. **Alpha Mark** -- Alpha Pokemon transferred to SV receive a unique mark that cannot be obtained any other way. An Alpha shiny Hisuian Growlithe from PLA is a genuine trophy.
3. **Mass outbreak shiny hunting at 1/128** -- among the best shiny odds in the series, with overworld visibility. Excellent for shiny hunting the Gen 1 species that are present.
4. **Guaranteed shiny Ponyta** -- the only scripted shiny in PLA, from Request 19. A unique collectible.
5. **The Arceus origin mark** -- PLA-exclusive, a distinct collector attribute.

**What PLA does NOT offer:**
- No breeding (all specimens must be caught)
- No nature control (no Synchronize, no fortune teller, no Everstone breeding)
- No Apricorn Balls, special balls, or ball variety
- No abilities (stored but not functional in PLA)
- No held items
- Very limited Gen 1 roster -- missing all starters, most early-route Pokemon, all legendaries
- No competitive optimization tools beyond effort levels

**Priority targets from PLA:** Hisuian Growlithe, Hisuian Voltorb, Alpha specimens of any Gen 1 species (especially shiny Alphas), Porygon (distortion-exclusive), the guaranteed shiny Ponyta, and Magnemite (distortion-exclusive).
