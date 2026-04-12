// server/src/services/rng/memoryMap.ts

export interface GameMemoryMap {
  generation: 4 | 5 | 6 | 7;
  prngType: "mt19937" | "tinymt" | "sfmt";
  /** Address of the current PRNG seed/state (u32 for MT/LCRNG, multi-word for TinyMT/SFMT) */
  seedAddr: number;
  /** Address of the full MT state array (624 x u32 for MT19937/SFMT) */
  stateAddr: number;
  /** Address of the MT state index */
  stateIndexAddr: number;
  tinySeedAddr?: number;
  partyAddr: number;
  wildAddr: number;
  eggReadyAddr?: number;
  eggDataAddr?: number;
  parent1Addr?: number;
  parent2Addr?: number;
  saveVarAddr?: number;
  /** Gen 4/5: LCRNG seed address (separate from MT) */
  lcrngSeedAddr?: number;
  /** Gen 4/5: initial seed (computed from date/time/delay) address */
  initialSeedAddr?: number;
  sos?: {
    seedAddr: number;
    stateAddr: number;
    indexAddr: number;
    chainLengthAddr: number;
  };
  encounterTypes: EncounterType[];
}

export type EncounterType =
  | "stationary"
  | "wild"
  | "horde"
  | "friend_safari"
  | "dexnav"
  | "sos"
  | "wormhole"
  | "breeding"
  | "gift";

export const MEMORY_MAPS: Record<string, GameMemoryMap> = {
  // ---------------------------------------------------------------------------
  // Gen 4 — MT19937 + LCRNG
  // Memory addresses from RNG Reporter / PokeFinder / PPRNG documentation.
  // NDS ARM9 main RAM starts at 0x02000000.
  // ---------------------------------------------------------------------------

  "Pokemon Diamond": {
    generation: 4,
    prngType: "mt19937",
    seedAddr: 0x021bfb14,       // MT state pointer / initial seed
    stateAddr: 0x021bfb18,      // MT state array (624 x u32)
    stateIndexAddr: 0x021c0b98, // MT index
    lcrngSeedAddr: 0x021bfb10,  // LCRNG current seed
    initialSeedAddr: 0x021bfb14,
    partyAddr: 0x022349b4,
    wildAddr: 0x02241530,
    eggReadyAddr: 0x02238e2c,
    eggDataAddr: 0x02238e30,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon Pearl": {
    generation: 4,
    prngType: "mt19937",
    seedAddr: 0x021bfb14,
    stateAddr: 0x021bfb18,
    stateIndexAddr: 0x021c0b98,
    lcrngSeedAddr: 0x021bfb10,
    initialSeedAddr: 0x021bfb14,
    partyAddr: 0x022349b4,
    wildAddr: 0x02241530,
    eggReadyAddr: 0x02238e2c,
    eggDataAddr: 0x02238e30,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon Platinum": {
    generation: 4,
    prngType: "mt19937",
    seedAddr: 0x021c4e18,
    stateAddr: 0x021c4e1c,
    stateIndexAddr: 0x021c5e9c,
    lcrngSeedAddr: 0x021c4e14,
    initialSeedAddr: 0x021c4e18,
    partyAddr: 0x02280de8,
    wildAddr: 0x0226d964,
    eggReadyAddr: 0x02275260,
    eggDataAddr: 0x02275264,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon HeartGold": {
    generation: 4,
    prngType: "mt19937",
    seedAddr: 0x02110dc0,
    stateAddr: 0x02110dc4,
    stateIndexAddr: 0x02111e44,
    lcrngSeedAddr: 0x02110dbc,
    initialSeedAddr: 0x02110dc0,
    partyAddr: 0x021d27e8,
    wildAddr: 0x021bf364,
    eggReadyAddr: 0x021d6c60,
    eggDataAddr: 0x021d6c64,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon SoulSilver": {
    generation: 4,
    prngType: "mt19937",
    seedAddr: 0x02110dc0,
    stateAddr: 0x02110dc4,
    stateIndexAddr: 0x02111e44,
    lcrngSeedAddr: 0x02110dbc,
    initialSeedAddr: 0x02110dc0,
    partyAddr: 0x021d27e8,
    wildAddr: 0x021bf364,
    eggReadyAddr: 0x021d6c60,
    eggDataAddr: 0x021d6c64,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  // ---------------------------------------------------------------------------
  // Gen 5 — MT19937 (PIDRNG) + separate IVRNG
  // Gen 5 has two separate MTs: one for PID, one for IVs.
  // Addresses from RNG Reporter / PokeFinder documentation.
  // ---------------------------------------------------------------------------

  "Pokemon Black": {
    generation: 5,
    prngType: "mt19937",
    seedAddr: 0x02216084,
    stateAddr: 0x02216088,
    stateIndexAddr: 0x02217108,
    lcrngSeedAddr: 0x02216080,
    initialSeedAddr: 0x02216084,
    partyAddr: 0x022349b4,
    wildAddr: 0x02241530,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon White": {
    generation: 5,
    prngType: "mt19937",
    seedAddr: 0x02216084,
    stateAddr: 0x02216088,
    stateIndexAddr: 0x02217108,
    lcrngSeedAddr: 0x02216080,
    initialSeedAddr: 0x02216084,
    partyAddr: 0x022349b4,
    wildAddr: 0x02241530,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon Black 2": {
    generation: 5,
    prngType: "mt19937",
    seedAddr: 0x0221f500,
    stateAddr: 0x0221f504,
    stateIndexAddr: 0x02220584,
    lcrngSeedAddr: 0x0221f4fc,
    initialSeedAddr: 0x0221f500,
    partyAddr: 0x0221e4cc,
    wildAddr: 0x02200b28,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  "Pokemon White 2": {
    generation: 5,
    prngType: "mt19937",
    seedAddr: 0x0221f500,
    stateAddr: 0x0221f504,
    stateIndexAddr: 0x02220584,
    lcrngSeedAddr: 0x0221f4fc,
    initialSeedAddr: 0x0221f500,
    partyAddr: 0x0221e4cc,
    wildAddr: 0x02200b28,
    encounterTypes: ["stationary", "wild", "breeding", "gift"],
  },

  // ---------------------------------------------------------------------------
  // Gen 6 — TinyMT
  // ---------------------------------------------------------------------------

  "Pokemon X": {
    generation: 6,
    prngType: "tinymt",
    seedAddr: 0x8c52844,
    stateAddr: 0x8c5284c,
    stateIndexAddr: 0x8c52848,
    tinySeedAddr: 0x8c52808,
    partyAddr: 0x8ce1cf8,
    wildAddr: 0x81ff744,
    eggReadyAddr: 0x8c80124,
    eggDataAddr: 0x8c8012c,
    parent1Addr: 0x8c7ff4c,
    parent2Addr: 0x8c8003c,
    saveVarAddr: 0x8c6a6a4,
    encounterTypes: ["stationary", "wild", "horde", "friend_safari", "breeding", "gift"],
  },

  "Pokemon Y": {
    generation: 6,
    prngType: "tinymt",
    seedAddr: 0x8c52844,
    stateAddr: 0x8c5284c,
    stateIndexAddr: 0x8c52848,
    tinySeedAddr: 0x8c52808,
    partyAddr: 0x8ce1cf8,
    wildAddr: 0x81ff744,
    eggReadyAddr: 0x8c80124,
    eggDataAddr: 0x8c8012c,
    parent1Addr: 0x8c7ff4c,
    parent2Addr: 0x8c8003c,
    saveVarAddr: 0x8c6a6a4,
    encounterTypes: ["stationary", "wild", "horde", "friend_safari", "breeding", "gift"],
  },

  "Pokemon Omega Ruby": {
    generation: 6,
    prngType: "tinymt",
    seedAddr: 0x8c59e40,
    stateAddr: 0x8c59e48,
    stateIndexAddr: 0x8c59e44,
    tinySeedAddr: 0x8c59e04,
    partyAddr: 0x8cfb26c,
    wildAddr: 0x81ffa6c,
    eggReadyAddr: 0x8c88358,
    eggDataAddr: 0x8c88360,
    parent1Addr: 0x8c88180,
    parent2Addr: 0x8c88270,
    saveVarAddr: 0x8c71db8,
    encounterTypes: ["stationary", "wild", "horde", "dexnav", "breeding", "gift"],
  },

  "Pokemon Alpha Sapphire": {
    generation: 6,
    prngType: "tinymt",
    seedAddr: 0x8c59e40,
    stateAddr: 0x8c59e48,
    stateIndexAddr: 0x8c59e44,
    tinySeedAddr: 0x8c59e04,
    partyAddr: 0x8cfb26c,
    wildAddr: 0x81ffa6c,
    eggReadyAddr: 0x8c88358,
    eggDataAddr: 0x8c88360,
    parent1Addr: 0x8c88180,
    parent2Addr: 0x8c88270,
    saveVarAddr: 0x8c71db8,
    encounterTypes: ["stationary", "wild", "horde", "dexnav", "breeding", "gift"],
  },

  "Pokemon Sun": {
    generation: 7,
    prngType: "sfmt",
    seedAddr: 0x325a3878,
    stateAddr: 0x33195b88,
    stateIndexAddr: 0x33196548,
    partyAddr: 0x34195e10,
    wildAddr: 0x3002f7b8,
    eggReadyAddr: 0x3313edd8,
    eggDataAddr: 0x3313eddc,
    parent1Addr: 0x3313ec01,
    parent2Addr: 0x3313ecea,
    encounterTypes: ["stationary", "wild", "sos", "breeding", "gift"],
  },

  "Pokemon Moon": {
    generation: 7,
    prngType: "sfmt",
    seedAddr: 0x325a3878,
    stateAddr: 0x33195b88,
    stateIndexAddr: 0x33196548,
    partyAddr: 0x34195e10,
    wildAddr: 0x3002f7b8,
    eggReadyAddr: 0x3313edd8,
    eggDataAddr: 0x3313eddc,
    parent1Addr: 0x3313ec01,
    parent2Addr: 0x3313ecea,
    encounterTypes: ["stationary", "wild", "sos", "breeding", "gift"],
  },

  "Pokemon Ultra Sun": {
    generation: 7,
    prngType: "sfmt",
    seedAddr: 0x32663bf0,
    stateAddr: 0x330d35d8,
    stateIndexAddr: 0x330d3f98,
    partyAddr: 0x33f7fa44,
    wildAddr: 0x3002f9a0,
    eggReadyAddr: 0x3307b1e8,
    eggDataAddr: 0x3307b1ec,
    parent1Addr: 0x3307b011,
    parent2Addr: 0x3307b0fa,
    sos: {
      seedAddr: 0x30038e30,
      stateAddr: 0x30038e30,
      indexAddr: 0x300397f0,
      chainLengthAddr: 0x300397f9,
    },
    encounterTypes: ["stationary", "wild", "sos", "wormhole", "breeding", "gift"],
  },

  "Pokemon Ultra Moon": {
    generation: 7,
    prngType: "sfmt",
    seedAddr: 0x32663bf0,
    stateAddr: 0x330d35d8,
    stateIndexAddr: 0x330d3f98,
    partyAddr: 0x33f7fa44,
    wildAddr: 0x3002f9a0,
    eggReadyAddr: 0x3307b1e8,
    eggDataAddr: 0x3307b1ec,
    parent1Addr: 0x3307b011,
    parent2Addr: 0x3307b0fa,
    sos: {
      seedAddr: 0x30038e30,
      stateAddr: 0x30038e30,
      indexAddr: 0x300397f0,
      chainLengthAddr: 0x300397f9,
    },
    encounterTypes: ["stationary", "wild", "sos", "wormhole", "breeding", "gift"],
  },
};

export function getMemoryMap(game: string): GameMemoryMap {
  const map = MEMORY_MAPS[game];
  if (!map) {
    throw new Error(
      `No memory map for game: ${game}. Supported: ${Object.keys(MEMORY_MAPS).join(", ")}`
    );
  }
  return map;
}

export function getEncounterTypes(game: string): EncounterType[] {
  return getMemoryMap(game).encounterTypes;
}
