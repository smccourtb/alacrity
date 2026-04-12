import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

type Task = {
  id: number;
  game: string;
  description: string;
  task_type: string;
  task_order: number;
  required: number;
  status: string;
  notes: string | null;
};

type TargetDetail = {
  id: number;
  description: string;
  leg_key: string;
  source_game: string | null;
  category: string;
  target_type: string;
  constraints: Record<string, unknown>;
  tasks: Task[];
  progress: {
    status: string;
    current_location: string | null;
  } | null;
};

type GameSegment = {
  game: string;
  tasks: Task[];
};

function segmentByGame(tasks: Task[]): GameSegment[] {
  const ordered = [...tasks].sort((a, b) => a.task_order - b.task_order);
  const segments: GameSegment[] = [];
  for (const task of ordered) {
    const last = segments[segments.length - 1];
    if (last && last.game === task.game) {
      last.tasks.push(task);
    } else {
      segments.push({ game: task.game, tasks: [task] });
    }
  }
  return segments;
}

function segmentStatus(tasks: Task[]): 'done' | 'partial' | 'pending' {
  const required = tasks.filter(t => t.required === 1);
  if (required.length === 0) return 'pending';
  const done = required.filter(t => t.status === 'completed').length;
  if (done === required.length) return 'done';
  if (done > 0) return 'partial';
  return 'pending';
}

export default function JourneyPipeline({ targetId }: { targetId: number }) {
  const [detail, setDetail] = useState<TargetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.specimens
      .target(targetId)
      .then(setDetail)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [targetId]);

  const handleToggleTask = useCallback(
    async (task: Task) => {
      if (toggling.has(task.id)) return;
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      setToggling(prev => new Set(prev).add(task.id));
      try {
        await api.specimens.updateTask(task.id, { status: newStatus });
        setDetail(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t =>
              t.id === task.id ? { ...t, status: newStatus } : t
            ),
          };
        });
      } catch {
        // silently ignore — user can retry
      } finally {
        setToggling(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    },
    [toggling]
  );

  if (loading) {
    return <div className="py-3 text-sm text-muted-foreground">Loading journey...</div>;
  }
  if (error) {
    return <div className="py-3 text-sm text-destructive">Failed to load journey.</div>;
  }
  if (!detail) return null;

  const segments = segmentByGame(detail.tasks);

  if (segments.length === 0) {
    return (
      <div className="py-3 text-sm text-muted-foreground">No journey tasks defined yet.</div>
    );
  }

  return (
    <div className="pt-2 pb-1">
      {/* Current location indicator */}
      {detail.progress?.current_location && (
        <div className="text-xs text-muted-foreground mb-2">
          Currently in:{' '}
          <span className="font-medium capitalize">{detail.progress.current_location}</span>
        </div>
      )}

      {/* Pipeline */}
      <div className="flex flex-wrap items-start gap-0">
        {segments.map((seg, i) => {
          const status = segmentStatus(seg.tasks);
          const borderColor =
            status === 'done'
              ? 'border-green-500'
              : status === 'partial'
              ? 'border-yellow-500'
              : 'border-border';
          const headerBg =
            status === 'done'
              ? 'bg-green-500/10 text-green-600'
              : status === 'partial'
              ? 'bg-yellow-500/10 text-yellow-600'
              : 'bg-muted text-muted-foreground';

          return (
            <div key={`${seg.game}-${i}`} className="flex items-start">
              {/* Segment card */}
              <div className={`border ${borderColor} rounded-md min-w-[160px] max-w-[220px]`}>
                {/* Game header */}
                <div className={`px-2 py-1 rounded-t-md text-xs font-semibold capitalize ${headerBg}`}>
                  {seg.game}
                </div>

                {/* Tasks */}
                <div className="px-2 py-1.5 space-y-1">
                  {seg.tasks.map(task => {
                    const isOptional = task.required !== 1;
                    const isDone = task.status === 'completed';
                    const isToggling = toggling.has(task.id);

                    return (
                      <label
                        key={task.id}
                        className="flex items-start gap-1.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          disabled={isToggling}
                          onChange={() => handleToggleTask(task)}
                          className="mt-0.5 shrink-0 accent-primary"
                        />
                        <span
                          className={`text-xs leading-snug ${
                            isDone
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          } ${isToggling ? 'opacity-50' : ''}`}
                        >
                          {isOptional && (
                            <span className="text-muted-foreground mr-0.5">○</span>
                          )}
                          {task.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Arrow connector between segments */}
              {i < segments.length - 1 && (
                <div className="flex items-center px-1 pt-4 text-muted-foreground text-sm select-none">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
