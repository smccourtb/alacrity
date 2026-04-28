// huntLogTail.ts — per-hunt log tail manager.
//
// One manager per hunt id. It owns an open FD per instance log file, polls
// each on a single 500ms timer, reads only the bytes added since last poll
// (positional read — no whole-file rescans), and fans out coalesced
// new-line events to any number of subscribers (SSE clients) plus an
// on-line callback used by the hit watcher.
//
// Replaces the prior fs.watch + safety-net setInterval pair, which was both
// expensive (per-connection watchers, full readFileSync per fire) and
// unreliable (kqueue stalls on macOS under load).

import { existsSync, openSync, readSync, closeSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

export interface TailLineEvent {
  /** Instance log filename (e.g. "instance_3.log"). */
  file: string;
  /** Display label ("#3"). */
  instance: string;
  /** Newly-arrived complete lines (no trailing newlines). */
  lines: string[];
}

export interface TailSubscription {
  /** Stop receiving updates. The manager keeps running while the hunt is alive. */
  unsubscribe(): void;
  /** Last ~10 lines per file at subscribe time, for replay-on-connect. */
  initial: TailLineEvent[];
}

type Subscriber = (events: TailLineEvent[]) => void;
type HitListener = (event: TailLineEvent) => void;

interface FileState {
  fd: number;
  pos: number;
  /** Bytes split across read boundaries — prepended to the next read. */
  partial: string;
  inst: string;
  file: string;
}

const POLL_MS = 500;
const MAX_READ_PER_TICK = 64 * 1024; // safety cap; logs rarely exceed this

class HuntLogTail {
  private files = new Map<string, FileState>();
  private subscribers = new Set<Subscriber>();
  private hitListeners = new Set<HitListener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(public readonly huntId: number, private readonly logDir: string) {}

  start(): void {
    if (this.timer) return;
    this.discoverFiles();
    this.timer = setInterval(() => this.tick(), POLL_MS);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    for (const st of this.files.values()) {
      try { closeSync(st.fd); } catch {}
    }
    this.files.clear();
    this.subscribers.clear();
    this.hitListeners.clear();
  }

  /** Subscribe to live tail updates. Returns the initial replay tail. */
  subscribe(cb: Subscriber): TailSubscription {
    this.subscribers.add(cb);
    return {
      initial: this.readInitialTail(),
      unsubscribe: () => { this.subscribers.delete(cb); },
    };
  }

  /** Listen for any line containing the hit marker. Called once per `!!!` line. */
  onHit(cb: HitListener): () => void {
    this.hitListeners.add(cb);
    return () => { this.hitListeners.delete(cb); };
  }

  private discoverFiles(): void {
    if (!existsSync(this.logDir)) return;
    let found: string[];
    try { found = readdirSync(this.logDir).filter(f => f.endsWith('.log')); }
    catch { return; }
    for (const f of found) {
      const full = join(this.logDir, f);
      if (this.files.has(full)) continue;
      try {
        const fd = openSync(full, 'r');
        // Start at current EOF — we don't replay history through the live
        // pipe (subscribers get history via subscribe().initial).
        const size = statSync(full).size;
        this.files.set(full, {
          fd,
          pos: size,
          partial: '',
          inst: f.replace('.log', '').replace('instance_', '#'),
          file: f,
        });
      } catch {}
    }
  }

  private readInitialTail(): TailLineEvent[] {
    const out: TailLineEvent[] = [];
    for (const [path, st] of this.files) {
      try {
        const size = statSync(path).size;
        const start = Math.max(0, size - 4096);
        const len = size - start;
        if (len <= 0) continue;
        const buf = Buffer.alloc(len);
        // Use a fresh FD so we don't disturb the live read position.
        const fd = openSync(path, 'r');
        try { readSync(fd, buf, 0, len, start); }
        finally { closeSync(fd); }
        const lines = buf.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean).slice(-10);
        if (lines.length) out.push({ file: st.file, instance: st.inst, lines });
      } catch {}
    }
    return out;
  }

  private tick(): void {
    this.discoverFiles();

    const events: TailLineEvent[] = [];
    for (const [path, st] of this.files) {
      let size: number;
      try { size = statSync(path).size; } catch { continue; }
      if (size <= st.pos) continue;
      const want = Math.min(size - st.pos, MAX_READ_PER_TICK);
      const buf = Buffer.alloc(want);
      let got = 0;
      try { got = readSync(st.fd, buf, 0, want, st.pos); }
      catch { continue; }
      if (got <= 0) continue;
      st.pos += got;

      const text = st.partial + buf.subarray(0, got).toString('utf8');
      const lastNl = text.lastIndexOf('\n');
      let lines: string[];
      if (lastNl < 0) { st.partial = text; continue; }
      lines = text.slice(0, lastNl).split('\n').map(l => l.trim()).filter(Boolean);
      st.partial = text.slice(lastNl + 1);
      if (!lines.length) continue;

      const event: TailLineEvent = { file: st.file, instance: st.inst, lines };
      events.push(event);

      if (this.hitListeners.size > 0) {
        for (const line of lines) {
          if (!line.includes('!!!')) continue;
          for (const cb of this.hitListeners) {
            try { cb({ file: st.file, instance: st.inst, lines: [line] }); } catch {}
          }
        }
      }
    }

    if (events.length === 0 || this.subscribers.size === 0) return;
    for (const sub of this.subscribers) {
      try { sub(events); } catch {}
    }
  }
}

const managers = new Map<number, HuntLogTail>();

export function getOrStartHuntLogTail(huntId: number, logDir: string): HuntLogTail {
  let m = managers.get(huntId);
  if (!m) {
    m = new HuntLogTail(huntId, logDir);
    managers.set(huntId, m);
    m.start();
  }
  return m;
}

export function getHuntLogTail(huntId: number): HuntLogTail | undefined {
  return managers.get(huntId);
}

export function stopHuntLogTail(huntId: number): void {
  const m = managers.get(huntId);
  if (!m) return;
  m.stop();
  managers.delete(huntId);
}
