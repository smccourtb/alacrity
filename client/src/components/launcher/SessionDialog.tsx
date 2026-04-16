import { useState } from 'react';
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

interface SessionEndEvent {
  sessionId: string;
  saveChanged: boolean;
  reason: string;
}

interface SessionDialogProps {
  event: SessionEndEvent;
  sessionInfo: { game: string; label: string } | null;
  onResolved: () => void;
}

export default function SessionDialog({ event, sessionInfo, onResolved }: SessionDialogProps) {
  const [newName, setNewName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [resolving, setResolving] = useState(false);
  const handleResolve = async (action: 'save_back' | 'save_as_new' | 'discard') => {
    if (action === 'save_as_new' && !showNameInput) {
      setShowNameInput(true);
      return;
    }
    setResolving(true);
    await api.launcher.resolveSession(
      event.sessionId,
      action,
      newName || undefined,
    );
    setResolving(false);
    onResolved();
  };

  return (
    <Dialog open onOpenChange={() => handleResolve('discard')}>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>Save Changed</DialogTitle>
          <DialogDescription>
            Your save for <strong>{sessionInfo?.game} — {sessionInfo?.label}</strong> was modified during play.
          </DialogDescription>
        </DialogHeader>

        {showNameInput && (
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Name for copy:</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={`${sessionInfo?.label} (played ${new Date().toISOString().slice(0, 10)})`}
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-1">
          <Button variant="ghost" className="rounded-xl" onClick={() => handleResolve('discard')} disabled={resolving}>
            Discard
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => handleResolve('save_as_new')} disabled={resolving}>
            {showNameInput ? 'Confirm' : 'Save Copy'}
          </Button>
          <Button className="rounded-xl" onClick={() => handleResolve('save_back')} disabled={resolving}>
            Overwrite Original
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
