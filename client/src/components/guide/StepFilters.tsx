interface StepFiltersProps {
  showMilestones: boolean;
  showSpecimens: boolean;
  showTMs: boolean;
  onToggle: (filter: 'milestones' | 'specimens' | 'tms') => void;
}

export default function StepFilters({ showMilestones, showSpecimens, showTMs, onToggle }: StepFiltersProps) {
  const btn = (active: boolean, label: string, key: 'milestones' | 'specimens' | 'tms') => (
    <button
      onClick={() => onToggle(key)}
      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-1.5">
      {btn(showMilestones, 'Milestones', 'milestones')}
      {btn(showSpecimens, 'Specimens', 'specimens')}
      {btn(showTMs, 'TMs', 'tms')}
    </div>
  );
}
