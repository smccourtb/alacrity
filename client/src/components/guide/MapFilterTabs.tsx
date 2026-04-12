type FilterLevel = 'playthrough' | 'game' | 'region' | 'collection';

interface MapFilterTabsProps {
  value: FilterLevel;
  onChange: (level: FilterLevel) => void;
  hasPlaythrough: boolean;
}

export default function MapFilterTabs({ value, onChange, hasPlaythrough }: MapFilterTabsProps) {
  const tabs: { key: FilterLevel; label: string; disabled?: boolean; tooltip: string }[] = [
    { key: 'playthrough', label: 'Playthrough', disabled: !hasPlaythrough, tooltip: 'Show only locations you\u2019ve visited in this playthrough' },
    { key: 'game', label: 'Game', tooltip: 'Show all locations for the selected game' },
    { key: 'region', label: 'Region', tooltip: 'Show all playthroughs across this region' },
    { key: 'collection', label: 'Collection', tooltip: 'Show only locations with pending collection targets' },
  ];

  return (
    <div className="flex gap-0.5 bg-muted rounded p-0.5">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === tab.key
              ? 'bg-card text-foreground shadow-sm'
              : tab.disabled
                ? 'text-muted-foreground/40 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => !tab.disabled && onChange(tab.key)}
          disabled={tab.disabled}
          title={tab.tooltip}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
