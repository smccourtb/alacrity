import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface TreeControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isMobile: boolean;
  hasOrphans: boolean;
  orphanCount: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TreeControls({
  searchQuery,
  onSearchChange,
  isMobile,
  hasOrphans,
  orphanCount,
  onToggleSidebar,
}: TreeControlsProps) {
  return (
    <Card className="py-0 gap-0">
      <div className="px-5 py-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search saves..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={isMobile ? 'flex-1 min-w-0' : 'w-48'}
        />

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
