import { getOriginMarkUrl } from '@/lib/pokemon-icons';

interface OriginMarkProps {
  game: string;
  size?: 'sm' | 'md';
  inactive?: boolean;
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
} as const;

export function OriginMark({
  game,
  size = 'md',
  inactive = false,
}: OriginMarkProps) {
  const url = getOriginMarkUrl(game);
  if (!url) return null;

  return (
    <img
      src={url}
      alt={`${game} origin mark`}
      className={`${SIZES[size]} ${inactive ? 'opacity-20 grayscale' : ''}`}
    />
  );
}
