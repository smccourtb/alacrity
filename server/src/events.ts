/**
 * Stdout JSON event protocol for Tauri sidecar communication.
 *
 * When --log-format=json is passed, structured events are written to stdout
 * as newline-delimited JSON. Tauri reads these to track server state.
 */

let logJson = false;

export function setLogJson(enabled: boolean) {
  logJson = enabled;
}

export function emitEvent(event: Record<string, unknown>) {
  if (logJson) {
    process.stdout.write(JSON.stringify(event) + '\n');
  }
}
