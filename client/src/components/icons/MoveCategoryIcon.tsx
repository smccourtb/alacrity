import { MOVE_CATEGORY_ICONS } from '@/lib/pokemon-icons';

interface MoveCategoryIconProps {
  category: 'physical' | 'special' | 'status';
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: 'w-4 h-3',
  md: 'w-5 h-3.5',
} as const;

export function MoveCategoryIcon({
  category,
  size = 'md',
}: MoveCategoryIconProps) {
  const icon = MOVE_CATEGORY_ICONS[category];
  if (!icon) return null;

  return (
    <img
      src={icon}
      alt={category}
      className={SIZES[size]}
    />
  );
}
