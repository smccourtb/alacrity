import { TYPE_COLORS } from '@/lib/pokemon-constants';
import { MoveCategoryIcon } from './MoveCategoryIcon';

interface MovePillProps {
  name: string;
  type?: string;
  category?: 'physical' | 'special' | 'status';
  disabled?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function MovePill({
  name,
  type,
  category,
  disabled = false,
  size = 'md',
  onClick,
}: MovePillProps) {
  const color = type ? (TYPE_COLORS[type.toLowerCase()] ?? '#a8a878') : '#a8a878';

  const textSize =
    size === 'sm' ? 'text-2xs' : 'text-sm';

  return (
    <span
      className={`flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap w-full px-2.5 py-2 ${textSize} ${
        disabled
          ? 'opacity-30 cursor-default'
          : onClick
            ? 'cursor-pointer hover:brightness-110'
            : ''
      }`}
      style={{ backgroundColor: color, color: '#fff' }}
      onClick={disabled ? undefined : onClick}
    >
      {category && <MoveCategoryIcon category={category} size={size} />}
      <span className="flex-1">{name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
    </span>
  );
}
