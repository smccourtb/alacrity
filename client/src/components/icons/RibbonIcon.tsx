import { getRibbonSpriteUrl } from '@/lib/pokemon-icons';

interface RibbonIconProps {
  name: string;
  size?: 'sm' | 'md';
  tooltip?: boolean;
}

const SIZES = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
} as const;

export function RibbonIcon({ name, size = 'md', tooltip = false }: RibbonIconProps) {
  const url = getRibbonSpriteUrl(name);
  if (!url) return null;

  return (
    <img
      src={url}
      alt={name}
      title={tooltip ? name : undefined}
      className={SIZES[size]}
    />
  );
}
