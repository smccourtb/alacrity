import { shinyStarsPng } from '@/lib/pokemon-icons';

interface ShinyIconProps {
  size?: 'sm' | 'md';
  best?: boolean;
}

const SIZES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
} as const;

export function ShinyIcon({ size = 'md', best = false }: ShinyIconProps) {
  return (
    <img
      src={shinyStarsPng}
      alt="Shiny"
      className={`${SIZES[size]} ${best ? 'drop-shadow-[0_0_4px_rgba(255,215,0,0.8)]' : ''}`}
    />
  );
}
