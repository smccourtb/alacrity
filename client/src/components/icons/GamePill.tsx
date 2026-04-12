import { GAME_VERSIONS } from '@/lib/pokemon-icons';

interface GamePillProps {
  game: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function GamePill({
  game,
  disabled = false,
  size = 'md',
  onClick,
}: GamePillProps) {
  const version = GAME_VERSIONS[game];

  const textSize =
    size === 'sm' ? 'text-2xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  const bgColor = version?.color ?? '#888';
  const textColor = version?.textColor ?? '#fff';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${textSize} ${
        disabled
          ? 'opacity-30 cursor-default'
          : onClick
            ? 'cursor-pointer hover:brightness-110'
            : ''
      }`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      onClick={disabled ? undefined : onClick}
    >
      {version?.name ?? game}
    </span>
  );
}
