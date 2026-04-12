# Gen 3 (RSE + FRLG) Collector Research

Generation III is the **most consequential generational leap in the entire transfer chain** for collectors. Ruby/Sapphire/Emerald (2002-2004) and FireRed/LeafGreen (2004) introduced **natures**, **abilities**, the **modern 0-31 IV system**, **expanded Poke Ball types**, **Pokemon Contests with ribbons**, and the **Battle Frontier**. Gen 3 is also a **clean break** -- there is no backward compatibility with Gen 1/2. The VC transfer route (Gen 1/2 -> Poke Transporter -> Bank -> HOME) completely bypasses Gen 3. Gen 3 is a separate, parallel origin point.

For Gen 1 collectors, **FireRed/LeafGreen is the primary game** -- it is the Kanto remake and the only Gen 3 game where the full roster of Gen 1 species is available. RSE matters primarily for **contest ribbons** (20 earnable ribbons that begin the ribbon routing chain) and the **Emerald Battle Frontier**.

This document is **standalone** -- Gen 3 mechanics are entirely new. For VC-era mechanics (DVs, nature-via-EXP-mod, ball conversion on transfer), see [01-vc-red-blue.md](01-vc-red-blue.md) through [04-vc-crystal.md](04-vc-crystal.md).

---

## Section A: Game-Wide Mechanics

### A.1 Natures (NEW in Gen 3)

Natures are a **permanent, immutable property** assigned to every Pokemon at the moment of generation. Each Pokemon has exactly one nature out of 25 possibilities. Twenty natures modify stats (+10% to one stat, -10% to another). Five natures are neutral (increase and decrease the same stat, resulting in no net change).

**This is the first generation where nature matters for specimen quality.** A Pokemon's nature persists through all transfers -- Gen 3 through HOME through Gen 9 and beyond. Catching a legendary with a bad nature in Gen 3 means it has a bad nature forever (barring Gen 8+ Mint items, which override displayed nature but do not change the underlying nature data).

#### A.1.1 Complete Nature Table

| Nature | +10% Stat | -10% Stat | Common Competitive Use |
|--------|-----------|-----------|----------------------|
| **Adamant** | Attack | Sp. Attack | Physical attackers |
| **Jolly** | Speed | Sp. Attack | Fast physical attackers |
| **Modest** | Sp. Attack | Attack | Special attackers |
| **Timid** | Speed | Attack | Fast special attackers |
| **Bold** | Defense | Attack | Physical walls |
| **Impish** | Defense | Sp. Attack | Physical walls (physical attackers) |
| **Calm** | Sp. Defense | Attack | Special walls |
| **Careful** | Sp. Defense | Sp. Attack | Special walls (physical attackers) |
| **Brave** | Attack | Speed | Trick Room physical attackers |
| **Quiet** | Sp. Attack | Speed | Trick Room special attackers |
| **Relaxed** | Defense | Speed | Trick Room physical walls |
| **Sassy** | Sp. Defense | Speed | Trick Room special walls |
| **Lonely** | Attack | Defense | Mixed physical (rare) |
| **Mild** | Sp. Attack | Defense | Mixed special (rare) |
| **Naughty** | Attack | Sp. Defense | Mixed physical (rare) |
| **Rash** | Sp. Attack | Sp. Defense | Mixed special (rare) |
| **Hasty** | Speed | Defense | Fast mixed (fragile) |
| **Naive** | Speed | Sp. Defense | Fast mixed (fragile) |
| **Gentle** | Sp. Defense | Defense | Rarely optimal |
| **Lax** | Defense | Sp. Defense | Rarely optimal |
| **Hardy** | Attack | Attack | **Neutral** -- no effect |
| **Docile** | Defense | Defense | **Neutral** -- no effect |
| **Serious** | Speed | Speed | **Neutral** -- no effect |
| **Bashful** | Sp. Attack | Sp. Attack | **Neutral** -- no effect |
| **Quirky** | Sp. Defense | Sp. Defense | **Neutral** -- no effect |

#### A.1.2 Nature Guidance for Gen 1 Legendaries

These are the standard competitive natures. Soft-reset for these when catching legendaries:

| Pokemon | Recommended Nature | Reasoning |
|---------|-------------------|-----------|
| Mewtwo | Timid or Modest | Premier special attacker; Speed matters |
| Articuno | Timid or Bold | Special attacker or defensive |
| Zapdos | Timid or Bold | Fast special attacker or bulky pivot |
| Moltres | Timid or Modest | Special attacker |

**Soft-resetting:** Save before the encounter. Enter battle, catch, check nature. If wrong, soft-reset (A+B+Start+Select on GBA). Nature is determined when the encounter generates, so you must reset before initiating the battle.

#### A.1.3 Nature Breeding (Everstone)

- **Ruby/Sapphire/FireRed/LeafGreen:** NO nature inheritance exists. All offspring get a random nature.
- **Emerald ONLY:** If the **mother** (or Ditto) holds an **Everstone**, offspring have a **50% chance** of inheriting that parent's nature. This was the first implementation of nature breeding and makes Emerald significantly better for breeding specimens with desired natures.

### A.2 Abilities (NEW in Gen 3)

Every Pokemon now has an **Ability** -- a passive trait that provides effects in battle or the overworld. Each species has 1-2 possible ability slots (randomly assigned at generation). **Hidden Abilities do NOT exist yet** -- those arrive in Gen 5.

**Collector significance:** Ability is a permanent property that transfers through all future generations. Some abilities are competitively superior, making ability slot a factor in specimen quality.

#### A.2.1 Gen 1 Species -- Gen 3 Ability Assignments

The following table lists the ability slots for Gen 1 species as assigned in Generation III. Note: some second-slot abilities listed below were added in later generations. Entries marked with [Gen 4+] or [Gen 5+] were not available in Gen 3 itself. In Gen 3, abilities were randomly assigned from the available slots at time of encounter/hatch.

| # | Species | Ability 1 | Ability 2 | Notes |
|---|---------|-----------|-----------|-------|
| 001-003 | Bulbasaur line | Overgrow | -- | Standard starter ability |
| 004-006 | Charmander line | Blaze | -- | Standard starter ability |
| 007-009 | Squirtle line | Torrent | -- | Standard starter ability |
| 010 | Caterpie | Shield Dust | -- | |
| 011 | Metapod | Shed Skin | -- | |
| 012 | Butterfree | Compound Eyes | -- | Boosts accuracy; useful for catching |
| 013 | Weedle | Shield Dust | -- | |
| 014 | Kakuna | Shed Skin | -- | |
| 015 | Beedrill | Swarm | -- | |
| 016-018 | Pidgey line | Keen Eye | Tangled Feet [Gen 4+] | Only Keen Eye in Gen 3 |
| 019-020 | Rattata line | Run Away | Guts | Guts is competitively relevant |
| 021-022 | Spearow line | Keen Eye | -- | |
| 023-024 | Ekans line | Intimidate | Shed Skin | Intimidate is excellent |
| 025-026 | Pikachu/Raichu | Static | -- | Lightning Rod added Gen 4+ |
| 027-028 | Sandshrew line | Sand Veil | -- | |
| 029-031 | Nidoran-F line | Poison Point | Rivalry [Gen 4+] | Only Poison Point in Gen 3 |
| 032-034 | Nidoran-M line | Poison Point | Rivalry [Gen 4+] | Only Poison Point in Gen 3 |
| 035-036 | Clefairy line | Cute Charm | Magic Guard [Gen 4+] | Only Cute Charm in Gen 3 |
| 037-038 | Vulpix line | Flash Fire | -- | Drought added Gen 5+ HA |
| 039-040 | Jigglypuff line | Cute Charm | -- | |
| 041-042 | Zubat/Golbat | Inner Focus | -- | |
| 043-045 | Oddish line | Chlorophyll | -- | |
| 046-047 | Paras line | Effect Spore | Dry Skin [Gen 4+] | Only Effect Spore in Gen 3 |
| 048-049 | Venonat/Venomoth | Compound Eyes | Tinted Lens [Gen 4+] | Only Compound Eyes in Gen 3 |
| 050-051 | Diglett line | Sand Veil | Arena Trap | Arena Trap is competitively significant |
| 052-053 | Meowth line | Pickup | -- | Technician added Gen 4+ |
| 054-055 | Psyduck line | Damp | Cloud Nine | |
| 056-057 | Mankey line | Vital Spirit | Anger Point [Gen 4+] | Only Vital Spirit in Gen 3 |
| 058-059 | Growlithe line | Intimidate | Flash Fire | Both excellent abilities |
| 060-062 | Poliwag line | Water Absorb | Damp | Water Absorb preferred |
| 063-065 | Abra line | Synchronize | Inner Focus | Synchronize useful for nature hunting |
| 066-068 | Machop line | Guts | No Guard [Gen 4+] | Only Guts in Gen 3 |
| 069-071 | Bellsprout line | Chlorophyll | -- | |
| 072-073 | Tentacool line | Clear Body | Liquid Ooze | |
| 074-076 | Geodude line | Rock Head | Sturdy | |
| 077-078 | Ponyta line | Run Away | Flash Fire | Flash Fire preferred |
| 079-080 | Slowpoke/Slowbro | Oblivious | Own Tempo | |
| 081-082 | Magnemite line | Magnet Pull | Sturdy | Magnet Pull is niche but powerful |
| 083 | Farfetch'd | Keen Eye | Inner Focus | |
| 084-085 | Doduo line | Run Away | Early Bird | |
| 086-087 | Seel line | Thick Fat | -- | |
| 088-089 | Grimer line | Stench | Sticky Hold | |
| 090-091 | Shellder line | Shell Armor | Skill Link [Gen 4+] | Only Shell Armor in Gen 3 |
| 092-094 | Gastly line | Levitate | -- | Only ability; changed in Gen 7+ for Gengar |
| 095 | Onix | Rock Head | Sturdy | |
| 096-097 | Drowzee line | Insomnia | -- | Forewarn added Gen 4+ |
| 098-099 | Krabby line | Hyper Cutter | Shell Armor | |
| 100-101 | Voltorb line | Soundproof | Static | |
| 102-103 | Exeggcute line | Chlorophyll | -- | |
| 104-105 | Cubone line | Rock Head | Lightning Rod | |
| 106 | Hitmonlee | Limber | -- | Reckless added Gen 4+ |
| 107 | Hitmonchan | Keen Eye | -- | Iron Fist added Gen 4+ |
| 108 | Lickitung | Own Tempo | Oblivious | |
| 109-110 | Koffing line | Levitate | -- | |
| 111-112 | Rhyhorn line | Lightning Rod | Rock Head | |
| 113 | Chansey | Natural Cure | Serene Grace | Both excellent |
| 114 | Tangela | Chlorophyll | -- | |
| 115 | Kangaskhan | Early Bird | -- | Scrappy added Gen 4+ |
| 116-117 | Horsea/Seadra | Swift Swim | -- | Sniper added Gen 4+ |
| 118-119 | Goldeen line | Swift Swim | Water Veil | |
| 120-121 | Staryu line | Illuminate | Natural Cure | Natural Cure is excellent |
| 122 | Mr. Mime | Soundproof | -- | Filter added Gen 4+ |
| 123 | Scyther | Swarm | -- | Technician added Gen 4+ |
| 124 | Jynx | Oblivious | -- | Forewarn added Gen 4+ |
| 125 | Electabuzz | Static | -- | Vital Spirit added Gen 4+ |
| 126 | Magmar | Flame Body | -- | Vital Spirit added Gen 4+ |
| 127 | Pinsir | Hyper Cutter | -- | Mold Breaker added Gen 4+ |
| 128 | Tauros | Intimidate | -- | Anger Point added Gen 4+ |
| 129 | Magikarp | Swift Swim | -- | |
| 130 | Gyarados | Intimidate | -- | Extremely strong ability |
| 131 | Lapras | Water Absorb | Shell Armor | |
| 132 | Ditto | Limber | -- | Imposter is HA (Gen 5+) |
| 133 | Eevee | Run Away | -- | Adaptability added Gen 4+ |
| 134 | Vaporeon | Water Absorb | -- | |
| 135 | Jolteon | Volt Absorb | -- | |
| 136 | Flareon | Flash Fire | -- | |
| 137 | Porygon | Trace | -- | Download added Gen 4+ |
| 138-139 | Omanyte line | Swift Swim | Shell Armor | |
| 140-141 | Kabuto line | Swift Swim | Battle Armor | |
| 142 | Aerodactyl | Rock Head | Pressure | |
| 143 | Snorlax | Immunity | Thick Fat | Both good; Thick Fat generally preferred |
| 144 | Articuno | Pressure | -- | |
| 145 | Zapdos | Pressure | -- | |
| 146 | Moltres | Pressure | -- | |
| 147-149 | Dratini line | Shed Skin | -- | |
| 150 | Mewtwo | Pressure | -- | |
| 151 | Mew | Synchronize | -- | |

**Key note on ability inheritance:** In Gen 3 (and Gen 4), abilities are **NOT inherited through breeding**. Offspring randomly receive one of their species' available ability slots. Ability inheritance begins in Gen 5.

#### A.2.2 Notable Ability Mechanics

- **Synchronize** (Abra line, Mew): When a Pokemon with Synchronize is in the lead slot, wild Pokemon have a **50% chance** of having the same nature as the Synchronize user. This is the **primary nature-hunting tool** in Gen 3. Breed or catch Abra with desired natures, then lead with them when hunting legendaries.
- **Compound Eyes** (Butterfree, Venonat): Increases chance of wild Pokemon holding items when in the lead slot.
- **Intimidate** (Ekans, Growlithe, Gyarados, Tauros): -1 Attack on opponent when entering battle. Excellent competitive ability.
- **Pickup** (Meowth): Random items appear in inventory after battle. Useful utility.

### A.3 Individual Values (IVs) -- Modern System (NEW in Gen 3)

Gen 3 replaces the Gen 1/2 DV system (0-15 range, 4 stats) with the modern IV system that persists through all future generations.

| Property | Gen 1/2 DVs | Gen 3+ IVs |
|----------|-------------|------------|
| Range | 0-15 | **0-31** |
| Stats covered | 4 (Atk, Def, Spd, Spc) | **6** (HP, Atk, Def, SpA, SpD, Spe) |
| HP | Derived from other DVs | **Independent** |
| Sp. Atk / Sp. Def | Shared "Special" DV | **Separate** |
| Determination | At generation | At generation |
| Persistence | Permanent | **Permanent** |

#### A.3.1 Legendary IVs in Gen 3

**CRITICAL CORRECTION:** Legendaries do **NOT** have guaranteed perfect IVs in Gen 3. The guaranteed-three-perfect-IVs mechanic was introduced in **Generation VI (X/Y)**. In Gen 3, legendary Pokemon have fully random IVs (all six stats 0-31 with no guarantees). This makes soft-resetting for good IVs on legendaries significantly harder in Gen 3 than in modern games.

**Implication for collectors:** A Gen 3 legendary with 5-6 perfect IVs is astronomically rare and would be an exceptional specimen. Realistically, aim for good IVs in the 1-2 stats that matter most for the species.

#### A.3.2 Shiny Odds in Gen 3

Shiny odds in Gen 3 are **1/8192** (same as Gen 2). Shininess is determined by the personality value and Trainer ID/Secret ID combination. There is no Masuda Method in Gen 3 -- that begins in Gen 4. There is no Shiny Charm -- that begins in Gen 5.

The only shiny hunting methods in Gen 3 are:
- **Soft-resetting** for static encounters (legendaries, starters, gift Pokemon)
- **Random encounters** (run in grass/surf/fish and hope)
- **Breeding** (standard 1/8192 per egg, no boosted odds)

### A.4 Poke Balls

Gen 3 dramatically expands the ball selection with new specialty balls. However, availability differs between RSE and FRLG.

#### A.4.1 FRLG Ball Availability

FRLG has a **limited** ball selection compared to RSE:

| Ball | Availability | Catch Modifier | Collector Notes |
|------|-------------|----------------|-----------------|
| Poke Ball | Marts everywhere | 1x | Standard; clean aesthetic |
| Great Ball | Marts (Lavender+) | 1.5x | |
| Ultra Ball | Marts (Fuchsia+) | 2x | Workhorse catching ball |
| Master Ball | Silph Co. (x1 gift) | Guaranteed | One per save -- use wisely |
| Safari Ball | Safari Zone only | 1.5x | Exclusive to Safari Zone; 30 per visit |
| Premier Ball | Buy 10 Poke Balls at once | 1x | Aesthetic white ball; same rate as Poke Ball |

**FRLG does NOT have:** Timer Ball, Repeat Ball, Net Ball, Nest Ball, Dive Ball, or Luxury Ball. These are RSE-exclusive in Gen 3. This significantly limits ball variety for FRLG-caught specimens.

#### A.4.2 RSE Ball Availability

RSE has the full Gen 3 ball roster:

| Ball | Source | Catch Modifier | Collector Notes |
|------|--------|----------------|-----------------|
| Poke Ball | Marts | 1x | |
| Great Ball | Marts | 1.5x | |
| Ultra Ball | Marts | 2x | |
| Master Ball | Team Aqua/Magma Hideout (x1) | Guaranteed | |
| Safari Ball | Safari Zone only | 1.5x | |
| Premier Ball | Buy 10 Poke Balls | 1x | Sleek white aesthetic |
| Timer Ball | Rustboro Mart | Up to 4x (scales with turns) | Great for long legendary battles |
| Repeat Ball | Rustboro Mart | 3x if species already caught | Useful for re-catching |
| Net Ball | Rustboro Mart | 3x vs Water/Bug types | Thematic for Water-types |
| Nest Ball | Verdanturf Mart | Better for lower-level Pokemon | |
| Dive Ball | Mossdeep Mart | 3.5x while surfing/fishing | Blue aesthetic; prestige Water-type ball |
| Luxury Ball | Verdanturf Mart (RSE) | 1x; doubles friendship gain | The collector's prestige ball |

#### A.4.3 Ball Collector Significance

Ball type is **permanently stored** and **transfers through all future generations** (Gen 3 onward). This is the first generation where ball choice creates a permanent aesthetic and collector distinction.

**Prestige catches for Gen 1 species in RSE:**
- **Dive Ball** Tentacool/Tentacruel, Magikarp/Gyarados, Horsea/Seadra, Staryu/Starmie (Water-types in blue ball)
- **Net Ball** Tentacool, Magikarp (Water-type matching)
- **Luxury Ball** any species -- the premium collector ball
- **Timer Ball** legendaries (long battles = high catch rate)
- **Premier Ball** anything -- clean white aesthetic, collector favorite

**Cross-game strategy:** If a Gen 1 species is available in BOTH RSE and FRLG, catching it in RSE gives access to specialty balls. However, most Gen 1 species are only in FRLG, limiting options to Poke/Great/Ultra/Premier/Safari.

### A.5 Breeding (Overhauled)

Gen 3 breeding uses the modern egg group system but with primitive IV and nature inheritance compared to later generations.

#### A.5.1 IV Inheritance

**Ruby/Sapphire/FireRed/LeafGreen:**
- Exactly **3 IVs** are inherited from parents (randomly selected stats, randomly from either parent)
- The remaining **3 IVs** are fully random (0-31)
- No items influence which IVs are passed

**Emerald:**
- The inheritance algorithm is different and somewhat bugged. First, one random IV is passed from a random parent. Then a second random IV (excluding HP) is passed from a random parent. Then a third random IV (excluding HP and Defense) is passed. Stats can overlap, meaning effectively **1-3 IVs** are truly inherited, with the rest random.
- This makes Emerald slightly worse for IV breeding than RS/FRLG

**Comparison to modern:** In Gen 6+, the Destiny Knot passes **5 of 6 IVs** from parents. Gen 3's 3 inherited IVs make breeding perfect-IV specimens extremely tedious.

#### A.5.2 Nature Inheritance (Everstone)

| Game | Everstone Effect |
|------|-----------------|
| Ruby / Sapphire | **No effect** on nature |
| FireRed / LeafGreen | **No effect** on nature |
| Emerald | Mother (or Ditto) holding Everstone = **50% chance** offspring inherits nature |

**Practical impact:** For serious breeding, Emerald is strongly preferred due to Everstone nature passing. In RS/FRLG, every nature is fully random (1/25 chance for desired nature).

#### A.5.3 Ability Inheritance

In Gen 3, ability is **NOT inherited**. Offspring randomly receive one of their species' available ability slots. This changes in Gen 5.

#### A.5.4 Egg Moves

- Only the **father** can pass egg moves in Gen 3 (and Gen 4). Both parents can pass egg moves starting in Gen 6.
- The father can also pass TM/HM moves to offspring if the move is in the offspring's TM learnset.
- Egg moves are species-specific and listed on each species' Bulbapedia learnset page.

#### A.5.5 Ditto Locations

| Game | Location |
|------|----------|
| Ruby / Sapphire | **Not available** -- must trade from another Gen 3 game |
| Emerald | Desert Underpass (post-E4) |
| FireRed / LeafGreen | Routes 13, 14, 15; Pokemon Mansion; Cerulean Cave |

**FRLG is the primary Ditto source** for Gen 3 breeding. RS players must trade to obtain Ditto.

### A.6 Transfer: The Modern Chain Begins

Gen 3 is the **starting point of the modern transfer chain**: Gen 3 -> Gen 4 (Pal Park) -> Gen 5 (Poke Transfer) -> Gen 6/7 (Pokemon Bank) -> Gen 8/9 (Pokemon HOME).

#### A.6.1 The Clean Break

**Gen 3 has NO backward compatibility with Gen 1 or Gen 2.** You cannot trade or transfer Pokemon from RBY/GSC cartridges to Gen 3 in any way. This was a deliberate reset by Game Freak. The VC Gen 1/2 -> Poke Transporter route introduced in 2016 bypasses Gen 3 entirely, going directly to Gen 7.

This means Gen 3 specimens exist on a **completely separate lineage** from VC specimens. A Mewtwo caught in FRLG has a fundamentally different data structure, origin, and properties than a Mewtwo caught in VC Red and transferred through Poke Transporter.

#### A.6.2 Pal Park (Gen 3 -> Gen 4)

| Property | Details |
|----------|---------|
| Hardware | Nintendo DS or DS Lite (has GBA slot); NOT DSi/3DS |
| Direction | **One-way only** -- Pokemon cannot return to Gen 3 |
| Capacity | **6 Pokemon per session** |
| Cooldown (DPPt) | **24 hours** between migrations from the same Gen 3 save |
| Cooldown (HGSS) | **No cooldown** -- unlimited migrations |
| Unlock (DPPt) | National Pokedex required; Prof. Oak appears on Route 221 |
| Unlock (HGSS) | National Pokedex required; visit Fuchsia City |
| HM restriction | **Pokemon knowing HM moves cannot be migrated** -- must delete HMs first |
| Language | Gen 3 and Gen 4 games must be same language |

#### A.6.3 What Transfers Through Pal Park

| Data | Preserved? | Notes |
|------|-----------|-------|
| Species | Yes | |
| Nature | Yes | Permanent from Gen 3 onward |
| Ability | Yes | May become mismatched with PID; corrects on evolution |
| IVs | Yes | Full 0-31 values for all 6 stats |
| EVs | Yes | |
| Ball type | Yes | **Ball data persists** -- first gen where this matters |
| Ribbons | Yes | All earned ribbons transfer |
| Moves | Preserved | But HM moves must be deleted before transfer |
| OT / TID | Yes | |
| Shiny status | Yes | Determined by PID + TID/SID |
| Held item | Yes | Item transfers with the Pokemon |
| Met location | **Changed** | Replaced with "Pal Park" / origin region name |
| Friendship | **Reset to 70** | |
| Level met | **Updated** | Changed to current level at time of transfer |

### A.7 Contests (RSE Only)

Pokemon Contests are a **contest pageant system** exclusive to RSE (not in FRLG). They represent the **beginning of the ribbon collection system** and are critical for collectors building "ribbon master" specimens.

#### A.7.1 Contest Categories and Ranks

Five categories, four ranks each = **20 contest ribbons** per Pokemon:

| Category | Condition Stat | Pokeblock Color | Scarf Item |
|----------|---------------|-----------------|------------|
| Cool | Coolness | Red Pokeblock | Red Scarf |
| Beauty | Beauty | Blue Pokeblock | Blue Scarf |
| Cute | Cuteness | Pink Pokeblock | Pink Scarf |
| Smart | Smartness | Green Pokeblock | Green Scarf |
| Tough | Toughness | Yellow Pokeblock | Yellow Scarf |

| Rank | Location (RS) | Location (Emerald) |
|------|--------------|-------------------|
| Normal | Verdanturf Town | Verdanturf Town |
| Super | Fallarbor Town | Lilycove City |
| Hyper | Slateport City | Lilycove City |
| Master | Lilycove City | Lilycove City |

#### A.7.2 Contest Mechanics

**Round 1 -- Introduction:** Pokemon are judged on their **condition** (raised by feeding Pokeblocks) and any equipped scarf that matches the contest category. Higher condition = more starting hearts.

**Round 2 -- Talent (Appeals):** Pokemon use moves to appeal to judges. Each move has a contest type (Cool/Beauty/Cute/Smart/Tough) and generates hearts. Using a move matching the contest category earns bonus hearts. Combos and move sequencing matter. Repeating moves penalizes you.

**Pokeblock System:** Blend berries at Berry Blending machines to create Pokeblocks. Feed Pokeblocks to raise condition stats. Each Pokemon has a limited "sheen" capacity -- once sheen is maxed, no more Pokeblocks can be fed. High-quality Pokeblocks (made by blending with more players/NPCs and using rarer berries) give more condition per sheen.

**Winning:** Win all four ranks of a category to complete it. Win all 20 combinations for a complete contest sweep.

#### A.7.3 Contest Ribbons

| Ribbon | How Obtained |
|--------|-------------|
| Cool Ribbon (Normal/Super/Hyper/Master) | Win each rank of Cool contests |
| Beauty Ribbon (Normal/Super/Hyper/Master) | Win each rank of Beauty contests |
| Cute Ribbon (Normal/Super/Hyper/Master) | Win each rank of Cute contests |
| Smart Ribbon (Normal/Super/Hyper/Master) | Win each rank of Smart contests |
| Tough Ribbon (Normal/Super/Hyper/Master) | Win each rank of Tough contests |

**Total: 20 contest ribbons.**

**Transfer behavior:** Contest ribbons earned in Gen 3 transfer through Pal Park to Gen 4, then onward. In Gen 6 (ORAS), all 20 individual contest ribbons are consolidated into a single **Contest Memory Ribbon**. The ribbons still "count" but display differently.

### A.8 Battle Frontier (Emerald Only)

The Emerald Battle Frontier contains **seven battle facilities**, each with a Frontier Brain leader. Defeating the Frontier Brain earns a Silver Symbol (first win) and Gold Symbol (second win).

#### A.8.1 Facilities

| Facility | Frontier Brain | Symbol | Gimmick |
|----------|---------------|--------|---------|
| Battle Factory | Factory Head Noland | Knowledge | Use rental Pokemon, not your own |
| Battle Arena | Arena Tycoon Greta | Guts | 3-turn battles judged on points |
| Battle Dome | Dome Ace Tucker | Tactics | Tournament bracket; can see opponent teams |
| Battle Pike | Pike Queen Lucy | Luck | Choose paths through rooms; random events |
| Battle Palace | Palace Maven Spenser | Spirits | Pokemon choose moves based on nature |
| Battle Pyramid | Pyramid King Brandon | Brave | Ascending dark floors; find items/Pokemon |
| Battle Tower | Salon Maiden Anabel | Ability | Standard singles/doubles battles |

#### A.8.2 Battle Facility Ribbons

| Ribbon | How Obtained | Games |
|--------|-------------|-------|
| Winning Ribbon | Clear Battle Tower Lv. 50 challenge (56-win streak) | RS / Emerald |
| Victory Ribbon | Clear Battle Tower Lv. 100 / Open Level challenge (56-win streak) | RS / Emerald |

**Note:** Only the Battle Tower awards ribbons. The other six Emerald facilities award Silver/Gold Symbols but NOT ribbons. [NEEDS VERIFICATION -- some sources suggest additional facility ribbons may exist]

### A.9 All Gen 3 Ribbons (Complete List)

| # | Ribbon | Source | Games |
|---|--------|--------|-------|
| 1-20 | Contest Ribbons (5 categories x 4 ranks) | Pokemon Contests | RSE |
| 21 | Winning Ribbon | Battle Tower Lv. 50 | RSE |
| 22 | Victory Ribbon | Battle Tower Lv. 100 / Open Level | RSE |
| 23 | Champion Ribbon | Enter Hall of Fame | RSE, FRLG |
| 24 | Effort Ribbon | Max EVs (510 total); show to NPC in Slateport Market | RSE |
| 25 | Artist Ribbon | Selected as "super sketch model" at Lilycove Art Museum | RSE |
| 26 | National Ribbon | Purify Shadow Pokemon | Colosseum / XD |
| 27 | Earth Ribbon | Clear 100 consecutive Mt. Battle battles | Colosseum / XD |

**Total earnable ribbons in Gen 3: 27** (25 in RSE + FRLG, plus 2 from Colosseum/XD for Shadow Pokemon only).

**Gen 3-exclusive ribbons:** The 20 contest ribbons in their individual form are Gen 3/4 exclusive -- they collapse into a single Contest Memory Ribbon on transfer to Gen 6+. The Winning and Victory Ribbons from Gen 3's Battle Tower are technically distinct from later Battle Tower ribbons (Gen 4 has its own). The Artist Ribbon is earnable only in RSE and Colosseum.

**Ribbon routing significance:** For a "ribbon master" specimen, Gen 3 is where the journey **must begin**. A Pokemon transferred from Gen 3 with all 25 RSE ribbons (20 contest + 2 battle + Champion + Effort + Artist) has a massive head start that cannot be replicated later.

---

## Section B: FRLG -- Gen 1 Species Availability

FireRed and LeafGreen are the **primary Gen 3 games for Gen 1 collectors**. As Kanto remakes, they contain nearly the entire Gen 1 roster with the addition of the Sevii Islands.

### B.1 Starter Pokemon

| Pokemon | Level | Location | Ball | Ability |
|---------|-------|----------|------|---------|
| Bulbasaur | 5 | Pallet Town (gift from Oak) | Poke Ball | Overgrow |
| Charmander | 5 | Pallet Town (gift from Oak) | Poke Ball | Blaze |
| Squirtle | 5 | Pallet Town (gift from Oak) | Poke Ball | Torrent |

Choose one per save file. The other two must come from trading or additional save files. Starters can be **soft-reset for nature** (save before choosing, check in battle/summary, reset if undesirable).

**Recommended natures:**
- Bulbasaur/Venusaur: Modest (SpA) or Bold (Def) for competitive; Timid also works
- Charmander/Charizard: Timid (Spe, SpA focus) or Jolly (Spe, mixed)
- Squirtle/Blastoise: Modest (SpA) or Bold (Def)

### B.2 Legendary Pokemon

All FRLG legendaries are **one-time static encounters** that can be soft-reset for nature and IVs.

| Pokemon | Level | Location | Prerequisite |
|---------|-------|----------|-------------|
| Articuno | 50 | Seafoam Islands (B4F) | Navigate ice puzzle |
| Zapdos | 50 | Power Plant | Surf from Route 10 |
| Moltres | 50 | Mt. Ember (Sevii Islands) | Tri-Pass (defeat Blaine) |
| Mewtwo | 70 | Cerulean Cave (B1F) | Hall of Fame + Network Machine quest |

**Event legendaries (require special event items):**

| Pokemon | Level | Location | Prerequisite |
|---------|-------|----------|-------------|
| Lugia | 70 | Navel Rock (depths) | MysticTicket event |
| Ho-Oh | 70 | Navel Rock (peak) | MysticTicket event |
| Deoxys | 30 | Birth Island | AuroraTicket event |

**Deoxys form note:** Deoxys is in **Attack Forme** in FireRed and **Defense Forme** in LeafGreen. Form changes when transferred to a different game.

**Roaming legendary beast** (one per save, determined by starter choice):

| Starter Chosen | Roaming Beast | Level |
|---------------|--------------|-------|
| Bulbasaur | Entei | 50 |
| Charmander | Suicune | 50 |
| Squirtle | Raikou | 50 |

Roaming beasts are available after defeating Team Rocket at the Sevii Islands and restoring the Network Machine. They roam Kanto and flee from battle. Nature and IVs are set when they first spawn -- subsequent encounters reference the same data. **Save before triggering the Network Machine restoration** to soft-reset the roaming beast's nature.

### B.3 Version Exclusives

FRLG has version-exclusive wild encounters for evolved forms only. Base forms are available in both:

| FireRed Exclusive (Wild) | LeafGreen Exclusive (Wild) |
|-------------------------|--------------------------|
| Oddish/Gloom/Vileplume | Bellsprout/Weepinbell/Victreebel |
| Psyduck/Golduck | Slowpoke/Slowbro |
| Shellder/Cloyster | Staryu/Starmie |
| Growlithe/Arcanine | Vulpix/Ninetales |
| Scyther | Pinsir |
| Electabuzz | Magmar |
| Weezing (wild evolved only) | Muk (wild evolved only) |
| Seadra (wild evolved only) | Kingler (wild evolved only) |

**Note:** Grimer and Krabby are available in both versions (only their evolved forms differ in wild availability). Koffing and Horsea are available in both versions.

**Deoxys:** Attack Forme (FireRed) vs Defense Forme (LeafGreen).

### B.4 Gift and Trade Pokemon

#### B.4.1 Gift Pokemon

| Pokemon | Level | Location | Notes |
|---------|-------|----------|-------|
| Starter (Bulbasaur/Charmander/Squirtle) | 5 | Pallet Town | Choose one |
| Magikarp | 5 | Route 4 Pokemon Center | Buy from salesman for 500 Pokedollars |
| Eevee | 25 | Celadon Mansion (rooftop) | Found in Poke Ball on table |
| Lapras | 25 | Silph Co. | Gift from employee after defeating rival |
| Hitmonlee OR Hitmonchan | 25 | Saffron Fighting Dojo | Choose one after defeating dojo |
| Togepi | 5 (egg) | Water Labyrinth (Sevii Islands) | Gift if lead Pokemon has high friendship |

#### B.4.2 Fossil Pokemon

| Fossil | Pokemon | Level | Location Found | Revived At |
|--------|---------|-------|---------------|------------|
| Helix Fossil | Omanyte | 5 | Mt. Moon (choose one) | Cinnabar Lab |
| Dome Fossil | Kabuto | 5 | Mt. Moon (choose one) | Cinnabar Lab |
| Old Amber | Aerodactyl | 5 | Pewter Museum (back entrance, requires Cut) | Cinnabar Lab |

Old Amber is always obtainable regardless of fossil choice. The unchosen fossil is permanently lost.

#### B.4.3 In-Game Trades

In-game traded Pokemon come with the NPC's OT and a predetermined nature/personality value. They gain boosted EXP (1.5x) but may disobey at high levels without enough badges.

| You Give | You Receive | OT Name | Location | Notes |
|----------|------------|---------|----------|-------|
| Spearow | Farfetch'd ("Ch'ding") | Marc | Vermilion City | **Only way to obtain Farfetch'd in FRLG** |
| Abra | Mr. Mime ("Mimien") | Reyley | Route 2 | **Only way to obtain Mr. Mime in FRLG** |
| Poliwhirl | Jynx ("Zynx") | Dontae | Cerulean City | **Only way to obtain Jynx in Gen 3** |
| Golduck (FR) / Slowbro (LG) | Lickitung ("Marc") | Haden | Route 18 | **Only way to obtain Lickitung in FRLG** |
| Raichu | Electrode ("Esphere") | Clifton | Cinnabar Lab | |
| Venonat | Tangela ("Tangeny") | Norma | Cinnabar Lab | |
| Ponyta | Seel ("Seelor") | Garett | Cinnabar Lab | |
| Nidoran-F (FR) / Nidoran-M (LG) | Nidoran-M (FR) / Nidoran-F (LG) | -- | Route 5 | Gender swap trade |

**Collector note:** In-game trade Pokemon have the NPC's OT, making them less desirable for collectors who want their own OT. However, Farfetch'd, Mr. Mime, Jynx, and Lickitung are **trade-only** in FRLG -- the only alternative is trading from another player's Gen 3 game.

#### B.4.4 Game Corner Prizes

Celadon Game Corner Pokemon prizes:

| Pokemon | Level | Coin Cost | Notes |
|---------|-------|-----------|-------|
| Abra | 9 | 180 coins | Easy to obtain; also catchable wild |
| Clefairy | 8 | 500 coins | Catchable in Mt. Moon but rare |
| Dratini | 18 | 2,800 coins | Catchable in Safari Zone but rare |
| Scyther (FR) / Pinsir (LG) | 25 | 5,500 coins | Version exclusive alternative |
| Porygon | 26 | 9,999 coins | **Game Corner is the only source of Porygon in FRLG** |

**Porygon is critical:** Porygon cannot be caught wild in FRLG. The Game Corner is the only source without trading.

### B.5 Mandatory/Special Encounters

| Pokemon | Level | Location | Notes |
|---------|-------|----------|-------|
| Snorlax | 30 | Route 12 | Blocking path; must catch or defeat |
| Snorlax | 30 | Route 16 | Blocking path; must catch or defeat |
| Hypno | 30 | Berry Forest (Three Island) | Must catch or defeat to rescue Lostelle |

Both Snorlax are one-time encounters. If defeated, they are gone forever. Hypno similarly disappears if defeated.

### B.6 Safari Zone

The Kanto Safari Zone in FRLG is located in Fuchsia City. Entry costs 500 Pokedollars for 30 Safari Balls and 600 steps.

**Gen 1 species in FRLG Safari Zone:**

| Pokemon | Areas |
|---------|-------|
| Nidoran-F / Nidorina | All four areas |
| Nidoran-M / Nidorino | All four areas |
| Paras / Parasect | Center, Area 1, Area 2 |
| Venonat / Venomoth | Center, Area 2, Area 3 |
| Doduo | Area 1, Area 3 |
| Exeggcute | All four areas |
| Cubone / Marowak | Area 1, Area 2, Area 3 |
| Rhyhorn | Center, Area 2 |
| Chansey | Center, Area 1, Area 2 (rare) |
| Tangela | Center, Area 3 |
| Kangaskhan | Area 1, Area 2, Area 3 (rare) |
| Scyther (FR) / Pinsir (LG) | Center, Area 1, Area 2 (rare) |
| Pinsir (FR) / Scyther (LG) | Area 3 (rare) |
| Tauros | Area 1, Area 2, Area 3 (rare) |
| Dratini / Dragonair | Fishing (all areas) |
| Magikarp | Fishing (all areas) |
| Poliwag | Fishing (all areas) |
| Goldeen | Fishing (all areas) |
| Psyduck (FR) / Slowpoke (LG) | Surfing (Center, Area 1) |
| Krabby | Fishing (some areas) |

**Safari Ball exclusives:** Kangaskhan, Tauros, and Chansey are notably rare outside the Safari Zone. Safari Ball catches of these species have collector distinction.

### B.7 Sevii Islands

The Sevii Islands are **new content exclusive to FRLG** (not present in the original Gen 1). They unlock in stages:

| Islands | Requirement | Key Content |
|---------|------------|-------------|
| 1-3 | Defeat Blaine (Tri-Pass) | Moltres (Mt. Ember), Berry Forest |
| 4-7 | Hall of Fame + Network Machine quest | Expanded encounter tables, roaming beast trigger |

**Gen 1 species on Sevii Islands (not exhaustive):**

The Sevii Islands host many Gen 1 species in different level ranges and encounter contexts than mainland Kanto, but they are primarily notable for:

- **Moltres** at Mt. Ember (moved here from Victory Road in Gen 1)
- **Ponyta / Rapidash** on Kindle Road (One Island area)
- **Magmar** at Mt. Ember (LeafGreen only)
- **Delibird, Larvitar** and other non-Gen-1 species appear post-National-Dex
- Various Gen 1 species in different encounter tables (Slugma, Dunsparce, and Gen 2 Pokemon also appear)

The Sevii Islands mainly serve the post-game story (Team Rocket subplot, Network Machine, unlocking roaming beasts) rather than providing unique Gen 1 encounters.

### B.8 Pokemon Not Available in FRLG

The following Gen 1 species **cannot be obtained in FRLG** without trading from RSE or Colosseum/XD:

- **Mankey / Primeape** -- [DISPUTED: some sources say available in both versions; others say Route 3/4 FireRed only. Verify on your cartridge.]
- **Meowth / Persian** -- [DISPUTED: similar situation]
- **Hitmontop** (#237, Gen 2) -- requires Tyrogue from breeding, which requires a Ditto and specific conditions

All 151 Gen 1 species should be obtainable across FireRed + LeafGreen combined (with trading between versions for exclusives), except for the event Pokemon (Mew requires a separate event distribution). Jynx, Mr. Mime, Farfetch'd, and Lickitung require in-game trades as noted above.

---

## Section C: RSE -- Gen 1 Species Availability

RSE takes place in the **Hoenn region**, which has a predominantly new Pokedex. Only a subset of Gen 1 species appear natively.

### C.1 Gen 1 Species in the Hoenn Regional Dex

The following Gen 1 species are included in the Hoenn regional Pokedex and can be caught wild in Ruby, Sapphire, and/or Emerald:

| # | Species | Location(s) | Notes |
|---|---------|-------------|-------|
| 025 | Pikachu | Safari Zone (RS), various (E) | Via Pichu evolution or direct |
| 026 | Raichu | Evolve Pikachu (Thunder Stone) | |
| 037 | Vulpix | Mt. Pyre | |
| 038 | Ninetales | Evolve Vulpix (Fire Stone) | |
| 039 | Jigglypuff | Route 115 | |
| 040 | Wigglytuff | Evolve Jigglypuff (Moon Stone) | |
| 041 | Zubat | Many caves | Ubiquitous |
| 042 | Golbat | Many caves | |
| 043 | Oddish | Routes 110, 117, 119, 120, 121, 123 | |
| 044 | Gloom | Routes 121, 123 | |
| 045 | Vileplume | Evolve Gloom (Leaf Stone) | |
| 054 | Psyduck | Safari Zone | |
| 055 | Golduck | Safari Zone, evolve | |
| 063 | Abra | Granite Cave, Route 116 | |
| 064 | Kadabra | Evolve Abra | |
| 065 | Alakazam | Trade-evolve Kadabra | |
| 066 | Machop | Fiery Path, Jagged Pass | |
| 067 | Machoke | Evolve Machop | |
| 068 | Machamp | Trade-evolve Machoke | |
| 072 | Tentacool | Surfing on many water routes | Extremely common |
| 073 | Tentacruel | Surfing on many water routes | |
| 081 | Magnemite | New Mauville, Route 110 | |
| 082 | Magneton | New Mauville, evolve | |
| 084 | Doduo | Safari Zone | |
| 085 | Dodrio | Safari Zone, evolve | |
| 100 | Voltorb | New Mauville, Route 110 | |
| 101 | Electrode | New Mauville, evolve | |
| 116 | Horsea | Route 132-134 (fishing) | |
| 117 | Seadra | Evolve Horsea | |
| 118 | Goldeen | Various fishing spots | |
| 119 | Seaking | Various fishing spots, evolve | |
| 120 | Staryu | Lilycove City (fishing) | |
| 121 | Starmie | Evolve Staryu (Water Stone) | |
| 129 | Magikarp | Everywhere (fishing) | Old Rod universal encounter |

**Total: ~34 Gen 1 species** (including evolutions) are catchable in RSE without trading.

### C.2 Emerald Safari Zone (Extended)

After defeating the Elite Four in Emerald, two new Safari Zone areas unlock. These primarily contain **Gen 2 (Johto) Pokemon** such as Aipom, Teddiursa, Houndour, Miltank, Mareep, Sunkern, Gligar, Stantler, Ledyba, Spinarak, Pineco, Snubbull, and Shuckle.

**Gen 1 species in extended Safari Zone are limited to:**
- Magikarp (fishing)
- Goldeen (fishing)

The extended areas are designed to fill out the National Dex with Johto species, not additional Kanto Pokemon.

### C.3 Gen 1 Species NOT in RSE

The vast majority of Gen 1 species (roughly 110+) are **not available in RSE** and require trading from FRLG, Colosseum, or XD. This includes all starters, all fossils, most legendary Pokemon, and the bulk of common Kanto species.

**Key implication:** RSE is NOT the place to collect Gen 1 specimens. Use RSE for **contest ribbons, Battle Frontier ribbons, Emerald move tutors, and specialty ball catches** on the ~34 Gen 1 species that are available.

---

## Section D: Ribbons and Contests (Detailed)

### D.1 Ribbon Routing -- Why Gen 3 Is the Starting Point

If a Pokemon is going to be a "ribbon master" -- a specimen that collects the maximum possible ribbons across all games -- the ribbon route **must begin in Gen 3** because:

1. **Contest ribbons (20)** can only be earned in RSE (Gen 3) or DPPt (Gen 4). Starting in Gen 3 gives more opportunities.
2. **Battle Tower ribbons (2)** from Gen 3 are distinct from Gen 4 Battle Tower ribbons.
3. **Champion Ribbon** from Gen 3 is separate from the Champion Ribbon in later games.
4. **Effort Ribbon** and **Artist Ribbon** are earnable in Gen 3.
5. Once transferred to Gen 4, additional Gen 4 ribbons become available, building on the Gen 3 foundation.

### D.2 Ribbon Master Candidates (Gen 1 Species)

For a Gen 1 species to earn all possible Gen 3 ribbons, it must be:
1. Obtainable in RSE (for contests and Battle Tower) -- OR transferred to RSE from FRLG via trading
2. Battle-viable for the Battle Tower (56-win streaks at Lv. 50 and Lv. 100)
3. Contest-viable (can be fed Pokeblocks and perform well in appeals)

**Any Pokemon** can participate in contests with enough Pokeblock investment. Contest performance depends more on move selection and condition stats than species. However, the **Battle Tower** requires genuinely strong Pokemon.

**Top Gen 1 ribbon master candidates:**
- **Mewtwo** -- dominant in Battle Tower; contest-viable with diverse movepool
- **Dragonite** -- strong in Battle Tower; available via Dratini in RSE Safari Zone
- **Alakazam** -- fast and powerful; Abra catchable in RSE
- **Gyarados** -- Intimidate + strong stats; Magikarp everywhere in RSE
- **Starmie** -- Natural Cure + fast; Staryu fishable in RSE

### D.3 Contest Optimization for Gen 1 Species

Some Gen 1 species have moves that are particularly effective in specific contest categories:

| Contest | Useful Moves | Gen 1 Species That Learn Them |
|---------|-------------|-------------------------------|
| Cool | Flamethrower, Dragon Claw, Hyper Beam | Charizard, Dragonite, Gyarados |
| Beauty | Ice Beam, Surf, Blizzard | Lapras, Starmie, Vaporeon |
| Cute | Charm, Sweet Kiss, Attract | Pikachu, Jigglypuff, Clefairy |
| Smart | Psychic, Calm Mind, Future Sight | Alakazam, Mewtwo, Hypno |
| Tough | Earthquake, Rock Slide, Strength | Rhydon, Machamp, Golem |

### D.4 Pokeblock Strategy

- Blend berries at the Berry Blending machines in RS Contest Halls or Lilycove (Emerald)
- Use **rare berries** (e.g., Spelon, Pamtre, Watmel, Durin, Belue) for high-level Pokeblocks
- **Sheen is finite** -- once a Pokemon's sheen is maxed, no more Pokeblocks can be fed. Use high-quality blocks to maximize condition before sheen caps out.
- Blend with more NPCs/players for higher-level Pokeblocks (4 players is optimal)

---

## Section E: Gen 3 Breeding (Gen 1 Species)

### E.1 Breeding Facilities

| Game | Day Care Location | Accepts Two Pokemon? |
|------|------------------|---------------------|
| Ruby/Sapphire | Route 117 | Yes |
| Emerald | Route 117 | Yes |
| FireRed/LeafGreen | Four Island (Sevii) | Yes |

### E.2 IV Breeding Strategy (Gen 3)

Gen 3 IV breeding is **primitive** by modern standards:

1. Catch a Ditto (FRLG: Routes 13-15, Pokemon Mansion, Cerulean Cave; Emerald: Desert Underpass)
2. Breed with the target species
3. Only 3 IVs are inherited from parents (RS/FRLG) or 1-3 (Emerald)
4. No Power Items exist to force specific stat inheritance (those arrive in Gen 4)
5. No Destiny Knot (arrives in Gen 6)

**Practical approach:** Accept that Gen 3 breeding cannot produce perfect-IV specimens efficiently. Focus on getting the **right nature** (Everstone in Emerald, or just breed many eggs in RS/FRLG and hope) and **acceptable IVs** in key stats.

### E.3 Egg Move Highlights for Gen 1 Species

Egg moves in Gen 3 come exclusively from the father. Some notable Gen 3 egg moves for Gen 1 species:

| Species | Egg Move | Father Chain | Notes |
|---------|----------|-------------|-------|
| Charmander | Dragon Dance | Dragonite (learns at Lv. 55) | Became a defining set for Charizard X in Gen 6 |
| Squirtle | Mirror Coat | Corsola (learns via level-up) | Surprise coverage |
| Pichu | Volt Tackle | Pikachu holding Light Ball (Emerald only) | Exclusive Pichu egg move |
| Gastly | Perish Song | Misdreavus, Koffing chain | Useful trapping combo |
| Chansey | Seismic Toss | Machop line (learns via tutor/TM) | Staple competitive move |
| Larvitar -> Tyranitar | Dragon Dance | Dragonite, Gyarados | Defining competitive set |

**Gen 3-exclusive egg moves:** Most Gen 3 egg moves have remained available in later generations with expanded father/mother compatibility. Specific removals are rare but can occur when species are removed from egg group compatibility in later gens. Check individual species learnset pages on Bulbapedia for the "Generation III" column to verify current availability. [NEEDS VERIFICATION for specific removed egg moves]

### E.4 Ability Note

Abilities are **randomly assigned** in Gen 3 breeding -- they are not inherited from parents. This changes in Gen 5. If a species has two ability slots, each hatchling has a 50/50 chance of either.

---

## Section F: Legacy Moves

Gen 3 has several move tutor and TM combinations that create **legacy moves** -- moves that Gen 1 species can learn in Gen 3 but lose access to in later generations. A Pokemon carrying such a move and transferred through the chain retains it permanently.

### F.1 FRLG Move Tutors

All FRLG tutors are **one-time only** per save file. Choose carefully which Pokemon learns each move.

| Move | Location | Notable Gen 1 Learners | Legacy Status |
|------|----------|----------------------|---------------|
| Mega Punch | Route 4 | Numerous Normal-types | Widely available later via TM/tutor |
| Mega Kick | Route 4 | Numerous Normal-types | Less common in later gens |
| Body Slam | Four Island | Many Normal-types, Snorlax | Available via later tutors |
| Seismic Toss | Pewter City | Chansey, Machamp, many | Available via Emerald BP tutor |
| Counter | Celadon City | Fighting-types, many | Niche; check later availability |
| Rock Slide | Rock Tunnel | Rhydon, Golem, Aerodactyl | Available via TM in later gens |
| Softboiled | Celadon City | **Chansey/Blissey** (only learn via tutor) | **CRITICAL legacy move** |
| Thunder Wave | Silph Co. | Electric-types, many | Widely available |
| Swords Dance | Seven Island | Scyther, Pinsir, many | Available via TM in later gens |
| Mimic | Saffron City | Many species | Tutor in later gens |
| Substitute | Fuchsia City | Universal | TM in later gens |
| Double-Edge | Victory Road | Many Normal-types | Tutor in Emerald too |
| Explosion | Mt. Ember | Electrode, Golem, etc. | Widely available |
| Dream Eater | Viridian City | Psychic-types, Gengar | TM in some later gens |
| Metronome | Cinnabar Island | Clefairy, Togepi | Tutor in later gens |
| Frenzy Plant | Cape Brink | Venusaur only | Available in later gens |
| Blast Burn | Cape Brink | Charizard only | Available in later gens |
| Hydro Cannon | Cape Brink | Blastoise only | Available in later gens |

**CRITICAL: Softboiled on Clefable.** Clefairy/Clefable can learn Softboiled via the FRLG tutor in Celadon City. In later generations, Clefable's access to Softboiled becomes inconsistent. A Clefable with Softboiled from FRLG is a legacy specimen. [NEEDS VERIFICATION for exact gens where Clefable loses Softboiled access]

### F.2 Emerald Free Move Tutors

Emerald has one-time tutors scattered across Hoenn (separate from the Battle Frontier BP tutors):

| Move | Location |
|------|----------|
| Double-Edge | Sootopolis City |
| Explosion | Pacifidlog Town |
| Metronome | Fallarbor Town |
| Mimic | Lavaridge Town |
| Substitute | Lilycove City |
| DynamicPunch | Mossdeep City |
| Fury Cutter | Verdanturf Town |
| Rollout | Mauville City |
| Sleep Talk | Fortree City |
| Swagger | Slateport City |

### F.3 Emerald Battle Frontier BP Tutors

These tutors can be used **repeatedly** for Battle Points. This is the **only source of unlimited move tutoring** in Gen 3.

**Left Tutor:**

| Move | BP Cost |
|------|---------|
| Softboiled | 16 BP |
| Seismic Toss | 24 BP |
| Dream Eater | 24 BP |
| Mega Punch | 24 BP |
| Mega Kick | 24 BP |
| Body Slam | 48 BP |
| Rock Slide | 48 BP |
| Counter | 48 BP |
| Thunder Wave | 48 BP |
| Swords Dance | 48 BP |

**Right Tutor:**

| Move | BP Cost |
|------|---------|
| Defense Curl | 16 BP |
| Snore | 24 BP |
| Mud Slap | 24 BP |
| Swift | 24 BP |
| Icy Wind | 24 BP |
| Endure | 48 BP |
| Psych Up | 48 BP |
| Ice Punch | 48 BP |
| Thunder Punch | 48 BP |
| Fire Punch | 48 BP |

**Key legacy moves from Emerald BP tutors:**
- **Ice Punch / Thunder Punch / Fire Punch** on species that lose access in later gens (check individual species)
- **Softboiled** on Chansey/Blissey (repeatable unlike FRLG one-time tutor)
- **Seismic Toss** on Chansey/Blissey (staple competitive move)
- **Body Slam** on species that lose access later

### F.4 Gen 3 TM Legacy Moves

Gen 3 has 50 TMs (single-use). Some TM moves in Gen 3 were discontinued as TMs in later generations:

| TM | Move | Gen 3 Games | Later Availability | Legacy Potential |
|----|------|-------------|-------------------|-----------------|
| TM03 | Water Pulse | All Gen 3 | Removed as TM in Gen 5; tutor in some gens | Moderate |
| TM34 | Shock Wave | All Gen 3 | Removed as TM in Gen 5; not widely available later | **High** |
| TM43 | Secret Power | All Gen 3 | Removed after Gen 6 | High (Secret Power is Gen 3 signature) |
| TM23 | Iron Tail | All Gen 3 | Removed as TM in Gen 8 | Moderate |
| TM48 | Skill Swap | All Gen 3 | Available via tutor/TM in some later gens | Low |

**Shock Wave** on certain species may create legacy combinations. Secret Power is thematically Gen 3 but has limited competitive value.

---

## Section G: Walkthrough Checklists

### G.1 FRLG Playthrough Checklist (Collector Route)

**Pre-Hall of Fame:**

- [ ] Choose starter with desired nature (soft-reset)
- [ ] Old Amber from Pewter Museum (requires Cut)
- [ ] Helix or Dome Fossil from Mt. Moon
- [ ] Buy Magikarp from Route 4 Pokemon Center (500 Pokedollars)
- [ ] Catch desired wild Pokemon on each route as you progress
- [ ] Get Eevee from Celadon Mansion rooftop
- [ ] Choose Hitmonlee or Hitmonchan from Fighting Dojo
- [ ] Get Lapras from Silph Co.
- [ ] Buy 10 Poke Balls at a time for Premier Balls (stock up)
- [ ] Complete Safari Zone visits: target Kangaskhan, Tauros, Chansey, Dratini
- [ ] FRLG move tutors (one-time each -- plan which Pokemon gets which move):
  - Route 4: Mega Punch, Mega Kick
  - Pewter City: Seismic Toss (Chansey?)
  - Rock Tunnel: Rock Slide
  - Celadon: Counter, Softboiled (**priority: Clefable or Chansey**)
  - Saffron: Mimic
  - Silph Co.: Thunder Wave
  - Fuchsia: Substitute
  - Viridian: Dream Eater
  - Cinnabar: Metronome
- [ ] Catch Snorlax (Route 12 and/or Route 16)
- [ ] Buy Porygon from Game Corner (9,999 coins)
- [ ] Obtain Articuno (Seafoam Islands) -- soft-reset for nature
- [ ] Obtain Zapdos (Power Plant) -- soft-reset for nature
- [ ] Revive fossils at Cinnabar Lab
- [ ] Defeat Elite Four and enter Hall of Fame

**Post-Hall of Fame:**

- [ ] Obtain Tri-Pass; access Sevii Islands 1-3
- [ ] Obtain Moltres (Mt. Ember) -- soft-reset for nature
- [ ] Complete Network Machine quest (Sevii Islands 4-7)
- [ ] Trigger roaming legendary beast
- [ ] Obtain Mewtwo (Cerulean Cave) -- soft-reset for nature
- [ ] Remaining FRLG move tutors:
  - Victory Road: Double-Edge
  - Mt. Ember: Explosion
  - Cape Brink: Frenzy Plant / Blast Burn / Hydro Cannon
  - Four Island: Body Slam
  - Seven Island: Swords Dance
- [ ] Breeding: Use Ditto from Routes 13-15 / Pokemon Mansion / Cerulean Cave
- [ ] Trade between FR and LG for version exclusives
- [ ] In-game trades for Farfetch'd, Mr. Mime, Jynx, Lickitung

### G.2 RSE Playthrough Checklist (Contest + Frontier Route)

This checklist assumes Gen 1 Pokemon have already been obtained in FRLG and traded to RSE.

**Pre-Hall of Fame:**

- [ ] Progress through main story
- [ ] Catch Gen 1 species available in Hoenn (see Section C.1)
- [ ] Use specialty balls: Dive Ball, Net Ball, Timer Ball, Luxury Ball, Premier Ball
- [ ] Start contest preparation: gather berries, blend Pokeblocks
- [ ] Enter and win Normal/Super rank contests as available

**Post-Hall of Fame:**

- [ ] Access Emerald Battle Frontier
- [ ] Contest circuit (all 20 ribbons):
  - [ ] Cool: Normal -> Super -> Hyper -> Master
  - [ ] Beauty: Normal -> Super -> Hyper -> Master
  - [ ] Cute: Normal -> Super -> Hyper -> Master
  - [ ] Smart: Normal -> Super -> Hyper -> Master
  - [ ] Tough: Normal -> Super -> Hyper -> Master
- [ ] Battle Tower: Win 56 consecutive at Lv. 50 (Winning Ribbon)
- [ ] Battle Tower: Win 56 consecutive at Lv. 100/Open Level (Victory Ribbon)
- [ ] Earn Effort Ribbon (max EVs, show to NPC in Slateport)
- [ ] Earn Artist Ribbon (win Master rank contest with high score, agree to portrait)
- [ ] Emerald free move tutors (one-time each)
- [ ] Emerald BP move tutors (repeatable -- stock up on desired moves)
- [ ] Earn Champion Ribbon (Hall of Fame)

### G.3 Cross-Game Coordination

**Recommended order:**

1. **Start with FRLG** -- Complete Kanto, catch all Gen 1 species, use move tutors
2. **Trade ribbon candidates to RSE** -- Bring your best specimens to RSE for contests and Battle Frontier
3. **Complete RSE contest circuit** -- All 20 ribbons on your ribbon master candidate
4. **Complete Emerald Battle Frontier** -- Winning and Victory ribbons
5. **Use Emerald BP tutors** -- Teach legacy moves before transferring
6. **Delete all HM moves** -- Required before Pal Park transfer
7. **Transfer to Gen 4 via Pal Park** -- 6 at a time, no cooldown if using HGSS

**CRITICAL: Complete all Gen 3 activities BEFORE Pal Park transfer.** Transfer is one-way. Once a Pokemon is in Gen 4, it cannot return to Gen 3 for missed ribbons, contests, or move tutors.

---

## Section H: Transfer and Lockout Summary

### H.1 Pre-Transfer Checklist

Before Pal Park transfer, ensure each Pokemon has:

- [ ] Desired nature (permanent)
- [ ] Best available IVs (permanent)
- [ ] All desired Gen 3 ribbons earned
- [ ] All desired Gen 3 move tutor moves learned (or at least the legacy ones)
- [ ] HM moves deleted (Pal Park rejects Pokemon with HMs)
- [ ] Desired ball type (permanent from Gen 3 onward)
- [ ] Any desired held items equipped (items transfer with Pokemon)

### H.2 Pal Park Transfer Details

| Aspect | DPPt | HGSS |
|--------|------|------|
| Location | Route 221 (Sinnoh) | Fuchsia City (Kanto) |
| Unlock | National Pokedex | National Pokedex |
| Capacity | 6 per session | 6 per session |
| Cooldown | 24 hours per Gen 3 save | **None** |
| Catching Show | Park Balls (always catch) | Park Balls (always catch) |
| Ball preserved | Yes | Yes |
| HM restriction | No HM moves | No HM moves |
| Language match | Required | Required |

**HGSS is strongly preferred** for mass Pal Park transfer due to no cooldown.

### H.3 What Is Permanently Locked After Transfer

Once transferred to Gen 4, the following Gen 3 activities are **permanently inaccessible** for that specimen:

- RSE contest ribbons (cannot return to earn missed ribbons)
- Battle Tower ribbons from Gen 3 (Gen 4 has its own)
- FRLG and Emerald move tutors
- Gen 3 TMs
- Gen 3 egg moves (if you needed to breed)
- Artist Ribbon from RSE
- Effort Ribbon from RSE (though this can also be earned in later gens)

### H.4 The Modern Transfer Chain

```
Gen 3 (GBA)
  |
  | Pal Park (DS/DS Lite GBA slot)
  v
Gen 4 (NDS: DPPt / HGSS)
  |
  | Poke Transfer (DS: wireless between two DS systems)
  v
Gen 5 (NDS: BW / B2W2)
  |
  | Poke Transporter (3DS: sends to Pokemon Bank)
  v
Pokemon Bank (3DS)
  |
  | Transfer to HOME
  v
Pokemon HOME (Switch / Mobile)
  |
  | Deposit into compatible games
  v
Gen 6 (3DS: XY / ORAS)
Gen 7 (3DS: SM / USUM)
Gen 8 (Switch: SwSh / BDSP / PLA)
Gen 9 (Switch: SV + DLC)
```

**Gen 3 is the oldest origin point that feeds into this chain.** VC Gen 1/2 takes a separate path (Poke Transporter directly to Bank) and bypasses Gen 3-5 entirely.

---

## Appendix: Quick Reference Tables

### Gen 1 Legendary Nature Quick Reference

| Pokemon | Best Nature | Second Choice | Avoid |
|---------|------------|---------------|-------|
| Articuno | Timid | Bold, Modest | Adamant, Jolly |
| Zapdos | Timid | Bold, Modest | Adamant |
| Moltres | Timid | Modest | Adamant, Jolly |
| Mewtwo | Timid | Modest, Jolly | Brave, Quiet |

### Ball Availability Summary

| Ball Type | FRLG | RSE |
|-----------|------|-----|
| Poke Ball | Yes | Yes |
| Great Ball | Yes | Yes |
| Ultra Ball | Yes | Yes |
| Master Ball | Yes (x1) | Yes (x1) |
| Safari Ball | Yes | Yes |
| Premier Ball | Yes | Yes |
| Timer Ball | **No** | Yes |
| Repeat Ball | **No** | Yes |
| Net Ball | **No** | Yes |
| Nest Ball | **No** | Yes |
| Dive Ball | **No** | Yes |
| Luxury Ball | **No** | Yes |

### Breeding Comparison (Gen 3 vs Modern)

| Feature | RS/FRLG | Emerald | Gen 6+ |
|---------|---------|---------|--------|
| IVs inherited | 3 | 1-3 (bugged) | 5 (Destiny Knot) |
| Nature passing | None | 50% (Everstone on mother/Ditto) | 100% (Everstone) |
| Ability inherited | No | No | Yes (Gen 5+) |
| Egg moves from | Father only | Father only | Both parents (Gen 6+) |
| Masuda Method | No | No | Yes (Gen 4+) |
| Shiny Charm | No | No | Yes (Gen 5+) |
