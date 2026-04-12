/**
 * map-johto-trainers.ts
 *
 * Fetches pokecrystal map scripts from GitHub, extracts trainer placements,
 * and joins with crystal-trainers-raw.json to produce crystal-trainers.json
 * with location_key added to each trainer.
 *
 * Usage: cd server && npx tsx src/scripts/map-johto-trainers.ts
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const CACHE_DIR = join(SCRIPT_DIR, ".cache");
const MAP_CACHE_DIR = join(CACHE_DIR, "pokecrystal-maps");
const RAW_PATH = join(SCRIPT_DIR, "..", "seeds", "data", "crystal-trainers-raw.json");
const OUTPUT_PATH = join(SCRIPT_DIR, "..", "seeds", "data", "crystal-trainers.json");

const BASE_URL = "https://raw.githubusercontent.com/pret/pokecrystal/master";
const TREE_URL = "https://api.github.com/repos/pret/pokecrystal/git/trees/master?recursive=1";

// ── Map pokecrystal ASM group constants → our group labels ────────────────
// The trainer_constants.asm uses constants like FALKNER, YOUNGSTER, etc.
// We need to map these to the group labels in crystal-trainers-raw.json.
const ASM_GROUP_TO_LABEL: Record<string, string> = {
  FALKNER: "FalknerGroup",
  WHITNEY: "WhitneyGroup",
  BUGSY: "BugsyGroup",
  MORTY: "MortyGroup",
  PRYCE: "PryceGroup",
  JASMINE: "JasmineGroup",
  CHUCK: "ChuckGroup",
  CLAIR: "ClairGroup",
  RIVAL1: "Rival1Group",
  POKEMON_PROF: "PokemonProfGroup",
  WILL: "WillGroup",
  CAL: "PKMNTrainerGroup",
  BRUNO: "BrunoGroup",
  KAREN: "KarenGroup",
  KOGA: "KogaGroup",
  CHAMPION: "ChampionGroup",
  BROCK: "BrockGroup",
  MISTY: "MistyGroup",
  LT_SURGE: "LtSurgeGroup",
  SCIENTIST: "ScientistGroup",
  ERIKA: "ErikaGroup",
  YOUNGSTER: "YoungsterGroup",
  SCHOOLBOY: "SchoolboyGroup",
  BIRD_KEEPER: "BirdKeeperGroup",
  LASS: "LassGroup",
  JANINE: "JanineGroup",
  COOLTRAINERM: "CooltrainerMGroup",
  COOLTRAINERF: "CooltrainerFGroup",
  BEAUTY: "BeautyGroup",
  POKEMANIAC: "PokemaniacGroup",
  GRUNTM: "GruntMGroup",
  GENTLEMAN: "GentlemanGroup",
  SKIER: "SkierGroup",
  TEACHER: "TeacherGroup",
  SABRINA: "SabrinaGroup",
  BUG_CATCHER: "BugCatcherGroup",
  FISHER: "FisherGroup",
  SWIMMERM: "SwimmerMGroup",
  SWIMMERF: "SwimmerFGroup",
  SAILOR: "SailorGroup",
  SUPER_NERD: "SuperNerdGroup",
  RIVAL2: "Rival2Group",
  GUITARIST: "GuitaristGroup",
  HIKER: "HikerGroup",
  BIKER: "BikerGroup",
  BLAINE: "BlaineGroup",
  BURGLAR: "BurglarGroup",
  FIREBREATHER: "FirebreatherGroup",
  JUGGLER: "JugglerGroup",
  BLACKBELT_T: "BlackbeltGroup",
  EXECUTIVEM: "ExecutiveMGroup",
  PSYCHIC_T: "PsychicGroup",
  PICNICKER: "PicnickerGroup",
  CAMPER: "CamperGroup",
  EXECUTIVEF: "ExecutiveFGroup",
  SAGE: "SageGroup",
  MEDIUM: "MediumGroup",
  BOARDER: "BoarderGroup",
  POKEFANM: "PokefanMGroup",
  KIMONO_GIRL: "KimonoGirlGroup",
  TWINS: "TwinsGroup",
  POKEFANF: "PokefanFGroup",
  RED: "RedGroup",
  BLUE: "BlueGroup",
  OFFICER: "OfficerGroup",
  GRUNTF: "GruntFGroup",
  MYSTICALMAN: "MysticalmanGroup",
};

// ── Map pokecrystal map filenames → our location keys ─────────────────────
const MAP_TO_LOCATION: Record<string, string> = {
  // Cities & Towns
  NewBarkTown: "new-bark-town",
  CherrygroveCity: "cherrygrove-city",
  VioletCity: "violet-city",
  AzaleaTown: "azalea-town",
  GoldenrodCity: "goldenrod-city",
  EcruteakCity: "ecruteak-city",
  OlivineCity: "olivine-city",
  CianwoodCity: "cianwood-city",
  MahoganyTown: "mahogany-town",
  BlackthornCity: "blackthorn-city",

  // Routes
  Route26: "route-26",
  Route27: "route-27",
  Route28: "route-28",
  Route29: "route-29",
  Route30: "route-30",
  Route31: "route-31",
  Route32: "route-32",
  Route33: "route-33",
  Route34: "route-34",
  Route35: "route-35",
  Route36: "route-36",
  Route37: "route-37",
  Route38: "route-38",
  Route39: "route-39",
  Route40: "route-40",
  Route41: "route-41",
  Route42: "route-42",
  Route43: "route-43",
  Route44: "route-44",
  Route45: "route-45",
  Route46: "route-46",

  // Gyms → parent city
  VioletGym: "violet-city",
  AzaleaGym: "azalea-town",
  GoldenrodGym: "goldenrod-city",
  EcruteakGym: "ecruteak-city",
  OlivineGym: "olivine-city",
  CianwoodGym: "cianwood-city",
  MahoganyGym: "mahogany-town",
  BlackthornGym1F: "blackthorn-city",
  BlackthornGym2F: "blackthorn-city",

  // Sprout Tower
  SproutTower1F: "sprout-tower",
  SproutTower2F: "sprout-tower",
  SproutTower3F: "sprout-tower",

  // Ruins of Alph
  RuinsOfAlphOutside: "ruins-of-alph",
  RuinsOfAlphInnerChamber: "ruins-of-alph",
  RuinsOfAlphAerodactylChamber: "ruins-of-alph",
  RuinsOfAlphHoOhChamber: "ruins-of-alph",
  RuinsOfAlphKabutoChamber: "ruins-of-alph",
  RuinsOfAlphOmanyteChamber: "ruins-of-alph",
  RuinsOfAlphResearchCenter: "ruins-of-alph",

  // Union Cave
  UnionCave1F: "union-cave",
  UnionCaveB1F: "union-cave",
  UnionCaveB2F: "union-cave",

  // Slowpoke Well
  SlowpokeWellB1F: "slowpoke-well",
  SlowpokeWellB2F: "slowpoke-well",

  // Ilex Forest
  IlexForest: "ilex-forest",

  // National Park
  NationalPark: "national-park",
  NationalParkBugContest: "national-park",

  // Burned Tower
  BurnedTower1F: "burned-tower",
  BurnedTowerB1F: "burned-tower",

  // Tin Tower (Bell Tower)
  TinTower1F: "tin-tower",
  TinTower2F: "tin-tower",
  TinTower3F: "tin-tower",
  TinTower4F: "tin-tower",
  TinTower5F: "tin-tower",
  TinTower6F: "tin-tower",
  TinTower7F: "tin-tower",
  TinTower8F: "tin-tower",
  TinTower9F: "tin-tower",

  // Whirl Islands
  WhirlIslandNE: "whirl-islands",
  WhirlIslandNW: "whirl-islands",
  WhirlIslandSE: "whirl-islands",
  WhirlIslandSW: "whirl-islands",
  WhirlIslandB1F: "whirl-islands",
  WhirlIslandB2F: "whirl-islands",
  WhirlIslandCave: "whirl-islands",
  WhirlIslandLugiaChamber: "whirl-islands",

  // Mt. Mortar
  MountMortar1FInside: "mt-mortar",
  MountMortar1FOutside: "mt-mortar",
  MountMortar2FInside: "mt-mortar",
  MountMortarB1F: "mt-mortar",

  // Ice Path
  IcePath1F: "ice-path",
  IcePathB1F: "ice-path",
  IcePathB2FBlackthornSide: "ice-path",
  IcePathB2FMahoganySide: "ice-path",
  IcePathB3F: "ice-path",

  // Dark Cave
  DarkCaveVioletEntrance: "dark-cave",
  DarkCaveBlackthornEntrance: "dark-cave",

  // Dragons Den
  DragonsDen1F: "dragons-den",
  DragonsDenB1F: "dragons-den",

  // Lake of Rage
  LakeOfRage: "lake-of-rage",

  // Tohjo Falls
  TohjoFalls: "tohjo-falls",

  // Victory Road
  VictoryRoad: "victory-road-gsc",

  // Team Rocket Base → mahogany-town
  TeamRocketBaseB1F: "mahogany-town",
  TeamRocketBaseB2F: "mahogany-town",
  TeamRocketBaseB3F: "mahogany-town",

  // Radio Tower → goldenrod-city
  RadioTower1F: "goldenrod-city",
  RadioTower2F: "goldenrod-city",
  RadioTower3F: "goldenrod-city",
  RadioTower4F: "goldenrod-city",
  RadioTower5F: "goldenrod-city",

  // Goldenrod Underground
  GoldenrodUnderground: "goldenrod-city",
  GoldenrodUndergroundSwitchRoomEntrances: "goldenrod-city",
  GoldenrodUndergroundWarehouse: "goldenrod-city",

  // E4 rooms
  WillsRoom: "indigo-plateau-gsc",
  KogasRoom: "indigo-plateau-gsc",
  BrunosRoom: "indigo-plateau-gsc",
  KarensRoom: "indigo-plateau-gsc",
  LancesRoom: "indigo-plateau-gsc",

  // Mt. Silver
  SilverCaveRoom1: "mt-silver",
  SilverCaveRoom2: "mt-silver",
  SilverCaveRoom3: "mt-silver",
  SilverCaveItemRooms: "mt-silver",

  // Lighthouse → olivine-city
  OlivineLighthouse1F: "olivine-city",
  OlivineLighthouse2F: "olivine-city",
  OlivineLighthouse3F: "olivine-city",
  OlivineLighthouse4F: "olivine-city",
  OlivineLighthouse5F: "olivine-city",
  OlivineLighthouse6F: "olivine-city",

  // Dance Theater → ecruteak-city (Kimono Girls)
  DanceTheater: "ecruteak-city",

  // Wise Trio's Room → ecruteak-city
  WiseTriosRoom: "ecruteak-city",

  // Fast Ship (S.S. Aqua) - special, map to olivine-city
  FastShip1F: "olivine-city",
  FastShipB1F: "olivine-city",
  FastShipCabins_NNW_NNE_NE: "olivine-city",
  FastShipCabins_SE_SSE_CaptainsCabin: "olivine-city",
  FastShipCabins_SW_SSW_NW: "olivine-city",

  // Dragon Shrine → dragons-den
  DragonShrine: "dragons-den",

  // Goldenrod Game Corner
  GoldenrodGameCorner: "goldenrod-game-corner",
};

// ── Interfaces ────────────────────────────────────────────────────────────

interface RawTrainer {
  group: string;
  trainer_class: string;
  trainer_name: string;
  is_boss: boolean;
  is_rematchable: boolean;
  party: {
    species_id: number;
    level: number;
    moves?: string[];
    item?: string;
  }[];
}

interface TrainerWithLocation extends RawTrainer {
  location_key: string | null;
}

// Parsed from trainer_constants.asm: variant constant → 0-based index within group
interface VariantMapping {
  groupConst: string;
  groupLabel: string;
  variantConst: string;
  index: number; // 0-based within group
}

// Parsed from map scripts: which trainer variants appear in which map
interface MapTrainerRef {
  mapName: string;
  locationKey: string;
  groupConst: string;
  variantConst: string;
}

// ── Fetch with file cache ─────────────────────────────────────────────────
async function cachedFetch(url: string, cachePath: string): Promise<string> {
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }
  console.log(`  Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, text, "utf-8");
  return text;
}

// ── Parse trainer_constants.asm ───────────────────────────────────────────
// Builds a mapping: (groupConst, variantConst) → 0-based index within group
function parseTrainerConstants(asm: string): Map<string, VariantMapping> {
  const lines = asm.split("\n");
  const result = new Map<string, VariantMapping>();
  let currentGroup: string | null = null;
  let indexInGroup = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect trainerclass declaration: trainerclass FALKNER ; 1
    const classMatch = trimmed.match(/^trainerclass\s+(\w+)/);
    if (classMatch) {
      currentGroup = classMatch[1];
      indexInGroup = 0;
      continue;
    }

    // Detect const lines: const FALKNER1
    if (currentGroup) {
      const constMatch = trimmed.match(/^const\s+(\w+)/);
      if (constMatch) {
        const variantConst = constMatch[1];
        const groupLabel = ASM_GROUP_TO_LABEL[currentGroup];
        if (groupLabel) {
          const key = `${currentGroup}:${variantConst}`;
          result.set(key, {
            groupConst: currentGroup,
            groupLabel,
            variantConst,
            index: indexInGroup,
          });
        }
        indexInGroup++;
        continue;
      }
    }
  }

  return result;
}

// ── Parse a map .asm file for trainer references ──────────────────────────
function parseMapTrainers(
  mapName: string,
  asm: string,
  locationKey: string
): MapTrainerRef[] {
  const refs: MapTrainerRef[] = [];
  const seen = new Set<string>();

  for (const line of asm.split("\n")) {
    const trimmed = line.trim();

    // Match: trainer GROUP, VARIANT, ...
    // Match: loadtrainer GROUP, VARIANT
    const trainerMatch = trimmed.match(
      /^(?:trainer|loadtrainer)\s+(\w+),\s*(\w+)/
    );
    if (trainerMatch) {
      const groupConst = trainerMatch[1];
      const variantConst = trainerMatch[2];
      const key = `${groupConst}:${variantConst}`;

      // Deduplicate within same map (loadtrainer for rematches)
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ mapName, locationKey, groupConst, variantConst });
      }
    }
  }

  return refs;
}

// ── Get list of all map .asm files from GitHub ────────────────────────────
async function getMapFileList(): Promise<string[]> {
  const cachePath = join(CACHE_DIR, "pokecrystal-tree.json");
  const text = await cachedFetch(TREE_URL, cachePath);
  const data = JSON.parse(text);
  const tree: { path: string }[] = data.tree || [];
  return tree
    .filter((t) => t.path.startsWith("maps/") && t.path.endsWith(".asm"))
    .map((t) => t.path);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(MAP_CACHE_DIR, { recursive: true });

  // 1. Load raw trainers
  console.log("Loading crystal-trainers-raw.json...");
  const rawTrainers: RawTrainer[] = JSON.parse(
    readFileSync(RAW_PATH, "utf-8")
  );
  console.log(`  ${rawTrainers.length} raw trainers loaded`);

  // Index trainers by group
  const trainersByGroup = new Map<string, RawTrainer[]>();
  for (const t of rawTrainers) {
    const list = trainersByGroup.get(t.group) || [];
    list.push(t);
    trainersByGroup.set(t.group, list);
  }

  // 2. Fetch and parse trainer_constants.asm
  console.log("Fetching trainer_constants.asm...");
  const constantsAsm = await cachedFetch(
    `${BASE_URL}/constants/trainer_constants.asm`,
    join(CACHE_DIR, "trainer_constants.asm")
  );
  const variantMap = parseTrainerConstants(constantsAsm);
  console.log(`  ${variantMap.size} variant constants parsed`);

  // 3. Get list of map files and determine which ones we care about
  console.log("Fetching map file list...");
  const allMapFiles = await getMapFileList();
  console.log(`  ${allMapFiles.length} total map files`);

  // Filter to maps that have a location mapping
  const relevantMaps: { path: string; mapName: string; locationKey: string }[] =
    [];
  for (const path of allMapFiles) {
    // maps/Route30.asm → Route30
    const mapName = path.replace("maps/", "").replace(".asm", "");
    const locationKey = MAP_TO_LOCATION[mapName];
    if (locationKey) {
      relevantMaps.push({ path, mapName, locationKey });
    }
  }
  console.log(`  ${relevantMaps.length} maps with location mappings`);

  // 4. Fetch each relevant map file and extract trainer references
  console.log("Fetching map scripts...");
  const allRefs: MapTrainerRef[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < relevantMaps.length; i += BATCH_SIZE) {
    const batch = relevantMaps.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ path, mapName, locationKey }) => {
        const cachePath = join(
          MAP_CACHE_DIR,
          path.replace(/\//g, "_")
        );
        const asm = await cachedFetch(`${BASE_URL}/${path}`, cachePath);
        return parseMapTrainers(mapName, asm, locationKey);
      })
    );
    for (const refs of results) {
      allRefs.push(...refs);
    }
  }
  console.log(`  ${allRefs.length} trainer references found in map scripts`);

  // 5. Build location map: (groupLabel, index) → location_key
  // Some trainers appear in multiple maps (e.g., rematch variants).
  // Use the first occurrence for location.
  const locationMap = new Map<string, string>(); // "GroupLabel:index" → location_key
  const unmappedVariants: { ref: MapTrainerRef; reason: string }[] = [];

  for (const ref of allRefs) {
    const key = `${ref.groupConst}:${ref.variantConst}`;
    const variant = variantMap.get(key);
    if (!variant) {
      unmappedVariants.push({
        ref,
        reason: `variant ${key} not found in trainer_constants.asm`,
      });
      continue;
    }

    const locKey = `${variant.groupLabel}:${variant.index}`;
    if (!locationMap.has(locKey)) {
      locationMap.set(locKey, ref.locationKey);
    }
  }

  // 6. Assign location_key to each raw trainer
  const output: TrainerWithLocation[] = [];
  const groupCounters = new Map<string, number>();
  const unmatchedTrainers: { trainer: RawTrainer; index: number }[] = [];

  for (const trainer of rawTrainers) {
    const idx = groupCounters.get(trainer.group) || 0;
    groupCounters.set(trainer.group, idx + 1);

    const locKey = `${trainer.group}:${idx}`;
    const locationKey = locationMap.get(locKey) || null;

    if (!locationKey) {
      unmatchedTrainers.push({ trainer, index: idx });
    }

    output.push({ ...trainer, location_key: locationKey });
  }

  // 7. Stats and verification
  const withLocation = output.filter((t) => t.location_key !== null);
  const withoutLocation = output.filter((t) => t.location_key === null);

  console.log(`\n── Results ──`);
  console.log(`Total trainers: ${output.length}`);
  console.log(`With location: ${withLocation.length}`);
  console.log(`Without location: ${withoutLocation.length}`);

  // Location distribution
  const byLocation = new Map<string, number>();
  for (const t of withLocation) {
    byLocation.set(
      t.location_key!,
      (byLocation.get(t.location_key!) ?? 0) + 1
    );
  }
  console.log(`\nTrainers by location:`);
  for (const [loc, count] of [...byLocation.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${loc}: ${count}`);
  }

  // Verification
  console.log(`\n── Verification ──`);

  const falkner = output.find(
    (t) => t.trainer_name === "Falkner" && t.trainer_class === "Falkner"
  );
  console.log(
    `Falkner: ${falkner?.location_key} ${falkner?.location_key === "violet-city" ? "OK" : "FAIL"}`
  );

  const whitney = output.find(
    (t) => t.trainer_name === "Whitney" && t.trainer_class === "Whitney"
  );
  console.log(
    `Whitney: ${whitney?.location_key} ${whitney?.location_key === "goldenrod-city" ? "OK" : "FAIL"}`
  );

  // Route 30 trainers
  const route30 = output.filter((t) => t.location_key === "route-30");
  console.log(
    `Route 30 trainers: ${route30.length} (${route30.map((t) => `${t.trainer_class} ${t.trainer_name}`).join(", ")})`
  );

  // Rocket grunts location distribution
  const rocketGrunts = output.filter(
    (t) =>
      t.trainer_class === "Team Rocket Grunt" && t.location_key !== null
  );
  const rocketByLoc = new Map<string, number>();
  for (const g of rocketGrunts) {
    rocketByLoc.set(
      g.location_key!,
      (rocketByLoc.get(g.location_key!) ?? 0) + 1
    );
  }
  console.log(
    `Rocket grunts: ${rocketGrunts.length} across ${rocketByLoc.size} locations`
  );
  for (const [loc, count] of [...rocketByLoc.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${loc}: ${count}`);
  }

  // Log unmapped variants
  if (unmappedVariants.length > 0) {
    console.log(`\n── Unmapped variant references (${unmappedVariants.length}) ──`);
    for (const { ref, reason } of unmappedVariants.slice(0, 20)) {
      console.log(
        `  ${ref.mapName}: ${ref.groupConst} ${ref.variantConst} — ${reason}`
      );
    }
    if (unmappedVariants.length > 20) {
      console.log(`  ... and ${unmappedVariants.length - 20} more`);
    }
  }

  // Log unmatched trainers
  if (unmatchedTrainers.length > 0) {
    console.log(
      `\n── Trainers without location (${unmatchedTrainers.length}) ──`
    );
    for (const { trainer, index } of unmatchedTrainers.slice(0, 30)) {
      console.log(
        `  ${trainer.group}[${index}] ${trainer.trainer_class} ${trainer.trainer_name}`
      );
    }
    if (unmatchedTrainers.length > 30) {
      console.log(`  ... and ${unmatchedTrainers.length - 30} more`);
    }
  }

  // 8. Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
