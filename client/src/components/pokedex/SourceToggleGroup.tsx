const SOURCE_LABELS: Record<string, string> = {
  save: 'Saves',
  bank: 'Bank',
  manual: 'Manual',
};

const SOURCE_ORDER = ['save', 'bank', 'manual'] as const;

interface Props {
  sourceCounts: { save: number; bank: number; manual: number };
  activeSources: Record<string, boolean>;
  onToggle: (source: 'save' | 'bank' | 'manual') => void;
}

export default function SourceToggleGroup({ sourceCounts, activeSources, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1">
      {SOURCE_ORDER.map(key => {
        const count = sourceCounts[key];
        const hasData = count > 0;
        const active = hasData && activeSources[key] !== false;
        return (
          <button
            key={key}
            type="button"
            onClick={() => hasData && onToggle(key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : hasData
                  ? 'bg-surface-sunken text-muted-foreground/40 hover:text-muted-foreground/60'
                  : 'bg-surface-sunken text-muted-foreground/20 cursor-default'
            }`}
          >
            {SOURCE_LABELS[key]}
            <span className={`text-2xs ${active ? 'opacity-70' : 'opacity-40'}`}>
              {count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
