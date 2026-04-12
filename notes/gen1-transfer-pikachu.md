# Shiny Pikachu / Raichu — Gen 1 Transfer Notes

## Transfer Path
Yellow (.sav) → 3DS VC inject (Checkpoint) → Poke Transporter → Pokemon Bank → Gen 7+

## What Happens on Transfer
- **Shiny**: Preserved — DVs (Def=10, Spd=10, Spc=10, Atk valid) = shiny in Gen 7+
- **Ability**: Hidden Ability (Lightning Rod) — all Gen 1 VC transfers get HA
- **IVs**: 3 guaranteed perfect (31), other 3 random — original DVs are NOT directly converted
- **Ball**: Poke Ball (all Gen 1 transfers)
- **Origin Mark**: Game Boy icon
- **Gender**: Random based on species ratio (not stored in Gen 1)
- **OT**: Preserved from Gen 1 save

## Nature Control
**Nature = Total EXP mod 25** at the moment of transfer. Can be manipulated freely from the same savestate.

### Easy Natures (Rare Candy to exact level)
| Nature | +Stat | -Stat | Levels to target |
|---|---|---|---|
| Hasty | Speed | Defense | 21, 46, 71, 96 |
| Jolly | Speed | Sp.Atk | 17, 42, 67, 92 |
| Adamant | Attack | Sp.Atk | 12, 37, 62, 87 |

### Harder Natures (need partial EXP between levels)
Pikachu is Medium-Fast group: EXP at level L = L³

| Nature | +Stat | -Stat | Example |
|---|---|---|---|
| Timid | Speed | Attack | Level 8 (512 EXP) + 23 battle EXP = 535 |
| Modest | Sp.Atk | Attack | Level 8 (512 EXP) + 3 battle EXP = 515 |

Timid and Modest are NOT achievable at exact level boundaries (10 and 15 are not cubic residues mod 25). Must gain precise battle EXP after a level up.

### Nature Recommendations
- **Pikachu** (special attacker w/ Light Ball): Timid or Hasty
- **Raichu**: Timid or Modest
- **Alolan Raichu**: Timid or Modest
- **For collection only**: Any nature works, Hasty at Lv21 is easiest useful option

## Plan
1. Find shiny Pikachu (farm running)
2. Load savestate
3. For Pikachu: Rare Candy to 21 → Hasty, or manipulate EXP for Timid
4. Inject save to 3DS VC, transfer via Poke Transporter → Bank
5. For Raichu: Load same savestate again, different EXP/nature, transfer, evolve with Thunder Stone in Gen 7

## Full Nature Table (EXP mod 25)
| Mod | Nature | Mod | Nature | Mod | Nature |
|---|---|---|---|---|---|
| 0 | Hardy | 10 | Timid | 20 | Calm |
| 1 | Lonely | 11 | Hasty | 21 | Gentle |
| 2 | Brave | 12 | Serious | 22 | Sassy |
| 3 | Adamant | 13 | Jolly | 23 | Careful |
| 4 | Naughty | 14 | Naive | 24 | Quirky |
| 5 | Bold | 15 | Modest | | |
| 6 | Docile | 16 | Mild | | |
| 7 | Relaxed | 17 | Quiet | | |
| 8 | Impish | 18 | Bashful | | |
| 9 | Lax | 19 | Rash | | |
