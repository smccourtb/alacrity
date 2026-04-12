/**
 * Process Registry — central tracking of all spawned child processes.
 *
 * Every child process spawned by the server should be registered here.
 * On server shutdown, killAll() terminates everything with SIGTERM → SIGKILL fallback.
 */

import type { ChildProcess } from 'child_process';

interface RegisteredProcess {
  process: ChildProcess;
  label: string;
  /** Timestamp when registered */
  startedAt: number;
}

const registry = new Map<number, RegisteredProcess>();

/**
 * Register a spawned child process. Automatically unregisters on exit.
 */
export function registerProcess(proc: ChildProcess, label: string): void {
  if (!proc.pid) return;
  registry.set(proc.pid, { process: proc, label, startedAt: Date.now() });
  proc.on('exit', () => {
    if (proc.pid) registry.delete(proc.pid);
  });
}

/**
 * Unregister a process (e.g. if you're about to kill it yourself).
 */
export function unregisterProcess(proc: ChildProcess): void {
  if (proc.pid) registry.delete(proc.pid);
}

/**
 * Send a signal to a process, trying process-group kill first for detached processes.
 * Falls back to direct kill if group kill fails (e.g. not a group leader).
 */
function killWithGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    // Kill entire process group (negative PID) — catches children of detached processes
    process.kill(-pid, signal);
  } catch {
    try {
      // Fallback to direct kill (process may not be a group leader)
      process.kill(pid, signal);
    } catch { /* already dead */ }
  }
}

/**
 * Kill a single process: SIGTERM, wait up to timeoutMs, then SIGKILL.
 * Uses process-group kill for detached processes to avoid orphaned children.
 * Returns a promise that resolves when the process is confirmed dead.
 */
export function gracefulKill(proc: ChildProcess, label: string, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.killed || !proc.pid) {
      resolve();
      return;
    }

    const pid = proc.pid;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      registry.delete(pid);
      resolve();
    };

    proc.on('exit', done);

    // Send SIGTERM (to process group if possible)
    try {
      killWithGroup(pid, 'SIGTERM');
    } catch {
      done();
      return;
    }

    // SIGKILL fallback after timeout
    setTimeout(() => {
      if (resolved) return;
      console.warn(`[processRegistry] ${label} (pid ${pid}) did not exit after ${timeoutMs}ms, sending SIGKILL`);
      killWithGroup(pid, 'SIGKILL');
      // Give SIGKILL a moment, then resolve regardless
      setTimeout(done, 500);
    }, timeoutMs);
  });
}

/**
 * Kill all registered processes. Called on server shutdown.
 * Returns when all processes are dead or force-killed.
 */
export async function killAll(timeoutMs = 3000): Promise<void> {
  const entries = Array.from(registry.values());
  if (entries.length === 0) return;

  console.log(`[processRegistry] Killing ${entries.length} processes...`);
  await Promise.all(
    entries.map(({ process: proc, label }) => gracefulKill(proc, label, timeoutMs))
  );
  console.log('[processRegistry] All processes terminated.');
}

/**
 * Get count of currently registered processes (for diagnostics).
 */
export function registeredCount(): number {
  return registry.size;
}
