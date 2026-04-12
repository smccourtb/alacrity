# Gen 9 (Scarlet/Violet + DLC) Collector Research

Pokemon Scarlet and Violet (2022, Nintendo Switch) and their two DLC expansions -- The Teal Mask (September 2023) and The Indigo Disk (December 2023) -- represent the **current endpoint of the collection**. Gen 9 introduces the **Terastal phenomenon** (any Pokemon can have any of 19 Tera Types, adding an entirely new axis of collector variation), **size marks** (wild Pokemon have a 0-255 scale value, with the extremes 0 and 255 earning the Mini Mark and Jumbo Mark respectively), the **Mirror Herb egg move transfer** (egg moves can now be learned without breeding), and the full return of the **mark system** from SwSh with several new marks. The combined Paldea + Kitakami + Blueberry Pokedex covers **approximately 664 species**, of which roughly **63 are Gen 1 lines** (counting base forms, evolutions, and Paldean Tauros breeds).

**The headline features for collectors are Tera Types, size marks, and the Item Printer.** Tera Types create 19 possible variants for every catchable species (18 standard types plus the exclusive Stellar type), and while Tera Type can be changed via Tera Shards, the original Tera Type at catch time is a collector consideration. Size marks (Mini and Jumbo) are extremely rare -- a scale value of exactly 0 or exactly 255 on a triangular distribution -- making them among the most prestigious catch attributes in the series. The Item Printer in the Indigo Disk DLC is the primary renewable source for rare balls (all Apricorn Balls, Beast Ball, Dream Ball, Safari Ball, Sport Ball), making SV one of the best modern games for ball collecting.

**SV is missing a significant number of Gen 1 species.** Approximately 50-55 Gen 1 Pokemon (counting full evolutionary lines) are completely absent from SV -- they cannot be caught, transferred, or used in-game. Only Mewtwo and Mew are present as transfer-only (via Pokemon HOME). The three Kanto legendary birds (Articuno, Zapdos, Moltres) return via Snacksworth encounters in the Indigo Disk post-game. Paldean Tauros (three breeds: Combat, Blaze, Aqua) is the only Gen 1 species with a Paldean regional form.

For PLA mechanics (Alpha Pokemon, Hisuian forms, space-time distortions), see [13-pla.md](13-pla.md). For SwSh marks and Galarian forms, see [11-gen8-swsh.md](11-gen8-swsh.md).

---

## Section A: Game-Wide Mechanics

### A.1 Origin Mark

All Pokemon caught or hatched in Scarlet and Violet receive the **Paldea origin mark** -- a symbol resembling the Terastal phenomenon crystal / Tera Jewel. This is a **single unified mark** for the entire game: there is no distinction between Pokemon caught in the Paldea base game, the Kitakami region (Teal Mask DLC), or the Terarium at Blueberry Academy (Indigo Disk DLC). All receive the same SV origin mark.

When SV Pokemon are transferred to earlier games (e.g., SwSh) via HOME, they temporarily display the Galar symbol but regain their proper origin mark when returned to HOME.

### A.2 Tera Types (NEW -- CRITICAL FOR COLLECTORS)

The Terastal phenomenon is Gen 9's signature battle mechanic and has significant collector implications. Every Pokemon has a **Tera Type** -- a secondary type designation that activates when the Pokemon Terastallizes in battle, temporarily changing its defensive typing and boosting moves of the Tera Type.

#### A.2.1 Core Rules

- Every Pokemon has exactly one Tera Type
- There are **19 possible Tera Types**: the 18 standard types (Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy) plus the exclusive **Stellar** type
- Tera Type is visible in the summary screen as a jewel icon
- Tera Type is stored permanently on the Pokemon and persists through transfer to HOME

#### A.2.2 How Tera Types Are Assigned

**Wild Pokemon:** Typically have a Tera Type matching one of their base types. A wild Charmander will usually have a Fire Tera Type. Standard wild encounters do not have randomly assigned off-type Tera Types.

**Wild Tera Pokemon:** 68 fixed locations across Paldea feature special glowing wild Pokemon that immediately Terastallize when encountered. These have **non-standard Tera Types** (different from their base types) and guaranteed 3+ perfect IVs (31). They respawn daily. These are the only wild source of off-type Tera Pokemon.

**Tera Raid Battles:** Raids offer Pokemon with specific Tera Types, often non-standard. Raid crystals rotate daily. Tera Raids are the primary renewable source of off-type Tera Pokemon.

**Eggs/Breeding:** Hatched Pokemon inherit a Tera Type matching one of the species' base types (random selection between types for dual-types). Tera Type is NOT inherited from parents.

**Stellar Tera Type:** The 19th type, exclusive to certain special encounters. Stellar-type Terastallization boosts all types once rather than boosting one type repeatedly. Available on Terapagos and through certain 7-star event raids.

#### A.2.3 Changing Tera Type

After defeating the **Medali Gym** (Normal-type gym), the player unlocks the ability to change a Pokemon's Tera Type at the **Treasure Eatery** restaurant in Medali. The cost is **50 Tera Shards** of the desired type. Tera Shards are obtained primarily from Tera Raid battles (the raid drops shards matching its Tera Type).

**Exceptions:** Ogerpon and Terapagos cannot have their Tera Type changed.

#### A.2.4 Collector Implications

Tera Type adds a 19th axis of variation to every specimen. For collectors:

- **Original Tera Type matters:** While Tera Type can be changed, the *original* Tera Type at catch time is a provenance detail. A Pikachu caught with a Flying Tera Type from a wild Tera encounter is more "authentic" than one whose type was changed via shards.
- **Non-standard Tera Types are premium:** A Charizard with a Dragon Tera Type caught from a raid is more interesting than one with the default Fire.
- **Stellar Tera Type is exclusive:** Only obtainable through specific event raids -- cannot be set via Tera Shards at the restaurant.
- **Tera Type does NOT affect shiny status, IVs, nature, marks, or any other attribute.** It is purely additive.
- **Tera Type persists through HOME transfer** and is visible in HOME and destination games.

### A.3 Size Marks (NEW -- CRITICAL FOR COLLECTORS)

Gen 9 introduces a **visible size system** with associated marks for extreme specimens. Every Pokemon has a **scale value** from 0 to 255 that determines its displayed size.

#### A.3.1 Scale Value Generation

The scale value uses a **triangular distribution**: two random numbers (0-127 and 0-128) are added together. This produces a bell curve centered around 127-128, making average-sized Pokemon far more common than extreme sizes.

- Values near 0 (tiny) and 255 (huge) are extremely rare
- The exact probability of scale 0 is 1/16,384 (1/128 x 1/128)
- The exact probability of scale 255 is 1/16,512 (1/128 x 1/129)
- Pokemon transferred from older games without scale data receive a randomly generated scale value

#### A.3.2 Size Categories

| Category | Scale Range | Mark |
|----------|------------|------|
| XXXS | 0 | **Mini Mark** ("the Teeny") |
| XXS | 1-24 | None |
| XS | 25-59 | None |
| S | 60-99 | None |
| M | 100-155 | None |
| L | 156-195 | None |
| XL | 196-230 | None |
| XXL | 231-254 | None |
| XXXL | 255 | **Jumbo Mark** ("the Great") |

#### A.3.3 Obtaining Size Marks

Size marks are NOT automatically applied. The player must show the Pokemon to a **Hiker NPC** who appears in various locations. If the Pokemon has a scale of 0, it receives the Mini Mark. If the scale is 255, it receives the Jumbo Mark. The Hiker will comment on the size and apply the mark.

**Former Titan Pokemon** always have a scale value of 255 (XXXL) and are guaranteed the Jumbo Mark when shown to the Hiker. However, Titan Pokemon are one-per-save static encounters and cannot have standard wild marks.

#### A.3.4 Meal Power and Size

Sandwich Meal Powers can influence wild Pokemon size odds, increasing the chance of encountering extreme-size specimens. This does NOT affect eggs, raid catches, or gift Pokemon.

#### A.3.5 Collector Implications

- Size marks are **new to Gen 9** and represent the rarest catch attribute in the series alongside the Rare Mark
- A shiny Pokemon with a Mini or Jumbo Mark is extraordinarily rare -- approximately 1/67,000,000 probability (1/4096 shiny x 1/16,384 size, without any boosting)
- Size marks stack with personality/time/weather marks on the same Pokemon -- a Pokemon can have BOTH a personality mark AND a size mark
- Size is visible in the summary screen and in HOME
- Size marks persist through transfer

### A.4 Marks (EXPANDED FROM SWSH)

The mark system returns from Sword/Shield with the same core mechanics plus several new marks exclusive to Gen 9.

#### A.4.1 Returning Mark System

All marks from SwSh return with identical mechanics:
- **Time Marks** (Dawn, Lunchtime, Dusk, Sleepy-Time): 1/50 each based on time of encounter
- **Weather Marks** (Cloudy, Rainy, Stormy, Snowy, Blizzard, Dry, Sandstorm, Misty): 1/50 each based on weather
- **Personality Marks** (28 total): ~1/100 chance for any, ~1/2800 for a specific one
- **Uncommon Mark** ("the Sociable"): 1/50
- **Rare Mark** ("the Recluse"): 1/1000
- Same eligibility rules: wild encounters only, not eggs/raids/gifts/static encounters

#### A.4.2 New Marks in Gen 9

| Mark | Title | How Obtained | Notes |
|------|-------|-------------|-------|
| **Jumbo Mark** | the Great | Hiker NPC (scale 255) | Size-based, see A.3 |
| **Mini Mark** | the Teeny | Hiker NPC (scale 0) | Size-based, see A.3 |
| **Gourmand Mark** | (varies) | Encountered while Pokemon is eating | Wild encounter condition |
| **Itemfinder Mark** | (varies) | Pokemon found holding an item | Wild encounter condition |
| **Partner Mark** | (varies) | Specific conditions | Gift/trade related |
| **Titan Mark** | the Titan | Titan Pokemon (story bosses) | Guaranteed on Titan recatch |
| **Mightiest Mark** | the Unrivaled | 7-star Tera Raid events | Guaranteed on event raid catches |
| **Alpha Mark** | (former Alpha) | Transfer from PLA | PLA-origin Alphas only |
| **Destiny Mark** | the Pokemon of Destiny | Wild encounters | Was in SwSh data but unobtainable; now active in Gen 9 |

#### A.4.3 Mark Eligibility in Gen 9

**CAN have marks:**
- Standard wild encounters (overworld Pokemon)
- Let's Go auto-battle knocked-out Pokemon still roll for marks if caught normally
- Titan Pokemon (guaranteed Titan Mark only)
- 7-star event raid Pokemon (guaranteed Mightiest Mark only)

**CANNOT have marks:**
- Standard Tera Raid catches (1-6 star)
- Wild Tera Pokemon (the 68 fixed glowing spawns)
- Hatched Pokemon / eggs
- Gift Pokemon
- In-game trade Pokemon
- Static encounters (Koraidon/Miraidon, box legendaries, Treasures of Ruin, etc.)

#### A.4.4 Mark + Size Mark Stacking

A single Pokemon can have BOTH a standard mark (personality/time/weather) AND a size mark (Mini or Jumbo). Size marks occupy a separate "slot" from standard marks. This means the ultimate collector specimen is: **shiny + personality mark + size mark** -- a probability so low it is practically unreachable through normal play.

### A.5 Picnic Breeding

Gen 9 replaces the traditional Daycare/Nursery with the **Picnic** system for open-world breeding.

#### A.5.1 How It Works

- Open a Picnic anywhere in the overworld
- If two compatible Pokemon are in the party, eggs occasionally appear in the picnic basket
- Standard egg group and gender rules apply (or Ditto as universal partner)
- Pick up eggs from the basket; they hatch by walking as normal
- **Egg Power** sandwiches increase egg generation rate

#### A.5.2 Egg Mechanics

- IVs: Standard inheritance (3 random IVs from parents with Destiny Knot, 5 IVs)
- Nature: Everstone inheritance works as normal
- Ability: Standard HA inheritance rules (female or either parent with Ditto)
- Ball: Female parent's ball inherited (or male's ball when breeding with Ditto)
- Shiny: Masuda Method active (different-language parents)
- Tera Type: NOT inherited -- randomly assigned from species' base types

#### A.5.3 Mirror Herb Egg Move Transfer (NEW -- SIGNIFICANT)

Gen 9 introduces a revolutionary change to egg move distribution via the **Mirror Herb** held item.

**Mechanic:**
1. Pokemon A knows an egg move that Pokemon B can learn
2. Pokemon B holds a Mirror Herb and has an **empty move slot**
3. Both Pokemon A and B are placed in the same Picnic
4. Pokemon B automatically copies the egg move from Pokemon A

**Critical rules:**
- The two Pokemon do **NOT** need to be in the same Egg Group
- The two Pokemon do **NOT** need to be different genders
- They DO need to be the **same species** (or same evolutionary line) for the transfer to occur
- The Mirror Herb is **NOT consumed** -- it can be reused indefinitely
- The receiving Pokemon must have an empty move slot (use the Move Reminder to delete a move first)

**Collector implication:** This dramatically simplifies egg move distribution. Previously, getting a specific egg move onto a species required careful breeding chain planning across egg groups. Now, any Pokemon with the right egg move can transfer it directly to a same-species partner at a picnic. This means egg move specimens are much easier to create in Gen 9 than in any prior generation, reducing their scarcity value somewhat.

### A.6 Shiny Hunting

Gen 9 offers multiple shiny hunting methods. Shiny Pokemon are visible in the overworld with distinct sparkle effects and audio cues.

#### A.6.1 Base Rate

**1/4096** (standard since Gen 6), with the following modifiers:

#### A.6.2 Shiny Charm

Obtained by completing the Paldea Pokedex (400 species). Adds **2 extra shiny rolls** per encounter, bringing the effective rate to approximately **1/1365**.

#### A.6.3 Masuda Method (Breeding)

Breeding two Pokemon from different real-world language saves:
- Without Shiny Charm: **6/4096** (~1/683)
- With Shiny Charm: **8/4096** (~1/512)

The Masuda Method remains the most reliable targeted shiny hunting approach in Gen 9.

#### A.6.4 Mass Outbreaks

Mass outbreaks return from PLA and provide bonus shiny rolls based on Pokemon defeated/caught within the outbreak:

| Pokemon Cleared | Extra Rolls | Base Rate | With Shiny Charm |
|----------------|-------------|-----------|-----------------|
| 0-29 | 0 | 1/4096 | 1/1365 |
| 30-59 | +1 | 1/2048 | 1/1024 |
| 60+ | +2 | 1/1365 | 1/819 |

#### A.6.5 Sparkling Power (Sandwiches)

The most powerful shiny-boosting method in Gen 9. Sandwiches made with **Herba Mystica** ingredients can grant Sparkling Power, which adds extra shiny rolls for wild encounters of a specific type. Sparkling Power lasts 30 minutes and affects **only wild encounters** (not eggs, not raids).

| Sparkling Power Level | Extra Rolls | Base Rate | With Shiny Charm |
|----------------------|-------------|-----------|-----------------|
| Level 1 | +1 | 1/2048 | 1/1024 |
| Level 2 | +2 | 1/1365 | 1/819 |
| Level 3 | +3 | 1/1024 | 1/683 |

#### A.6.6 Stacking Bonuses

The maximum shiny odds are achieved by stacking all bonuses:
- **Mass Outbreak (60+) + Sparkling Power 3 + Shiny Charm** = up to **1/512** (8 extra rolls total)

This is the best non-guaranteed shiny rate in the mainline series.

#### A.6.7 Shiny Locks

The following are **shiny locked** in SV (cannot be shiny under any circumstances):
- **Starter Pokemon** (Sprigatito/Fuecoco/Quaxly) from the opening selection
- **Koraidon / Miraidon** (box legendaries)
- **Treasures of Ruin** (Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu)
- **Ogerpon** (Teal Mask DLC)
- **Loyal Three** (Okidogi, Munkidori, Fezandipiti -- Teal Mask DLC)
- **Terapagos** (Indigo Disk DLC)
- **Pecharunt** (epilogue)
- **Gift Pokemon** (starters, in-game trades)

**NOT shiny locked (can be shiny):**
- **Snacksworth legendary encounters** (Articuno, Zapdos, Moltres, and all 25 returning legendaries) -- these are standard wild encounters and are **not shiny locked**
- Wild encounters, mass outbreaks, Tera Raids (standard 1-6 star)
- Bred/hatched Pokemon

**Critical note for Gen 1 collectors:** The Kanto legendary birds from Snacksworth encounters CAN be shiny. This is one of the few opportunities to obtain shiny Kanto Articuno, Zapdos, and Moltres as wild encounters in a modern game.

### A.7 Poke Balls

Gen 9 does **not** introduce any new Poke Ball types. However, the combined availability across the base game and DLC provides access to nearly the complete modern ball collection.

#### A.7.1 Standard Balls (Purchasable at Poke Marts)

| Ball | Effect | Availability |
|------|--------|-------------|
| Poke Ball | 1x catch rate | All Poke Marts from start |
| Great Ball | 1.5x | Poke Marts after 3 badges |
| Ultra Ball | 2x | Poke Marts after 5 badges |
| Premier Ball | 1x (cosmetic) | Buy 10+ Poke Balls at a shop |

#### A.7.2 Specialty Balls (Purchasable)

| Ball | Effect | Where to Buy |
|------|--------|-------------|
| Nest Ball | Better on lower-level Pokemon | Poke Marts (mid-game) |
| Net Ball | 3.5x on Water/Bug types | Poke Marts (mid-game) |
| Dive Ball | 3.5x on water-surface Pokemon | Poke Marts (mid-game) |
| Dusk Ball | 3x at night or in caves | Poke Marts (mid-game) |
| Timer Ball | Better as turns pass (max 4x at 10 turns) | Poke Marts (late-game) |
| Quick Ball | 5x on first turn | Poke Marts (late-game) |
| Repeat Ball | 3.5x on already-caught species | Poke Marts (late-game) |
| Luxury Ball | 1x catch rate, double friendship gain | Poke Marts (late-game) |
| Heal Ball | 1x catch rate, full heal on catch | Poke Marts |

#### A.7.3 Rare Balls (Item Printer -- Indigo Disk DLC)

The **Item Printer** at Blueberry Academy is the primary renewable source for rare balls. Its **Poke Ball Lotto** bonus feature can produce:

**Rainbow rarity (~1.75% each):**

| Ball | Collector Significance |
|------|----------------------|
| Fast Ball | Apricorn Ball -- rare cosmetic |
| Level Ball | Apricorn Ball -- rare cosmetic |
| Lure Ball | Apricorn Ball -- rare cosmetic |
| Heavy Ball | Apricorn Ball -- rare cosmetic |
| Love Ball | Apricorn Ball -- rare cosmetic |
| Friend Ball | Apricorn Ball -- rare cosmetic |
| Moon Ball | Apricorn Ball -- rare cosmetic |
| Safari Ball | Extremely rare in modern games |
| Sport Ball | Extremely rare in modern games |
| Dream Ball | Rare cosmetic |
| Beast Ball | 0.1x catch rate on non-Ultra Beasts, extreme cosmetic prestige |

**Silver rarity (~2% each):** Net Ball, Dive Ball, Nest Ball, Repeat Ball, Timer Ball, Dusk Ball, Quick Ball, Ultra Ball

**Collector note:** The Item Printer makes SV one of the best games in the series for ball collecting. All Apricorn Balls, Beast Ball, Safari Ball, Sport Ball, and Dream Ball are available as renewable (if rare) drops. Combined with standard shop balls, SV provides access to virtually the complete modern ball collection. The only notable absences are the **Master Ball** (one per save from story, plus possible event distributions) and generation-specific balls (Origin Ball from PLA, Park Ball, etc.).

#### A.7.4 Porto Marinada Auctions

The Porto Marinada market auctions rotate daily and can include rare items. Auctions are a secondary source for some specialty balls and items, though the Item Printer is more efficient for ball farming.

### A.8 Ribbons

Gen 9 introduces a small number of new ribbons:

#### A.8.1 New Ribbons in Gen 9

| Ribbon | How to Obtain | Notes |
|--------|-------------|-------|
| **Paldea Champion Ribbon** | Defeat the Pokemon League or win the Academy Ace Tournament | League ribbon for the Paldea region |
| **Once-in-a-Lifetime Ribbon** | Surprise Trade (1/100 chance per trade) | Extremely rare random ribbon |
| **Partner Ribbon** | Trading in the League Club (Indigo Disk) | Social feature ribbon |

#### A.8.2 Returning Ribbons Obtainable in Gen 9

| Ribbon | How to Obtain |
|--------|-------------|
| Effort Ribbon | Show a fully EV-trained Pokemon to NPC in Levincia |
| Best Friends Ribbon | Show a max-happiness Pokemon to NPC in Cascarrafa |
| Master Rank Ribbon | Defeat a trainer in Master Ball tier Ranked Battle |

#### A.8.3 Event Ribbons

Various event ribbons (Classic, Premier, Event, Birthday, Special, Souvenir, Wishing) can be distributed through Mystery Gift distributions. These are time-limited and cannot be obtained after their distribution window.

**Collector note:** The Paldea Champion Ribbon is the standard league completion ribbon. The Once-in-a-Lifetime Ribbon is a unique collector prize due to its 1/100 Surprise Trade probability. The Hisui Ribbon (from PLA photo studio participation) is also recognized in SV for transferred Pokemon.

### A.9 Paldean Forms (GEN 1 IMPACT: TAUROS ONLY)

Only one Gen 1 species received a Paldean regional form: **Tauros (#128)**, which has three distinct Paldean breeds. See Section D for a deep dive.

The other Paldean forms are:
- Paldean Wooper (Poison/Ground) -- Gen 2 species
- Clodsire (evolution of Paldean Wooper) -- new species

No other Gen 1 species received Paldean forms.

---

## Section B: Gen 1 Species Availability in SV

### B.1 Availability Summary

Gen 1 species in SV are spread across three regions and multiple acquisition methods. The following table covers all Gen 1 species (National Dex #1-151) present in SV in any form.

**Legend:**
- **P** = Paldea (base game wild encounter)
- **K** = Kitakami (Teal Mask DLC wild encounter)
- **B** = Blueberry Academy Terarium (Indigo Disk DLC wild encounter)
- **R** = Tera Raid battles
- **S** = Snacksworth encounter (Indigo Disk post-game)
- **T** = Transfer only (Pokemon HOME)
- **E** = Evolution only (not wild, must evolve from caught form)

#### B.1.1 Gen 1 Species Present in SV

| # | Species | Where | Notes |
|---|---------|-------|-------|
| 001 | Bulbasaur | B | Terarium (after biome upgrade) |
| 002 | Ivysaur | B, E | Wild in Terarium or evolve |
| 003 | Venusaur | B, E | Wild in Terarium or evolve |
| 004 | Charmander | B | Terarium (after biome upgrade) |
| 005 | Charmeleon | B, E | Wild in Terarium or evolve |
| 006 | Charizard | B, E, R | Wild in Terarium or Tera Raids |
| 007 | Squirtle | B | Terarium (after biome upgrade) |
| 008 | Wartortle | B, E | Wild in Terarium or evolve |
| 009 | Blastoise | B, E, R | Wild in Terarium or Tera Raids |
| 025 | Pikachu | P, K | Multiple Paldea locations + Kitakami |
| 026 | Raichu | P, E | Evolve Pikachu (Thunder Stone) |
| 035 | Clefairy | K | Kitakami |
| 036 | Clefable | K, E | Kitakami or evolve (Moon Stone) |
| 039 | Jigglypuff | P | Paldea wild |
| 040 | Wigglytuff | P, E | Evolve (Moon Stone) |
| 043 | Oddish | B | Terarium |
| 044 | Gloom | B, E | Terarium or evolve |
| 045 | Vileplume | B, E | Evolve (Leaf Stone) |
| 050 | Diglett | P, B | Paldea + Terarium |
| 051 | Dugtrio | P, B, E | Paldea + Terarium |
| 052 | Meowth | P | Paldea wild |
| 053 | Persian | P, E | Evolve Meowth |
| 054 | Psyduck | P | Paldea wild (multiple locations) |
| 055 | Golduck | P, E | Evolve Psyduck |
| 056 | Mankey | P, K | Paldea + Kitakami |
| 057 | Primeape | P, K, E | Paldea + Kitakami |
| 058 | Growlithe | P, K | Paldea + Kitakami |
| 059 | Arcanine | P, K, E | Paldea + Kitakami (Fire Stone) |
| 060 | Poliwag | K | Kitakami |
| 061 | Poliwhirl | K, E | Kitakami or evolve |
| 062 | Poliwrath | K, E | Evolve (Water Stone) |
| 074 | Geodude | K | Kitakami |
| 075 | Graveler | K, E | Kitakami or evolve |
| 076 | Golem | K, E | Trade evolution |
| 079 | Slowpoke | P | Paldea wild |
| 080 | Slowbro | P, E | Evolve Slowpoke |
| 081 | Magnemite | P, B | Paldea + Terarium |
| 082 | Magneton | P, B, E | Paldea + Terarium |
| 088 | Grimer | B | Terarium |
| 089 | Muk | B, E | Evolve Grimer |
| 090 | Shellder | P | Paldea wild |
| 091 | Cloyster | P, E | Evolve (Water Stone) |
| 092 | Gastly | P, K | Paldea + Kitakami |
| 093 | Haunter | P, K, E | Paldea + Kitakami |
| 094 | Gengar | P, K, E | Trade evolution |
| 096 | Drowzee | P | Paldea wild |
| 097 | Hypno | P, E | Evolve Drowzee |
| 100 | Voltorb | P | Paldea wild |
| 101 | Electrode | P, E | Evolve Voltorb |
| 102 | Exeggcute | B | Terarium |
| 103 | Exeggutor | B, E | Terarium or evolve (Leaf Stone) |
| 109 | Koffing | K | Kitakami |
| 110 | Weezing | K, E | Evolve Koffing |
| 113 | Chansey | B | Terarium |
| 116 | Horsea | B | Terarium |
| 117 | Seadra | B, E | Terarium or evolve |
| 123 | Scyther | B | Terarium |
| 128 | Tauros | P | **Paldean forms only** (see Section D) |
| 129 | Magikarp | P, K | Paldea + Kitakami |
| 130 | Gyarados | P, K, E | Paldea + Kitakami |
| 131 | Lapras | B | Terarium |
| 132 | Ditto | P | Paldea wild |
| 133 | Eevee | P | Paldea wild (multiple locations) |
| 134 | Vaporeon | P, E | Evolve Eevee (Water Stone) |
| 135 | Jolteon | P, E | Evolve Eevee (Thunder Stone) |
| 136 | Flareon | P, E | Evolve Eevee (Fire Stone) |
| 137 | Porygon | B | Terarium |
| 143 | Snorlax | K | Kitakami |
| 144 | Articuno | S | Snacksworth -- Glaseado Mountain (both versions) |
| 145 | Zapdos | S | Snacksworth -- South Province Area One (both versions) |
| 146 | Moltres | S | Snacksworth -- Asado Desert (both versions) |
| 147 | Dratini | P | Paldea wild |
| 148 | Dragonair | P, E | Paldea or evolve |
| 149 | Dragonite | P, E, R | Paldea, evolve, or Tera Raids |
| 150 | Mewtwo | T | Transfer only (Pokemon HOME). Was also available in limited-time 7-star Tera Raid event (September 2023) |
| 151 | Mew | T | Transfer only (Pokemon HOME) |

**Additional Gen 1 species present via Kitakami (Teal Mask DLC):**
- Ekans (#023) / Arbok (#024)
- Vulpix (#037) / Ninetales (#038)
- Sandshrew (#027) / Sandslash (#028)
- Bellsprout (#069) / Weepinbell (#070) / Victreebel (#071)
- Cleffa (#173, pre-evo, Gen 2 but in Clefairy line)

#### B.1.2 Gen 1 Species NOT in SV (Completely Absent)

The following Gen 1 species cannot be caught, transferred, or used in Scarlet/Violet at all. They are excluded from the game's data:

| # | Species | Line |
|---|---------|------|
| 010-012 | Caterpie, Metapod, Butterfree | Caterpie line |
| 013-015 | Weedle, Kakuna, Beedrill | Weedle line |
| 016-018 | Pidgey, Pidgeotto, Pidgeot | Pidgey line |
| 019-020 | Rattata, Raticate | Rattata line |
| 021-022 | Spearow, Fearow | Spearow line |
| 029-031 | Nidoran-F, Nidorina, Nidoqueen | Nidoran-F line |
| 032-034 | Nidoran-M, Nidorino, Nidoking | Nidoran-M line |
| 041-042 | Zubat, Golbat | Zubat line (Crobat also absent) |
| 046-047 | Paras, Parasect | Paras line |
| 063-065 | Abra, Kadabra, Alakazam | Abra line |
| 066-068 | Machop, Machoke, Machamp | Machop line |
| 072-073 | Tentacool, Tentacruel | Tentacool line **[NEEDS VERIFICATION -- may be in Blueberry]** |
| 077-078 | Ponyta, Rapidash | Ponyta line |
| 083 | Farfetch'd | Single-stage |
| 095 | Onix | Single-stage (Steelix also absent) |
| 098-099 | Krabby, Kingler | Krabby line |
| 104-105 | Cubone, Marowak | Cubone line |
| 106 | Hitmonlee | Tyrogue evolution |
| 107 | Hitmonchan | Tyrogue evolution |
| 108 | Lickitung | Single-stage (Lickilicky also absent) |
| 111-112 | Rhyhorn, Rhydon | Rhyhorn line (Rhyperior also absent) |
| 114 | Tangela | Single-stage (Tangrowth also absent) |
| 115 | Kangaskhan | Single-stage |
| 118-119 | Goldeen, Seaking | Goldeen line |
| 120-121 | Staryu, Starmie | Staryu line |
| 122 | Mr. Mime | Single-stage (Mr. Rime also absent) |
| 124 | Jynx | Single-stage |
| 125 | Electabuzz | Single-stage **[NEEDS VERIFICATION -- may be in Blueberry or via evolution]** |
| 126 | Magmar | Single-stage **[NEEDS VERIFICATION]** |
| 127 | Pinsir | Single-stage |
| 138-139 | Omanyte, Omastar | Fossil line |
| 140-141 | Kabuto, Kabutops | Fossil line |
| 142 | Aerodactyl | Fossil Pokemon |

**Approximate count:** ~55 Gen 1 species are completely absent from SV. This is a smaller cut than SwSh's base game (~36 absent there with DLC) but still represents a significant portion of the original 151.

### B.2 Paldea Base Game Encounters (Gen 1)

The Paldea base game open world offers the following Gen 1 species as wild encounters. SV's open world means Pokemon are visible in the overworld and can be approached, battled, or avoided at will.

**Key Paldea locations for Gen 1 species:**

| Species | Primary Locations | Notes |
|---------|-----------------|-------|
| Pikachu | South Province, East Province | Common overworld |
| Jigglypuff | South Province (Area Four) | Less common |
| Psyduck / Golduck | Multiple water areas | Very common near water |
| Mankey / Primeape | South Province, West Province | Common |
| Growlithe / Arcanine | East Province, South Province | Arcanine rare wild spawn |
| Slowpoke / Slowbro | Multiple coastal areas | Common |
| Shellder | West Province coastal | Less common |
| Gastly / Haunter | Night encounters, multiple areas | Night-only |
| Diglett / Dugtrio | Multiple areas, caves | Common in caves |
| Meowth / Persian | West Province, towns | Common |
| Magnemite / Magneton | East Province industrial areas | Common |
| Ditto | West Province (Area Two/Three) | Disguised as other Pokemon |
| Eevee | South Province, East Province | Uncommon but findable |
| Dratini / Dragonair | Casseroya Lake | Rare |
| Magikarp / Gyarados | Multiple water areas | Magikarp common, Gyarados rare |
| Tauros (Paldean) | East Province (Area Two), West Province | See Section D |

### B.3 Kitakami Encounters (Teal Mask DLC)

The Kitakami region adds several Gen 1 species not found in base Paldea:

| Species | Kitakami Locations | Notes |
|---------|-------------------|-------|
| Ekans / Arbok | Multiple areas | Not in base Paldea |
| Vulpix / Ninetales | Mountain areas | Not in base Paldea |
| Sandshrew / Sandslash | Rocky/cave areas | Not in base Paldea |
| Poliwag / Poliwhirl / Poliwrath | Water areas | Not in base Paldea |
| Geodude / Graveler / Golem | Mountain/cave areas | Not in base Paldea |
| Bellsprout / Weepinbell / Victreebel | Forest/grassy areas | Not in base Paldea |
| Koffing / Weezing | Various | Not in base Paldea |
| Clefairy / Clefable | Kitakami specific | Not in base Paldea |
| Snorlax | Rare spawns | Not in base Paldea |

**Kitakami adds ~15 Gen 1 species** not available in the base game, making DLC access important for Gen 1 collectors.

### B.4 Blueberry Academy Terarium Encounters (Indigo Disk DLC)

The Terarium at Blueberry Academy contains four biomes (Savanna, Coastal, Canyon, Polar) with species from across all generations. Gen 1 species in the Terarium include:

| Species | Terarium Biome | Notes |
|---------|---------------|-------|
| Bulbasaur / Ivysaur / Venusaur | Savanna/Coastal | Starter line -- first catchable since LGPE |
| Charmander / Charmeleon / Charizard | Canyon | Starter line |
| Squirtle / Wartortle / Blastoise | Coastal | Starter line |
| Oddish / Gloom / Vileplume | Savanna | |
| Exeggcute / Exeggutor | Savanna | |
| Grimer / Muk | Coastal/Canyon | |
| Tentacool / Tentacruel | Coastal | |
| Scyther | Savanna | |
| Magnemite / Magneton | Canyon | Also in base Paldea |
| Doduo / Dodrio | Savanna | Not in base Paldea or Kitakami |
| Seel / Dewgong | Polar | Not elsewhere in SV |
| Chansey | Multiple biomes | |
| Horsea / Seadra | Coastal | |
| Porygon | Canyon | Rare |
| Lapras | Polar/Coastal | Not elsewhere in SV |
| Diglett / Dugtrio | Canyon | Also in base Paldea |

**The Terarium is critical for Gen 1 collectors** -- it provides the Kanto starters (Bulbasaur/Charmander/Squirtle lines), Lapras, Seel/Dewgong, Doduo/Dodrio, and Porygon, none of which are available in the base game or Kitakami.

### B.5 Snacksworth Encounters (Indigo Disk Post-Game)

Snacksworth is an NPC at Blueberry Academy's entrance who appears after completing The Indigo Disk main story. He gives special treats in exchange for completing Blueberry Quests (one treat per 10 solo quests, up to 13 treats total for 25 legendary encounters).

**Gen 1 legendaries available via Snacksworth:**

| Pokemon | Version | Location | Shiny? |
|---------|---------|----------|--------|
| **Articuno** | Both | Glaseado Mountain | **NOT shiny locked** |
| **Zapdos** | Both | South Province (Area One) | **NOT shiny locked** |
| **Moltres** | Both | Asado Desert | **NOT shiny locked** |

These are standard Kanto forms (Ice/Flying, Electric/Flying, Fire/Flying), NOT the Galarian forms from SwSh. They appear as **overworld wild encounters** at the specified locations after using the treat. As wild encounters, they are eligible for **standard wild marks** (personality, time, weather, etc.).

**This is significant for collectors:** The Kanto birds from Snacksworth are among the few opportunities in the modern series to obtain Kanto legendary birds as wild encounters that can be both shiny AND marked. One per save file.

### B.6 Tera Raid Encounters

Many Gen 1 species appear in Tera Raids at various star levels. Raids rotate daily and offer:
- Non-standard Tera Types (the primary source of off-type Tera specimens)
- Guaranteed minimum IVs based on star level (5-star = 4 perfect IVs, 6-star = 5 perfect IVs)
- Potential Hidden Abilities at higher star levels

**Notable Gen 1 Tera Raid events:**
- **Mewtwo** appeared in a limited-time 7-star Tera Raid event (September 2023) with the **Mightiest Mark**. This was the only way to catch Mewtwo in SV without transfer. The event Mewtwo carries the Mightiest Mark ("the Unrivaled") permanently.
- **Charizard** has appeared in multiple 7-star events
- Various Gen 1 species rotate through standard raid pools

**Collector note:** Tera Raid catches CANNOT have standard wild marks (personality, time, weather, etc.). However, 7-star event raid catches receive the **Mightiest Mark** ("the Unrivaled"), which is exclusive to this method. Raid catches also cannot receive size marks.

### B.7 Mewtwo and Mew (Transfer Only)

**Mewtwo (#150):** Available in SV only via:
1. **Pokemon HOME transfer** from any previous game
2. **7-star Tera Raid event** (September 2023, limited-time) -- came with Mightiest Mark

**Mew (#151):** Available in SV only via:
- **Pokemon HOME transfer** from any previous game (LGPE Poke Ball Plus gift, Gen 4+ events, etc.)
- No in-game catch method exists in SV

Both can be used in SV battles, raids, and picnics once transferred. Neither is breedable.

---

## Section C: Mark and Size Hunting

### C.1 Mark Hunting Strategy in Gen 9

Mark hunting in SV follows the same fundamental approach as SwSh but benefits from the open-world overworld spawns -- Pokemon are visible before engagement, making encounters faster.

#### C.1.1 Basic Approach

1. Identify target species and a location where it spawns reliably
2. Approach Pokemon in the overworld, initiate encounter
3. Check summary screen for marks
4. If no desired mark, run or knock out and move to next spawn
5. Repeat

**Key difference from SwSh:** SV's fully open world means spawns are denser and loading times are minimal. You can chain encounters much faster than in SwSh's Wild Area.

#### C.1.2 Mark Odds Reminder

The mark roll order is the same as SwSh:
1. Personality mark: ~1/100 for any (each specific one ~1/2800)
2. Time mark: ~1/50 (if time-appropriate)
3. Weather mark: ~1/50 (if weather-appropriate)
4. Uncommon mark: ~1/50
5. Rare mark: ~1/1000

Approximate chance of ANY mark: ~1/12 for a standard encounter

#### C.1.3 Gen 1 Species Best Mark Hunting Locations

For Gen 1 species available as wild encounters in SV:

| Species | Best Location | Why |
|---------|-------------|-----|
| Pikachu | South Province (Area Two) | Dense spawns, open terrain |
| Psyduck | South Province water areas | Extremely common, fast resets |
| Growlithe | East Province (Area Three) | Reliable spawns |
| Gastly/Haunter | Multiple night areas | Night-only -- guarantees Sleepy-Time Mark eligibility |
| Magikarp | Any water area | Absurdly common, fastest mark farming |
| Eevee | South Province (Area Two) | Uncommon but targetable |
| Dratini | Casseroya Lake | Rare spawns -- mark hunting is slow |
| Tauros (Paldean) | East Province (Area Two) | Common spawns, multiple breeds |

### C.2 Size Mark Hunting Strategy

Size mark hunting is a numbers game due to the extreme rarity of scale 0 (Mini) and scale 255 (Jumbo).

#### C.2.1 Pure Size Hunting

- Target a commonly spawning species in a dense area
- Use Let's Go auto-battle mode to quickly clear spawns and force new ones
- Check caught Pokemon in boxes for XXXS or XXXL size designation
- Show qualifying specimens to the Hiker NPC for the mark

**Probability per encounter:** ~1/16,384 for Mini, ~1/16,512 for Jumbo

#### C.2.2 Meal Power Size Boosting

Sandwiches with specific ingredients can grant effects that increase the rate of encountering extreme-size Pokemon, improving odds significantly. This is the recommended approach for targeted size mark hunting.

#### C.2.3 Combined Rarity Calculations

| Combination | Approximate Odds |
|------------|-----------------|
| Size mark alone (Mini or Jumbo) | ~1/16,384 |
| Shiny alone (no boosts) | 1/4,096 |
| Shiny + Size mark | ~1/67,000,000 |
| Shiny + Any personality mark | ~1/410,000 |
| Shiny + Rare Mark | ~1/4,096,000 |
| Shiny + Size mark + Any personality mark | Effectively incalculable -- not a realistic target |

### C.3 Sandwich Power Stacking

Sandwiches are central to SV's hunting optimization. A single sandwich can grant up to three Meal Powers simultaneously (e.g., Encounter Power: Fire + Sparkling Power + Egg Power). Relevant powers for collectors:

| Power | Effect | Relevance |
|-------|--------|-----------|
| Sparkling Power | Extra shiny rolls for a type | Shiny hunting |
| Encounter Power | Increased spawn rate for a type | Target specific species |
| Egg Power | Faster egg generation at Picnic | Breeding shinies |
| Title Power | Increased mark odds | Mark hunting |
| Humungo Power | Increased large-size odds | Jumbo Mark hunting |
| Teensy Power | Increased small-size odds | Mini Mark hunting |

**Herba Mystica** are the key rare ingredients for Level 3 powers. They drop from 5-star and 6-star Tera Raids. Building a stock of Herba Mystica is essential for serious collectors.

---

## Section D: Paldean Tauros Deep Dive

### D.1 Overview

Paldean Tauros is the only Gen 1 species with a regional variant in Gen 9. It comes in three distinct **breeds**, each a separate form with different typing, appearance, and competitive role. All three share the same Pokedex entry (#128) but are functionally different Pokemon for collection purposes.

### D.2 Breed Comparison

| Attribute | Combat Breed | Blaze Breed | Aqua Breed |
|-----------|-------------|-------------|------------|
| **Type** | Fighting | Fighting/Fire | Fighting/Water |
| **Ability** | Intimidate / Anger Point | Intimidate / Anger Point | Intimidate / Anger Point |
| **Hidden Ability** | Cud Chew | Cud Chew | Cud Chew |
| **Appearance** | Short straight horns, standard mane | Forward-bent horns, red-streaked spiky mane | Upward horns, blue-accented flowing mane |
| **BST** | 490 | 490 | 490 |
| **Signature Move** | Close Combat | Flare Blitz (breed-exclusive) | Wave Crash (breed-exclusive) |

### D.3 Where to Catch Each Breed

#### D.3.1 Combat Breed (Both Versions)

- **East Province (Area One):** Common spawns, herds of Tauros
- **East Province (Area Two):** Mixed with other breeds
- **Tera Raids:** 4-star and 6-star

The Combat Breed is the most common and appears in both versions without restriction.

#### D.3.2 Blaze Breed

- **Pokemon Scarlet:** West Province (Area Two) -- wild overworld spawns
- **Pokemon Violet:** Union Circle (co-op with Scarlet player) or Tera Raids (5-star, 6-star)
- **Tera Raids:** Both versions at 5-star and 6-star

#### D.3.3 Aqua Breed

- **Pokemon Violet:** East Province (Area Two) -- wild overworld spawns
- **Pokemon Scarlet:** Union Circle (co-op with Violet player) or Tera Raids (5-star, 6-star)
- **Tera Raids:** Both versions at 5-star and 6-star

#### D.3.4 Version Exclusivity Summary

| Breed | Scarlet Wild | Violet Wild | Tera Raids |
|-------|-------------|-------------|------------|
| Combat | Yes | Yes | Both |
| Blaze | **Yes** | Union Circle only | Both |
| Aqua | Union Circle only | **Yes** | Both |

### D.4 Collector Implications

- A complete Gen 1 collection now requires **three separate Paldean Tauros** (Combat, Blaze, Aqua) plus the original Kantonian Tauros (available in other games but NOT in SV)
- Kantonian Tauros is **absent from SV** -- only Paldean forms exist. Kantonian Tauros must come from a previous game via HOME transfer
- For mark/shiny collectors: each breed needs its own shiny specimen, its own marked specimen, etc.
- **Blaze and Aqua breeds in the "wrong" version** can only be caught wild via Union Circle (co-op) or Tera Raids. Raid catches cannot have marks. This means **mark hunting for Blaze Breed requires Scarlet, and mark hunting for Aqua Breed requires Violet**

### D.5 Breeding Paldean Tauros

- All three breeds are in the **Field egg group**
- Tauros is male-only -- requires **Ditto** as breeding partner
- Offspring breed matches the parent Tauros breed (a Blaze Breed parent produces Blaze Breed offspring)
- Ball inheritance: Tauros's ball passes down when breeding with Ditto
- Shiny breeding via Masuda Method works normally

---

## Section E: Breeding with Mirror Herb

### E.1 Mirror Herb Mechanics (Detailed)

The Mirror Herb is a held item obtainable from Delibird Presents shops in Cascarrafa, Levincia, and Mesagoza (post-game).

#### E.1.1 Transfer Process

1. **Pokemon A** knows an egg move that **Pokemon B** can learn
2. **Pokemon B** holds the Mirror Herb and has at least one empty move slot
3. Both Pokemon are placed in a Picnic together (in the same party)
4. After a brief period at the picnic, Pokemon B learns the egg move

#### E.1.2 Key Rules

- **Same species required:** Both Pokemon must be the same species (or share the same evolutionary line) for the transfer to occur
- **No egg group restriction:** The normal egg group compatibility check is bypassed
- **No gender restriction:** Both Pokemon can be the same gender, including two males or two females
- **Mirror Herb is NOT consumed:** Reusable indefinitely
- **Empty move slot required:** Pokemon B must have fewer than 4 moves. Use the Move Reminder NPC to forget a move first
- **Multiple moves:** If Pokemon A knows multiple egg moves Pokemon B can learn, all eligible moves transfer simultaneously (one empty slot per move needed)

#### E.1.3 Interaction with Breeding

Mirror Herb transfer does NOT replace breeding -- it supplements it. A Pokemon that learns an egg move via Mirror Herb can then pass that move down to offspring through normal breeding. This creates a powerful chain:

1. Breed a Pokemon with the desired egg move
2. Use Mirror Herb to transfer that move to a same-species specimen with better IVs/nature/ball
3. The recipient now "knows" the egg move and can breed it forward

### E.2 Impact on Gen 1 Species

For Gen 1 species present in SV, Mirror Herb dramatically simplifies egg move optimization:

**Example: Growlithe with Morning Sun**
- Old method: Breed a chain through specific egg group partners
- New method: Get any Growlithe/Arcanine with Morning Sun, then Mirror Herb it to your target specimen

**Example: Eevee with Wish**
- Old method: Breed from a Togetic or other Fairy egg group member
- New method: Get any Eevee with Wish, then Mirror Herb to your target Eevee

**Collector implication:** Mirror Herb means egg move specimens are no longer rare or difficult to produce. Any Gen 1 Pokemon in SV can receive its full egg move complement with minimal effort. The scarcity value of "egg move specimens" from earlier generations remains intact since those specimens demonstrate the breeding skill/effort of their era.

### E.3 Optimal Breeding Setup in Gen 9

For maximum efficiency when breeding Gen 1 specimens in SV:

1. **Ditto:** Obtain a 6IV foreign-language Ditto (Tera Raid or trade) for Masuda Method + Destiny Knot breeding
2. **Items:** Destiny Knot (5 IV inheritance), Everstone (nature inheritance), Mirror Herb (egg move transfer)
3. **Egg Power:** Make a sandwich with Egg Power Level 3 before starting the Picnic
4. **Process:**
   - Set up parent Pokemon + Ditto in party
   - Open Picnic, collect eggs from basket
   - Walk/ride to hatch (Flame Body ability Pokemon in party halves hatch steps)
   - Use Mirror Herb separately to transfer egg moves to finished specimens

---

## Section F: Walkthrough and Transfer Strategy

### F.1 SV as the Current Endpoint

Scarlet/Violet is the most recent mainline game and the current destination for all collection specimens. Every Pokemon's journey through the generations ultimately arrives here (or in HOME awaiting future games). This means:

- SV-native specimens benefit from the latest mechanics (Tera Types, size marks, modern marks)
- Transferred specimens retain their origin marks, ribbons, and provenance from prior games
- The Gen 1 species available in SV should be collected here for maximum attribute richness

### F.2 Progression for Gen 1 Collection

#### F.2.1 Base Game Priority

1. **Early game (0-3 badges):** Catch Pikachu, Psyduck, Mankey, Growlithe, Meowth, Magikarp, Diglett in Paldea's South/East Provinces. These are common and good for learning the mark/size hunting mechanics.
2. **Mid game (3-5 badges):** Unlock Medali Gym for Tera Type changing. Catch Slowpoke, Shellder, Gastly, Eevee, Dratini. Begin sandwich crafting.
3. **Late game (6+ badges):** Access to Casseroya Lake (Dratini/Dragonair), full Paldea map. Begin Tera Raid farming for rare Tera Types and Hidden Abilities.
4. **Post-game:** Shiny Charm (complete Paldea Dex), Academy Ace Tournament for money/XP, serious shiny/mark hunting.

#### F.2.2 Teal Mask DLC Priority

1. **Unlock Kitakami** by progressing the DLC story
2. **Catch Kitakami-exclusive Gen 1 species:** Ekans, Vulpix, Sandshrew, Poliwag, Geodude, Bellsprout, Koffing, Clefairy, Snorlax
3. **Mark hunt** in Kitakami for species not available as wild encounters in Paldea
4. Kitakami has different weather patterns than Paldea, potentially offering different weather marks

#### F.2.3 Indigo Disk DLC Priority

1. **Unlock the Terarium** and upgrade biomes for maximum species availability
2. **Catch Terarium-exclusive Gen 1 species:** Bulbasaur/Charmander/Squirtle lines, Oddish, Exeggcute, Grimer, Tentacool, Doduo, Seel, Chansey, Horsea, Scyther, Porygon, Lapras
3. **Farm the Item Printer** for rare balls (Apricorn Balls, Beast Ball, Dream Ball, Safari Ball, Sport Ball)
4. **Complete Blueberry Quests** for Snacksworth treats to unlock legendary bird encounters
5. **Catch Kanto legendary birds** (Articuno, Zapdos, Moltres) -- soft reset for shiny/marks if desired

#### F.2.4 Mewtwo Special Considerations

Mewtwo is transfer-only in SV unless the player obtained one during the limited-time 7-star Tera Raid event (September 2023). The event Mewtwo carried the Mightiest Mark ("the Unrivaled") -- a permanently exclusive mark. If the event has passed, Mewtwo must come from HOME transfer (prior games: LGPE, USUM, FRLG, HGSS, XY, etc.).

### F.3 What to Prioritize in SV (Current Endpoint)

Since SV is the most recent game, prioritize catching specimens here that benefit from Gen 9's unique features:

1. **Shiny + Marked specimens** of Gen 1 species available as wild encounters -- these cannot be obtained in any other way
2. **Size Mark specimens** (Mini Mark / Jumbo Mark) -- exclusive to Gen 9
3. **Non-standard Tera Type specimens** from Tera Raids -- adds collector variety
4. **Rare ball specimens** using Item Printer balls -- SV has the best renewable rare ball access
5. **Paldean Tauros** (all three breeds) -- exclusive to Gen 9
6. **Kanto legendary birds** via Snacksworth -- wild encounters eligible for marks and shiny
7. **Mirror Herb egg move optimization** -- use SV's Mirror Herb to finalize egg move sets on breeding specimens

### F.4 Specimens That Must Come from Other Games

For a complete Gen 1 collection, the following cannot be sourced from SV:

- **~55 absent species** (see B.1.2) -- must come from prior games via HOME
- **Kantonian Tauros** -- only Paldean forms exist in SV
- **Alolan forms** (Vulpix, Sandshrew, Diglett, Meowth, Geodude, Grimer, Exeggutor, Marowak, Raichu) -- not breedable in SV without transferring the Alolan parent first
- **Galarian forms** (Meowth, Ponyta, Slowpoke, Farfetch'd, Mr. Mime, Articuno, Zapdos, Moltres, Weezing) -- not available in SV
- **Hisuian forms** (Growlithe, Arcanine, Voltorb, Electrode) -- PLA exclusive, transfer via HOME
- **Mega Evolutions, Gigantamax forms** -- mechanics from prior generations, not present in SV

### F.5 Transfer Notes

- All SV Pokemon carry the Paldea origin mark
- Tera Type data is stored in HOME and recognized in SV
- Size data transfers to HOME; Pokemon without prior size data get a random scale on transfer into SV
- Marks and ribbons transfer fully between SV and HOME
- SV is compatible with Pokemon HOME v3.0+

---

## Section G: Summary -- Gen 9 as Collection Endpoint

### G.1 Unique to Gen 9

| Feature | What It Means for Collectors |
|---------|----------------------------|
| Tera Types (19 variants per species) | New axis of variation -- non-standard types are premium |
| Size Marks (Mini/Jumbo) | Rarest catch attribute in the series (~1/16,384) |
| New SV marks (Gourmand, Itemfinder, Destiny, Titan, Mightiest) | Expand mark collecting possibilities |
| Mirror Herb egg move transfer | Simplifies egg move distribution, reduces scarcity |
| Item Printer rare balls | Best renewable rare ball source in the series |
| Paldean Tauros (3 breeds) | Only Gen 1 Paldean form -- need all 3 |
| Snacksworth Kanto birds | Wild-encounter legendaries, shiny-eligible, mark-eligible |
| Sandwich power stacking | Most customizable hunting optimization system |

### G.2 What SV Cannot Provide

- ~55 Gen 1 species completely absent from the game
- Kantonian Tauros (only Paldean forms exist)
- Regional forms from other generations (Alolan, Galarian, Hisuian)
- Mega Evolutions, Gigantamax forms, Alpha status
- Any mechanic-specific attributes from prior games (Apricorn Balls from HGSS, etc. -- though SV has the balls themselves via Item Printer)

### G.3 The Big Picture

SV is the culmination of the modern collection. A Gen 1 specimen caught in SV can have:
- **Shiny status** (multiple hunting methods, best odds up to 1/512)
- **A mark** (personality, time, weather, rare, or Gen 9-exclusive marks)
- **A size mark** (Mini or Jumbo, new to Gen 9)
- **A non-standard Tera Type** (19 possible types)
- **A rare ball** (Apricorn, Beast, Dream, Safari, Sport via Item Printer)
- **Optimized IVs/Nature/Ability** (breeding or raid farming)
- **Full egg move complement** (via Mirror Herb)
- **The Paldea origin mark**
- **Ribbons** (Paldea Champion, Once-in-a-Lifetime, effort/friendship ribbons)

This is the richest attribute set any Pokemon has ever carried. For Gen 1 species available in SV, this is the definitive game to create premium specimens. For the ~55 species not in SV, they must be sourced from the broader collection pipeline (see earlier documents in this series) and transferred to HOME to await future games.
