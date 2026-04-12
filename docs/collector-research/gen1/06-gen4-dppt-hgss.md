# Gen 4 (DPPt + HGSS) Collector Research

Generation IV is a **landmark generation for collectors** -- Diamond/Pearl/Platinum (2006-2008) introduced the **physical/special split**, and HeartGold/SoulSilver (2009-2010) are the Gen 2 remakes that brought back **Apricorn Balls with modern ball data storage**. Unlike VC Gen 2 (where Apricorn Ball data is lost on transfer), HGSS properly stores ball type in the Pokemon's data structure, and that data **persists through the entire transfer chain**: Gen 4 -> Gen 5 (Poke Transfer) -> Bank -> HOME -> current games.

**HGSS is the earliest source of legal Apricorn Ball Pokemon that can reach modern games.** This single fact makes HGSS the most collector-valuable game in the entire series for Gen 1 species hunting.

Gen 4 also introduced the **Masuda Method** (increased shiny odds from foreign-language breeding), **Power Items** for IV breeding, expanded **move tutors** in Platinum and HGSS, and a fresh set of **Super Contest ribbons** plus **Battle Tower ribbons**.

For Gen 3 mechanics (natures, abilities, IVs, contest ribbons), see [05-gen3-rse-frlg.md](05-gen3-rse-frlg.md). This document assumes familiarity with those systems and focuses on what Gen 4 adds or changes.

---

## Section A: Game-Wide Mechanics

### A.1 Physical/Special Split (NEW in Gen 4)

The single most important mechanical change since Gen 3. Prior to Gen 4, whether a move was physical or special was determined entirely by its **type**:

- **Physical types (Gen 1-3):** Normal, Fighting, Flying, Poison, Ground, Rock, Bug, Ghost, Steel
- **Special types (Gen 1-3):** Fire, Water, Grass, Electric, Psychic, Ice, Dragon, Dark

Starting in Gen 4, **each move is individually classified** as Physical, Special, or Status regardless of type. This fundamentally changes which Pokemon benefit from which natures.

#### A.1.1 Impact on Gen 1 Species

Notable examples where the split changes optimal play:

| Pokemon | Pre-Split Issue | Post-Split Benefit |
|---------|----------------|-------------------|
| Gyarados | Water moves were Special (its weak stat) | Waterfall is now Physical -- Gyarados becomes a top-tier physical Water attacker |
| Gengar | Ghost/Poison were Physical (its weak stat) | Shadow Ball stays Special -- Gengar works properly as a special attacker |
| Alakazam | Psychic was already Special | No change -- still wants Modest/Timid |
| Flareon | Fire moves were Special (its weak stat) | Flare Blitz (Gen 4 move) is Physical -- first viable physical STAB |
| Sneasel/Weavile | Ice and Dark were both Special | Ice Punch and Crunch are Physical -- massive improvement |
| Electabuzz | Electric was Special | Thunder Punch is Physical; Electabuzz can now go mixed or physical |

**Collector implication:** Natures established in the Gen 3 document are still correct for most species because competitive builds already factored in the split. However, Pokemon like Gyarados now strongly prefer Adamant/Jolly (physical natures) over the Modest that would have been odd in Gen 3 anyway. The split mostly **validates** existing nature recommendations rather than changing them.

### A.2 HGSS Apricorn Balls (CRITICAL FOR COLLECTORS)

This is the **headline feature** of this entire document. Kurt returns in Azalea Town in HGSS and crafts Apricorn Balls from Apricorns harvested from trees throughout Johto and Kanto. Unlike original Gold/Silver/Crystal (and the VC versions), HGSS stores ball type properly in the Gen 4 data structure.

**The transfer chain is proven:** HGSS Apricorn Ball -> Gen 5 (Poke Transfer) -> Pokemon Bank -> Pokemon HOME -> Scarlet/Violet (or any HOME-compatible game). The ball type is preserved at every step.

#### A.2.1 Apricorn Ball Reference

| Apricorn Color | Ball Created | Catch Bonus Effect | Collector Notes |
|---------------|-------------|-------------------|-----------------|
| Red | **Level Ball** | Better catch rate when your Pokemon's level greatly exceeds the target's | Aesthetically popular; gold/red design |
| Yellow | **Moon Ball** | 4x catch rate on Pokemon that evolve via Moon Stone (Nidoran, Clefairy, Jigglypuff, Skitty) | Very niche bonus; iconic design |
| Blue | **Lure Ball** | 3x catch rate on Pokemon encountered via fishing | Perfect for water-route Pokemon |
| Green | **Friend Ball** | Sets caught Pokemon's base happiness to 200 (vs normal 70) | Speeds up friendship evolutions |
| Pink | **Love Ball** | 8x catch rate on Pokemon of opposite gender to yours | *Note: In Gen 4, a bug makes it check same gender instead* |
| White | **Fast Ball** | 4x catch rate on Pokemon with base Speed >= 100 | Great for fast Pokemon like Abra |
| Black | **Heavy Ball** | Bonus/penalty based on target's weight; best on very heavy Pokemon (Snorlax, Onix) | Thematic for large Pokemon |

**Love Ball bug:** In HGSS specifically, the Love Ball's code checks for same-gender instead of opposite-gender due to a programming error. This was fixed in Gen 7+ when Apricorn Balls returned. Pokemon caught in Love Balls in HGSS retain the Love Ball visually regardless.

#### A.2.2 Apricorn Tree Locations

One Apricorn per tree per day. Trees reset at midnight. The Pokeathlon Dome also sells Apricorns for 200 Athlete Points each (once unlocked).

| Apricorn Color | Ball | Johto Locations | Kanto Locations | Total Trees |
|---------------|------|-----------------|-----------------|-------------|
| **Red** | Level Ball | Route 37, Route 44 | Fuchsia City | 3 |
| **Yellow** | Moon Ball | Route 36, Route 37 | Route 26, Pewter City | 4 |
| **Blue** | Lure Ball | Route 42, Route 46, Violet City | Route 8 | 4 |
| **Green** | Friend Ball | Route 29, 30, 35, 39, 42, 45, 46 | Route 11 | **8** |
| **Pink** | Love Ball | Route 30, Route 33, Route 42 | Route 2 | 4 |
| **White** | Fast Ball | Azalea Town, Route 38 | Pewter City | 3 |
| **Black** | Heavy Ball | Route 31, 33, 37, 43 | Route 1 | **5** |

**Planning note:** Red and White Apricorns are the scarcest (3 trees each). If you want Level Balls or Fast Balls, plan daily harvesting routes. Green is the most abundant (8 trees), so Friend Balls are easiest to stockpile. Kurt converts one Apricorn into one ball, and the ball is ready the next day.

#### A.2.3 Why HGSS Apricorn Balls Are Irreplaceable

- **VC Gen 2 does NOT preserve Apricorn Balls.** Pokemon transferred from VC Gold/Silver/Crystal via Poke Transporter have their ball type set to a standard Poke Ball. The VC games do not store ball data in a format the Transporter recognizes.
- **HGSS is the ONLY Gen 4 source.** DPPt does not have Apricorn Balls. If you trade an Apricorn Ball Pokemon to DPPt, it displays as a standard Poke Ball in those games, but the ball data is preserved and shows correctly when traded back to HGSS or transferred to Gen 5+.
- **Gen 7 (Sun/Moon/USUM) reintroduced Apricorn Balls** as rare items, but only a limited number per playthrough. HGSS provides unlimited Apricorn Balls via daily harvesting.
- **Gen 8 (Sword/Shield) Cram-o-matic** can produce Apricorn Balls from Apricorns, but again in limited supply.
- **Every Gen 1 species catchable in the wild in HGSS can be caught in every Apricorn Ball type.** This creates a massive matrix of legal ball+species combinations unique to HGSS.

### A.3 Ball Availability by Game

#### DPPt Ball Inventory

| Ball | How to Obtain | Notes |
|------|--------------|-------|
| Poke Ball | Marts | Standard |
| Great Ball | Marts (after 3 badges) | |
| Ultra Ball | Marts (after 5 badges) | |
| Master Ball | Cyrus gift (Galactic HQ) | One per save |
| Premier Ball | Buy 10+ Poke Balls at once | |
| Heal Ball | Marts | Heals upon capture |
| Net Ball | Marts | 3x on Bug/Water |
| Nest Ball | Marts | Better on low-level Pokemon |
| Dusk Ball | Marts | **3.5x at night or in caves -- best general ball** |
| Quick Ball | Marts | **4x on first turn (Gen 4 value)** |
| Timer Ball | Marts | Up to 4x, improves each turn |
| Repeat Ball | Marts | 3x on already-caught species |
| Luxury Ball | Marts | Double happiness gain |
| Dive Ball | Marts | 3.5x while surfing/fishing |
| Safari Ball | Great Marsh (Pastoria City) | Safari Zone only, 30 per visit |
| Park Ball | Pal Park | Cosmetic only (100% catch rate), auto-converts to original ball |
| Cherish Ball | Events only | Cannot be purchased |

#### HGSS Ball Inventory (Same as DPPt PLUS)

All DPPt balls are available in HGSS, plus:

| Ball | How to Obtain | Notes |
|------|--------------|-------|
| **Level Ball** | Kurt (Red Apricorn) | Apricorn Ball |
| **Lure Ball** | Kurt (Blue Apricorn) | Apricorn Ball |
| **Moon Ball** | Kurt (Yellow Apricorn) | Apricorn Ball |
| **Friend Ball** | Kurt (Green Apricorn) | Apricorn Ball |
| **Love Ball** | Kurt (Pink Apricorn) | Apricorn Ball |
| **Fast Ball** | Kurt (White Apricorn) | Apricorn Ball |
| **Heavy Ball** | Kurt (Black Apricorn) | Apricorn Ball |
| **Sport Ball** | Bug-Catching Contest | 20 per contest entry; Pokemon keep this ball |
| **Safari Ball** | Safari Zone (Cianwood) | 30 per visit |
| Park Ball | Pal Park (Kanto Route 18) | Cosmetic only |

**Sport Ball note:** The Bug-Catching Contest uses Sport Balls. Any Bug-type Pokemon you catch and keep from the contest retains the Sport Ball. This is the **only** source of Sport Ball Pokemon in Gen 4.

### A.4 Breeding Mechanics

#### A.4.1 Daycare and Ditto

**Daycare locations:**
- DPPt: Solaceon Town (Route 209)
- HGSS: Route 34 (south of Goldenrod City)

**Ditto locations:**
- DPPt: Route 218 (Poke Radar, post-National Dex), Trophy Garden (daily rotation)
- HGSS: Route 47 (swarm only -- check Pokemon Talk radio daily), Safari Zone (Wetland area, Lv 17)

#### A.4.2 Nature Inheritance

- **Everstone:** If either parent holds an Everstone, there is a **50% chance** the offspring inherits that parent's nature. This works in all Gen 4 games (not just Emerald like Gen 3).
- **Masuda Method conflict:** In Gen 4 ONLY, if the Masuda Method applies (parents from different language games), the Everstone **fails to pass nature**. This is because both nature and shininess are tied to the personality value in Gen 4. You must choose: controlled nature OR boosted shiny odds. This conflict was resolved in Gen 5.

#### A.4.3 IV Inheritance

- 3 random IVs are inherited from parents (same as Gen 3).
- **Power Items (NEW):** If a parent holds a Power item (Power Bracer, Power Belt, Power Lens, Power Band, Power Anklet, Power Weight), the corresponding stat's IV is **guaranteed** to be inherited from that parent. This replaces one of the three random inheritance slots.

| Power Item | Stat Guaranteed | Battle Tower Cost |
|-----------|----------------|-------------------|
| Power Weight | HP | 16 BP |
| Power Bracer | Attack | 16 BP |
| Power Belt | Defense | 16 BP |
| Power Lens | Sp. Attack | 16 BP |
| Power Band | Sp. Defense | 16 BP |
| Power Anklet | Speed | 16 BP |

**Breeding strategy:** Put the Power item for the most important stat on the parent with the best IV in that stat. The other two inherited IVs are still random.

#### A.4.4 Masuda Method (NEW in Gen 4)

The Masuda Method was introduced in Diamond/Pearl and is available in all Gen 4 games. When breeding two Pokemon from **different language games** (e.g., an English Ditto and a Japanese Charmander), the game generates up to 4 additional personality values per egg to check for shininess.

- **Base shiny rate:** 1/8192
- **Masuda Method rate:** 5/8192 (~1/1638) -- approximately 5x the base rate
- **Reminder:** In Gen 4, Masuda Method and Everstone nature passing are **mutually exclusive** due to how personality values work. This was fixed in Gen 5.

**How to get foreign Pokemon in Gen 4:** Trade via the GTS (Global Trade Station) or trade directly with a player using a different language cartridge. The language is stored on the Pokemon's data and persists through transfers.

#### A.4.5 Ability Inheritance

Abilities are still **NOT inherited** in Gen 4 breeding. Offspring randomly receive one of their species' available ability slots. (Ability inheritance begins in Gen 5.)

### A.5 Transfer Mechanics

#### A.5.1 Gen 3 -> Gen 4: Pal Park

- **Method:** Insert a GBA Pokemon game into the DS's GBA slot. Access Pal Park (DPPt: Route 221; HGSS: Fuchsia City/Kanto Route 18).
- **Limit:** 6 Pokemon at a time. In DP, once per 24 hours. In Platinum/HGSS, no daily limit.
- **Restrictions:** Pokemon cannot know HM moves. Items are transferred with the Pokemon.
- **Ball preservation:** The Pokemon's original Gen 3 Poke Ball type is preserved.
- **Hardware requirement:** Requires a DS or DS Lite (has GBA slot). DSi, DSi XL, 3DS, and 2DS families **do not have a GBA slot** and cannot use Pal Park.
- **Language lock:** Gen 3 and Gen 4 games must be the same language (with some exceptions for Korean Gen 4).
- **One-way:** Pokemon cannot return to Gen 3 after transfer.

#### A.5.2 Gen 4 -> Gen 5: Poke Transfer

- **Method:** Access the Poke Transfer Lab on Route 15 in Gen 5 (post-National Dex). Uses DS Download Play between two DS systems.
- **Limit:** 6 Pokemon at a time. No daily limit. A minigame captures them (any uncaught are returned to Gen 4).
- **Restrictions:** Pokemon cannot know HM moves. **Items are NOT transferred** -- must be removed first.
- **Eggs and Spiky-eared Pichu** cannot be transferred.
- **Ball preservation:** All ball types are preserved, including Apricorn Balls.
- **Hardware requirement:** Two DS-family systems (original DS, DS Lite, DSi, 3DS, etc.).
- **One-way:** Pokemon cannot return to Gen 4 after transfer.

**CRITICAL: Remove items before Poke Transfer.** Unlike Pal Park, Poke Transfer strips all held items. Remove valuable items (Leftovers, berries, etc.) before transferring.

**CRITICAL: Forget HM moves before Poke Transfer.** Surf, Fly, Waterfall, Rock Smash, Cut, Strength, Whirlpool, Rock Climb -- any of these will block transfer. Visit the Move Deleter in Blackthorn City (HGSS) or Canalave City (DPPt).

### A.6 Ribbons

Gen 4 has an extensive ribbon system. HGSS notably **does not have Super Contests** -- those are DPPt only. If you want contest ribbons on HGSS Apricorn Ball specimens, you must trade them to DPPt first.

#### A.6.1 Super Contest Ribbons (DPPt Only)

Won at the Super Contest Hall in Hearthome City. 5 categories x 4 ranks = **20 ribbons**.

| Category | Normal Rank | Great Rank | Ultra Rank | Master Rank |
|----------|------------|------------|------------|-------------|
| Cool | Cool Ribbon | Cool Ribbon Great | Cool Ribbon Ultra | Cool Ribbon Master |
| Beauty | Beauty Ribbon | Beauty Ribbon Great | Beauty Ribbon Ultra | Beauty Ribbon Master |
| Cute | Cute Ribbon | Cute Ribbon Great | Cute Ribbon Ultra | Cute Ribbon Master |
| Smart | Smart Ribbon | Smart Ribbon Great | Smart Ribbon Ultra | Smart Ribbon Master |
| Tough | Tough Ribbon | Tough Ribbon Great | Tough Ribbon Ultra | Tough Ribbon Master |

**Note:** These are separate from Gen 3 contest ribbons. A Pokemon can have both sets. When transferred to Gen 6+, all Sinnoh contest ribbons are collapsed into a single **Contest Memory Ribbon**.

#### A.6.2 Battle Tower Ribbons (Gen 4-Exclusive)

These are earned at the Battle Tower in DPPt or the Battle Frontier in HGSS. They are **Gen 4-exclusive** -- cannot be earned anywhere else.

| Ribbon | How to Earn | Game |
|--------|------------|------|
| Ability Ribbon | Defeat Palmer at 21st Singles battle | DPPt |
| Great Ability Ribbon | Defeat Palmer at 49th Singles battle | DPPt |
| Double Ability Ribbon | 50+ win streak in Doubles | DPPt |
| Multi Ability Ribbon | 50+ win streak in Multi (CPU partner) | DPPt |
| Pair Ability Ribbon | 50+ win streak in Multi (linked partner) | DPPt |
| World Ability Ribbon | Reach high rank in Wi-Fi Battle Room | DPPt |

**HGSS Battle Frontier** has its own set of Battle Tower-equivalent ribbons (from the Battle Tower in the Johto Frontier).

#### A.6.3 Miscellaneous Ribbons

| Ribbon | How to Earn | Game | Gen 4-Exclusive? |
|--------|------------|------|------------------|
| Effort Ribbon | Pokemon has max EVs (510 total) | DPPt (Sunyshore Market), HGSS (Blackthorn City) | No |
| Footprint Ribbon | High friendship | DPPt (Route 213), HGSS (Route 36) | No |
| Alert Ribbon | Talk to Julia/Monica on Monday | DPPt/HGSS | No |
| Shock Ribbon | Talk to Julia/Tuscany on Tuesday | DPPt/HGSS | No |
| Downcast Ribbon | Talk to Julia/Wesley on Wednesday | DPPt/HGSS | No |
| Careless Ribbon | Talk to Julia/Arthur on Thursday | DPPt/HGSS | No |
| Relax Ribbon | Talk to Julia/Frieda on Friday | DPPt/HGSS | No |
| Snooze Ribbon | Talk to Julia/Santos on Saturday | DPPt/HGSS | No |
| Smile Ribbon | Talk to Julia/Sunny on Sunday | DPPt/HGSS | No |
| Gorgeous Ribbon | Purchase (10,000) | Resort Area (DPPt) | No |
| Royal Ribbon | Purchase (100,000) | Resort Area (DPPt) | No |
| Gorgeous Royal Ribbon | Purchase (999,999) | Resort Area (DPPt) | No |
| Legend Ribbon | Defeat Red in HGSS | HGSS only | **Yes** |

**Ribbon routing for maximum specimens:**

1. Earn all 20 Super Contest ribbons in DPPt.
2. Earn Battle Tower/Frontier ribbons.
3. Collect daily ribbons (Monday-Sunday).
4. Collect Effort Ribbon, Footprint Ribbon.
5. HGSS-exclusive: Legend Ribbon (defeat Red at Mt. Silver).

### A.7 Pokewalker (HGSS)

The Pokewalker is an infrared pedometer accessory bundled with physical HGSS cartridges. It transfers a Pokemon from the game for walking, and unlocks special routes with unique encounters based on steps accumulated.

#### A.7.1 Gen 1 Species on Pokewalker Routes

| Route Name | Unlock Requirement | Gen 1 Species Available |
|-----------|-------------------|------------------------|
| Refreshing Field | Start of game | Doduo, Kangaskhan, Nidoran-F, Nidoran-M, Pidgey |
| Noisy Forest | Start of game | Bellsprout, Paras, Venonat, Spearow, Oddish |
| Rugged Road | 50 Watts | Onix, Machop, Ponyta, Geodude |
| Beautiful Beach | 200 Watts | Psyduck, Staryu, Poliwag, Slowpoke |
| Suburban Area | 500 Watts | Magnemite, Rattata, Voltorb |
| Dim Cave | 1,000 Watts | Gastly, Zubat, Machop |
| Blue Lake | 2,000 Watts | Poliwag, Dratini, Shellder, Krabby, Tentacool, Goldeen |
| Town Outskirts | 3,000 Watts | Abra, Voltorb, Grimer, Koffing, Rattata |
| Warm Beach | 7,500 Watts | Horsea, Goldeen, Magikarp |
| Volcano Path | 10,000 Watts | Geodude, Ponyta |
| Stormy Beach | 65,000 Watts | Psyduck, Shellder |
| Yellow Forest | Special Event | **Pikachu** (multiple with special moves: Surf, Fly) |
| Winner's Path | Special Event | *No Gen 1 species* |

**Kangaskhan** on Refreshing Field is notable -- it can be encountered very early. **Dratini** on Blue Lake is accessible relatively quickly (2,000 Watts).

**Modern accessibility warning:** The Pokewalker requires the physical HGSS cartridge with an IR sensor. Digital/emulated copies cannot use the Pokewalker. The accessory itself is increasingly rare and battery replacement requires opening the device. **Pokewalker-exclusive catches are in a standard Poke Ball** -- they do not benefit from Apricorn Ball collecting.

### A.8 Wi-Fi Events (Historical -- Largely Unobtainable)

Gen 4 Nintendo Wi-Fi Connection (WFC) services were terminated on May 20, 2014. The following event distributions for Gen 1 species are **no longer obtainable through official means**:

- **Mew** -- Multiple event distributions (various regions/dates). Cherish Ball, special moves.
- **Pikachu** (Yellow Forest Pokewalker route) -- Required Wi-Fi event to unlock.
- **Pikachu** (Pikachu-colored Pichu event trigger) -- Event Pichu used to unlock Spiky-eared Pichu in HGSS.

**Note:** Fan-maintained DNS servers (e.g., "Wiimmfi" or similar community projects) may provide access to some events. Legitimacy of Pokemon obtained this way varies by community standards.

---

## Section B: HGSS -- Gen 1 Species Availability (PRIMARY FOCUS)

HGSS is the priority game for Gen 1 collectors because **every wild-catchable Gen 1 Pokemon can be put in an Apricorn Ball**. This section exhaustively documents every Gen 1 species available in HGSS.

**Only Mew (#151) is completely unobtainable in HGSS** (event-only, Wi-Fi now defunct). Every other Gen 1 species (#001-#150) can be obtained in HGSS through some combination of wild encounters, gifts, breeding, fossils, or post-game content.

### B.1 Version Exclusives (Gen 1 Species)

| Species | HeartGold | SoulSilver | Notes |
|---------|-----------|------------|-------|
| **Mankey** (#056) | Wild | Not available | Route 42 |
| **Primeape** (#057) | Wild | Not available | Evolve Mankey / Route 42 |
| **Growlithe** (#058) | Wild | Not available | Route 36, 37, 48 |
| **Arcanine** (#059) | Evolve | Not available | Fire Stone on Growlithe |
| **Vulpix** (#037) | Not available | Wild | Route 36, 37, 48 |
| **Ninetales** (#038) | Not available | Evolve | Fire Stone on Vulpix |
| **Meowth** (#052) | Not available | Wild | Route 39 (night) |
| **Persian** (#053) | Not available | Evolve | Evolve Meowth |

**Collector implication:** To get all Gen 1 species in Apricorn Balls from both versions, you need **both HeartGold and SoulSilver** (or trade with someone who has the other version). The Fire-type exclusives (Growlithe/Vulpix) and Meowth/Mankey lines are the key splits.

### B.2 Wild Encounters -- Johto Region

#### B.2.1 Routes (Johto)

| Species | Route(s) | Method | Time | Notes |
|---------|----------|--------|------|-------|
| Pidgey | 29, 30, 31, 35, 36, 37 | Grass | Morning/Day | Very common |
| Pidgeotto | 43 | Grass | Morning/Day | |
| Rattata | 29, 30, 31, 32, 33 | Grass | Night | Common at night |
| Raticate | 38, 39, 47 | Grass | Night | |
| Spearow | 29, 31, 32, 33, 42, 46 | Grass | Morning/Day | |
| Fearow | 47 | Grass | Morning/Day | |
| Ekans | 32, 33 | Grass | Morning/Day | |
| Arbok | 47 | Grass | Morning/Day | |
| Zubat | 31, 32, 33, 42 | Grass/Cave | Night | Very common in caves |
| Golbat | 42, 47 | Grass/Cave | Night | |
| Oddish | 34 | Grass | Night | |
| Venonat | 43 | Grass | Night | |
| Bellsprout | 31, 32, 44 | Grass | Morning/Day | |
| Tentacool | 40, 41 | Surf | Any | |
| Tentacruel | 41 | Surf | Any | |
| Geodude | 45, 46 | Grass/Cave | Any | |
| Graveler | 45 | Grass | Any | |
| Ponyta | 47 | Grass | Morning/Day | Also Safari Zone |
| Slowpoke | Slowpoke Well | Surf | Any | |
| Magnemite | 38, 39 | Grass | Any | |
| Magneton | 38 | Grass | Any | Rare |
| Doduo | 34 | Grass | Morning/Day | |
| Drowzee | 34 | Grass | Night | Also 35 |
| Krabby | 40 | Surf/Fishing | Any | |
| Voltorb | 43 | Grass | Any | |
| Electrode | 43 | Grass | Any | Rare |
| Exeggcute | Headbutt trees | Headbutt | Any | Multiple routes |
| Goldeen | 42 | Surf/Fishing | Any | |
| Magikarp | Most water routes | Old Rod | Any | Ubiquitous |
| Gyarados | Lake of Rage | Surf | Any | Also Red Gyarados (Shiny, static) |
| Ditto | Route 47 | Grass | Any | **Swarm only** |
| Tauros | 38, 39 | Grass | Morning/Day | |
| Dratini | Dragon's Den | Fishing | Any | Super Rod |
| Dragonair | Dragon's Den | Fishing | Any | Super Rod, rare |

#### B.2.2 Caves and Dungeons (Johto)

| Species | Location | Method | Time | Notes |
|---------|----------|--------|------|-------|
| Zubat | Dark Cave, Union Cave, Mt. Mortar, Whirl Islands, Ice Path | Walk | Any | Very common everywhere |
| Golbat | Mt. Mortar, Whirl Islands, Ice Path | Walk | Any | |
| Geodude | Dark Cave, Union Cave, Mt. Mortar | Walk | Any | |
| Graveler | Mt. Mortar deep floors | Walk | Any | |
| Onix | Union Cave, Mt. Mortar | Walk | Any | |
| Machop | Mt. Mortar | Walk | Any | |
| Machoke | Mt. Mortar deep floors | Walk | Any | |
| Seel | Whirl Islands | Surf | Any | |
| Dewgong | Whirl Islands deep floors | Surf | Any | |
| Krabby | Union Cave B2F | Surf/Fishing | Any | |

#### B.2.3 Special/Timed Encounters (Johto)

| Species | Location | Method | Requirement |
|---------|----------|--------|-------------|
| **Lapras** | Union Cave B2F | Surf (static) | **Fridays only**, Lv 20. Respawns weekly. |
| **Red Gyarados** | Lake of Rage | Static | Story encounter. **Guaranteed shiny**, Lv 30. |
| **Snorlax** | Route 11/12 boundary | Static | Tune PokeGear radio to Poke Flute channel. Lv 50. |
| **Sudowoodo** | Route 36 | Static | Use Squirtbottle. Not Gen 1. |

#### B.2.4 Headbutt Trees (Johto + Kanto)

Headbutt is taught by a man in Ilex Forest. Many Gen 1 Bug-types are found exclusively via Headbutt:

| Species | Routes/Locations | Notes |
|---------|-----------------|-------|
| Caterpie | Most Johto/Kanto trees | Common, morning/day |
| Metapod | Most Johto/Kanto trees | Common, morning/day |
| Butterfree | Some trees | Rare |
| Weedle | Most Johto/Kanto trees | Common, morning/day |
| Kakuna | Most Johto/Kanto trees | Common, morning/day |
| Beedrill | Some trees | Rare |
| Spearow | Various trees | |
| Venonat | Various trees | |
| Exeggcute | Various trees | **Primary method for Exeggcute** |

### B.3 Wild Encounters -- Kanto Region (Post-Game)

After reaching Kanto (post-Elite Four), an entire second region opens with additional Gen 1 species.

#### B.3.1 Kanto Routes and Cities

| Species | Route(s)/Location | Method | Time | Notes |
|---------|------------------|--------|------|-------|
| Pidgey | Route 1, 2, 5, 6, 25 | Grass | Morning/Day | |
| Pidgeotto | Route 8, 13, 14, 15 | Grass | Morning/Day | |
| Rattata | Route 1, 4, 7, 8 | Grass | Night | |
| Raticate | Route 9, 10, 26, 27 | Grass | Night | |
| Spearow | Route 3, 4, 9, 22 | Grass | Morning/Day | |
| Fearow | Route 9, 10, 16, 17, 18, 22 | Grass | Morning/Day | |
| Pikachu | **Viridian Forest** | Grass | Any | ~5-6% encounter rate |
| Sandshrew | Route 4 | Grass | Morning/Day | Mt. Moon area |
| Sandslash | Route 26, 27 | Grass | Morning/Day | |
| Nidoran-F | Route 3 | Grass | Morning/Day | |
| Nidoran-M | Route 3 | Grass | Morning/Day | |
| Nidorina | Route 13, 14, 15 | Grass | Morning/Day | |
| Nidorino | Route 13, 14, 15 | Grass | Morning/Day | |
| Clefairy | Mt. Moon | Walk | Any | |
| Jigglypuff | Route 4 | Grass | Any | |
| Diglett | Diglett's Cave | Walk | Any | 90% encounter rate |
| Dugtrio | Diglett's Cave | Walk | Any | 10% encounter rate |
| Psyduck | Route 6 | Surf | Any | Also Seafoam Islands |
| Golduck | Route 6 | Surf | Any | |
| Mankey | Route 42 | Grass | Morning/Day | **HeartGold only** |
| Growlithe | Route 36, 37, 48 | Grass | Morning/Day | **HeartGold only** |
| Abra | Route 5, 6, 8, 24, 25 | Grass | Any | Teleports immediately |
| Kadabra | Route 8 | Grass | Any | |
| Machop | Rock Tunnel | Walk | Any | |
| Machoke | Rock Tunnel, Cerulean Cave | Walk | Any | |
| Tentacool | Route 19, 20, 21 | Surf | Any | |
| Tentacruel | Route 19, 20, 21 | Surf | Any | |
| Ponyta | Route 22, 26, 27 | Grass | Morning/Day | |
| Rapidash | Route 26, 27 | Grass | Morning/Day | |
| Magnemite | Route 6, 11 | Grass | Any | |
| Magneton | Route 6, 11 | Grass | Any | |
| Farfetch'd | Route 2 | Grass | Morning/Day | |
| Doduo | Route 22, 26, 27 | Grass | Morning/Day | |
| Dodrio | Route 26, 27 | Grass | Morning/Day | |
| Grimer | Route 16, 17, 18 | Grass | Any | Celadon City area |
| Muk | Route 16, 17, 18 | Grass | Any | Rare |
| Shellder | Route 20, 21 | Fishing | Any | |
| Gastly | Lavender Town (Pokemon Tower/Radio Tower area) | Walk | Night | |
| Haunter | Route 8 | Grass | Night | |
| Onix | Rock Tunnel, Victory Road | Walk | Any | |
| Drowzee | Route 11 | Grass | Any | |
| Hypno | Route 11 | Grass | Any | |
| Krabby | Route 19 | Fishing | Any | |
| Kingler | Route 19 | Fishing (Super Rod) | Any | |
| Voltorb | Route 10 | Grass | Any | Near Power Plant |
| Electrode | Route 10 | Grass | Any | |
| Cubone | Rock Tunnel | Walk | Any | |
| Marowak | Rock Tunnel | Walk | Any | Rare |
| Lickitung | Route 44 | Grass | Any | (Johto but accessible) |
| Tangela | Route 21 | Grass | Any | |
| Horsea | Whirl Islands, Seafoam Islands | Fishing | Any | |
| Seadra | Whirl Islands | Fishing (Super Rod) | Any | |
| Goldeen | Route 4 area | Fishing | Any | |
| Seaking | Route 4 area | Fishing (Super Rod) | Any | |
| Staryu | Route 19, 20 | Fishing | Night | |
| Mr. Mime | Route 21 | Grass | Any | |
| Magikarp | Everywhere with water | Old Rod | Any | |
| Gyarados | Most water routes | Good/Super Rod | Any | |
| Ditto | Route 47 | Grass | Any | Swarm only |
| Porygon | Celadon Game Corner | Purchase (9,999 coins) | N/A | Not a wild encounter |

#### B.3.2 Kanto Caves and Dungeons

| Species | Location | Method | Notes |
|---------|----------|--------|-------|
| Zubat | Mt. Moon, Rock Tunnel | Walk | Common |
| Golbat | Mt. Moon, Rock Tunnel, Victory Road | Walk | |
| Clefairy | Mt. Moon | Walk | ~8% rate |
| Geodude | Mt. Moon, Rock Tunnel, Victory Road | Walk | |
| Graveler | Victory Road | Walk | |
| Machop | Rock Tunnel | Walk | |
| Machoke | Cerulean Cave, Rock Tunnel | Walk | |
| Parasect | Cerulean Cave | Walk | All floors |
| Kadabra | Cerulean Cave | Walk | 2F, B1F |
| Magneton | Cerulean Cave | Walk | |
| Primeape | Cerulean Cave | Walk | 1F |
| Electrode | Cerulean Cave | Walk | |
| Ditto | Cerulean Cave | Walk | All floors, common |
| Seel | Seafoam Islands | Walk | |
| Dewgong | Seafoam Islands B3F-B4F | Walk | |
| Jynx | Seafoam Islands B4F | Walk | |
| Psyduck | Seafoam Islands, Cerulean Cave | Surf | |
| Golduck | Seafoam Islands, Cerulean Cave | Surf | |
| Slowpoke | Seafoam Islands | Surf | |
| Slowbro | Seafoam Islands | Surf | |
| Horsea | Seafoam Islands | Fishing | |
| Seadra | Seafoam Islands | Fishing (Super Rod) | |

**Cerulean Cave** is a treasure trove of Gen 1 species and the location of Mewtwo (Lv 70, static encounter). It opens after all 16 badges.

### B.4 Safari Zone (Cianwood City)

The HGSS Safari Zone is the most complex in the series -- fully customizable with block/object placement across 12 areas. Different block configurations attract different species. Some require blocks to be in place for a certain number of real-time days.

**All Safari Zone catches use Safari Balls, NOT Apricorn Balls.** This is important for collector planning -- if you want a species in an Apricorn Ball, you need to find it as a wild encounter outside the Safari Zone.

| Species | Area | Block Requirements | Days | Encounter Method |
|---------|------|-------------------|------|-----------------|
| Pidgey | Peak | None (default) | 0 | Grass |
| Rattata | Plains | None (default) | 0 | Grass |
| Abra | Plains | None (default) | 0 | Grass |
| Geodude | Peak | None (default) | 0 | Grass |
| Magnemite | Peak | None (default) | 0 | Grass |
| Slowpoke | Rocky Beach | None (default) | 0 | Grass |
| Krabby | Rocky Beach | None (default) | 0 | Grass |
| Nidoran-F | Savannah | None (default) | 0 | Grass |
| Nidoran-M | Savannah | None (default) | 0 | Grass |
| Tauros | Savannah | None (default) | 0 | Grass |
| Rhyhorn | Savannah | None (default) | 0 | Grass |
| Jigglypuff | Meadow | None (default) | 0 | Grass (Morning/Day) |
| Clefairy | Meadow | None (default) | 0 | Grass (Night) |
| Spearow | Wetland | None (default) | 0 | Grass |
| Farfetch'd | Wetland | None (default) | 0 | Grass |
| Bellsprout | Forest | None (default) | 0 | Grass |
| Mr. Mime | Forest | None (default) | 0 | Grass |
| Paras | Swamp | None (default) | 0 | Grass |
| Drowzee | Swamp | None (default) | 0 | Grass (Night) |
| Ekans | Marshland | None (default) | 0 | Grass |
| Koffing | Marshland | None (default) | 0 | Grass |
| Grimer | Marshland | None (default) | 0 | Grass |
| Oddish | Marshland | None (default) | 0 | Grass (Night) |
| Doduo | Rocky Beach | None (default) | 0 | Grass |
| Ponyta | Plains | 5 Peak objects | 0 | Grass |
| Graveler | Peak | Some objects | 0 | Grass |
| Magneton | Peak | Some objects | 0 | Grass |
| Magmar | Peak | 10 Peak objects | 0 | Grass |
| Chansey | Meadow | 12 Plains objects | 0 | Grass |
| Slowbro | Rocky Beach | 5 Waterside objects | 0 | Grass |
| Ditto | Wetland | Specific blocks | Varies | Grass |
| Weezing | Marshland | Some objects | 0 | Grass |
| Arbok | Marshland | Some objects | 0 | Grass |
| Gloom | Marshland | Some objects | 0 | Grass (Night) |
| Poliwag | Meadow, Wetland | None (default) | 0 | Fishing |
| Poliwhirl | Meadow, Wetland | None (default) | 0 | Good Rod/Surf |
| Magikarp | Multiple areas | None (default) | 0 | Fishing |
| Goldeen | Rocky Beach | None (default) | 0 | Fishing |
| Psyduck | Wetland | None (default) | 0 | Surf (Night) |
| Golduck | Wetland | None (default) | 0 | Surf (Night) |
| Lapras | Rocky Beach | Waterside blocks | Varies | Surf |
| Dratini | Swamp | None (default) | 0 | Good Rod |
| Dragonair | Swamp | None (default) | 0 | Super Rod |

**Remember:** Safari Ball catches cannot be changed to Apricorn Balls. The Safari Zone is useful for filling your Pokedex or breeding parents, but for collector specimens in Apricorn Balls, use wild encounters from routes/caves.

### B.5 Gift Pokemon and Special Encounters

| Species | Method | Location | Level | Notes |
|---------|--------|----------|-------|-------|
| Bulbasaur | Gift (Professor Oak) | Pallet Town / Silph Co. | 5 | After defeating Red |
| Charmander | Gift (Professor Oak) | Pallet Town / Silph Co. | 5 | After defeating Red |
| Squirtle | Gift (Professor Oak) | Pallet Town / Silph Co. | 5 | After defeating Red |
| Eevee | Gift (Bill) | Goldenrod City | 5 | After meeting Bill in Ecruteak |
| Dratini | Gift (Dragon Elder) | Dragon's Den | 15 | After answering quiz; can know ExtremeSpeed |
| Spearow | Gift (carry mail) | Route 31 gate | 20 | Kenya the Spearow; deliver to Route 31 |
| Porygon | Purchase | Celadon Game Corner | -- | 9,999 coins |
| Omanyte | Fossil revival | Pewter Museum | 20 | Helix Fossil (Rock Smash at Ruins of Alph) |
| Kabuto | Fossil revival | Pewter Museum | 20 | Dome Fossil (Rock Smash at Ruins of Alph) |
| Aerodactyl | Fossil revival | Pewter Museum | 20 | Old Amber (Rock Smash at Ruins of Alph) |
| Hitmonlee/Hitmonchan | Gift (choose one) | Fighting Dojo (Saffron) | -- | After defeating Karate King |
| Snorlax | Static encounter | Route 11/12 | 50 | Wake with Poke Flute radio channel |
| Lapras | Static encounter | Union Cave B2F | 20 | **Fridays only**, respawns weekly |
| Red Gyarados | Static encounter | Lake of Rage | 30 | **Guaranteed Shiny** |

**Gift Pokemon cannot be in Apricorn Balls** -- they come in standard Poke Balls. The Kanto starters, Eevee, Dratini (gift), fossils, and Porygon are all Poke Ball locked when received as gifts. However, **bred offspring inherit the mother's ball** starting in Gen 6, so this matters less for species that can breed.

**Fossils note:** Helix, Dome, and Old Amber fossils can be found randomly by smashing rocks at the Ruins of Alph. They are revived at the Pewter Museum of Science in Kanto. Multiple fossils of each type can be found over time.

### B.6 Legendary Pokemon (Gen 1)

| Pokemon | Location | Level | Requirements |
|---------|----------|-------|-------------|
| **Articuno** | Seafoam Islands B4F | 50 | All 16 badges |
| **Zapdos** | Route 10 (outside Power Plant) | 50 | All 16 badges |
| **Moltres** | Silver Cave exterior / Mt. Silver | 50 | All 16 badges |
| **Mewtwo** | Cerulean Cave B1F | 70 | All 16 badges + Cerulean Cave unlocked |
| **Mew** | **UNOBTAINABLE** | -- | Event only (Wi-Fi defunct) |

**All legendary birds are static encounters** (not roaming) in HGSS. Save before interacting with them to soft-reset for nature/IVs. They can be caught in **any ball you have**, including Apricorn Balls.

**Legendary birds in Apricorn Balls** are some of the most valuable collector specimens possible from HGSS. These are legal combinations that cannot be replicated in any other game at this point in time (Gen 7+ Apricorn Balls are limited supply).

**Mewtwo** in Cerulean Cave is the crown jewel. A Mewtwo in a Moon Ball, Heavy Ball, or Level Ball from HGSS is an extraordinarily rare and desirable specimen.

### B.7 Swarm Pokemon

Swarms are announced daily on Professor Oak's Pokemon Talk radio show. Check the radio each day.

| Species | Location | Gen 1? |
|---------|----------|--------|
| **Chansey** | Route 13 | Yes |
| **Ditto** | Route 47 | Yes |
| Marill | Mt. Mortar | No |
| Yanma | Route 35 | No |
| Dunsparce | Dark Cave | No |
| Snubbull | Route 38 | No |
| Qwilfish | Route 32 | No |
| Remoraid | Route 44 | No |
| Ralts | Route 34 | No |
| Swablu | Route 45 | No |
| Whiscash | Violet City | No |
| Clamperl | Route 19 | No |
| Relicanth | Route 12 | No |
| Luvdisc | Route 27 | No |
| Kricketot | Viridian Forest | No |
| Buneary | Route 25 | No |

**Chansey** (Route 13) and **Ditto** (Route 47) are the key Gen 1 swarm Pokemon. Both are available as swarms -- Ditto's ONLY wild encounter outside the Safari Zone and Cerulean Cave is via swarm on Route 47.

### B.8 Bug-Catching Contest

Held on **Tuesday, Thursday, and Saturday** at the National Park. You receive 20 Sport Balls and can keep your catch.

**Pre-National Dex Gen 1 Bug-types:**

| Species | Notes |
|---------|-------|
| Caterpie | Common |
| Metapod | Common |
| Butterfree | Uncommon |
| Weedle | Common |
| Kakuna | Common |
| Beedrill | Uncommon |
| Paras | |
| Venonat | |
| **Scyther** | Rare, high contest score |
| **Pinsir** | Rare, high contest score |

**Post-National Dex** adds Gen 3 and Gen 4 Bug-types on Thursday and Saturday, but the Gen 1 roster remains available on Tuesday.

**Sport Ball catches persist** -- any Pokemon you keep from the contest retains its Sport Ball. Scyther and Pinsir in Sport Balls are collector items.

### B.9 Hoenn Sound / Sinnoh Sound (Radio)

After obtaining the National Pokedex, special radio channels become available on specific days:

- **Hoenn Sound:** Wednesday
- **Sinnoh Sound:** Thursday

These attract Hoenn/Sinnoh Pokemon to existing encounter areas. **No Gen 1 species** are added through these channels -- they exclusively add Gen 3 and Gen 4 Pokemon.

---

## Section C: HGSS Apricorn Ball Legality Table (CRITICAL)

**This is the most collector-valuable section of the entire document.**

Every Gen 1 species listed below can be legally caught in the wild in HGSS with any of the 7 Apricorn Balls. The table documents WHERE they can be caught (so you know the ball is usable) and any special conditions.

**Key:** All 7 Apricorn Balls (Level, Lure, Moon, Friend, Love, Fast, Heavy) are legal on ANY wild encounter. The "Recommended Ball" column suggests thematic or mechanically optimal choices.

### C.1 Grass/Cave Wild Encounters (Apricorn Ball Legal)

| # | Species | Best Location | Method | Time | Recommended Ball | Notes |
|---|---------|--------------|--------|------|-----------------|-------|
| 010 | Caterpie | Viridian Forest, Headbutt | Grass/Headbutt | Morning/Day | Friend Ball | Common |
| 011 | Metapod | Viridian Forest, Headbutt | Grass/Headbutt | Morning/Day | Friend Ball | |
| 012 | Butterfree | Viridian Forest | Grass | Morning/Day | Moon Ball (evolves by Moon Stone? No -- aesthetic) | Rare |
| 013 | Weedle | Viridian Forest, Headbutt | Grass/Headbutt | Morning/Day | Level Ball | Common |
| 014 | Kakuna | Viridian Forest, Headbutt | Grass/Headbutt | Morning/Day | Level Ball | |
| 015 | Beedrill | Headbutt trees | Headbutt | Morning/Day | Level Ball | Rare |
| 016 | Pidgey | Route 29, 30, 31, etc. | Grass | Morning/Day | Level Ball | Very common |
| 017 | Pidgeotto | Route 43, Kanto routes | Grass | Morning/Day | Level Ball | |
| 019 | Rattata | Route 29, 30, 31 | Grass | Night | Moon Ball | Very common at night |
| 020 | Raticate | Route 38, 39, 47 | Grass | Night | Moon Ball | |
| 021 | Spearow | Route 29, 31, 32, 46 | Grass | Morning/Day | Level Ball | |
| 022 | Fearow | Route 47, Kanto Route 9 | Grass | Morning/Day | Level Ball | |
| 023 | Ekans | Route 32, 33 | Grass | Morning/Day | Moon Ball | |
| 024 | Arbok | Route 47 | Grass | Morning/Day | Moon Ball | |
| 025 | Pikachu | Viridian Forest | Grass | Any | Fast Ball (base Speed 90, close) | 5-6% rate |
| 027 | Sandshrew | Route 4 (Kanto) | Grass | Morning/Day | Heavy Ball | |
| 028 | Sandslash | Route 26, 27 | Grass | Morning/Day | Heavy Ball | |
| 029 | Nidoran-F | Route 3 (Kanto) | Grass | Morning/Day | Moon Ball (Moon Stone evolution!) | |
| 030 | Nidorina | Route 13, 14, 15 | Grass | Morning/Day | Moon Ball | |
| 032 | Nidoran-M | Route 3 (Kanto) | Grass | Morning/Day | Moon Ball (Moon Stone evolution!) | |
| 033 | Nidorino | Route 13, 14, 15 | Grass | Morning/Day | Moon Ball | |
| 035 | Clefairy | Mt. Moon | Walk | Any | **Moon Ball** (Moon Stone evolution -- 4x bonus!) | |
| 037 | Vulpix | Route 36, 37, 48 | Grass | Morning/Day | Love Ball | **SoulSilver only** |
| 039 | Jigglypuff | Route 4 (Kanto) | Grass | Any | **Moon Ball** (Moon Stone evolution -- 4x bonus!) | |
| 041 | Zubat | Dark Cave, Union Cave, etc. | Walk | Any (Night on routes) | Moon Ball | Extremely common in caves |
| 042 | Golbat | Mt. Mortar, Ice Path | Walk | Any | Moon Ball | |
| 043 | Oddish | Route 34 | Grass | Night | Friend Ball | |
| 046 | Paras | Headbutt, Swamp SZ | Grass/Headbutt | Morning/Day | Friend Ball | |
| 048 | Venonat | Route 43 | Grass | Night | Moon Ball | |
| 050 | Diglett | Diglett's Cave (Kanto) | Walk | Any | Heavy Ball (ironic -- very light) | 90% encounter rate |
| 051 | Dugtrio | Diglett's Cave (Kanto) | Walk | Any | Heavy Ball | 10% encounter rate |
| 052 | Meowth | Route 39 | Grass | Night | Moon Ball | **SoulSilver only** |
| 054 | Psyduck | Route 6 (Kanto) | Surf | Any | Lure Ball | |
| 055 | Golduck | Route 6 (Kanto) | Surf | Any | Lure Ball | |
| 056 | Mankey | Route 42 | Grass | Morning/Day | Level Ball | **HeartGold only** |
| 057 | Primeape | Route 42 (rare) | Grass | Morning/Day | Level Ball | **HeartGold only** |
| 058 | Growlithe | Route 36, 37, 48 | Grass | Morning/Day | Fast Ball | **HeartGold only** |
| 063 | Abra | Route 5, 6, 24, 25 (Kanto) | Grass | Any | Fast Ball (teleports -- need Speed!) | |
| 064 | Kadabra | Cerulean Cave, Route 8 | Grass/Walk | Any | Fast Ball | |
| 066 | Machop | Rock Tunnel, Mt. Mortar | Walk | Any | Heavy Ball | |
| 067 | Machoke | Cerulean Cave, Rock Tunnel | Walk | Any | Heavy Ball | |
| 069 | Bellsprout | Route 31, 32, 44 | Grass | Morning/Day | Friend Ball | |
| 074 | Geodude | Mt. Moon, Dark Cave, etc. | Walk | Any | Heavy Ball | |
| 075 | Graveler | Victory Road | Walk | Any | Heavy Ball | |
| 077 | Ponyta | Route 22, 26, 27 (Kanto) | Grass | Morning/Day | Fast Ball (base Speed 90) | |
| 078 | Rapidash | Route 26, 27 | Grass | Morning/Day | Fast Ball (base Speed 105 -- 4x bonus!) | |
| 079 | Slowpoke | Slowpoke Well | Surf | Any | Lure Ball | |
| 081 | Magnemite | Route 38, 39 | Grass | Any | Heavy Ball | |
| 082 | Magneton | Route 38 (rare), Cerulean Cave | Grass | Any | Heavy Ball | |
| 083 | Farfetch'd | Route 2 (Kanto) | Grass | Morning/Day | Friend Ball | |
| 084 | Doduo | Route 34, Route 22 (Kanto) | Grass | Morning/Day | Level Ball | |
| 085 | Dodrio | Route 26, 27 | Grass | Morning/Day | Level Ball | |
| 086 | Seel | Whirl Islands, Seafoam Islands | Walk | Any | Lure Ball | |
| 087 | Dewgong | Whirl Islands, Seafoam Islands | Walk | Any | Lure Ball | |
| 088 | Grimer | Route 16, 17, 18 (Kanto) | Grass | Any | Heavy Ball | |
| 089 | Muk | Route 16, 17, 18 (Kanto) | Grass | Any | Heavy Ball | Rare |
| 092 | Gastly | Sprout Tower, Bell Tower | Walk | Night | Moon Ball | |
| 093 | Haunter | Route 8 (Kanto) | Grass | Night | Moon Ball | |
| 095 | Onix | Union Cave, Rock Tunnel | Walk | Any | Heavy Ball (very heavy -- big bonus!) | |
| 096 | Drowzee | Route 11 (Kanto), Route 34 | Grass | Night/Any | Moon Ball | |
| 097 | Hypno | Route 11 (Kanto) | Grass | Any | Moon Ball | |
| 100 | Voltorb | Route 10, Route 43 | Grass | Any | Fast Ball (base Speed 100 -- 4x bonus!) | |
| 101 | Electrode | Route 10, Cerulean Cave | Grass/Walk | Any | Fast Ball (base Speed 150 -- 4x bonus!) | |
| 102 | Exeggcute | Headbutt trees | Headbutt | Any | Friend Ball | Primary method |
| 104 | Cubone | Rock Tunnel | Walk | Any | Level Ball | |
| 105 | Marowak | Rock Tunnel | Walk | Any | Level Ball | Rare |
| 109 | Koffing | Route 32, Burned Tower | Grass/Walk | Any | Heavy Ball | |
| 110 | Weezing | Burned Tower | Walk | Any | Heavy Ball | |
| 111 | Rhyhorn | Safari Zone (Savannah) | Grass | Any | Heavy Ball (very heavy!) | Safari Ball only in SZ! |
| 114 | Tangela | Route 21 (Kanto) | Grass | Any | Friend Ball | |
| 115 | Kangaskhan | Pokewalker only | Pokewalker | N/A | **Poke Ball only** (Pokewalker limitation) | |
| 122 | Mr. Mime | Route 21 (Kanto) | Grass | Any | Love Ball | |
| 124 | Jynx | Seafoam Islands B4F | Walk | Any | Love Ball | |
| 125 | Electabuzz | Route 10 (Kanto) | Grass | Morning/Day | Fast Ball | |
| 126 | Magmar | Burned Tower | Walk | Any | Level Ball | Also Safari Zone |
| 127 | Pinsir | Bug-Catching Contest | Sport Ball | Tue/Thu/Sat | **Sport Ball only** (contest). For Apricorn: National Park grass? Not available wild outside contest. |
| 128 | Tauros | Route 38, 39 | Grass | Morning/Day | Heavy Ball | |
| 132 | Ditto | Route 47 (swarm), Cerulean Cave | Grass/Walk | Any | Moon Ball | Cerulean Cave is reliable |
| 143 | Snorlax | Route 11/12 | Static | N/A | **Heavy Ball** (1014.1 lbs -- maximum bonus!) | Only one per save |
| 147 | Dratini | Dragon's Den | Fishing (Super Rod) | Any | Lure Ball (fishing bonus!) | |
| 148 | Dragonair | Dragon's Den | Fishing (Super Rod) | Any | Lure Ball | Rare |

### C.2 Fishing Encounters (Lure Ball Especially Relevant)

| # | Species | Best Location | Rod | Recommended Ball | Notes |
|---|---------|--------------|-----|-----------------|-------|
| 054 | Psyduck | Various water routes | Surf/Good Rod | Lure Ball | |
| 060 | Poliwag | Route 30, Ecruteak | Old/Good Rod | Lure Ball | |
| 061 | Poliwhirl | Ecruteak, Route 44 | Good/Super Rod | Lure Ball | |
| 072 | Tentacool | Route 40, 41 | Surf | Lure Ball | |
| 073 | Tentacruel | Route 41 | Surf | Lure Ball | |
| 079 | Slowpoke | Slowpoke Well | Surf/Good Rod | Lure Ball | |
| 080 | Slowbro | Seafoam Islands | Surf | Lure Ball | |
| 098 | Krabby | Route 40, Olivine | Good Rod | Lure Ball | |
| 099 | Kingler | Route 19 | Super Rod | Lure Ball | |
| 116 | Horsea | Whirl Islands | Good Rod | Lure Ball | |
| 117 | Seadra | Whirl Islands | Super Rod | Lure Ball | |
| 118 | Goldeen | Route 42, various | Good Rod | Lure Ball | |
| 119 | Seaking | Route 42, various | Super Rod | Lure Ball | |
| 120 | Staryu | Route 19, 34 | Fishing | Lure Ball | Night only on some routes |
| 129 | Magikarp | Everywhere | Old Rod | Lure Ball (or any -- it's Magikarp) | |
| 130 | Gyarados | Lake of Rage, various | Super Rod/Surf | Lure Ball | Excluding Red Gyarados |
| 131 | Lapras | Union Cave B2F | Surf (static, Friday) | **Any Apricorn Ball** | Lv 20, respawns weekly |
| 147 | Dratini | Dragon's Den | Super Rod | Lure Ball | |
| 148 | Dragonair | Dragon's Den | Super Rod | Lure Ball | Rare |

### C.3 Species NOT Available in Apricorn Balls from HGSS

These Gen 1 species **cannot be caught in Apricorn Balls** in HGSS:

| # | Species | Why | How to Obtain in HGSS |
|---|---------|-----|----------------------|
| 001 | Bulbasaur | Gift Pokemon (Poke Ball) | Professor Oak after defeating Red |
| 002 | Ivysaur | Evolution only | Evolve Bulbasaur |
| 003 | Venusaur | Evolution only | Evolve Ivysaur |
| 004 | Charmander | Gift Pokemon (Poke Ball) | Professor Oak after defeating Red |
| 005 | Charmeleon | Evolution only | Evolve Charmander |
| 006 | Charizard | Evolution only | Evolve Charmeleon |
| 007 | Squirtle | Gift Pokemon (Poke Ball) | Professor Oak after defeating Red |
| 008 | Wartortle | Evolution only | Evolve Squirtle |
| 009 | Blastoise | Gift Pokemon (Poke Ball) | Evolve Wartortle |
| 018 | Pidgeot | Evolution only | Evolve Pidgeotto |
| 026 | Raichu | Evolution only | Thunder Stone on Pikachu |
| 031 | Nidoqueen | Evolution only | Moon Stone on Nidorina |
| 034 | Nidoking | Evolution only | Moon Stone on Nidorino |
| 036 | Clefable | Evolution only | Moon Stone on Clefairy |
| 038 | Ninetales | Evolution only | Fire Stone on Vulpix (SS) |
| 040 | Wigglytuff | Evolution only | Moon Stone on Jigglypuff |
| 044 | Gloom | Evolution only | Evolve Oddish |
| 045 | Vileplume | Evolution only | Leaf Stone on Gloom |
| 047 | Parasect | Evolution only | Evolve Paras (also Cerulean Cave wild) |
| 049 | Venomoth | Evolution only | Evolve Venonat |
| 053 | Persian | Evolution only | Evolve Meowth (SS) |
| 059 | Arcanine | Evolution only | Fire Stone on Growlithe (HG) |
| 062 | Poliwrath | Evolution only | Water Stone on Poliwhirl |
| 065 | Alakazam | Trade evolution | Trade Kadabra |
| 068 | Machamp | Trade evolution | Trade Machoke |
| 070 | Weepinbell | Evolution only | Evolve Bellsprout |
| 071 | Victreebel | Evolution only | Leaf Stone on Weepinbell |
| 076 | Golem | Trade evolution | Trade Graveler |
| 091 | Cloyster | Evolution only | Water Stone on Shellder |
| 094 | Gengar | Trade evolution | Trade Haunter |
| 103 | Exeggutor | Evolution only | Leaf Stone on Exeggcute |
| 106 | Hitmonlee | Gift (Saffron Dojo) | Choose from Fighting Dojo |
| 107 | Hitmonchan | Gift (Saffron Dojo) | Choose from Fighting Dojo |
| 108 | Lickitung | Route 44 wild | Can catch in Apricorn Ball in Johto Route 44 |
| 112 | Rhydon | Evolution only | Evolve Rhyhorn |
| 113 | Chansey | Route 13 (swarm) | Swarm = catchable in Apricorn Ball! |
| 121 | Starmie | Evolution only | Water Stone on Staryu |
| 123 | Scyther | Bug-Catching Contest | Sport Ball only (contest) |
| 133 | Eevee | Gift (Bill) | Poke Ball |
| 134 | Vaporeon | Evolution only | Water Stone on Eevee |
| 135 | Jolteon | Evolution only | Thunder Stone on Eevee |
| 136 | Flareon | Evolution only | Fire Stone on Eevee |
| 137 | Porygon | Purchase (Game Corner) | Poke Ball |
| 138 | Omanyte | Fossil revival | Poke Ball |
| 139 | Omastar | Evolution only | Evolve Omanyte |
| 140 | Kabuto | Fossil revival | Poke Ball |
| 141 | Kabutops | Evolution only | Evolve Kabuto |
| 142 | Aerodactyl | Fossil revival | Poke Ball |
| 144 | Articuno | Seafoam Islands (static) | **CAN catch in Apricorn Ball** |
| 145 | Zapdos | Route 10 (static) | **CAN catch in Apricorn Ball** |
| 146 | Moltres | Silver Cave/Mt. Silver (static) | **CAN catch in Apricorn Ball** |
| 149 | Dragonite | Evolution only | Evolve Dragonair |
| 150 | Mewtwo | Cerulean Cave (static) | **CAN catch in Apricorn Ball** |
| 151 | Mew | **UNOBTAINABLE** | Event only (defunct Wi-Fi) |

**Corrections to the above:** Lickitung IS wild on Route 44 and CAN be caught in Apricorn Balls. Chansey IS available as a swarm and CAN be caught in Apricorn Balls. Parasect IS wild in Cerulean Cave. Scyther is contest-only (Sport Ball). The legendary birds and Mewtwo CAN all be caught in Apricorn Balls.

**Key takeaway:** The only Gen 1 species that truly cannot exist in Apricorn Balls from HGSS are:
- Starters and their evolutions (Bulbasaur/Charmander/Squirtle lines) -- gift only
- Eevee and Eeveelutions -- gift only
- Porygon -- purchase only
- Fossil Pokemon (Omanyte, Kabuto, Aerodactyl lines) -- revival only
- Hitmonlee/Hitmonchan -- gift only (from Tyrogue/Fighting Dojo)
- Mew -- unobtainable
- Scyther -- Bug-Catching Contest only (Sport Ball)
- Species that only exist as evolutions of wild-catchable Pokemon inherit the ball from Gen 6+ breeding

**Gen 6+ breeding note:** Starting in Gen 6, female Pokemon pass down their ball type to offspring. This means a female Pikachu in a Moon Ball can produce Moon Ball Pichu eggs. This retroactively makes HGSS Apricorn Ball catches even more valuable -- they become breeding stock for Apricorn Ball specimens of their entire evolutionary family.

---

## Section D: DPPt -- Gen 1 Species Availability

DPPt is secondary to HGSS for Gen 1 collecting, but some species appear here first (especially in the Sinnoh regional Dex) and the games have exclusive features (Super Contests, Pal Park, Platinum move tutors).

### D.1 Sinnoh Regional Dex (Gen 1 Species)

The following Gen 1 species are in the Sinnoh regional Dex (available before National Dex):

| Species | Location | Notes |
|---------|----------|-------|
| Zubat | Route 203, 204, 206-209, 211, many caves | Very common |
| Golbat | Mt. Coronet, Victory Road, caves | |
| Geodude | Route 206, 207, 211, caves | |
| Graveler | Mt. Coronet, Iron Island, Victory Road | |
| Psyduck | Route 203, 208, 210, Lake areas | Surf/Grass |
| Golduck | Route 208, 210, Lake areas | Surf |
| Machop | Route 207, 208 | |
| Machoke | Route 210, 211, Mt. Coronet | |
| Magikarp | Everywhere (fishing) | Old Rod universal |
| Gyarados | Most water routes | Good/Super Rod |
| Ponyta | Route 206, 207, 211 (Platinum) | |
| Rapidash | Route 214, 227 (Platinum) | |
| Onix | Iron Island, Oreburgh Mine | |
| Gastly | Old Chateau, Lost Tower | Night |
| Haunter | Old Chateau, Lost Tower | Night |
| Pikachu | Trophy Garden | Permanent (not daily rotation) |
| Tentacool | Route 218, 219, 220, 221, etc. | Surf |
| Tentacruel | Route 223, 224 | Surf |
| Magnemite | Fuego Ironworks | |
| Magneton | Fuego Ironworks | |
| Abra | Route 203, 215 | Day |
| Kadabra | Route 215 | Rare |
| Mr. Mime | Route 218 (Platinum), 222 | Rare |
| Electabuzz | Route 222 | |

### D.2 Post-National Dex Encounters

After obtaining the National Dex, many more Gen 1 species become available:

#### D.2.1 Trophy Garden (Daily Rotation)

The Trophy Garden behind the Pokemon Mansion on Route 212 has Mr. Backlot who claims to see rare Pokemon. After the claim, the Pokemon appears in the garden for 2 days.

**Gen 1 species in Trophy Garden rotation:**

| Species | Notes |
|---------|-------|
| **Pikachu** | Always available (not rotation) |
| Clefairy | Daily rotation |
| Jigglypuff | Daily rotation |
| Meowth | Daily rotation |
| Chansey | Daily rotation |
| Ditto | Daily rotation |
| Eevee | Daily rotation |
| Porygon | Daily rotation -- **only wild Porygon in DPPt** |

#### D.2.2 Great Marsh (Safari Zone)

Located in Pastoria City. After National Dex, use the binoculars daily to check for rare Pokemon.

**Gen 1 species in Great Marsh:**

| Species | Method | Notes |
|---------|--------|-------|
| Psyduck | Default grass | Common |
| Magikarp | Default fishing | Common |
| Gyarados | Default fishing | Good/Super Rod |
| Tangela | Default grass | Levels 27-31 |
| Arbok | Dual-slot (FireRed in GBA slot) | Not a standard encounter |

#### D.2.3 Swarm Pokemon (Platinum)

| Species | Route | Notes |
|---------|-------|-------|
| Doduo | Route 201 | |
| Cubone | Route 203 | |
| Drowzee | Route 215 | |
| Voltorb | Route 218 | |
| Farfetch'd | Route 221 | |
| Krabby | Route 226 | |
| Pinsir | Route 229 | **Only wild Pinsir in Platinum** |

#### D.2.4 Dual-Slot Mode (DS/DS Lite Only)

With a GBA Pokemon game in the GBA slot, certain Pokemon appear:

| GBA Game | Gen 1 Species Added | Location |
|----------|-------------------|----------|
| FireRed | Caterpie, Metapod, Ekans, Arbok, Growlithe, Elekid | Various routes |
| LeafGreen | Weedle, Kakuna, Sandshrew, Sandslash, Vulpix, Magby | Various routes |

**Hardware limitation:** Dual-slot mode requires a DS or DS Lite. DSi, 3DS, and 2DS families cannot use this feature.

#### D.2.5 Platinum-Specific Additions

Platinum significantly expanded the Sinnoh Dex and post-game encounters:

| Species | Location | Notes |
|---------|----------|-------|
| Articuno | Roaming Sinnoh | After National Dex + talk to Prof. Oak in Eterna City, Lv 60 |
| Zapdos | Roaming Sinnoh | Same trigger, Lv 60 |
| Moltres | Roaming Sinnoh | Same trigger, Lv 60 |
| Eevee | Bebe's gift (Hearthome City) | One per save, Lv 20 (Platinum) / Lv 5 (DP) |

**Legendary birds in Platinum** roam Sinnoh like Mesprit/Cresselia after obtaining the National Dex and speaking to Professor Oak in Eterna City. They are level 60 and can be caught in any ball. However, roaming mechanics make them difficult to catch in specific balls -- Quick Ball or Dusk Ball recommended.

---

## Section E: Gen 4 Move Tutors

Platinum and HGSS have extensive move tutor lists that are critical for specimen quality. Some tutor moves are **legacy** -- removed or restricted in later generations.

### E.1 Platinum Move Tutors

Three tutor NPCs, paid with colored shards found underground:

#### Route 212 Tutor (13 moves)

| Move | Type | Category | Cost | Notable Gen 1 Learners |
|------|------|----------|------|----------------------|
| Fire Punch | Fire | Physical | 6 Blue, 2 Red | Alakazam, Machamp, Hypno, Electabuzz, Magmar |
| Ice Punch | Ice | Physical | 6 Blue, 2 Red | Alakazam, Machamp, Hypno, Electabuzz |
| ThunderPunch | Electric | Physical | 6 Blue, 2 Red | Alakazam, Machamp, Hypno, Electabuzz |
| Knock Off | Dark | Physical | 4 Blue, 4 Red | Many Pokemon |
| Sucker Punch | Dark | Physical | 6 Blue, 2 Yellow | Raticate, Persian, Machamp |
| Trick | Psychic | Special | 4 Blue, 4 Yellow | Alakazam, Mr. Mime, Gengar |
| Zen Headbutt | Psychic | Physical | 4 Blue, 4 Yellow | Many Pokemon |
| Icy Wind | Ice | Special | 6 Blue, 2 Green | Lapras, Dewgong, Cloyster |
| Vacuum Wave | Fighting | Special | 4 Blue, 2 Red, 2 Green | Hitmonchan |
| Dive | Water | Physical | 4 Blue, 2 Red, 2 Yellow | Various Water-types |
| Fury Cutter | Bug | Physical | 8 Blue | Various |
| Air Cutter | Flying | Special | 4 Blue, 2 Red, 2 Green | Golbat, Fearow |
| Ominous Wind | Ghost | Special | 6 Blue, 2 Green | Gengar, Golbat |

#### Snowpoint City Tutor (8 moves)

| Move | Type | Category | Cost | Notable Gen 1 Learners |
|------|------|----------|------|----------------------|
| Helping Hand | Normal | Status | 2 Red, 4 Yellow, 2 Green | Eevee/Eeveelutions |
| Last Resort | Normal | Physical | 8 Green | Eevee/Eeveelutions |
| Snore | Normal | Special | 2 Red, 4 Yellow, 2 Green | Many |
| Spite | Ghost | Status | 8 Yellow | Gengar, Lapras |
| Swift | Normal | Special | 2 Red, 2 Yellow, 4 Green | Eevee, Pikachu, Starmie |
| Synthesis | Grass | Status | 2 Yellow, 6 Green | Bulbasaur line, Oddish line |
| Uproar | Normal | Special | 6 Yellow, 2 Green | Exploud line, various |
| Magnet Rise | Electric | Status | 2 Blue, 4 Yellow, 2 Green | Magnezone, Electrode |

#### Survival Area Tutor (17 moves)

| Move | Type | Category | Cost | Notable Gen 1 Learners |
|------|------|----------|------|----------------------|
| Superpower | Fighting | Physical | 8 Red | Dragonite, Snorlax, Rhyperior |
| Outrage | Dragon | Physical | 6 Red, 2 Yellow | **Dragonite** (critical tutor move) |
| Heat Wave | Fire | Special | 2 Blue, 4 Red, 2 Green | Arcanine, Charizard, Ninetales |
| Earth Power | Ground | Special | 6 Red, 2 Green | Nidoking, Nidoqueen |
| Seed Bomb | Grass | Physical | 4 Red, 4 Green | Venusaur, Exeggutor |
| Iron Head | Steel | Physical | 6 Red, 2 Yellow | Steelix (Onix evo) |
| Aqua Tail | Water | Physical | 6 Red, 2 Green | Gyarados, various |
| Gunk Shot | Poison | Physical | 2 Blue, 4 Red, 2 Green | Muk, Arbok |
| Signal Beam | Bug | Special | 2 Blue, 2 Red, 2 Yellow, 2 Green | Venomoth, Butterfree |
| Ancientpower | Rock | Special | 6 Red, 2 Green | Various |
| Bounce | Flying | Physical | 4 Red, 2 Yellow, 2 Green | Gyarados |
| Twister | Dragon | Special | 6 Red, 2 Green | Gyarados, Dragonite |
| Iron Defense | Steel | Status | 2 Blue, 4 Red, 2 Yellow | Various |
| Mud-Slap | Ground | Special | 4 Blue, 4 Red | Various |
| Rollout | Rock | Physical | 2 Blue, 4 Red, 2 Green | Various |
| Endeavor | Normal | Physical | 4 Red, 4 Yellow | Various |
| Gastro Acid | Poison | Status | 4 Red, 2 Yellow, 2 Green | Various |

### E.2 HGSS Move Tutors

HGSS has all Platinum tutor moves plus additional exclusives, taught at the Battle Frontier for Battle Points.

#### HGSS-Exclusive Tutor Moves (not in Platinum)

| Move | Type | Category | BP Cost | Notable Gen 1 Learners |
|------|------|----------|---------|----------------------|
| **Heal Bell** | Normal | Status | 48 BP | Blissey/Chansey, Miltank |
| **Pain Split** | Normal | Status | 64 BP | Gengar, Misdreavus |
| **Sky Attack** | Flying | Physical | 64 BP | Articuno, Fearow, Pidgeot |
| **Super Fang** | Normal | Physical | 40 BP | Raticate |
| **Bug Bite** | Bug | Physical | 32 BP | Various Bug-types |
| **Block** | Normal | Status | 32 BP | Snorlax |
| **Gravity** | Psychic | Status | 32 BP | Various |
| **Magic Coat** | Psychic | Status | 32 BP | Various |
| **Role Play** | Psychic | Status | 48 BP | Mr. Mime, Alakazam |
| **String Shot** | Bug | Status | 32 BP | Caterpie line, Weedle line |
| **Tailwind** | Flying | Status | 48 BP | Pidgeot, various |
| **Worry Seed** | Grass | Status | 32 BP | Exeggcute line |
| **Low Kick** | Fighting | Physical | 32 BP | Machamp, Primeape |

#### Full HGSS Battle Frontier Tutor Move List (by BP Cost)

**32 BP:** Bounce, Gastro Acid, Gunk Shot, Low Kick, Mud-Slap, Rollout, Bug Bite, Fury Cutter, Block, Gravity, Magic Coat, Snore, String Shot, Worry Seed

**40 BP:** Ancientpower, Aqua Tail, Earth Power, Iron Defense, Iron Head, Seed Bomb, Signal Beam, Super Fang, Twister, Dive, Knock Off, Sucker Punch, Helping Hand, Magnet Rise, Spite, Swift, Synthesis

**48 BP:** Heat Wave, Outrage, Superpower, Air Cutter, Icy Wind, Ominous Wind, Trick, Vacuum Wave, Heal Bell, Last Resort, Role Play, Tailwind, Uproar

**64 BP:** Endeavor, Pain Split, Sky Attack, Fire Punch, Ice Punch, ThunderPunch, Zen Headbutt

### E.3 Legacy Move Considerations

Some tutor moves from Gen 4 later became restricted or were removed from certain Pokemon's movepools. A Pokemon taught these moves in Gen 4 retains them permanently -- they become **legacy moves** that cannot be relearned in later games.

Notable examples:
- **Outrage Dragonite** (Platinum/HGSS tutor) -- This move has remained available in later gens, but the tutor access makes it easy to acquire in Gen 4.
- **Heal Bell** on various species -- HGSS-exclusive tutor; some Pokemon lost Heal Bell access in later gens.
- **Gunk Shot** on Muk -- Available via HGSS tutor; access varies in later gens.
- **Fire/Ice/ThunderPunch** on Alakazam and other special attackers -- These physical punch moves are mainly useful on mixed attackers, and access has shifted across generations.

**General advice:** Before transferring Gen 4 Pokemon to Gen 5, check if any moves they can learn via tutor will become unavailable in later generations. Teach those moves before transferring.

### E.4 Headbutt (HGSS-Exclusive Move Access)

Headbutt is taught for free by a man in Ilex Forest. In HGSS, this is both an overworld move (for shaking trees) and a battle move. Headbutt is not available as a TM or tutor move in Gen 4 DPPt.

---

## Section F: Breeding in Gen 4

### F.1 Gen 4 Breeding Summary for Gen 1 Species

| Feature | Mechanic | Notes |
|---------|----------|-------|
| Nature passing | Everstone (50%) | Either parent |
| IV inheritance | 3 random IVs + Power Items | Power Items guarantee one stat |
| Ability | Random from species pool | No inheritance in Gen 4 |
| Ball | Always Poke Ball | Ball inheritance starts Gen 6 |
| Egg moves | Father only | Father must know the move |
| Masuda Method | 5/8192 shiny rate | Conflicts with Everstone in Gen 4 |
| Shiny Charm | Does not exist | Introduced Gen 5 |

### F.2 Ditto Locations

Ditto is essential for breeding any species (especially genderless Pokemon):

| Game | Location | Method | Reliability |
|------|----------|--------|------------|
| DPPt | Route 218 | Poke Radar (post-National Dex) | Moderate (need Poke Radar chains) |
| DPPt | Trophy Garden | Daily rotation | Unreliable (random day) |
| HGSS | Route 47 | Swarm (random day) | Unreliable |
| HGSS | Cerulean Cave | Walk (all floors) | **Best source -- always available** |
| HGSS | Safari Zone (Wetland) | Grass (with specific objects) | Requires Safari Zone setup |

**Recommendation:** Cerulean Cave in HGSS is the most reliable Ditto source. Catch several with different natures using Synchronize leads.

### F.3 Masuda Method Strategy

Since Everstone and Masuda Method conflict in Gen 4:

1. **If you want a specific nature:** Use Everstone, accept normal 1/8192 shiny odds.
2. **If you want boosted shiny odds:** Use Masuda Method (foreign parent), accept random nature.
3. **Best of both worlds:** Wait for Gen 5, where both work simultaneously.

For Gen 4 specifically, breeding for competitive specimens with correct nature is more practical than shiny hunting via Masuda Method.

### F.4 Notable Gen 4 Egg Moves for Gen 1 Species

Gen 4 added several egg moves that were new to Gen 1 species. Some notable additions:

| Species | Egg Move | Notes |
|---------|----------|-------|
| Charmander | Dragon Dance | Physical Charizard build enabler |
| Squirtle | Aqua Jet | Priority Water STAB |
| Bulbasaur | Leaf Storm | Powerful special STAB |
| Gastly | Disable | Utility move via breeding |
| Machop | Ice Punch, ThunderPunch | Coverage moves as egg moves |
| Dratini | ExtremeSpeed | Also available via Dragon's Den gift |

---

## Section G: Walkthrough Checklists

### G.1 HGSS Collector Walkthrough

#### Phase 1: Johto Story (Badges 1-8)

1. **Start game.** Choose any Johto starter (not a Gen 1 species).
2. **Azalea Town** -- After clearing Slowpoke Well, Kurt begins making Apricorn Balls. Start daily Apricorn harvesting immediately.
3. **Ilex Forest** -- Learn Headbutt from NPC. Begin Headbutt encounters for Bug-types.
4. **Goldenrod City** -- Receive Eevee from Bill (Poke Ball, cannot change). Visit Radio Tower for PokeGear upgrade.
5. **Ecruteak City** -- Burned Tower for Koffing, Magmar.
6. **Route 38-39** -- Begin catching Tauros, Magnemite/Magneton. Meowth at night (SoulSilver only).
7. **Route 42** -- Blue Apricorn tree. Mankey/Primeape (HeartGold only).
8. **Union Cave B2F** -- Lapras on Fridays (Lv 20). Catch in Apricorn Ball!
9. **Lake of Rage** -- Red Gyarados (guaranteed shiny). Cannot be in Apricorn Ball (Red Gyarados is in a regular encounter, but use whatever ball -- static encounter allows Apricorn Ball use).
10. **National Park** -- Bug-Catching Contest (Tue/Thu/Sat) for Scyther/Pinsir in Sport Balls.
11. **Dragon's Den** -- Dratini gift or fish for wild Dratini/Dragonair (Super Rod, Lure Ball ideal).

**Daily tasks during Johto:**
- Harvest all Apricorn trees on accessible routes
- Deliver Apricorns to Kurt (one at a time, ready next day)
- Check radio for swarm Pokemon (Chansey, Ditto)
- Bug-Catching Contest on Tue/Thu/Sat
- Lapras on Fridays

#### Phase 2: Kanto (Badges 9-16)

12. **Kanto routes** -- Catch everything. Viridian Forest (Pikachu), Diglett's Cave (Diglett/Dugtrio), Rock Tunnel (Machop, Cubone, Onix).
13. **Route 16-18** -- Grimer, Muk (Apricorn Ball catches).
14. **Route 10** -- Voltorb, Electrode. Prepare for Zapdos later.
15. **Seafoam Islands** -- Seel, Dewgong, Jynx, Horsea/Seadra. Articuno after 16 badges.
16. **Cerulean Cave (post-16 badges)** -- Ditto, Machoke, Kadabra, Magneton, Parasect, Primeape, Electrode, Mewtwo. Catch Ditto here for breeding.
17. **Pewter Museum** -- Revive fossils (Omanyte/Kabuto/Aerodactyl). Poke Ball locked.
18. **Celadon Game Corner** -- Porygon (9,999 coins). Poke Ball locked.
19. **Professor Oak** -- After defeating Red, receive one Kanto starter (Bulbasaur/Charmander/Squirtle). Poke Ball locked.
20. **Safari Zone (Cianwood)** -- Begin customizing areas with objects. Some species need blocks placed for 10-100+ days. Start early. Safari Ball catches only.

#### Phase 3: Post-Game + Legendary Hunting

21. **Articuno** -- Seafoam Islands B4F (Lv 50). All 16 badges required. Save before interacting. **Catch in your best Apricorn Ball.**
22. **Zapdos** -- Route 10 outside Power Plant (Lv 50). Save before interacting. **Fast Ball is thematic.**
23. **Moltres** -- Mt. Silver area (Lv 50). Save before interacting. **Level Ball is thematic.**
24. **Mewtwo** -- Cerulean Cave B1F (Lv 70). The ultimate specimen. **Moon Ball or Heavy Ball.**
25. **Snorlax** -- Route 11/12 (Lv 50). Tune Poke Flute radio. **Heavy Ball (1014.1 lbs = maximum bonus!).**

#### Phase 4: Cross-Game for Ribbons

26. **Trade Apricorn Ball specimens to DPPt** for Super Contest ribbons (HGSS has no contests).
27. **Earn all 20 Super Contest ribbons** in Hearthome City.
28. **Earn Battle Tower/Frontier ribbons** in either game.
29. **Collect daily ribbons** (Monday-Sunday).

### G.2 DPPt Collector Walkthrough

#### Phase 1: Sinnoh Story

1. Play through the main story. Catch Gen 1 species as they appear (Zubat, Geodude, Magikarp, Psyduck, etc.).
2. **Trophy Garden** -- Once accessed, check daily for Clefairy, Jigglypuff, Meowth, Chansey, Ditto, Eevee, Porygon.
3. **Hearthome City** -- Begin Super Contests as soon as possible.
4. **Platinum only:** Expanded Sinnoh Dex means more Gen 1 species available during the story.

#### Phase 2: Post-National Dex

5. **Great Marsh binoculars** -- Check daily for rare spawns.
6. **Swarm Pokemon** -- Check Dawn's sister in Sandgem Town daily.
7. **Pal Park** -- Transfer Gen 3 specimens if desired (requires DS/DS Lite with GBA slot).
8. **Platinum: Legendary Birds** -- Roaming after talking to Oak in Eterna City. Level 60.
9. **Move Tutors** -- Teach tutor moves before transferring to Gen 5.

### G.3 Cross-Game Coordination

**Optimal order for maximum value:**

1. **Start with HGSS** -- This is where you catch Apricorn Ball specimens. HGSS is the priority game.
2. **Trade key specimens to DPPt** for Super Contest ribbons.
3. **Use Platinum move tutors** on specimens that need specific tutor moves.
4. **Return specimens to HGSS** for HGSS-exclusive move tutors (Heal Bell, Pain Split, etc.) and the Legend Ribbon (defeat Red).
5. **Final move tutor pass** in whichever game has the moves you need.
6. **Poke Transfer to Gen 5** when all Gen 4 business is complete.

---

## Section H: Transfer/Lockout Summary

### H.1 Complete Before Leaving Gen 4

Once you Poke Transfer to Gen 5, the Pokemon **cannot return to Gen 4**. Complete ALL of the following before transferring:

| Task | Game | Priority |
|------|------|----------|
| All 20 Super Contest ribbons | DPPt | High (Gen 4-exclusive format) |
| Battle Tower/Frontier ribbons | DPPt/HGSS | High (Gen 4-exclusive) |
| Legend Ribbon | HGSS | High (HGSS-exclusive) |
| Daily ribbons (Mon-Sun) | DPPt/HGSS | Medium |
| Effort Ribbon | DPPt/HGSS | Low (available in later gens) |
| Footprint Ribbon | DPPt/HGSS | Low (available in later gens) |
| All desired Platinum tutor moves | Platinum | **Critical** |
| All desired HGSS tutor moves | HGSS | **Critical** |
| Remove all HM moves | Any Gen 4 | **Required** (blocks transfer) |
| Remove all held items | Any Gen 4 | **Required** (items stripped by Poke Transfer) |

### H.2 Poke Transfer Checklist

Before each batch of 6 Pokemon:

- [ ] No HM moves (Surf, Fly, Waterfall, Rock Smash, Cut, Strength, Whirlpool, Rock Climb)
- [ ] No valuable held items (they will be lost)
- [ ] All desired tutor moves learned
- [ ] All desired ribbons earned
- [ ] All desired contest performance complete
- [ ] Pokemon is in its final desired ball (cannot change after transfer)

### H.3 HGSS Apricorn Ball Permanence

**Apricorn Ball data is permanent and irreversible.** A Pokemon caught in a Moon Ball in HGSS will display as a Moon Ball in every game it is transferred to, forever. This makes the catching decision permanent and collector-significant.

When the ball type was displayed as a regular Poke Ball in DPPt (due to DPPt not supporting Apricorn Ball graphics), the underlying data was still preserved. Once transferred to Gen 5 and beyond, the correct Apricorn Ball displays again.

### H.4 Transfer Chain Summary

```
HGSS Apricorn Ball catch
  ↓ (trade to DPPt for contests if needed)
  ↓ (trade back to HGSS for HGSS tutors)
  ↓
Gen 4 → Gen 5 (Poke Transfer, 2x DS systems, 6 at a time)
  ↓
Gen 5 → Pokemon Bank (Pokemon Transporter)
  ↓
Pokemon Bank → Pokemon HOME
  ↓
Pokemon HOME → Gen 8/9 (SwSh, BDSP, PLA, SV)
```

**Ball type is preserved at every step.** The Apricorn Ball is permanent.

### H.5 Hardware Requirements Summary

| Transfer Step | Hardware Needed |
|--------------|-----------------|
| Gen 3 → Gen 4 (Pal Park) | DS or DS Lite (has GBA slot) |
| Gen 4 → Gen 5 (Poke Transfer) | Two DS-family systems |
| Gen 5 → Bank (Poke Transporter) | 3DS with Bank subscription |
| Bank → HOME | 3DS + Switch (or mobile) |
| HOME → current games | Switch |

**Warning:** The 3DS eShop closed in March 2023. Pokemon Bank required a one-time download. If you did not download Bank before closure, you cannot transfer from Gen 5. Plan accordingly.

---

## Appendix: Quick Reference Tables

### Gen 1 Pokemon NOT Obtainable in HGSS at All

| # | Species | Status |
|---|---------|--------|
| 151 | Mew | Event only (Wi-Fi defunct) |

Every other Gen 1 species (#001-#150) is obtainable in HGSS through wild encounters, gifts, breeding, fossil revival, purchase, or static encounters.

### Best Apricorn Ball Matches (Thematic)

| Pokemon | Ball | Reasoning |
|---------|------|-----------|
| Mewtwo | Moon Ball | Purple/blue aesthetic match; iconic |
| Articuno | Lure Ball | Blue aesthetic match |
| Zapdos | Fast Ball | Speed theme; electric yellow |
| Moltres | Level Ball | Red/gold aesthetic |
| Snorlax | Heavy Ball | Maximum weight bonus (1014.1 lbs) |
| Lapras | Lure Ball | Water encounter; blue aesthetic |
| Dragonite line | Lure Ball | Fishing encounter in Dragon's Den |
| Clefairy | Moon Ball | 4x catch rate (Moon Stone evolution) |
| Jigglypuff | Moon Ball | 4x catch rate (Moon Stone evolution) |
| Nidoran (both) | Moon Ball | 4x catch rate (Moon Stone evolution) |
| Pikachu | Fast Ball | Speed theme; yellow aesthetic |
| Onix | Heavy Ball | Weight bonus |
| Tauros | Heavy Ball | Weight bonus |
| Growlithe | Fast Ball | Speed theme (HG only) |
| Vulpix | Love Ball | Aesthetic (SS only) |
| Abra | Fast Ball | Prevents fleeing thematically |

### Gen 4 Move Tutor Moves Critical for Gen 1 Species

| Move | Best Gen 1 Learner | Game | Why It Matters |
|------|-------------------|------|---------------|
| Outrage | Dragonite | Platinum/HGSS | Top Dragon STAB |
| Superpower | Dragonite, Snorlax | Platinum/HGSS | Coverage |
| Heat Wave | Charizard, Arcanine, Ninetales | Platinum/HGSS | Special Fire spread |
| Earth Power | Nidoking, Nidoqueen | Platinum/HGSS | Special Ground STAB |
| Gunk Shot | Muk | Platinum/HGSS | Physical Poison STAB |
| Seed Bomb | Venusaur, Exeggutor | Platinum/HGSS | Physical Grass STAB |
| Ice Punch | Alakazam, Machamp | Platinum/HGSS | Coverage |
| ThunderPunch | Alakazam, Machamp | Platinum/HGSS | Coverage |
| Fire Punch | Alakazam, Machamp | Platinum/HGSS | Coverage |
| Heal Bell | Chansey/Blissey | HGSS only | Cleric move |
| Pain Split | Gengar | HGSS only | Recovery option |
| Sky Attack | Articuno | HGSS only | 2-turn Flying STAB |
| Knock Off | Many Pokemon | Platinum/HGSS | Item removal utility |
