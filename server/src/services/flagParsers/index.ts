import { readFileSync } from 'fs';
import { join } from 'path';
import type { FlagDefinition, FlagResult, SaveFlagReport } from './types.js';
import { buildFlagReport, readFlag } from './types.js';
import { paths } from '../../paths.js';

const flagsDir = paths.flagsDir;

const FLAG_CONFIGS: Record<string, { offset: number; size: number; gen3?: boolean; extraSystems?: string[] }> = {
  red:        { offset: 0x29F3, size: 320, extraSystems: ['sprites', 'hidden', 'badges'] },
  blue:       { offset: 0x29F3, size: 320, extraSystems: ['sprites', 'hidden', 'badges'] },
  yellow:     { offset: 0x29F3, size: 320, extraSystems: ['sprites', 'hidden', 'badges'] },
  gold:       { offset: 0x261F, size: 256 },
  silver:     { offset: 0x261F, size: 256 },
  crystal:    { offset: 0x2600, size: 256 },
  ruby:       { offset: 0x1220, size: 300, gen3: true },
  sapphire:   { offset: 0x1220, size: 300, gen3: true },
  emerald:    { offset: 0x1270, size: 300, gen3: true },
  firered:    { offset: 0x0EE0, size: 300, gen3: true },
  leafgreen:  { offset: 0x0EE0, size: 300, gen3: true },
  // Gen 4
  diamond:    { offset: 0x0FE8, size: 180 },
  pearl:      { offset: 0x0FE8, size: 180 },
  platinum:   { offset: 0x0FEC, size: 180 },
  heartgold:  { offset: 0x0FE8, size: 180 },
  soulsilver: { offset: 0x0FE8, size: 180 },
  // Gen 5
  black:      { offset: 0x2037C, size: 364 },
  white:      { offset: 0x2037C, size: 364 },
  black2:     { offset: 0x2025E, size: 383 },
  white2:     { offset: 0x2025E, size: 383 },
  // Gen 6
  x:          { offset: 0x1C00, size: 364 },
  y:          { offset: 0x1C00, size: 364 },
  omegaruby:  { offset: 0x1C00, size: 364 },
  alphasapphire: { offset: 0x1C00, size: 364 },
  // Gen 7
  ultrasun:   { offset: 0x025D0, size: 620 },
  ultramoon:  { offset: 0x025D0, size: 620 },
};

function reconstructGen3Save(saveBuffer: Buffer): Buffer {
  const SECTOR_SIZE = 4096;
  const SECTOR_DATA_SIZE = 3968;
  const SECTORS_PER_HALF = 14;
  const HALF_SIZE = SECTOR_SIZE * SECTORS_PER_HALF;

  // Read save counts from first sector of each half
  const saveCountA = saveBuffer.readUInt32LE(0 + 0xFF8);
  const saveCountB = saveBuffer.readUInt32LE(HALF_SIZE + 0xFF8);
  const activeHalfOffset = saveCountB > saveCountA ? HALF_SIZE : 0;

  const sectors: { id: number; data: Buffer }[] = [];
  for (let i = 0; i < SECTORS_PER_HALF; i++) {
    const sectorOffset = activeHalfOffset + i * SECTOR_SIZE;
    const sectorId = saveBuffer.readUInt16LE(sectorOffset + 0xFF4);
    const data = Buffer.from(saveBuffer.subarray(sectorOffset, sectorOffset + SECTOR_DATA_SIZE));
    sectors.push({ id: sectorId, data });
  }
  sectors.sort((a, b) => a.id - b.id);

  return Buffer.concat(sectors.map(s => s.data));
}

const flagDefCache = new Map<string, FlagDefinition[]>();

export function loadFlagDefinitions(game: string): FlagDefinition[] {
  if (flagDefCache.has(game)) return flagDefCache.get(game)!;
  try {
    const raw = readFileSync(join(flagsDir, `${game}.json`), 'utf-8');
    const defs: FlagDefinition[] = JSON.parse(raw);
    flagDefCache.set(game, defs);
    return defs;
  } catch {
    return [];
  }
}

export function parseEventFlags(game: string, saveBuffer: Buffer): SaveFlagReport {
  const defs = loadFlagDefinitions(game);
  if (defs.length === 0) {
    return buildFlagReport(game, []);
  }

  const config = FLAG_CONFIGS[game];
  if (!config) {
    return buildFlagReport(game, []);
  }

  let flagBuffer = saveBuffer;
  if (config.gen3) {
    flagBuffer = reconstructGen3Save(saveBuffer);
  }

  const results: FlagResult[] = defs.map(def => ({
    index: def.index,
    name: def.name,
    category: def.category,
    location_key: def.location_key,
    set: readFlag(flagBuffer, config.offset, def.index),
  }));

  return buildFlagReport(game, results);
}

export function getFlagDefinitions(game: string): FlagDefinition[] {
  return loadFlagDefinitions(game);
}

export { type FlagDefinition, type FlagResult, type SaveFlagReport } from './types.js';
