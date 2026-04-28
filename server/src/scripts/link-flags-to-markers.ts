/**
 * link-flags-to-markers.ts
 *
 * Post-seed pass that populates `flag_index` on every `location_*` row whose
 * underlying pret data carries an EVENT_* flag. This is the bridge between the
 * save-flag report (which says "bit N is set") and the marker UI (which says
 * "row M is complete"). Without this pass, the UI's per-row checkmarks never
 * resolve and the progress bar reads from raw flag counts instead of meaningful
 * checklist items.
 *
 * Flow:
 *   1. For each pret repo (pokecrystal, pokegold), parse items + trainers via
 *      the shared parsers.
 *   2. Resolve each entry's `event_flag` against the per-game flag JSON
 *      (data/flags/<game>.json) → `flag_index`.
 *   3. Map pret CamelCase map_name → `location_key` via
 *      seeds/data/pret-location-mapping.json plus a small in-file extension
 *      table for interior buildings the existing mapping doesn't cover.
 *   4. UPDATE the matching `location_items` / `location_trainers` /
 *      `location_tms` row, but only when the row's `flag_source` is NULL or
 *      'auto' (never overwrites manual curation).
 *   5. Print a coverage report. With `--strict`, exit non-zero if any
 *      eligible row remains unlinked.
 *
 * Usage:
 *   bun run src/scripts/link-flags-to-markers.ts [--strict]
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseItemsFromPret, type ParsedItem } from './lib/pret-item-parser.js';
import { parseTrainersFromPret, type ParsedTrainer } from './lib/pret-trainer-parser.js';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = join(SCRIPT_DIR, '..', '..', '..');
const DB_PATH = join(REPO_ROOT, 'data', 'pokemon.db');
const FLAGS_DIR = join(SCRIPT_DIR, '..', 'data', 'flags');
const PRET_CACHE_DIR = join(REPO_ROOT, '.data-cache');
const LOCATION_MAP_PATH = join(SCRIPT_DIR, '..', 'seeds', 'data', 'pret-location-mapping.json');

const STRICT = process.argv.includes('--strict');

// ── Pret repo → game(s) it covers ──────────────────────────────────────────
// Pokegold and pokesilver share build sources (same event_flags.asm); pokered
// and pokeblue share too. So one pret pass produces flags for two games.
interface PretSource {
  pretRoot: string;
  repoKey: string;        // matches a top-level key in pret-location-mapping.json
  flagFiles: string[];    // games (file basenames in data/flags/) covered
}

const PRET_SOURCES: PretSource[] = [
  { pretRoot: join(PRET_CACHE_DIR, 'pret-pokecrystal'), repoKey: 'pokecrystal', flagFiles: ['crystal'] },
  { pretRoot: join(PRET_CACHE_DIR, 'pret-pokegold'),    repoKey: 'pokegold',    flagFiles: ['gold', 'silver'] },
  // Gen 1 (red/blue/yellow) uses a different layout; handled in a follow-up
  // (Phase 4 of the flag-linkage plan). Add here when the Gen 1 parser lands.
];

// ── Interior-building extension to pret-location-mapping.json ─────────────
// pret-location-mapping.json focuses on overworld locations. Interior building
// asm files (Elm's lab, Bill's house, Kurt's house, Mr Pokémon's house,
// player's home, Tin Tower interior cells, Olivine Lighthouse floors) carry
// items + trainers that belong to a parent overworld location. Extend the map
// here so the linker can resolve them. Keeping it inline (vs editing the JSON)
// because these are derived associations, not hand-curated overworld pins.
const INTERIOR_EXTENSIONS: Record<string, Record<string, string>> = {
  // pokecrystal — interior buildings whose contents fold into a parent loc
  pokecrystal: {
    ElmsLab: 'new-bark-town',
    ElmsHouse: 'new-bark-town',
    PlayersHouse1F: 'new-bark-town',
    PlayersHouse2F: 'new-bark-town',
    PlayersNeighborsHouse: 'new-bark-town',
    CherrygroveMart: 'cherrygrove-city',
    CherrygrovePokecenter1F: 'cherrygrove-city',
    CherrygroveGymSpeechHouse: 'cherrygrove-city',
    CherrygroveEvolutionSpeechHouse: 'cherrygrove-city',
    GuideGentsHouse: 'cherrygrove-city',
    Route30BerryHouse: 'route-30',
    MrPokemonsHouse: 'route-30',
    KurtsHouse: 'azalea-town',
    AzaleaMart: 'azalea-town',
    AzaleaPokecenter1F: 'azalea-town',
    AzaleaGym: 'azalea-gym',
    CharcoalKiln: 'azalea-town',
    GoldenrodMagnetTrainStation: 'goldenrod-city',
    GoldenrodPokecenter1F: 'goldenrod-city',
    GoldenrodPokecomCenter2FMobile: 'goldenrod-city',
    GoldenrodMart1F: 'goldenrod-city',
    GoldenrodMart2F: 'goldenrod-city',
    GoldenrodMart3F: 'goldenrod-city',
    GoldenrodMart4F: 'goldenrod-city',
    GoldenrodMart5F: 'goldenrod-city',
    GoldenrodMart6F: 'goldenrod-city',
    GoldenrodMartElevator: 'goldenrod-city',
    GoldenrodMartRoof: 'goldenrod-city',
    GoldenrodDeptStore1F: 'goldenrod-city',
    GoldenrodDeptStore2F: 'goldenrod-city',
    GoldenrodDeptStore3F: 'goldenrod-city',
    GoldenrodDeptStore4F: 'goldenrod-city',
    GoldenrodDeptStore5F: 'goldenrod-city',
    GoldenrodDeptStore6F: 'goldenrod-city',
    GoldenrodDeptStoreB1F: 'goldenrod-city',
    GoldenrodDeptStoreElevator: 'goldenrod-city',
    GoldenrodDeptStoreRoof: 'goldenrod-city',
    GoldenrodFlowerShop: 'goldenrod-city',
    GoldenrodPPSpeechHouse: 'goldenrod-city',
    GoldenrodNameRater: 'goldenrod-city',
    GoldenrodHappinessRater: 'goldenrod-city',
    GoldenrodBikeShop: 'goldenrod-city',
    GoldenrodBillsHouse: 'goldenrod-city',
    GlobalTerminal: 'goldenrod-city',
    BillsHouse: 'ecruteak-city',
    EcruteakMart: 'ecruteak-city',
    EcruteakPokecenter1F: 'ecruteak-city',
    EcruteakItemfinderHouse: 'ecruteak-city',
    EcruteakLugiaSpeechHouse: 'ecruteak-city',
    EcruteakTinTowerEntrance: 'ecruteak-city',
    EcruteakShrine: 'ecruteak-city',
    EcruteakHouse: 'ecruteak-city',
    OlivineMart: 'olivine-city',
    OlivinePokecenter1F: 'olivine-city',
    OlivineGoodRodHouse: 'olivine-city',
    OlivineCafe: 'olivine-city',
    OlivineLighthouse1F: 'olivine-lighthouse',
    OlivineLighthouse2F: 'olivine-lighthouse',
    OlivineLighthouse3F: 'olivine-lighthouse',
    OlivineLighthouse4F: 'olivine-lighthouse',
    OlivineLighthouse5F: 'olivine-lighthouse',
    OlivineLighthouse6F: 'olivine-lighthouse',
    OlivineHouseBeta: 'olivine-city',
    OlivineVoltorbHouse: 'olivine-city',
    OlivinePort: 'olivine-city',
    OlivinePortPassage: 'olivine-city',
    BattleTower1F: 'olivine-city',
    BattleTowerHallway: 'olivine-city',
    BattleTowerBattleRoom: 'olivine-city',
    BattleTowerElevator: 'olivine-city',
    BattleTowerOutside: 'olivine-city',
    CianwoodMart: 'cianwood-city',
    CianwoodPokecenter1F: 'cianwood-city',
    CianwoodPharmacy: 'cianwood-city',
    CianwoodCityPhotoStudio: 'cianwood-city',
    CianwoodLugiaSpeechHouse: 'cianwood-city',
    PokeSeersHouse: 'cianwood-city',
    MahoganyMart1F: 'mahogany-town',
    MahoganyRedGyaradosSpeechHouse: 'mahogany-town',
    MahoganyTownGym: 'mahogany-gym',
    Route39Barn: 'route-39',
    Route39Farmhouse: 'route-39',
    BlackthornMart: 'blackthorn-city',
    BlackthornPokecenter1F: 'blackthorn-city',
    BlackthornDodrioTradeHouse: 'blackthorn-city',
    BlackthornEmysHouse: 'blackthorn-city',
    BlackthornDragonSpeechHouse: 'blackthorn-city',
    MoveDeletersHouse: 'blackthorn-city',
    DayCare: 'route-34',
    Route36RuinsOfAlphGate: 'route-36',
    Route36NationalParkGate: 'route-36',
    Route35NationalParkGate: 'route-35',
    Route35Coast: 'route-35',
    LakeOfRageHiddenPowerHouse: 'lake-of-rage',
    LakeOfRageMagikarpHouse: 'lake-of-rage',
    // Fast Ship — all cabins fold into olivine-city since the SS Aqua docks
    // there and the curated seed places these trainers under olivine-city.
    FastShipB1F: 'olivine-city',
    FastShipCabins_NNW_NNE_NE: 'olivine-city',
    FastShipCabins_SE_SSE_CaptainsCabin: 'olivine-city',
    FastShipCabins_SW_SSW_NW: 'olivine-city',
    // Ecruteak interiors with named trainers
    DanceTheater: 'ecruteak-city',
    WiseTriosRoom: 'ecruteak-city',
    // Kanto interior buildings with single items
    CeladonCafe: 'celadon-city',
    CeladonMansionRoofHouse: 'celadon-city',
    CopycatsHouse2F: 'saffron-city',
    MrPsychicsHouse: 'saffron-city',
    PokemonFanClub: 'vermilion-city',
    MountMoonSquare: 'mt-moon',
    Route12SuperRodHouse: 'route-12',
    Route27SandstormHouse: 'route-27',
    Route28SteelWingHouse: 'route-28',
    Route2NuggetHouse: 'route-2',
    Route32Pokecenter1F: 'route-32',
    Route34IlexForestGate: 'route-34',
    Route35GoldenrodGate: 'route-35',
    Route43Gate: 'route-43',
    Route5CleanseTagHouse: 'route-5',
  },
  pokegold: {
    // Same interior layout as pokecrystal — file names match.
    ElmsLab: 'new-bark-town',
    ElmsHouse: 'new-bark-town',
    PlayersHouse1F: 'new-bark-town',
    PlayersHouse2F: 'new-bark-town',
    PlayersNeighborsHouse: 'new-bark-town',
    CherrygroveMart: 'cherrygrove-city',
    CherrygrovePokecenter1F: 'cherrygrove-city',
    Route30BerryHouse: 'route-30',
    MrPokemonsHouse: 'route-30',
    KurtsHouse: 'azalea-town',
    AzaleaMart: 'azalea-town',
    AzaleaPokecenter1F: 'azalea-town',
    CharcoalKiln: 'azalea-town',
    GoldenrodPokecenter1F: 'goldenrod-city',
    GoldenrodMart1F: 'goldenrod-city',
    GoldenrodMart2F: 'goldenrod-city',
    GoldenrodMart3F: 'goldenrod-city',
    GoldenrodMart4F: 'goldenrod-city',
    GoldenrodMart5F: 'goldenrod-city',
    GoldenrodMart6F: 'goldenrod-city',
    GoldenrodMartElevator: 'goldenrod-city',
    GoldenrodMartRoof: 'goldenrod-city',
    GoldenrodFlowerShop: 'goldenrod-city',
    GoldenrodPPSpeechHouse: 'goldenrod-city',
    GoldenrodNameRater: 'goldenrod-city',
    GoldenrodHappinessRater: 'goldenrod-city',
    GoldenrodBikeShop: 'goldenrod-city',
    GoldenrodBillsHouse: 'goldenrod-city',
    BillsHouse: 'ecruteak-city',
    EcruteakMart: 'ecruteak-city',
    EcruteakPokecenter1F: 'ecruteak-city',
    EcruteakItemfinderHouse: 'ecruteak-city',
    EcruteakHouse: 'ecruteak-city',
    OlivineMart: 'olivine-city',
    OlivinePokecenter1F: 'olivine-city',
    OlivineGoodRodHouse: 'olivine-city',
    OlivineCafe: 'olivine-city',
    OlivineLighthouse1F: 'olivine-lighthouse',
    OlivineLighthouse2F: 'olivine-lighthouse',
    OlivineLighthouse3F: 'olivine-lighthouse',
    OlivineLighthouse4F: 'olivine-lighthouse',
    OlivineLighthouse5F: 'olivine-lighthouse',
    OlivineLighthouse6F: 'olivine-lighthouse',
    OlivinePort: 'olivine-city',
    CianwoodMart: 'cianwood-city',
    CianwoodPokecenter1F: 'cianwood-city',
    CianwoodPharmacy: 'cianwood-city',
    CianwoodCityPhotoStudio: 'cianwood-city',
    PokeSeersHouse: 'cianwood-city',
    MahoganyMart1F: 'mahogany-town',
    MahoganyRedGyaradosSpeechHouse: 'mahogany-town',
    Route39Barn: 'route-39',
    Route39Farmhouse: 'route-39',
    BlackthornMart: 'blackthorn-city',
    BlackthornPokecenter1F: 'blackthorn-city',
    MoveDeletersHouse: 'blackthorn-city',
    DayCare: 'route-34',
    // Fast Ship + Dance Theater + Wise Trios — same as crystal
    FastShipB1F: 'olivine-city',
    FastShipCabins_NNW_NNE_NE: 'olivine-city',
    FastShipCabins_SE_SSE_CaptainsCabin: 'olivine-city',
    FastShipCabins_SW_SSW_NW: 'olivine-city',
    DanceTheater: 'ecruteak-city',
    WiseTriosRoom: 'ecruteak-city',
    // Kanto interior buildings
    CeladonCafe: 'celadon-city',
    CeladonMansionRoofHouse: 'celadon-city',
    CopycatsHouse2F: 'saffron-city',
    MrPsychicsHouse: 'saffron-city',
    PokemonFanClub: 'vermilion-city',
    MountMoonSquare: 'mt-moon',
    Route12SuperRodHouse: 'route-12',
    Route27SandstormHouse: 'route-27',
    Route28SteelWingHouse: 'route-28',
    Route2NuggetHouse: 'route-2',
    Route32Pokecenter1F: 'route-32',
    Route34IlexForestGate: 'route-34',
    Route35GoldenrodGate: 'route-35',
    Route43Gate: 'route-43',
    Route5CleanseTagHouse: 'route-5',
  },
};

// Parent-of-child location relationships. Curated seeds sometimes put rows
// at the parent (`olivine-city`) when pret places them in a sub-location
// (`olivine-lighthouse`, `OlivineGym` → `olivine-gym`). When the linker can't
// match at the pret-derived child key, retry at the parent.
const LOCATION_PARENT: Record<string, string> = {
  'olivine-lighthouse': 'olivine-city',
  'violet-gym':      'violet-city',
  'azalea-gym':      'azalea-town',
  'goldenrod-gym':   'goldenrod-city',
  'ecruteak-gym':    'ecruteak-city',
  'olivine-gym':     'olivine-city',
  'cianwood-gym':    'cianwood-city',
  'mahogany-gym':    'mahogany-town',
  'blackthorn-gym':  'blackthorn-city',
  'pewter-gym':      'pewter-city',
  'cerulean-gym':    'cerulean-city',
  'vermilion-gym':   'vermilion-city',
  'celadon-gym':     'celadon-city',
  'fuchsia-gym':     'fuchsia-city',
  'saffron-gym':     'saffron-city',
  'cinnabar-gym':    'cinnabar-island',
  'viridian-gym':    'viridian-city',
};

// ── Curated event-name aliases ─────────────────────────────────────────────
// Curated `location_events` rows (from johto-bulbapedia.json) use display
// names that don't always word-match the pret EVENT_*. Map them explicitly.
const GEN2_GYM_EVENT_ALIASES: Record<string, string> = {
  'Receive Starter Pokemon': 'EVENT_GOT_A_POKEMON_FROM_ELM',
  'Defeat Falkner': 'EVENT_BEAT_FALKNER',
  'Defeat Bugsy': 'EVENT_BEAT_BUGSY',
  'Defeat Whitney': 'EVENT_BEAT_WHITNEY',
  'Defeat Morty': 'EVENT_BEAT_MORTY',
  'Defeat Chuck': 'EVENT_BEAT_CHUCK',
  'Defeat Jasmine': 'EVENT_BEAT_JASMINE',
  'Defeat Pryce': 'EVENT_BEAT_PRYCE',
  'Defeat Clair': 'EVENT_BEAT_CLAIR',
  'Defeat Brock': 'EVENT_BEAT_BROCK',
  'Defeat Misty': 'EVENT_BEAT_MISTY',
  'Defeat Lt. Surge': 'EVENT_BEAT_LTSURGE',
  'Defeat Erika': 'EVENT_BEAT_ERIKA',
  'Defeat Janine': 'EVENT_BEAT_JANINE',
  'Defeat Sabrina': 'EVENT_BEAT_SABRINA',
  'Defeat Blaine': 'EVENT_BEAT_BLAINE',
  'Defeat Blue': 'EVENT_BEAT_BLUE',
  'Defeat Will': 'EVENT_BEAT_ELITE_4_WILL',
  'Defeat Koga': 'EVENT_BEAT_ELITE_4_KOGA',
  'Defeat Bruno': 'EVENT_BEAT_ELITE_4_BRUNO',
  'Defeat Karen': 'EVENT_BEAT_ELITE_4_KAREN',
  'Defeat Lance': 'EVENT_BEAT_CHAMPION_LANCE',
  'Defeat Red': 'EVENT_BEAT_RED',
  // Major Johto story beats — curated event_name in seed → pret flag.
  'Clear Slowpoke Well':       'EVENT_CLEARED_SLOWPOKE_WELL',
  'Clear Radio Tower':         'EVENT_CLEARED_RADIO_TOWER',
  'Clear Team Rocket HQ':      'EVENT_CLEARED_ROCKET_HIDEOUT',
  'Receive Squirtbottle':      'EVENT_GOT_SQUIRTBOTTLE',
  'Receive Eevee':             'EVENT_GOT_EEVEE',
  'Receive Master Ball':       'EVENT_GOT_MASTER_BALL_FROM_ELM',
  'Receive Pokegear':          'ENGINE_POKEGEAR',
  'Receive Pokégear':          'ENGINE_POKEGEAR',
  'Receive HM Cut':            'EVENT_GOT_HM01_CUT',
  'Receive HM Fly':            'EVENT_GOT_HM02_FLY',
  'Receive HM Surf':           'EVENT_GOT_HM03_SURF',
  'Receive HM Strength':       'EVENT_GOT_HM04_STRENGTH',
  'Receive HM Flash':          'EVENT_GOT_HM05_FLASH',
  'Receive HM Whirlpool':      'EVENT_GOT_HM06_WHIRLPOOL',
  'Receive HM Waterfall':      'EVENT_GOT_HM07_WATERFALL',
  'Restore Power Plant':       'EVENT_RESTORED_POWER_TO_KANTO',
  'Defeat Red Gyarados':       'EVENT_BEAT_LAKE_OF_RAGE_RED_GYARADOS',
  'Get Red Scale':             'EVENT_LAKE_OF_RAGE_RED_GYARADOS',
  'Get GS Ball':               'EVENT_GOT_GS_BALL_FROM_POKEMON_FAN_CLUB',
  'Give GS Ball to Kurt':      'EVENT_GAVE_GS_BALL_TO_KURT',
  // Dragon's Den challenge — beat the Elders + Clair gives HM Waterfall
  "Dragon's Den Challenge":    'EVENT_GOT_HM07_WATERFALL',
  'Receive Tyrogue':           'EVENT_GOT_TYROGUE_FROM_KIYO',
  'Receive SecretPotion':      'EVENT_GOT_SECRETPOTION_FROM_PHARMACY',
  'Receive Secret Potion':     'EVENT_GOT_SECRETPOTION_FROM_PHARMACY',
  'Red Gyarados Encounter':    'EVENT_LAKE_OF_RAGE_RED_GYARADOS',
  'Legendary Beasts Flee':     'EVENT_RELEASED_THE_BEASTS',
  'Receive Togepi Egg':        'EVENT_GOT_TOGEPI_EGG_FROM_ELMS_AIDE',
  // Misc Johto story flags
  'Defeat Kimono Girls':       'EVENT_GOT_HM03_SURF',  // surf is the gym-leader-equivalent reward after kimono battles
  'Receive Eggs':              'EVENT_GAVE_MYSTERY_EGG_TO_ELM',
  // Kanto story
  'Defeat Snorlax':            'EVENT_FOUGHT_SNORLAX',
  'Defeat Sudowoodo':          'EVENT_FOUGHT_SUDOWOODO',
};

// Curated item aliases — display name → flag name. Use this for items that
// don't appear as a `giveitem` in pret (engine-only features like Pokégear,
// or items the curated seed names differently than pret's constant). The
// linker treats matches here as engine_pending if the flag is ENGINE_*.
// Trainer aliases for special-case fights pret encodes with non-standard
// flags. Rival fights are the main case: pret uses `EVENT_RIVAL_<MAP>` as
// the storyline flag rather than `EVENT_BEAT_RIVAL_*`. The DB stores the
// rival's name as "???" since the player names him in-game. Match by
// (location_key, trainer_class) and emit the right pret flag.
interface TrainerAlias { flag: string; location_key: string; trainer_class: string; trainer_name?: string; }
const TRAINER_ALIASES_GEN2: TrainerAlias[] = [
  { location_key: 'new-bark-town',     trainer_class: 'Rival', flag: 'EVENT_RIVAL_NEW_BARK_TOWN' },
  { location_key: 'cherrygrove-city',  trainer_class: 'Rival', flag: 'EVENT_RIVAL_CHERRYGROVE_CITY' },
  { location_key: 'azalea-town',       trainer_class: 'Rival', flag: 'EVENT_RIVAL_AZALEA_TOWN' },
  { location_key: 'burned-tower',      trainer_class: 'Rival', flag: 'EVENT_RIVAL_BURNED_TOWER' },
  { location_key: 'goldenrod-city',    trainer_class: 'Rival', flag: 'EVENT_RIVAL_GOLDENROD_UNDERGROUND' },
  { location_key: 'victory-road-gsc',  trainer_class: 'Rival', flag: 'EVENT_RIVAL_VICTORY_ROAD' },
  { location_key: 'indigo-plateau-gsc',trainer_class: 'Rival', flag: 'EVENT_RIVAL_INDIGO_PLATEAU' },
  { location_key: 'mt-moon',           trainer_class: 'Rival', flag: 'EVENT_BEAT_RIVAL_IN_MT_MOON' },
];

interface ItemAlias { flag: string; location_key?: string; }
// Curated item aliases. Without `location_key`, the alias applies globally
// (Pokégear is given once in NB but the row only exists at NB anyway). With
// `location_key`, the alias is scoped — needed for items like Berry/Potion
// that occur both in the starter cutscene (NB, gated by starter flag) AND
// elsewhere (Route 31 berries are recurring, not gated by starter).
const ITEM_ALIASES_GEN2: Record<string, ItemAlias[]> = {
  'Pokégear':   [{ flag: 'ENGINE_POKEGEAR' }],
  'Pokegear':   [{ flag: 'ENGINE_POKEGEAR' }],
  'Bicycle':    [{ flag: 'ENGINE_BIKE_SHOP_CALL_ENABLED' }],
  'Bike':       [{ flag: 'ENGINE_BIKE_SHOP_CALL_ENABLED' }],
  'Coin Case':  [{ flag: 'EVENT_GOLDENROD_UNDERGROUND_COIN_CASE' }],
  'Radio Card': [{ flag: 'ENGINE_RADIO_CARD' }],
  'Map Card':   [{ flag: 'ENGINE_MAP_CARD' }],
  'Phone Card': [{ flag: 'ENGINE_PHONE_CARD' }],
  'Expn Card':  [{ flag: 'ENGINE_EXPN_CARD' }],
  'EXPN Card':  [{ flag: 'ENGINE_EXPN_CARD' }],
  // Goldenrod story-item gifts the parser missed because pret doesn't have
  // them as itemballs and they don't map cleanly to a single setevent.
  'Squirtbottle':   [{ flag: 'EVENT_GOT_SQUIRTBOTTLE' }],
  'SquirtBottle':   [{ flag: 'EVENT_GOT_SQUIRTBOTTLE' }],
  'Squirt Bottle':  [{ flag: 'EVENT_GOT_SQUIRTBOTTLE' }],
  'GS Ball':        [{ flag: 'EVENT_GOT_GS_BALL_FROM_POKEMON_FAN_CLUB' }],
  'Card Key':       [{ flag: 'EVENT_RECEIVED_CARD_KEY' }],
  'Basement Key':   [{ flag: 'EVENT_GOT_BASEMENT_KEY_FROM_DIRECTOR' }],
  'Clear Bell':     [{ flag: 'EVENT_GOT_CLEAR_BELL' }],
  'Rainbow Wing':   [{ flag: 'EVENT_GOT_RAINBOW_WING' }],
  'Silver Wing':    [{ flag: 'EVENT_GOT_SILVER_WING' }],
  'Pink Bow':       [{ flag: 'EVENT_GOT_PINK_BOW_FROM_TUSCANY' }],
  'Mystery Egg':    [{ flag: 'EVENT_GOT_MYSTERY_EGG_FROM_MR_POKEMON' }],
  'Egg':            [{ flag: 'EVENT_GOT_TOGEPI_EGG_FROM_ELMS_AIDE', location_key: 'new-bark-town' }],
  'Lost Item':      [{ flag: 'EVENT_GOT_LOST_ITEM_FROM_FAN_CLUB', location_key: 'vermilion-city' }],
  'Machine Part':   [{ flag: 'EVENT_FOUND_MACHINE_PART_IN_CERULEAN_GYM' }],
  'Old Rod':        [{ flag: 'EVENT_GOT_OLD_ROD' }],
  'Good Rod':       [{ flag: 'EVENT_GOT_GOOD_ROD' }],
  'Super Rod':      [{ flag: 'EVENT_GOT_SUPER_ROD' }],
  'Itemfinder':     [{ flag: 'EVENT_GOT_ITEMFINDER' }],
  'Old Amber':      [{ flag: 'EVENT_GOT_OLD_AMBER' }],
  'Bike Voucher':   [{ flag: 'EVENT_GOT_BIKE_VOUCHER' }],
  'Town Map':       [{ flag: 'EVENT_GOT_TOWN_MAP' }],
  'Pokeflute':      [{ flag: 'EVENT_GOT_POKE_FLUTE' }],
  'Poke Flute':     [{ flag: 'EVENT_GOT_POKE_FLUTE' }],
  // Lucky Number Show prizes (RadioTower1F, idx ENGINE_LUCKY_NUMBER_SHOW).
  // Same flag for all 3 prizes — when you complete the show once, it sets.
  // The Goldenrod-city duplicate rows pick up via location_key scope.
  'PP Up':       [{ flag: 'ENGINE_LUCKY_NUMBER_SHOW', location_key: 'goldenrod-city' }],
  'Exp. Share':  [{ flag: 'ENGINE_LUCKY_NUMBER_SHOW', location_key: 'goldenrod-city' }],
  'Master Ball': [
    { flag: 'EVENT_GOT_MASTER_BALL_FROM_ELM', location_key: 'new-bark-town' },
    { flag: 'ENGINE_LUCKY_NUMBER_SHOW',       location_key: 'goldenrod-city' },
  ],
  'Blue Card':   [{ flag: 'EVENT_MET_BUENA' }],
  // Items given deterministically as part of the starter cutscene in Elm's
  // Lab. Pret has no per-item flag because they're gated on the starter
  // event itself (you can't decline them once you accept a starter). Alias
  // them to the parent flag — but ONLY at new-bark-town. Berry / Potion /
  // Poké Ball appear in other locations as separate, often recurring gifts
  // (Route 31 berry NPCs, Route 44 ball NPC). Those rows stay unaliased and
  // get classified as recurring by the parser's pickup_kind heuristic.
  'Berry':     [{ flag: 'EVENT_GOT_A_POKEMON_FROM_ELM', location_key: 'new-bark-town' }],
  'Potion':    [{ flag: 'EVENT_GOT_A_POKEMON_FROM_ELM', location_key: 'new-bark-town' }],
  'Poké Ball': [{ flag: 'EVENT_GOT_A_POKEMON_FROM_ELM', location_key: 'new-bark-town' }],
  'Poke Ball': [{ flag: 'EVENT_GOT_A_POKEMON_FROM_ELM', location_key: 'new-bark-town' }],
};

const EVENT_ALIASES: Record<string, Record<string, string>> = {
  crystal: GEN2_GYM_EVENT_ALIASES,
  // Gold/Silver share the same gym-leader / E4 / champion flag names with
  // crystal — pokegold/pokesilver are byte-identical here. Only Crystal-only
  // story beats (Suicune chase, Eusine, Celebi GS Ball) would diverge, and
  // those aren't in the curated location_events for gold/silver.
  gold: GEN2_GYM_EVENT_ALIASES,
  silver: GEN2_GYM_EVENT_ALIASES,
};

// ── Helpers ────────────────────────────────────────────────────────────────

interface FlagDef { index: number; name: string; category: string; location_key?: string; source: string; }
interface EngineFlagDef { name: string; synthetic_index: number; sram_offset: number; bit: number; wField: string; }

/**
 * Combined event + engine flag name → flag_index map. Engine flags use
 * synthetic indices ≥ 4096; event flags stay below. They share the
 * `location_*.flag_index` column without collision.
 */
function loadFlagDefs(game: string): Map<string, number> {
  const m = new Map<string, number>();
  try {
    const defs: FlagDef[] = JSON.parse(readFileSync(join(FLAGS_DIR, `${game}.json`), 'utf-8'));
    for (const d of defs) m.set(d.name, d.index);
  } catch { /* event flag JSON optional per game */ }
  try {
    const engineDefs: EngineFlagDef[] = JSON.parse(readFileSync(join(FLAGS_DIR, `${game}-engine.json`), 'utf-8'));
    for (const e of engineDefs) m.set(e.name, e.synthetic_index);
  } catch { /* engine flag JSON only exists for gen 2 currently */ }
  return m;
}

function loadLocationMap(): Record<string, Record<string, string>> {
  const data = JSON.parse(readFileSync(LOCATION_MAP_PATH, 'utf-8'));
  const out: Record<string, Record<string, string>> = {};
  for (const [repo, mappings] of Object.entries(data)) {
    if (repo.startsWith('_')) continue;
    out[repo] = {};
    for (const [pretMap, info] of Object.entries(mappings as Record<string, { location_key: string }>)) {
      out[repo][pretMap] = info.location_key;
    }
    // Layer in interior building extensions.
    if (INTERIOR_EXTENSIONS[repo]) {
      for (const [pretMap, locKey] of Object.entries(INTERIOR_EXTENSIONS[repo])) {
        if (!out[repo][pretMap]) out[repo][pretMap] = locKey;
      }
    }
  }
  return out;
}

// Normalize an item/trainer-class string for matching. Strips non-alnum and
// lowercases. `Master Ball` ↔ `MASTER_BALL` ↔ `masterball`.
function normalize(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

// Parse `EVENT_GOT_TM27_RETURN` → { tmNumber: 27, isHm: false, moveName: 'RETURN' }
function parseTmHmFlag(name: string): { tmNumber: number; isHm: boolean; moveName: string } | null {
  const m = name.match(/^EVENT_GOT_(TM|HM)(\d+)_(.+)$/);
  if (!m) return null;
  return { tmNumber: parseInt(m[2], 10), isHm: m[1] === 'HM', moveName: m[3] };
}

// ── Linker ────────────────────────────────────────────────────────────────

interface LinkStats {
  items: { total: number; linked: number; alreadyLinked: number; unmappedMap: number; missingFlag: number; noMatch: number; noFlagInData: number };
  trainers: { total: number; linked: number; alreadyLinked: number; unmappedMap: number; missingFlag: number; noMatch: number; noFlagInData: number };
  tms: { total: number; linked: number; alreadyLinked: number; unmappedMap: number; missingFlag: number; noMatch: number; noFlagInData: number };
}

function emptyStats(): LinkStats {
  const z = () => ({ total: 0, linked: 0, alreadyLinked: 0, unmappedMap: 0, missingFlag: 0, noMatch: 0, noFlagInData: 0 });
  return { items: z(), trainers: z(), tms: z() };
}

async function main() {
  const db = new Database(DB_PATH);
  const locationMap = loadLocationMap();

  // Per-game stats. Aggregated by game basename (crystal, gold, silver).
  const gameStats: Record<string, LinkStats> = {};
  const unlinkedDetail: Record<string, { items: string[]; trainers: string[]; tms: string[] }> = {};

  for (const src of PRET_SOURCES) {
    console.log(`\n── ${src.repoKey} → games: ${src.flagFiles.join(', ')} ──`);
    const items = await parseItemsFromPret(src.pretRoot);
    const trainers = await parseTrainersFromPret(src.pretRoot);
    console.log(`  Parsed ${items.length} items, ${trainers.length} trainers from pret.`);

    for (const game of src.flagFiles) {
      const flags = loadFlagDefs(game);
      gameStats[game] = emptyStats();
      unlinkedDetail[game] = { items: [], trainers: [], tms: [] };
      const gameLocMap = locationMap[src.repoKey] ?? {};

      linkItems(db, items, game, flags, gameLocMap, gameStats[game], unlinkedDetail[game]);
      linkTrainers(db, trainers, game, flags, gameLocMap, gameStats[game], unlinkedDetail[game]);
      linkTmsByFlagDef(db, game, flags, gameStats[game], unlinkedDetail[game]);
      linkHmTmItemsByName(db, game, flags);
      linkEventsByAlias(db, game, flags, gameStats[game]);
      linkItemsByAlias(db, game, flags, gameStats[game]);
      linkTrainersByAlias(db, game, flags);
      // After the primary linkers, propagate flag_index to seed-duplicates
      // (gym leaders shared between `<city>` and `<city>-gym`, items copied
      // across parent/child locations). Parser only places one row per
      // pret-source, but the curated seed often duplicates story content.
      const dupT = propagateLinkedTrainersToDuplicates(db, game);
      const dupI = propagateLinkedItemsToDuplicates(db, game);
      if (dupT || dupI) console.log(`  [${game}] propagated flag_index to ${dupT} duplicate trainers + ${dupI} duplicate items`);
    }
  }

  // ── Coverage report ──
  console.log('\n========= COVERAGE =========');
  for (const [game, stats] of Object.entries(gameStats)) {
    console.log(`\n[${game}]`);
    for (const k of ['items', 'trainers', 'tms'] as const) {
      const s = stats[k];
      const pct = s.total ? ((s.linked + s.alreadyLinked) / s.total * 100).toFixed(1) : 'N/A';
      console.log(`  ${k.padEnd(9)}: linked ${s.linked}, already-linked ${s.alreadyLinked}, no-match ${s.noMatch}, no-flag-in-data ${s.noFlagInData}, missing-flag ${s.missingFlag}, unmapped-map ${s.unmappedMap} of ${s.total} (${pct}%)`);
    }
    if (unlinkedDetail[game].items.length || unlinkedDetail[game].trainers.length || unlinkedDetail[game].tms.length) {
      const cap = 8;
      if (unlinkedDetail[game].items.length) {
        console.log(`  Unlinked items (${unlinkedDetail[game].items.length}, showing ${Math.min(cap, unlinkedDetail[game].items.length)}):`);
        unlinkedDetail[game].items.slice(0, cap).forEach(s => console.log('    ', s));
      }
      if (unlinkedDetail[game].trainers.length) {
        console.log(`  Unlinked trainers (${unlinkedDetail[game].trainers.length}, showing ${Math.min(cap, unlinkedDetail[game].trainers.length)}):`);
        unlinkedDetail[game].trainers.slice(0, cap).forEach(s => console.log('    ', s));
      }
      if (unlinkedDetail[game].tms.length) {
        console.log(`  Unlinked tms (${unlinkedDetail[game].tms.length}, showing ${Math.min(cap, unlinkedDetail[game].tms.length)}):`);
        unlinkedDetail[game].tms.slice(0, cap).forEach(s => console.log('    ', s));
      }
    }
  }

  // ── DB-side audit ──
  console.log('\n========= DB AUDIT =========');
  for (const game of Object.keys(gameStats)) {
    const auditTbl = (table: string, label: string) => {
      const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE game = ?`).get(game) as { n: number }).n;
      const linked = (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE game = ? AND flag_index IS NOT NULL`).get(game) as { n: number }).n;
      console.log(`  [${game}] ${label.padEnd(9)}: ${linked}/${total} have flag_index`);
    };
    auditTbl('location_items', 'items');
    auditTbl('location_trainers', 'trainers');
    auditTbl('location_tms', 'tms');
    auditTbl('location_events', 'events');
  }

  // ── Strict gate ──
  if (STRICT) {
    let strictFail = 0;
    for (const game of Object.keys(gameStats)) {
      const s = gameStats[game];
      strictFail += s.items.noMatch + s.trainers.noMatch + s.tms.noMatch;
    }
    if (strictFail > 0) {
      console.log(`\n✘ --strict: ${strictFail} unlinked rows. Failing.`);
      process.exit(1);
    } else {
      console.log('\n✔ --strict: no unlinked rows.');
    }
  }

  db.close();
}

function linkItems(
  db: Database,
  items: ParsedItem[],
  game: string,
  flags: Map<string, number>,
  locMap: Record<string, string>,
  stats: LinkStats,
  unlinked: { items: string[]; trainers: string[]; tms: string[] },
) {
  // The DB stores TMs in a separate table; skip parser items whose method
  // is 'tm' here — those are linked by `linkTmsByFlagDef`. Field/hidden/gift
  // items go to `location_items`.
  const updateStmt = db.prepare(`
    UPDATE location_items
       SET flag_index = ?, flag_source = COALESCE(flag_source, 'pret')
     WHERE game = ?
       AND id IN (
         SELECT li.id FROM location_items li
         JOIN map_locations ml ON ml.id = li.location_id
         WHERE li.game = ?
           AND ml.location_key = ?
           AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(li.item_name, ' ', ''), '.', ''), '-', ''), 'é', 'e')) = ?
           AND (li.flag_source IS NULL OR li.flag_source = 'auto' OR li.flag_source = 'pret')
       )
       AND (flag_index IS NULL OR flag_source != 'manual')
  `);

  // For unflagged items, the parser pre-classified them as recurring /
  // transactional / scripted via `pickup_kind`. Mark those rows with the
  // matching `flag_source` so the UI can render them as "Daily" / "Buy" /
  // "One-time gift" instead of leaving them looking like missing data.
  const markUnflaggedStmt = db.prepare(`
    UPDATE location_items
       SET flag_source = ?
     WHERE game = ?
       AND id IN (
         SELECT li.id FROM location_items li
         JOIN map_locations ml ON ml.id = li.location_id
         WHERE li.game = ?
           AND ml.location_key = ?
           AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(li.item_name, ' ', ''), '.', ''), '-', ''), 'é', 'e')) = ?
           AND li.flag_index IS NULL
           AND (li.flag_source IS NULL OR li.flag_source IN ('auto', 'recurring', 'transactional', 'scripted', 'engine_pending'))
       )
  `);

  // Some parser-derived TM items don't get linked by `linkTmsByFlagDef`
  // because pret uses non-standard flag names like
  // `EVENT_GOT_SUNNY_DAY_FROM_RADIO_TOWER` instead of
  // `EVENT_GOT_TM11_SUNNY_DAY`. Match those TMs against `location_tms` by
  // move name parsed from `TM_<MOVE>` / `HM_<MOVE>` item_name.
  for (const it of items) {
    if (it.method !== 'tm') continue;
    const flagName = it.event_flag ?? it.engine_flag;
    if (!flagName) continue;
    const idx = flags.get(flagName);
    if (idx == null) continue;
    const m = it.item_name.match(/^(TM|HM)_(.+)$/);
    if (!m) continue;
    const moveNorm = m[2].toLowerCase().replace(/[^a-z0-9]/g, '');
    db.prepare(`
      UPDATE location_tms
         SET flag_index = ?, flag_source = COALESCE(flag_source, 'pret')
       WHERE game = ?
         AND LOWER(REPLACE(REPLACE(REPLACE(move_name, ' ', ''), '.', ''), '-', '')) = ?
         AND (flag_source IS NULL OR flag_source IN ('auto', 'pret', 'tm_alias'))
    `).run(idx, game, moveNorm);
  }

  for (const it of items) {
    if (it.method === 'tm') continue;
    stats.items.total++;
    // Use the event flag if available, else fall back to engine flag (both
    // resolve through the same name→index map; engine flags have synthetic
    // indices ≥ 4096). This unifies linking for one-shot event-flag gifts AND
    // engine-bank gifts (Pokégear, Lucky Number Show prizes, etc.).
    const flagName = it.event_flag ?? it.engine_flag;
    if (!flagName) {
      stats.items.noFlagInData++;
      const locKey = locMap[it.map_name];
      if (locKey && it.pickup_kind && it.pickup_kind !== 'one_time') {
        markUnflaggedStmt.run(it.pickup_kind, game, game, locKey, normalize(it.item_name));
      }
      continue;
    }
    const idx = flags.get(flagName);
    if (idx == null) { stats.items.missingFlag++; continue; }
    const locKey = locMap[it.map_name];
    if (!locKey) {
      stats.items.unmappedMap++;
      unlinked.items.push(`UNMAPPED ${it.map_name}: ${it.item_name} (${it.method}) → ${flagName}`);
      continue;
    }
    const norm = normalize(it.item_name);
    let r = updateStmt.run(idx, game, game, locKey, norm);
    // Curated seed sometimes puts an item at the parent overworld
    // (olivine-city) when pret has it in a sub-map (olivine-lighthouse).
    // Retry at the parent if the child returned no row to update.
    if (r.changes === 0 && LOCATION_PARENT[locKey]) {
      r = updateStmt.run(idx, game, game, LOCATION_PARENT[locKey], norm);
    }
    if (r.changes > 0) stats.items.linked++;
    else {
      const parentLoc = LOCATION_PARENT[locKey] ?? locKey;
      const existsRow = db.prepare(`
        SELECT li.id, li.flag_index FROM location_items li
        JOIN map_locations ml ON ml.id = li.location_id
        WHERE li.game = ? AND ml.location_key IN (?, ?)
          AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(li.item_name, ' ', ''), '.', ''), '-', ''), 'é', 'e')) = ?
      `).all(game, locKey, parentLoc, norm) as Array<{ id: number; flag_index: number | null }>;
      if (existsRow.length === 0) {
        stats.items.noMatch++;
        unlinked.items.push(`NOROW ${locKey} ${it.item_name} (pret ${it.event_flag}) — no DB row in location_items`);
      } else {
        stats.items.alreadyLinked++;
      }
    }
  }
}

function linkTrainers(
  db: Database,
  trainers: ParsedTrainer[],
  game: string,
  flags: Map<string, number>,
  locMap: Record<string, string>,
  stats: LinkStats,
  unlinked: { items: string[]; trainers: string[]; tms: string[] },
) {
  // Match by (location_key, normalized trainer_class, normalized trainer_name)
  // since the DB stores display-friendly forms (`Cooltrainer (F)`) while pret
  // uses ALL_CAPS (`COOLTRAINERF`). The normalizer collapses both to
  // `cooltrainerf`.
  const updateStmt = db.prepare(`
    UPDATE location_trainers
       SET flag_index = ?, flag_source = COALESCE(flag_source, 'pret')
     WHERE game = ?
       AND id IN (
         SELECT lt.id FROM location_trainers lt
         JOIN map_locations ml ON ml.id = lt.location_id
         WHERE lt.game = ?
           AND ml.location_key = ?
           AND LOWER(REPLACE(REPLACE(lt.trainer_class, ' ', ''), '(', '')) GLOB ?
           AND LOWER(REPLACE(lt.trainer_name, ' ', '')) = ?
           AND (lt.flag_source IS NULL OR lt.flag_source = 'auto' OR lt.flag_source = 'pret')
       )
  `);

  for (const t of trainers) {
    stats.trainers.total++;
    if (!t.event_flag) { stats.trainers.noFlagInData++; continue; }
    const idx = flags.get(t.event_flag);
    if (idx == null) {
      stats.trainers.missingFlag++;
      unlinked.trainers.push(`MISSINGFLAG ${t.map_name} ${t.trainer_class}/${t.trainer_name} → ${t.event_flag}`);
      continue;
    }
    const locKey = locMap[t.map_name];
    if (!locKey) {
      stats.trainers.unmappedMap++;
      unlinked.trainers.push(`UNMAPPED ${t.map_name}: ${t.trainer_class}/${t.trainer_name} → ${t.event_flag}`);
      continue;
    }
    // The DB stores trainer_name as the in-game shown name (e.g. `Tully`),
    // which corresponds to the pret CONSTANT name (TULLY1) without trailing
    // ordinal digits — NOT the db-string from parties.asm (which can be a
    // different name like `JUSTIN@` for shared parties). Deriving the name
    // from the EVENT flag side-steps that mismatch: `EVENT_BEAT_FISHER_TULLY`
    // → trainer_name `TULLY`. Strip the EVENT_BEAT_ prefix and the class
    // prefix to recover the canonical name segment.
    // Crystal disambiguates trainer class from move type with `_T` suffix
    // (BLACKBELT_T, PSYCHIC_T). The DB stores the display class without the
    // suffix (`Blackbelt`, `Psychic`). Strip _T/_F/_M before normalizing.
    const classNorm = t.trainer_class.replace(/_[TFM]$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let nameFromFlag = t.event_flag.replace(/^EVENT_BEAT_/, '');
    // Drop the class prefix if present. Pret event names can have ELITE_4_
    // / CHAMPION_ prefixes (ELITE_4_WILL, CHAMPION_LANCE) that don't match
    // the trainer_class. Try class-prefix-strip first; if no match, try
    // splitting on the last underscore.
    // Class may have underscores (`BUG_CATCHER`, `SUPER_NERD`, `SCHOOL_BOY`)
    // that match the corresponding underscore form in the flag name. Strip
    // by class name with underscores AS-IS first, then fall back to a
    // collapsed-no-underscore form (e.g. `COOLTRAINERM`).
    // Try several candidate class prefixes to strip:
    //   1. Raw class:                       BLACKBELT_T
    //   2. Class without underscores:       BLACKBELTT
    //   3. Class without trailing _T/_F/_M  (Crystal disambiguators):  BLACKBELT
    //   4. ELITE_4_ / CHAMPION_ / ROCKET_ prefix (E4 + champion fights)
    // Whichever matches first is the prefix; remainder is the name.
    const classRaw = t.trainer_class;
    const classToken = classRaw.replace(/[^A-Z0-9]/g, '');
    const classNoSuffix = classRaw.replace(/_[TFM]$/, '');
    const candidates = [
      classRaw + '_',
      classToken + '_',
      classNoSuffix + '_',
    ];
    let stripped = false;
    for (const c of candidates) {
      if (nameFromFlag.startsWith(c)) {
        nameFromFlag = nameFromFlag.slice(c.length);
        stripped = true;
        break;
      }
    }
    if (!stripped && (nameFromFlag.startsWith('ELITE_4_') || nameFromFlag.startsWith('CHAMPION_') || nameFromFlag.startsWith('ROCKET_'))) {
      nameFromFlag = nameFromFlag.replace(/^(ELITE_4_|CHAMPION_|ROCKET_)/, '');
    }
    // Twin/couple trainers use `_AND_` joiner in pret (e.g. TWINS_MEG_AND_PEG)
    // while the DB stores `Meg & Peg` or `Meg & peg`. Strip `_AND_` and `&`
    // before normalization so both collapse to "megpeg".
    nameFromFlag = nameFromFlag.replace(/_AND_/g, '_');
    const nameNorm = nameFromFlag.toLowerCase().replace(/[^a-z0-9]/g, '');
    // GLOB pattern with wildcards on either side to tolerate stray punctuation
    // we didn't strip (the SQL REPLACE chain only strips space + open paren).
    const tryUpdate = (loc: string) => db.prepare(`
      UPDATE location_trainers
         SET flag_index = ?, flag_source = COALESCE(flag_source, 'pret')
       WHERE game = ?
         AND id IN (
           SELECT lt.id FROM location_trainers lt
           JOIN map_locations ml ON ml.id = lt.location_id
           WHERE lt.game = ?
             AND ml.location_key = ?
             AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(lt.trainer_class, ' ', ''), '(', ''), ')', ''), '.', '')) = ?
             AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(lt.trainer_name, ' ', ''), '.', ''), '#', ''), '&', '')) = ?
             AND (lt.flag_source IS NULL OR lt.flag_source = 'auto' OR lt.flag_source = 'pret')
         )
    `).run(idx, game, game, loc, classNorm, nameNorm);
    let r = tryUpdate(locKey);
    // Curated seed often puts trainers at parent location (olivine-city) even
    // when pret places them at a child (olivine-lighthouse, *-gym, etc.).
    // Retry at the parent if the child returned no row to update.
    if (r.changes === 0 && LOCATION_PARENT[locKey]) {
      r = tryUpdate(LOCATION_PARENT[locKey]);
    }
    if (r.changes > 0) stats.trainers.linked++;
    else {
      const parentLoc = LOCATION_PARENT[locKey] ?? locKey;
      const existsRow = db.prepare(`
        SELECT lt.id, lt.flag_index FROM location_trainers lt
        JOIN map_locations ml ON ml.id = lt.location_id
        WHERE lt.game = ? AND ml.location_key IN (?, ?)
          AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(lt.trainer_class, ' ', ''), '(', ''), ')', ''), '.', '')) = ?
          AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(lt.trainer_name, ' ', ''), '.', ''), '#', ''), '&', '')) = ?
      `).all(game, locKey, parentLoc, classNorm, nameNorm) as Array<{ id: number; flag_index: number | null }>;
      if (existsRow.length === 0) {
        stats.trainers.noMatch++;
        unlinked.trainers.push(`NOROW ${locKey} ${t.trainer_class}/${t.trainer_name} (pret ${t.event_flag})`);
      } else {
        stats.trainers.alreadyLinked++;
      }
    }
  }
}

// TMs in the DB live in `location_tms` keyed by `tm_number` (TEXT, "1"…"50"
// for TMs and "1"…"7" for HMs). The flag JSON has names like
// `EVENT_GOT_TM27_RETURN` and `EVENT_GOT_HM01_CUT` — number embedded. We can
// drive linkage purely from the flag JSON without consulting the parser.
// Some curated `location_items` rows are TM/HM gifts named like
// "HM04 Strength" or "TM27 Return" rather than living in `location_tms`.
// The TM-table linker can't see them; this pass scans the flag JSON for
// EVENT_GOT_(TM|HM)NN_NAME and looks for a matching `item_name` substring.
function linkHmTmItemsByName(db: Database, game: string, flags: Map<string, number>) {
  if (!game.match(/^(red|blue|yellow|gold|silver|crystal)$/)) return;
  for (const [name, idx] of flags) {
    const m = name.match(/^EVENT_GOT_(TM|HM)(\d+)_(.+)$/);
    if (!m) continue;
    const [, kind, numStr, moveTok] = m;
    const num = parseInt(numStr, 10);
    const moveNorm = moveTok.toLowerCase().replace(/[^a-z0-9]/g, '');
    // location_items name patterns: "HM04 Strength", "TM27 Return", "HM01 Cut".
    // Match where item_name starts with the kind+number and the rest contains
    // the move name (case-insensitive, punctuation-stripped).
    const prefix = `${kind}${numStr.padStart(2, '0')}`;
    db.prepare(`
      UPDATE location_items
         SET flag_index = ?, flag_source = COALESCE(flag_source, 'tm_alias')
       WHERE game = ?
         AND item_name LIKE ?
         AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(item_name, ' ', ''), '.', ''), '-', ''), 'é', '')) LIKE ?
         AND (flag_source IS NULL OR flag_source IN ('auto', 'tm_alias'))
    `).run(idx, game, `${prefix} %`, `%${moveNorm}%`);
  }
}

function linkTmsByFlagDef(
  db: Database,
  game: string,
  flags: Map<string, number>,
  stats: LinkStats,
  unlinked: { items: string[]; trainers: string[]; tms: string[] },
) {
  const totalRow = db.prepare(`SELECT COUNT(*) AS n FROM location_tms WHERE game = ?`).get(game) as { n: number };
  stats.tms.total = totalRow.n;
  for (const [name, idx] of flags) {
    const m = parseTmHmFlag(name);
    if (!m) continue;
    const moveNorm = m.moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Match tm_number AND normalized move name. The tm_number column is TEXT
    // — we just stringify the int.
    const r = db.prepare(`
      UPDATE location_tms
         SET flag_index = ?, flag_source = COALESCE(flag_source, 'pret')
       WHERE game = ?
         AND id IN (
           SELECT id FROM location_tms
           WHERE game = ?
             AND tm_number = ?
             AND LOWER(REPLACE(REPLACE(REPLACE(move_name, ' ', ''), '.', ''), '-', '')) = ?
             AND (flag_source IS NULL OR flag_source = 'auto' OR flag_source = 'pret')
         )
    `).run(idx, game, game, String(m.tmNumber), moveNorm);
    if (r.changes > 0) stats.tms.linked += r.changes;
  }
  // Anything still null in the table is unlinked.
  const stillNull = db.prepare(`SELECT id, tm_number, move_name, method FROM location_tms WHERE game = ? AND flag_index IS NULL`).all(game) as any[];
  for (const r of stillNull) {
    unlinked.tms.push(`TM ${r.tm_number} ${r.move_name} (${r.method}) — no flag matched`);
  }
  stats.tms.noMatch = stillNull.length;
  stats.tms.alreadyLinked = stats.tms.total - stats.tms.linked - stats.tms.noMatch;
}

// Items that don't appear as `giveitem` in pret (engine-feature toggles like
// Pokégear, Bicycle, the four PokéGear cards) have to be linked by curated
// alias. ENGINE_* targets are tagged `engine_pending` until the engine flag
// bank reader lands; EVENT_* targets get a real flag_index.
function linkItemsByAlias(db: Database, game: string, flags: Map<string, number>, _stats: LinkStats) {
  if (!game.match(/^(red|blue|yellow|gold|silver|crystal)$/)) return;
  for (const [displayName, aliases] of Object.entries(ITEM_ALIASES_GEN2)) {
    for (const alias of aliases) {
      const idx = flags.get(alias.flag);
      if (idx == null) {
        // Flag missing from defs — surface as engine_pending if it's an
        // engine flag we know about by name but couldn't resolve (e.g. some
        // pokegold/silver wFields outside the wram parser's coverage).
        if (alias.flag.startsWith('ENGINE_')) {
          if (alias.location_key) {
            db.prepare(`
              UPDATE location_items
                 SET flag_source = COALESCE(flag_source, 'engine_pending')
               WHERE game = ? AND item_name = ?
                 AND location_id = (SELECT id FROM map_locations WHERE location_key = ?)
                 AND flag_index IS NULL
                 AND (flag_source IS NULL OR flag_source IN ('auto', 'engine_pending'))
            `).run(game, displayName, alias.location_key);
          } else {
            db.prepare(`
              UPDATE location_items
                 SET flag_source = COALESCE(flag_source, 'engine_pending')
               WHERE game = ? AND item_name = ?
                 AND flag_index IS NULL
                 AND (flag_source IS NULL OR flag_source IN ('auto', 'engine_pending'))
            `).run(game, displayName);
          }
        }
        continue;
      }
      // Both event and engine flags resolve here — engine indices are ≥ 4096
      // synthetic but the column type doesn't care. The UI compares against the
      // FlagResult[] from parseEventFlags which now includes both banks.
      // flag_source: 'engine' for synthetic indices (≥ 4096) so the UI knows
      // it came from wEngineBuffer rather than wEventFlags; 'alias' otherwise.
      const src = idx >= 4096 ? 'engine' : 'alias';
      if (alias.location_key) {
        db.prepare(`
          UPDATE location_items
             SET flag_index = ?, flag_source = ?
           WHERE game = ? AND item_name = ?
             AND location_id = (SELECT id FROM map_locations WHERE location_key = ?)
             AND (flag_source IS NULL OR flag_source IN ('auto', 'alias', 'engine_pending', 'engine', 'recurring', 'transactional', 'scripted'))
        `).run(idx, src, game, displayName, alias.location_key);
      } else {
        db.prepare(`
          UPDATE location_items
             SET flag_index = ?, flag_source = ?
           WHERE game = ? AND item_name = ?
             AND (flag_source IS NULL OR flag_source IN ('auto', 'alias', 'engine_pending', 'engine'))
        `).run(idx, src, game, displayName);
      }
    }
  }
}

/**
 * The curated seed often duplicates gym leaders + their party trainers into
 * BOTH the parent city row (`goldenrod-city`) AND the gym sub-location
 * (`goldenrod-gym`). Pret only places trainers in the gym map, so the
 * parser-driven linker only writes flag_index on the gym variant. Propagate
 * to the city duplicate by matching (game, trainer_class, trainer_name).
 *
 * Same applies to a handful of other locations where the seed has parent +
 * child rows (radio-tower vs goldenrod-city, dragons-den vs blackthorn-city,
 * etc). The match is purely class+name within a game — flag_index is the
 * same trainer regardless of which row it's stored on.
 */
function propagateLinkedTrainersToDuplicates(db: Database, game: string): number {
  // Normalize class/name on both sides so duplicates with stylistic
  // differences (`Cooltrainer (M)` vs `Cooltrainerm`, `Meg & peg` vs
  // `Meg And Peg`) still match. SQLite UPDATE...FROM (3.33+).
  const r = db.prepare(`
    UPDATE location_trainers AS dst
       SET flag_index = src.flag_index,
           flag_source = COALESCE(dst.flag_source, 'duplicate')
      FROM location_trainers AS src
     WHERE dst.game = ?
       AND dst.flag_index IS NULL
       AND src.game = dst.game
       AND src.id != dst.id
       AND src.flag_index IS NOT NULL
       AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(src.trainer_class, ' ', ''), '(', ''), ')', ''), '.', ''))
         = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(dst.trainer_class, ' ', ''), '(', ''), ')', ''), '.', ''))
       AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(src.trainer_name, ' ', ''), '.', ''), '#', ''), '&', ''))
         = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(dst.trainer_name, ' ', ''), '.', ''), '#', ''), '&', ''))
  `).run(game);
  return r.changes;
}

/**
 * Same idea for items: HM01 Cut shows up in BOTH ilex-forest AND elsewhere
 * (e.g. cherrygrove for the early Cut tutorial branch). Once one is linked
 * via parser, propagate to other rows with the same (item_name, method)
 * across the same game. Only when the duplicate has no flag — never
 * overwrites an existing link.
 */
function propagateLinkedItemsToDuplicates(db: Database, game: string): number {
  const r = db.prepare(`
    UPDATE location_items AS dst
       SET flag_index = src.flag_index,
           flag_source = COALESCE(dst.flag_source, 'duplicate')
      FROM location_items AS src
     WHERE dst.game = ?
       AND dst.flag_index IS NULL
       AND src.game = dst.game
       AND src.item_name = dst.item_name
       AND src.method = dst.method
       AND src.id != dst.id
       AND src.flag_index IS NOT NULL
  `).run(game);
  return r.changes;
}

// Curated trainer aliases for special-case fights (rivals, named bosses with
// `???` placeholders) that the parser-driven linker can't resolve by class+name.
function linkTrainersByAlias(db: Database, game: string, flags: Map<string, number>) {
  if (!game.match(/^(red|blue|yellow|gold|silver|crystal)$/)) return;
  for (const a of TRAINER_ALIASES_GEN2) {
    const idx = flags.get(a.flag);
    if (idx == null) continue;
    if (a.trainer_name) {
      db.prepare(`
        UPDATE location_trainers
           SET flag_index = ?, flag_source = COALESCE(flag_source, 'alias')
         WHERE game = ? AND trainer_class = ? AND trainer_name = ?
           AND location_id = (SELECT id FROM map_locations WHERE location_key = ?)
           AND (flag_source IS NULL OR flag_source IN ('auto', 'alias', 'pret'))
      `).run(idx, game, a.trainer_class, a.trainer_name, a.location_key);
    } else {
      db.prepare(`
        UPDATE location_trainers
           SET flag_index = ?, flag_source = COALESCE(flag_source, 'alias')
         WHERE game = ? AND trainer_class = ?
           AND location_id = (SELECT id FROM map_locations WHERE location_key = ?)
           AND (flag_source IS NULL OR flag_source IN ('auto', 'alias', 'pret'))
      `).run(idx, game, a.trainer_class, a.location_key);
    }
  }
}

function linkEventsByAlias(db: Database, game: string, flags: Map<string, number>, _stats: LinkStats) {
  const aliases = EVENT_ALIASES[game] ?? {};
  for (const [eventName, flagName] of Object.entries(aliases)) {
    const idx = flags.get(flagName);
    if (idx == null) continue;
    db.prepare(`
      UPDATE location_events
         SET flag_index = ?, flag_source = COALESCE(flag_source, 'alias')
       WHERE game = ? AND event_name = ?
         AND (flag_source IS NULL OR flag_source = 'auto' OR flag_source = 'alias')
    `).run(idx, game, eventName);
  }
}

await main();
