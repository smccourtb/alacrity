import { useState, useEffect } from 'react';
import { SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';

export type FilterKey = SubMarkerType | 'connection' | 'note' | 'building' | 'poi';

export interface FilterState {
  item: boolean;
  hidden_item: boolean;
  trainer: boolean;
  tm: boolean;
  event: boolean;
  shop: boolean;
  connection: boolean;
  note: boolean;
  building: boolean;
  poi: boolean;
  hideDone: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  item: true,
  hidden_item: true,
  trainer: true,
  tm: false,
  event: false,
  shop: true,
  connection: true,
  note: true,
  building: true,
  poi: true,
  hideDone: false,
};

const CUSTOM_COLORS: Record<'connection' | 'note' | 'building' | 'poi', string> = {
  connection: '#60a5fa',
  note: '#fbbf24',
  building: '#a78bfa',
  poi: '#f472b6',
};

const PILL_CONFIG: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'item', label: 'Items', color: SUB_MARKER_COLORS.item },
  { key: 'hidden_item', label: 'Hidden', color: SUB_MARKER_COLORS.hidden_item },
  { key: 'trainer', label: 'Trainers', color: SUB_MARKER_COLORS.trainer },
  { key: 'tm', label: 'TMs', color: SUB_MARKER_COLORS.tm },
  { key: 'event', label: 'Events', color: SUB_MARKER_COLORS.event },
  { key: 'shop', label: 'Shops', color: SUB_MARKER_COLORS.shop },
  { key: 'connection', label: 'Connections', color: CUSTOM_COLORS.connection },
  { key: 'note', label: 'Notes', color: CUSTOM_COLORS.note },
  { key: 'building', label: 'Buildings', color: CUSTOM_COLORS.building },
  { key: 'poi', label: 'POIs', color: CUSTOM_COLORS.poi },
];

interface FilterPillsProps {
  game: string;
  counts?: Partial<Record<FilterKey, number>>;
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

  function toggle(key: FilterKey) {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleHideDone() {
    setFilters(prev => ({ ...prev, hideDone: !prev.hideDone }));
  }

  // Sidebar is narrow (~280–340px). A flex-wrap row of 11 labeled pills
  // overflows past the panel edge into the map. Use a fixed 5-column grid
  // so the chrome height is predictable, no horizontal overflow, and the
  // "Hide done" toggle gets its own row spanning the whole width.
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-1.5 pointer-events-auto shrink-0 min-w-0 overflow-hidden">
      <div className="grid grid-cols-5 gap-1">
        {PILL_CONFIG.map(({ key, label, color }) => {
          const active = filters[key];
          const count = counts?.[key];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              title={`${label}${count != null ? ` (${count})` : ''}`}
              className={`flex items-center justify-center gap-1 px-1 py-0.5 rounded-md text-[10px] font-medium transition-all border min-w-0 ${
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
              <span className="truncate">{label}</span>
              {count != null && (
                <span className="opacity-60 shrink-0 tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={toggleHideDone}
        className={`mt-1 w-full flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all border ${
          filters.hideDone
            ? 'border-green-500 text-green-500 bg-green-500/10'
            : 'border-border text-muted-foreground/60 hover:text-foreground'
        }`}
      >
        {filters.hideDone ? '✓ Hiding completed' : 'Show all'}
      </button>
    </div>
  );
}
