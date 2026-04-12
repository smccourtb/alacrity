import { useState, useEffect } from 'react';
import { SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';

export interface FilterState {
  item: boolean;
  hidden_item: boolean;
  trainer: boolean;
  tm: boolean;
  event: boolean;
  hideDone: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  item: true,
  hidden_item: true,
  trainer: true,
  tm: false,
  event: false,
  hideDone: false,
};

const PILL_CONFIG: Array<{ key: SubMarkerType; label: string }> = [
  { key: 'item', label: 'Items' },
  { key: 'hidden_item', label: 'Hidden' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'tm', label: 'TMs' },
  { key: 'event', label: 'Events' },
];

interface FilterPillsProps {
  game: string;
  counts?: Partial<Record<SubMarkerType, number>>;
  onChange: (filters: FilterState) => void;
}

function loadFilters(game: string): FilterState {
  try {
    const stored = localStorage.getItem(`guide-filters-${game}`);
    if (stored) return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_FILTERS };
}

function saveFilters(game: string, filters: FilterState) {
  localStorage.setItem(`guide-filters-${game}`, JSON.stringify(filters));
}

export default function FilterPills({ game, counts, onChange }: FilterPillsProps) {
  const [filters, setFilters] = useState<FilterState>(() => loadFilters(game));

  useEffect(() => {
    setFilters(loadFilters(game));
  }, [game]);

  useEffect(() => {
    onChange(filters);
    saveFilters(game, filters);
  }, [filters, game, onChange]);

  function toggle(key: SubMarkerType) {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleHideDone() {
    setFilters(prev => ({ ...prev, hideDone: !prev.hideDone }));
  }

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg px-2.5 py-1.5 pointer-events-auto flex flex-wrap items-center gap-1 shrink-0">
      {PILL_CONFIG.map(({ key, label }) => {
        const active = filters[key];
        const color = SUB_MARKER_COLORS[key];
        const count = counts?.[key];
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap shrink-0 ${
              active
                ? 'border-current'
                : 'border-border text-muted-foreground/50'
            }`}
            style={active ? { color, background: `${color}15` } : undefined}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: active ? color : 'currentColor' }}
            />
            {label}
            {count != null && (
              <span className="opacity-60 text-2xs">{count}</span>
            )}
          </button>
        );
      })}
      <button
        onClick={toggleHideDone}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium transition-all border whitespace-nowrap shrink-0 ${
          filters.hideDone
            ? 'border-green-500 text-green-500 bg-green-500/10'
            : 'border-border text-muted-foreground/50'
        }`}
      >
        Hide done
      </button>
    </div>
  );
}
