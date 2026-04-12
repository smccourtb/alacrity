import { useState, useEffect } from 'react';
import { api } from '@/api/client';

type SaveFile = {
  id: number;
  filename: string;
  notes: string | null;
  game: string;
};

export default function SavePin({
  stepId,
  currentSaveId,
  currentSaveLabel,
  game,
  onLinked,
}: {
  stepId: number;
  currentSaveId: number | null;
  currentSaveLabel: string | null;
  game: string;
  onLinked: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.saves
      .list()
      .then((all) => setSaves(all.filter((s: SaveFile) => !game || s.game === game || !s.game)))
      .finally(() => setLoading(false));
  }, [open, game]);

  const handleSelect = async (saveId: number | null) => {
    await api.guide.linkStepSave(stepId, saveId);
    setOpen(false);
    onLinked();
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-xs text-muted-foreground hover:text-blue-500 transition-colors shrink-0"
        title={currentSaveLabel ? `Linked: ${currentSaveLabel}` : 'Pin a save here'}
      >
        {currentSaveId ? '💾' : '📌'}
      </button>
    );
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs font-medium mb-1 px-1">Pin save to this step</div>
      {loading ? (
        <div className="text-xs text-muted-foreground px-1 py-2">Loading saves...</div>
      ) : saves.length === 0 ? (
        <div className="text-xs text-muted-foreground px-1 py-2">No saves for {game}</div>
      ) : (
        <>
          {saves.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors ${
                s.id === currentSaveId ? 'bg-blue-500/10 text-blue-600' : ''
              }`}
            >
              {s.notes || s.filename}
            </button>
          ))}
          {currentSaveId && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-destructive transition-colors mt-1 border-t border-border pt-1.5"
            >
              Unlink save
            </button>
          )}
        </>
      )}
      <button
        onClick={() => setOpen(false)}
        className="w-full text-xs text-muted-foreground mt-1 pt-1 border-t border-border"
      >
        Cancel
      </button>
    </div>
  );
}
