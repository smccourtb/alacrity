# Cross-Generation Breeding Guide (Gen 1 Species)

This document consolidates breeding mechanics, egg group data, legacy egg moves, shiny breeding strategies, ball inheritance rules, and generation-specific breeding priorities for all 151 Gen 1 species. It synthesizes breeding content from the individual game research documents ([03-vc-gold-silver.md](03-vc-gold-silver.md) through [14-gen9-sv.md](14-gen9-sv.md)) into a single reference.

**Purpose:** Guide collectors through the optimal breeding plan for Gen 1 species across every generation -- what to breed where, what is exclusive to each gen, and what can wait.

---

## Section 1: Breeding Mechanics by Generation

### 1.1 Gen 2 -- VC Gold/Silver/Crystal

The first generation with breeding. Fundamentally different from all subsequent systems.

| Mechanic | Detail |
|----------|--------|
| **Location** | Route 34 Day Care (south of Goldenrod City) |
| **DV inheritance** | Defense inherited from opposite-gender parent; Special 50% match / 50% +/-8; Attack and Speed random |
| **Nature** | Does not exist in Gen 2 |
| **Ability** | Does not exist in Gen 2 |
| **Ball** | All offspring hatch in standard Poke Ball |
| **Egg moves** | Father only |
| **Shiny breeding** | ~1/64 with shiny parent (see Section 4.1) |
| **Compatibility check** | Sibling check: identical Defense DVs AND matching/+8 Special DVs block breeding. Two shinies can NEVER breed. |
| **Ditto** | Routes 34/35 (4% encounter rate) |

**Odd Egg (Crystal only):** Gift from Day-Care Man on Route 34. ~14% shiny rate. Hatches into one of seven baby Pokemon. Shiny DVs: 2/10/10/10. See [04-vc-crystal.md](04-vc-crystal.md) Section C for breeding strategy.

**Key transfer note:** Moves are preserved through Poke Transporter transfer. Gen 2 egg moves that pass Transporter's legality check will arrive intact in Gen 7+, potentially creating legal transfer-only specimens. This gives Gen 2 breeding additional collector value beyond the VC save file.

### 1.2 Gen 3 -- RSE / FRLG

Complete overhaul to the modern IV system. Breeding becomes recognizably modern but still primitive.

| Mechanic | Detail |
|----------|--------|
| **Location** | Route 117 (RS/Emerald), Four Island (FRLG) |
| **IV inheritance** | 3 random IVs from parents (RS/FRLG); 1-3 IVs (Emerald, bugged algorithm) |
| **Nature (Everstone)** | **Emerald only:** mother/Ditto holding Everstone = 50% nature inheritance. RS/FRLG: no nature passing. |
| **Ability** | NOT inherited. Random from species' available slots. |
| **Ball** | All offspring hatch in standard Poke Ball |
| **Egg moves** | Father only. Father can also pass TM/HM moves if in offspring's TM learnset. |
| **Shiny odds** | 1/8192 (no boosted methods exist) |
| **Masuda Method** | Does not exist |
| **Shiny Charm** | Does not exist |
| **Ditto** | FRLG: Routes 13-15, Pokemon Mansion, Cerulean Cave. Emerald: Desert Underpass (post-E4). RS: must trade. |

**Emerald is strongly preferred** over RS/FRLG for serious breeding due to Everstone nature passing.

### 1.3 Gen 4 -- DPPt / HGSS

Introduces Power Items and the Masuda Method. Nature control improves but has a critical conflict.

| Mechanic | Detail |
|----------|--------|
| **Location** | Solaceon Town (DPPt), Route 34 (HGSS) |
| **IV inheritance** | 3 random IVs + Power Items guarantee one specific stat |
| **Nature (Everstone)** | Either parent: 50% chance. **Conflicts with Masuda Method in Gen 4** (both tied to personality value). |
| **Ability** | NOT inherited. Random from species' available slots. |
| **Ball** | All offspring hatch in standard Poke Ball |
| **Egg moves** | Father only |
| **Masuda Method** | 5/8192 (~1/1638). Foreign-language parent required. |
| **Shiny Charm** | Does not exist |
| **Ditto** | DPPt: Route 218, Trophy Garden. HGSS: Routes 34/35, Cerulean Cave (best source). |

**Power Items:**

| Item | Stat Guaranteed | Cost |
|------|----------------|------|
| Power Weight | HP | 16 BP |
| Power Bracer | Attack | 16 BP |
| Power Belt | Defense | 16 BP |
| Power Lens | Sp. Attack | 16 BP |
| Power Band | Sp. Defense | 16 BP |
| Power Anklet | Speed | 16 BP |

**Critical Gen 4 conflict:** Masuda Method and Everstone nature passing are mutually exclusive. Choose controlled nature OR boosted shiny odds, not both. This is fixed in Gen 5.

### 1.4 Gen 5 -- BW / B2W2

Landmark generation: Hidden Ability inheritance, Shiny Charm, deterministic nature control, and Masuda/Everstone working simultaneously.

| Mechanic | Detail |
|----------|--------|
| **Location** | Route 3 (BW: early; B2W2: post-E4) |
| **IV inheritance** | 3 random IVs + Power Items (same as Gen 4) |
| **Nature (Everstone)** | BW: 50% chance, works with Masuda. **B2W2: 100% guarantee.** |
| **Ability inheritance** | NEW. Female's ability slot: 80% inheritance (B2W2). HA: female only, 60% (BW) / 80% (B2W2). **Males and Ditto CANNOT pass HA.** |
| **Ball** | All offspring hatch in standard Poke Ball |
| **Egg moves** | Father only |
| **Masuda Method** | ~1/1366 (6/8192). Works with Everstone (Gen 4 conflict resolved). |
| **Shiny Charm** | B2W2 only. Requires complete National Dex (649 Pokemon). Masuda + Charm: **~1/1024 (8/8192)**. |
| **Ditto** | BW: Giant Chasm. B2W2: Giant Chasm + Hidden Grotto (HA Imposter Ditto). |

**HA breeding limitation:** Only female HA parents pass HA in Gen 5. Genderless species and male-only species (Tauros, Hitmonlee, Hitmonchan) CANNOT breed HA offspring. Fixed in Gen 6.

**Egg-of-origin change:** Starting in Gen 5, origin is determined by hatch game, not the game where the egg was produced.

### 1.5 Gen 6 -- XY / ORAS

The modern breeding standard. Destiny Knot 5-IV inheritance, ball inheritance, both parents pass egg moves, HA from either gender.

| Mechanic | Detail |
|----------|--------|
| **Location** | Route 7 (XY), Battle Resort (ORAS) |
| **IV inheritance** | **Destiny Knot: 5 IVs from parents** (game-changer). Without: 3 random IVs. |
| **Nature (Everstone)** | 100% guarantee (either parent) |
| **Ability inheritance** | HA: 60% from either gender when breeding with Ditto. Males and genderless can now pass HA. |
| **Ball inheritance** | NEW. Female's ball passes to offspring. Non-Ditto parent's ball when breeding with Ditto. Master/Cherish Ball cannot pass. |
| **Egg moves** | **Both parents can pass egg moves** (previously father-only). |
| **Masuda Method** | 1/683 (no Charm); **1/512 (with Charm)** |
| **Shiny Charm** | Complete National Dex (718 species). |
| **Base shiny rate** | **1/4096** (halved from 1/8192 -- permanent improvement). |
| **Ditto** | Friend Safari (XY) -- 2+ guaranteed IVs, potential HA Imposter. |

**Optimal Gen 6 breeding pair:**
1. Parent A: Target species, female, desired ball, HA (if wanted), holding **Everstone**
2. Parent B: 6-IV Ditto (or compatible species), holding **Destiny Knot**

**Ball inheritance limitation:** In Gen 6, only the mother's ball passes in male + female breeding. Males cannot pass their ball to offspring (changed in Gen 7).

### 1.6 Gen 7 -- SM / USUM

Ball inheritance expanded. Alolan form breeding with Everstone form control.

| Mechanic | Detail |
|----------|--------|
| **Location** | Paniola Ranch Nursery (Akala Island) |
| **IV inheritance** | Same as Gen 6 (Destiny Knot = 5 IVs) |
| **Nature (Everstone)** | 100% guarantee. Also controls regional form: Kanto-form parent + Everstone = Kanto-form offspring in Alola. |
| **Ability inheritance** | Same as Gen 6 (60% HA from either gender with Ditto) |
| **Ball inheritance** | **UPDATED:** Same-species breeding = 50/50 either parent's ball. Males pass ball via Ditto. Genderless pass ball via Ditto. |
| **Egg moves** | Both parents (same as Gen 6) |
| **Masuda Method** | 1/683 (no Charm); **1/512 (with Charm)** |
| **Shiny Charm** | Complete Alola Dex (SM: ~302; USUM: ~403). |
| **Hyper Training** | NEW: fixes IVs cosmetically at Lv. 100. Does NOT change actual IV for breeding. |

**Regional form breeding:** Breeding in Alola defaults to Alolan offspring. Use Everstone on a Kanto-form parent to produce Kanto-form offspring in Alola. Evolving Kanto Pikachu/Exeggcute/Cubone in Alola always produces the Alolan form regardless.

### 1.7 Gen 8 -- Sword/Shield

Egg move transfer without breeding, Nature Mints, Ability Patch. Breeding constraints largely eliminated.

| Mechanic | Detail |
|----------|--------|
| **Location** | Route 5 Nursery, Bridge Field Nursery (Wild Area) |
| **IV inheritance** | Same as Gen 6 (Destiny Knot = 5 IVs) |
| **Nature (Everstone)** | 100% guarantee |
| **Ability inheritance** | Same as Gen 6 |
| **Ball inheritance** | Same as Gen 7 (50/50 same-species, male via Ditto) |
| **Egg move transfer** | NEW: Place two same-species Pokemon in Nursery. If one knows an egg move and the other has an empty slot, the move transfers directly. No egg required. |
| **Nature Mints** | NEW: Change stat effects of nature (50 BP). Does not change actual nature for breeding/Synchronize. |
| **Ability Capsule** | Switches between standard ability slots 1 and 2 (50 BP). |
| **Ability Patch** | NEW (Crown Tundra): Switches to/from Hidden Ability (200 Dynite Ore). |
| **Masuda Method** | 1/683 (no Charm); **1/512 (with Charm)** |
| **Shiny Charm** | Complete Galar Dex (~400 species). Does NOT affect Max Raid odds. |

**Egg move transfer** means any specimen can receive egg moves after hatching -- a shiny hatched without egg moves can get them from a breedject at the Nursery. Combined with Nature Mints and Ability Patch, SwSh is the first game where a specimen can be fully "corrected" after hatch/catch.

**Note:** ~36 Gen 1 species are excluded from SwSh due to the National Dex cut. Breeding is only possible for species present in the game.

### 1.8 Gen 9 -- Scarlet/Violet

Mirror Herb egg move transfer, Picnic breeding, Tera Type mechanics.

| Mechanic | Detail |
|----------|--------|
| **Location** | Picnic (anywhere in the overworld) |
| **IV inheritance** | Same as Gen 6 (Destiny Knot = 5 IVs) |
| **Nature (Everstone)** | 100% guarantee |
| **Ability inheritance** | Same as Gen 6 |
| **Ball inheritance** | Same as Gen 7 |
| **Egg moves** | Both parents (standard). Plus **Mirror Herb** transfer. |
| **Mirror Herb** | NEW: Same-species Pokemon in Picnic. Recipient holds Mirror Herb + has empty move slot. Egg move transfers automatically. Not consumed. No egg group/gender restriction. |
| **Tera Type** | NOT inherited from parents. Randomly assigned from species' base types. |
| **Masuda Method** | 1/683 (no Charm); **1/512 (with Charm)** |
| **Shiny Charm** | Complete Paldea Dex (400 species). |
| **Egg Power** | Sandwiches increase egg generation rate at Picnic. |

**Mirror Herb** dramatically simplifies egg move distribution. Previously required careful breeding chain planning across egg groups. Now any same-species specimen with the move can transfer it directly. Scarcity value of egg move specimens from earlier gens remains intact.

**~55 Gen 1 species absent from SV** (see [14-gen9-sv.md](14-gen9-sv.md) Section B.1.2). Breeding only possible for species present in the game + DLC.

---

## Section 2: Gen 1 Egg Group Reference

All 151 species with their egg groups. This table is constant across all generations (egg group assignments have not changed since Gen 2).

### Monster Group

| # | Species | Second Group |
|---|---------|-------------|
| 001-003 | Bulbasaur / Ivysaur / Venusaur | Grass |
| 004-006 | Charmander / Charmeleon / Charizard | Dragon |
| 007-009 | Squirtle / Wartortle / Blastoise | Water 1 |
| 029 | Nidoran-F | Field |
| 032-034 | Nidoran-M / Nidorino / Nidoking | Field |
| 079-080 | Slowpoke / Slowbro | Water 1 |
| 104-105 | Cubone / Marowak | -- |
| 108 | Lickitung | -- |
| 111-112 | Rhyhorn / Rhydon | Field |
| 115 | Kangaskhan | -- |
| 131 | Lapras | Water 1 |
| 143 | Snorlax | -- |

### Water 1 Group

| # | Species | Second Group |
|---|---------|-------------|
| 007-009 | Squirtle / Wartortle / Blastoise | Monster |
| 054-055 | Psyduck / Golduck | Field |
| 060-062 | Poliwag / Poliwhirl / Poliwrath | -- |
| 079-080 | Slowpoke / Slowbro | Monster |
| 086-087 | Seel / Dewgong | Field |
| 116-117 | Horsea / Seadra | Dragon |
| 131 | Lapras | Monster |
| 138-139 | Omanyte / Omastar | Water 3 |
| 140-141 | Kabuto / Kabutops | Water 3 |
| 147-149 | Dratini / Dragonair / Dragonite | Dragon |

### Water 2 Group

| # | Species | Second Group |
|---|---------|-------------|
| 118-119 | Goldeen / Seaking | -- |
| 129-130 | Magikarp / Gyarados | Dragon |

### Water 3 Group

| # | Species | Second Group |
|---|---------|-------------|
| 072-073 | Tentacool / Tentacruel | -- |
| 090-091 | Shellder / Cloyster | -- |
| 098-099 | Krabby / Kingler | -- |
| 120-121 | Staryu / Starmie | -- (genderless, Ditto only) |
| 138-139 | Omanyte / Omastar | Water 1 |
| 140-141 | Kabuto / Kabutops | Water 1 |

### Field Group

| # | Species | Second Group |
|---|---------|-------------|
| 019-020 | Rattata / Raticate | -- |
| 023-024 | Ekans / Arbok | -- |
| 025-026 | Pikachu / Raichu | Fairy |
| 027-028 | Sandshrew / Sandslash | -- |
| 029 | Nidoran-F | Monster |
| 032-034 | Nidoran-M / Nidorino / Nidoking | Monster |
| 037-038 | Vulpix / Ninetales | -- |
| 050-051 | Diglett / Dugtrio | -- |
| 052-053 | Meowth / Persian | -- |
| 054-055 | Psyduck / Golduck | Water 1 |
| 056-057 | Mankey / Primeape | -- |
| 058-059 | Growlithe / Arcanine | -- |
| 077-078 | Ponyta / Rapidash | -- |
| 083 | Farfetch'd | Flying |
| 086-087 | Seel / Dewgong | Water 1 |
| 111-112 | Rhyhorn / Rhydon | Monster |
| 128 | Tauros | -- (male-only, Ditto required) |
| 133-136 | Eevee / Vaporeon / Jolteon / Flareon | -- |

### Flying Group

| # | Species | Second Group |
|---|---------|-------------|
| 016-018 | Pidgey / Pidgeotto / Pidgeot | -- |
| 021-022 | Spearow / Fearow | -- |
| 041-042 | Zubat / Golbat | -- |
| 083 | Farfetch'd | Field |
| 084-085 | Doduo / Dodrio | -- |
| 142 | Aerodactyl | -- |

### Bug Group

| # | Species | Second Group |
|---|---------|-------------|
| 010-012 | Caterpie / Metapod / Butterfree | -- |
| 013-015 | Weedle / Kakuna / Beedrill | -- |
| 046-047 | Paras / Parasect | Grass |
| 048-049 | Venonat / Venomoth | -- |
| 123 | Scyther | -- |
| 127 | Pinsir | -- |

### Grass Group

| # | Species | Second Group |
|---|---------|-------------|
| 001-003 | Bulbasaur / Ivysaur / Venusaur | Monster |
| 043-045 | Oddish / Gloom / Vileplume | -- |
| 046-047 | Paras / Parasect | Bug |
| 069-071 | Bellsprout / Weepinbell / Victreebel | -- |
| 102-103 | Exeggcute / Exeggutor | -- |
| 114 | Tangela | -- |

### Fairy Group

| # | Species | Second Group |
|---|---------|-------------|
| 025-026 | Pikachu / Raichu | Field |
| 035-036 | Clefairy / Clefable | -- |
| 039-040 | Jigglypuff / Wigglytuff | -- |
| 113 | Chansey | -- |

### Human-Like Group

| # | Species | Second Group |
|---|---------|-------------|
| 063-065 | Abra / Kadabra / Alakazam | -- |
| 066-068 | Machop / Machoke / Machamp | -- |
| 096-097 | Drowzee / Hypno | -- |
| 106 | Hitmonlee | -- (male-only) |
| 107 | Hitmonchan | -- (male-only) |
| 122 | Mr. Mime | -- |
| 124 | Jynx | -- (female-only) |
| 125 | Electabuzz | -- |
| 126 | Magmar | -- |

### Mineral Group

| # | Species | Second Group |
|---|---------|-------------|
| 074-076 | Geodude / Graveler / Golem | -- |
| 081-082 | Magnemite / Magneton | -- (genderless, Ditto only) |
| 095 | Onix | -- |
| 100-101 | Voltorb / Electrode | -- (genderless, Ditto only) |
| 137 | Porygon | -- (genderless, Ditto only) |

### Amorphous Group

| # | Species | Second Group |
|---|---------|-------------|
| 088-089 | Grimer / Muk | -- |
| 092-094 | Gastly / Haunter / Gengar | -- |
| 109-110 | Koffing / Weezing | -- |

### Dragon Group

| # | Species | Second Group |
|---|---------|-------------|
| 004-006 | Charmander / Charmeleon / Charizard | Monster |
| 116-117 | Horsea / Seadra | Water 1 |
| 129-130 | Magikarp / Gyarados | Water 2 |
| 147-149 | Dratini / Dragonair / Dragonite | Water 1 |

### No Eggs Discovered (Cannot Breed)

| # | Species | Reason |
|---|---------|--------|
| 030 | Nidorina | Game design quirk -- unbreedable despite being female |
| 031 | Nidoqueen | Same as Nidorina |
| 132 | Ditto | Cannot breed with another Ditto |
| 144 | Articuno | Legendary |
| 145 | Zapdos | Legendary |
| 146 | Moltres | Legendary |
| 150 | Mewtwo | Legendary |
| 151 | Mew | Mythical |

**Nidoran note:** Nidoran-F (#029) CAN breed and produces either Nidoran-F or Nidoran-M eggs. The Nidorina/Nidoqueen restriction is one of Pokemon's most notorious design decisions. Always breed from the base form.

### Ditto-Only Breeders

| Species | Reason |
|---------|--------|
| Magnemite / Magneton | Genderless |
| Voltorb / Electrode | Genderless |
| Staryu / Starmie | Genderless |
| Porygon | Genderless |
| Tauros | Male-only (breeding with female Field members produces the female's species, not Tauros) |
| Hitmonlee | Male-only (produces Tyrogue egg with Ditto) |
| Hitmonchan | Male-only (produces Tyrogue egg with Ditto) |

---

## Section 3: Legacy Egg Moves by Generation

Egg moves that are exclusive to specific generations or have limited availability windows. These represent "breed this before moving on" signals.

### 3.1 Gen 3 Egg Moves

Gen 3 egg moves come exclusively from the father. Most have remained available in later gens, but some parent chains became unavailable.

| Species | Egg Move | Parent Chain | Notes |
|---------|----------|-------------|-------|
| Charmander | Dragon Dance | Dragonite (Lv. 55) | Defining Charizard X set in Gen 6. Still available in later gens. |
| Squirtle | Mirror Coat | Corsola (level-up) | Surprise coverage option |
| Pichu | Volt Tackle | Pikachu holding Light Ball (Emerald only) | Exclusive Pichu egg move; Light Ball method introduced here |
| Gastly | Perish Song | Misdreavus, Koffing chain | Trapping combo |
| Chansey | Seismic Toss | Machop line (tutor/TM) | Competitive staple. Later available as Gen 6 egg move. |
| Larvitar -> Tyranitar | Dragon Dance | Dragonite, Gyarados | Defining competitive set |

**Gen 3-specific note:** Most Gen 3 egg moves persisted into later gens. Specific removals are rare. Check Bulbapedia's species learnset pages for the "Generation III" column if verifying a particular move.

### 3.2 Gen 4 Egg Moves

Gen 4 added several notable egg moves to Gen 1 species.

| Species | Egg Move | Notes |
|---------|----------|-------|
| Charmander | Dragon Dance | Already available in Gen 3; continued |
| Squirtle | Aqua Jet | Priority Water STAB -- new in Gen 4 |
| Bulbasaur | Leaf Storm | Powerful special STAB -- new in Gen 4 |
| Gastly | Disable | Utility via breeding |
| Machop | Ice Punch, ThunderPunch | Coverage moves as egg moves -- new in Gen 4 |
| Dratini | ExtremeSpeed | Also available via Dragon's Den gift in HGSS |

### 3.3 Gen 5 Egg Moves

Gen 5 egg availability is generally a superset of Gen 4 with additions through new Gen 5 breeding partners. Egg moves still father-only. Notable additions include coverage moves accessible through new Gen 5 Pokemon as fathers.

### 3.4 Gen 6 Egg Moves (Mothers Can Now Pass)

Gen 6 changed the rules: **both parents can pass egg moves**. Several Gen 1 species received new egg moves.

| Species | New Egg Move(s) | Notes |
|---------|-----------------|-------|
| Bulbasaur | Grassy Terrain | New terrain move |
| Charmander | Air Cutter | Flying coverage |
| Squirtle | Aura Sphere | Special Fighting; previously event-only |
| Pidgey | Defog | Hazard removal |
| Pichu | Fake Out | Priority utility |
| Machop | Heavy Slam, Power Trick | New utility options |
| Gastly | Perish Song, Disable, Reflect Type | Expanded breeding options |
| Chansey | Seismic Toss | **Now an egg move** -- previously tutor-only (Gen 3) |
| Lapras | **Freeze-Dry** | Super-effective vs Water; signature niche move. Standout addition. |
| Aerodactyl | Wide Guard | Doubles support |

**Lapras + Freeze-Dry** is the headline: an Ice move that hits Water-types super-effectively. Defining for Lapras in competitive play.

### 3.5 Legacy Move Summary

Moves that were historically available only through breeding in specific generations and cannot be obtained the same way later. These are rare because most egg moves persist, but parent chain availability can change when species are removed from regional dexes.

**Practical note for modern collectors:** Gen 8 Nursery egg move transfer and Gen 9 Mirror Herb largely eliminate the need to plan breeding chains. Any same-species specimen with the move can transfer it. The scarcity value of egg move specimens from earlier gens remains as proof of breeding effort in that era.

---

## Section 4: Shiny Breeding Strategies

### 4.1 Gen 2 -- DV Method (~1/64)

The highest shiny breeding rate in any generation. Uses Gen 2's DV inheritance mechanics.

**How it works:** A shiny parent (Defense DV = 10, Special DV = 10) breeds with a non-shiny partner. Offspring inherits Defense DV from the opposite-gender parent (locked to 10). Special DV has 50% chance of matching (10) or differing by 8 (2, not shiny-eligible). Attack is random (50% shiny-eligible). Speed is random (1/16 for exactly 10).

**Combined odds:** 1/2 (Special) x 1/2 (Attack) x 1/16 (Speed) = **1/64**

**Starting point:** The Lake of Rage Gyarados (guaranteed shiny, DVs 14/10/10/10) is the premier breeding parent. Available in Gold, Silver, and Crystal after the 7th badge.

**Breeding chain from Gyarados:**
1. Gyarados (shiny, Water 2/Dragon) + female Dratini = shiny Dratini
2. Shiny Dratini (Water 1/Dragon) + female Water 1 species = spreads to Water 1 group
3. Shiny Psyduck (Water 1/Field) = entry to the massive Field group
4. Shiny Slowpoke (Water 1/Monster) = entry to Monster group
5. From Field: covers Rattata, Ekans, Sandshrew, Vulpix, Diglett, Meowth, Mankey, Growlithe, Ponyta, Eevee, Pikachu, Nidoran, Rhyhorn, etc.
6. From Monster: covers Cubone, Lickitung, Kangaskhan, Snorlax, Bulbasaur/Charmander/Squirtle (if traded in)

**Groups NOT reachable from Gyarados without Ditto:**
- Bug (no overlap)
- Human-Like (no overlap)
- Mineral (no overlap, mostly genderless)
- Amorphous (no overlap)
- Fairy (reachable from Field via Pikachu)
- Grass (reachable from Monster via Bulbasaur if traded in; from Bug via Paras, but Bug is unreachable)

**Crystal Odd Egg:** ~14% shiny rate baby Pokemon. Shiny Tyrogue (male, DVs 2/10/10/10) can serve as direct breeding father in the Human-Like egg group (Machop, Abra, Drowzee, Mr. Mime, Jynx, Electabuzz, Magmar lines).

**Limitation:** Gen 2 shininess does NOT transfer. Poke Transporter recalculates shininess using the modern PID/TID/SID formula, and Gen 2 DVs map to random Gen 7 IVs. Shiny breeding in Gen 2 is only valuable within the Gen 2 save files.

### 4.2 Gen 3 -- No Boosted Methods (1/8192)

No Masuda Method, no Shiny Charm. Breeding is standard 1/8192 per egg. The only shiny breeding approach is volume (hatch thousands of eggs).

Not recommended for targeted shiny breeding. Catch shinies via soft-resetting or random encounters instead.

### 4.3 Gen 4 -- Masuda Method Introduction (~1/1638)

| Setup | Shiny Rate | Nature Control |
|-------|-----------|----------------|
| Same-language parents | 1/8192 | Everstone (50%) |
| Foreign-language parents (Masuda) | 5/8192 (~1/1638) | **Cannot use Everstone** (Gen 4 conflict) |

**Strategy choice:** For competitive specimens wanting correct nature, use Everstone and accept 1/8192. For shiny hunting, use Masuda and accept random nature. For both, wait for Gen 5.

### 4.4 Gen 5 -- Masuda + Shiny Charm (~1/1024)

| Setup | BW | B2W2 |
|-------|-----|------|
| Standard breeding | 1/8192 | 1/8192 |
| Masuda Method | ~1/1366 | ~1/1366 |
| Shiny Charm only | N/A | ~1/2731 |
| **Masuda + Shiny Charm** | N/A | **~1/1024** |

**B2W2 advantage:** 100% Everstone nature guarantee + Masuda Method + Shiny Charm all work simultaneously. First generation where you can breed for shiny + correct nature at boosted odds.

**Shiny Charm requirement:** Complete National Dex (649 Pokemon). Requires extensive trading and transferring.

### 4.5 Gen 6+ -- Modern Standard (~1/512)

| Setup | Shiny Rate | Available In |
|-------|-----------|-------------|
| Standard breeding | 1/4096 | Gen 6+ (base rate halved) |
| Masuda Method | ~1/683 | Gen 6+ |
| **Masuda + Shiny Charm** | **~1/512** | Gen 6+ |

The modern shiny breeding setup (unchanged from Gen 6 through Gen 9):
1. Foreign-language 6-IV Ditto holding **Destiny Knot**
2. Target species parent with HA, egg moves, correct ball, holding **Everstone**
3. Shiny Charm active

This produces shinies with good IVs, correct nature, HA, and desired ball. The gold standard for competitive shiny specimens.

### 4.6 Shiny Charm Availability by Generation

| Generation | Charm Available? | Requirement |
|-----------|-----------------|-------------|
| Gen 2 | No | -- |
| Gen 3 | No | -- |
| Gen 4 | No | -- |
| Gen 5 (BW) | No | -- |
| Gen 5 (B2W2) | **Yes** | National Dex (649) |
| Gen 6 | **Yes** | National Dex (718/719) |
| Gen 7 | **Yes** | Alola Dex (302/403) |
| Gen 8 | **Yes** | Galar Dex (~400) |
| Gen 9 | **Yes** | Paldea Dex (400) |

---

## Section 5: Ball Inheritance

### 5.1 Timeline

| Generation | Ball Inheritance Rules |
|-----------|----------------------|
| Gen 2-5 | **No ball inheritance.** All offspring hatch in standard Poke Ball. |
| Gen 6 | Mother's ball passes. Non-Ditto parent's ball when breeding with Ditto. Master/Cherish Ball cannot pass. Same-species male cannot pass ball. |
| Gen 7+ | Same as Gen 6, PLUS: same-species breeding = **50/50 either parent's ball**. Males pass ball via Ditto. Genderless pass ball via Ditto. |

### 5.2 Detailed Rules (Gen 7+ -- Current Standard)

| Breeding Scenario | Ball Result |
|-------------------|-------------|
| Male + Female (different species) | Female's ball |
| Male + Female (same species) | **50/50 either parent's ball** |
| Any gender + Ditto | Non-Ditto parent's ball |
| Genderless + Ditto | Non-Ditto parent's ball |

**Non-inheritable balls:** Master Ball, Cherish Ball, and Strange Ball always default to standard Poke Ball.

### 5.3 Which Balls Are Worth Breeding For

**Apricorn Balls (HGSS origin, also available in Gen 7 gift set, Gen 8 Cram-o-matic, Gen 9 Item Printer):**
- Moon Ball, Love Ball, Heavy Ball, Fast Ball, Level Ball, Lure Ball, Friend Ball
- Highest collector prestige for most species due to rarity and aesthetic matching

**Beast Ball (Gen 7):**
- 0.1x catch rate makes each catch significant
- Distinctive blue/yellow design
- Propagates through breeding after initial catch

**Dream Ball (Gen 5):**
- Available from Dream World/Dream Radar (Gen 5), now reproducible via breeding
- Historical significance for HA specimens

**Sport Ball and Safari Ball:**
- Sport Ball: Bug-Catching Contest (Gen 2/4), Cram-o-matic (Gen 8), Item Printer (Gen 9)
- Safari Ball: Safari Zone catches, Cram-o-matic, Item Printer
- Both gained breeding propagation in Gen 7+

**Standard specialty balls worth considering:**
- Luxury Ball (bonus friendship gain)
- Dive Ball, Net Ball, Timer Ball (for thematic matching)
- Premier Ball (clean aesthetic, free with bulk purchases)

### 5.4 Retroactive Value of Pre-Gen-6 Ball Catches

Ball catches from Gen 4 (HGSS Apricorn Balls) gained enormous value when Gen 6 introduced ball inheritance. A female Pikachu in a Moon Ball from HGSS can produce Moon Ball Pichu eggs starting in Gen 6. This makes HGSS Apricorn Ball catches the most collector-valuable specimens in the series -- they are the **earliest source of legal Apricorn Ball Pokemon that can reach modern games**.

**HGSS is the priority game for ball collecting.** Every wild-catchable Gen 1 Pokemon in HGSS can be put in an Apricorn Ball. See [06-gen4-dppt-hgss.md](06-gen4-dppt-hgss.md) Section B for the complete Apricorn Ball recommendation table.

---

## Section 6: Optimal Breeding Pairs and Chains

### 6.1 Key Cross-Egg-Group Bridging Species

These Gen 1 species belong to two egg groups, making them valuable for transferring egg moves or shiny DVs across groups.

| Species | Egg Groups | Bridge Value |
|---------|-----------|-------------|
| Bulbasaur line | Monster + Grass | Connects Grass species to Monster group (starters, Rhyhorn, etc.) |
| Charmander line | Monster + Dragon | Connects Dragon species to Monster group |
| Squirtle line | Monster + Water 1 | Connects Water 1 species to Monster group |
| Nidoran-F / Nidoran-M | Monster + Field | Connects the two largest egg groups |
| Psyduck / Golduck | Water 1 + Field | Key Water/Field bridge |
| Seel / Dewgong | Water 1 + Field | Alternative Water 1/Field bridge |
| Slowpoke / Slowbro | Monster + Water 1 | Connects Monster to aquatic species |
| Rhyhorn / Rhydon | Monster + Field | Another Monster/Field bridge |
| Horsea / Seadra | Water 1 + Dragon | Dragon/Water bridge |
| Magikarp / Gyarados | Water 2 + Dragon | Dragon/Water 2 bridge (shiny Gyarados is the Gen 2 starting point) |
| Dratini / Dragonair / Dragonite | Water 1 + Dragon | The critical Dragon/Water 1 bridge |
| Pikachu / Raichu | Field + Fairy | Field/Fairy bridge |
| Farfetch'd | Field + Flying | Field/Flying bridge |
| Paras / Parasect | Bug + Grass | Bug/Grass bridge |
| Omanyte / Kabuto lines | Water 1 + Water 3 | Water 1/Water 3 bridge |

### 6.2 Gen 2 Shiny Chain (Lake of Rage Gyarados)

The most efficient Gen 2 shiny propagation chain:

```
Gyarados (shiny, W2/Dragon)
  |
  +-> Dratini (W1/Dragon) -- entry to Water 1
  |     +-> Psyduck (W1/Field) -- entry to the massive Field group
  |     +-> Slowpoke (W1/Monster) -- entry to Monster group
  |     +-> Seel (W1/Field) -- alternative Field entry
  |     +-> Poliwag (W1 only) -- stays in Water 1
  |     +-> Horsea (W1/Dragon) -- stays in Water 1/Dragon
  |     +-> Lapras (W1/Monster) -- alternative Monster entry
  |     +-> Squirtle (W1/Monster) -- if traded in from Gen 1
  |
  +-> Goldeen (W2 only) -- stays in Water 2
```

From **Field** (via Psyduck): Rattata, Ekans, Sandshrew, Vulpix, Diglett, Meowth, Mankey, Growlithe, Ponyta, Farfetch'd, Eevee, Pikachu -> **Fairy** bridge, Nidoran -> **Monster** bridge, Rhyhorn -> **Monster** bridge, Seel -> back to Water 1

From **Monster** (via Slowpoke): Cubone, Lickitung, Kangaskhan, Snorlax, Bulbasaur -> **Grass** bridge, Charmander -> **Dragon** bridge

**Unreachable from this chain:** Bug, Human-Like, Mineral, Amorphous (require Ditto or independent shiny sources)

### 6.3 Multi-Step Breeding Chains for Valuable Egg Moves

**Charmander with Dragon Dance (Gen 3+):**
1. Level Dragonite to 55 (learns Dragon Dance)
2. Breed male Dragonite + female Charizard/Charmeleon/Charmander
3. Offspring: Charmander with Dragon Dance

**Lapras with Freeze-Dry (Gen 6+):**
1. Obtain any Pokemon with Freeze-Dry (Snom/Frosmoth learn by level, or breed from Lapras egg move chain)
2. Breed male Freeze-Dry parent (Water 1/Monster compatible) + female Lapras
3. Offspring: Lapras with Freeze-Dry
4. Gen 8+: Use Nursery egg move transfer or Gen 9 Mirror Herb for simpler routing

**Chansey with Seismic Toss:**
- Gen 3: Move tutor teaches Seismic Toss to Machop line -> breed male Machop (Human-Like) with female Chansey (Fairy). **Does not work** -- Machop and Chansey share no egg group. Requires indirect chain.
- Gen 6+: Seismic Toss is a direct egg move for Chansey. Breed from any compatible Fairy-group father that knows it.

**Pichu with Volt Tackle (Emerald+):**
1. Obtain a Pikachu holding a Light Ball (wild Pikachu in Emerald have 5% hold chance)
2. Breed the Light Ball Pikachu (parent must hold Light Ball during breeding)
3. Offspring Pichu inherits Volt Tackle

---

## Section 7: Breeding Priority List

Which species to breed in which generation, ordered by urgency and legacy value. Items marked "do before moving on" represent opportunities lost if you advance without breeding.

### 7.1 Gen 2 (VC Gold/Silver/Crystal)

**Priority: HIGH -- Shiny breeding is unique to Gen 2**

| Task | Why | Urgency |
|------|-----|---------|
| Use Lake of Rage Gyarados as shiny breeding parent | ~1/64 shiny rate only exists in Gen 2 | HIGH |
| Breed shiny Dratini (Dragon/Water 1 bridge) | Opens shiny chain to Water 1, then Field and Monster | HIGH |
| Crystal: Soft-reset for shiny Odd Egg Tyrogue | Male shiny parent for Human-Like group; only way to reach isolated group | HIGH |
| Breed any shiny Field group member | Field is the largest group -- one shiny parent covers dozens of species | MEDIUM |

**Note:** Gen 2 shininess does not transfer. This breeding is valuable within the Gen 2 save only. The transferred specimens will not be shiny in Gen 7+.

### 7.2 Gen 3 (Emerald preferred)

**Priority: LOW -- Breeding is primitive, no boosted methods**

| Task | Why | Urgency |
|------|-----|---------|
| Breed Pichu with Volt Tackle (Light Ball Pikachu, Emerald) | Exclusive breeding mechanic | LOW |
| Breed egg moves onto any species you plan to keep in Gen 3 | No egg move transfer mechanism exists | LOW |

Gen 3 breeding is not worth heavy investment. Nature control is limited (Emerald only, 50%), IV inheritance is weak (3 IVs), and shiny odds are base 1/8192. Focus catching and move tutor efforts in Gen 3 instead.

### 7.3 Gen 4 (HGSS preferred)

**Priority: MEDIUM -- Ball catches are the main focus, not breeding itself**

| Task | Why | Urgency |
|------|-----|---------|
| Catch female Gen 1 species in Apricorn Balls (HGSS) | These become breeding stock when ball inheritance arrives in Gen 6 | **CRITICAL** |
| Breed with Power Items for key stat inheritance | Improvement over Gen 3, but still only 3 IVs total | LOW |
| Masuda Method if you want shiny + accept random nature | ~1/1638 odds, but Everstone conflict means no nature control | LOW |

**The real Gen 4 breeding priority is catching, not hatching.** Female Apricorn Ball specimens from HGSS are the most valuable breeding stock in the series.

### 7.4 Gen 5 (B2W2 preferred)

**Priority: HIGH -- HA breeding and move tutors before Bank**

| Task | Why | Urgency |
|------|-----|---------|
| Breed HA specimens from Hidden Grotto females | Female HA required in Gen 5; Gen 6 makes this easier, but Gen 5 specimens stay in Gen 5 | HIGH |
| Teach B2W2 move tutor moves before transferring | Last pre-Bank tutor set. Cannot return to learn them later. | **CRITICAL** |
| Shiny breed with Masuda + Charm (B2W2) | ~1/1024 is the best pre-Gen 6 rate | MEDIUM |
| Use 100% Everstone nature guarantee (B2W2) | First gen with deterministic nature control | HIGH |

### 7.5 Gen 6 (XY + ORAS)

**Priority: HIGH -- Modern breeding begins here**

| Task | Why | Urgency |
|------|-----|---------|
| Obtain 6-IV Ditto from Friend Safari (XY) | Foundation for all future Destiny Knot breeding | **CRITICAL** |
| Breed HA specimens from Friend Safari (35 Gen 1 species in XY) | Easiest HA source for many species | HIGH |
| Breed Gen 1 species into desired Apricorn Balls (via HGSS transfers) | First gen with ball inheritance | HIGH |
| Breed Lapras with Freeze-Dry | Signature egg move new to Gen 6 | MEDIUM |
| Breed competitive specimens (Destiny Knot + Everstone + HA + ball) | Modern 5-IV breeding is efficient here | MEDIUM |
| Teach ORAS tutor moves before transferring | Some moves are tutor-only | HIGH |

### 7.6 Gen 7 (USUM preferred)

**Priority: MEDIUM -- Ball refinement and Alolan forms**

| Task | Why | Urgency |
|------|-----|---------|
| Breed Beast Ball specimens (after catching one of each target) | Ball propagation through breeding | MEDIUM |
| Breed Kanto-form specimens in Alola (Everstone form trick) | Kanto form + Alola origin is unique | MEDIUM |
| Breed Game Boy origin specimens after VC transfer | Prepare for evolution decisions (Alolan vs Kanto) | HIGH |
| Teach USUM tutor moves | Last 3DS-era tutor set | **CRITICAL** |

### 7.7 Gen 8 (Sword/Shield)

**Priority: LOW for breeding specifically -- remediation tools reduce urgency**

| Task | Why | Urgency |
|------|-----|---------|
| Use Nursery egg move transfer on existing specimens | Fix any specimen missing egg moves without rebreeding | HIGH (QoL) |
| Apply Ability Patches for HA | Removes HA as a breeding constraint entirely | HIGH (QoL) |
| Apply Nature Mints | Removes nature as a breeding constraint | MEDIUM (QoL) |
| Masuda breed for shinies of SwSh-available Gen 1 species | Standard ~1/512 with Charm | LOW |

**SwSh shifts the priority from breeding to remediation.** Existing specimens can be fixed with Mints, Patches, and egg move transfer. Focus breeding time on species unavailable in later games.

### 7.8 Gen 9 (Scarlet/Violet)

**Priority: LOW for breeding specifically -- Mirror Herb simplifies everything**

| Task | Why | Urgency |
|------|-----|---------|
| Use Mirror Herb for egg move transfer | Simplest egg move distribution ever | HIGH (QoL) |
| Breed Paldean Tauros (all three breeds) | Gen 9-exclusive forms, Ditto required (male-only) | HIGH |
| Masuda breed for shinies with Egg Power sandwiches | Fastest egg generation with Egg Power Lv. 3 | MEDIUM |
| Use Item Printer for rare balls, then breed specimens into them | Best renewable rare ball source | MEDIUM |

---

## Appendix A: Quick Reference -- Breeding Mechanic Evolution

| Feature | Gen 2 | Gen 3 | Gen 4 | Gen 5 | Gen 6 | Gen 7 | Gen 8 | Gen 9 |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|
| **IVs inherited** | DVs (Defense + partial Special) | 3 | 3 + Power Items | 3 + Power Items | **5 (Destiny Knot)** | 5 | 5 | 5 |
| **Nature passing** | N/A | 50% (Emerald only) | 50% | 50% (BW) / **100% (B2W2)** | 100% | 100% | 100% | 100% |
| **Ability inherited** | N/A | No | No | **Yes (female only)** | Yes (either gender) | Yes | Yes | Yes |
| **HA passing** | N/A | N/A | N/A | Female only (60-80%) | **Either gender (60%)** | Either (60%) | Either (60%) | Either (60%) |
| **Ball inherited** | No | No | No | No | **Mother's ball** | **50/50 same-species** | 50/50 | 50/50 |
| **Egg moves from** | Father | Father | Father | Father | **Both parents** | Both | Both + Nursery transfer | Both + Mirror Herb |
| **Masuda Method** | N/A | N/A | ~1/1638 | ~1/1366 | ~1/683 | ~1/683 | ~1/683 | ~1/683 |
| **+ Shiny Charm** | N/A | N/A | N/A | ~1/1024 (B2W2) | **~1/512** | ~1/512 | ~1/512 | ~1/512 |
| **Base shiny rate** | 1/8192 (DV-based) | 1/8192 | 1/8192 | 1/8192 | **1/4096** | 1/4096 | 1/4096 | 1/4096 |

## Appendix B: Ditto Locations by Generation

| Generation | Game | Location | Notes |
|-----------|------|----------|-------|
| Gen 2 | G/S/C | Routes 34, 35 | 4% encounter rate |
| Gen 3 | RS | Must trade | Not available wild |
| Gen 3 | Emerald | Desert Underpass (post-E4) | |
| Gen 3 | FRLG | Routes 13-15, Pokemon Mansion, Cerulean Cave | **Primary Gen 3 Ditto source** |
| Gen 4 | DPPt | Route 218, Trophy Garden | |
| Gen 4 | HGSS | Routes 34/35, Cerulean Cave | **Best Gen 4 source** -- catch with Synchronize leads for nature sets |
| Gen 5 | BW | Giant Chasm | Post-game |
| Gen 5 | B2W2 | Giant Chasm + Hidden Grotto | HA Imposter Ditto from Hidden Grotto |
| Gen 6 | XY | Pokemon Village, Friend Safari | **Friend Safari Ditto have 2+ guaranteed IVs and potential HA** |
| Gen 6 | ORAS | Mirage spots | |
| Gen 7 | SM/USUM | Mount Hokulani, Konikoni City | SM has more accessible spawns |
| Gen 8 | SwSh | Lake of Outrage (Wild Area) | Max Raid Ditto for high IVs |
| Gen 9 | SV | Tera Raids, West Province | Foreign Ditto via trade or surprise trade |

---

*Sources: Individual game research documents in this series ([03-vc-gold-silver.md](03-vc-gold-silver.md) through [14-gen9-sv.md](14-gen9-sv.md)). Mechanics cross-referenced with Bulbapedia (Pokemon breeding, Egg Group, individual species learnset pages) and Serebii.net. Items marked with specific generation attributions are verified against the corresponding game doc.*
