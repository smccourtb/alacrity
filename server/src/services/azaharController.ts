// server/src/services/azaharController.ts

import dgram from "node:dgram";
import { spawn, type ChildProcess } from "node:child_process";
import { registerProcess, gracefulKill } from "./processRegistry.js";
import path from "node:path";
import { bridgeSaveIn, seedAzaharConfig } from "./saveBridge3ds.js";
import { getEmulatorConfig } from "./emulatorConfigs.js";
import fs from "node:fs";
import os from "node:os";

const SCRIPT_PORT = 45987;
const SCRIPT_HOST = "127.0.0.1";
const REQUEST_VERSION = 1;
const MAX_READ_SIZE = 1024;

enum RequestType {
  ReadMemory = 1,
  WriteMemory = 2,
}

interface AzaharState {
  process: ChildProcess | null;
  displayNum: number;
  xProcess: ChildProcess | null;
  tempDir: string;
  socket: dgram.Socket | null;
  requestId: number;
}

/**
 * Controller for an Azahar (3DS emulator) instance.
 * Manages the emulator lifecycle and communicates via the Citra scripting UDP socket.
 */
export class AzaharController {
  private state: AzaharState;
  private game: string;

  constructor(game: string) {
    this.game = game;
    this.state = {
      process: null,
      displayNum: 0,
      xProcess: null,
      tempDir: "",
      socket: null,
      requestId: 0,
    };
  }

  async launch(romPath: string, savePath: string, useGUI: boolean = false): Promise<void> {
    const config = getEmulatorConfig("3ds");
    this.state.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rng-hunt-"));

    const bridge = bridgeSaveIn(this.state.tempDir, savePath, this.game);
    if (!bridge) {
      throw new Error(`Unknown 3DS game: ${this.game}`);
    }
    const { dataDir } = bridge;
    const configDir = seedAzaharConfig(this.state.tempDir, config);

    if (useGUI) {
      // Use real display for debugging
      const display = process.env.DISPLAY || ":0";
      console.log(`[AzaharController] Launching with GUI on ${display}`);
      console.log(`[AzaharController] ROM: ${romPath}`);
      console.log(`[AzaharController] Save: ${savePath}`);
      console.log(`[AzaharController] DataDir: ${dataDir}`);
      console.log(`[AzaharController] ConfigDir: ${configDir}`);

      this.state.process = spawn(config.binary, [romPath], {
        env: {
          ...process.env,
          DISPLAY: display,
          XDG_DATA_HOME: dataDir,
          XDG_CONFIG_HOME: configDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });

      registerProcess(this.state.process, "Azahar-GUI");
      this.state.process.stdout?.on("data", (d: Buffer) =>
        console.log(`[Azahar] ${d.toString().trim()}`)
      );
      this.state.process.stderr?.on("data", (d: Buffer) =>
        console.error(`[Azahar] ${d.toString().trim()}`)
      );
    } else {
      // Headless with Xvfb
      this.state.displayNum = 200 + Math.floor(Math.random() * 50);
      const display = `:${this.state.displayNum}`;

      this.state.xProcess = spawn("Xvfb", [display, "-screen", "0", "400x480x24"], {
        stdio: "ignore",
        detached: true,
      });
      registerProcess(this.state.xProcess, "Xvfb-RNG");
      await sleep(1000);

      this.state.process = spawn(config.binary, [romPath], {
        env: {
          ...process.env,
          DISPLAY: display,
          XDG_DATA_HOME: dataDir,
          XDG_CONFIG_HOME: configDir,
          QT_QPA_PLATFORM: "xcb",
        },
        stdio: "ignore",
        detached: true,
      });
      registerProcess(this.state.process, "Azahar-headless");
    }

    await this.waitForScriptingServer();
  }

  async launchWithGUI(romPath: string, savePath: string): Promise<void> {
    const config = getEmulatorConfig("3ds");
    this.state.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rng-catch-"));

    const bridge = bridgeSaveIn(this.state.tempDir, savePath, this.game);
    if (!bridge) {
      throw new Error(`Unknown 3DS game: ${this.game}`);
    }
    const { dataDir } = bridge;
    const configDir = seedAzaharConfig(this.state.tempDir, config);

    this.state.process = spawn(config.binary, [romPath], {
      env: {
        ...process.env,
        XDG_DATA_HOME: dataDir,
        XDG_CONFIG_HOME: configDir,
      },
      stdio: "ignore",
      detached: true,
    });
    registerProcess(this.state.process, "Azahar-catch-GUI");
  }

  async readMemory(address: number, size: number): Promise<Buffer> {
    const result = Buffer.alloc(size);
    let offset = 0;
    let remaining = size;

    while (remaining > 0) {
      const chunkSize = Math.min(remaining, MAX_READ_SIZE);
      const chunk = await this.sendReadRequest(address + offset, chunkSize);
      chunk.copy(result, offset);
      offset += chunkSize;
      remaining -= chunkSize;
    }

    return result;
  }

  async readU32(address: number): Promise<number> {
    const buf = await this.readMemory(address, 4);
    return buf.readUInt32LE(0);
  }

  async readTinyMTState(stateAddr: number): Promise<[number, number, number, number]> {
    const buf = await this.readMemory(stateAddr, 16);
    return [
      buf.readUInt32LE(0),
      buf.readUInt32LE(4),
      buf.readUInt32LE(8),
      buf.readUInt32LE(12),
    ];
  }

  async sendKey(key: string): Promise<void> {
    const display = `:${this.state.displayNum}`;
    return new Promise((resolve, reject) => {
      const proc = spawn("xdotool", ["key", "--delay", "50", key], {
        env: { ...process.env, DISPLAY: display },
      });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`xdotool key ${key} failed with code ${code}`));
      });
    });
  }

  async sendKeyHold(key: string, durationMs: number): Promise<void> {
    const display = `:${this.state.displayNum}`;
    const down = spawn("xdotool", ["keydown", key], {
      env: { ...process.env, DISPLAY: display },
    });
    await new Promise<void>((resolve) => down.on("close", () => resolve()));
    await sleep(durationMs);
    const up = spawn("xdotool", ["keyup", key], {
      env: { ...process.env, DISPLAY: display },
    });
    await new Promise<void>((resolve) => up.on("close", () => resolve()));
  }

  async stop(): Promise<void> {
    if (this.state.socket) {
      this.state.socket.close();
      this.state.socket = null;
    }
    if (this.state.process) {
      await gracefulKill(this.state.process, "Azahar");
      this.state.process = null;
    }
    if (this.state.xProcess) {
      await gracefulKill(this.state.xProcess, "Xvfb-RNG", 1000);
      this.state.xProcess = null;
    }
    if (this.state.tempDir) {
      fs.rmSync(this.state.tempDir, { recursive: true, force: true });
    }
  }

  getTempDir(): string {
    return this.state.tempDir;
  }

  private async waitForScriptingServer(timeoutMs: number = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await this.readU32(0x0);
        return;
      } catch {
        await sleep(1000);
      }
    }
    throw new Error(`Azahar scripting server did not respond within ${timeoutMs}ms`);
  }

  private getSocket(): dgram.Socket {
    if (!this.state.socket) {
      this.state.socket = dgram.createSocket("udp4");
    }
    return this.state.socket;
  }

  private async sendReadRequest(address: number, size: number): Promise<Buffer> {
    const socket = this.getSocket();
    const requestId = ++this.state.requestId;

    const header = Buffer.alloc(16);
    header.writeUInt32LE(REQUEST_VERSION, 0);
    header.writeUInt32LE(requestId, 4);
    header.writeUInt32LE(RequestType.ReadMemory, 8);
    header.writeUInt32LE(8, 12);

    const payload = Buffer.alloc(8);
    payload.writeUInt32LE(address, 0);
    payload.writeUInt32LE(size, 4);

    const packet = Buffer.concat([header, payload]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.removeListener("message", handler);
        reject(new Error(`ReadMemory timeout for address 0x${address.toString(16)}`));
      }, 5000);

      const handler = (msg: Buffer) => {
        const respVersion = msg.readUInt32LE(0);
        const respId = msg.readUInt32LE(4);
        const respType = msg.readUInt32LE(8);

        if (
          respVersion === REQUEST_VERSION &&
          respId === requestId &&
          respType === RequestType.ReadMemory
        ) {
          clearTimeout(timeout);
          socket.removeListener("message", handler);
          resolve(msg.subarray(16));
        }
      };

      socket.on("message", handler);
      socket.send(packet, SCRIPT_PORT, SCRIPT_HOST, (err) => {
        if (err) {
          clearTimeout(timeout);
          socket.removeListener("message", handler);
          reject(err);
        }
      });
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
