import { invoke } from '@tauri-apps/api/core';

let serverBase = '';  // empty = use Vite proxy (dev mode)

export async function initServerUrl(): Promise<void> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return;
  }

  // The sidecar may not have emitted its "ready" event yet —
  // poll until the Rust side has stored the port.
  const maxAttempts = 50; // 50 × 200ms = 10s max wait
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const port = await invoke<number>('get_server_port');
      serverBase = `http://localhost:${port}`;
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.error('Timed out waiting for sidecar server port');
}

export function getServerBase(): string {
  return serverBase;
}
