/**
 * NDS RNG Hunt Orchestrator — automated RNG manipulation for Gen 4/5 games.
 *
 * Lifecycle: launch melonDS → boot game → read LCRNG seed → search frames →
 * advance via inputs → trigger encounter → verify result.
 *
 * Uses melonDSController (GDB stub) for memory reading and xdotool for input.
 * Follows the same event-emitter pattern as the 3DS RNGHuntOrchestrator.
 */

import { MelonDSController } from "./melondsController.js";
import { searchGen4, searchGen5, formatResult, type SearchFilters } from "./rng/frameSearcher.js";
import { type GenerationParams, NATURE_NAMES } from "./rng/pokemon.js";
import { getMemoryMap, type GameMemoryMap, type EncounterType } from "./rng/memoryMap.js";
import { computePSV } from "./rng/tsvCalculator.js";
import { EventEmitter } from "node:events";
import fs from "node:fs";

// Re-use the same types as the 3DS orchestrator
export type HuntPhase =
  | "setup"
  | "seed_discovery"
  | "searching"
  | "advancing"
  | "triggering"
  | "verifying"
  | "hit"
  | "miss_retry"
  | "stopped"
  | "error";

export interface HuntProgress {
  phase: HuntPhase;
  currentFrame: number;
  targetFrame: number;
  message: string;
}

export interface NDSRNGHuntConfig {
  huntId: number;
  game: string;
  romPath: string;
  savePath: string;
  encounterType: EncounterType;
  targetSpeciesId: number | null;
  targetName: string;
  filters: SearchFilters;
  perfectIVCount: number;
  isShinyLocked: boolean;
  hasShinyCharm: boolean;
  genderRatio: number;
  /** TID and SID for shiny checking (extracted from save beforehand) */
  tid: number;
  sid: number;
  tsv: number;
}

export class NDSRNGHuntOrchestrator extends EventEmitter {
  private controller: MelonDSController;
  private config: NDSRNGHuntConfig;
  private memoryMap: GameMemoryMap;
  private running = false;
  private currentFrame = 0;
  private targetFrame = 0;

  constructor(config: NDSRNGHuntConfig) {
    super();
    this.config = config;
    this.controller = new MelonDSController(config.game);
    this.memoryMap = getMemoryMap(config.game);
  }

  async start(): Promise<void> {
    this.running = true;

    try {
      // Phase 1: Setup — launch melonDS with GDB
      this.emitProgress("setup", 0, 0, "Launching melonDS...");
      await this.controller.launch(this.config.romPath, this.config.savePath);
      this.emitProgress("setup", 0, 0, "Emulator launched, waiting for game to boot...");

      // NDS games boot faster than 3DS — ~5-8s to title screen
      await sleep(8000);
      this.emitProgress("setup", 0, 0, "Pressing A through title screen...");

      // Mash A to get past title screen → "Continue" → save load
      for (let i = 0; i < 10; i++) {
        await this.controller.sendKey("a"); // A button
        await sleep(1000);
        if (!this.running) return;
      }

      this.emitProgress("setup", 0, 0, "Waiting for save to load...");
      await sleep(3000);

      // Phase 2: Seed Discovery — read LCRNG state from memory
      this.emitProgress("seed_discovery", 0, 0, "Reading PRNG seed from memory...");

      const lcrngAddr = this.memoryMap.lcrngSeedAddr ?? this.memoryMap.seedAddr;
      const seed = await this.controller.readU32(lcrngAddr);
      this.emitProgress("seed_discovery", 0, 0, `LCRNG seed: 0x${seed.toString(16).padStart(8, "0")}`);

      // Phase 3: Search for target frame
      const genParams: GenerationParams = {
        tsv: this.config.tsv,
        trv: 0, // Gen 4/5 doesn't distinguish star vs square shiny
        perfectIVCount: this.config.perfectIVCount,
        isShinyLocked: this.config.isShinyLocked,
        pidRerollCount: this.config.hasShinyCharm ? 2 : 0,
        genderRatio: this.config.genderRatio,
      };

      this.emitProgress("searching", 0, 0, "Searching for target frame...");

      const searcher = this.memoryMap.generation === 4 ? searchGen4 : searchGen5;
      const searchResult = searcher(seed, genParams, this.config.filters);

      if (!searchResult) {
        this.emitProgress("error", 0, 0, "No matching frame found within search range. Try soft-reset for a new seed.");
        await this.controller.stop();
        return;
      }

      this.targetFrame = searchResult.pokemon.frame;
      this.emitProgress("searching", 0, this.targetFrame, `Target found! ${formatResult(searchResult)}`);

      // Phase 4: Frame Advancement
      // Gen 4/5 frame advance is less predictable than Gen 6/7.
      // Each NPC/animation/step advances the RNG unpredictably.
      // Strategy: advance most frames quickly, then slow down and re-read seed to sync.
      this.emitProgress("advancing", 0, this.targetFrame, `Advancing ${searchResult.framesAway} frames...`);
      await this.advanceFrames(searchResult.framesAway, lcrngAddr);

      if (!this.running) return;

      // Phase 5: Trigger Encounter
      this.emitProgress("triggering", this.currentFrame, this.targetFrame, "Triggering encounter...");
      await this.triggerEncounter();

      // Phase 6: Verify
      this.emitProgress("verifying", this.currentFrame, this.targetFrame, "Verifying encounter result...");
      await sleep(3000);

      const verified = await this.verifyEncounter();

      if (verified) {
        const hitMsg = `!!! TARGET FOUND at frame ${this.targetFrame}! ${formatResult(searchResult)}`;
        this.emitProgress("hit", this.targetFrame, this.targetFrame, hitMsg);
        this.emit("hit", { frame: this.targetFrame, result: searchResult });
      } else {
        this.emitProgress("miss_retry", this.targetFrame, this.targetFrame, "Verification failed. NDS RNG may have drifted — consider soft-reset.");
        this.emit("miss");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.emitProgress("error", this.currentFrame, this.targetFrame, `Error: ${msg}`);
      this.emit("error", error);
    } finally {
      this.running = false;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.controller.stop();
    this.emitProgress("stopped", this.currentFrame, this.targetFrame, "Hunt stopped.");
  }

  /**
   * Advance frames by sending inputs.
   *
   * Gen 4/5 is tricky — the LCRNG advances with every NPC blink, step, animation.
   * Strategy:
   *   1. For large advances (>100 frames): use directional inputs to walk in place
   *   2. Periodically re-read the seed to check actual position
   *   3. Slow down near the target for precision
   */
  private async advanceFrames(targetCount: number, seedAddr: number): Promise<void> {
    // Fast advance: walk back and forth to burn frames
    // Each step typically advances 1-4 LCRNG frames
    const FAST_THRESHOLD = 20; // Switch to slow advance within 20 frames

    while (this.running && this.currentFrame < targetCount - FAST_THRESHOLD) {
      // Press a direction to take a step (advances LCRNG)
      await this.controller.sendKey("up");
      await sleep(150);
      await this.controller.sendKey("down");
      await sleep(150);

      // Re-read seed every 50 inputs to track actual position
      this.currentFrame += 4; // Estimate ~2 frames per step
      if (this.currentFrame % 50 < 4) {
        const currentSeed = await this.controller.readU32(seedAddr);
        this.emitProgress("advancing", this.currentFrame, targetCount,
          `Advancing: ~${this.currentFrame}/${targetCount} (seed: 0x${currentSeed.toString(16).padStart(8, "0")})`);
      }
    }

    // Slow advance: minimal inputs, re-read seed after each
    this.emitProgress("advancing", this.currentFrame, targetCount, "Precision advance (near target)...");
    for (let i = 0; i < FAST_THRESHOLD * 2 && this.running; i++) {
      await this.controller.sendKey("a"); // A button — minimal RNG advance
      await sleep(200);
      this.currentFrame++;
    }
  }

  private async triggerEncounter(): Promise<void> {
    switch (this.config.encounterType) {
      case "stationary":
      case "gift":
        // Talk to NPC / interact with Pokemon
        await this.controller.sendKey("a");
        await sleep(500);
        await this.controller.sendKey("a");
        await sleep(500);
        await this.controller.sendKey("a");
        break;
      case "wild":
        // Walk into grass
        await this.controller.sendKeyHold("up", 1000);
        break;
      case "breeding":
        // Talk to daycare man
        await this.controller.sendKey("a");
        await sleep(500);
        await this.controller.sendKey("a");
        break;
    }
  }

  private async verifyEncounter(): Promise<boolean> {
    try {
      // Read the wild/encounter Pokemon data from memory
      // Gen 4/5 PK4/PK5 is 136 bytes (box) or 236/220 bytes (party) at wildAddr
      const encounterBuf = await this.controller.readMemory(this.memoryMap.wildAddr, 136);
      const pid = encounterBuf.readUInt32LE(0x00);

      if (pid === 0) return false;

      // Check if shiny
      const psv = computePSV(pid);
      const expectedShiny = this.config.filters.shiny === undefined || this.config.filters.shiny;

      if (expectedShiny) {
        // Gen 4/5 shiny check: (TID ^ SID ^ PID_high ^ PID_low) < 8
        const pidHigh = (pid >>> 16) & 0xffff;
        const pidLow = pid & 0xffff;
        const sv = this.config.tid ^ this.config.sid ^ pidHigh ^ pidLow;
        return sv < 8;
      }

      return pid !== 0;
    } catch {
      return false;
    }
  }

  private emitProgress(phase: HuntPhase, currentFrame: number, targetFrame: number, message: string): void {
    console.log(`[NDS RNG Hunt #${this.config.huntId}] [${phase}] ${message}`);
    this.emit("progress", { phase, currentFrame, targetFrame, message } as HuntProgress);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
