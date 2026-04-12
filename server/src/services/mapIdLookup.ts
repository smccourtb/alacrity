// Gen 1: internal map ID → our location_key
// Only meaningful exterior/area maps — interiors resolve to parent
const GEN1_MAP_IDS: Record<number, string> = {
  0x00: 'pallet-town',
  0x01: 'viridian-city',
  0x02: 'pewter-city',
  0x03: 'cerulean-city',
  0x04: 'lavender-town',
  0x05: 'vermilion-city',
  0x06: 'celadon-city',
  0x07: 'fuchsia-city',
  0x08: 'cinnabar-island',
  0x09: 'indigo-plateau',
  0x0A: 'saffron-city',
  0x0C: 'route-1',
  0x0D: 'route-2',
  0x0E: 'route-3',
  0x0F: 'route-4',
  0x10: 'route-5',
  0x11: 'route-6',
  0x12: 'route-7',
  0x13: 'route-8',
  0x14: 'route-9',
  0x15: 'route-10',
  0x16: 'route-11',
  0x17: 'route-12',
  0x18: 'route-13',
  0x19: 'route-14',
  0x1A: 'route-15',
  0x1B: 'route-16',
  0x1C: 'route-17',
  0x1D: 'route-18',
  0x1E: 'route-19',
  0x1F: 'route-20',
  0x20: 'route-21',
  0x21: 'route-22',
  0x22: 'route-23',
  0x23: 'route-24',
  0x24: 'route-25',
  // Interior maps that resolve to parent locations
  0x33: 'viridian-forest',
  0x3B: 'mt-moon',
  0x3C: 'mt-moon',
  0x3D: 'mt-moon',
  0x44: 'rock-tunnel',
  0x45: 'rock-tunnel',
  0x53: 'pokemon-tower',
  0x5A: 'seafoam-islands',
  0x5B: 'seafoam-islands',
  0x5C: 'seafoam-islands',
  0x5D: 'seafoam-islands',
  0x60: 'pokemon-mansion',
  0x61: 'pokemon-mansion',
  0x62: 'pokemon-mansion',
  0x63: 'pokemon-mansion',
  0x6D: 'safari-zone',
  0x6E: 'safari-zone',
  0x6F: 'safari-zone',
  0x70: 'safari-zone',
  0x71: 'victory-road',
  0x72: 'victory-road',
  0x73: 'victory-road',
  0x87: 'power-plant',
  0xA5: 'digletts-cave',
  0xE8: 'cerulean-cave',
};

// Interior maps → parent city/town (for buildings like gyms, marts, etc.)
const GEN1_INTERIOR_PARENTS: Record<number, string> = {
  0x28: 'viridian-city',
  0x36: 'pewter-city',
  0x41: 'cerulean-city',
  0x4D: 'vermilion-city',
  0x4E: 'celadon-city',
  0x4F: 'celadon-city',
  0x50: 'celadon-city',
  0x51: 'celadon-city',
  0x56: 'saffron-city',
  0x57: 'saffron-city',
  0x58: 'saffron-city',
  0x65: 'fuchsia-city',
  0x66: 'cinnabar-island',
  0x67: 'cinnabar-island',
  0x78: 'vermilion-city',
};

export function gen1MapIdToLocationKey(mapId: number): string {
  return GEN1_MAP_IDS[mapId]
    ?? GEN1_INTERIOR_PARENTS[mapId]
    ?? 'unknown';
}

// Gen 2: (mapGroup, mapNumber) → location_key
// Complete mapping from pret/pokecrystal constants/map_constants.asm
// Interior maps resolve to their parent city/town/route/dungeon
const GEN2_MAP_IDS: Record<string, string> = {
  // Group 0: Special / New Bark interiors
  '0:0': 'new-bark-town', '0:1': 'new-bark-town', '0:2': 'new-bark-town',
  '0:3': 'new-bark-town', '0:4': 'new-bark-town', '0:5': 'new-bark-town',
  // Group 1: Olivine area
  '1:1': 'olivine-city', '1:2': 'olivine-city', '1:3': 'olivine-city',
  '1:4': 'olivine-city', '1:5': 'olivine-city', '1:6': 'olivine-city',
  '1:7': 'olivine-city', '1:8': 'olivine-city', '1:9': 'route-38',
  '1:10': 'route-39', '1:11': 'route-39', '1:12': 'route-38',
  '1:13': 'route-39', '1:14': 'olivine-city',
  // Group 2: Mahogany area
  '2:1': 'mahogany-town', '2:2': 'mahogany-town', '2:3': 'mahogany-town',
  '2:4': 'route-42', '2:5': 'route-42', '2:6': 'route-44', '2:7': 'mahogany-town',
  // Group 3: Dungeons & landmarks
  '3:1': 'sprout-tower', '3:2': 'sprout-tower', '3:3': 'sprout-tower',
  '3:4': 'tin-tower', '3:5': 'tin-tower', '3:6': 'tin-tower', '3:7': 'tin-tower',
  '3:8': 'tin-tower', '3:9': 'tin-tower', '3:10': 'tin-tower', '3:11': 'tin-tower',
  '3:12': 'tin-tower', '3:13': 'burned-tower', '3:14': 'burned-tower',
  '3:15': 'national-park', '3:16': 'national-park',
  '3:17': 'goldenrod-city', '3:18': 'goldenrod-city', '3:19': 'goldenrod-city',
  '3:20': 'goldenrod-city', '3:21': 'goldenrod-city', // Radio Tower
  '3:22': 'ruins-of-alph', '3:23': 'ruins-of-alph', '3:24': 'ruins-of-alph',
  '3:25': 'ruins-of-alph', '3:26': 'ruins-of-alph', '3:27': 'ruins-of-alph',
  '3:28': 'ruins-of-alph', '3:29': 'ruins-of-alph', '3:30': 'ruins-of-alph',
  '3:31': 'ruins-of-alph', '3:32': 'ruins-of-alph', '3:33': 'ruins-of-alph',
  '3:34': 'ruins-of-alph', '3:35': 'ruins-of-alph', '3:36': 'ruins-of-alph',
  '3:37': 'union-cave', '3:38': 'union-cave', '3:39': 'union-cave',
  '3:40': 'slowpoke-well', '3:41': 'slowpoke-well',
  '3:42': 'olivine-city', '3:43': 'olivine-city', '3:44': 'olivine-city', // Lighthouse
  '3:45': 'olivine-city', '3:46': 'olivine-city', '3:47': 'olivine-city',
  '3:48': 'mahogany-town', '3:49': 'mahogany-town', '3:50': 'mahogany-town', // Rocket Base
  '3:51': 'mahogany-town', '3:52': 'ilex-forest',
  '3:53': 'goldenrod-city', '3:54': 'goldenrod-city', '3:55': 'goldenrod-city', // Underground
  '3:56': 'goldenrod-city',
  '3:57': 'mt-mortar', '3:58': 'mt-mortar', '3:59': 'mt-mortar', '3:60': 'mt-mortar',
  '3:61': 'ice-path', '3:62': 'ice-path', '3:63': 'ice-path', '3:64': 'ice-path', '3:65': 'ice-path',
  '3:66': 'whirl-islands', '3:67': 'whirl-islands', '3:68': 'whirl-islands',
  '3:69': 'whirl-islands', '3:70': 'whirl-islands', '3:71': 'whirl-islands',
  '3:72': 'whirl-islands', '3:73': 'whirl-islands',
  '3:74': 'mt-silver', '3:75': 'mt-silver', '3:76': 'mt-silver', '3:77': 'mt-silver',
  '3:78': 'dark-cave', '3:79': 'dark-cave',
  '3:80': 'dragons-den', '3:81': 'dragons-den', '3:82': 'dragons-den',
  '3:83': 'tohjo-falls', '3:84': 'digletts-cave', '3:85': 'mt-moon',
  '3:86': 'underground-path', '3:87': 'rock-tunnel', '3:88': 'rock-tunnel',
  '3:89': 'fuchsia-city', '3:90': 'fuchsia-city', '3:91': 'victory-road',
  // Group 4: Ecruteak area
  '4:1': 'ecruteak-city', '4:2': 'ecruteak-city', '4:3': 'ecruteak-city',
  '4:4': 'ecruteak-city', '4:5': 'ecruteak-city', '4:6': 'ecruteak-city',
  '4:7': 'ecruteak-city', '4:8': 'ecruteak-city', '4:9': 'ecruteak-city',
  // Group 5: Blackthorn area
  '5:1': 'blackthorn-city', '5:2': 'blackthorn-city', '5:3': 'blackthorn-city',
  '5:4': 'blackthorn-city', '5:5': 'blackthorn-city', '5:6': 'blackthorn-city',
  '5:7': 'blackthorn-city', '5:8': 'route-45', '5:9': 'route-46', '5:10': 'blackthorn-city',
  // Group 6: Cinnabar area
  '6:1': 'cinnabar-island', '6:2': 'cinnabar-island', '6:3': 'route-19',
  '6:4': 'cinnabar-island', '6:5': 'route-19', '6:6': 'route-20',
  '6:7': 'route-21', '6:8': 'cinnabar-island',
  // Group 7: Cerulean area
  '7:1': 'cerulean-city', '7:2': 'cerulean-city', '7:3': 'cerulean-city',
  '7:4': 'cerulean-city', '7:5': 'cerulean-city', '7:6': 'cerulean-city',
  '7:7': 'cerulean-city', '7:8': 'route-10', '7:9': 'route-10',
  '7:10': 'power-plant', '7:11': 'cerulean-city', '7:12': 'route-4',
  '7:13': 'route-9', '7:14': 'route-10', '7:15': 'route-24',
  '7:16': 'route-25', '7:17': 'cerulean-city',
  // Group 8: Azalea area
  '8:1': 'azalea-town', '8:2': 'azalea-town', '8:3': 'azalea-town',
  '8:4': 'azalea-town', '8:5': 'azalea-town', '8:6': 'route-33', '8:7': 'azalea-town',
  // Group 9: Lake of Rage area
  '9:1': 'lake-of-rage', '9:2': 'lake-of-rage', '9:3': 'route-43',
  '9:4': 'route-43', '9:5': 'route-43', '9:6': 'lake-of-rage',
  // Group 10: Violet area
  '10:1': 'route-32', '10:2': 'route-35', '10:3': 'route-36', '10:4': 'route-37',
  '10:5': 'violet-city', '10:6': 'violet-city', '10:7': 'violet-city',
  '10:8': 'violet-city', '10:9': 'violet-city', '10:10': 'violet-city',
  '10:11': 'violet-city', '10:12': 'route-32', '10:13': 'route-32',
  '10:14': 'route-35', '10:15': 'route-35', '10:16': 'route-36', '10:17': 'route-36',
  // Group 11: Goldenrod area
  '11:1': 'route-34', '11:2': 'goldenrod-city', '11:3': 'goldenrod-city',
  '11:4': 'goldenrod-city', '11:5': 'goldenrod-city', '11:6': 'goldenrod-city',
  '11:7': 'goldenrod-city', '11:8': 'goldenrod-city', '11:9': 'goldenrod-city',
  '11:10': 'goldenrod-city', '11:11': 'goldenrod-city', '11:12': 'goldenrod-city',
  '11:13': 'goldenrod-city', '11:14': 'goldenrod-city', '11:15': 'goldenrod-city',
  '11:16': 'goldenrod-city', '11:17': 'goldenrod-city', '11:18': 'goldenrod-city',
  '11:19': 'goldenrod-city', '11:20': 'goldenrod-city', '11:21': 'goldenrod-city',
  '11:22': 'ilex-forest', '11:23': 'route-34', '11:24': 'route-34', // Day Care
  // Group 12: Vermilion area
  '12:1': 'route-6', '12:2': 'route-11', '12:3': 'vermilion-city',
  '12:4': 'vermilion-city', '12:5': 'vermilion-city', '12:6': 'vermilion-city',
  '12:7': 'vermilion-city', '12:8': 'vermilion-city', '12:9': 'vermilion-city',
  '12:10': 'vermilion-city', '12:11': 'vermilion-city', '12:12': 'route-6', '12:13': 'route-6',
  // Group 13: Pallet area
  '13:1': 'route-1', '13:2': 'pallet-town', '13:3': 'pallet-town',
  '13:4': 'pallet-town', '13:5': 'pallet-town', '13:6': 'pallet-town',
  // Group 14: Pewter area
  '14:1': 'route-3', '14:2': 'pewter-city', '14:3': 'pewter-city',
  '14:4': 'pewter-city', '14:5': 'pewter-city', '14:6': 'pewter-city',
  '14:7': 'pewter-city', '14:8': 'pewter-city',
  // Group 15: Ports & Fast Ship
  '15:1': 'olivine-city', '15:2': 'vermilion-city', '15:3': 'olivine-city',
  '15:4': 'olivine-city', '15:5': 'olivine-city', '15:6': 'olivine-city',
  '15:7': 'olivine-city', '15:8': 'olivine-city', '15:9': 'vermilion-city',
  '15:10': 'mt-moon', '15:11': 'mt-moon', '15:12': 'tin-tower',
  // Group 16: Indigo Plateau & Elite Four
  '16:1': 'route-23', '16:2': 'indigo-plateau', '16:3': 'indigo-plateau',
  '16:4': 'indigo-plateau', '16:5': 'indigo-plateau', '16:6': 'indigo-plateau',
  '16:7': 'indigo-plateau', '16:8': 'indigo-plateau',
  // Group 17: Fuchsia area
  '17:1': 'route-13', '17:2': 'route-14', '17:3': 'route-15', '17:4': 'route-18',
  '17:5': 'fuchsia-city', '17:6': 'fuchsia-city', '17:7': 'fuchsia-city',
  '17:8': 'fuchsia-city', '17:9': 'fuchsia-city', '17:10': 'fuchsia-city',
  '17:11': 'fuchsia-city', '17:12': 'fuchsia-city', '17:13': 'route-15',
  // Group 18: Lavender area
  '18:1': 'route-8', '18:2': 'route-12', '18:3': 'route-10', '18:4': 'lavender-town',
  '18:5': 'lavender-town', '18:6': 'lavender-town', '18:7': 'lavender-town',
  '18:8': 'lavender-town', '18:9': 'lavender-town', '18:10': 'lavender-town',
  '18:11': 'lavender-town', '18:12': 'lavender-town', '18:13': 'route-8', '18:14': 'route-12',
  // Group 19: Mt. Silver exterior
  '19:1': 'route-28', '19:2': 'mt-silver', '19:3': 'mt-silver', '19:4': 'route-28',
  // Group 20: Pokecenter upstairs (generic)
  '20:1': 'pokecenter', '20:2': 'pokecenter', '20:3': 'pokecenter',
  '20:4': 'pokecenter', '20:5': 'pokecenter', '20:6': 'pokecenter',
  // Group 21: Celadon area
  '21:1': 'route-7', '21:2': 'route-16', '21:3': 'route-17', '21:4': 'celadon-city',
  '21:5': 'celadon-city', '21:6': 'celadon-city', '21:7': 'celadon-city',
  '21:8': 'celadon-city', '21:9': 'celadon-city', '21:10': 'celadon-city',
  '21:11': 'celadon-city', '21:12': 'celadon-city', '21:13': 'celadon-city',
  '21:14': 'celadon-city', '21:15': 'celadon-city', '21:16': 'celadon-city',
  '21:17': 'celadon-city', '21:18': 'celadon-city', '21:19': 'celadon-city',
  '21:20': 'celadon-city', '21:21': 'celadon-city', '21:22': 'celadon-city',
  '21:23': 'route-16', '21:24': 'route-16', '21:25': 'route-7', '21:26': 'route-17',
  // Group 22: Cianwood area
  '22:1': 'route-40', '22:2': 'route-41', '22:3': 'cianwood-city',
  '22:4': 'cianwood-city', '22:5': 'cianwood-city', '22:6': 'cianwood-city',
  '22:7': 'cianwood-city', '22:8': 'cianwood-city', '22:9': 'cianwood-city',
  '22:10': 'cianwood-city', '22:11': 'cianwood-city', '22:12': 'cianwood-city',
  '22:13': 'cianwood-city', '22:14': 'cianwood-city', '22:15': 'route-40',
  '22:16': 'cianwood-city',
  // Group 23: Viridian area
  '23:1': 'route-2', '23:2': 'route-22', '23:3': 'viridian-city',
  '23:4': 'viridian-city', '23:5': 'viridian-city', '23:6': 'viridian-city',
  '23:7': 'viridian-city', '23:8': 'viridian-city', '23:9': 'viridian-city',
  '23:10': 'viridian-city', '23:11': 'route-2', '23:12': 'route-2',
  '23:13': 'victory-road',
  // Group 24: New Bark area
  '24:1': 'route-26', '24:2': 'route-27', '24:3': 'route-29', '24:4': 'new-bark-town',
  '24:5': 'new-bark-town', '24:6': 'new-bark-town', '24:7': 'new-bark-town',
  '24:8': 'new-bark-town', '24:9': 'new-bark-town', '24:10': 'route-26',
  '24:11': 'route-26', '24:12': 'route-27', '24:13': 'route-29',
  // Group 25: Saffron area
  '25:1': 'route-5', '25:2': 'saffron-city', '25:3': 'saffron-city',
  '25:4': 'saffron-city', '25:5': 'saffron-city', '25:6': 'saffron-city',
  '25:7': 'saffron-city', '25:8': 'saffron-city', '25:9': 'saffron-city',
  '25:10': 'saffron-city', '25:11': 'saffron-city', '25:12': 'saffron-city',
  '25:13': 'route-5', '25:14': 'route-5', '25:15': 'route-5',
  // Group 26: Cherrygrove area
  '26:1': 'route-30', '26:2': 'route-31', '26:3': 'cherrygrove-city',
  '26:4': 'cherrygrove-city', '26:5': 'cherrygrove-city', '26:6': 'cherrygrove-city',
  '26:7': 'cherrygrove-city', '26:8': 'cherrygrove-city', '26:9': 'route-30',
  '26:10': 'route-30', '26:11': 'route-31',
};

export function gen2MapIdToLocationKey(mapGroup: number, mapNumber: number): string {
  // Invalid map data (e.g. save-state exports where SRAM map wasn't updated)
  if (mapGroup > 26) return 'unknown';
  return GEN2_MAP_IDS[`${mapGroup}:${mapNumber}`] ?? 'unknown';
}
