// client/src/components/play/LaunchActions.tsx

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { getSystemForGame } from '@/lib/game-constants';

interface LaunchActionsProps {
  game: string;
  generation?: number;
  fileExists: boolean;
  isLocal: boolean;
  accentColor?: string;
  onDesktopPlay: () => void;
  onStreamPlay: () => void;
  onWebPlay: () => void;
  onTrade?: () => void;
  compact?: boolean;
}

export function LaunchActions({
  game,
  generation,
  fileExists,
  isLocal,
  accentColor,
  onDesktopPlay,
  onStreamPlay,
  onWebPlay,
  onTrade,
  compact = false,
}: LaunchActionsProps) {
  const system = getSystemForGame(game);
  const isGen12 = generation && generation <= 2;
  const canWeb = system !== '3ds' && system !== 'nds';

  if (!fileExists) return null;

  const primaryAction = isLocal ? onDesktopPlay : onStreamPlay;
  const primaryLabel = isLocal ? 'Play' : 'Stream';

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        className="rounded-lg text-white"
        style={accentColor ? { backgroundColor: accentColor } : undefined}
        onClick={primaryAction}
      >
        &#9654; {primaryLabel}
      </Button>
      {!compact && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-7 w-6 rounded-lg text-sm font-medium text-muted-foreground bg-surface-raised hover:bg-surface-pressed transition-colors flex items-center justify-center"
          >
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {isLocal ? (
              <DropdownMenuItem onClick={onStreamPlay}>Stream</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onDesktopPlay}>Open on Server</DropdownMenuItem>
            )}
            {canWeb && (
              <DropdownMenuItem onClick={onWebPlay}>Web</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {isGen12 && onTrade && (
        <Button size="sm" variant="secondary" className="rounded-lg" onClick={onTrade}>
          Trade
        </Button>
      )}
    </div>
  );
}
