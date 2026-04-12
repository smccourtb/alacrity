// server/src/services/rng/tsvCalculator.ts

/**
 * Trainer Shiny Value — derived from a trainer's TID and SID.
 * A Pokemon is shiny when its PSV matches the trainer's TSV.
 * Range: 0-4095
 */
export function computeTSV(tid: number, sid: number): number {
  return ((tid ^ sid) >>> 4) & 0xfff;
}

/**
 * Trainer Residual Value — the lower 4 bits lost by the TSV shift.
 * Used to distinguish star shiny (PSV==TSV) from square shiny (PSV==TSV && PRV==TRV).
 */
export function computeTRV(tid: number, sid: number): number {
  return (tid ^ sid) & 0xf;
}

/**
 * Pokemon Shiny Value — derived from a Pokemon's PID.
 * Range: 0-4095
 */
export function computePSV(pid: number): number {
  return (((pid >>> 16) ^ (pid & 0xffff)) >>> 4) & 0xfff;
}

/**
 * Pokemon Residual Value — lower 4 bits of the PID shiny calc.
 */
export function computePRV(pid: number): number {
  return ((pid >>> 16) ^ (pid & 0xffff)) & 0xf;
}

/**
 * Check if a Pokemon is shiny given trainer values and PID.
 */
export function isShiny(tid: number, sid: number, pid: number): boolean {
  return computeTSV(tid, sid) === computePSV(pid);
}

/**
 * Check if a Pokemon is square shiny (rarer variant).
 * Square shiny requires both TSV==PSV and TRV==PRV.
 */
export function isSquareShiny(tid: number, sid: number, pid: number): boolean {
  return isShiny(tid, sid, pid) && computeTRV(tid, sid) === computePRV(pid);
}

/**
 * Extract TSV from a Gen 6/7 save file buffer.
 * TID is at offset 0x0C (u16 LE), SID at 0x0E (u16 LE) within the decrypted trainer block.
 */
export function extractTSVFromSave(
  saveBuffer: Buffer,
  game: string
): { tid: number; sid: number; tsv: number; trv: number } {
  const trainerOffset = getTrainerBlockOffset(game);
  const tid = saveBuffer.readUInt16LE(trainerOffset);
  const sid = saveBuffer.readUInt16LE(trainerOffset + 2);
  return {
    tid,
    sid,
    tsv: computeTSV(tid, sid),
    trv: computeTRV(tid, sid),
  };
}

function getTrainerBlockOffset(game: string): number {
  switch (game) {
    // Gen 4 — TID/SID within the general block of the active partition.
    // These offsets assume reading from the active partition's general block start.
    // The save parser handles partition selection; here we need absolute offsets
    // into the raw save file. Gen 4 saves: partition 0 at 0x0, partition 1 at 0x40000.
    // We check partition 1 first (often the active one for saves from emulators).
    case "Pokemon Diamond":
    case "Pokemon Pearl":
      return 0x40074; // partition 1 (0x40000) + TID offset (0x74)
    case "Pokemon Platinum":
      return 0x40078; // partition 1 (0x40000) + TID offset (0x78)
    case "Pokemon HeartGold":
    case "Pokemon SoulSilver":
      return 0x40074; // partition 1 (0x40000) + TID offset (0x74)
    // Gen 5 — TID at trainer data section
    case "Pokemon Black":
    case "Pokemon White":
      return 0x19414;
    case "Pokemon Black 2":
    case "Pokemon White 2":
      return 0x19414;
    // Gen 6
    case "Pokemon X":
    case "Pokemon Y":
      return 0x14000;
    case "Pokemon Omega Ruby":
    case "Pokemon Alpha Sapphire":
      return 0x14000;
    // Gen 7
    case "Pokemon Sun":
    case "Pokemon Moon":
      return 0x01200;
    case "Pokemon Ultra Sun":
    case "Pokemon Ultra Moon":
      return 0x01400;
    default:
      throw new Error(`Unknown game for TSV extraction: ${game}`);
  }
}
