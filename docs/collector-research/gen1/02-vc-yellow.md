# VC Yellow Collector Research

Virtual Console Pokemon Yellow (3DS eShop, 2016) is the **enhanced third version** of Gen 1. For a collector, Yellow's defining value is that it lets you obtain **all three original starters plus Pikachu** as Game Boy origin specimens on a single save file -- something impossible in Red or Blue. This document covers **only what differs from Red/Blue**. For unchanged mechanics (DV system, shiny eligibility, transfer mechanics, nature manipulation, Hidden Abilities on transfer), see [01-vc-red-blue.md](01-vc-red-blue.md).

---

## Section A: Yellow-Specific Mechanics

### A.1 Starter Pikachu

Yellow replaces the three-way starter choice with a single forced Pikachu:

| Property | Details |
|----------|---------|
| Species | Pikachu (#025) |
| Level | 5 |
| Location | Pallet Town (gift from Prof. Oak) |
| Ball | Poke Ball |
| Starting moves | ThunderShock, Growl |
| DVs | Randomly generated (rolled twice -- once when it appears wild on Route 1, discarded when Oak catches it, then regenerated when transferred to the player) |
| Friendship start | 90 (out of 0-255 range) |

**Unique restrictions:**
- **Cannot evolve.** Using a Thunder Stone triggers "Pikachu is refusing!" -- a reference to the anime. This means Raichu is completely unobtainable in Yellow without trading.
- **Cannot be released.** Attempting to release triggers "Pikachu looks unhappy about it!"
- **Cannot be deposited** without consequences. Depositing in the PC reduces friendship by 3-5 points depending on current tier.
- **Follows you** outside its Poke Ball after the first Rival battle. Displays unique emotion sprites when interacted with.
- **Voiced cries** by Ikue Otani (anime voice actress) instead of standard electronic cries.

**Collector impact:** The starter Pikachu has fully random DVs, so it can be shiny-eligible (1/8192). Pikachu is 50/50 gender ratio, so there is no shiny+female conflict. However, since it cannot evolve into Raichu in Yellow, you must transfer it to SM/USUM first, then evolve -- and evolving in Alola always produces **Alolan Raichu** (Electric/Psychic). You cannot get a Kanto Raichu from the Yellow starter Pikachu unless you evolve it in a non-Alolan game after transferring through Bank/HOME.

**SAVE-BEFORE:** Save before receiving Pikachu from Oak. DVs are set at this point.

### A.2 Pikachu Friendship System

Yellow introduced the friendship mechanic -- the first time it appeared in any Pokemon game. It applies exclusively to the starter Pikachu in Yellow and affects one key collector gate: the Bulbasaur gift.

**Friendship value:** Stored as 0-255. Starts at 90.

**What raises friendship:**

| Action | Gain (0-99) | Gain (100-199) | Gain (200-255) |
|--------|-------------|----------------|-----------------|
| Level up | +5 | +3 | +2 |
| Walk 255 steps (50% chance) | +2 | +1 | +0 |
| Gym Leader battle (Pikachu non-fainted) | +3 | +2 | +1 |
| Use medicine (Potion, etc.) | +1 | +0 | +0 |
| Teach TM/HM | +1 | +0 | +0 |

**What lowers friendship:**

| Action | Loss |
|--------|------|
| Fainting (opponent < 30 levels higher) | -1 to -5 (varies by tier) |
| Fainting (opponent 30+ levels higher, or outside battle) | -5 to -10 |
| Depositing in PC | -3 to -5 |
| Trading | -10 to -20 |

**Practical note:** Starting at 90, you need to reach 147 for the Bulbasaur gift. Walking and normal progression will get you there well before Cerulean City. Using Potions on Pikachu at full HP raises friendship by +1 each time (tier 0-99), which is the fastest grinding method. You can also level grind on Route 3 with your Pikachu to accumulate friendship through both leveling and walking steps.

**How to check friendship:** Talk to Pikachu (interact with it while it follows you). The emotion sprite gives a rough read:

| Friendship Range | Pikachu's Reaction |
|------------------|--------------------|
| 0 | Turns its back on you |
| 1-99 | Ear flickers, looks angry |
| 100-199 | Looks content |
| 200-219 | Looks pleased |
| 220-254 | Heart floating above |
| 255 | Six hearts flying around |

### A.3 Gift Starters -- The Core Yellow Advantage

Yellow is the **only Gen 1 game** where all three original starters are obtainable on a single save. Each is a gift Pokemon received from a specific NPC:

| # | Species | Level | Location | Requirement | Ball |
|---|---------|-------|----------|-------------|------|
| 025 | Pikachu | 5 | Pallet Town | Starter (automatic) | Poke Ball |
| 001 | Bulbasaur | 10 | Cerulean City (house near Pokemon Center) | Pikachu friendship >= 147 | Poke Ball |
| 004 | Charmander | 10 | Route 24 (north end of Nugget Bridge) | Talk to NPC (no special requirement) | Poke Ball |
| 007 | Squirtle | 10 | Vermilion City (Officer Jenny) | Defeat Lt. Surge (Thunder Badge) | Poke Ball |

**Why this matters for collectors:**

1. **All four Game Boy origin starters on one save.** In Red/Blue, you get one starter per save -- three playthroughs for all three. In Yellow, one playthrough covers all three plus Pikachu.
2. **All are gift Pokemon** with Poke Ball. DVs are randomly generated at the moment you receive them.
3. **All starters are 87.5% male.** The shiny + female impossibility from the RB doc applies to all three here too.
4. **Hidden Abilities on transfer:** Bulbasaur (Chlorophyll), Charmander (Solar Power), Squirtle (Rain Dish). Same as RB.
5. **Bulbasaur at Level 10** (vs Level 5 in RB) and **Charmander at Level 10** (vs 5 in RB) and **Squirtle at Level 10** (vs 5 in RB). Slightly higher starting levels, but this has no collector impact.

**SAVE-BEFORE:** Save before talking to each NPC to receive each starter. DVs are set on receipt.

**Bulbasaur friendship threshold:** The Bulbapedia source states "at least 147." Serebii states "above 146." These are equivalent (>= 147 = > 146). [VERIFIED: consistent across sources.]

### A.4 Charizard Learns Fly (Yellow-Exclusive TM Compatibility)

In Red/Blue, Charizard cannot learn HM02 Fly despite being a Flying-type. This was corrected in Yellow. Charizard can learn Fly via HM02 in Yellow.

**Collector relevance:** Moves are not preserved on transfer through Poke Transporter, so this has no impact on the transferred specimen. However, it is relevant for in-game playthrough planning -- a Charmander evolved to Charizard in Yellow can serve as your Fly user.

### A.5 Surfing Pikachu and Pikachu's Beach

**Original cartridge:** To get a Pikachu with Surf, you needed to transfer one from Pokemon Stadium (clear Master Ball division of Round 2 Prime Cup using a Game Pak Pikachu in the final battle). This unlocked Pikachu's Beach, a surfing minigame accessible from the Summer Beach House on Route 19.

**Virtual Console change:** Pokemon Stadium connectivity does not exist on the 3DS. There is **no way to teach Pikachu Surf** on VC Yellow. However, Nintendo modified the VC release so that **Pikachu's Beach is accessible without Surf** -- having Pikachu in your party is sufficient to play the minigame.

**Collector impact:** None. Surfing Pikachu is not obtainable on VC Yellow. The minigame is cosmetic only. Pikachu cannot learn Surf through any VC-era method. [VERIFIED: Bulbapedia and Serebii both confirm this change.]

### A.6 Jessie and James Encounters

Yellow replaces four generic Team Rocket Grunt battles with named Jessie and James encounters (anime reference). They appear at:

| Location | Pokemon | Levels |
|----------|---------|--------|
| Mt. Moon | Ekans, Meowth, Koffing | 14, 14, 14 |
| Rocket Hideout (Celadon Game Corner basement) | Arbok, Meowth, Weezing | 25, 25, 25 |
| Pokemon Tower (Lavender Town, top floor) | Arbok, Meowth, Weezing | 27, 27, 27 |
| Silph Co. (Saffron City) | Arbok, Meowth, Weezing | 31, 31, 31 |

**Collector impact:** None. These are trainer battles, not wild encounters. You cannot catch their Pokemon. Notably, they use Ekans/Arbok, Meowth, and Koffing/Weezing -- all of which are **unobtainable** in Yellow's wild (see Section B). This is thematic consistency with the anime but has no collector implications.

### A.7 Rival's Eevee (Not Obtainable)

In Yellow, the Rival receives Eevee from Prof. Oak instead of choosing a starter. The Rival's Eevee evolves differently based on early battle outcomes:
- Win both Pallet Town and Route 22 battles: Rival gets Jolteon
- Lose one of the early battles: Rival gets Flareon
- Lose/skip the Route 22 battle: Rival gets Vaporeon

This has no collector impact -- you cannot catch the Rival's Pokemon. Your own Eevee gift in Celadon Mansion is unchanged from RB (Level 25, one per save).

### A.8 Virtual Console Changes

The 3DS VC release preserves the original game nearly intact, including glitches. Notable changes:

| Change | Details |
|--------|---------|
| Wireless trading/battling | Cable Club uses local wireless instead of link cable |
| Pikachu's Beach accessible | No longer requires Surf Pikachu |
| Move animation updates | 16 moves received reduced-flashing animations (epilepsy safety) |
| Jynx sprite | Updated to purple face (Western releases only) |
| Glitches preserved | Mew Glitch, MissingNo., item duplication all still work |
| Save backup/restore | Not available (no VC restore points) |

---

## Section B: Changed Encounter Tables

This is the core research section. Yellow has substantially different wild encounter tables from Red/Blue.

### B.1 Species Removed from Yellow (13 species)

These species **cannot be obtained in Yellow** without trading from another Gen 1 or Gen 2 game:

| # | Species | Type | Why Removed | RB Availability |
|---|---------|------|-------------|-----------------|
| 013 | Weedle | Bug/Poison | Unknown (both-version species cut) | Both Red and Blue (Viridian Forest, Routes 2, 24, 25) |
| 014 | Kakuna | Bug/Poison | Weedle line removed | Both (Viridian Forest, evolve) |
| 015 | Beedrill | Bug/Poison | Weedle line removed | Both (evolve Kakuna) |
| 023 | Ekans | Poison | Team Rocket association (anime) | Red only (Routes 4, 11, 23) |
| 024 | Arbok | Poison | Ekans line removed | Red only (Route 23, evolve) |
| 026 | Raichu | Electric | Pikachu refuses evolution (anime) | Both (evolve Pikachu) |
| 052 | Meowth | Normal | Team Rocket association (anime) | Blue only (Routes 5, 6, 7, 8) |
| 053 | Persian | Normal | Meowth line removed | Blue only (evolve Meowth) |
| 109 | Koffing | Poison | Team Rocket association (anime) | Both (Pokemon Mansion) |
| 110 | Weezing | Poison | Koffing line removed | Both (Pokemon Mansion, evolve) |
| 124 | Jynx | Ice/Psychic | Trade-only in RB; trade removed in Yellow | Both (in-game trade for Poliwhirl) |
| 125 | Electabuzz | Electric | Removed from Power Plant | Red only (Power Plant) |
| 126 | Magmar | Fire | Removed from Pokemon Mansion | Blue only (Pokemon Mansion) |

**Collector analysis:**
- **Weedle/Kakuna/Beedrill:** Available in both RB. Their removal from Yellow is the most puzzling -- Caterpie's counterpart line was cut for no obvious thematic reason.
- **Ekans/Arbok, Meowth/Persian, Koffing/Weezing:** Cut because they are Jessie and James's signature Pokemon in the anime. Since Jessie and James appear as boss trainers using these species, removing them from wild availability maintains anime consistency.
- **Raichu:** Unobtainable because the starter Pikachu refuses evolution, and wild Pikachu does not appear in Yellow.
- **Jynx:** In RB, obtained only via in-game trade (Poliwhirl for Jynx in Cerulean City). This trade was removed in Yellow and no wild Jynx was added. Jynx is a true Yellow gap -- you need a Red or Blue save.
- **Electabuzz/Magmar:** Red/Blue exclusives that were not carried into Yellow. Both are one-location species in RB (Power Plant / Pokemon Mansion respectively).

**For a collector running all three VC games:** Jynx, Electabuzz, and Magmar must come from RB. Weedle line must come from RB. Ekans line from Red, Meowth line from Blue. Koffing line from either RB. Raichu from either RB (evolve any Pikachu).

### B.2 Red/Blue Version Exclusives Resolved in Yellow

Yellow makes most Red/Blue version exclusives available on a single save:

| # | Species | Red/Blue Status | Yellow Availability |
|---|---------|----------------|---------------------|
| 027 | Sandshrew | Blue only (Routes 4, 8, 9, 11, 23) | Wild: Routes 3, 4; Mt. Moon |
| 028 | Sandslash | Blue only (Route 23, evolve) | Cerulean Cave 1F/B1F; evolve Sandshrew |
| 037 | Vulpix | Blue only (Routes 7, 8, Pokemon Mansion) | Game Corner only (1,000 coins) |
| 038 | Ninetales | Blue only (evolve Vulpix) | Evolve Vulpix (Fire Stone) |
| 043 | Oddish | Red only (Routes 5, 6, 7, 12-15, 24, 25) | Wild: Routes 12-15, 24, 25 |
| 044 | Gloom | Red only (Routes 12-15, evolve) | Cerulean Cave 2F; evolve Oddish |
| 045 | Vileplume | Red only (evolve Gloom) | Evolve Gloom (Leaf Stone) |
| 056 | Mankey | Red only (Routes 5-8) | Wild: Routes 3, 4, 22, 23 |
| 057 | Primeape | Red only (Route 23, evolve) | Wild: Route 23 (Lv. 41); evolve Mankey |
| 058 | Growlithe | Red only (Routes 7, 8, Pokemon Mansion) | Wild: Pokemon Mansion 1F (10-20% rate) |
| 059 | Arcanine | Red only (evolve Growlithe) | Evolve Growlithe (Fire Stone) |
| 069 | Bellsprout | Blue only (Routes 5, 6, 7, 12-15, 24, 25) | Wild: Routes 12-15, 24, 25 |
| 070 | Weepinbell | Blue only (Routes 12-15, evolve) | Cerulean Cave 1F/2F; evolve Bellsprout |
| 071 | Victreebel | Blue only (evolve Weepinbell) | Evolve Weepinbell (Leaf Stone) |
| 123 | Scyther | Red only (Safari Zone, Game Corner) | Game Corner (6,500 coins) |
| 127 | Pinsir | Blue only (Safari Zone, Game Corner) | Game Corner (6,500 coins) |

**Key collector insight:** Yellow resolves **16 species** of version exclusivity. Both Scyther AND Pinsir are available in the same Game Corner. Both Oddish AND Bellsprout lines are wild. Both Sandshrew AND Mankey are wild. Vulpix is Game Corner only (1,000 coins), and Growlithe is wild in the Pokemon Mansion. This means a single Yellow save can obtain all of these without needing a second game.

**Species that remain exclusive to specific RB versions even with Yellow:**
- Ekans/Arbok: Red only (removed from Yellow entirely)
- Meowth/Persian: Blue only (removed from Yellow entirely)
- Electabuzz: Red only (removed from Yellow)
- Magmar: Blue only (removed from Yellow)

### B.3 Game Corner Prize Changes

Yellow's Game Corner lineup differs significantly from Red/Blue:

| # | Species | RB Status | Yellow Status |
|---|---------|-----------|---------------|
| 063 | Abra | R: 180 coins, B: 120 coins | 230 coins |
| 035 | Clefairy | R: 500 coins, B: 750 coins | **Removed** |
| 030 | Nidorina | Both: 1,200 coins | **Removed** |
| 033 | Nidorino | Both: 1,200 coins | **Removed** |
| 147 | Dratini | R: 2,800, B: 4,600 coins | **Removed** |
| 037 | Vulpix | Not available | **Added** (1,000 coins) |
| 040 | Wigglytuff | Not available | **Added** (2,680 coins) |
| 123 | Scyther | Red only: 5,500 coins | 6,500 coins |
| 127 | Pinsir | Blue only: 2,500 coins | 6,500 coins |
| 137 | Porygon | R: 9,999, B: 6,500 coins | 9,999 coins |

**Key changes:**
- **Vulpix (#037):** Game Corner exclusive in Yellow -- this is the ONLY way to get Vulpix in Yellow. It does not appear in the wild. 1,000 coins is affordable.
- **Wigglytuff (#040):** New prize. Not exclusive -- Jigglypuff is available wild and can evolve via Moon Stone. But the Game Corner offers the evolved form directly.
- **Scyther + Pinsir:** Both available in the same Game Corner for the first time. Both cost 6,500 coins.
- **Porygon (#137):** Still Game Corner exclusive, still 9,999 coins. Remains the only way to get Porygon in any Gen 1 game.
- **Dratini removed:** In RB, Dratini was a Game Corner option. In Yellow, it must come from Safari Zone fishing (Super Rod) or Cerulean Cave [NEEDS VERIFICATION: whether Dratini appears in Yellow's Cerulean Cave or only Safari Zone fishing].
- **Clefairy, Nidorina, Nidorino removed:** These are all available as wild encounters elsewhere, so the removal is inconsequential.

### B.4 In-Game Trade Changes

Yellow has a completely different set of in-game trades from Red/Blue:

**Yellow Trades:**

| Location | You Give | You Receive | Nickname | Notable |
|----------|----------|-------------|----------|---------|
| Route 2 | Clefairy | Mr. Mime (#122) | MILES | **Only way to get Mr. Mime in Yellow** |
| Route 5 | Cubone | Machoke (#067) -> Machamp (#068) | RICKY | **Evolves to Machamp on receipt** -- only in-game Machamp in Gen 1 |
| Route 11 | Lickitung | Dugtrio (#051) | GURIO | Convenience trade |
| Route 18 | Tangela | Parasect (#047) | SPIKE | Convenience trade |
| Cinnabar Lab | Golduck | Rhydon (#112) | BUFFY | Convenience trade |
| Cinnabar Lab | Growlithe | Dewgong (#087) | CEZANNE | Convenience trade |
| Cinnabar Lab | Kangaskhan | Muk (#089) | STICKY | Convenience trade |

**Red/Blue Trades Removed from Yellow:**

| RB Trade | What It Provided | Yellow Alternative |
|----------|-----------------|-------------------|
| Abra -> Mr. Mime (Route 2) | Mr. Mime (trade-only) | Clefairy -> Mr. Mime (still trade-only) |
| Poliwhirl -> Jynx (Cerulean) | Jynx (trade-only in RB) | **REMOVED -- Jynx unobtainable in Yellow** |
| Spearow -> Farfetch'd (Vermilion) | Farfetch'd (trade-only in RB) | **Farfetch'd now wild** (Route 12-13) |
| Slowbro -> Lickitung (Route 18) | Lickitung (trade-only in RB) | **Lickitung now wild** (Cerulean Cave B1F) |
| Raichu -> Electrode (Cinnabar) | Electrode | Removed (Electrode available wild in Power Plant) |
| Venonat -> Tangela (Cinnabar) | Tangela | Removed (Tangela available in Safari Zone) |
| Ponyta -> Seel (Cinnabar) | Seel | Removed (Seel available wild on Routes 17-21 Surfing) [NEEDS VERIFICATION] |
| Nidoran trades (Routes 5, 11) | Opposite gender Nidoran | Removed (both genders wild on same routes) |

**Collector-critical trade changes:**
- **Machamp from Cubone trade:** The Route 5 Cubone -> Machoke trade is unique to Yellow. The received Machoke immediately evolves into Machamp. This is the **only way to get Machamp without player-to-player trading** in any Gen 1 game. OT will be "TRAINER" with nickname "RICKY." For a collector wanting a self-caught/obtained Machamp with Game Boy mark, this is it.
- **Farfetch'd and Lickitung now wild:** In RB, these were only obtainable via in-game trades (guaranteed OT "TRAINER" and fixed nicknames). In Yellow, both appear as wild encounters, meaning you can catch them with your own OT. Farfetch'd appears on Route 12-13 (approx 4-5% rate, Lv. 26). Lickitung appears in Cerulean Cave B1F (approx 4-5% rate, Lv. 50-55). This is a **significant collector improvement** -- Yellow-origin specimens have your OT instead of "TRAINER."
- **Jynx gap:** The Jynx trade was removed and not replaced. Jynx cannot be obtained in Yellow at all. Must trade from RB.
- **Mr. Mime still trade-only:** The trade changed (now Clefairy -> Mr. Mime instead of Abra -> Mr. Mime) but Mr. Mime remains obtainable only via in-game trade. Still comes with OT "TRAINER" and nickname "MILES."

### B.5 Notable Route/Area Encounter Changes

Rather than reproducing every route table, here are the significant encounter changes that affect collector strategy:

**Viridian Forest:**

| Species | Red/Blue | Yellow |
|---------|----------|--------|
| Caterpie | 35-50% | 50% |
| Metapod | 5-35% | 25% |
| Weedle | 5-50% | **Removed** |
| Kakuna | 5-35% | **Removed** |
| Pikachu | 5% | **Removed** (you have starter) |
| Pidgey | -- | **Added** (24%) |
| Pidgeotto | -- | **Added** (1%, Lv. 9) |

**Route 3 (Pewter to Mt. Moon):**

| Species | Red/Blue | Yellow |
|---------|----------|--------|
| Mankey | Red only (15%) | Available (appears at ~15%) |
| Sandshrew | Blue only (15%) | **Added** (15%, Lv. 8-10) |
| Spearow | 35-55% | Reduced rate |
| NidoranF/M | -- | **Added** |

**Route 12-13 (south of Lavender Town):**
- **Farfetch'd added** (approx 4-5%, Lv. 26) -- not available wild in RB at all

**Pokemon Mansion (Cinnabar Island):**
- **Growlithe added** (1F, 10-20%, Lv. 26) -- Red-exclusive in RB
- **Magmar removed** -- Blue-exclusive in RB, not available in Yellow
- Koffing/Weezing **removed** -- present in RB, cut from Yellow

**Power Plant:**
- **Electabuzz removed** -- Red-exclusive in RB, not available in Yellow
- Pikachu **removed** -- present in RB Power Plant, not in Yellow
- Other encounters (Voltorb, Magnemite, Magneton, Electrode) remain

**Cerulean Cave (Post-game):**
Yellow's Cerulean Cave has a substantially different encounter table from RB. Notable unique encounters:

| Species | Yellow Status | Notes |
|---------|-------------|-------|
| Lickitung | B1F, Lv. 50-55, ~5% | **Only wild source in Yellow** (trade-only in RB) |
| Sandslash | 1F/B1F | New addition |
| Arbok | 1F/B1F | New (despite Ekans being "removed" -- Arbok appears here) |
| Raichu | 1F/B1F, ~4-10% | New (despite being "unobtainable" -- Raichu appears in Cerulean Cave!) |
| Weepinbell | 1F/2F | New |
| Gloom | 2F | New |
| Wigglytuff | 2F, ~5% | New |

**Critical discovery: Raichu IS obtainable in Yellow** via Cerulean Cave wild encounters, despite the starter Pikachu refusing to evolve. This is a post-game source only. [NEEDS VERIFICATION: Raichu appearing in Yellow's Cerulean Cave is reported by Bulbapedia encounter tables but contradicts several "unobtainable" lists. Cross-referencing confirms Raichu does appear in Cerulean Cave in Yellow according to Bulbapedia's encounter data, but Serebii lists Raichu as missing. This is DISPUTED -- the Serebii missing list includes Raichu while Bulbapedia's Cerulean Cave page shows Raichu encounters in Yellow.]

### B.6 Safari Zone Changes

Yellow's Safari Zone has some encounter table adjustments from RB:

- **Cubone/Marowak:** Listed as "R/B only" in the RB doc's Safari Zone table. In Yellow, Cubone appears on Routes instead [NEEDS VERIFICATION: whether Cubone still appears in Yellow's Safari Zone or was moved entirely to routes].
- **Scyther:** Was Red-only in Safari Zone. In Yellow, Scyther is Game Corner only (6,500 coins). [NEEDS VERIFICATION: whether Scyther still appears in Yellow's Safari Zone.]

Core Safari Zone species (Kangaskhan, Chansey, Tauros, Rhyhorn, Tangela, Dratini via fishing) remain available.

---

## Section C: Yellow-Exclusive Collector Targets

### C.1 Specimens Only Possible (or Materially Better) in Yellow

| Target | Why Yellow is Unique | Priority |
|--------|---------------------|----------|
| All 3 starters + Pikachu on one save | RB gives 1 starter per save; Yellow gives all 4 | **Critical** |
| Farfetch'd with player OT | Trade-only in RB (OT: TRAINER, nickname: DUX); wild in Yellow | **High** |
| Lickitung with player OT | Trade-only in RB (OT: TRAINER, nickname: MARC); wild in Yellow (Cerulean Cave) | **High** |
| Machamp via in-game trade | Only in-game Machamp in Gen 1 (Cubone -> Machoke -> evolves on trade) | **High** |
| Scyther + Pinsir on one save | Red gets Scyther, Blue gets Pinsir; Yellow gets both via Game Corner | **Medium** |
| All version exclusives on one save | 16 previously-exclusive species resolved | **Medium** |

### C.2 Specimens Impossible in Yellow

| Species | Must Come From | Notes |
|---------|---------------|-------|
| Weedle/Kakuna/Beedrill | Red or Blue | Available in both RB |
| Ekans/Arbok | Red | Red-exclusive |
| Meowth/Persian | Blue | Blue-exclusive |
| Koffing/Weezing | Red or Blue | Available in both RB |
| Jynx | Red or Blue | In-game trade in RB |
| Electabuzz | Red | Red-exclusive |
| Magmar | Blue | Blue-exclusive |
| Raichu | Red or Blue (evolve Pikachu) | [DISPUTED: may appear in Yellow's Cerulean Cave] |

### C.3 Machamp: The Yellow-Exclusive Trade Evolution

In Red/Blue, all four trade evolutions (Machamp, Golem, Alakazam, Gengar) require player-to-player trading. Yellow adds **one** in-game trade that produces a trade evolution:

- **Cubone -> Machoke (RICKY) -> Machamp** at Route 5

This is the only way to get Machamp without a trading partner in Gen 1. The specimen has OT "TRAINER" and nickname "RICKY" (unchangeable). For a completionist tracking Game Boy mark trade evolutions, this is a mandatory Yellow acquisition.

The other three trade evolutions (Golem, Alakazam, Gengar) still require player-to-player trading in Yellow, same as RB.

---

## Section D: Yellow-Specific Walkthrough Checklist

This covers the Yellow-specific progression with starter gifts and changed encounters. For general Gen 1 progression gates, see the RB doc Section A.7.

### D.1 Optimal Progression for Collectors

**Pallet Town:**
- [ ] **SAVE** before receiving Pikachu from Prof. Oak
- [ ] Receive Pikachu (Lv. 5). DVs set now.
- [ ] Begin friendship building immediately -- use Pikachu in battles, walk with it, use Potions

**Route 1 -> Viridian City -> Route 2:**
- [ ] Catch Pidgey and Rattata (same as RB, different rates)
- [ ] Note: No Pikachu in Viridian Forest (you have the starter)
- [ ] Note: No Weedle/Kakuna in Viridian Forest (Yellow removes them)
- [ ] Viridian Forest has Pidgey (24%) and rare Pidgeotto (1%, Lv. 9)

**Route 3 -> Mt. Moon:**
- [ ] Catch **Mankey** (previously Red-exclusive) on Route 3
- [ ] Catch **Sandshrew** (previously Blue-exclusive) on Route 3
- [ ] Catch **NidoranF and NidoranM** on Route 3
- [ ] **SAVE** before Mt. Moon fossil choice (same as RB: Helix vs Dome)

**Cerulean City:**
- [ ] Check Pikachu friendship (should be at or near 147 by now if you've been battling/walking)
- [ ] **SAVE** before talking to Melanie in the house near Pokemon Center
- [ ] Receive **Bulbasaur** (Lv. 10) -- requires friendship >= 147
- [ ] If friendship is too low: use Potions on full-HP Pikachu repeatedly, walk more, battle more

**Route 24 (Nugget Bridge):**
- [ ] **SAVE** before talking to Charmander NPC at north end
- [ ] Receive **Charmander** (Lv. 10) -- no special requirement

**Vermilion City:**
- [ ] Get Old Rod (Fishing Guru, same as RB)
- [ ] Defeat Lt. Surge (Thunder Badge)
- [ ] **SAVE** before talking to Officer Jenny
- [ ] Receive **Squirtle** (Lv. 10) -- requires Thunder Badge

**Mid-Game Route Notes:**
- [ ] Routes 12-13: Catch **Farfetch'd** (wild, ~5%, Lv. 26) -- player OT version
- [ ] Routes 12-15, 24, 25: Catch **Oddish** (previously Red-exclusive) and **Bellsprout** (previously Blue-exclusive)

**Celadon City Game Corner:**
- [ ] Purchase **Vulpix** (1,000 coins) -- Game Corner exclusive in Yellow
- [ ] Purchase **Scyther** (6,500 coins) -- previously Red-exclusive
- [ ] Purchase **Pinsir** (6,500 coins) -- previously Blue-exclusive
- [ ] Purchase **Porygon** (9,999 coins) -- Game Corner exclusive in all Gen 1 games
- [ ] Optional: Abra (230 coins), Wigglytuff (2,680 coins)

**Pokemon Mansion (Cinnabar Island):**
- [ ] Catch **Growlithe** (1F, 10-20%, Lv. 26) -- previously Red-exclusive
- [ ] Note: No Magmar in Yellow's Pokemon Mansion

**Route 5 Trade:**
- [ ] Trade Cubone for Machoke -> **Machamp** (RICKY) -- Yellow-exclusive

**Post-Game (Cerulean Cave):**
- [ ] Catch **Lickitung** (B1F, ~5%, Lv. 50-55) -- wild for first time (trade-only in RB)
- [ ] Catch **Mewtwo** (B1F, Lv. 70) -- same as RB, **SAVE-BEFORE**
- [ ] Notable Yellow-specific encounters: Sandslash, Arbok, Weepinbell, Gloom, Wigglytuff
- [ ] [DISPUTED] Raichu may be catchable here (see B.5)

### D.2 Friendship Management Quick Reference

To ensure Bulbasaur is available in Cerulean City:
1. Never let Pikachu faint if possible (biggest friendship drain)
2. Keep Pikachu in your party at all times (do NOT deposit in PC)
3. Use Potions on Pikachu even at full HP for +1 friendship each (fastest grind)
4. By the time you clear Brock and the Route 3-4 trainers, friendship should be well above 147

If you somehow arrive in Cerulean with low friendship (maybe Pikachu fainted repeatedly), you can grind it up by:
- Buying Potions and using them repeatedly on full-HP Pikachu (+1 per use, costs 300 yen each)
- Walking back and forth (255 steps = 50% chance of +2 at low tier)

---

## Section E: Transfer and Lockout Summary

### E.1 Transfer Mechanics

**Identical to Red/Blue.** Yellow uses the same transfer path:

VC Yellow -> Poke Transporter (3DS) -> Pokemon Bank -> SM/USUM or Pokemon HOME

All mechanics from the RB doc apply unchanged:
- DVs determine shiny eligibility (1/8192)
- Nature = Total EXP mod 25 (controllable)
- Hidden Ability assigned on transfer
- All balls become Poke Ball
- Game Boy origin mark applied
- 3 guaranteed perfect IVs (5 for Mew)

### E.2 Yellow-Specific Transfer Notes

| Topic | Note |
|-------|------|
| Starter Pikachu | Transfers normally. Cannot evolve in Yellow, but CAN evolve after transfer. Evolving in SM/USUM produces Alolan Raichu. |
| Gift starters | All three transfer normally with Game Boy mark + HA. Identical to RB starters on arrival. |
| Machamp (trade) | Transfers with OT "TRAINER." Game Boy mark + HA (Steadfast). |
| Mr. Mime (trade) | Transfers with OT "TRAINER." Game Boy mark + HA (Technician). |
| Farfetch'd (wild) | Transfers with player OT -- distinct from RB trade Farfetch'd (OT: TRAINER). |
| Lickitung (wild) | Transfers with player OT -- distinct from RB trade Lickitung (OT: TRAINER). |
| Mew Glitch | Same behavior as RB: glitch Mew fails Poke Transporter checks. Only official distribution Mew (OT: GF, ID: 22796) passes. |

### E.3 Lockout Considerations

Same as RB with one addition:

| Lockout | Details |
|---------|---------|
| Fossil choice | Helix OR Dome -- same as RB |
| Hitmonlee/Hitmonchan | One per save -- same as RB |
| Eevee evolution | One Eevee, three stone-evo options -- same as RB |
| Pikachu evolution | **Cannot evolve in Yellow.** Must transfer to evolve. |
| Jynx | **Cannot obtain at all.** Trade from RB required. |
| Weedle line | **Cannot obtain at all.** Trade from RB required. |

### E.4 Why Run Yellow In Addition to Red and Blue?

For a completionist collector running all three VC Kanto games:

| Yellow Provides | Red/Blue Provide |
|----------------|-----------------|
| All 3 starters + Pikachu on one save | One starter per save |
| Wild Farfetch'd and Lickitung (player OT) | Trade-only Farfetch'd and Lickitung (OT: TRAINER) |
| In-game Machamp (only way without trading partner) | No in-game Machamp |
| Both Scyther + Pinsir on one save | One per version |
| Most version exclusives resolved | Version exclusives split |
| -- | Weedle/Beedrill line |
| -- | Jynx |
| -- | Electabuzz (Red), Magmar (Blue) |
| -- | Ekans/Arbok (Red), Meowth/Persian (Blue) |

**Bottom line:** Yellow is not a replacement for Red/Blue but a powerful supplement. The three-game collector set (Red + Blue + Yellow) covers all 150 obtainable species (151 with event Mew) with maximum flexibility. Yellow uniquely provides the all-starters-on-one-save convenience and the player-OT Farfetch'd/Lickitung that RB cannot offer.

---

## Sources

Primary research sources for this document:
- Bulbapedia: Pokemon Yellow Version, Cerulean Cave, Viridian Forest, Friendship, Pikachu (Yellow), Surfing Pikachu, Version-exclusive Pokemon, In-game trade
- Serebii.net: Yellow Gift Pokemon, Yellow Trades, Yellow Missing Pokemon, Yellow Game Corner, Yellow Pikachu Emotions, Yellow Virtual Console Changes, Yellow Team Rocket
- Cross-referenced encounter data between both sources for all disputed claims
