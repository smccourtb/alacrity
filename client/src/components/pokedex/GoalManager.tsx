import { useState } from 'react';
import { Target, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CollectionGoal {
  id: number;
  name: string;
  filters: string;
  scope: string;
  target_count: number;
  is_default: number;
  created_at: string;
}

interface GoalManagerProps {
  goals: CollectionGoal[];
  activeGoal: CollectionGoal | null;
  currentFilters: Record<string, any>;
  displayItemCount: number;
  onSelectGoal: (goal: CollectionGoal | null) => void;
  onCreateGoal: (name: string, filters: any, scope: string, targetCount: number) => Promise<number>;
  onDeleteGoal: (id: number) => Promise<void>;
}

export function GoalManager({
  goals,
  activeGoal,
  currentFilters,
  displayItemCount,
  onSelectGoal,
  onCreateGoal,
  onDeleteGoal,
}: GoalManagerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onCreateGoal(name, currentFilters, 'all', displayItemCount);
      setNewName('');
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteGoal(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (goal: CollectionGoal | null) => {
    onSelectGoal(goal);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 h-8 text-xs font-medium ${activeGoal ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400' : 'text-muted-foreground'}`}
        >
          <Target className="h-3.5 w-3.5" />
          {activeGoal ? activeGoal.name : 'Goals'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {/* No goal option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
              !activeGoal
                ? 'bg-surface-sunken text-foreground'
                : 'hover:bg-surface-sunken text-muted-foreground'
            }`}
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              {!activeGoal && <Check className="h-3 w-3" />}
            </span>
            No goal
          </button>

          {/* Divider */}
          {goals.length > 0 && (
            <div className="border-t border-border/50 my-1" />
          )}

          {/* Saved goals */}
          {goals.map(goal => (
            <div
              key={goal.id}
              className={`flex items-center gap-1 rounded-md transition-colors ${
                activeGoal?.id === goal.id ? 'bg-red-50' : 'hover:bg-surface-sunken'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelect(goal)}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-left"
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  {activeGoal?.id === goal.id && <Check className="h-3 w-3 text-red-500" />}
                </span>
                <span className="flex-1 truncate">{goal.name}</span>
                <span className="text-xs text-muted-foreground/50 shrink-0">{goal.target_count}</span>
              </button>
              <button
                type="button"
                onClick={e => handleDelete(e, goal.id)}
                disabled={deletingId === goal.id}
                className="p-1.5 mr-1 rounded text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Divider before create */}
          <div className="border-t border-border/50 my-1" />

          {/* Create new goal */}
          {creating ? (
            <div className="px-2 py-1.5 space-y-2">
              <Input
                autoFocus
                placeholder="Goal name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                className="h-7 text-xs"
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setCreating(false); setNewName(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-surface-sunken transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Save current filters as goal
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
