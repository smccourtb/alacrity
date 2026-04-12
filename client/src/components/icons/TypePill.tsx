import { TYPE_COLORS } from '@/lib/pokemon-constants';
import { TYPE_ICONS } from '@/lib/pokemon-icons';

interface TypePillProps {
  type: string;
  variant?: 'full' | 'icon-only';
  disabled?: boolean;
  size?: 'sm' | 'md';
  tooltip?: string;
  onClick?: () => void;
}

export function TypePill({
  type,
  variant = 'full',
  disabled = false,
  size = 'md',
  tooltip,
  onClick,
}: TypePillProps) {
  const typeLower = type.toLowerCase();
  const color = TYPE_COLORS[typeLower] ?? '#a8a878';
  const icon = TYPE_ICONS[typeLower];

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (variant === 'icon-only') {
    const circleSize = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
    return (
      <span
        title={tooltip ?? type}
        className={`inline-flex items-center justify-center rounded-full overflow-hidden ${circleSize} ${
          disabled ? 'opacity-30 cursor-default' : 'cursor-pointer'
        }`}
        onClick={disabled ? undefined : onClick}
      >
        {icon ? (
          <img
            src={icon}
            alt={type}
            className="w-full h-full"
          />
        ) : (
          <span className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
        )}
      </span>
    );
  }

  const textSize =
    size === 'sm' ? 'text-2xs px-1.5 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${textSize} ${
        disabled
          ? 'opacity-30 cursor-default'
          : onClick
            ? 'cursor-pointer hover:brightness-110'
            : ''
      }`}
      style={{ backgroundColor: color, color: '#fff' }}
      onClick={disabled ? undefined : onClick}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className={`${iconSize} rounded-full`}
        />
      )}
      {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
    </span>
  );
}
