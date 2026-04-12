// server/src/services/rngHuntOrchestrator.ts

import { AzaharController } from "./azaharController.js";
import { searchGen6, searchGen7, formatResult, type SearchFilters } from "./rng/frameSearcher.js";
import { type GenerationParams, NATURE_NAMES } from "./rng/pokemon.js";
import { getMemoryMap, type GameMemoryMap, type EncounterType } from "./rng/memoryMap.js";
import { extractTSVFromSave, computePSV } from "./rng/tsvCalculator.js";
import { EventEmitter } from "node:events";
import fs from "node:fs";

export interface RNGHuntConfig {
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
}

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

/**
 * Orchestrates a full RNG manipulation hunt for Gen 6/7 3DS games.
 * Emits 'progress' events with HuntProgress data for SSE streaming.
 * Emits 'hit' when the target is found.
 * Emits 'error' on failures.
 */
export class RNGHuntOrchestrator extends EventEmitter {
  private controller: AzaharController;
  private config: RNGHuntConfig;
  private memoryMap: GameMemoryMap;
  private running = false;
  private currentFrame = 0;
  private targetFrame = 0;

  constructor(config: RNGHuntConfig) {
    super();
    this.config = config;
    this.controller = new AzaharController(config.game);
    this.memoryMap = getMemoryMap(config.game);
  }

  async start(): Promise<void> {
    this.running = true;

    try {
      // Phase 1: Setup
      this.emitProgress("setup", 0, 0, "Launching Azahar...");
      await this.controller.launch(this.config.romPath, this.config.savePath, true);
      this.emitProgress("setup", 0, 0, "Emulator launched, navigating to save file...");

      // Wait for game to reach title screen, then navigate to save load
      // Title screen takes ~15-20s on 3DS games, then we mash A to get through
      await sleep(15000);
      this.emitProgress("setup", 0, 0, "Pressing A through title screen...");

      // Mash A to get past title screen → main menu → "Continue"
      for (let i = 0; i < 15; i++) {
        await this.controller.sendKey("x"); // A button
        await sleep(1500);
        if (!this.running) return;
      }

      this.emitProgress("setup", 0, 0, "Waiting for save to load...");
      await sleep(5000);

      // Extract TSV from save file
      const saveBuffer = fs.readFileSync(this.config.savePath);
      const { tsv, trv, tid, sid } = extractTSVFromSave(saveBuffer, this.config.game);
      this.emitProgress("setup", 0, 0, `TSV: ${tsv} (TID: ${tid}, SID: ${sid})`);

      const genParams: GenerationParams = {
        tsv,
        trv,
        perfectIVCount: this.config.perfectIVCount,
        isShinyLocked: this.config.isShinyLocked,
        pidRerollCount: this.config.hasShinyCharm ? 2 : 0,
        genderRatio: this.config.genderRatio,
      };

      // Phase 2: Seed Discovery
      this.emitProgress("seed_discovery", 0, 0, "Reading PRNG seed from memory...");
      const searchResult = await this.discoverSeedAndSearch(genParams);

      if (!searchResult) {
        this.emitProgress("error", 0, 0, "No matching frame found within search range. Try different filters or soft-reset.");
        await this.controller.stop();
        return;
      }

      this.targetFrame = searchResult.pokemon.frame;
      this.emitProgress("searching", 0, this.targetFrame, `Target found! ${formatResult(searchResult)}`);

      // Phase 3: Frame Advancement
      this.emitProgress("advancing", 0, this.targetFrame, `Advancing ${searchResult.framesAway} frames...`);
      await this.advanceFrames(searchResult.framesAway);

      if (!this.running) return;

      // Phase 4: Trigger Encounter
      this.emitProgress("triggering", this.targetFrame, this.targetFrame, "Triggering encounter...");
      await this.triggerEncounter();

      // Phase 5: Verify
      this.emitProgress("verifying", this.targetFrame, this.targetFrame, "Verifying encounter result...");
      await sleep(3000);

      const verified = await this.verifyEncounter(genParams);

      if (verified) {
        const hitMsg = `!!! TARGET FOUND at frame ${this.targetFrame}! ${formatResult(searchResult)}`;
        this.emitProgress("hit", this.targetFrame, this.targetFrame, hitMsg);

        this.emitProgress("hit", this.targetFrame, this.targetFrame, "Launching Azahar with GUI for manual catching...");
        await this.controller.stop();

        const guiController = new AzaharController(this.config.game);
        await guiController.launchWithGUI(this.config.romPath, this.config.savePath);

        this.emit("hit", { frame: this.targetFrame, result: searchResult });
      } else {
        this.emitProgress("miss_retry", this.targetFrame, this.targetFrame, "Verification failed (possible timeline drift). Re-reading seed...");
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

  private async discoverSeedAndSearch(genParams: GenerationParams) {
    if (this.memoryMap.prngType === "tinymt") {
      const state = await this.controller.readTinyMTState(this.memoryMap.stateAddr);
      this.emitProgress("seed_discovery", 0, 0, `TinyMT state: [${state.map((s) => "0x" + s.toString(16)).join(", ")}]`);
      return searchGen6(state, genParams, this.config.filters);
    } else {
      const seed = await this.controller.readU32(this.memoryMap.seedAddr);
      this.emitProgress("seed_discovery", 0, 0, `SFMT seed: 0x${seed.toString(16)}`);
      return searchGen7(seed, genParams, this.config.filters);
    }
  }

  private async advanceFrames(count: number): Promise<void> {
    const advancePerAction = 2;
    const actions = Math.ceil(count / advancePerAction);

    for (let i = 0; i < actions && this.running; i++) {
      await this.controller.sendKey("Return");
      await sleep(100);
      await this.controller.sendKey("Return");
      await sleep(100);

      this.currentFrame += advancePerAction;
      if (i % 100 === 0) {
        this.emitProgress("advancing", Math.min(this.currentFrame, this.targetFrame), this.targetFrame, `Advancing: ~${this.currentFrame}/${this.targetFrame} frames`);
      }
    }
  }

  private async triggerEncounter(): Promise<void> {
    switch (this.config.encounterType) {
      case "stationary":
      case "gift":
        await this.controller.sendKey("x");
        await sleep(500);
        await this.controller.sendKey("x");
        break;
      case "wild":
        await this.controller.sendKeyHold("r", 500);
        break;
      case "breeding":
        await this.controller.sendKey("x");
        await sleep(500);
        await this.controller.sendKey("x");
        break;
      case "horde":
        await this.controller.sendKey("x");
        break;
      case "sos":
        await this.controller.sendKey("x");
        await sleep(500);
        await this.controller.sendKey("x");
        break;
      case "friend_safari":
      case "dexnav":
      case "wormhole":
        await this.controller.sendKeyHold("r", 500);
        break;
    }
  }

  private async verifyEncounter(genParams: GenerationParams): Promise<boolean> {
    try {
      const encounterBuf = await this.controller.readMemory(this.memoryMap.wildAddr, 232);
      const ec = encounterBuf.readUInt32LE(0x00);
      const pid = encounterBuf.readUInt32LE(0x18);

      if (ec === 0 && pid === 0) return false;

      const psv = computePSV(pid);
      const expectedShiny = this.config.filters.shiny === undefined || this.config.filters.shiny;

      if (expectedShiny) {
        return psv === genParams.tsv;
      }

      return ec !== 0;
    } catch {
      return false;
    }
  }

  private emitProgress(phase: HuntPhase, currentFrame: number, targetFrame: number, message: string): void {
    console.log(`[RNG Hunt #${this.config.huntId}] [${phase}] ${message}`);
    this.emit("progress", { phase, currentFrame, targetFrame, message } as HuntProgress);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
