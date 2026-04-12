import { useState } from 'react';
import { api } from '@/api/client';

interface PlaythroughManagerProps {
  playthroughId: number | null;
  onClose: () => void;
  onDelete: () => void;
  onReset: () => void;
}

export default function PlaythroughManager({ playthroughId, onClose, onDelete, onReset }: PlaythroughManagerProps) {
  const [confirmAction, setConfirmAction] = useState<'reset' | 'delete' | null>(null);

  if (!playthroughId) return null;

  async function handleReset() {
    await api.playthroughs.reset(playthroughId!);
    onReset();
    setConfirmAction(null);
  }

  async function handleDelete() {
    await api.playthroughs.delete(playthroughId!);
    onDelete();
    setConfirmAction(null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold mb-3">Manage Playthrough</h3>

        {confirmAction === null ? (
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-3 py-1.5 text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded hover:bg-amber-600/30 transition"
              onClick={() => setConfirmAction('reset')}
            >
              Reset Progress
            </button>
            <p className="text-xs text-muted-foreground ml-1">
              Clears all goal completions and guide progress. Keeps saves and checkpoints.
            </p>
            <button
              className="w-full px-3 py-1.5 text-xs bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 transition"
              onClick={() => setConfirmAction('delete')}
            >
              Delete Playthrough
            </button>
            <p className="text-xs text-muted-foreground ml-1">
              Removes everything. Saves stay in the library but are unlinked.
            </p>
            <button
              className="w-full px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-muted transition mt-1"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground">
              {confirmAction === 'reset'
                ? 'Are you sure? This will clear all progress for this playthrough.'
                : 'Are you sure? This will permanently delete this playthrough and all its checkpoints.'}
            </p>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-3 py-1.5 text-xs rounded transition ${
                  confirmAction === 'reset'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                onClick={confirmAction === 'reset' ? handleReset : handleDelete}
              >
                {confirmAction === 'reset' ? 'Reset' : 'Delete'}
              </button>
              <button
                className="flex-1 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-muted transition"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
