import { getBallSpriteUrl } from '@/lib/pokemon-icons';

interface BallIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
} as const;

export function BallIcon({
  name,
  size = 'md',
  tooltip = false,
  className = '',
}: BallIconProps) {
  const url = getBallSpriteUrl(name);

  if (!url) {
    return (
      <span
        className={`inline-block rounded-full bg-gray-400 ${SIZES[size]} ${className}`}
        title={tooltip ? name : undefined}
      />
    );
  }

  return (
    <img
      src={url}
      alt={name}
      title={tooltip ? name : undefined}
      className={`${SIZES[size]} ${className}`}
    />
  );
}
