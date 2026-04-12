import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import FilterDropdown from '@/components/FilterDropdown';

interface PlaythroughSelectorProps {
  game: string;
  selectedPlaythroughId: number | null;
  onPlaythroughChange: (id: number | null) => void;
  selectedCheckpointId: number | null;
  onCheckpointChange: (id: number | null) => void;
}

interface Playthrough {
  id: number;
  game: string;
  ot_name: string;
  ot_tid: number;
  goal: string;
  label: string | null;
  active_checkpoint_id: number | null;
}

interface Checkpoint {
  id: number;
  label: string | null;
  location_key: string | null;
  badge_count: number | null;
  is_branch: number;
  needs_confirmation: number;
  parent_checkpoint_id: number | null;
  created_at: string;
}

export default function PlaythroughSelector({
  game,
  selectedPlaythroughId,
  onPlaythroughChange,
  selectedCheckpointId,
  onCheckpointChange,
}: PlaythroughSelectorProps) {
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  useEffect(() => {
    api.playthroughs.list().then(all => {
      setPlaythroughs(all.filter((p: Playthrough) => p.game === game));
    });
  }, [game]);

  useEffect(() => {
    if (selectedPlaythroughId) {
      api.playthroughs.checkpoints(selectedPlaythroughId).then(cps => {
        setCheckpoints(cps);
        // Auto-select first (latest) checkpoint if none selected
        if (!selectedCheckpointId && cps.length > 0) {
          onCheckpointChange(cps[0].id);
        }
      });
    } else {
      setCheckpoints([]);
    }
  }, [selectedPlaythroughId]);

  // Build indented checkpoint label for branches
  function checkpointLabel(cp: Checkpoint): string {
    const prefix = cp.is_branch ? '↳ ' : '';
    const confirm = cp.needs_confirmation ? ' ?' : '';
    return `${prefix}${cp.label ?? `Checkpoint ${cp.id}`}${confirm}`;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Playthrough:</span>
        <FilterDropdown
          label="None"
          options={playthroughs.map(p => ({ value: String(p.id), label: p.label ?? `${p.ot_name} (${p.game})` }))}
          selected={selectedPlaythroughId != null ? [String(selectedPlaythroughId)] : []}
          onChange={(sel) => {
            const val = sel[0] ? Number(sel[0]) : null;
            onPlaythroughChange(val);
            onCheckpointChange(null);
          }}
          multiSelect={false}
        />
      </div>

      {selectedPlaythroughId && checkpoints.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Checkpoint:</span>
          <FilterDropdown
            label="Checkpoint"
            options={checkpoints.map(cp => ({ value: String(cp.id), label: checkpointLabel(cp) }))}
            selected={selectedCheckpointId != null ? [String(selectedCheckpointId)] : []}
            onChange={(sel) => onCheckpointChange(sel[0] ? Number(sel[0]) : null)}
            multiSelect={false}
          />
        </div>
      )}
    </div>
  );
}
