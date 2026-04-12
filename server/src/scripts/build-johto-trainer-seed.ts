/**
 * build-johto-trainer-seed.ts
 *
 * Fetches raw ASM data from pret/pokecrystal on GitHub and produces
 * server/src/seeds/data/crystal-trainers-raw.json with trainer class,
 * name, party (with moves and items).
 *
 * Usage: cd server && npx tsx src/scripts/build-johto-trainer-seed.ts
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const CACHE_DIR = join(dirname(new URL(import.meta.url).pathname), ".cache");
const OUTPUT_PATH = join(
  dirname(new URL(import.meta.url).pathname),
  "..",
  "seeds",
  "data",
  "crystal-trainers-raw.json"
);

const PARTIES_URL =
  "https://raw.githubusercontent.com/pret/pokecrystal/master/data/trainers/parties.asm";

// ── Species name → National Dex ID (all 251) ──────────────────────────────
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
  FARFETCH_D: 83,
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
  MR__MIME: 122,
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
  // Gen 2
  CHIKORITA: 152, BAYLEEF: 153, MEGANIUM: 154,
  CYNDAQUIL: 155, QUILAVA: 156, TYPHLOSION: 157,
  TOTODILE: 158, CROCONAW: 159, FERALIGATR: 160,
  SENTRET: 161, FURRET: 162,
  HOOTHOOT: 163, NOCTOWL: 164,
  LEDYBA: 165, LEDIAN: 166,
  SPINARAK: 167, ARIADOS: 168,
  CROBAT: 169,
  CHINCHOU: 170, LANTURN: 171,
  PICHU: 172, CLEFFA: 173, IGGLYBUFF: 174,
  TOGEPI: 175, TOGETIC: 176,
  NATU: 177, XATU: 178,
  MAREEP: 179, FLAAFFY: 180, AMPHAROS: 181,
  BELLOSSOM: 182,
  MARILL: 183, AZUMARILL: 184,
  SUDOWOODO: 185,
  POLITOED: 186,
  HOPPIP: 187, SKIPLOOM: 188, JUMPLUFF: 189,
  AIPOM: 190,
  SUNKERN: 191, SUNFLORA: 192,
  YANMA: 193,
  WOOPER: 194, QUAGSIRE: 195,
  ESPEON: 196, UMBREON: 197,
  MURKROW: 198,
  SLOWKING: 199,
  MISDREAVUS: 200,
  UNOWN: 201,
  WOBBUFFET: 202,
  GIRAFARIG: 203,
  PINECO: 204, FORRETRESS: 205,
  DUNSPARCE: 206,
  GLIGAR: 207,
  STEELIX: 208,
  SNUBBULL: 209, GRANBULL: 210,
  QWILFISH: 211,
  SCIZOR: 212,
  SHUCKLE: 213,
  HERACROSS: 214,
  SNEASEL: 215,
  TEDDIURSA: 216, URSARING: 217,
  SLUGMA: 218, MAGCARGO: 219,
  SWINUB: 220, PILOSWINE: 221,
  CORSOLA: 222,
  REMORAID: 223, OCTILLERY: 224,
  DELIBIRD: 225,
  MANTINE: 226,
  SKARMORY: 227,
  HOUNDOUR: 228, HOUNDOOM: 229,
  KINGDRA: 230,
  PHANPY: 231, DONPHAN: 232,
  PORYGON2: 233,
  STANTLER: 234,
  SMEARGLE: 235,
  TYROGUE: 236,
  HITMONTOP: 237,
  SMOOCHUM: 238,
  ELEKID: 239,
  MAGBY: 240,
  MILTANK: 241,
  BLISSEY: 242,
  RAIKOU: 243, ENTEI: 244, SUICUNE: 245,
  LARVITAR: 246, PUPITAR: 247, TYRANITAR: 248,
  LUGIA: 249, HO_OH: 250,
  CELEBI: 251,
};

// ── Trainer group labels → display names + boss flags ──────────────────────
const TRAINER_GROUPS: {
  label: string;
  displayName: string;
  isBoss: boolean;
}[] = [
  { label: "FalknerGroup", displayName: "Falkner", isBoss: true },
  { label: "WhitneyGroup", displayName: "Whitney", isBoss: true },
  { label: "BugsyGroup", displayName: "Bugsy", isBoss: true },
  { label: "MortyGroup", displayName: "Morty", isBoss: true },
  { label: "PryceGroup", displayName: "Pryce", isBoss: true },
  { label: "JasmineGroup", displayName: "Jasmine", isBoss: true },
  { label: "ChuckGroup", displayName: "Chuck", isBoss: true },
  { label: "ClairGroup", displayName: "Clair", isBoss: true },
  { label: "Rival1Group", displayName: "Rival", isBoss: true },
  { label: "PokemonProfGroup", displayName: "Pokemon Prof", isBoss: true },
  { label: "WillGroup", displayName: "Will", isBoss: true },
  { label: "PKMNTrainerGroup", displayName: "PKMN Trainer", isBoss: true },
  { label: "BrunoGroup", displayName: "Bruno", isBoss: true },
  { label: "KarenGroup", displayName: "Karen", isBoss: true },
  { label: "KogaGroup", displayName: "Koga", isBoss: true },
  { label: "ChampionGroup", displayName: "Champion", isBoss: true },
  { label: "BrockGroup", displayName: "Brock", isBoss: true },
  { label: "MistyGroup", displayName: "Misty", isBoss: true },
  { label: "LtSurgeGroup", displayName: "Lt. Surge", isBoss: true },
  { label: "ScientistGroup", displayName: "Scientist", isBoss: false },
  { label: "ErikaGroup", displayName: "Erika", isBoss: true },
  { label: "YoungsterGroup", displayName: "Youngster", isBoss: false },
  { label: "SchoolboyGroup", displayName: "Schoolboy", isBoss: false },
  { label: "BirdKeeperGroup", displayName: "Bird Keeper", isBoss: false },
  { label: "LassGroup", displayName: "Lass", isBoss: false },
  { label: "JanineGroup", displayName: "Janine", isBoss: true },
  { label: "CooltrainerMGroup", displayName: "Cooltrainer (M)", isBoss: false },
  { label: "CooltrainerFGroup", displayName: "Cooltrainer (F)", isBoss: false },
  { label: "BeautyGroup", displayName: "Beauty", isBoss: false },
  { label: "PokemaniacGroup", displayName: "Pokemaniac", isBoss: false },
  { label: "GruntMGroup", displayName: "Team Rocket Grunt", isBoss: false },
  { label: "GentlemanGroup", displayName: "Gentleman", isBoss: false },
  { label: "SkierGroup", displayName: "Skier", isBoss: false },
  { label: "TeacherGroup", displayName: "Teacher", isBoss: false },
  { label: "SabrinaGroup", displayName: "Sabrina", isBoss: true },
  { label: "BugCatcherGroup", displayName: "Bug Catcher", isBoss: false },
  { label: "FisherGroup", displayName: "Fisher", isBoss: false },
  { label: "SwimmerMGroup", displayName: "Swimmer (M)", isBoss: false },
  { label: "SwimmerFGroup", displayName: "Swimmer (F)", isBoss: false },
  { label: "SailorGroup", displayName: "Sailor", isBoss: false },
  { label: "SuperNerdGroup", displayName: "Super Nerd", isBoss: false },
  { label: "Rival2Group", displayName: "Rival", isBoss: true },
  { label: "GuitaristGroup", displayName: "Guitarist", isBoss: false },
  { label: "HikerGroup", displayName: "Hiker", isBoss: false },
  { label: "BikerGroup", displayName: "Biker", isBoss: false },
  { label: "BlaineGroup", displayName: "Blaine", isBoss: true },
  { label: "BurglarGroup", displayName: "Burglar", isBoss: false },
  { label: "FirebreatherGroup", displayName: "Firebreather", isBoss: false },
  { label: "JugglerGroup", displayName: "Juggler", isBoss: false },
  { label: "BlackbeltGroup", displayName: "Blackbelt", isBoss: false },
  { label: "ExecutiveMGroup", displayName: "Executive", isBoss: true },
  { label: "PsychicGroup", displayName: "Psychic", isBoss: false },
  { label: "PicnickerGroup", displayName: "Picnicker", isBoss: false },
  { label: "CamperGroup", displayName: "Camper", isBoss: false },
  { label: "ExecutiveFGroup", displayName: "Executive", isBoss: true },
  { label: "SageGroup", displayName: "Sage", isBoss: false },
  { label: "MediumGroup", displayName: "Medium", isBoss: false },
  { label: "BoarderGroup", displayName: "Boarder", isBoss: false },
  { label: "PokefanMGroup", displayName: "Pokefan (M)", isBoss: false },
  { label: "KimonoGirlGroup", displayName: "Kimono Girl", isBoss: false },
  { label: "TwinsGroup", displayName: "Twins", isBoss: false },
  { label: "PokefanFGroup", displayName: "Pokefan (F)", isBoss: false },
  { label: "RedGroup", displayName: "Red", isBoss: true },
  { label: "BlueGroup", displayName: "Blue", isBoss: true },
  { label: "OfficerGroup", displayName: "Officer", isBoss: false },
  { label: "GruntFGroup", displayName: "Team Rocket Grunt", isBoss: false },
  { label: "MysticalmanGroup", displayName: "Mysticalman", isBoss: true },
];

// ── Convert ASM constant to display name ───────────────────────────────────
// MILK_DRINK → "Milk Drink", ROLLOUT → "Rollout", PSYCHIC_M → "Psychic"
function constToDisplayName(constant: string): string {
  // Special cases for disambiguated ASM names
  if (constant === "PSYCHIC_M") return "Psychic";

  return constant
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ── Interfaces ─────────────────────────────────────────────────────────────

interface PartyMember {
  species_id: number;
  level: number;
  moves?: string[];
  item?: string;
}

interface TrainerEntry {
  group: string;
  trainer_class: string;
  trainer_name: string;
  is_boss: boolean;
  is_rematchable: boolean;
  party: PartyMember[];
}

// ── Fetch with file cache ──────────────────────────────────────────────────
async function cachedFetch(url: string, cacheName: string): Promise<string> {
  const cachePath = join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) {
    console.log(`  Using cached ${cacheName}`);
    return readFileSync(cachePath, "utf-8");
  }
  console.log(`  Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  writeFileSync(cachePath, text, "utf-8");
  return text;
}

// ── Parse parties.asm ──────────────────────────────────────────────────────
function parseParties(asm: string): TrainerEntry[] {
  const lines = asm.split("\n");
  const trainers: TrainerEntry[] = [];
  const groupMap = new Map(TRAINER_GROUPS.map((g) => [g.label, g]));
  const unknownSpecies = new Set<string>();

  let currentGroup: (typeof TRAINER_GROUPS)[number] | null = null;
  let currentTrainer: TrainerEntry | null = null;
  let currentType: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect group labels (e.g., "FalknerGroup:")
    const groupMatch = trimmed.match(/^(\w+Group):$/);
    if (groupMatch) {
      currentGroup = groupMap.get(groupMatch[1]) ?? null;
      if (!currentGroup) {
        console.warn(`  Unknown group: ${groupMatch[1]}`);
      }
      currentTrainer = null;
      currentType = null;
      continue;
    }

    if (!currentGroup) continue;

    // Detect trainer name + type line: db "NAME@", TRAINERTYPE_*
    const nameMatch = trimmed.match(
      /^db\s+"([^"]+)@",\s*(TRAINERTYPE_\w+)/
    );
    if (nameMatch) {
      // Finalize previous trainer
      if (currentTrainer && currentTrainer.party.length > 0) {
        trainers.push(currentTrainer);
      }

      const rawName = nameMatch[1];
      const trainerName =
        rawName === "?"
          ? "???"
          : rawName.charAt(0).toUpperCase() +
            rawName.slice(1).toLowerCase();

      // Handle special name formatting (e.g., "LT.SURGE" → "Lt.Surge")
      let displayName = trainerName;
      if (rawName.includes(".")) {
        displayName = rawName
          .split(".")
          .map(
            (part) =>
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join(".");
      }

      currentType = nameMatch[2];
      currentTrainer = {
        group: currentGroup.label,
        trainer_class: currentGroup.displayName,
        trainer_name: displayName,
        is_boss: currentGroup.isBoss,
        is_rematchable: false,
        party: [],
      };
      continue;
    }

    // Detect end marker: db -1
    if (trimmed.match(/^db\s+-1/)) {
      if (currentTrainer && currentTrainer.party.length > 0) {
        trainers.push(currentTrainer);
      }
      currentTrainer = null;
      currentType = null;
      continue;
    }

    // Parse party member lines: db level, SPECIES, [ITEM,] [MOVE1, MOVE2, MOVE3, MOVE4]
    const dbMatch = trimmed.match(/^db\s+(.+?)(?:\s*;.*)?$/);
    if (dbMatch && currentTrainer && currentType) {
      const tokens = dbMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (tokens.length < 2) continue;

      const level = parseInt(tokens[0], 10);
      if (isNaN(level)) continue;

      const speciesConst = tokens[1];
      const speciesId = SPECIES_TO_DEX[speciesConst];
      if (!speciesId) {
        unknownSpecies.add(speciesConst);
        continue;
      }

      const member: PartyMember = { species_id: speciesId, level };

      switch (currentType) {
        case "TRAINERTYPE_NORMAL":
          // db level, SPECIES — no moves, no item
          break;

        case "TRAINERTYPE_MOVES":
          // db level, SPECIES, MOVE1, MOVE2, MOVE3, MOVE4
          {
            const moves: string[] = [];
            for (let i = 2; i < Math.min(tokens.length, 6); i++) {
              const moveConst = tokens[i];
              if (moveConst !== "NO_MOVE") {
                moves.push(constToDisplayName(moveConst));
              }
            }
            if (moves.length > 0) {
              member.moves = moves;
            }
          }
          break;

        case "TRAINERTYPE_ITEM":
          // db level, SPECIES, ITEM
          {
            const itemConst = tokens[2];
            if (itemConst && itemConst !== "NO_ITEM") {
              member.item = constToDisplayName(itemConst);
            }
          }
          break;

        case "TRAINERTYPE_ITEM_MOVES":
          // db level, SPECIES, ITEM, MOVE1, MOVE2, MOVE3, MOVE4
          {
            const itemConst = tokens[2];
            if (itemConst && itemConst !== "NO_ITEM") {
              member.item = constToDisplayName(itemConst);
            }
            const moves: string[] = [];
            for (let i = 3; i < Math.min(tokens.length, 7); i++) {
              const moveConst = tokens[i];
              if (moveConst !== "NO_MOVE") {
                moves.push(constToDisplayName(moveConst));
              }
            }
            if (moves.length > 0) {
              member.moves = moves;
            }
          }
          break;
      }

      currentTrainer.party.push(member);
    }
  }

  // Don't forget the last trainer if file doesn't end with db -1
  if (currentTrainer && currentTrainer.party.length > 0) {
    trainers.push(currentTrainer);
  }

  if (unknownSpecies.size > 0) {
    console.warn(`  Unknown species constants: ${[...unknownSpecies].join(", ")}`);
  }

  return trainers;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  console.log("Fetching Crystal trainer parties ASM...");
  const partiesAsm = await cachedFetch(PARTIES_URL, "crystal-parties.asm");

  console.log("Parsing trainer parties...");
  const trainers = parseParties(partiesAsm);

  // Stats
  const byClass = new Map<string, number>();
  for (const t of trainers) {
    byClass.set(t.trainer_class, (byClass.get(t.trainer_class) ?? 0) + 1);
  }

  console.log(`\nTotal trainers: ${trainers.length}`);
  console.log(`Boss trainers: ${trainers.filter((t) => t.is_boss).length}`);
  console.log(
    `Trainers with moves: ${trainers.filter((t) => t.party.some((p) => p.moves)).length}`
  );
  console.log(
    `Trainers with items: ${trainers.filter((t) => t.party.some((p) => p.item)).length}`
  );

  console.log(`\nTrainers by class:`);
  for (const [cls, count] of [...byClass.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cls}: ${count}`);
  }

  // Verification checks
  console.log("\n── Verification ──");

  const whitney = trainers.find(
    (t) => t.trainer_name === "Whitney" && t.trainer_class === "Whitney"
  );
  if (whitney) {
    console.log(
      `Whitney: ${whitney.party.map((p) => `${SPECIES_NAME[p.species_id]} L${p.level}`).join(", ")}`
    );
    const miltank = whitney.party.find((p) => p.species_id === 241);
    if (miltank?.moves) {
      console.log(`  Miltank moves: ${miltank.moves.join(", ")}`);
    }
  } else {
    console.warn("  WARNING: Whitney not found!");
  }

  const falkner = trainers.find(
    (t) => t.trainer_name === "Falkner" && t.trainer_class === "Falkner"
  );
  if (falkner) {
    console.log(
      `Falkner: ${falkner.party.map((p) => `${SPECIES_NAME[p.species_id]} L${p.level}`).join(", ")}`
    );
  } else {
    console.warn("  WARNING: Falkner not found!");
  }

  const joey = trainers.find(
    (t) => t.trainer_name === "Joey" && t.trainer_class === "Youngster"
  );
  if (joey) {
    console.log(
      `Joey: ${joey.party.map((p) => `${SPECIES_NAME[p.species_id]} L${p.level}`).join(", ")}`
    );
  } else {
    console.warn("  WARNING: Joey not found!");
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(trainers, null, 2) + "\n", "utf-8");
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

// Reverse lookup for verification logging
const SPECIES_NAME: Record<number, string> = {};
for (const [name, id] of Object.entries(SPECIES_TO_DEX)) {
  if (!SPECIES_NAME[id]) {
    SPECIES_NAME[id] =
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase().replace(/_/g, " ");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
