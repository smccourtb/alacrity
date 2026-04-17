// ---------------------------------------------------------------------------
// Shared session registry + subscription fanout
// ---------------------------------------------------------------------------
// Split out from streamSession.ts to break the streamSession ↔ directStreamSession
// circular type import. Both session classes depend on this module; the module
// only uses type-only imports for the class unions so there's no runtime cycle.
//
// Responsibilities:
//   - canonical Map of live sessions
//   - lifecycle hooks that trigger SSE fanout (broadcastSessionsChanged)
//   - subscription API the /stream/events route uses
// ---------------------------------------------------------------------------

import type { SystemType } from './emulatorConfigs.js';
import type { StreamSession } from './streamSession.js';
import type { DirectStreamSession } from './directStreamSession.js';

export interface StreamSessionInfo {
  id: string;
  game: string;
  system: SystemType;
  status: 'starting' | 'running' | 'stopped';
  startedAt: string;
  /** Only meaningful when status === 'stopped'; true means user action is needed to resolve. */
  saveChanged?: boolean;
}

export type AnyStreamSession = StreamSession | DirectStreamSession;

const sessions = new Map<string, AnyStreamSession>();

type SessionsListener = (snapshot: StreamSessionInfo[]) => void;
const listeners = new Set<SessionsListener>();

export function subscribeToSessions(cb: SessionsListener): () => void {
  listeners.add(cb);
  try { cb(getAllSessions()); } catch (e) { console.error('[stream/events] initial snapshot threw:', e); }
  return () => { listeners.delete(cb); };
}

/** Called internally whenever session membership or status changes. */
export function broadcastSessionsChanged(): void {
  if (listeners.size === 0) return;
  const snapshot = getAllSessions();
  for (const listener of listeners) {
    try { listener(snapshot); } catch (e) { console.error('[stream/events] listener threw:', e); }
  }
}

export function getSession(id: string): AnyStreamSession | undefined {
  return sessions.get(id);
}

export function getAllSessions(): StreamSessionInfo[] {
  return Array.from(sessions.values()).map((s) => s.info);
}

export function registerSession(session: AnyStreamSession): void {
  sessions.set(session.id, session);
  broadcastSessionsChanged();
}

export function removeSession(id: string): void {
  if (sessions.delete(id)) broadcastSessionsChanged();
}
