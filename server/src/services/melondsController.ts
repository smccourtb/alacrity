/**
 * melonDS Controller — Launch and interact with melonDS for NDS RNG hunting.
 *
 * Uses melonDS's built-in GDB stub (ARM9) for memory reading.
 * Protocol: GDB Remote Serial Protocol over TCP.
 *   - Connect to localhost:gdbPort
 *   - Send: $m<addr>,<length>#<checksum>
 *   - Receive: $<hex-encoded-bytes>#<checksum>
 *
 * Also handles emulator launch, input injection (xdotool), and temp dir management.
 */

import net from "node:net";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { registerProcess, gracefulKill } from "./processRegistry.js";
import { getEmulatorConfig } from "./emulatorConfigs.js";
import { seedMelonDSConfig, type MelonDSConfigOptions } from "./melondsConfig.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_GDB_PORT = 3333;
const GDB_CONNECT_TIMEOUT = 30_000; // 30s to wait for GDB stub to accept connections
const GDB_READ_TIMEOUT = 5_000;     // 5s per memory read

// DS key names → X11 keysyms (same map used for xdotool injection)
const MELONDS_KEY_MAP: Record<string, string> = {
  a: "z", b: "x", x: "s", y: "a",
  l: "q", r: "w",
  start: "Return", select: "BackSpace",
  up: "Up", down: "Down", left: "Left", right: "Right",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// GDB Remote Serial Protocol helpers
// ---------------------------------------------------------------------------

function gdbChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data.charCodeAt(i)) & 0xff;
  }
  return sum.toString(16).padStart(2, "0");
}

function buildGdbPacket(data: string): string {
  return `$${data}#${gdbChecksum(data)}`;
}

function parseGdbResponse(raw: string): string | null {
  // GDB response format: +$<data>#<checksum>
  // The '+' is an ACK, then the actual packet follows
  const match = raw.match(/\$([^#]*)#([0-9a-fA-F]{2})/);
  if (!match) return null;
  return match[1];
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

// ---------------------------------------------------------------------------
// GDB Client
// ---------------------------------------------------------------------------

class GdbClient {
  private socket: net.Socket | null = null;
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Connect to the GDB stub, retrying until timeout.
   */
  async connect(timeoutMs = GDB_CONNECT_TIMEOUT): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await this.tryConnect();
        console.log(`[GdbClient] Connected to melonDS GDB stub on port ${this.port}`);
        return;
      } catch {
        await sleep(500);
      }
    }
    throw new Error(`[GdbClient] Could not connect to GDB stub on port ${this.port} after ${timeoutMs}ms`);
  }

  private tryConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = new net.Socket();
      sock.setTimeout(3000);
      sock.once("connect", () => {
        sock.setTimeout(0);
        this.socket = sock;
        resolve();
      });
      sock.once("error", (err) => {
        sock.destroy();
        reject(err);
      });
      sock.once("timeout", () => {
        sock.destroy();
        reject(new Error("timeout"));
      });
      sock.connect(this.port, "127.0.0.1");
    });
  }

  /**
   * Send a GDB command and wait for the response.
   */
  private async sendCommand(cmd: string): Promise<string> {
    if (!this.socket) throw new Error("[GdbClient] Not connected");

    const packet = buildGdbPacket(cmd);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`[GdbClient] Timeout waiting for response to: ${cmd}`));
      }, GDB_READ_TIMEOUT);

      let buffer = "";

      const onData = (data: Buffer) => {
        buffer += data.toString("ascii");
        const parsed = parseGdbResponse(buffer);
        if (parsed !== null) {
          clearTimeout(timeout);
          this.socket!.removeListener("data", onData);
          // Send ACK
          this.socket!.write("+");
          resolve(parsed);
        }
      };

      this.socket!.on("data", onData);
      this.socket!.write(packet);
    });
  }

  /**
   * Read memory from the NDS ARM9 address space.
   * Returns a Buffer of the requested bytes.
   */
  async readMemory(address: number, size: number): Promise<Buffer> {
    const addr = address.toString(16);
    const len = size.toString(16);
    const response = await this.sendCommand(`m${addr},${len}`);

    if (response.startsWith("E")) {
      throw new Error(`[GdbClient] Memory read error at 0x${addr}: ${response}`);
    }

    return hexToBuffer(response);
  }

  /**
   * Read a single u32 (little-endian) from memory.
   */
  async readU32(address: number): Promise<number> {
    const buf = await this.readMemory(address, 4);
    return buf.readUInt32LE(0);
  }

  /**
   * Read a u16 (little-endian) from memory.
   */
  async readU16(address: number): Promise<number> {
    const buf = await this.readMemory(address, 2);
    return buf.readUInt16LE(0);
  }

  /**
   * Disconnect from the GDB stub.
   */
  disconnect(): void {
    if (this.socket) {
      // Send detach command so emulator continues running
      this.socket.write(buildGdbPacket("D"));
      this.socket.destroy();
      this.socket = null;
    }
  }

  get connected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }
}

// ---------------------------------------------------------------------------
// melonDS Controller
// ---------------------------------------------------------------------------

interface MelonDSState {
  process: ChildProcess | null;
  xProcess: ChildProcess | null;
  displayNum: number;
  tempDir: string;
  gdbPort: number;
  gdb: GdbClient | null;
}

export class MelonDSController {
  private game: string;
  private state: MelonDSState = {
    process: null,
    xProcess: null,
    displayNum: 0,
    tempDir: "",
    gdbPort: DEFAULT_GDB_PORT,
    gdb: null,
  };

  constructor(game: string) {
    this.game = game;
  }

  /**
   * Launch melonDS headless with GDB stub enabled.
   */
  async launch(
    romPath: string,
    savePath: string,
    options: { useGUI?: boolean; gdbPort?: number } = {},
  ): Promise<void> {
    const config = getEmulatorConfig("nds");
    const gdbPort = options.gdbPort ?? DEFAULT_GDB_PORT;
    this.state.gdbPort = gdbPort;

    this.state.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nds-rng-"));

    // Copy ROM and save to temp dir (melonDS looks for .sav next to ROM by filename)
    const romExt = path.extname(romPath);
    const tempRom = path.join(this.state.tempDir, `game${romExt}`);
    const tempSav = path.join(this.state.tempDir, "game.sav");
    fs.copyFileSync(romPath, tempRom);
    if (fs.existsSync(savePath)) {
      fs.copyFileSync(savePath, tempSav);
    }

    // Seed config with GDB enabled
    const configDir = seedMelonDSConfig(this.state.tempDir, config, {
      enableGdb: true,
      gdbPort,
    });

    const display = options.useGUI
      ? (process.env.DISPLAY || ":0")
      : `:${250 + Math.floor(Math.random() * 50)}`;

    if (!options.useGUI) {
      // Headless: start Xvfb
      this.state.displayNum = parseInt(display.slice(1));
      this.state.xProcess = spawn("Xvfb", [display, "-screen", "0", "256x384x24"], {
        stdio: "ignore",
        detached: true,
      });
      registerProcess(this.state.xProcess, "Xvfb-NDS-RNG");
      await sleep(1000);
    }

    // Launch melonDS
    const emuArgs = [tempRom];
    this.state.process = spawn(config.binary, emuArgs, {
      env: {
        ...process.env,
        DISPLAY: display,
        XDG_CONFIG_HOME: configDir,
        QT_QPA_PLATFORM: options.useGUI ? undefined : "xcb",
      },
      stdio: "ignore",
      detached: true,
    });
    registerProcess(this.state.process, `melonDS-RNG[${this.game}]`);

    // Wait for GDB stub to come up, then connect
    console.log(`[MelonDSController] Waiting for GDB stub on port ${gdbPort}...`);
    this.state.gdb = new GdbClient(gdbPort);
    await this.state.gdb.connect();
  }

  /**
   * Read raw memory from ARM9 address space.
   */
  async readMemory(address: number, size: number): Promise<Buffer> {
    if (!this.state.gdb?.connected) throw new Error("[MelonDSController] GDB not connected");
    return this.state.gdb.readMemory(address, size);
  }

  /**
   * Read a u32 from memory.
   */
  async readU32(address: number): Promise<number> {
    if (!this.state.gdb?.connected) throw new Error("[MelonDSController] GDB not connected");
    return this.state.gdb.readU32(address);
  }

  /**
   * Read the current LCRNG seed (u32).
   */
  async readLCRNGSeed(seedAddr: number): Promise<number> {
    return this.readU32(seedAddr);
  }

  /**
   * Read the MT19937 state index.
   */
  async readMTIndex(indexAddr: number): Promise<number> {
    return this.readU32(indexAddr);
  }

  /**
   * Send a button press via xdotool.
   */
  async sendKey(button: string): Promise<void> {
    const x11Key = MELONDS_KEY_MAP[button] ?? button;
    const display = this.state.displayNum > 0
      ? `:${this.state.displayNum}`
      : (process.env.DISPLAY || ":0");

    return new Promise((resolve, reject) => {
      execFile("xdotool", ["key", "--delay", "50", x11Key], {
        env: { ...process.env, DISPLAY: display },
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Hold a key for a duration.
   */
  async sendKeyHold(button: string, durationMs: number): Promise<void> {
    const x11Key = MELONDS_KEY_MAP[button] ?? button;
    const display = this.state.displayNum > 0
      ? `:${this.state.displayNum}`
      : (process.env.DISPLAY || ":0");
    const env = { ...process.env, DISPLAY: display };

    execFile("xdotool", ["keydown", x11Key], { env }, () => {});
    await sleep(durationMs);
    execFile("xdotool", ["keyup", x11Key], { env }, () => {});
  }

  /**
   * Stop the emulator and clean up.
   */
  async stop(): Promise<void> {
    if (this.state.gdb) {
      this.state.gdb.disconnect();
      this.state.gdb = null;
    }
    if (this.state.process) {
      await gracefulKill(this.state.process, "melonDS-RNG");
      this.state.process = null;
    }
    if (this.state.xProcess) {
      await gracefulKill(this.state.xProcess, "Xvfb-NDS-RNG", 1000);
      this.state.xProcess = null;
    }
    if (this.state.tempDir) {
      fs.rmSync(this.state.tempDir, { recursive: true, force: true });
    }
  }

  get tempDir(): string {
    return this.state.tempDir;
  }

  get gdbPort(): number {
    return this.state.gdbPort;
  }
}
