#!/usr/bin/env node
/**
 * Generates specimen-targets-gameboy.json and specimen-tasks-gameboy.json
 * for all 251 Gen 1+2 species based on collector research docs.
 *
 * COLLECTING PHILOSOPHY:
 *   Crystal breeding with shiny Ditto (1/64 shiny rate) is the default
 *   for ANY breedable species. Only non-breedable species (legendaries,
 *   Nidorina/Nidoqueen, Unown) use direct-catch in their source game.
 *   Gen 1 games are only needed for non-breedable Gen 1 exclusives
 *   (legendary birds, Mewtwo) — Yellow preferred for broadest access.
 *
 * Run: node server/src/seeds/generate-gameboy-specimens.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');

// Nature name → EXP mod 25 value
const NATURE_MOD = {
  hardy: 0, lonely: 1, brave: 2, adamant: 3, naughty: 4,
  bold: 5, docile: 6, relaxed: 7, impish: 8, lax: 9,
  timid: 10, hasty: 11, serious: 12, jolly: 13, naive: 14,
  modest: 15, mild: 16, quiet: 17, bashful: 18, rash: 19,
  calm: 20, gentle: 21, sassy: 22, careful: 23, quirky: 24
};

// ─── Species definitions ────────────────────────────────────────────
// { id, name, game, loc, how, nature, gender, cat, pri, notes, tmMoves? }
// how: breed, wild, gift, static, evolve, egg, odd_egg
// gender: '87.5M','75M','50/50','75F','M','F','--'
// cat: mandatory, optional, prestige

function s(id, name, game, loc, how, nature, gender, cat, pri, notes, tmMoves) {
  return { id, name, game, loc, how, nature, gender, cat: cat || 'mandatory', pri: pri || 1, notes: notes || null, tmMoves: tmMoves || null };
}

// Helper: crystal breeding entry (the default for most species)
function breed(id, name, nature, gender, pri, notes, tmMoves) {
  return s(id, name, 'crystal', 'goldenrod-city', 'breed', nature, gender, 'mandatory', pri || 2, notes, tmMoves);
}

// Helper: evolution entry
function evo(id, name, game, nature, gender, notes) {
  return s(id, name, game, null, 'evolve', nature, gender, 'mandatory', 3, notes);
}

// ─── NON-BREEDABLE SPECIES ──────────────────────────────────────────
// Only these need direct catch — everything else is Crystal breeding.
//
// Gen 1 legendaries (NOT in GSC, must catch in Yellow):
//   144 Articuno, 145 Zapdos, 146 Moltres, 150 Mewtwo
// Gen 1 special:
//   151 Mew (event only)
// Gen 1 can't-breed (available in Crystal wild):
//   30 Nidorina, 31 Nidoqueen (Undiscovered egg group)
// Gen 2 legendaries:
//   243 Raikou, 244 Entei, 245 Suicune, 249 Lugia, 250 Ho-Oh, 251 Celebi
// Gen 2 can't-breed:
//   201 Unown (Undiscovered egg group)

// ─── Gen 1 species (1-151) ──────────────────────────────────────────

const GEN1_SPECIES = [
  // === STARTERS — Crystal breeding with shiny Ditto (1/64) ===
  // Trade from Yellow (all 3 starters available) → Crystal → breed
  breed(1, 'Bulbasaur', 'modest', '87.5M', 1,
    'HA Chlorophyll on transfer. Male only for shiny (87.5M, Atk DV conflict). Trade from Yellow to Crystal, breed with shiny Ditto.',
    [{ game: 'red', loc: 'celadon-city', moves: ['swords-dance'], desc: 'Bulbasaur with Swords Dance (TM03) — Gen 1 exclusive TM move', nature: 'adamant' }]),
  evo(2, 'Ivysaur', 'crystal', 'modest', '87.5M', 'Evolve Bulbasaur at Lv 16.'),
  evo(3, 'Venusaur', 'crystal', 'modest', '87.5M', 'Evolve Ivysaur at Lv 32.'),

  breed(4, 'Charmander', 'timid', '87.5M', 1,
    'HA Solar Power on transfer. Timid for standard/Mega Y; Adamant for Mega X.'),
  evo(5, 'Charmeleon', 'crystal', 'timid', '87.5M', 'Evolve Charmander at Lv 16.'),
  evo(6, 'Charizard', 'crystal', 'timid', '87.5M', 'Evolve Charmeleon at Lv 36.'),

  breed(7, 'Squirtle', 'modest', '87.5M', 1, 'HA Rain Dish on transfer.'),
  evo(8, 'Wartortle', 'crystal', 'modest', '87.5M', 'Evolve Squirtle at Lv 16.'),
  evo(9, 'Blastoise', 'crystal', 'modest', '87.5M', 'Evolve Wartortle at Lv 36.'),

  // === COMMON WILD — All breedable, Crystal breeding default ===
  breed(10, 'Caterpie', 'timid', '50/50', 2, 'Available in Crystal headbutt trees, Ilex Forest.'),
  evo(11, 'Metapod', 'crystal', 'timid', '50/50', 'Evolve Caterpie at Lv 7.'),
  evo(12, 'Butterfree', 'crystal', 'timid', '50/50', 'Evolve Metapod at Lv 10. Gmax form in SwSh.'),

  breed(13, 'Weedle', 'jolly', '50/50', 2, 'Available in Crystal Route 30/31 grass.'),
  evo(14, 'Kakuna', 'crystal', 'jolly', '50/50', 'Evolve Weedle at Lv 7.'),
  evo(15, 'Beedrill', 'crystal', 'jolly', '50/50', 'Evolve Kakuna at Lv 10. Mega in ORAS.'),

  breed(16, 'Pidgey', 'timid', '50/50', 2, 'Routes 29-31 in Crystal, extremely common.'),
  evo(17, 'Pidgeotto', 'crystal', 'timid', '50/50', 'Evolve Pidgey at Lv 18.'),
  evo(18, 'Pidgeot', 'crystal', 'timid', '50/50', 'Evolve Pidgeotto at Lv 36. Mega in ORAS.'),

  breed(19, 'Rattata', 'jolly', '50/50', 2, 'Routes 29-31 in Crystal. Alolan form in SM/USUM.'),
  evo(20, 'Raticate', 'crystal', 'jolly', '50/50', 'Evolve Rattata at Lv 20.'),

  breed(21, 'Spearow', 'jolly', '50/50', 2, 'Route 42, Route 46 in Crystal.'),
  evo(22, 'Fearow', 'crystal', 'jolly', '50/50', 'Evolve Spearow at Lv 20.'),

  breed(23, 'Ekans', 'jolly', '50/50', 2, 'Route 32-33 in Crystal (morning/day).'),
  evo(24, 'Arbok', 'crystal', 'jolly', '50/50', 'Evolve Ekans at Lv 22.'),

  // Pikachu — Yellow starter is special (unique gift), but breeding is the shiny play
  breed(25, 'Pikachu', 'timid', '50/50', 1,
    'Breed in Crystal for shiny (1/64). Yellow starter gives HA Lightning Rod but 1/8192 shiny odds.',
    [{ game: 'yellow', loc: 'pallet-town', moves: ['mega-punch', 'mega-kick', 'pay-day'], desc: 'Pikachu with Yellow-exclusive TMs: Mega Punch, Mega Kick, Pay Day', nature: 'hasty' }]),
  evo(26, 'Raichu', 'crystal', 'timid', '50/50', 'Evolve Pikachu with Thunder Stone. VC Pikachu evolved in Alola = GB mark Alolan Raichu (prestige).'),

  breed(27, 'Sandshrew', 'jolly', '50/50', 2, 'Union Cave in Crystal. Alolan form in SM/USUM.'),
  evo(28, 'Sandslash', 'crystal', 'jolly', '50/50', 'Evolve Sandshrew at Lv 22.'),

  breed(29, 'Nidoran♀', 'modest', 'F', 2, 'Route 35-36 in Crystal. Only Nidoran-F can breed (Nidorina/Nidoqueen cannot).'),
  // Nidorina & Nidoqueen CANNOT breed — evolve from bred Nidoran♀
  evo(30, 'Nidorina', 'crystal', 'modest', 'F', 'Cannot breed (Undiscovered group). Evolve from bred Nidoran♀ at Lv 16.'),
  evo(31, 'Nidoqueen', 'crystal', 'modest', 'F', 'Evolve Nidorina with Moon Stone. Cannot breed. HA Sheer Force.'),

  breed(32, 'Nidoran♂', 'timid', 'M', 2, 'Route 35-36 in Crystal.'),
  evo(33, 'Nidorino', 'crystal', 'timid', 'M', 'Evolve Nidoran♂ at Lv 16.'),
  evo(34, 'Nidoking', 'crystal', 'timid', 'M', 'Evolve Nidorino with Moon Stone. HA Sheer Force.'),

  breed(35, 'Clefairy', 'bold', '75F', 2, 'Mt. Moon in Crystal (Kanto). Moon Ball thematic in HGSS.'),
  evo(36, 'Clefable', 'crystal', 'bold', '75F', 'Evolve Clefairy with Moon Stone. HA Unaware.'),

  breed(37, 'Vulpix', 'timid', '75F', 2, 'Route 36-37 in Crystal. Alolan form in SM/USUM.'),
  evo(38, 'Ninetales', 'crystal', 'timid', '75F', 'Evolve Vulpix with Fire Stone.'),

  breed(39, 'Jigglypuff', 'bold', '75F', 2, 'Route 34, 46 in Crystal.'),
  evo(40, 'Wigglytuff', 'crystal', 'bold', '75F', 'Evolve Jigglypuff with Moon Stone.'),

  breed(41, 'Zubat', 'jolly', '50/50', 2, 'Every cave in Crystal.'),
  evo(42, 'Golbat', 'crystal', 'jolly', '50/50', 'Evolve Zubat at Lv 22.'),

  breed(43, 'Oddish', 'modest', '50/50', 2, 'Route 34 in Crystal (night). Ilex Forest.'),
  evo(44, 'Gloom', 'crystal', 'modest', '50/50', 'Evolve Oddish at Lv 21. Also evolves into Bellossom.'),
  evo(45, 'Vileplume', 'crystal', 'modest', '50/50', 'Evolve Gloom with Leaf Stone.'),

  breed(46, 'Paras', 'adamant', '50/50', 2, 'Ilex Forest, National Park in Crystal.'),
  evo(47, 'Parasect', 'crystal', 'adamant', '50/50', 'Evolve Paras at Lv 24.'),

  breed(48, 'Venonat', 'timid', '50/50', 2, 'Route 43 in Crystal (night).'),
  evo(49, 'Venomoth', 'crystal', 'timid', '50/50', 'Evolve Venonat at Lv 31.'),

  breed(50, 'Diglett', 'jolly', '50/50', 2, 'Diglett\'s Cave in Crystal (Kanto). Alolan form in SM/USUM.'),
  evo(51, 'Dugtrio', 'crystal', 'jolly', '50/50', 'Evolve Diglett at Lv 26.'),

  breed(52, 'Meowth', 'timid', '50/50', 2, 'Routes 38-39 in Crystal. Alolan + Galarian forms.'),
  evo(53, 'Persian', 'crystal', 'timid', '50/50', 'Evolve Meowth at Lv 28.'),

  breed(54, 'Psyduck', 'modest', '50/50', 2, 'Route 35 in Crystal. Common surf/fish.'),
  evo(55, 'Golduck', 'crystal', 'modest', '50/50', 'Evolve Psyduck at Lv 33.'),

  breed(56, 'Mankey', 'jolly', '50/50', 2, 'Route 9 in Crystal (Kanto). Primeape → Annihilape in Gen 9.'),
  evo(57, 'Primeape', 'crystal', 'jolly', '50/50', 'Evolve Mankey at Lv 28.'),

  breed(58, 'Growlithe', 'adamant', '75M', 2, 'Route 35-37 in Crystal. Hisuian form in PLA.'),
  evo(59, 'Arcanine', 'crystal', 'adamant', '75M', 'Evolve Growlithe with Fire Stone.'),

  breed(60, 'Poliwag', 'modest', '50/50', 2, 'Various fishing in Crystal.'),
  evo(61, 'Poliwhirl', 'crystal', 'modest', '50/50', 'Evolve Poliwag at Lv 25. Also evolves into Politoed.'),
  evo(62, 'Poliwrath', 'crystal', 'adamant', '50/50', 'Evolve Poliwhirl with Water Stone.'),

  breed(63, 'Abra', 'timid', '75M', 2, 'Route 34, Goldenrod Game Corner in Crystal. HA Magic Guard.'),
  evo(64, 'Kadabra', 'crystal', 'timid', '75M', 'Evolve Abra at Lv 16. Trade evo for Alakazam.'),
  evo(65, 'Alakazam', 'crystal', 'timid', '75M', 'Trade evolve Kadabra. Mega in Gen 6.'),

  breed(66, 'Machop', 'adamant', '75M', 2, 'Mt. Mortar in Crystal.',
    [{ game: 'crystal', loc: 'goldenrod-city', moves: ['flamethrower'], desc: 'Machop with Flamethrower — Crystal move tutor legacy move (lost access Gen 9)', nature: 'adamant' }]),
  evo(67, 'Machoke', 'crystal', 'adamant', '75M', 'Evolve Machop at Lv 28. Trade evo for Machamp.'),
  evo(68, 'Machamp', 'crystal', 'adamant', '75M', 'Trade evolve Machoke. Gmax in SwSh.'),

  breed(69, 'Bellsprout', 'adamant', '50/50', 2, 'Routes 31, 44 in Crystal.'),
  evo(70, 'Weepinbell', 'crystal', 'adamant', '50/50', 'Evolve Bellsprout at Lv 21.'),
  evo(71, 'Victreebel', 'crystal', 'adamant', '50/50', 'Evolve Weepinbell with Leaf Stone.'),

  breed(72, 'Tentacool', 'bold', '50/50', 2, 'Surf routes in Crystal, very common.'),
  evo(73, 'Tentacruel', 'crystal', 'bold', '50/50', 'Evolve Tentacool at Lv 30.'),

  breed(74, 'Geodude', 'adamant', '50/50', 2, 'Multiple caves in Crystal. Alolan form in SM/USUM.'),
  evo(75, 'Graveler', 'crystal', 'adamant', '50/50', 'Evolve Geodude at Lv 25. Trade evo for Golem.'),
  evo(76, 'Golem', 'crystal', 'adamant', '50/50', 'Trade evolve Graveler.'),

  breed(77, 'Ponyta', 'jolly', '50/50', 2, 'Route 26-27 in Crystal (Kanto). Galarian form in SwSh.'),
  evo(78, 'Rapidash', 'crystal', 'jolly', '50/50', 'Evolve Ponyta at Lv 40.'),

  breed(79, 'Slowpoke', 'bold', '50/50', 2, 'Slowpoke Well in Crystal. HA Regenerator.'),
  evo(80, 'Slowbro', 'crystal', 'bold', '50/50', 'Evolve Slowpoke at Lv 37. Mega in ORAS.'),

  breed(81, 'Magnemite', 'modest', '--', 2, 'Routes 38-39 in Crystal. Genderless, breeds with Ditto.'),
  evo(82, 'Magneton', 'crystal', 'modest', '--', 'Evolve Magnemite at Lv 30.'),

  breed(83, 'Farfetch\'d', 'jolly', '50/50', 2, 'Routes 38-39 in Crystal. Galarian form → Sirfetch\'d.'),
  breed(84, 'Doduo', 'jolly', '50/50', 2, 'Route 34 in Crystal.'),
  evo(85, 'Dodrio', 'crystal', 'jolly', '50/50', 'Evolve Doduo at Lv 31.'),

  breed(86, 'Seel', 'calm', '50/50', 2, 'Whirl Islands in Crystal.'),
  evo(87, 'Dewgong', 'crystal', 'calm', '50/50', 'Evolve Seel at Lv 34.'),

  breed(88, 'Grimer', 'adamant', '50/50', 2, 'Route 16-17 in Crystal (Kanto). Alolan form in SM/USUM.'),
  evo(89, 'Muk', 'crystal', 'adamant', '50/50', 'Evolve Grimer at Lv 38.'),

  breed(90, 'Shellder', 'jolly', '50/50', 2, 'Fishing in Crystal (Olivine City). Shell Smash + Skill Link.'),
  evo(91, 'Cloyster', 'crystal', 'jolly', '50/50', 'Evolve Shellder with Water Stone.'),

  breed(92, 'Gastly', 'timid', '50/50', 2, 'Sprout Tower, Route 32 in Crystal (night). Moon Ball thematic.'),
  evo(93, 'Haunter', 'crystal', 'timid', '50/50', 'Evolve Gastly at Lv 25. Trade evo for Gengar.'),
  evo(94, 'Gengar', 'crystal', 'timid', '50/50', 'Trade evolve Haunter. Mega + Gmax in later gens.'),

  breed(95, 'Onix', 'impish', '50/50', 2, 'Union Cave, Mt. Mortar in Crystal. → Steelix (Metal Coat trade).'),

  breed(96, 'Drowzee', 'calm', '50/50', 2, 'Route 34-35 in Crystal.'),
  evo(97, 'Hypno', 'crystal', 'calm', '50/50', 'Evolve Drowzee at Lv 26.'),

  breed(98, 'Krabby', 'adamant', '50/50', 2, 'Various fishing in Crystal. Gmax Kingler in SwSh.'),
  evo(99, 'Kingler', 'crystal', 'adamant', '50/50', 'Evolve Krabby at Lv 28.'),

  breed(100, 'Voltorb', 'timid', '--', 2, 'Route 43 in Crystal. Genderless, breeds with Ditto. Hisuian form in PLA.'),
  evo(101, 'Electrode', 'crystal', 'timid', '--', 'Evolve Voltorb at Lv 30.'),

  breed(102, 'Exeggcute', 'modest', '50/50', 2, 'Headbutt trees in Crystal. VC → Alola = GB mark Alolan Exeggutor.'),
  evo(103, 'Exeggutor', 'crystal', 'modest', '50/50', 'Evolve with Leaf Stone. Alolan form (Grass/Dragon).'),

  breed(104, 'Cubone', 'adamant', '50/50', 2, 'Rock Tunnel in Crystal (Kanto). VC → Alola night = GB mark Alolan Marowak.',
    [{ game: 'crystal', loc: 'goldenrod-city', moves: ['flamethrower'], desc: 'Cubone with Flamethrower — Crystal move tutor legacy move (lost access Gen 9)', nature: 'adamant' }]),
  evo(105, 'Marowak', 'crystal', 'adamant', '50/50', 'Evolve Cubone at Lv 28. Alolan form (Fire/Ghost).'),

  // Hitmonlee / Hitmonchan — breed Tyrogue in Crystal, evolve based on Atk/Def
  breed(106, 'Hitmonlee', 'adamant', 'M', 1, 'Breed Tyrogue/Hitmonlee with Ditto. Evolve Tyrogue with Atk > Def at Lv 20. HA Unburden.'),
  breed(107, 'Hitmonchan', 'adamant', 'M', 1, 'Breed Tyrogue/Hitmonchan with Ditto. Evolve Tyrogue with Atk < Def at Lv 20. HA Inner Focus.'),

  breed(108, 'Lickitung', 'brave', '50/50', 2, 'Route 44 in Crystal. → Lickilicky.',
    [{ game: 'crystal', loc: 'goldenrod-city', moves: ['flamethrower'], desc: 'Lickitung with Flamethrower — Crystal move tutor legacy move (lost access Gen 9)', nature: 'brave' }]),

  breed(109, 'Koffing', 'bold', '50/50', 2, 'Burned Tower in Crystal. Galarian Weezing in SwSh.'),
  evo(110, 'Weezing', 'crystal', 'bold', '50/50', 'Evolve Koffing at Lv 35. Galarian form (Poison/Fairy).'),

  breed(111, 'Rhyhorn', 'adamant', '50/50', 2, 'Victory Road in Crystal (Kanto). → Rhyperior.'),
  evo(112, 'Rhydon', 'crystal', 'adamant', '50/50', 'Evolve Rhyhorn at Lv 42.'),

  breed(113, 'Chansey', 'bold', 'F', 2, 'Route 13-15 in Crystal (Kanto, rare). HA Healer. → Blissey.'),
  breed(114, 'Tangela', 'bold', '50/50', 2, 'Route 44 in Crystal. HA Regenerator. → Tangrowth.'),
  breed(115, 'Kangaskhan', 'jolly', 'F', 1, 'Breed with Ditto (female-only species). HA Inner Focus. Mega in Gen 6.'),

  breed(116, 'Horsea', 'modest', '50/50', 2, 'Whirl Islands fishing in Crystal. → Kingdra (Dragon Scale trade).'),
  evo(117, 'Seadra', 'crystal', 'modest', '50/50', 'Evolve Horsea at Lv 32.'),

  breed(118, 'Goldeen', 'adamant', '50/50', 2, 'Fishing everywhere in Crystal. HA Lightning Rod.'),
  evo(119, 'Seaking', 'crystal', 'adamant', '50/50', 'Evolve Goldeen at Lv 33.'),

  breed(120, 'Staryu', 'timid', '--', 2, 'Fishing in Crystal (Kanto). Genderless, breeds with Ditto.'),
  evo(121, 'Starmie', 'crystal', 'timid', '--', 'Evolve Staryu with Water Stone.'),

  breed(122, 'Mr. Mime', 'timid', '50/50', 2, 'Breed Mr. Mime with Ditto in Crystal. Galarian form → Mr. Rime.'),
  breed(123, 'Scyther', 'adamant', '50/50', 2, 'Bug-Catching Contest in Crystal. → Scizor (Metal Coat) or Kleavor (PLA).'),
  breed(124, 'Jynx', 'timid', 'F', 1, 'Breed Jynx with Ditto in Crystal (Ice Path Jynx available). HA Dry Skin.'),

  breed(125, 'Electabuzz', 'jolly', '75M', 2, 'Route 10 in Crystal (Kanto). HA Vital Spirit. → Electivire.'),
  breed(126, 'Magmar', 'modest', '75M', 2, 'Burned Tower in Crystal. HA Vital Spirit. → Magmortar.'),
  breed(127, 'Pinsir', 'jolly', '50/50', 2, 'Bug-Catching Contest in Crystal. Mega in Gen 6.'),
  breed(128, 'Tauros', 'jolly', 'M', 2, 'Route 38-39 in Crystal. HA Sheer Force. Paldean forms in SV.'),

  breed(129, 'Magikarp', 'adamant', '50/50', 2, 'Fishing everywhere. Old Rod.'),
  // Gyarados — Lake of Rage guaranteed shiny is the prestige specimen
  s(130, 'Gyarados', 'crystal', 'lake-of-rage', 'static', 'adamant', '50/50', 'mandatory', 1,
    'Lake of Rage guaranteed shiny (fixed DVs, always male). The iconic GB-origin shiny specimen.'),

  breed(131, 'Lapras', 'modest', '50/50', 1, 'Breed in Crystal. Union Cave B2F (Fridays) or trade from Gen 1 Silph Co. gift. HA Hydration.'),

  // Ditto — must catch directly (can't breed Ditto with Ditto)
  s(132, 'Ditto', 'crystal', 'route-34', 'wild', 'jolly', '--', 'mandatory', 1,
    'Route 34/35 in Crystal. Shiny Ditto is THE breeding anchor — 1/64 shiny offspring with any compatible partner. Catch priority #1.'),

  breed(133, 'Eevee', 'timid', '87.5M', 1, 'Bill\'s Eevee gift in GSC (Goldenrod) → breed with Ditto. HA Anticipation. Male for shiny.'),
  evo(134, 'Vaporeon', 'crystal', 'calm', '87.5M', 'Evolve Eevee with Water Stone.'),
  evo(135, 'Jolteon', 'crystal', 'timid', '87.5M', 'Evolve Eevee with Thunder Stone.'),
  evo(136, 'Flareon', 'crystal', 'adamant', '87.5M', 'Evolve Eevee with Fire Stone.'),

  breed(137, 'Porygon', 'modest', '--', 1, 'Celadon Game Corner in Crystal (Kanto). Genderless, breeds with Ditto. HA Analytic.',
    [{ game: 'red', loc: 'celadon-city', moves: ['tri-attack'], desc: 'Porygon with Tri Attack (TM49) — Gen 1 exclusive TM', nature: 'modest' }]),

  // Fossils — NOT in GSC, must trade from Gen 1, then breed in Crystal
  breed(138, 'Omanyte', 'modest', '87.5M', 1, 'Trade from Gen 1 (Helix Fossil revival) → breed in Crystal. Male for shiny.'),
  evo(139, 'Omastar', 'crystal', 'modest', '87.5M', 'Evolve Omanyte at Lv 40.'),
  breed(140, 'Kabuto', 'adamant', '87.5M', 1, 'Trade from Gen 1 (Dome Fossil revival) → breed in Crystal. Male for shiny.'),
  evo(141, 'Kabutops', 'crystal', 'adamant', '87.5M', 'Evolve Kabuto at Lv 40.'),
  breed(142, 'Aerodactyl', 'jolly', '87.5M', 1, 'Trade from Gen 1 (Old Amber) or GSC in-game trade (Chansey→Aerodactyl) → breed. HA Unnerve. Mega in Gen 6.'),

  breed(143, 'Snorlax', 'adamant', '87.5M', 1, 'Route 11 Snorlax in Crystal (Poke Flute) → breed. HA Gluttony. Male for shiny. Gmax in SwSh.'),

  // === LEGENDARY BIRDS — NOT in GSC, catch in Yellow (best single Gen 1 game) ===
  s(144, 'Articuno', 'yellow', 'seafoam-islands', 'static', 'timid', '--', 'mandatory', 1,
    'Seafoam Islands. Not in GSC — must catch in Gen 1. HA Snow Cloak. Galarian form in SwSh.'),
  s(145, 'Zapdos', 'yellow', 'power-plant', 'static', 'timid', '--', 'mandatory', 1,
    'Power Plant. Not in GSC — must catch in Gen 1. HA Static. Galarian form in SwSh.'),
  s(146, 'Moltres', 'yellow', 'victory-road', 'static', 'timid', '--', 'mandatory', 1,
    'Victory Road 2F. Not in GSC — must catch in Gen 1. HA Flame Body. Galarian form in SwSh.'),

  breed(147, 'Dratini', 'adamant', '50/50', 2, 'Dragon\'s Den, Game Corner in Crystal. HA Marvel Scale.'),
  evo(148, 'Dragonair', 'crystal', 'adamant', '50/50', 'Evolve Dratini at Lv 30.'),
  evo(149, 'Dragonite', 'crystal', 'adamant', '50/50', 'Evolve Dragonair at Lv 55. HA Multiscale.'),

  // Mewtwo — NOT in GSC (Cerulean Cave collapsed), catch in Yellow
  s(150, 'Mewtwo', 'yellow', 'cerulean-cave', 'static', 'timid', '--', 'mandatory', 1,
    'Cerulean Cave. Not in GSC — must catch in Gen 1. HA Unnerve. Mega X + Y in Gen 6.'),

  // Mew — event only, prestige
  s(151, 'Mew', 'red', null, 'gift', 'timid', '--', 'prestige', 1,
    'OT:GF event Mew only — glitch Mew does NOT pass Poke Transporter. 5 guaranteed 31 IVs on transfer.'),
];

// ─── Gen 2 species (152-251) ────────────────────────────────────────

const GEN2_SPECIES = [
  // === JOHTO STARTERS — Crystal breeding ===
  breed(152, 'Chikorita', 'calm', '87.5M', 1, 'Crystal starter → breed with shiny Ditto. HA Leaf Guard. Male for shiny.'),
  evo(153, 'Bayleef', 'crystal', 'calm', '87.5M', 'Evolve Chikorita at Lv 16.'),
  evo(154, 'Meganium', 'crystal', 'calm', '87.5M', 'Evolve Bayleef at Lv 32.'),
  breed(155, 'Cyndaquil', 'timid', '87.5M', 1, 'Crystal starter → breed with shiny Ditto. HA Flash Fire. Male for shiny.'),
  evo(156, 'Quilava', 'crystal', 'timid', '87.5M', 'Evolve Cyndaquil at Lv 14.'),
  evo(157, 'Typhlosion', 'crystal', 'timid', '87.5M', 'Evolve Quilava at Lv 36. Hisuian form in PLA.'),
  breed(158, 'Totodile', 'adamant', '87.5M', 1, 'Crystal starter → breed with shiny Ditto. HA Sheer Force. Male for shiny.'),
  evo(159, 'Croconaw', 'crystal', 'adamant', '87.5M', 'Evolve Totodile at Lv 18.'),
  evo(160, 'Feraligatr', 'crystal', 'adamant', '87.5M', 'Evolve Croconaw at Lv 30.'),

  // === EARLY JOHTO ===
  breed(161, 'Sentret', 'jolly', '50/50', 2, 'Routes 29, 1 in Crystal.'),
  evo(162, 'Furret', 'crystal', 'jolly', '50/50', 'Evolve Sentret at Lv 15.'),
  breed(163, 'Hoothoot', 'calm', '50/50', 2, 'Routes 29-30 (night) in Crystal.'),
  evo(164, 'Noctowl', 'crystal', 'calm', '50/50', 'Evolve Hoothoot at Lv 20. HA Tinted Lens.'),
  breed(165, 'Ledyba', 'jolly', '50/50', 2, 'Routes 2, 30-31 (morning) in Crystal.'),
  evo(166, 'Ledian', 'crystal', 'jolly', '50/50', 'Evolve Ledyba at Lv 18.'),
  breed(167, 'Spinarak', 'adamant', '50/50', 2, 'Routes 2, 30-31 (night) in Crystal.'),
  evo(168, 'Ariados', 'crystal', 'adamant', '50/50', 'Evolve Spinarak at Lv 22.'),
  evo(169, 'Crobat', 'crystal', 'jolly', '50/50', 'Evolve Golbat via friendship.'),

  breed(170, 'Chinchou', 'modest', '50/50', 2, 'New Bark Town fishing in Crystal.'),
  evo(171, 'Lanturn', 'crystal', 'modest', '50/50', 'Evolve Chinchou at Lv 27.'),

  // Baby Pokemon — Crystal Odd Egg (elevated shiny rate) or breed evolved form
  breed(172, 'Pichu', 'timid', '50/50', 2, 'Breed Pikachu/Raichu. Crystal Odd Egg (~14% shiny rate overall).'),
  breed(173, 'Cleffa', 'bold', '75F', 2, 'Breed Clefairy/Clefable. Crystal Odd Egg.'),
  breed(174, 'Igglybuff', 'bold', '75F', 2, 'Breed Jigglypuff/Wigglytuff. Crystal Odd Egg.'),

  breed(175, 'Togepi', 'timid', '87.5M', 1, 'Mystery Egg from Elm\'s assistant or breed. HA Super Luck. Male for shiny.'),
  evo(176, 'Togetic', 'crystal', 'timid', '87.5M', 'Evolve Togepi via friendship. → Togekiss (Shiny Stone).'),

  breed(177, 'Natu', 'timid', '50/50', 2, 'Ruins of Alph exterior in Crystal. HA Magic Bounce.'),
  evo(178, 'Xatu', 'crystal', 'timid', '50/50', 'Evolve Natu at Lv 25.'),

  breed(179, 'Mareep', 'modest', '50/50', 2, 'Routes 32, 42-43 in Crystal. Mega Ampharos in Gen 6.'),
  evo(180, 'Flaaffy', 'crystal', 'modest', '50/50', 'Evolve Mareep at Lv 15.'),
  evo(181, 'Ampharos', 'crystal', 'modest', '50/50', 'Evolve Flaaffy at Lv 30.'),

  evo(182, 'Bellossom', 'crystal', 'modest', '50/50', 'Evolve Gloom with Sun Stone.'),

  breed(183, 'Marill', 'adamant', '50/50', 2, 'Mt. Mortar, Route 42 in Crystal. Huge Power.'),
  evo(184, 'Azumarill', 'crystal', 'adamant', '50/50', 'Evolve Marill at Lv 18.'),

  // Sudowoodo — one per save, but breedable after caught
  breed(185, 'Sudowoodo', 'adamant', '50/50', 1, 'Route 36 static (Squirtbottle) → breed with Ditto. HA Rattled.'),

  evo(186, 'Politoed', 'crystal', 'bold', '50/50', 'Evolve Poliwhirl via King\'s Rock trade. HA Drizzle.'),

  breed(187, 'Hoppip', 'jolly', '50/50', 2, 'Routes 32-33 in Crystal (morning/day).'),
  evo(188, 'Skiploom', 'crystal', 'jolly', '50/50', 'Evolve Hoppip at Lv 18.'),
  evo(189, 'Jumpluff', 'crystal', 'jolly', '50/50', 'Evolve Skiploom at Lv 27.'),

  breed(190, 'Aipom', 'jolly', '50/50', 2, 'Headbutt trees in Crystal. → Ambipom.'),
  breed(191, 'Sunkern', 'modest', '50/50', 2, 'Route 24 (Kanto), National Park in Crystal.'),
  evo(192, 'Sunflora', 'crystal', 'modest', '50/50', 'Evolve Sunkern with Sun Stone.'),
  breed(193, 'Yanma', 'modest', '50/50', 2, 'Route 35 in Crystal (rare). → Yanmega (AncientPower).'),

  breed(194, 'Wooper', 'relaxed', '50/50', 2, 'Route 32 (night), Union Cave in Crystal. Paldean form in SV.'),
  evo(195, 'Quagsire', 'crystal', 'relaxed', '50/50', 'Evolve Wooper at Lv 20. HA Unaware.'),

  evo(196, 'Espeon', 'crystal', 'timid', '87.5M', 'Evolve Eevee via friendship (daytime).'),
  evo(197, 'Umbreon', 'crystal', 'calm', '87.5M', 'Evolve Eevee via friendship (nighttime).'),

  breed(198, 'Murkrow', 'adamant', '50/50', 2, 'Route 7 (night, Kanto) in Crystal. → Honchkrow.'),
  evo(199, 'Slowking', 'crystal', 'bold', '50/50', 'Evolve Slowpoke via King\'s Rock trade. Galarian form in SwSh.'),

  breed(200, 'Misdreavus', 'timid', '50/50', 2, 'Mt. Silver cave (night) in Crystal. → Mismagius.'),

  // Unown — CANNOT breed (Undiscovered group), must catch directly
  s(201, 'Unown', 'crystal', 'ruins-of-alph', 'wild', 'modest', '--', 'mandatory', 2,
    'Ruins of Alph. Cannot breed. 28 forms. Only I and V forms can be shiny in Gen 2.'),

  breed(202, 'Wobbuffet', 'bold', '50/50', 2, 'Dark Cave (after Surf) in Crystal. HA Telepathy.'),
  breed(203, 'Girafarig', 'timid', '50/50', 2, 'Route 43 in Crystal. → Farigiraf in SV.'),
  breed(204, 'Pineco', 'relaxed', '50/50', 2, 'Headbutt trees (Ilex Forest) in Crystal.'),
  evo(205, 'Forretress', 'crystal', 'relaxed', '50/50', 'Evolve Pineco at Lv 31.'),

  breed(206, 'Dunsparce', 'adamant', '50/50', 2, 'Dark Cave in Crystal. → Dudunsparce in SV.'),
  breed(207, 'Gligar', 'jolly', '50/50', 2, 'Route 45 in Crystal. → Gliscor (Razor Fang).'),
  evo(208, 'Steelix', 'crystal', 'impish', '50/50', 'Evolve Onix via Metal Coat trade.'),

  breed(209, 'Snubbull', 'adamant', '75F', 2, 'Route 38 in Crystal (morning/day).'),
  evo(210, 'Granbull', 'crystal', 'adamant', '75F', 'Evolve Snubbull at Lv 23.'),

  breed(211, 'Qwilfish', 'adamant', '50/50', 2, 'Route 32 fishing in Crystal. Hisuian form in PLA.'),
  evo(212, 'Scizor', 'crystal', 'adamant', '50/50', 'Evolve Scyther via Metal Coat trade. Mega in Gen 6.'),
  breed(213, 'Shuckle', 'bold', '50/50', 2, 'Gift from Kirk in Cianwood City → breed. HA Contrary.'),
  breed(214, 'Heracross', 'adamant', '50/50', 2, 'Headbutt trees in Crystal. Mega in Gen 6.'),
  breed(215, 'Sneasel', 'jolly', '50/50', 2, 'Route 28, Mt. Silver in Crystal. → Weavile. Hisuian form in PLA.'),

  breed(216, 'Teddiursa', 'adamant', '50/50', 2, 'Route 45, Mt. Silver in Crystal. → Ursaluna in PLA.'),
  evo(217, 'Ursaring', 'crystal', 'adamant', '50/50', 'Evolve Teddiursa at Lv 30.'),

  breed(218, 'Slugma', 'bold', '50/50', 2, 'Route 16-17 (Kanto) in Crystal.'),
  evo(219, 'Magcargo', 'crystal', 'bold', '50/50', 'Evolve Slugma at Lv 38.'),

  breed(220, 'Swinub', 'adamant', '50/50', 2, 'Ice Path in Crystal. → Mamoswine (AncientPower).'),
  evo(221, 'Piloswine', 'crystal', 'adamant', '50/50', 'Evolve Swinub at Lv 33.'),

  breed(222, 'Corsola', 'bold', '75F', 2, 'Cianwood City fishing in Crystal. Galarian form in SwSh.'),
  breed(223, 'Remoraid', 'modest', '50/50', 2, 'Route 44 fishing in Crystal.'),
  evo(224, 'Octillery', 'crystal', 'modest', '50/50', 'Evolve Remoraid at Lv 25.'),

  breed(225, 'Delibird', 'jolly', '50/50', 2, 'Ice Path in Crystal.'),
  breed(226, 'Mantine', 'calm', '50/50', 2, 'Route 41 Surf in Crystal.'),
  breed(227, 'Skarmory', 'impish', '50/50', 2, 'Route 45 in Crystal.'),

  breed(228, 'Houndour', 'timid', '50/50', 2, 'Route 7 (night, Kanto) in Crystal. Mega in Gen 6.'),
  evo(229, 'Houndoom', 'crystal', 'timid', '50/50', 'Evolve Houndour at Lv 24.'),

  evo(230, 'Kingdra', 'crystal', 'modest', '50/50', 'Evolve Seadra via Dragon Scale trade.'),
  breed(231, 'Phanpy', 'adamant', '50/50', 2, 'Route 45 in Crystal.'),
  evo(232, 'Donphan', 'crystal', 'adamant', '50/50', 'Evolve Phanpy at Lv 25.'),
  evo(233, 'Porygon2', 'crystal', 'bold', '--', 'Evolve Porygon via Up-Grade trade. Eviolite tank.'),

  breed(234, 'Stantler', 'jolly', '50/50', 2, 'Route 36-37 in Crystal. → Wyrdeer in PLA.'),
  breed(235, 'Smeargle', 'jolly', '50/50', 2, 'Ruins of Alph exterior in Crystal. Sketch copies any move.'),

  breed(236, 'Tyrogue', 'adamant', 'M', 2, 'Breed Hitmonlee/Hitmonchan/Hitmontop with Ditto. Crystal Odd Egg.'),
  evo(237, 'Hitmontop', 'crystal', 'adamant', 'M', 'Evolve Tyrogue at Lv 20 with Atk = Def.'),

  breed(238, 'Smoochum', 'timid', 'F', 2, 'Breed Jynx with Ditto. Crystal Odd Egg (~2% shiny).'),
  breed(239, 'Elekid', 'jolly', '75M', 2, 'Breed Electabuzz with Ditto. Crystal Odd Egg (~2% shiny).'),
  breed(240, 'Magby', 'modest', '75M', 2, 'Breed Magmar with Ditto. Crystal Odd Egg (~2% shiny).'),

  breed(241, 'Miltank', 'impish', 'F', 2, 'Route 38-39 in Crystal.'),
  evo(242, 'Blissey', 'crystal', 'bold', 'F', 'Evolve Chansey via friendship.'),

  // === LEGENDARY BEASTS — Cannot breed, static encounters ===
  s(243, 'Raikou', 'crystal', null, 'static', 'timid', '--', 'mandatory', 1,
    'Roaming Johto (Gold/Silver) or Tin Tower event (Crystal). Cannot breed. HA Inner Focus.'),
  s(244, 'Entei', 'crystal', null, 'static', 'adamant', '--', 'mandatory', 1,
    'Roaming Johto. Cannot breed. HA Inner Focus.'),
  s(245, 'Suicune', 'crystal', null, 'static', 'bold', '--', 'mandatory', 1,
    'Crystal: static encounter at Tin Tower after storyline. Cannot breed. HA Inner Focus.'),

  breed(246, 'Larvitar', 'adamant', '50/50', 2, 'Mt. Silver (rare) in Crystal. Mega Tyranitar in Gen 6.'),
  evo(247, 'Pupitar', 'crystal', 'adamant', '50/50', 'Evolve Larvitar at Lv 30.'),
  evo(248, 'Tyranitar', 'crystal', 'adamant', '50/50', 'Evolve Pupitar at Lv 55.'),

  // === BOX LEGENDARIES — Cannot breed ===
  s(249, 'Lugia', 'silver', 'whirl-islands', 'static', 'bold', '--', 'mandatory', 1,
    'Whirl Islands. Silver Lv 40 (story), Gold Lv 70 (post-game). Cannot breed. HA Multiscale.'),
  s(250, 'Ho-Oh', 'gold', 'tin-tower', 'static', 'adamant', '--', 'mandatory', 1,
    'Tin Tower. Gold Lv 40 (story), Silver Lv 70 (post-game). Cannot breed. HA Regenerator.'),

  // === CELEBI — Crystal exclusive event ===
  s(251, 'Celebi', 'crystal', 'ilex-forest', 'static', 'timid', '--', 'mandatory', 1,
    'GS Ball event, Ilex Forest shrine. Crystal VC exclusive. Can be shiny (1/8192). 5 guaranteed 31 IVs on transfer. The crown jewel.'),
];

const ALL_SPECIES = [...GEN1_SPECIES, ...GEN2_SPECIES];

// ─── Target generation ──────────────────────────────────────────────

function makeTarget(sp) {
  const constraints = {};

  // Shiny for non-evolve species (evolves inherit shiny from base)
  if (sp.how !== 'evolve' && sp.id !== 151) {
    constraints.shiny = true;
  }

  // Gender constraint for shiny 87.5M species
  if (sp.gender === '87.5M' && constraints.shiny) {
    constraints.gender = 'male';
  }

  constraints.nature = sp.nature;

  return {
    species_id: sp.id,
    source_game: sp.game,
    category: sp.cat,
    target_type: 'origin',
    constraints,
    description: buildTargetDesc(sp),
    priority: sp.pri,
    notes: sp.notes
  };
}

function buildTargetDesc(sp) {
  const shinyStr = (sp.how !== 'evolve' && sp.id !== 151) ? 'Shiny ' : '';
  const genderStr = (sp.gender === '87.5M' && shinyStr) ? '♂ ' :
                    (sp.gender === 'F' && shinyStr) ? '♀ ' :
                    (sp.gender === 'M' && shinyStr) ? '♂ ' : '';

  const gameNames = { red: 'Red', blue: 'Blue', yellow: 'Yellow', gold: 'Gold', silver: 'Silver', crystal: 'Crystal' };
  const gameName = gameNames[sp.game] || sp.game;

  if (sp.how === 'breed') return `${shinyStr}${genderStr}${sp.name} — GB origin via Crystal breeding (1/64 with shiny Ditto)`;
  if (sp.how === 'evolve') return `${sp.name} — ${gameName} evolution, GB origin`;
  if (sp.how === 'static') return `${shinyStr}${genderStr}${sp.name} — ${gameName} static encounter, GB origin`;
  if (sp.how === 'wild') return `${shinyStr}${sp.name} — ${gameName} wild encounter, GB origin`;
  if (sp.how === 'gift') return `${shinyStr}${genderStr}${sp.name} — ${gameName} gift, GB origin`;
  if (sp.how === 'egg') return `${shinyStr}${sp.name} — Crystal Odd Egg / breeding, GB origin`;
  return `${shinyStr}${genderStr}${sp.name} — ${gameName}, GB origin`;
}

// ─── Task generation ────────────────────────────────────────────────

function makeTasks(sp) {
  const targetRef = { species_id: sp.id, target_type: 'origin', source_game: sp.game };
  const tasks = [];
  let order = 1;

  const natureIdx = NATURE_MOD[sp.nature];
  const natureCap = sp.nature.charAt(0).toUpperCase() + sp.nature.slice(1);

  if (sp.how === 'evolve') {
    tasks.push({ game: sp.game, location_key: null, task_type: 'catch',
      description: `Evolve into ${sp.name} from pre-evolution`, task_order: order++, required: 1 });
  } else if (sp.how === 'breed') {
    tasks.push({ game: 'crystal', location_key: 'goldenrod-city', task_type: 'breed',
      description: `Breed shiny ${sp.name} at Day Care (Route 34) with shiny Ditto — 1/64 odds`,
      task_order: order++, required: 1 });
  } else if (sp.how === 'egg') {
    tasks.push({ game: 'crystal', location_key: 'goldenrod-city', task_type: 'breed',
      description: `Breed/hatch ${sp.name} — Crystal Odd Egg or breed parent with Ditto`,
      task_order: order++, required: 1 });
  } else if (sp.how === 'gift') {
    tasks.push({ game: sp.game, location_key: sp.loc, task_type: 'catch',
      description: `Obtain ${sp.name} — gift`, task_order: order++, required: 1 });
  } else if (sp.how === 'static') {
    const desc = sp.id === 130
      ? `Catch ${sp.name} at Lake of Rage — guaranteed shiny, fixed DVs`
      : `Shiny hunt ${sp.name} — static encounter (save before, reset for shiny DVs)`;
    tasks.push({ game: sp.game, location_key: sp.loc, task_type: 'catch',
      description: desc, task_order: order++, required: 1 });
  } else {
    tasks.push({ game: sp.game, location_key: sp.loc, task_type: 'catch',
      description: `Catch ${sp.name} — wild encounter`, task_order: order++, required: 1 });
  }

  // Nature grind (skip for evolutions — they inherit from base)
  if (sp.how !== 'evolve') {
    tasks.push({ game: sp.game, location_key: null, task_type: 'nature_grind',
      description: `Grind EXP to ${natureCap} nature (EXP mod 25 = ${natureIdx})`,
      task_order: order++, required: 1 });
  }

  // Transfer
  tasks.push({ game: sp.game, location_key: null, task_type: 'transfer',
    description: 'Transfer via Poke Transporter → Pokemon Bank', task_order: order++, required: 1 });

  return { target_ref: targetRef, tasks };
}

// ─── TM Move targets ────────────────────────────────────────────────

function makeTmTarget(sp, tm) {
  const constraints = {};
  if (tm.nature) constraints.nature = tm.nature;
  if (tm.moves) constraints.moves = tm.moves;
  if (sp.id === 137) constraints.shiny = true;

  return {
    species_id: sp.id, source_game: tm.game, category: 'mandatory',
    target_type: 'tm_move', constraints,
    description: tm.desc, priority: 2, notes: null
  };
}

function makeTmTasks(sp, tm) {
  const targetRef = { species_id: sp.id, target_type: 'tm_move', source_game: tm.game };
  const nat = tm.nature || sp.nature;
  const natureIdx = NATURE_MOD[nat];
  const natureCap = nat.charAt(0).toUpperCase() + nat.slice(1);

  return { target_ref: targetRef, tasks: [
    { game: tm.game, location_key: tm.loc, task_type: 'catch',
      description: `Obtain ${sp.name} and teach exclusive move(s)`, task_order: 1, required: 1 },
    { game: tm.game, location_key: null, task_type: 'nature_grind',
      description: `Grind EXP to ${natureCap} nature (EXP mod 25 = ${natureIdx})`, task_order: 2, required: 1 },
    { game: tm.game, location_key: null, task_type: 'transfer',
      description: 'Transfer via Poke Transporter → Pokemon Bank', task_order: 3, required: 1 }
  ]};
}

// ─── Generate all data ──────────────────────────────────────────────

const targets = [];
const taskGroups = [];

for (const sp of ALL_SPECIES) {
  targets.push(makeTarget(sp));
  taskGroups.push(makeTasks(sp));
  if (sp.tmMoves) {
    for (const tm of sp.tmMoves) {
      targets.push(makeTmTarget(sp, tm));
      taskGroups.push(makeTmTasks(sp, tm));
    }
  }
}

// ─── Verify coverage ────────────────────────────────────────────────
const speciesIds = new Set(ALL_SPECIES.map(sp => sp.id));
const missing = [];
for (let i = 1; i <= 251; i++) {
  if (!speciesIds.has(i)) missing.push(i);
}

// ─── Write output ───────────────────────────────────────────────────
writeFileSync(join(dataDir, 'specimen-targets-gameboy.json'), JSON.stringify(targets, null, 2) + '\n');
writeFileSync(join(dataDir, 'specimen-tasks-gameboy.json'), JSON.stringify(taskGroups, null, 2) + '\n');

const origins = targets.filter(t => t.target_type === 'origin');
const byGame = {};
origins.forEach(t => { byGame[t.source_game] = (byGame[t.source_game]||0)+1; });

console.log(`Generated ${targets.length} targets (${origins.length} origin + ${targets.length - origins.length} TM move)`);
console.log(`Generated ${taskGroups.reduce((s,g) => s + g.tasks.length, 0)} total tasks`);
console.log(`Species: ${speciesIds.size}/251${missing.length ? ' MISSING: ' + missing.join(',') : ' ✓'}`);
console.log(`By game: ${Object.entries(byGame).sort((a,b) => b[1]-a[1]).map(([g,c]) => g+':'+c).join(', ')}`);
