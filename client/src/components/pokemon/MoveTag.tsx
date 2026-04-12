// client/src/components/pokemon/MoveTag.tsx

import { TYPE_COLORS } from '@/lib/pokemon-constants';
import { TYPE_ICONS } from '@/lib/pokemon-icons';

function formatMoveName(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const SIZES = {
  xs: 'text-2xs px-1 py-0.5 gap-0.5',
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1',
} as const;

const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
} as const;

export type MoveTagSize = keyof typeof SIZES;

interface MoveTagProps {
  name: string;
  type?: string;
  size?: MoveTagSize;
  showIcon?: boolean;
  className?: string;
}

export function MoveTag({ name, type, size = 'xs', showIcon = true, className }: MoveTagProps) {
  const color = type ? (TYPE_COLORS[type.toLowerCase()] ?? '#a8a878') : '#a8a878';
  const icon = type ? TYPE_ICONS[type.toLowerCase()] : undefined;

  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${SIZES[size]} ${className ?? ''}`}
      style={{ backgroundColor: color, color: '#fff' }}
    >
      {showIcon && icon && <img src={icon} alt="" className={`${ICON_SIZES[size]} rounded-full`} />}
      {formatMoveName(name)}
    </span>
  );
}

interface MoveTagsProps {
  moves: string[];
  typeMap?: Map<string, string>;
  size?: MoveTagSize;
  className?: string;
}

export function MoveTags({ moves, typeMap, size = 'xs', className }: MoveTagsProps) {
  if (!moves || moves.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-0.5 ${className ?? ''}`}>
      {moves.map((m, i) => (
        <MoveTag key={i} name={m} type={typeMap?.get(m)} size={size} />
      ))}
    </div>
  );
}
