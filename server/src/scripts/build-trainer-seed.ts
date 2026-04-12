/**
 * build-trainer-seed.ts
 *
 * Fetches raw ASM data from pret/pokered on GitHub and produces
 * server/src/seeds/data/red-trainers-raw.json with trainer class + party
 * but no names yet (trainer_name: "Unknown").
 *
 * Usage: cd server && npx tsx src/scripts/build-trainer-seed.ts
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const CACHE_DIR = join(dirname(new URL(import.meta.url).pathname), ".cache");
const OUTPUT_PATH = join(
  dirname(new URL(import.meta.url).pathname),
  "..",
  "seeds",
  "data",
  "red-trainers-raw.json"
);

const PARTIES_URL =
  "https://raw.githubusercontent.com/pret/pokered/master/data/trainers/parties.asm";

// ── Species name → National Dex ID ──────────────────────────────────────────
const SPECIES_TO_DEX: Record<string, number> = {
  BULBASAUR: 1, IVYSAUR: 2, VENUSAUR: 3,
  CHARMANDER: 4, CHARMELEON: 5, CHARIZARD: 6,
  SQUIRTLE: 7, WARTORTLE: 8, BLASTOISE: 9,
  CATERPIE: 10, METAPOD: 11, BUTTERFREE: 12,
  WEEDLE: 13, KAKUNA: 14, BEEDRILL: 15,
  PIDGEY: 16, PIDGEOTTO: 17, PIDGEOT: 18,
  RATTATA: 19, RATICATE: 20,
  SPEAROW: 21, FEAROW: 22,
  EKANS: 23, ARBOK: 24,
  PIKACHU: 25, RAICHU: 26,
  SANDSHREW: 27, SANDSLASH: 28,
  NIDORAN_F: 29, NIDORINA: 30, NIDOQUEEN: 31,
  NIDORAN_M: 32, NIDORINO: 33, NIDOKING: 34,
  CLEFAIRY: 35, CLEFABLE: 36,
  VULPIX: 37, NINETALES: 38,
  JIGGLYPUFF: 39, WIGGLYTUFF: 40,
  ZUBAT: 41, GOLBAT: 42,
  ODDISH: 43, GLOOM: 44, VILEPLUME: 45,
  PARAS: 46, PARASECT: 47,
  VENONAT: 48, VENOMOTH: 49,
  DIGLETT: 50, DUGTRIO: 51,
  MEOWTH: 52, PERSIAN: 53,
  PSYDUCK: 54, GOLDUCK: 55,
  MANKEY: 56, PRIMEAPE: 57,
  GROWLITHE: 58, ARCANINE: 59,
  POLIWAG: 60, POLIWHIRL: 61, POLIWRATH: 62,
  ABRA: 63, KADABRA: 64, ALAKAZAM: 65,
  MACHOP: 66, MACHOKE: 67, MACHAMP: 68,
  BELLSPROUT: 69, WEEPINBELL: 70, VICTREEBEL: 71,
  TENTACOOL: 72, TENTACRUEL: 73,
  GEODUDE: 74, GRAVELER: 75, GOLEM: 76,
  PONYTA: 77, RAPIDASH: 78,
  SLOWPOKE: 79, SLOWBRO: 80,
  MAGNEMITE: 81, MAGNETON: 82,
  FARFETCHD: 83, FARFETCH_D: 83,
  DODUO: 84, DODRIO: 85,
  SEEL: 86, DEWGONG: 87,
  GRIMER: 88, MUK: 89,
  SHELLDER: 90, CLOYSTER: 91,
  GASTLY: 92, HAUNTER: 93, GENGAR: 94,
  ONIX: 95,
  DROWZEE: 96, HYPNO: 97,
  KRABBY: 98, KINGLER: 99,
  VOLTORB: 100, ELECTRODE: 101,
  EXEGGCUTE: 102, EXEGGUTOR: 103,
  CUBONE: 104, MAROWAK: 105,
  HITMONLEE: 106, HITMONCHAN: 107,
  LICKITUNG: 108,
  KOFFING: 109, WEEZING: 110,
  RHYHORN: 111, RHYDON: 112,
  CHANSEY: 113,
  TANGELA: 114,
  KANGASKHAN: 115,
  HORSEA: 116, SEADRA: 117,
  GOLDEEN: 118, SEAKING: 119,
  STARYU: 120, STARMIE: 121,
  MR_MIME: 122,
  SCYTHER: 123,
  JYNX: 124,
  ELECTABUZZ: 125,
  MAGMAR: 126,
  PINSIR: 127,
  TAUROS: 128,
  MAGIKARP: 129, GYARADOS: 130,
  LAPRAS: 131,
  DITTO: 132,
  EEVEE: 133, VAPOREON: 134, JOLTEON: 135, FLAREON: 136,
  PORYGON: 137,
  OMANYTE: 138, OMASTAR: 139,
  KABUTO: 140, KABUTOPS: 141,
  AERODACTYL: 142,
  SNORLAX: 143,
  ARTICUNO: 144, ZAPDOS: 145, MOLTRES: 146,
  DRATINI: 147, DRAGONAIR: 148, DRAGONITE: 149,
  MEWTWO: 150, MEW: 151,
};

// ── Trainer class data label → display name + OPP constant ──────────────────
// Order matches TrainerDataPointers in parties.asm (1-indexed for OPP)
const TRAINER_CLASSES: {
  label: string;
  displayName: string;
  oppConst: string;
  isBoss: boolean;
}[] = [
  { label: "YoungsterData", displayName: "Youngster", oppConst: "OPP_YOUNGSTER", isBoss: false },
  { label: "BugCatcherData", displayName: "Bug Catcher", oppConst: "OPP_BUG_CATCHER", isBoss: false },
  { label: "LassData", displayName: "Lass", oppConst: "OPP_LASS", isBoss: false },
  { label: "SailorData", displayName: "Sailor", oppConst: "OPP_SAILOR", isBoss: false },
  { label: "JrTrainerMData", displayName: "Jr. Trainer (M)", oppConst: "OPP_JR_TRAINER_M", isBoss: false },
  { label: "JrTrainerFData", displayName: "Jr. Trainer (F)", oppConst: "OPP_JR_TRAINER_F", isBoss: false },
  { label: "PokemaniacData", displayName: "Pokemaniac", oppConst: "OPP_POKEMANIAC", isBoss: false },
  { label: "SuperNerdData", displayName: "Super Nerd", oppConst: "OPP_SUPER_NERD", isBoss: false },
  { label: "HikerData", displayName: "Hiker", oppConst: "OPP_HIKER", isBoss: false },
  { label: "BikerData", displayName: "Biker", oppConst: "OPP_BIKER", isBoss: false },
  { label: "BurglarData", displayName: "Burglar", oppConst: "OPP_BURGLAR", isBoss: false },
  { label: "EngineerData", displayName: "Engineer", oppConst: "OPP_ENGINEER", isBoss: false },
  { label: "UnusedJugglerData", displayName: "Unused Juggler", oppConst: "OPP_UNUSED_JUGGLER", isBoss: false },
  { label: "FisherData", displayName: "Fisher", oppConst: "OPP_FISHER", isBoss: false },
  { label: "SwimmerData", displayName: "Swimmer", oppConst: "OPP_SWIMMER", isBoss: false },
  { label: "CueBallData", displayName: "Cue Ball", oppConst: "OPP_CUE_BALL", isBoss: false },
  { label: "GamblerData", displayName: "Gambler", oppConst: "OPP_GAMBLER", isBoss: false },
  { label: "BeautyData", displayName: "Beauty", oppConst: "OPP_BEAUTY", isBoss: false },
  { label: "PsychicData", displayName: "Psychic", oppConst: "OPP_PSYCHIC_TR", isBoss: false },
  { label: "RockerData", displayName: "Rocker", oppConst: "OPP_ROCKER", isBoss: false },
  { label: "JugglerData", displayName: "Juggler", oppConst: "OPP_JUGGLER", isBoss: false },
  { label: "TamerData", displayName: "Tamer", oppConst: "OPP_TAMER", isBoss: false },
  { label: "BirdKeeperData", displayName: "Bird Keeper", oppConst: "OPP_BIRD_KEEPER", isBoss: false },
  { label: "BlackbeltData", displayName: "Blackbelt", oppConst: "OPP_BLACKBELT", isBoss: false },
  { label: "Rival1Data", displayName: "Rival", oppConst: "OPP_RIVAL1", isBoss: true },
  { label: "ProfOakData", displayName: "Prof. Oak", oppConst: "OPP_PROF_OAK", isBoss: true },
  { label: "ChiefData", displayName: "Chief", oppConst: "OPP_CHIEF", isBoss: false },
  { label: "ScientistData", displayName: "Scientist", oppConst: "OPP_SCIENTIST", isBoss: false },
  { label: "GiovanniData", displayName: "Giovanni", oppConst: "OPP_GIOVANNI", isBoss: true },
  { label: "RocketData", displayName: "Team Rocket Grunt", oppConst: "OPP_ROCKET", isBoss: false },
  { label: "CooltrainerMData", displayName: "Cooltrainer (M)", oppConst: "OPP_COOLTRAINER_M", isBoss: false },
  { label: "CooltrainerFData", displayName: "Cooltrainer (F)", oppConst: "OPP_COOLTRAINER_F", isBoss: false },
  { label: "BrunoData", displayName: "Bruno", oppConst: "OPP_BRUNO", isBoss: true },
  { label: "BrockData", displayName: "Brock", oppConst: "OPP_BROCK", isBoss: true },
  { label: "MistyData", displayName: "Misty", oppConst: "OPP_MISTY", isBoss: true },
  { label: "LtSurgeData", displayName: "Lt. Surge", oppConst: "OPP_LT_SURGE", isBoss: true },
  { label: "ErikaData", displayName: "Erika", oppConst: "OPP_ERIKA", isBoss: true },
  { label: "KogaData", displayName: "Koga", oppConst: "OPP_KOGA", isBoss: true },
  { label: "BlaineData", displayName: "Blaine", oppConst: "OPP_BLAINE", isBoss: true },
  { label: "SabrinaData", displayName: "Sabrina", oppConst: "OPP_SABRINA", isBoss: true },
  { label: "GentlemanData", displayName: "Gentleman", oppConst: "OPP_GENTLEMAN", isBoss: false },
  { label: "Rival2Data", displayName: "Rival", oppConst: "OPP_RIVAL2", isBoss: true },
  { label: "Rival3Data", displayName: "Rival", oppConst: "OPP_RIVAL3", isBoss: true },
  { label: "LoreleiData", displayName: "Lorelei", oppConst: "OPP_LORELEI", isBoss: true },
  { label: "ChannelerData", displayName: "Channeler", oppConst: "OPP_CHANNELER", isBoss: false },
  { label: "AgathaData", displayName: "Agatha", oppConst: "OPP_AGATHA", isBoss: true },
  { label: "LanceData", displayName: "Lance", oppConst: "OPP_LANCE", isBoss: true },
];

// ── pret map name → location_key ────────────────────────────────────────────
const MAP_TO_LOCATION: Record<string, string> = {
  // Routes
  Route1: "route-1",
  Route2: "route-2-south",
  Route3: "route-3",
  Route4: "route-4",
  Route5: "route-5",
  Route6: "route-6",
  Route7: "route-7",
  Route8: "route-8",
  Route9: "route-9",
  Route10: "route-10",
  Route11: "route-11",
  Route12: "route-12",
  Route13: "route-13",
  Route14: "route-14",
  Route15: "route-15",
  Route16: "route-16",
  Route17: "route-17",
  Route18: "route-18",
  Route19: "route-19",
  Route20: "route-20",
  Route21: "route-21",
  Route22: "route-22",
  Route23: "route-23",
  Route24: "route-24",
  Route25: "route-25",
  // Cities / Towns
  PalletTown: "pallet-town",
  ViridianCity: "viridian-city",
  PewterCity: "pewter-city",
  CeruleanCity: "cerulean-city",
  VermilionCity: "vermilion-city",
  LavenderTown: "lavender-town",
  CeladonCity: "celadon-city",
  SaffronCity: "saffron-city",
  FuchsiaCity: "fuchsia-city",
  CinnabarIsland: "cinnabar-island",
  // Gyms → city
  PewterGym: "pewter-city",
  CeruleanGym: "cerulean-city",
  VermilionGym: "vermilion-city",
  CeladonGym: "celadon-city",
  FuchsiaGym: "fuchsia-city",
  SaffronGym: "saffron-city",
  CinnabarGym: "cinnabar-island",
  ViridianGym: "viridian-gym",
  // Viridian Forest
  ViridianForest: "viridian-forest",
  // Mt. Moon (all floors)
  MtMoon1F: "mt-moon",
  MtMoonB1F: "mt-moon",
  MtMoonB2F: "mt-moon",
  // Rock Tunnel
  RockTunnel1F: "rock-tunnel",
  RockTunnelB1F: "rock-tunnel",
  // SS Anne
  SSAnne1FRooms: "ss-anne",
  SSAnne2FRooms: "ss-anne",
  SSAnneStern: "ss-anne",
  SSAnneB1FRooms: "ss-anne",
  SSAnne2F: "ss-anne",
  // Pokemon Tower
  PokemonTower2F: "pokemon-tower",
  PokemonTower3F: "pokemon-tower",
  PokemonTower4F: "pokemon-tower",
  PokemonTower5F: "pokemon-tower",
  PokemonTower6F: "pokemon-tower",
  PokemonTower7F: "pokemon-tower",
  // Rocket Hideout → Celadon City
  RocketHideoutB1F: "celadon-city",
  RocketHideoutB2F: "celadon-city",
  RocketHideoutB3F: "celadon-city",
  RocketHideoutB4F: "celadon-city",
  GameCorner: "celadon-city",
  // Silph Co → Saffron City
  SilphCo2F: "saffron-city",
  SilphCo3F: "saffron-city",
  SilphCo4F: "saffron-city",
  SilphCo5F: "saffron-city",
  SilphCo6F: "saffron-city",
  SilphCo7F: "saffron-city",
  SilphCo8F: "saffron-city",
  SilphCo9F: "saffron-city",
  SilphCo10F: "saffron-city",
  SilphCo11F: "saffron-city",
  // Fighting Dojo → Saffron
  FightingDojo: "saffron-city",
  // Victory Road
  VictoryRoad1F: "victory-road",
  VictoryRoad2F: "victory-road",
  VictoryRoad3F: "victory-road",
  // Pokemon Mansion → Cinnabar
  PokemonMansion1F: "pokemon-mansion",
  PokemonMansion2F: "pokemon-mansion",
  PokemonMansion3F: "pokemon-mansion",
  PokemonMansionB1F: "pokemon-mansion",
  Mansion1F: "pokemon-mansion",
  Mansion2F: "pokemon-mansion",
  Mansion3F: "pokemon-mansion",
  MansionB1F: "pokemon-mansion",
  // Safari Zone
  SafariZone: "safari-zone",
  // Power Plant
  PowerPlant: "power-plant",
  // Seafoam Islands
  SeafoamIslands1F: "seafoam-islands",
  SeafoamIslandsB1F: "seafoam-islands",
  SeafoamIslandsB2F: "seafoam-islands",
  SeafoamIslandsB3F: "seafoam-islands",
  SeafoamIslandsB4F: "seafoam-islands",
  // Diglett's Cave
  DiglettsCave: "digletts-cave",
  // Cerulean Cave
  CeruleanCave1F: "cerulean-cave",
  CeruleanCave2F: "cerulean-cave",
  CeruleanCaveB1F: "cerulean-cave",
  // Indigo Plateau
  IndigoPlateau: "indigo-plateau",
  IndigoPlateauLobby: "indigo-plateau",
  LoreleisRoom: "indigo-plateau",
  BrunosRoom: "indigo-plateau",
  AgathasRoom: "indigo-plateau",
  LancesRoom: "indigo-plateau",
  ChampionsRoom: "indigo-plateau",
};

// ── Comment location text → location_key ────────────────────────────────────
// The parties.asm file has comments like "; Route 3" or "; Mt. Moon 1F"
// that tell us where each trainer appears.
const COMMENT_LOCATION_MAP: Record<string, string> = {
  "Route 1": "route-1",
  "Route 2": "route-2-south",
  "Route 3": "route-3",
  "Route 4": "route-4",
  "Route 5": "route-5",
  "Route 6": "route-6",
  "Route 7": "route-7",
  "Route 8": "route-8",
  "Route 9": "route-9",
  "Route 10": "route-10",
  "Route 11": "route-11",
  "Route 12": "route-12",
  "Route 13": "route-13",
  "Route 14": "route-14",
  "Route 15": "route-15",
  "Route 16": "route-16",
  "Route 17": "route-17",
  "Route 18": "route-18",
  "Route 19": "route-19",
  "Route 20": "route-20",
  "Route 21": "route-21",
  "Route 22": "route-22",
  "Route 23": "route-23",
  "Route 24": "route-24",
  "Route 24/Route 25": "route-24",
  "Route 25": "route-25",
  // Cities
  "Pallet Town": "pallet-town",
  "Viridian City": "viridian-city",
  "Pewter City": "pewter-city",
  "Cerulean City": "cerulean-city",
  "Vermilion City": "vermilion-city",
  "Lavender Town": "lavender-town",
  "Celadon City": "celadon-city",
  "Saffron City": "saffron-city",
  "Fuchsia City": "fuchsia-city",
  "Cinnabar Island": "cinnabar-island",
  // Gyms
  "Pewter Gym": "pewter-city",
  "Cerulean Gym": "cerulean-city",
  "Vermilion Gym": "vermilion-city",
  "Celadon Gym": "celadon-city",
  "Fuchsia Gym": "fuchsia-city",
  "Saffron Gym": "saffron-city",
  "Cinnabar Gym": "cinnabar-island",
  "Viridian Gym": "viridian-gym",
  // Forests / Caves
  "Viridian Forest": "viridian-forest",
  "Mt. Moon 1F": "mt-moon",
  "Mt. Moon B1F": "mt-moon",
  "Mt. Moon B2F": "mt-moon",
  "Rock Tunnel 1F": "rock-tunnel",
  "Rock Tunnel B1F": "rock-tunnel",
  // SS Anne
  "SS Anne Stern": "ss-anne",
  "SS Anne 1F Rooms": "ss-anne",
  "SS Anne 2F Rooms": "ss-anne",
  "SS Anne B1F Rooms": "ss-anne",
  "SS Anne 2F": "ss-anne",
  "SS Anne 2F Rooms/Vermilion Gym": "ss-anne",
  // Pokemon Tower
  "Pokémon Tower 2F": "pokemon-tower",
  "Pokémon Tower 3F": "pokemon-tower",
  "Pokémon Tower 4F": "pokemon-tower",
  "Pokémon Tower 5F": "pokemon-tower",
  "Pokémon Tower 6F": "pokemon-tower",
  "Pokémon Tower 7F": "pokemon-tower",
  "Pokemon Tower 2F": "pokemon-tower",
  "Pokemon Tower 3F": "pokemon-tower",
  "Pokemon Tower 4F": "pokemon-tower",
  "Pokemon Tower 5F": "pokemon-tower",
  "Pokemon Tower 6F": "pokemon-tower",
  "Pokemon Tower 7F": "pokemon-tower",
  // Rocket Hideout
  "Rocket Hideout B1F": "celadon-city",
  "Rocket Hideout B2F": "celadon-city",
  "Rocket Hideout B3F": "celadon-city",
  "Rocket Hideout B4F": "celadon-city",
  "Game Corner": "celadon-city",
  // Silph Co
  "Silph Co. 2F": "saffron-city",
  "Silph Co. 3F": "saffron-city",
  "Silph Co. 3F/Mansion 1F": "saffron-city",
  "Silph Co. 4F": "saffron-city",
  "Silph Co. 5F": "saffron-city",
  "Silph Co. 6F": "saffron-city",
  "Silph Co. 7F": "saffron-city",
  "Silph Co. 8F": "saffron-city",
  "Silph Co. 9F": "saffron-city",
  "Silph Co. 10F": "saffron-city",
  "Silph Co. 11F": "saffron-city",
  // Fighting Dojo
  "Fighting Dojo": "saffron-city",
  // Victory Road
  "Victory Road 1F": "victory-road",
  "Victory Road 2F": "victory-road",
  "Victory Road 3F": "victory-road",
  // Pokemon Mansion
  "Mansion 1F": "pokemon-mansion",
  "Mansion 2F": "pokemon-mansion",
  "Mansion 3F": "pokemon-mansion",
  "Mansion B1F": "pokemon-mansion",
  "Pokemon Mansion 1F": "pokemon-mansion",
  "Pokemon Mansion 2F": "pokemon-mansion",
  "Pokemon Mansion 3F": "pokemon-mansion",
  "Pokemon Mansion B1F": "pokemon-mansion",
  // Safari Zone
  "Safari Zone": "safari-zone",
  // Power Plant
  "Power Plant": "power-plant",
  // Seafoam Islands
  "Seafoam Islands": "seafoam-islands",
  // Diglett's Cave
  "Diglett's Cave": "digletts-cave",
  // Cerulean Cave
  "Cerulean Cave": "cerulean-cave",
  // Indigo Plateau (E4 rooms)
  "Indigo Plateau": "indigo-plateau",
};

interface TrainerParty {
  species_id: number;
  level: number;
}

interface TrainerEntry {
  location_key: string;
  trainer_class: string;
  trainer_name: string;
  is_boss: boolean;
  is_rematchable: boolean;
  party: TrainerParty[];
}

// ── Fetch with file cache ───────────────────────────────────────────────────
async function cachedFetch(url: string, cacheName: string): Promise<string> {
  const cachePath = join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }
  console.log(`  Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  writeFileSync(cachePath, text, "utf-8");
  return text;
}

// ── Parse parties.asm ───────────────────────────────────────────────────────
// Returns map of class label → array of { locationComment, party[] }
function parseParties(asm: string): Map<
  string,
  { locationComment: string; party: TrainerParty[] }[]
> {
  const result = new Map<
    string,
    { locationComment: string; party: TrainerParty[] }[]
  >();

  const lines = asm.split("\n");
  let currentLabel: string | null = null;
  let currentLocation = "Unknown";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and the pointer table at the top
    if (!trimmed) continue;

    // Detect class data labels (e.g., "YoungsterData:")
    const labelMatch = trimmed.match(/^(\w+Data):$/);
    if (labelMatch) {
      currentLabel = labelMatch[1];
      currentLocation = "Unknown";
      if (!result.has(currentLabel)) {
        result.set(currentLabel, []);
      }
      continue;
    }

    // Detect location comments (e.g., "; Route 3" or "; Mt. Moon 1F")
    const commentMatch = trimmed.match(/^; (.+)$/);
    if (commentMatch && currentLabel) {
      // Only update location if this looks like a location comment
      // (not a code comment about the data format or Smogon quote)
      const commentText = commentMatch[1].trim();
      // Skip meta-comments (code format comments, Smogon quotes, etc.)
      if (
        commentText.startsWith("if ") ||
        commentText.startsWith("first ") ||
        commentText.startsWith("every ") ||
        commentText.startsWith("all ") ||
        commentText.startsWith("null") ||
        commentText.startsWith("From ") ||
        commentText.startsWith("0E:") ||
        commentText.startsWith("(") ||
        commentText.startsWith("that") ||
        commentText.startsWith("The ") ||
        commentText.startsWith("Finally") ||
        commentText.startsWith("for ") ||
        commentText === "none" ||
        commentText.includes("trainer 1") ||
        commentText.includes("trainer 2") ||
        commentText.includes("BaseStats") ||
        commentText.includes("GetMonHeader") ||
        commentText.includes("PokedexOrder") ||
        commentText.includes("MissingNo")
      ) {
        continue;
      }
      currentLocation = commentText;
      continue;
    }

    // Parse db lines (trainer parties)
    const dbMatch = trimmed.match(/^db\s+(.+?)(?:\s*;.*)?$/);
    if (dbMatch && currentLabel) {
      const entries = result.get(currentLabel)!;
      const rawData = dbMatch[1];
      const tokens = rawData
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (tokens.length === 0) continue;

      const party: TrainerParty[] = [];

      if (tokens[0] === "$FF") {
        // Explicit level per mon: $FF, level1, species1, level2, species2, ..., 0
        for (let i = 1; i < tokens.length - 1; i += 2) {
          const level = parseInt(tokens[i], 10);
          const speciesName = tokens[i + 1];
          if (speciesName === "0") break;
          const speciesId = SPECIES_TO_DEX[speciesName];
          if (!speciesId) {
            console.warn(
              `  Unknown species: ${speciesName} in ${currentLabel}`
            );
            continue;
          }
          party.push({ species_id: speciesId, level });
        }
      } else {
        // Shared level: level, species1, species2, ..., 0
        const level = parseInt(tokens[0], 10);
        for (let i = 1; i < tokens.length; i++) {
          if (tokens[i] === "0") break;
          const speciesName = tokens[i];
          const speciesId = SPECIES_TO_DEX[speciesName];
          if (!speciesId) {
            console.warn(
              `  Unknown species: ${speciesName} in ${currentLabel}`
            );
            continue;
          }
          party.push({ species_id: speciesId, level });
        }
      }

      if (party.length > 0) {
        entries.push({ locationComment: currentLocation, party });
      }
    }
  }

  return result;
}

// ── Resolve location from comment text ──────────────────────────────────────
function resolveLocation(comment: string): string | null {
  // Direct match
  if (COMMENT_LOCATION_MAP[comment]) {
    return COMMENT_LOCATION_MAP[comment];
  }

  // Try without accents (Pokémon → Pokemon)
  const normalized = comment.replace(/é/g, "e");
  if (COMMENT_LOCATION_MAP[normalized]) {
    return COMMENT_LOCATION_MAP[normalized];
  }

  // Handle slash-separated locations (e.g., "Route 9/Rock Tunnel B1F")
  if (comment.includes("/")) {
    const parts = comment.split("/");
    for (const part of parts) {
      const loc = resolveLocation(part.trim());
      if (loc) return loc;
    }
  }

  return null;
}

// ── Determine boss location from class context ──────────────────────────────
// For gym leaders/E4/champion who have only 1 trainer entry, we know their location
function getBossLocation(label: string): string | null {
  const bossLocations: Record<string, string> = {
    // Rival1Data first 3 entries have no location comment (Oak's Lab)
    Rival1Data: "pallet-town",
    BrockData: "pewter-city",
    MistyData: "cerulean-city",
    LtSurgeData: "vermilion-city",
    ErikaData: "celadon-city",
    KogaData: "fuchsia-city",
    SabrinaData: "saffron-city",
    BlaineData: "cinnabar-island",
    BrunoData: "indigo-plateau",
    LoreleiData: "indigo-plateau",
    AgathaData: "indigo-plateau",
    LanceData: "indigo-plateau",
    Rival3Data: "indigo-plateau",
  };
  return bossLocations[label] ?? null;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  console.log("Fetching trainer parties ASM...");
  const partiesAsm = await cachedFetch(PARTIES_URL, "parties.asm");

  console.log("Parsing trainer parties...");
  const classParties = parseParties(partiesAsm);

  const trainers: TrainerEntry[] = [];
  const unmappedLocations = new Set<string>();

  for (const classDef of TRAINER_CLASSES) {
    const entries = classParties.get(classDef.label);
    if (!entries || entries.length === 0) {
      // Empty classes like ChiefData, UnusedJugglerData
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let locationKey: string | null = null;

      // Try to resolve from comment
      if (entry.locationComment !== "Unknown") {
        locationKey = resolveLocation(entry.locationComment);
        if (!locationKey && entry.locationComment !== "Unused") {
          unmappedLocations.add(
            `${classDef.label}[${i}]: "${entry.locationComment}"`
          );
        }
      }

      // For bosses with known locations, use that
      if (!locationKey && classDef.isBoss) {
        locationKey = getBossLocation(classDef.label);
      }

      // Skip trainers marked "Unused" with no location
      if (!locationKey && entry.locationComment === "Unused") {
        continue;
      }

      trainers.push({
        location_key: locationKey ?? "unknown",
        trainer_class: classDef.displayName,
        trainer_name: "Unknown",
        is_boss: classDef.isBoss,
        is_rematchable: false,
        party: entry.party,
      });
    }
  }

  if (unmappedLocations.size > 0) {
    console.warn(`\nUnmapped locations:`);
    for (const loc of unmappedLocations) {
      console.warn(`  ${loc}`);
    }
  }

  // Stats
  const byClass = new Map<string, number>();
  const byLocation = new Map<string, number>();
  for (const t of trainers) {
    byClass.set(t.trainer_class, (byClass.get(t.trainer_class) ?? 0) + 1);
    byLocation.set(t.location_key, (byLocation.get(t.location_key) ?? 0) + 1);
  }

  console.log(`\nTotal trainers: ${trainers.length}`);
  console.log(`Boss trainers: ${trainers.filter((t) => t.is_boss).length}`);
  console.log(`Unique locations: ${byLocation.size}`);
  console.log(`\nTrainers by class:`);
  for (const [cls, count] of [...byClass.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls}: ${count}`);
  }

  console.log(`\nTrainers by location:`);
  for (const [loc, count] of [...byLocation.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${loc}: ${count}`);
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(trainers, null, 2) + "\n", "utf-8");
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
