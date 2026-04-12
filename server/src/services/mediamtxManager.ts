import { spawn, ChildProcess, execSync } from 'child_process';
import { registerProcess } from './processRegistry.js';
import { createInterface } from 'readline';
import { paths } from '../paths.js';

// ---------------------------------------------------------------------------
// Pion rtc-relay process manager
// ---------------------------------------------------------------------------
// Manages a native Go WebRTC relay that accepts RTP from FFmpeg and sends
// directly to browser via WebRTC. Zero buffering between RTP and SRTP.
// ---------------------------------------------------------------------------

const RELAY_BIN = paths.rtcRelay;
export const RELAY_PORT = 9090;

let process_: ChildProcess | null = null;
let inputHandler: ((session: string, msg: string) => void) | null = null;

/** Kill any orphaned relay process holding the port from a previous server run */
function killOrphanedRelay(): void {
  try {
    const pids = execSync(`lsof -ti :${RELAY_PORT}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      for (const pid of pids.split('\n')) {
        try {
          process.kill(Number(pid), 'SIGTERM');
          console.log(`[rtc-relay] Killed orphaned process on port ${RELAY_PORT} (pid ${pid})`);
        } catch { /* already dead */ }
      }
    }
  } catch { /* no process on port — expected */ }
}

export function startRelay(): void {
  if (process_ && !process_.killed) {
    console.log('[rtc-relay] Already running');
    return;
  }

  killOrphanedRelay();

  process_ = spawn(RELAY_BIN, [String(RELAY_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  registerProcess(process_, 'rtc-relay');

  // The relay prints DataChannel input messages to stdout as JSON lines
  if (process_.stdout) {
    const rl = createInterface({ input: process_.stdout });
    rl.on('line', (line) => {
      try {
        const { session, input } = JSON.parse(line);
        if (inputHandler && session && input) {
          inputHandler(session, JSON.stringify(input));
        }
      } catch {
        // Non-JSON output (e.g., log messages)
        console.log(`[rtc-relay] ${line}`);
      }
    });
  }

  process_.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('INPUT:')) {
        // DataChannel input forwarded via stderr to avoid stdout pipe buffering
        try {
          const { session, input } = JSON.parse(line.slice(6));
          if (inputHandler && session && input) {
            inputHandler(session, JSON.stringify(input));
          }
        } catch {}
      } else if (line) {
        console.log(`[rtc-relay] ${line}`);
      }
    }
  });

  process_.on('error', (err) => {
    console.error('[rtc-relay] Failed to start:', err.message);
  });

  process_.on('exit', (code) => {
    console.log(`[rtc-relay] Exited with code ${code}`);
    process_ = null;
  });

  console.log(`[rtc-relay] Started on :${RELAY_PORT}`);
}

export function stopRelay(): void {
  if (process_ && !process_.killed) {
    process_.kill('SIGTERM');
    process_ = null;
    console.log('[rtc-relay] Stopped');
  }
}

/** Register a callback for DataChannel input from the relay */
export function onRelayInput(handler: (sessionId: string, inputJson: string) => void): void {
  inputHandler = handler;
}

/** Create a session in the relay, get back RTP ports for FFmpeg */
export async function createRelaySession(sessionId: string): Promise<{ videoPort: number; audioPort: number }> {
  const res = await fetch(`http://127.0.0.1:${RELAY_PORT}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sessionId }),
  });
  if (!res.ok) throw new Error(`relay session create failed: ${await res.text()}`);
  return res.json();
}

/** Forward SDP offer to relay, get answer back */
export async function relayOffer(sessionId: string, sdp: string): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${RELAY_PORT}/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sessionId, sdp }),
  });
  if (!res.ok) throw new Error(`relay offer failed: ${await res.text()}`);
  const data = await res.json();
  return data.sdp;
}

/** Stop a session in the relay */
export async function stopRelaySession(sessionId: string): Promise<void> {
  try {
    await fetch(`http://127.0.0.1:${RELAY_PORT}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId }),
    });
  } catch {
    // Relay may already be gone
  }
}
