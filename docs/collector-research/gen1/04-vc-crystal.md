# VC Crystal Collector Research

Virtual Console Pokemon Crystal (3DS eShop, January 2018) is the **definitive Gen 2 collector game** thanks to three Crystal-exclusive features: the **GS Ball Celebi event** (the only legitimate way to obtain a shiny Celebi with Game Boy origin mark), **move tutors** (Flamethrower, Ice Beam, Thunderbolt -- some creating legacy combinations), and the **Odd Egg** (14% shiny rate baby Pokemon that evolve into Gen 1 species). Crystal also consolidates Gold/Silver version exclusives into a single cartridge and makes several encounter table changes.

This document is **incremental over Gold/Silver**. For Gen 2 mechanics (shininess, breeding, DV inheritance, Apricorn Balls, time of day, transfer mechanics), see [03-vc-gold-silver.md](03-vc-gold-silver.md). For Gen 1 DV mechanics and nature manipulation, see [01-vc-red-blue.md](01-vc-red-blue.md).

---

## Section A: Crystal-Specific Mechanics

### A.1 The GS Ball Celebi Event (VC Exclusive)

This is the **headline feature** of VC Crystal. The GS Ball event was originally exclusive to the Japanese Mobile System GB adapter in 2001 and was never released internationally. The VC release makes it available to all players for the first time.

#### A.1.1 How to Trigger the Event

| Step | Action | Details |
|------|--------|---------|
| 1 | Defeat the Elite Four | Enter the Hall of Fame (all 8 Johto badges + E4) |
| 2 | Visit Goldenrod Pokemon Center | The Communication Center lady gives you the GS Ball automatically |
| 3 | Take GS Ball to Kurt (Azalea Town) | Show it to him at his house; he borrows it to analyze |
| 4 | Wait one in-game day | Return the next day; Kurt reports the ball is shaking and Ilex Forest is restless |
| 5 | Go to Ilex Forest shrine | Strong winds are blowing; place the GS Ball in the shrine |
| 6 | Battle Celebi | Level 30 wild Celebi appears |

**CRITICAL: You get ONE chance.** If you defeat Celebi or run from the battle, it is permanently gone on that save file. Save before placing the GS Ball.

#### A.1.2 Celebi Encounter Details

| Property | Value |
|----------|-------|
| Species | Celebi (#251) -- Psychic/Grass Mythical |
| Level | 30 |
| Moves | Heal Bell, Safeguard, AncientPower, Future Sight |
| DVs | **Randomly generated** when battle starts |
| Shiny | **YES -- can be shiny** (standard 1/8192 odds) |
| Catch rate | 45 (same as starters -- moderately difficult) |
| Held item | None |
| Ball | Player's choice |

#### A.1.3 Shiny Celebi -- The Crown Jewel

**VC Crystal Celebi is the ONLY legitimate way to obtain a shiny Celebi with Game Boy origin mark.** This makes it one of the most coveted specimens in the entire collection.

**Shiny hunting method:** Save before placing the GS Ball in the shrine. Place it, encounter Celebi, check if shiny. If not, soft-reset (press all four buttons simultaneously on 3DS VC). Repeat at 1/8192 odds.

**Why this matters:**
- Celebi is shiny-locked in virtually every other distribution (20th Anniversary, Jungle Celebi, etc.)
- The VC Crystal encounter has **random DVs** -- not fixed -- meaning shininess is possible
- On transfer via Poke Transporter, Celebi receives **5 guaranteed perfect IVs** (31 in five stats) because it is a Mythical Pokemon, plus the **Game Boy origin mark**
- A shiny Celebi with Game Boy mark is a specimen that can never be obtained again once the 3DS eShop services fully cease

**DV requirements for shiny Celebi:** Same as all Gen 2 shinies -- Attack DV must be 2, 3, 6, 7, 10, 11, 14, or 15; Defense, Speed, and Special DVs must all be exactly 10.

#### A.1.4 Celebi Transfer Properties

| Property | In Crystal | After Transfer (Gen 7+) |
|----------|-----------|------------------------|
| IVs | DVs (0-15, 4 stats) | 5 guaranteed 31 IVs + 1 random (Mythical bonus) |
| Nature | Does not exist | EXP mod 25 (controllable before transfer) |
| Ability | Does not exist | **Natural Cure** (Hidden Ability) |
| Shiny | DV-based (1/8192) | Preserved |
| Origin mark | None | **Game Boy mark** |
| Ball | Player's choice | **Poke Ball** (all balls convert on transfer) |
| Moves | Heal Bell, Safeguard, AncientPower, Future Sight | **Preserved** (standard moves pass through Transporter) |

**Nature manipulation:** Before transferring, grind Celebi's EXP to control `total_exp mod 25`. Timid (index 10) is generally optimal for Celebi's Sp.Atk/Speed spread. See the nature table in [01-vc-red-blue.md](01-vc-red-blue.md).

### A.2 Move Tutors (Crystal Exclusive)

Crystal introduced the **first move tutors** in the Pokemon series. Bill's father appears outside the Goldenrod Game Corner on **Wednesdays and Saturdays** after the player has entered the Hall of Fame and possesses the Coin Case.

#### A.2.1 Tutor Details

| Move | Type | Power | Accuracy | Cost |
|------|------|-------|----------|------|
| Flamethrower | Fire | 95 | 100% | 4,000 coins |
| Ice Beam | Ice | 95 | 100% | 4,000 coins |
| Thunderbolt | Electric | 95 | 100% | 4,000 coins |

**Usage:** One move per visit. After teaching a move, the tutor goes back inside the Game Corner and is unavailable until the next Wednesday or Saturday.

**Breeding:** These tutor moves are breedable in the same fashion as TMs and HMs -- a father knowing a tutor move can pass it to offspring if the move is in the offspring's TM/tutor learnset.

**CRITICAL FOR COLLECTORS:** Moves are **preserved through Poke Transporter transfer**. Standard TM, level-up, HM, and tutor moves pass through intact. Only event-exclusive moves that fail Transporter's legality check are blocked. This means Crystal move tutor moves (Flamethrower, Ice Beam, Thunderbolt) DO transfer to Gen 7+, creating **legal transfer-only specimens** that cannot be replicated by any other means.

#### A.2.2 Flamethrower Tutor -- Gen 1 Species

| # | Species | Still Learns Flamethrower in Gen 9 (SV)? | Legacy? |
|---|---------|------------------------------------------|---------|
| 004 | Charmander | Yes (via TM) | No |
| 005 | Charmeleon | Yes (via TM) | No |
| 006 | Charizard | Yes (via TM) | No |
| 031 | Nidoqueen | Yes (via TM) | No |
| 034 | Nidoking | Yes (via TM) | No |
| 035 | Clefairy | Not in SV | N/A (not transferable to SV) |
| 036 | Clefable | Not in SV | N/A |
| 037 | Vulpix | Yes (via TM) | No |
| 038 | Ninetales | Yes (via TM) | No |
| 039 | Jigglypuff | Not in SV | N/A |
| 040 | Wigglytuff | Not in SV | N/A |
| 058 | Growlithe | Yes (via TM) | No |
| 059 | Arcanine | Yes (via TM) | No |
| 066 | Machop | **Not in Gen 9 TM list** | **YES -- Legacy in Gen 9** |
| 067 | Machoke | **Not in Gen 9 TM list** | **YES -- Legacy in Gen 9** |
| 068 | Machamp | **Not in Gen 9 TM list** (was TR02 in SwSh) | **YES -- Legacy in Gen 9** |
| 074 | Geodude | Yes (via TM) | No |
| 075 | Graveler | Yes (via TM) | No |
| 076 | Golem | Yes (via TM) | No |
| 077 | Ponyta | Yes (via TM) | No |
| 078 | Rapidash | Yes (via TM) | No |
| 079 | Slowpoke | Not in SV base | [NEEDS VERIFICATION] |
| 080 | Slowbro | Not in SV base | [NEEDS VERIFICATION] |
| 088 | Grimer | Yes (via TM) | No |
| 089 | Muk | Yes (via TM) | No |
| 104 | Cubone | **Not in Gen 9 TM list** | **YES -- Legacy in Gen 9** |
| 105 | Marowak | **Not in Gen 9 TM list** | **YES -- Legacy in Gen 9** |
| 108 | Lickitung | **Not in Gen 9 TM list** | **YES -- Legacy in Gen 9** |
| 109 | Koffing | Yes (via TM) | No |
| 110 | Weezing | Yes (via TM) | No |
| 111 | Rhyhorn | Yes (via TM) | No |
| 112 | Rhydon | Yes (via TM) | No |
| 113 | Chansey | Not in SV base | [NEEDS VERIFICATION] |
| 115 | Kangaskhan | Not in SV base | [NEEDS VERIFICATION] |
| 126 | Magmar | Yes (via TM) | No |
| 128 | Tauros | Yes (via TM) | No |
| 130 | Gyarados | Yes (via TM) | No |
| 136 | Flareon | Yes (via TM) | No |
| 142 | Aerodactyl | Not in SV base | [NEEDS VERIFICATION] |
| 143 | Snorlax | Yes (via TM) | No |
| 146 | Moltres | Not in SV base | [NEEDS VERIFICATION] |
| 147 | Dratini | Not in SV base | [NEEDS VERIFICATION] |
| 148 | Dragonair | Not in SV base | [NEEDS VERIFICATION] |
| 149 | Dragonite | Yes (via TM) | No |
| 150 | Mewtwo | Not in SV base | [NEEDS VERIFICATION] |
| 151 | Mew | Not in SV base | [NEEDS VERIFICATION] |

**Key legacy findings:** Machop/Machoke/Machamp, Cubone/Marowak, and Lickitung can learn Flamethrower via Crystal tutor but **lost access to Flamethrower in Gen 9 (Scarlet/Violet)**. Machamp notably had Flamethrower via TR02 in Sword/Shield but lost it in Gen 9. Since moves ARE preserved through Poke Transporter, these species can arrive in Gen 7+ with Flamethrower as a **legal transfer-only move** -- a move they cannot learn by any other means in those games. This makes Crystal-tutored specimens genuinely valuable for collectors.

[NEEDS VERIFICATION: Several species' Gen 9 availability and Flamethrower access needs cross-referencing against SV DLC content.]

#### A.2.3 Ice Beam Tutor -- Gen 1 Species

| # | Species | Notes |
|---|---------|-------|
| 007 | Squirtle | Unobtainable in Crystal |
| 008 | Wartortle | Unobtainable in Crystal |
| 009 | Blastoise | Unobtainable in Crystal |
| 019 | Rattata | Available |
| 020 | Raticate | Available |
| 030 | Nidorina | Available |
| 031 | Nidoqueen | Available |
| 033 | Nidorino | Available |
| 034 | Nidoking | Available |
| 035 | Clefairy | Available |
| 036 | Clefable | Available |
| 039 | Jigglypuff | Available |
| 040 | Wigglytuff | Available |
| 054 | Psyduck | Available |
| 055 | Golduck | Available |
| 060 | Poliwag | Available |
| 061 | Poliwhirl | Available |
| 062 | Poliwrath | Available |
| 072 | Tentacool | Available |
| 073 | Tentacruel | Available |
| 079 | Slowpoke | Available |
| 080 | Slowbro | Available |
| 086 | Seel | Available |
| 087 | Dewgong | Available |
| 090 | Shellder | Available |
| 091 | Cloyster | Available |
| 098 | Krabby | Available |
| 099 | Kingler | Available |
| 104 | Cubone | Available |
| 105 | Marowak | Available |
| 108 | Lickitung | Available |
| 111 | Rhyhorn | Available |
| 112 | Rhydon | Available |
| 113 | Chansey | Available |
| 115 | Kangaskhan | Available |
| 116 | Horsea | Available |
| 117 | Seadra | Available |
| 118 | Goldeen | Available |
| 119 | Seaking | Available |
| 120 | Staryu | Available |
| 121 | Starmie | Available |
| 124 | Jynx | Available |
| 128 | Tauros | Available |
| 130 | Gyarados | Available |
| 131 | Lapras | Available |
| 134 | Vaporeon | Available |
| 137 | Porygon | Available (Game Corner) |
| 138 | Omanyte | Unobtainable in Crystal |
| 139 | Omastar | Unobtainable in Crystal |
| 140 | Kabuto | Unobtainable in Crystal |
| 141 | Kabutops | Unobtainable in Crystal |
| 143 | Snorlax | Available |
| 144 | Articuno | Unobtainable in Crystal |
| 147 | Dratini | Available |
| 148 | Dragonair | Available |
| 149 | Dragonite | Available |
| 150 | Mewtwo | Unobtainable in Crystal |
| 151 | Mew | Unobtainable in Crystal |

#### A.2.4 Thunderbolt Tutor -- Gen 1 Species

| # | Species | Notes |
|---|---------|-------|
| 019 | Rattata | Available |
| 020 | Raticate | Available |
| 025 | Pikachu | Available |
| 026 | Raichu | Available |
| 029 | Nidoran-F | Available |
| 030 | Nidorina | Available |
| 031 | Nidoqueen | Available |
| 032 | Nidoran-M | Available |
| 033 | Nidorino | Available |
| 034 | Nidoking | Available |
| 035 | Clefairy | Available |
| 036 | Clefable | Available |
| 039 | Jigglypuff | Available |
| 040 | Wigglytuff | Available |
| 052 | Meowth | Available (Night only) |
| 053 | Persian | Available (evolve Meowth) |
| 056 | Mankey | Unobtainable in Crystal |
| 057 | Primeape | Unobtainable in Crystal |
| 081 | Magnemite | Available |
| 082 | Magneton | Available |
| 088 | Grimer | Available |
| 089 | Muk | Available |
| 092 | Gastly | Available |
| 093 | Haunter | Available |
| 094 | Gengar | Available (trade evolution) |
| 100 | Voltorb | Available (in-game trade) |
| 101 | Electrode | Available (evolve Voltorb) |
| 108 | Lickitung | Available |
| 109 | Koffing | Available |
| 110 | Weezing | Available |
| 111 | Rhyhorn | Available |
| 112 | Rhydon | Available |
| 113 | Chansey | Available |
| 115 | Kangaskhan | Available |
| 120 | Staryu | Available |
| 121 | Starmie | Available |
| 122 | Mr. Mime | Available (breed from in-game trade) |
| 125 | Electabuzz | Available |
| 128 | Tauros | Available |
| 130 | Gyarados | Available |
| 131 | Lapras | Available (gift, Fridays) |
| 135 | Jolteon | Available (evolve Eevee) |
| 137 | Porygon | Available (Game Corner) |
| 143 | Snorlax | Available |
| 145 | Zapdos | Unobtainable in Crystal |
| 147 | Dratini | Available |
| 148 | Dragonair | Available |
| 149 | Dragonite | Available |
| 150 | Mewtwo | Unobtainable in Crystal |
| 151 | Mew | Unobtainable in Crystal |

#### A.2.5 Move Tutor Summary for Collectors

**The practical reality:** Poke Transporter preserves standard moves on transfer, including Crystal move tutor moves. This gives Crystal tutor moves significant collector value:

1. **Legal transfer-only moves in Gen 7+** -- species that lost access to Flamethrower, Ice Beam, or Thunderbolt in later generations can arrive with those moves legally via Crystal tutor + Transporter
2. **Breeding within Gen 2** -- a father with a tutor move can pass it to offspring if it is in their TM/tutor compatibility
3. **Historical novelty** -- the first move tutors in any Pokemon game

Move tutors DO make a transferred specimen more valuable, especially for species that lost access to those moves in modern games. Teach tutor moves to all transfer candidates where applicable.

### A.3 The Odd Egg

The Odd Egg is a **Crystal-exclusive gift** from the Day-Care Man on Route 34. It hatches into one of seven baby Pokemon with an unusually high shiny rate.

#### A.3.1 Obtaining the Egg

| Property | Detail |
|----------|--------|
| Location | Route 34 Day Care |
| Given by | Day-Care Man |
| When available | After reaching Goldenrod City (after 2nd badge) |
| Determination timing | **Species and shininess are determined when you receive the egg** |
| Soft-reset strategy | Save BEFORE talking to the Day-Care Man; soft-reset until desired species/shininess hatches |

#### A.3.2 Possible Species and Shiny Rates

**International versions (non-Japanese):**

| Species | # | Evolves Into (Gen 1) | Shiny Rate | Non-Shiny Rate | Total Hatch Rate |
|---------|---|---------------------|------------|----------------|------------------|
| Pichu | 172 | Pikachu (#025), Raichu (#026) | ~1% | ~13% | ~14% |
| Cleffa | 173 | Clefairy (#035), Clefable (#036) | ~3% | ~12% | ~15% |
| Igglybuff | 174 | Jigglypuff (#039), Wigglytuff (#040) | ~3% | ~12% | ~15% |
| Tyrogue | 236 | Hitmonlee (#106), Hitmonchan (#107), Hitmontop (#237) | ~1% | ~13% | ~14% |
| Smoochum | 238 | Jynx (#124) | ~2% | ~12% | ~14% |
| Elekid | 239 | Electabuzz (#125) | ~2% | ~12% | ~14% |
| Magby | 240 | Magmar (#126) | ~2% | ~12% | ~14% |

**Combined shiny rate: ~14% (sum of all species' shiny rates)**

**Japanese version:** 50% shiny rate (dramatically higher).

[NEEDS VERIFICATION: The exact per-species hatch and shiny probabilities listed above are approximate and derived from Bulbapedia's statement that chances are "not uniform." The exact internal probability table requires disassembly data to confirm precise values.]

#### A.3.3 Odd Egg DV Sets

| Condition | Attack | Defense | Speed | Special | HP (derived) |
|-----------|--------|---------|-------|---------|--------------|
| Shiny | 2 | 10 | 10 | 10 | 0 |
| Non-Shiny | 0 | 0 | 0 | 0 | 0 |

**ALL Odd Egg hatches are female** (except Tyrogue, which is male-only by species design).

**Hidden Power:**
- Shiny: Grass-type, power 49
- Non-Shiny: Fighting-type, power 31

#### A.3.4 Hatching Details

| Property | Value |
|----------|-------|
| Hatch level | 5 |
| Experience | 125 |
| Egg cycles | 20 (5,120 steps) |
| Guaranteed move | Dizzy Punch (plus species-default moves) |

#### A.3.5 Collector Value -- Gen 1 Evolution Targets

The Odd Egg's real collector value comes from evolving the babies into Gen 1 species with Game Boy origin:

| Baby | Evolves Into | Evolution Method | Collector Significance |
|------|-------------|-----------------|----------------------|
| Pichu | **Pikachu** (#025) | Friendship | Shiny Pikachu with Game Boy origin |
| Pichu | **Raichu** (#026) | Thunderstone (after Pikachu) | Shiny Raichu with GB origin |
| Cleffa | **Clefairy** (#035) | Friendship | Shiny Clefairy with GB origin |
| Cleffa | **Clefable** (#036) | Moon Stone (after Clefairy) | Shiny Clefable with GB origin |
| Igglybuff | **Jigglypuff** (#039) | Friendship | Shiny Jigglypuff with GB origin |
| Igglybuff | **Wigglytuff** (#040) | Moon Stone (after Jigglypuff) | Shiny Wigglytuff with GB origin |
| Tyrogue | **Hitmonlee** (#106) | Level 20 if Attack > Defense | **Premium** -- shiny Fighting type with GB origin |
| Tyrogue | **Hitmonchan** (#107) | Level 20 if Defense > Attack | **Premium** -- shiny Fighting type with GB origin |
| Smoochum | **Jynx** (#124) | Level 30 | Shiny Jynx with GB origin |
| Elekid | **Electabuzz** (#125) | Level 30 | Shiny Electabuzz with GB origin |
| Magby | **Magmar** (#126) | Level 30 | Shiny Magmar with GB origin |

**Tyrogue note (Odd Egg shiny):** Shiny Odd Egg Tyrogue has DVs 2/10/10/10. Since Attack DV (2) < Defense DV (10), **a shiny Odd Egg Tyrogue will always evolve into Hitmonchan** (#107). To get shiny Hitmonlee from the Odd Egg, you would need Attack > Defense, which is impossible with the fixed shiny DV set (Attack 2, Defense 10). Hitmontop requires Attack = Defense, also impossible.

[NEEDS VERIFICATION: Tyrogue evolution uses the Gen 2 Attack and Defense *stats*, not DVs directly. At level 20 with DVs 2/10/10/10 and 0 Stat Exp, Attack will be lower than Defense, so the Hitmonchan conclusion holds. But if the player invests significant Stat Exp in Attack before level 20, the evolution target could theoretically change.]

### A.4 Game Corner Prize Changes

Crystal changes the Game Corner prize lineup from Gold/Silver:

#### A.4.1 Goldenrod Game Corner

| Crystal | G/S |
|---------|-----|
| Abra -- 200 coins | Abra -- 200 coins |
| Cubone -- 800 coins | Ekans (Gold) / Sandshrew (Silver) -- 700 coins |
| Wobbuffet -- 1,500 coins | Dratini -- 2,100 coins |

**Key change:** Dratini is no longer available at the Goldenrod Game Corner in Crystal. Cubone and Wobbuffet replace the version-exclusive and Dratini slots.

#### A.4.2 Celadon Game Corner (Kanto)

| Crystal | G/S |
|---------|-----|
| Pikachu -- 2,222 coins | Mr. Mime -- 3,333 coins |
| Porygon -- 5,555 coins | Eevee -- 6,666 coins |
| Larvitar -- 8,888 coins | Porygon -- 9,999 coins |

**Key changes:** Mr. Mime and Eevee are gone from prizes. Pikachu and Larvitar are new. Porygon remains but at a lower price.

**TM prizes remain the same across all three games:**
- Goldenrod: TM14 Blizzard, TM25 Thunder, TM38 Fire Blast (5,500 coins each)
- Celadon: TM32 Double Team, TM29 Psychic, TM15 Hyper Beam (1,500 / 3,500 / 7,500 coins)

**Collector impact:** Dratini must be obtained via wild encounter (Dragon's Den) or breeding in Crystal, not the Game Corner. Mr. Mime requires breeding from a traded specimen. Eevee is still available as Bill's gift in Goldenrod.

### A.5 In-Game Trade Changes

Crystal has a different set of in-game trades from Gold/Silver:

| You Give | You Receive | # | Location | OT | G/S Equivalent |
|----------|------------|---|----------|-----|----------------|
| Bellsprout | Onix (Rocky) | 095 | Violet City | Kyle | Same |
| Abra | Machop (Muscle, female) | 066 | Goldenrod City | Mike | G/S: Drowzee for Machop |
| Krabby | Voltorb (Volty) | 100 | Olivine City | Tim | Same |
| Female Dragonair | Dodrio (Doris, male) | 085 | Blackthorn City | Emy | G/S: Female Dragonair for Rhydon |
| Haunter | Xatu (Paul, male) | -- | Pewter City | Chris | G/S: Gloom for Rapidash |
| Dugtrio | Magneton (Maggie) | 082 | Power Plant | Forest | **Crystal exclusive** -- not in G/S |
| Chansey | Aerodactyl (Aeroy, male) | 142 | Route 14 | Kim | Same |

**Key changes for Gen 1 collectors:**
- **Rhydon** (#112): No longer available via in-game trade in Crystal (was Dragonair-for-Rhydon in Blackthorn in G/S). Must catch Rhyhorn wild and evolve.
- **Rapidash** (#078): No longer available via in-game trade in Crystal (was Gloom-for-Rapidash in Pewter in G/S). Must catch Ponyta wild and evolve.
- **Magneton** (#082): NEW in-game trade at Power Plant -- trade Dugtrio for Magneton. This trade does not exist in G/S.
- **Dodrio** (#085): Replaces Rhydon as the Blackthorn trade reward.
- **Aerodactyl** (#142): Unchanged. Still the only non-trade source for Aerodactyl in Gen 2. **Aerodactyl is the only Pokemon obtainable solely through in-game trading in Crystal.**

### A.6 Kurt Apricorn Ball Improvement

In Gold/Silver, Kurt can only craft **one Apricorn Ball at a time**. In Crystal, Kurt can accept **multiple Apricorns of the same color** and craft multiple balls per day. This is a significant quality-of-life improvement for collectors who want to stockpile specific ball types.

Ball types, effects, Apricorn locations, and transfer behavior (all balls convert to Poke Ball on Poke Transporter) are unchanged from G/S. See [03-vc-gold-silver.md](03-vc-gold-silver.md) Section A.4.

### A.7 Battle Tower

Crystal introduced the **first Battle Tower** in the Pokemon series, located north of Route 40 (west of Olivine City).

| Property | Detail |
|----------|--------|
| Location | North of Route 40 |
| Format | 3 Pokemon, 7 consecutive battles |
| Level ranges | Available at various tiers; level 60-100 unlocked after Hall of Fame |
| Restrictions | No duplicate held items; Mewtwo/Mew/Lugia/Ho-Oh/Celebi only at L70+ |
| Prizes | 5x vitamins per win streak (Calcium, Carbos, HP Up, Iron, or Protein) |

**Collector relevance:** Minimal. The Battle Tower provides only vitamin items as rewards. No unique Pokemon, ribbons, or collector-relevant items. The vitamins can boost Stat Exp (EVs in Gen 2 terms) but this is erased on transfer. Primarily useful for in-game team building.

### A.8 Miscellaneous Crystal Changes

**Animated sprites:** Crystal was the first Pokemon game with animated intro sprites when a Pokemon enters battle. Purely cosmetic -- no collector impact.

**Jynx sprite update:** The Japanese VC release updated Jynx's sprite from the original black-faced design to the international purple-faced version.

**Suicune subplot:** Crystal features an extended subplot with Eusine tracking Suicune. Suicune no longer roams -- it waits at the Tin Tower after the player encounters it at several fixed locations and obtains the Clear Bell. This is Gen 2 legendary and not directly relevant to Gen 1 collecting, but it changes how the Tin Tower (Ho-Oh) sequence works.

**Save restore disabled:** The 3DS VC version disables the standard Virtual Console Save Backup and Restore Point features. You cannot use VC restore points to manipulate encounters. Standard soft-resetting (button combination) still works.

---

## Section B: Gen 1 Species Availability Changes (Crystal vs Gold/Silver)

### B.1 Additional Unobtainable Species in Crystal

Crystal **loses** several Gen 1 species compared to Gold/Silver (combined):

| # | Species | Status in G/S | Status in Crystal | Impact |
|---|---------|--------------|-------------------|--------|
| 037 | Vulpix | Silver wild (Route 36/37/48, Burned Tower) | **Unobtainable** | Must trade from Silver or Gen 1 |
| 038 | Ninetales | Silver (evolve Vulpix) | **Unobtainable** | Must trade |
| 056 | Mankey | Gold wild (Route 9, 42) | **Unobtainable** | Must trade from Gold or Gen 1 |
| 057 | Primeape | Gold wild (Route 9) | **Unobtainable** | Must trade |

**Note:** Vulpix and Ninetales were Silver-exclusive. Mankey and Primeape were Gold-exclusive. Since Crystal is one version (not two), these version exclusives are simply absent.

### B.2 Species with Changed Encounters

| # | Species | G/S Location | Crystal Change |
|---|---------|-------------|----------------|
| 052 | Meowth | Silver: Routes 5-8, 38, 39 (all times) | Crystal: Routes 5-8, 11, 38, 39 (**Night only**) -- also gained Route 11 |
| 058 | Growlithe | Gold: Route 36/37, Burned Tower | Crystal: Route 36 (Morning/Day, 10%) -- **now available without Gold version** |
| 126 | Magmar | Burned Tower B1F (L14-16, all times) | **Silver Cave entrance** (L45, Morning/Day only) -- moved to endgame |
| 128 | Tauros | Route 38/39 (all times, 4-5%) | Route 38/39 (**Morning/Day only**, 5%) -- lost Night encounters |

### B.3 Growlithe Accessibility

In Gold/Silver, Growlithe was a **Gold version exclusive** (Route 36/37 in Gold, Vulpix in Silver). In Crystal, Growlithe appears on **Route 36** at level 5 during Morning and Day (10% rate), making it available without needing Gold version. However, Vulpix is now unobtainable -- Crystal chose Growlithe over Vulpix.

Crystal also adds a **new grassy area** on the east side of Route 36 (near Violet City) that did not exist in Gold/Silver, where Growlithe can be caught very early in the game.

### B.4 Magmar Relocation

Magmar moved from Burned Tower B1F (accessible mid-game in G/S) to Silver Cave entrance (post-Champion in Crystal). This makes Magmar a **late-game Pokemon** in Crystal. The Odd Egg's Magby provides an alternative source much earlier.

### B.5 Version Exclusives Consolidated

Since Crystal is a single version, it resolves G/S version exclusives by including some from each:

| G/S Exclusive To | In Crystal? | Crystal Resolution |
|-----------------|-------------|-------------------|
| Mankey/Primeape (Gold) | **No** | Unobtainable |
| Growlithe/Arcanine (Gold) | **Yes** | Route 36 (Morning/Day) |
| Spinarak/Ariados (Gold) | **Yes** | Multiple routes (Night) |
| Teddiursa/Ursaring (Gold) | **Yes** | Route 45 |
| Gligar (Gold) | **Yes** | Route 45 |
| Mantine (Gold) | [NEEDS VERIFICATION] | |
| Vulpix/Ninetales (Silver) | **No** | Unobtainable |
| Meowth/Persian (Silver) | **Yes** | Night encounters only |
| Ledyba/Ledian (Silver) | **Yes** | Morning encounters |
| Phanpy/Donphan (Silver) | **Yes** | Route 46 (Morning, 5%) |
| Skarmory (Silver) | **Yes** | Route 45 |
| Delibird (Silver) | **Yes** | Ice Path |

**Net result for Gen 1 species:** Crystal gains Growlithe/Arcanine (from Gold), loses Vulpix/Ninetales (from Silver) and Mankey/Primeape (from Gold). Meowth/Persian remain but become Night-only.

### B.6 Complete Crystal Unobtainable Gen 1 List

| # | Species | Also Unobtainable in G/S? | Crystal-Specific Loss? |
|---|---------|--------------------------|----------------------|
| 001-003 | Bulbasaur line | Yes | No |
| 004-006 | Charmander line | Yes | No |
| 007-009 | Squirtle line | Yes | No |
| 037-038 | Vulpix, Ninetales | Silver-exclusive (obtainable in Silver) | **Yes -- lost from Crystal** |
| 056-057 | Mankey, Primeape | Gold-exclusive (obtainable in Gold) | **Yes -- lost from Crystal** |
| 138-139 | Omanyte, Omastar | Yes | No |
| 140-141 | Kabuto, Kabutops | Yes | No |
| 144 | Articuno | Yes | No |
| 145 | Zapdos | Yes | No |
| 146 | Moltres | Yes | No |
| 150 | Mewtwo | Yes | No |
| 151 | Mew | Yes | No |

**Total unobtainable Gen 1 species: 22** (vs 19 in G/S combined, 18 in Gold alone, 18 in Silver alone).

### B.7 Mass Outbreak Changes

Crystal restricts mass outbreaks to only three species: **Yanma, Dunsparce, and Qwilfish** (all Gen 2). In Gold/Silver, mass outbreaks could include Tauros, Marill, and Snubbull. The Tauros mass outbreak on Route 38 is no longer possible in Crystal -- but Tauros remains available at 5% (Morning/Day only) on Routes 38/39.

---

## Section C: Odd Egg Breeding Strategy

### C.1 Breeding Shiny Odd Egg Babies

A shiny Odd Egg baby (DVs 2/10/10/10) is an excellent **breeding parent** for producing more shinies, using the ~1/64 shiny breeding odds documented in [03-vc-gold-silver.md](03-vc-gold-silver.md) Section A.3.3.

**How it works:** The shiny baby has Defense 10 and Special 10. When bred with Ditto (or a compatible partner), offspring inherit Defense from the opposite-gender parent and have 50% chance of Special matching. Combined with random Attack (50% chance of shiny-eligible value) and random Speed (1/16 chance of 10), the offspring has ~1/64 shiny odds.

**However:** All Odd Egg hatches are female (except Tyrogue). In Gen 2 breeding, the **father** determines DV inheritance for Defense. So to use an Odd Egg baby as a shiny breeding parent:
- Breed the female Odd Egg baby with Ditto to get a **male offspring** (with inherited shiny DVs if lucky)
- Use that male offspring as the father in further breeding chains
- OR: Use the **Lake of Rage shiny Gyarados** (male, DVs 14/10/10/10) as the breeding father for species in compatible egg groups

**Tyrogue exception:** Tyrogue is male, so a shiny Odd Egg Tyrogue can directly serve as a breeding father in the **Human-Like egg group** (which includes Machop, Abra, Drowzee, Mr. Mime, Jynx lines -- all Gen 1).

### C.2 Egg Groups for Odd Egg Babies

| Baby | Egg Groups | Gen 1 Species Shareable Via Breeding |
|------|-----------|-------------------------------------|
| Pichu | Field, Fairy | Rattata, Vulpix, Growlithe, Ponyta, Eevee, Pikachu lines (Field); Clefairy, Jigglypuff, Pikachu lines (Fairy) |
| Cleffa | Fairy | Clefairy, Jigglypuff, Pikachu lines |
| Igglybuff | Fairy | Clefairy, Jigglypuff, Pikachu lines |
| Tyrogue | Human-Like | Machop, Abra, Drowzee, Mr. Mime, Jynx, Hitmonlee, Hitmonchan lines |
| Smoochum | Human-Like | Same as Tyrogue |
| Elekid | Human-Like | Same as Tyrogue |
| Magby | Human-Like | Same as Tyrogue |

---

## Section D: Bug-Catching Contest

The Bug-Catching Contest runs **Tuesday, Thursday, and Saturday** at National Park. The encounter table and prizes are **identical across Gold, Silver, and Crystal**.

### D.1 Gen 1 Bug Species

| Species | # | Level Range | Rate | Contest-Exclusive? |
|---------|---|------------|------|--------------------|
| Caterpie | 010 | 7-18 | 20% | No (wild on Routes 30/31) |
| Metapod | 011 | 9-18 | 10% | No (evolve Caterpie) |
| Butterfree | 012 | 12-15 | 5% | **Yes** -- only in contest |
| Weedle | 013 | 7-18 | 20% | No (wild on Route 31) |
| Kakuna | 014 | 9-18 | 10% | No (evolve Weedle) |
| Beedrill | 015 | 12-15 | 5% | **Yes** -- only in contest |
| Paras | 046 | 10-17 | 10% | No (Ilex Forest, Mt. Moon) |
| Venonat | 048 | 10-16 | 10% | No (National Park at night, Routes 24/25) |
| Scyther | 123 | 13-14 | 5% | **Yes** -- only in contest |
| Pinsir | 127 | 13-14 | 5% | **Yes** -- only in contest |

**Prizes:** 1st = Sun Stone, 2nd = Everstone, 3rd = Gold Berry, Consolation = Berry. No change from G/S.

**Collector note:** Scyther and Pinsir are **only** obtainable in the Bug-Catching Contest across all three Gen 2 games. They are caught in Sport Balls (lose ball type on transfer).

---

## Section E: Walkthrough Checklist (Crystal-Specific)

Progression guide focusing on Crystal-exclusive content and changed encounters. Reference [03-vc-gold-silver.md](03-vc-gold-silver.md) for unchanged G/S content.

### E.1 Early Game (Badges 1-2)

| Task | When | Details |
|------|------|---------|
| Catch Growlithe | After reaching Route 36 | Morning/Day, 10% rate. Crystal-exclusive early availability |
| Catch Phanpy | Route 46 (accessible from Cherrygrove) | Morning only, 5%. Crystal-exclusive; Silver version exclusive in G/S |
| Collect Odd Egg | Route 34 Day Care | **Save before collecting.** Soft-reset for desired species + shiny |
| Start Kurt's Apricorn Balls | After Azalea Gym | Can now batch multiple same-color Apricorns |

### E.2 Odd Egg Strategy

1. Save immediately before talking to the Day-Care Man on Route 34
2. Talk to him and receive the Odd Egg
3. Hatch the egg (5,120 steps / 20 egg cycles)
4. Check species and shiny status
5. If not desired result, soft-reset and repeat from step 2

**Priority targets for Gen 1 collectors:**
- **Shiny Tyrogue** (~1% chance): Evolves to shiny Hitmonchan with Game Boy origin. Also an excellent male breeding parent in Human-Like egg group.
- **Shiny Elekid** (~2% chance): Evolves to shiny Electabuzz
- **Shiny Magby** (~2% chance): Evolves to shiny Magmar
- **Shiny Smoochum** (~2% chance): Evolves to shiny Jynx
- **Shiny Pichu** (~1% chance): Evolves to shiny Pikachu/Raichu

### E.3 Mid-Game (Badges 3-8)

| Task | When | Details |
|------|------|---------|
| Bug-Catching Contest | Tue/Thu/Sat after Badge 2 | Catch Scyther, Pinsir (contest-exclusive) |
| Lake of Rage Gyarados | After Badge 7 | Same as G/S -- guaranteed shiny, premier breeding parent |
| Catch Meowth (Night) | Routes 38/39 (Night only) | Silver exclusive in G/S, now Night-only in Crystal |
| Catch Tauros (Day) | Routes 38/39 (Morning/Day) | No longer available at Night in Crystal |

### E.4 Post-Champion

| Task | When | Details |
|------|------|---------|
| GS Ball Celebi | After Elite Four | **#1 Priority.** Save before shrine. Hunt for shiny if desired. |
| Move Tutors | Wed/Sat after Hall of Fame | Teach Flamethrower/Ice Beam/Thunderbolt. 4,000 coins each. |
| Battle Tower | Any time (L60+ after E4) | Vitamins only. Low priority. |
| Catch Magmar | Silver Cave entrance | Morning/Day, 10%, L45. Only Crystal location for Magmar. |

### E.5 Pre-Transfer Checklist

Before using Poke Transporter to send Pokemon to Gen 7:

| Task | Why |
|------|-----|
| Grind Celebi EXP for nature | EXP mod 25 controls nature in Gen 7. Timid recommended for Celebi. |
| Grind ALL transfer candidates for nature | Same EXP mod 25 manipulation for every specimen. |
| Remove held items | Poke Transporter rejects Pokemon with held items. |
| Teach move tutor moves to transfer candidates | Moves are preserved on transfer. Crystal tutor moves (Flamethrower, Ice Beam, Thunderbolt) create legal transfer-only specimens in Gen 7+. |
| Box 1 only | Poke Transporter pulls from Box 1 only. |

---

## Section F: Transfer and Lockout Summary

### F.1 Transfer Path

Same as Gold/Silver:

**VC Crystal --> Poke Transporter (3DS) --> Pokemon Bank --> SM/USUM or --> Pokemon HOME (one-way)**

All transfer rules from [03-vc-gold-silver.md](03-vc-gold-silver.md) Section A.6 apply. Key reminders:
- 3 guaranteed 31 IVs for regular Pokemon; **5 guaranteed 31 IVs for Mew and Celebi**
- Nature = EXP mod 25
- Hidden Ability assigned to all transfers
- Ball type always becomes Poke Ball
- Moves preserved (standard TM/level-up/HM/tutor moves pass through; only event-exclusive moves that fail legality check are blocked)
- Shiny status preserved (Poke Transporter v1.3+ correctly handles Gen 2 DV formula)
- Game Boy origin mark applied

### F.2 Crystal-Specific Transfer Value

| Specimen | Transfer Value | Why Special |
|----------|---------------|-------------|
| **Shiny Celebi** | **Exceptional** | Only legitimate source of shiny Celebi with GB mark. 5 perfect IVs on transfer. Potentially the most valuable single specimen in the entire VC collection. |
| Celebi (non-shiny) | Very high | Mythical with GB mark. 5 perfect IVs. Legal Celebi obtainable through gameplay (not event-dependent). |
| Shiny Odd Egg evolutions | High | Shiny Gen 1 species (Hitmonchan, Electabuzz, Magmar, Jynx, Pikachu, etc.) with GB origin at relatively accessible ~14% shiny rate |
| Growlithe / Arcanine | Moderate | Available in Crystal without needing Gold version. Same as Gold wild otherwise. |
| Meowth / Persian | Moderate | Available without Silver. Night-only in Crystal. |

### F.3 What Crystal Adds Over Gold/Silver

| Feature | G/S | Crystal |
|---------|-----|---------|
| Celebi | Unobtainable | **Obtainable (GS Ball event)** |
| Move Tutors | None | Flamethrower, Ice Beam, Thunderbolt |
| Odd Egg | None | 14% shiny rate baby Pokemon |
| Apricorn Ball batching | One at a time | Multiple per day |
| Battle Tower | None | Available (vitamins only) |
| Growlithe without Gold | No | Yes (Route 36) |
| Meowth without Silver | No | Yes (Night encounters) |
| Phanpy early | No | Yes (Route 46 Morning) |

### F.4 What Crystal Loses vs Gold/Silver Combined

| Lost | Impact |
|------|--------|
| Vulpix / Ninetales | Must trade from Silver or Gen 1 |
| Mankey / Primeape | Must trade from Gold or Gen 1 |
| Girafarig | Must trade (Gen 2, not Gen 1 relevant) |
| Mareep / Flaaffy / Ampharos | Must trade (Gen 2) |
| Remoraid / Octillery | Must trade (Gen 2) |
| Night Tauros encounters | Tauros now Morning/Day only |
| Early Magmar (Burned Tower) | Magmar now endgame (Silver Cave) |
| Dratini at Game Corner | Must catch wild or breed |
| Rapidash in-game trade | Must evolve Ponyta |
| Rhydon in-game trade | Must evolve Rhyhorn |

---

## Section G: Unown and Ruins of Alph

Unown (#201) is a Gen 2 species and not directly relevant to Gen 1 collecting. Crystal expanded the Ruins of Alph puzzle system with additional chambers and radio broadcasts, but these changes do not affect Gen 1 species availability. The wild encounters around the Ruins of Alph (Natu, Smeargle, Quagsire) are unchanged except for time-of-day restrictions:

**Smeargle** (Gen 2, #235) -- Available at Ruins of Alph exterior during **Morning/Day only** in Crystal (was all times in G/S). Not Gen 1 relevant but noted as an encounter change.

---

## Sources

Primary research sources:
- Bulbapedia: [GS Ball](https://bulbapedia.bulbagarden.net/wiki/GS_Ball), [Celebi](https://bulbapedia.bulbagarden.net/wiki/Celebi_(Pok%C3%A9mon)), [Odd Egg](https://bulbapedia.bulbagarden.net/wiki/Odd_Egg), [Move Tutor](https://bulbapedia.bulbagarden.net/wiki/Move_Tutor), [Pokemon Crystal Version](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Crystal_Version), [Poke Transporter](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9_Transporter), [Battle Tower Gen II](https://bulbapedia.bulbagarden.net/wiki/Battle_Tower_(Generation_II)), [Bug-Catching Contest](https://bulbapedia.bulbagarden.net/wiki/Bug-Catching_Contest), [Ilex Forest Shrine](https://bulbapedia.bulbagarden.net/wiki/Ilex_Forest_shrine)
- Serebii: [Crystal Celebi](https://www.serebii.net/crystal/celebi.shtml), [Crystal VC Changes](https://www.serebii.net/crystal/virtualconsole.shtml), [Crystal Move Tutor](https://www.serebii.net/crystal/movetutor.shtml), [Crystal Unobtainable](https://www.serebii.net/crystal/unobtainable.shtml), [Crystal Trades](https://www.serebii.net/crystal/trades.shtml), [Crystal Game Corner](https://www.serebii.net/crystal/gamecorner.shtml), [G/S Exclusives](https://www.serebii.net/gs/exclusives.shtml), [Flamethrower Gen II](https://www.serebii.net/attackdex-gs/flamethrower.shtml), [Ice Beam Gen II](https://www.serebii.net/attackdex-gs/icebeam.shtml), [Thunderbolt Gen II](https://www.serebii.net/attackdex-gs/thunderbolt.shtml), [Flamethrower Gen IX](https://www.serebii.net/attackdex-sv/flamethrower.shtml)
- Route encounter data: Serebii Pokearth [Route 36](https://www.serebii.net/pokearth/johto/2nd/route36.shtml), [Route 38](https://www.serebii.net/pokearth/johto/2nd/route38.shtml), [Route 46](https://www.serebii.net/pokearth/johto/2nd/route46.shtml)
