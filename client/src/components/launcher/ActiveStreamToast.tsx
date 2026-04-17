import { useCallback, useEffect, useState } from 'react';
import { SmartphoneIcon } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StreamSessionInfo {
  id: string;
  game: string;
  status: string;
  saveChanged?: boolean;
}

interface SaveChangedResult {
  sessionId: string;
  game: string;
}

/**
 * Global indicator for active phone-streaming sessions. Polls the server for
 * running sessions and shows a persistent pill so the user can stop the stream
 * from any page. On stop, if the save changed, opens the save-resolution
 * dialog that used to live in PlayPage.
 */
export default function ActiveStreamToast() {
  const [sessions, setSessions] = useState<StreamSessionInfo[]>([]);
  const [stopping, setStopping] = useState<string | null>(null);
  const [result, setResult] = useState<SaveChangedResult | null>(null);
  const [newName, setNewName] = useState('');
  const [showName, setShowName] = useState(false);

  useEffect(() => {
    // SSE pushes a fresh session snapshot on every lifecycle change —
    // registration, status transition, removal. Replaces the 2s poll that
    // used to run on every page in the app 24/7.
    const es = api.stream.events();

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamSessionInfo[];
        setSessions(data.filter(s => s.status === 'running' || s.status === 'starting'));

        // A session can transition to stopped-with-saveChanged without the
        // desktop calling stop itself (phone hit Stop, phone disconnected,
        // emulator crashed). Functional set so we don't trample an already-
        // open dialog.
        const pending = data.find(s => s.status === 'stopped' && s.saveChanged);
        if (pending) {
          setResult(prev => prev ?? { sessionId: pending.id, game: pending.game });
        }
      } catch {
        // Malformed frame — ignore; next event will resync.
      }
    };

    // EventSource auto-reconnects on network blips, so we only need to clear
    // stale state while disconnected. Sessions will resync on the next open.
    es.onerror = () => setSessions([]);

    return () => es.close();
  }, []);

  const handleStop = useCallback(async (session: StreamSessionInfo) => {
    if (stopping) return;
    setStopping(session.id);
    try {
      const res = await api.stream.stop(session.id);
      if (res.saveChanged) {
        setResult({ sessionId: session.id, game: session.game });
      }
    } catch {
      // Session may already be gone; let the poll remove it.
    } finally {
      setStopping(null);
    }
  }, [stopping]);

  const closeDialog = useCallback(() => {
    setResult(null);
    setNewName('');
    setShowName(false);
  }, []);

  return (
    <>
      {sessions.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
          {sessions.map(s => (
            <div
              key={s.id}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <SmartphoneIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">
                Streaming <span className="font-medium">{s.game}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                disabled={stopping === s.id}
                onClick={() => handleStop(s)}
              >
                {stopping === s.id ? '…' : 'Stop'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <Dialog open onOpenChange={closeDialog}>
          <DialogContent className="rounded-lg">
            <DialogHeader>
              <DialogTitle>Save Changed</DialogTitle>
              <DialogDescription>
                Your {result.game} save was modified during the stream session.
              </DialogDescription>
            </DialogHeader>
            {showName && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Name for copy:</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={`Streamed ${new Date().toISOString().slice(0, 10)}`}
                  autoFocus
                />
              </div>
            )}
            <DialogFooter className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={async () => {
                  await api.stream.resolve(result.sessionId, 'discard');
                  closeDialog();
                }}
              >
                Discard
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={async () => {
                  if (!showName) { setShowName(true); return; }
                  await api.stream.resolve(result.sessionId, 'save_as_new', newName || undefined);
                  closeDialog();
                }}
              >
                {showName ? 'Confirm' : 'Save Copy'}
              </Button>
              <Button
                className="rounded-xl"
                onClick={async () => {
                  await api.stream.resolve(result.sessionId, 'save_back');
                  closeDialog();
                }}
              >
                Overwrite Original
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
