import type { CheckpointNode } from './types';
import { TypeBadge, ActiveBadge, MissingBadge } from './TypeBadge';

function safeLocation(location: string | null | undefined): string | null {
  if (!location || location === 'unknown') return null;
  return location;
}

interface TimelineNodeProps {
  node: CheckpointNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function TimelineNode({ node, isSelected, onSelect }: TimelineNodeProps) {
  const isCatch = node.type === 'catch';
  const snap = node.snapshot;
  const locationText = safeLocation(snap?.location);
  const showTypeBadge = node.type !== 'root' && node.type !== 'progression';

  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1.5 mr-2 cursor-pointer transition-colors rounded-md
        ${node.is_active
          ? 'bg-surface-raised ring-1 ring-border'
          : isSelected
            ? 'bg-primary/5'
            : 'hover:bg-muted/50'
        }
      `}
      style={{ height: '100%' }}
      onClick={onSelect}
    >
      {/* Label */}
      <span
        className={`text-sm font-semibold truncate ${
          isCatch ? 'text-emerald-600' : 'text-foreground'
        }`}
      >
        {isCatch && <span className="mr-0.5">&#9733;</span>}
        {node.label}
      </span>

      {/* Badges */}
      {node.is_active && <ActiveBadge size="sm" />}
      {!node.file_exists && <MissingBadge size="sm" />}

      {/* Inline metadata */}
      <span className="flex items-center gap-1.5 ml-auto shrink-0">
        {locationText && (
          <span className="text-2xs text-muted-foreground truncate">{locationText}</span>
        )}
        {showTypeBadge && <TypeBadge type={node.type} size="sm" />}
      </span>
    </div>
  );
}
