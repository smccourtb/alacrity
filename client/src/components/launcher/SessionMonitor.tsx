import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import SessionDialog from './SessionDialog';

/**
 * Global session monitor — lives in the app layout so emulator session
 * resolution dialogs appear regardless of which page the user is on.
 */
export default function SessionMonitor() {
  const [pendingEvent, setPendingEvent] = useState<{ sessionId: string; saveChanged: boolean; reason: string } | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ game: string; label: string } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  const checkSessions = useCallback(() => {
    api.launcher.sessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    checkSessions();

    // SSE for instant session updates
    let es: EventSource | null = null;
    try {
      es = api.launcher.sessionStream();
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.saveChanged) {
            setSessions(prev => {
              const session = prev.find((s: any) => s.id === event.sessionId);
              if (session) setSessionInfo({ game: session.game, label: session.label });
              return prev;
            });
            setPendingEvent(event);
          }
          checkSessions();
        } catch {}
      };
      es.onerror = () => {};
    } catch {}

    // Poll as fallback (SSE may not work through proxy)
    const poll = setInterval(() => {
      api.launcher.sessions().then(current => {
        setSessions(prev => {
          for (const s of current) {
            if ((s as any).pendingSave && !prev.find((p: any) => p.id === s.id && (p as any).pendingSave)) {
              setSessionInfo({ game: s.game, label: s.label });
              setPendingEvent({ sessionId: s.id, saveChanged: true, reason: 'exited' });
            }
          }
          return current;
        });
      }).catch(() => {});
    }, 2000);

    return () => {
      es?.close();
      clearInterval(poll);
    };
  }, [checkSessions]);

  if (!pendingEvent) return null;

  return (
    <SessionDialog
      event={pendingEvent}
      sessionInfo={sessionInfo}
      onResolved={() => {
        setPendingEvent(null);
        setSessionInfo(null);
        checkSessions();
      }}
    />
  );
}
