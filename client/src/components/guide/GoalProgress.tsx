interface GoalProgressProps {
  goals: Array<{
    id: number;
    status: string;
    species_name: string | null;
    requirement_description: string | null;
    priority: string;
  }>;
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  if (goals.length === 0) return null;

  const completed = goals.filter(g => g.status === 'completed').length;
  const pct = Math.round((completed / goals.length) * 100);

  return (
    <div className="px-3 py-2 bg-card/80 border-b border-border">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-foreground">Origin Goals</span>
        <span className="text-xs text-green-400">{completed}/{goals.length} complete</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
