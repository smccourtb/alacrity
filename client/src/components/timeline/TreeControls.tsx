import type { CheckpointType } from '@/components/timeline/types';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  FILTER_TYPES,
  FILTER_LABELS,
  FILTER_ICONS,
  FILTER_COLORS,
} from '@/hooks/useTimelineFilters';

export interface TreeControlsProps {
  viewMode: 'tree' | 'grouped';
  onViewModeChange: (mode: 'tree' | 'grouped') => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilters: Set<CheckpointType>;
  onToggleFilter: (type: CheckpointType) => void;
  isMobile: boolean;
  hasOrphans: boolean;
  orphanCount: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TreeControls({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  isMobile,
  hasOrphans,
  orphanCount,
  sidebarOpen,
  onToggleSidebar,
}: TreeControlsProps) {
  return (
    <Card className="py-0 gap-0">
      <div className="px-5 py-3 flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center bg-surface-raised rounded-lg p-0.5">
          {(['tree', 'grouped'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
                ${viewMode === mode ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              {mode === 'tree' ? 'Tree View' : 'Grouped'}
            </button>
          ))}
        </div>

        {/* Search + filter pills (tree view only) */}
        {viewMode === 'tree' && (
          <>
            <Input
              placeholder="Search saves..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={isMobile ? 'flex-1 min-w-0' : 'w-48'}
            />

            {/* Filter pills -- horizontal scroll on mobile */}
            <div className={`flex items-center gap-2 ${isMobile ? 'w-full overflow-x-auto -mx-5 px-5 pb-1' : ''}`}>
              {FILTER_TYPES.map((type) => {
                const active = activeFilters.has(type);
                const color = FILTER_COLORS[type];
                const icon = FILTER_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => onToggleFilter(type)}
                    className={`
                      flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-all
                      ${active
                        ? 'shadow-sm'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                    style={active ? { color, borderColor: `${color}40`, backgroundColor: `${color}12` } : {}}
                  >
                    <span style={{ color: active ? color : '#9ca3af' }}>{icon}</span>
                    {FILTER_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Sidebar toggle for orphans -- desktop only */}
        {hasOrphans && !isMobile && (
          <button
            onClick={onToggleSidebar}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            Unlinked
            <span className="text-xs text-muted-foreground/60">{orphanCount}</span>
          </button>
        )}
      </div>
    </Card>
  );
}
