/**
 * Met Location ID → location-key lookup tables for Gen 4–7 saves.
 *
 * Each generation encodes a u16 "met location" ID in Pokemon data structures.
 * These tables map those IDs to slug-style location keys (e.g. "twinleaf-town").
 */

// ---------------------------------------------------------------------------
// Gen 4 — Diamond/Pearl/Platinum (Sinnoh)
// ---------------------------------------------------------------------------
const GEN4_SINNOH_LOCATIONS: Record<number, string> = {
  0: 'unknown',
  1: 'mystery-zone',
  2: 'twinleaf-town',
  3: 'sandgem-town',
  4: 'floaroma-town',
  5: 'solaceon-town',
  6: 'pastoria-city',
  7: 'celestic-town',
  8: 'pal-park',
  9: 'canalave-city',
  10: 'snowpoint-city',
  11: 'sunyshore-city',
  12: 'pokemon-league',
  13: 'fight-area',
  14: 'survival-area',
  15: 'resort-area',
  16: 'jubilife-city',
  17: 'oreburgh-city',
  18: 'eterna-city',
  19: 'hearthome-city',
  20: 'veilstone-city',
  21: 'pastoria-city',
  22: 'celestic-town',
  23: 'route-201',
  24: 'route-202',
  25: 'route-203',
  26: 'route-204',
  27: 'route-205',
  28: 'route-206',
  29: 'route-207',
  30: 'route-208',
  31: 'route-209',
  32: 'route-210',
  33: 'route-211',
  34: 'route-212',
  35: 'route-213',
  36: 'route-214',
  37: 'route-215',
  38: 'route-216',
  39: 'route-217',
  40: 'route-218',
  41: 'route-219',
  42: 'route-220',
  43: 'route-221',
  44: 'route-222',
  45: 'route-223',
  46: 'route-224',
  47: 'route-225',
  48: 'route-226',
  49: 'route-227',
  50: 'route-228',
  51: 'route-229',
  52: 'route-230',
  53: 'oreburgh-mine',
  54: 'valley-windworks',
  55: 'eterna-forest',
  56: 'fuego-ironworks',
  57: 'mt-coronet',
  58: 'great-marsh',
  59: 'solaceon-ruins',
  60: 'victory-road',
  61: 'ravaged-path',
  62: 'oreburgh-gate',
  63: 'stark-mountain',
  64: 'spring-path',
  65: 'turnback-cave',
  66: 'snowpoint-temple',
  67: 'wayward-cave',
  68: 'iron-island',
  69: 'old-chateau',
  70: 'lake-verity',
  71: 'lake-valor',
  72: 'lake-acuity',
  73: 'galactic-hq',
  74: 'verity-lakefront',
  75: 'valor-lakefront',
  76: 'acuity-lakefront',
  77: 'spear-pillar',
  78: 'distortion-world',
  79: 'fullmoon-island',
  80: 'newmoon-island',
  81: 'flower-paradise',
  82: 'hall-of-origin',
};

// ---------------------------------------------------------------------------
// Gen 4 — HeartGold/SoulSilver (Johto + Kanto)
// IDs 126+ in the Gen 4 met-location encoding
// ---------------------------------------------------------------------------
const GEN4_HGSS_LOCATIONS: Record<number, string> = {
  126: 'new-bark-town',
  127: 'cherrygrove-city',
  128: 'violet-city',
  129: 'azalea-town',
  130: 'goldenrod-city',
  131: 'ecruteak-city',
  132: 'olivine-city',
  133: 'cianwood-city',
  134: 'mahogany-town',
  135: 'blackthorn-city',
  136: 'pallet-town',
  137: 'viridian-city',
  138: 'pewter-city',
  139: 'cerulean-city',
  140: 'lavender-town',
  141: 'vermilion-city',
  142: 'celadon-city',
  143: 'fuchsia-city',
  144: 'cinnabar-island',
  145: 'indigo-plateau',
  146: 'saffron-city',
  147: 'safari-zone-gate',
  148: 'route-29',
  149: 'route-30',
  150: 'route-31',
  151: 'route-32',
  152: 'route-33',
  153: 'route-34',
  154: 'route-35',
  155: 'route-36',
  156: 'route-37',
  157: 'route-38',
  158: 'route-39',
  159: 'route-40',
  160: 'route-41',
  161: 'route-42',
  162: 'route-43',
  163: 'route-44',
  164: 'route-45',
  165: 'route-46',
  166: 'route-26',
  167: 'route-27',
  168: 'route-28',
  169: 'route-1',
  170: 'route-2',
  171: 'route-3',
  172: 'route-4',
  173: 'route-5',
  174: 'route-6',
  175: 'route-7',
  176: 'route-8',
  177: 'route-9',
  178: 'route-10',
  179: 'route-11',
  180: 'route-12',
  181: 'route-13',
  182: 'route-14',
  183: 'route-15',
  184: 'route-16',
  185: 'route-17',
  186: 'route-18',
  187: 'route-19',
  188: 'route-20',
  189: 'route-21',
  190: 'route-22',
  191: 'route-23',
  192: 'route-24',
  193: 'route-25',
  194: 'sprout-tower',
  195: 'ruins-of-alph',
  196: 'union-cave',
  197: 'slowpoke-well',
  198: 'ilex-forest',
  199: 'national-park',
  200: 'burned-tower',
  201: 'tin-tower',
  202: 'whirl-islands',
  203: 'mt-mortar',
  204: 'ice-path',
  205: 'dark-cave',
  206: 'dragons-den',
  207: 'mt-silver',
  208: 'rock-tunnel',
  209: 'safari-zone',
  210: 'tohjo-falls',
  211: 'digletts-cave',
  212: 'mt-moon',
  213: 'viridian-forest',
  214: 'victory-road-kanto',
  215: 'cerulean-cave',
  216: 'power-plant',
  217: 'lake-of-rage',
  218: 's-s-aqua',
  219: 'bell-tower',
};

// ---------------------------------------------------------------------------
// Gen 5 — Black/White (Unova)
// ---------------------------------------------------------------------------
const GEN5_LOCATIONS: Record<number, string> = {
  0: 'unknown',
  1: 'nuvema-town',
  2: 'accumula-town',
  3: 'striaton-city',
  4: 'nacrene-city',
  5: 'castelia-city',
  6: 'nimbasa-city',
  7: 'driftveil-city',
  8: 'mistralton-city',
  9: 'icirrus-city',
  10: 'opelucid-city',
  11: 'route-1',
  12: 'route-2',
  13: 'route-3',
  14: 'route-4',
  15: 'route-5',
  16: 'route-6',
  17: 'route-7',
  18: 'route-8',
  19: 'route-9',
  20: 'route-10',
  21: 'route-11',
  22: 'route-12',
  23: 'route-13',
  24: 'route-14',
  25: 'route-15',
  26: 'route-16',
  27: 'route-17',
  28: 'route-18',
  29: 'dreamyard',
  30: 'pinwheel-forest',
  31: 'desert-resort',
  32: 'relic-castle',
  33: 'cold-storage',
  34: 'chargestone-cave',
  35: 'twist-mountain',
  36: 'dragonspiral-tower',
  37: 'victory-road',
  38: 'giant-chasm',
  39: 'liberty-garden',
  40: 'pokemon-league',
  41: 'n-castle',
  42: 'wellspring-cave',
  43: 'challenger-cave',
  44: 'mistralton-cave',
  45: 'rumination-field',
  46: 'abundant-shrine',
  47: 'undella-town',
  48: 'lacunosa-town',
  49: 'undella-bay',
  50: 'white-forest',
  51: 'black-city',
  52: 'anville-town',
  53: 'village-bridge',
  54: 'marvelous-bridge',
  55: 'tubeline-bridge',
  56: 'skyarrow-bridge',
  57: 'unity-tower',
  58: 'trial-chamber',
  59: 'moor-of-icirrus',
  60: 'p2-laboratory',
  // B2W2 additions
  100: 'aspertia-city',
  101: 'virbank-city',
  102: 'floccesy-town',
  103: 'lentimas-town',
  104: 'humilau-city',
  105: 'route-19-b2w2',
  106: 'route-20-b2w2',
  107: 'route-21-b2w2',
  108: 'route-22-b2w2',
  109: 'route-23-b2w2',
  110: 'castelia-sewers',
  111: 'floccesy-ranch',
  112: 'virbank-complex',
  113: 'reversal-mountain',
  114: 'strange-house',
  115: 'victory-road-b2w2',
  116: 'plasma-frigate',
  117: 'pokestar-studios',
  118: 'join-avenue',
  119: 'marine-tube',
  120: 'clay-tunnel',
  121: 'underground-ruins',
  122: 'seaside-cave',
  123: 'white-treehollow',
  124: 'black-tower',
};

// ---------------------------------------------------------------------------
// Gen 6 — X/Y (Kalos)
// IDs are even-numbered (stride of 2)
// ---------------------------------------------------------------------------
const GEN6_KALOS_LOCATIONS: Record<number, string> = {
  0: 'unknown',
  2: 'lumiose-city',
  4: 'vaniville-town',
  6: 'aquacorde-town',
  8: 'santalune-city',
  10: 'cyllage-city',
  12: 'ambrette-town',
  14: 'geosenge-town',
  16: 'shalour-city',
  18: 'coumarine-city',
  20: 'laverre-city',
  22: 'dendemille-town',
  24: 'anistar-city',
  26: 'couriway-town',
  28: 'snowbelle-city',
  30: 'pokemon-league',
  32: 'kiloude-city',
  34: 'route-1',
  36: 'route-2',
  38: 'route-3',
  40: 'route-4',
  42: 'route-5',
  44: 'route-6',
  46: 'route-7',
  48: 'route-8',
  50: 'route-9',
  52: 'route-10',
  54: 'route-11',
  56: 'route-12',
  58: 'route-13',
  60: 'route-14',
  62: 'route-15',
  64: 'route-16',
  66: 'route-17',
  68: 'route-18',
  70: 'route-19',
  72: 'route-20',
  74: 'route-21',
  76: 'route-22',
  78: 'santalune-forest',
  80: 'connecting-cave',
  82: 'reflection-cave',
  84: 'glittering-cave',
  86: 'tower-of-mastery',
  88: 'sea-spirits-den',
  90: 'azure-bay',
  92: 'pokeball-factory',
  94: 'lost-hotel',
  96: 'frost-cavern',
  98: 'terminus-cave',
  100: 'lysandre-labs',
  102: 'team-flare-secret-hq',
  104: 'victory-road',
  106: 'pokemon-village',
  108: 'chamber-of-emptiness',
  110: 'unknown-dungeon',
};

// ---------------------------------------------------------------------------
// Gen 6 — Omega Ruby/Alpha Sapphire (Hoenn)
// IDs 170+ (even-numbered stride of 2)
// ---------------------------------------------------------------------------
const GEN6_ORAS_LOCATIONS: Record<number, string> = {
  170: 'littleroot-town',
  172: 'oldale-town',
  174: 'dewford-town',
  176: 'lavaridge-town',
  178: 'fallarbor-town',
  180: 'verdanturf-town',
  182: 'pacifidlog-town',
  184: 'petalburg-city',
  186: 'slateport-city',
  188: 'mauville-city',
  190: 'rustboro-city',
  192: 'fortree-city',
  194: 'lilycove-city',
  196: 'mossdeep-city',
  198: 'sootopolis-city',
  200: 'ever-grande-city',
  202: 'battle-resort',
  204: 'route-101',
  206: 'route-102',
  208: 'route-103',
  210: 'route-104',
  212: 'route-105',
  214: 'route-106',
  216: 'route-107',
  218: 'route-108',
  220: 'route-109',
  222: 'route-110',
  224: 'route-111',
  226: 'route-112',
  228: 'route-113',
  230: 'route-114',
  232: 'route-115',
  234: 'route-116',
  236: 'route-117',
  238: 'route-118',
  240: 'route-119',
  242: 'route-120',
  244: 'route-121',
  246: 'route-122',
  248: 'route-123',
  250: 'route-124',
  252: 'route-125',
  254: 'route-126',
  256: 'route-127',
  258: 'route-128',
  260: 'route-129',
  262: 'route-130',
  264: 'route-131',
  266: 'route-132',
  268: 'route-133',
  270: 'route-134',
  272: 'meteor-falls',
  274: 'rusturf-tunnel',
  276: 'granite-cave',
  278: 'petalburg-woods',
  280: 'mt-chimney',
  282: 'jagged-pass',
  284: 'fiery-path',
  286: 'mt-pyre',
  288: 'seafloor-cavern',
  290: 'cave-of-origin',
  292: 'sky-pillar',
  294: 'victory-road',
  296: 'shoal-cave',
  298: 'new-mauville',
  300: 'safari-zone',
  302: 'mirage-island',
  304: 'scorched-slab',
  306: 'sealed-chamber',
  308: 'island-cave',
  310: 'desert-ruins',
  312: 'ancient-tomb',
};

// ---------------------------------------------------------------------------
// Gen 7 — Sun/Moon (Alola)
// USUM uses sequential zone IDs (0-379), NOT met-location IDs.
// Source: SciresM's Ultra Sun encounter data, validated against 19 real saves.
// Multiple zones map to the same location (interiors resolve to parent).
// ---------------------------------------------------------------------------

function buildUUSMZoneTable(): Record<number, string> {
  const t: Record<number, string> = {};
  function range(start: number, end: number, loc: string) {
    for (let i = start; i <= end; i++) t[i] = loc;
  }
  // Melemele Island
  range(0, 5, 'route-1'); range(6, 8, 'hau-oli-outskirts'); range(9, 11, 'route-1');
  range(12, 15, 'hau-oli-city'); range(16, 18, 'iki-town');
  range(19, 21, 'mahalo-trail'); // zone 20 = Lunala save ✓
  range(22, 25, 'ruins-of-conflict'); // zone 24 = Tapu Koko ✓
  range(26, 28, 'melemele-meadow'); range(29, 30, 'hau-oli-cemetery');
  range(31, 34, 'ten-carat-hill'); range(35, 38, 'berry-fields');
  range(39, 45, 'verdant-cavern'); range(46, 47, 'route-1');
  range(48, 50, 'route-2'); range(51, 54, 'route-3');
  range(55, 62, 'trainers-school'); range(63, 65, 'route-2');
  range(66, 69, 'hau-oli-city'); // zone 66 = SM Sun/6,7 saves
  range(70, 73, 'big-wave-beach'); range(74, 76, 'sandy-cave');
  t[77] = 'route-1'; // zone 77 = HA starters ✓
  range(78, 79, 'hau-oli-city'); // Marina area
  // Akala Island
  t[80] = 'route-4'; t[81] = 'route-5'; t[82] = 'route-6';
  t[83] = 'route-7'; t[84] = 'route-8'; t[85] = 'route-9';
  range(86, 87, 'brooklet-hill');
  range(88, 89, 'heahea-beach'); // zone 88 = all Totem saves ✓
  range(90, 92, 'heahea-city');
  range(93, 94, 'digletts-tunnel');
  range(95, 97, 'wela-volcano-park'); // zone 96 = Tapu Lele save
  range(98, 101, 'lush-jungle');
  range(102, 103, 'memorial-hill'); range(104, 108, 'akala-outskirts');
  range(109, 112, 'paniola-ranch'); range(113, 115, 'paniola-town');
  range(116, 122, 'royal-avenue');
  range(123, 137, 'heahea-city'); // interiors
  range(138, 142, 'konikoni-city');
  range(143, 146, 'route-7');
  range(147, 151, 'tapu-village'); // zone 149 = Eevee save
  range(152, 155, 'heahea-city');
  range(156, 158, 'heahea-city'); // zone 156-157 = Pikachu saves
  range(159, 160, 'blush-mountain'); range(161, 163, 'secluded-shore');
  // Ula'ula Island
  t[164] = 'route-10'; t[165] = 'route-11'; t[166] = 'route-12';
  t[167] = 'route-13'; t[168] = 'route-14'; t[169] = 'route-15';
  t[170] = 'route-16'; t[171] = 'route-17';
  range(172, 173, 'route-14');
  range(174, 184, 'malie-city'); range(185, 190, 'mount-hokulani');
  range(191, 193, 'ruins-of-abundance'); // zone 191 = Tapu Bulu ✓
  range(194, 196, 'haina-desert');
  range(197, 199, 'lake-of-the-sunne-moone'); // zone 199 = Cosmog ✓
  range(200, 207, 'mount-lanakila'); // zone 207 = Necrozma ✓
  range(208, 219, 'shady-house'); range(220, 222, 'po-town');
  range(223, 233, 'malie-city'); // interiors
  range(234, 240, 'tapu-village'); // zone 236 = Porygon, 240 = Zygarde
  range(241, 247, 'aether-house'); range(248, 250, 'ula-ula-meadow');
  range(251, 257, 'pokemon-league');
  t[258] = 'malie-city'; // zone 258 = Dialga save ✓
  range(259, 263, 'ula-ula-beach');
  // Poni Island
  t[264] = 'poni-wilds';
  range(265, 270, 'ancient-poni-path'); // zone 265 = Type: Null
  range(271, 277, 'poni-breaker-coast');
  range(278, 280, 'ruins-of-hope');
  range(281, 285, 'exeggutor-island');
  range(286, 291, 'vast-poni-canyon'); // zone 286 = Tapu Fini/Zygarde
  range(292, 299, 'seafolk-village'); // zone 292 = Aerodactyl ✓
  range(300, 301, 'poni-meadow'); range(302, 303, 'poni-gauntlet');
  // Aether & Ultra Space
  range(304, 317, 'aether-paradise'); t[337] = 'aether-paradise';
  range(318, 320, 'route-1');
  range(321, 322, 'ultra-megalopolis'); // zone 322 = Poipole ✓
  range(323, 324, 'ultra-deep-sea'); range(325, 326, 'ultra-jungle');
  range(327, 328, 'ultra-desert'); range(329, 330, 'ultra-plant');
  range(331, 332, 'ultra-forest'); range(333, 334, 'ultra-crater');
  range(335, 336, 'ultra-ruin');
  range(338, 379, 'team-rockets-castle'); // Rainbow Rocket episode
  return t;
}

const GEN7_USUM_ZONES = buildUUSMZoneTable();

// ---------------------------------------------------------------------------
// Lookup functions
// ---------------------------------------------------------------------------

/** Resolve a Gen 4 met-location ID to a location key. */
export function gen4LocationName(id: number, game: string): string {
  const g = game.toLowerCase();
  if (g.includes('heartgold') || g.includes('soulsilver') || g.includes('hgss')) {
    // HGSS can reference both Sinnoh locations (e.g. Pal Park) and HGSS-specific ones
    return GEN4_HGSS_LOCATIONS[id] ?? GEN4_SINNOH_LOCATIONS[id] ?? 'unknown';
  }
  // DP/Pt — Sinnoh only
  return GEN4_SINNOH_LOCATIONS[id] ?? 'unknown';
}

/** Resolve a Gen 5 met-location ID to a location key. */
export function gen5LocationName(id: number, _game: string): string {
  // BW and B2W2 share the same ID space
  return GEN5_LOCATIONS[id] ?? 'unknown';
}

/** Resolve a Gen 6 met-location ID to a location key. */
export function gen6LocationName(id: number, game: string): string {
  const g = game.toLowerCase();
  if (g.includes('omega') || g.includes('alpha') || g.includes('oras')) {
    // ORAS can reference both Kalos locations (traded mons) and Hoenn locations
    return GEN6_ORAS_LOCATIONS[id] ?? GEN6_KALOS_LOCATIONS[id] ?? 'unknown';
  }
  // XY — Kalos only
  return GEN6_KALOS_LOCATIONS[id] ?? 'unknown';
}

/**
 * Resolve a Gen 7 zone ID to a location key.
 * SM and USUM use sequential zone IDs (not met-location IDs).
 * The USUM zone table is validated; SM zones are similar but not identical.
 */
export function gen7LocationName(id: number, game: string): string {
  // USUM zone table is validated against real saves.
  // SM zone IDs are similar but may differ for some zones.
  // Use the USUM table for both — it covers the major locations.
  return GEN7_USUM_ZONES[id] ?? 'unknown';
}
