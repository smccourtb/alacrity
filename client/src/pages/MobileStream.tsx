import { useEffect, useState, useCallback, useRef } from 'react';
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
 * Mobile stream page — phone acts as a remote display for desktop-initiated streams.
 *
 * Flow: phone scans QR → lands here → polls for active sessions → auto-connects
 * when desktop clicks "Stream" on a save.
 */
export default function MobileStream() {
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const [connected, setConnected] = useState<StreamSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  // Poll for active stream sessions
  useEffect(() => {
    if (connected) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await api.stream.sessions() as StreamSession[];
        if (cancelled) return;
        setError(null);
        setSessions(data);

        // Auto-connect to the first running session we haven't seen yet
        const running = data.filter(s => s.status === 'running' || s.status === 'starting');
        const fresh = running.find(s => !seenRef.current.has(s.id));
        if (fresh) {
          seenRef.current.add(fresh.id);
          setConnected(fresh);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Cannot reach server');
        }
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [connected]);

  // Lock orientation to landscape when streaming
  useEffect(() => {
    if (!connected) return;
    screen.orientation?.lock?.('landscape').catch(() => {});
    return () => { screen.orientation?.unlock?.(); };
  }, [connected]);

  const handleClose = useCallback(() => {
    setConnected(null);
  }, []);

  // Streaming — full-screen takeover, joining the existing session
  if (connected) {
    return (
      <StreamPlayer
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
