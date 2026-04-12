import { getItemSpriteUrl } from '@/lib/pokemon-icons';

interface ItemIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
} as const;

function formatName(name: string): string {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ItemIcon({ name, size = 'md', showLabel = false }: ItemIconProps) {
  const url = getItemSpriteUrl(name);
  const label = formatName(name);

  if (!url) {
    return <span className="text-xs text-muted-foreground">{label}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <img src={url} alt={label} className={SIZES[size]} />
      {showLabel && <span className="text-xs">{label}</span>}
    </span>
  );
}
