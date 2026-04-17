import { useEffect, useState, useCallback } from 'react';
import { api } from '@/api/client';
import { StreamPlayer } from '@/components/launcher/StreamPlayer';
import type { SystemType } from '@/lib/game-constants';

interface StreamSession {
  id: string;
  game: string;
  system: SystemType;
  status: string;
  startedAt: string;
}

/**
 * Mobile stream page — phone acts as the remote display and controller for
 * desktop-initiated streams. Phone hitting Stop kills the session server-side,
 * so there's no stale session to avoid re-joining; any running session that
 * appears is always intended for us.
 */
export default function MobileStream() {
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const [connected, setConnected] = useState<StreamSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to server session events — SSE pushes a snapshot on every
  // lifecycle change (start, status transition, remove). No polling.
  useEffect(() => {
    if (connected) return;

    const es = api.stream.events();

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamSession[];
        setError(null);
        setSessions(data);

        const running = data.find(s => s.status === 'running' || s.status === 'starting');
        if (running) setConnected(running);
      } catch {
        // Malformed frame — ignore; next event will resync.
      }
    };

    es.onerror = () => {
      setError('Cannot reach server');
    };

    return () => es.close();
  }, [connected]);

  // Lock orientation to landscape when streaming. ScreenOrientation.lock
  // is non-standard so TS lib types don't include it — cast to access.
  useEffect(() => {
    if (!connected) return;
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
      unlock?: () => void;
    };
    orientation?.lock?.('landscape').catch(() => {});
    return () => { orientation?.unlock?.(); };
  }, [connected]);

  const handleClose = useCallback(() => {
    setConnected(null);
  }, []);

  // Streaming — full-screen takeover, joining the existing session.
  // key={connected.id} forces a fresh mount if a new session replaces the
  // old one, so StreamPlayer's initializedRef doesn't strand us on a stale
  // PeerConnection.
  if (connected) {
    return (
      <StreamPlayer
        key={connected.id}
        sessionId={connected.id}
        game={connected.game}
        system={connected.system}
        onClose={handleClose}
      />
    );
  }

  // Waiting screen
  const runningSessions = sessions.filter(s => s.status === 'running' || s.status === 'starting');

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4 max-w-sm">
        <h1 className="text-2xl font-bold">Alacrity</h1>

        {error ? (
          <div className="space-y-2">
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
            <p className="text-xs text-muted-foreground">
              Make sure your phone is on the same WiFi as the desktop
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pulse dot to show we're connected and waiting */}
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-sm text-muted-foreground">Connected to server</span>
            </div>

            <p className="text-muted-foreground text-sm">
              {runningSessions.length > 0
                ? 'Joining stream...'
                : 'Waiting for a stream to start on desktop...'}
            </p>
            <p className="text-xs text-muted-foreground">
              Click <strong>Stream</strong> on a save in the Play page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
