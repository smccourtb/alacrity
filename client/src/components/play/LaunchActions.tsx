// client/src/components/play/LaunchActions.tsx

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import { api } from '@/api/client';
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

interface StreamCapabilities {
  systems: Record<string, { supported: boolean; reason: string | null }>;
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

  const [caps, setCaps] = useState<StreamCapabilities | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.stream.capabilities()
      .then(c => { if (!cancelled) setCaps(c); })
      .catch(() => { /* treat unknown as "supported" so we don't block on a transient fetch error */ });
    return () => { cancelled = true; };
  }, []);

  const streamCap = caps?.systems[system];
  const streamSupported = streamCap?.supported !== false; // undefined → optimistic-allow
  const streamReason = streamCap?.reason ?? null;

  if (!fileExists) return null;

  const primaryIsStream = !isLocal;
  const primaryAction = isLocal ? onDesktopPlay : onStreamPlay;
  const primaryLabel = isLocal ? 'Play' : 'Stream';
  const primaryDisabled = primaryIsStream && !streamSupported;

  const primaryButton = (
    <Button
      size="sm"
      className="rounded-lg text-white"
      style={accentColor ? { backgroundColor: accentColor } : undefined}
      onClick={primaryAction}
      disabled={primaryDisabled}
    >
      &#9654; {primaryLabel}
    </Button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {primaryDisabled && streamReason ? (
        <Tooltip>
          <TooltipTrigger render={<span>{primaryButton}</span>} />
          <TooltipContent className="max-w-xs">{streamReason}</TooltipContent>
        </Tooltip>
      ) : primaryButton}

      {!compact && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-7 w-6 rounded-lg text-sm font-medium text-muted-foreground bg-surface-raised hover:bg-surface-pressed transition-colors flex items-center justify-center"
          >
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {isLocal ? (
              <StreamDropdownItem
                onSelect={onStreamPlay}
                supported={streamSupported}
                reason={streamReason}
              />
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

/**
 * Stream dropdown item that renders disabled with an explanatory tooltip when
 * streaming this system isn't supported on the running server's platform.
 */
function StreamDropdownItem({
  onSelect,
  supported,
  reason,
}: {
  onSelect: () => void;
  supported: boolean;
  reason: string | null;
}) {
  if (supported) {
    return <DropdownMenuItem onClick={onSelect}>Stream</DropdownMenuItem>;
  }
  // Radix DropdownMenuItem prevents onClick when disabled, so the tooltip is
  // informational only; users can't trigger the action from here.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div>
            <DropdownMenuItem disabled className="cursor-help">Stream</DropdownMenuItem>
          </div>
        }
      />
      <TooltipContent side="left" className="max-w-xs">
        {reason ?? 'Streaming is not available on this system.'}
      </TooltipContent>
    </Tooltip>
  );
}
