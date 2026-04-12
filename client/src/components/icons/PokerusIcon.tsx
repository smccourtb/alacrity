import { pokerusSvg } from '@/lib/pokemon-icons';

interface PokerusIconProps {
  cured?: boolean;
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4.5 h-4.5',
} as const;

// Purple tint filter
const ACTIVE_FILTER =
  'brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(4000%) hue-rotate(270deg) brightness(90%) contrast(100%)';

export function PokerusIcon({ cured = false, size = 'md' }: PokerusIconProps) {
  return (
    <img
      src={pokerusSvg}
      alt={cured ? 'Pokerus (cured)' : 'Pokerus'}
      className={`${SIZES[size]} ${cured ? 'grayscale opacity-50' : ''}`}
      style={cured ? undefined : { filter: ACTIVE_FILTER }}
    />
  );
}
