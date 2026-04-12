import { maleSvg, femaleSvg } from '@/lib/pokemon-icons';

interface GenderIconProps {
  gender: 'male' | 'female' | 'genderless';
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
} as const;

// CSS filter to tint white SVG to blue (#3b82f6-ish)
const MALE_FILTER =
  'brightness(0) saturate(100%) invert(44%) sepia(82%) saturate(1750%) hue-rotate(201deg) brightness(101%) contrast(96%)';
// CSS filter to tint white SVG to pink (#ec4899-ish)
const FEMALE_FILTER =
  'brightness(0) saturate(100%) invert(42%) sepia(73%) saturate(3500%) hue-rotate(316deg) brightness(96%) contrast(93%)';

export function GenderIcon({ gender, size = 'md' }: GenderIconProps) {
  if (gender === 'genderless') {
    return (
      <span
        className={`inline-flex items-center justify-center text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      >
        &mdash;
      </span>
    );
  }

  const isMale = gender === 'male';

  return (
    <img
      src={isMale ? maleSvg : femaleSvg}
      alt={gender}
      className={SIZES[size]}
      style={{ filter: isMale ? MALE_FILTER : FEMALE_FILTER }}
    />
  );
}
