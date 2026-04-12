/**
 * Gen 3 Map Lookup — (mapGroup, mapNumber) → location key
 *
 * Map constants from pret/pokeemerald and pret/pokefirered.
 * Interior maps resolve to their parent city/town/route/dungeon.
 * Separate tables for RSE (Hoenn) and FRLG (Kanto + Sevii Islands).
 */

// ---------------------------------------------------------------------------
// RSE (Ruby/Sapphire/Emerald) — Hoenn region
// Source: pret/pokeemerald include/constants/map_groups.h
// ---------------------------------------------------------------------------
const RSE_MAPS: Record<string, string> = {
  // Group 0: Petalburg City area
  '0:0': 'petalburg-city', '0:1': 'petalburg-city', '0:2': 'petalburg-city',
  '0:3': 'petalburg-city', '0:4': 'petalburg-city', '0:5': 'petalburg-city',
  '0:6': 'petalburg-city', '0:7': 'petalburg-city', '0:8': 'petalburg-city',
  '0:9': 'petalburg-city',
  // Group 1: Slateport City area
  '1:0': 'slateport-city', '1:1': 'slateport-city', '1:2': 'slateport-city',
  '1:3': 'slateport-city', '1:4': 'slateport-city', '1:5': 'slateport-city',
  '1:6': 'slateport-city', '1:7': 'slateport-city', '1:8': 'slateport-city',
  '1:9': 'slateport-city', '1:10': 'slateport-city', '1:11': 'slateport-city',
  // Group 2: Mauville City area
  '2:0': 'mauville-city', '2:1': 'mauville-city', '2:2': 'mauville-city',
  '2:3': 'mauville-city', '2:4': 'mauville-city', '2:5': 'mauville-city',
  '2:6': 'mauville-city', '2:7': 'mauville-city', '2:8': 'mauville-city',
  '2:9': 'mauville-city',
  // Group 3: Rustboro City area
  '3:0': 'rustboro-city', '3:1': 'rustboro-city', '3:2': 'rustboro-city',
  '3:3': 'rustboro-city', '3:4': 'rustboro-city', '3:5': 'rustboro-city',
  '3:6': 'rustboro-city', '3:7': 'rustboro-city', '3:8': 'rustboro-city',
  '3:9': 'rustboro-city', '3:10': 'rustboro-city', '3:11': 'rustboro-city',
  // Group 4: Fortree City area
  '4:0': 'fortree-city', '4:1': 'fortree-city', '4:2': 'fortree-city',
  '4:3': 'fortree-city', '4:4': 'fortree-city', '4:5': 'fortree-city',
  // Group 5: Lilycove City area
  '5:0': 'lilycove-city', '5:1': 'lilycove-city', '5:2': 'lilycove-city',
  '5:3': 'lilycove-city', '5:4': 'lilycove-city', '5:5': 'lilycove-city',
  '5:6': 'lilycove-city', '5:7': 'lilycove-city', '5:8': 'lilycove-city',
  '5:9': 'lilycove-city', '5:10': 'lilycove-city', '5:11': 'lilycove-city',
  '5:12': 'lilycove-city',
  // Group 6: Mossdeep City area
  '6:0': 'mossdeep-city', '6:1': 'mossdeep-city', '6:2': 'mossdeep-city',
  '6:3': 'mossdeep-city', '6:4': 'mossdeep-city', '6:5': 'mossdeep-city',
  '6:6': 'mossdeep-city', '6:7': 'mossdeep-city',
  // Group 7: Sootopolis City area
  '7:0': 'sootopolis-city', '7:1': 'sootopolis-city', '7:2': 'sootopolis-city',
  '7:3': 'sootopolis-city', '7:4': 'sootopolis-city', '7:5': 'sootopolis-city',
  // Group 8: Ever Grande City area
  '8:0': 'ever-grande-city', '8:1': 'ever-grande-city', '8:2': 'ever-grande-city',
  '8:3': 'ever-grande-city', '8:4': 'ever-grande-city', '8:5': 'ever-grande-city',
  '8:6': 'ever-grande-city', '8:7': 'ever-grande-city',
  // Group 9: Littleroot Town
  '9:0': 'littleroot-town', '9:1': 'littleroot-town', '9:2': 'littleroot-town',
  '9:3': 'littleroot-town', '9:4': 'littleroot-town',
  // Group 10: Oldale Town
  '10:0': 'oldale-town', '10:1': 'oldale-town', '10:2': 'oldale-town',
  '10:3': 'oldale-town',
  // Group 11: Dewford Town
  '11:0': 'dewford-town', '11:1': 'dewford-town', '11:2': 'dewford-town',
  '11:3': 'dewford-town', '11:4': 'dewford-town',
  // Group 12: Lavaridge Town
  '12:0': 'lavaridge-town', '12:1': 'lavaridge-town', '12:2': 'lavaridge-town',
  '12:3': 'lavaridge-town', '12:4': 'lavaridge-town', '12:5': 'lavaridge-town',
  // Group 13: Fallarbor Town
  '13:0': 'fallarbor-town', '13:1': 'fallarbor-town', '13:2': 'fallarbor-town',
  '13:3': 'fallarbor-town', '13:4': 'fallarbor-town',
  // Group 14: Verdanturf Town
  '14:0': 'verdanturf-town', '14:1': 'verdanturf-town', '14:2': 'verdanturf-town',
  '14:3': 'verdanturf-town', '14:4': 'verdanturf-town',
  // Group 15: Pacifidlog Town
  '15:0': 'pacifidlog-town', '15:1': 'pacifidlog-town', '15:2': 'pacifidlog-town',
  '15:3': 'pacifidlog-town',
  // Group 16: Battle Frontier (Emerald)
  '16:0': 'battle-frontier', '16:1': 'battle-frontier', '16:2': 'battle-frontier',
  '16:3': 'battle-frontier', '16:4': 'battle-frontier', '16:5': 'battle-frontier',
  '16:6': 'battle-frontier', '16:7': 'battle-frontier', '16:8': 'battle-frontier',
  '16:9': 'battle-frontier', '16:10': 'battle-frontier', '16:11': 'battle-frontier',
  '16:12': 'battle-frontier', '16:13': 'battle-frontier', '16:14': 'battle-frontier',
  '16:15': 'battle-frontier',
  // Group 17–24: Routes
  '17:0': 'route-101', '17:1': 'route-102', '17:2': 'route-103',
  '18:0': 'route-104', '18:1': 'route-105', '18:2': 'route-106',
  '19:0': 'route-107', '19:1': 'route-108', '19:2': 'route-109',
  '20:0': 'route-110', '20:1': 'route-111', '20:2': 'route-112',
  '21:0': 'route-113', '21:1': 'route-114', '21:2': 'route-115',
  '22:0': 'route-116', '22:1': 'route-117', '22:2': 'route-118',
  '23:0': 'route-119', '23:1': 'route-120', '23:2': 'route-121',
  '24:0': 'route-122', '24:1': 'route-123', '24:2': 'route-124',
  // Group 25: More routes
  '25:0': 'route-125', '25:1': 'route-126', '25:2': 'route-127', '25:3': 'route-128',
  '25:4': 'route-129', '25:5': 'route-130', '25:6': 'route-131', '25:7': 'route-132',
  '25:8': 'route-133', '25:9': 'route-134',
  // Group 26: Underwater routes
  '26:0': 'route-124', '26:1': 'route-126', '26:2': 'route-127', '26:3': 'route-128',
  '26:4': 'sootopolis-city', '26:5': 'route-105', '26:6': 'route-125',
  '26:7': 'route-129', '26:8': 'route-131',
  // Group 27: Route interiors / gates
  '27:0': 'route-104', '27:1': 'route-104', // Flower Shop, Mr. Briney
  '27:2': 'route-109', // Seashore House
  '27:3': 'route-110', '27:4': 'route-110', '27:5': 'route-110', // Trick House, Cycling Road
  '27:6': 'route-111', '27:7': 'route-111', // Desert Rest Stop, Old Lady
  '27:8': 'route-112', '27:9': 'route-112', // Cable Car
  '27:10': 'route-113', // Glass Workshop
  '27:11': 'route-114', // Fossil Maniac
  '27:12': 'route-116', // Rusturf Tunnel guide
  '27:13': 'route-117', // Day Care
  '27:14': 'route-121', // Safari Zone entrance
  '27:15': 'route-123', // Berry Master
  '27:16': 'route-119', // Weather Institute
  '27:17': 'route-119', // Weather Institute 2F
  // Group 28: Dungeons
  '28:0': 'granite-cave', '28:1': 'granite-cave', '28:2': 'granite-cave',
  '28:3': 'granite-cave', // Steven's room
  '28:4': 'mt-chimney',
  '28:5': 'jagged-pass',
  '28:6': 'fiery-path',
  '28:7': 'meteor-falls', '28:8': 'meteor-falls', '28:9': 'meteor-falls',
  '28:10': 'meteor-falls',
  '28:11': 'rusturf-tunnel',
  '28:12': 'scorched-slab',
  '28:13': 'petalburg-woods',
  '28:14': 'mt-pyre', '28:15': 'mt-pyre', '28:16': 'mt-pyre',
  '28:17': 'mt-pyre', '28:18': 'mt-pyre', '28:19': 'mt-pyre',
  '28:20': 'mt-pyre',
  '28:21': 'seafloor-cavern', '28:22': 'seafloor-cavern', '28:23': 'seafloor-cavern',
  '28:24': 'seafloor-cavern', '28:25': 'seafloor-cavern', '28:26': 'seafloor-cavern',
  '28:27': 'seafloor-cavern', '28:28': 'seafloor-cavern', '28:29': 'seafloor-cavern',
  '28:30': 'cave-of-origin', '28:31': 'cave-of-origin', '28:32': 'cave-of-origin',
  '28:33': 'cave-of-origin', '28:34': 'cave-of-origin',
  '28:35': 'victory-road', '28:36': 'victory-road',
  '28:37': 'shoal-cave', '28:38': 'shoal-cave', '28:39': 'shoal-cave',
  '28:40': 'shoal-cave', '28:41': 'shoal-cave', '28:42': 'shoal-cave',
  '28:43': 'shoal-cave', '28:44': 'shoal-cave',
  '28:45': 'new-mauville', '28:46': 'new-mauville',
  '28:47': 'abandoned-ship', '28:48': 'abandoned-ship', '28:49': 'abandoned-ship',
  '28:50': 'abandoned-ship', '28:51': 'abandoned-ship', '28:52': 'abandoned-ship',
  '28:53': 'abandoned-ship', '28:54': 'abandoned-ship', '28:55': 'abandoned-ship',
  '28:56': 'sky-pillar', '28:57': 'sky-pillar', '28:58': 'sky-pillar',
  '28:59': 'sky-pillar', '28:60': 'sky-pillar',
  '28:61': 'safari-zone',
  // Group 29: Special areas
  '29:0': 'safari-zone', '29:1': 'safari-zone', '29:2': 'safari-zone',
  '29:3': 'safari-zone',
  '29:4': 'battle-tower',
  '29:5': 'southern-island',
  // Group 30-33: Overworld / exterior towns + routes
  '30:0': 'petalburg-city',
  '30:1': 'slateport-city',
  '30:2': 'mauville-city',
  '30:3': 'rustboro-city',
  '30:4': 'fortree-city',
  '30:5': 'lilycove-city',
  '30:6': 'mossdeep-city',
  '30:7': 'sootopolis-city',
  '30:8': 'ever-grande-city',
  '30:9': 'littleroot-town',
  '30:10': 'oldale-town',
  '30:11': 'dewford-town',
  '30:12': 'lavaridge-town',
  '30:13': 'fallarbor-town',
  '30:14': 'verdanturf-town',
  '30:15': 'pacifidlog-town',
  '30:16': 'battle-frontier',
  '31:0': 'route-101', '31:1': 'route-102', '31:2': 'route-103',
  '31:3': 'route-104', '31:4': 'route-104',
  '32:0': 'route-105', '32:1': 'route-106', '32:2': 'route-107',
  '32:3': 'route-108', '32:4': 'route-109',
  '32:5': 'route-110', '32:6': 'route-110',
  '32:7': 'route-111', '32:8': 'route-112',
  '33:0': 'route-113', '33:1': 'route-114', '33:2': 'route-115',
  '33:3': 'route-116', '33:4': 'route-117', '33:5': 'route-118',
  '33:6': 'route-119', '33:7': 'route-120', '33:8': 'route-121',
  '33:9': 'route-122', '33:10': 'route-123',
  '33:11': 'route-124', '33:12': 'route-125', '33:13': 'route-126',
  '33:14': 'route-127', '33:15': 'route-128', '33:16': 'route-129',
  '33:17': 'route-130', '33:18': 'route-131', '33:19': 'route-132',
  '33:20': 'route-133', '33:21': 'route-134',
};

// ---------------------------------------------------------------------------
// FRLG (FireRed/LeafGreen) — Kanto + Sevii Islands
// Source: pret/pokefirered include/constants/map_groups.h
// ---------------------------------------------------------------------------
const FRLG_MAPS: Record<string, string> = {
  // Group 0: Pallet Town / Oak's Lab
  '0:0': 'pallet-town', '0:1': 'pallet-town', '0:2': 'pallet-town',
  '0:3': 'pallet-town', '0:4': 'pallet-town',
  // Group 1: Viridian City
  '1:0': 'viridian-city', '1:1': 'viridian-city', '1:2': 'viridian-city',
  '1:3': 'viridian-city', '1:4': 'viridian-city', '1:5': 'viridian-city',
  '1:6': 'viridian-city', '1:7': 'viridian-city', '1:8': 'viridian-city',
  // Group 2: Pewter City
  '2:0': 'pewter-city', '2:1': 'pewter-city', '2:2': 'pewter-city',
  '2:3': 'pewter-city', '2:4': 'pewter-city', '2:5': 'pewter-city',
  '2:6': 'pewter-city',
  // Group 3: Cerulean City
  '3:0': 'cerulean-city', '3:1': 'cerulean-city', '3:2': 'cerulean-city',
  '3:3': 'cerulean-city', '3:4': 'cerulean-city', '3:5': 'cerulean-city',
  '3:6': 'cerulean-city', '3:7': 'cerulean-city', '3:8': 'cerulean-city',
  '3:9': 'cerulean-city',
  // Group 4: Lavender Town
  '4:0': 'lavender-town', '4:1': 'lavender-town', '4:2': 'lavender-town',
  '4:3': 'lavender-town', '4:4': 'lavender-town', '4:5': 'lavender-town',
  '4:6': 'pokemon-tower', '4:7': 'pokemon-tower', '4:8': 'pokemon-tower',
  '4:9': 'pokemon-tower', '4:10': 'pokemon-tower', '4:11': 'pokemon-tower',
  '4:12': 'pokemon-tower',
  // Group 5: Vermilion City
  '5:0': 'vermilion-city', '5:1': 'vermilion-city', '5:2': 'vermilion-city',
  '5:3': 'vermilion-city', '5:4': 'vermilion-city', '5:5': 'vermilion-city',
  '5:6': 'vermilion-city', '5:7': 'vermilion-city', '5:8': 'vermilion-city',
  '5:9': 'vermilion-city',
  // Group 6: Celadon City
  '6:0': 'celadon-city', '6:1': 'celadon-city', '6:2': 'celadon-city',
  '6:3': 'celadon-city', '6:4': 'celadon-city', '6:5': 'celadon-city',
  '6:6': 'celadon-city', '6:7': 'celadon-city', '6:8': 'celadon-city',
  '6:9': 'celadon-city', '6:10': 'celadon-city', '6:11': 'celadon-city',
  '6:12': 'celadon-city', '6:13': 'celadon-city',
  // Group 7: Fuchsia City
  '7:0': 'fuchsia-city', '7:1': 'fuchsia-city', '7:2': 'fuchsia-city',
  '7:3': 'fuchsia-city', '7:4': 'fuchsia-city', '7:5': 'fuchsia-city',
  '7:6': 'fuchsia-city', '7:7': 'fuchsia-city',
  '7:8': 'safari-zone', '7:9': 'safari-zone', '7:10': 'safari-zone',
  '7:11': 'safari-zone',
  // Group 8: Cinnabar Island
  '8:0': 'cinnabar-island', '8:1': 'cinnabar-island', '8:2': 'cinnabar-island',
  '8:3': 'cinnabar-island', '8:4': 'pokemon-mansion', '8:5': 'pokemon-mansion',
  '8:6': 'pokemon-mansion', '8:7': 'pokemon-mansion',
  // Group 9: Indigo Plateau
  '9:0': 'indigo-plateau', '9:1': 'indigo-plateau', '9:2': 'indigo-plateau',
  '9:3': 'indigo-plateau', '9:4': 'indigo-plateau', '9:5': 'indigo-plateau',
  '9:6': 'indigo-plateau',
  // Group 10: Saffron City
  '10:0': 'saffron-city', '10:1': 'saffron-city', '10:2': 'saffron-city',
  '10:3': 'saffron-city', '10:4': 'saffron-city', '10:5': 'saffron-city',
  '10:6': 'saffron-city', '10:7': 'saffron-city', '10:8': 'saffron-city',
  '10:9': 'saffron-city', '10:10': 'silph-co',
  '10:11': 'silph-co', '10:12': 'silph-co', '10:13': 'silph-co',
  '10:14': 'silph-co', '10:15': 'silph-co', '10:16': 'silph-co',
  '10:17': 'silph-co', '10:18': 'silph-co', '10:19': 'silph-co',
  '10:20': 'silph-co',
  // Group 11: Sevii Islands — One Island
  '11:0': 'one-island', '11:1': 'one-island', '11:2': 'one-island',
  '11:3': 'one-island', '11:4': 'kindle-road', '11:5': 'mt-ember',
  '11:6': 'mt-ember', '11:7': 'mt-ember', '11:8': 'mt-ember',
  // Group 12: Sevii Islands — Two Island
  '12:0': 'two-island', '12:1': 'two-island', '12:2': 'two-island',
  '12:3': 'cape-brink',
  // Group 13: Sevii Islands — Three Island
  '13:0': 'three-island', '13:1': 'three-island', '13:2': 'three-island',
  '13:3': 'bond-bridge', '13:4': 'berry-forest',
  // Group 14: Sevii Islands — Four Island
  '14:0': 'four-island', '14:1': 'four-island', '14:2': 'four-island',
  '14:3': 'icefall-cave', '14:4': 'icefall-cave', '14:5': 'icefall-cave',
  // Group 15: Sevii Islands — Five Island
  '15:0': 'five-island', '15:1': 'five-island', '15:2': 'five-island',
  '15:3': 'five-island', '15:4': 'lost-cave',
  '15:5': 'lost-cave', '15:6': 'lost-cave', '15:7': 'lost-cave',
  // Group 16: Sevii Islands — Six Island
  '16:0': 'six-island', '16:1': 'six-island', '16:2': 'six-island',
  '16:3': 'dotted-hole', '16:4': 'dotted-hole',
  '16:5': 'altering-cave', '16:6': 'pattern-bush',
  // Group 17: Sevii Islands — Seven Island
  '17:0': 'seven-island', '17:1': 'seven-island', '17:2': 'seven-island',
  '17:3': 'tanoby-ruins', '17:4': 'tanoby-ruins',
  '17:5': 'tanoby-chambers',
  // Group 18–21: Dungeons
  '18:0': 'viridian-forest',
  '18:1': 'mt-moon', '18:2': 'mt-moon', '18:3': 'mt-moon',
  '18:4': 'rock-tunnel', '18:5': 'rock-tunnel',
  '18:6': 'digletts-cave',
  '18:7': 'cerulean-cave', '18:8': 'cerulean-cave', '18:9': 'cerulean-cave',
  '18:10': 'victory-road', '18:11': 'victory-road', '18:12': 'victory-road',
  '18:13': 'power-plant',
  '18:14': 'seafoam-islands', '18:15': 'seafoam-islands',
  '18:16': 'seafoam-islands', '18:17': 'seafoam-islands',
  '18:18': 'seafoam-islands',
  // Group 19: Routes
  '19:0': 'route-1', '19:1': 'route-2',
  '19:2': 'route-3', '19:3': 'route-4',
  '19:4': 'route-5', '19:5': 'route-6',
  '19:6': 'route-7', '19:7': 'route-8',
  '19:8': 'route-9', '19:9': 'route-10',
  '19:10': 'route-11', '19:11': 'route-12',
  '19:12': 'route-13', '19:13': 'route-14',
  '19:14': 'route-15', '19:15': 'route-16',
  '19:16': 'route-17', '19:17': 'route-18',
  '19:18': 'route-19', '19:19': 'route-20',
  '19:20': 'route-21', '19:21': 'route-22',
  '19:22': 'route-23', '19:23': 'route-24',
  '19:24': 'route-25',
  // Group 20: Overworld towns
  '20:0': 'pallet-town',
  '20:1': 'viridian-city',
  '20:2': 'pewter-city',
  '20:3': 'cerulean-city',
  '20:4': 'lavender-town',
  '20:5': 'vermilion-city',
  '20:6': 'celadon-city',
  '20:7': 'fuchsia-city',
  '20:8': 'cinnabar-island',
  '20:9': 'indigo-plateau',
  '20:10': 'saffron-city',
  // Group 21: Route interiors
  '21:0': 'route-2', '21:1': 'route-2', // gate
  '21:2': 'route-4', // tunnel
  '21:3': 'route-5', '21:4': 'route-5', // gate, underground
  '21:5': 'route-6', '21:6': 'route-6', // gate, underground
  '21:7': 'route-7', '21:8': 'route-7', // gate, underground
  '21:9': 'route-8', '21:10': 'route-8', // gate, underground
  '21:11': 'route-10', // Pokemon Center
  '21:12': 'route-11', '21:13': 'route-11', // gate, lookout
  '21:14': 'route-12', // gate
  '21:15': 'route-15', // gate
  '21:16': 'route-16', '21:17': 'route-16', // gate, lookout
  '21:18': 'route-18', // gate
  '21:19': 'route-22', // gate
  '21:20': 'route-25', // Bill's house
  // Group 22: SS Anne
  '22:0': 'vermilion-city', '22:1': 'vermilion-city', '22:2': 'vermilion-city',
  '22:3': 'vermilion-city', '22:4': 'vermilion-city',
};

// ---------------------------------------------------------------------------
// Lookup function
// ---------------------------------------------------------------------------

export function gen3MapToLocationKey(
  mapGroup: number,
  mapNumber: number,
  game: string,
): string {
  const lc = game.toLowerCase();
  const isFrlg = lc.includes('firered') || lc.includes('leafgreen');
  const table = isFrlg ? FRLG_MAPS : RSE_MAPS;
  return table[`${mapGroup}:${mapNumber}`] ?? 'unknown';
}
