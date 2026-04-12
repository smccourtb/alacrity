import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FilterDropdown from '@/components/FilterDropdown';
import { GAME_ACCENTS, sortByRelease, normalizeGameName } from '@/lib/game-constants';
import { GAME_VERSIONS } from '@/lib/pokemon-icons';
import type { Playthrough } from '@/components/timeline/types';

function GameDot({ game, size = 8 }: { game: string; size?: number }) {
  const key = normalizeGameName(game);
  const color = GAME_ACCENTS[key] ?? GAME_VERSIONS[key]?.color ?? '#888';
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

function prettyGameName(game: string): string {
  return GAME_VERSIONS[game]?.name ?? game;
}

interface PlayHeaderProps {
  allGames: string[];
  selectedGame: string | null;
  onSelectGame: (game: string) => void;
  playthroughs: Playthrough[];
  selectedPlaythrough: Playthrough | null;
  onSelectPlaythrough: (pt: Playthrough) => void;
  onNewGame: () => void;
}

export function PlayHeader({
  allGames,
  selectedGame,
  onSelectGame,
  playthroughs,
  selectedPlaythrough,
  onSelectPlaythrough,
  onNewGame,
}: PlayHeaderProps) {
  const sortedGames = sortByRelease(allGames);

  const gameOptions = sortedGames.map(g => ({
    value: g,
    label: prettyGameName(g),
    icon: <GameDot game={g} />,
  }));

  return (
    <Card className="gap-0 py-0">
      <div className="h-[3px] bg-gradient-to-r from-red-500 to-orange-500 rounded-t-lg" />
      <CardHeader className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Play</CardTitle>
            <CardDescription className="mt-0.5">
              Manage saves, launch games, track your playthroughs
            </CardDescription>
          </div>
          <FilterDropdown
            label="Game"
            options={gameOptions}
            selected={selectedGame ? [selectedGame] : []}
            onChange={(vals) => {
              if (vals.length > 0) onSelectGame(vals[vals.length - 1]);
            }}
            multiSelect={false}
            align="end"
            renderLabel={(sel) => {
              const g = sel[0];
              return g ? prettyGameName(g) : 'Game';
            }}
          />
        </div>

        {/* Playthrough tabs for selected game */}
        {selectedGame && (
          <div className="flex flex-wrap items-center gap-1.5">
            {playthroughs.map((pt) => {
              const isActive = selectedPlaythrough?.id === pt.id;
              const gameColor = GAME_ACCENTS[normalizeGameName(pt.game)] ?? '#888';
              return (
                <button
                  key={pt.id}
                  onClick={() => onSelectPlaythrough(pt)}
                  className={`
                    flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border
                    ${isActive
                      ? 'shadow-sm'
                      : 'border-transparent opacity-50 hover:opacity-80'
                    }
                  `}
                  style={isActive
                    ? { borderColor: `${gameColor}40`, backgroundColor: `${gameColor}10`, color: gameColor }
                    : {}
                  }
                >
                  <GameDot game={pt.game} size={8} />
                  {pt.ot_name}
                  <span className="text-foreground/30 font-normal">#{pt.ot_tid}</span>
                  {pt.label && (
                    <>
                      <span className="text-foreground/20 font-normal">|</span>
                      <span className="text-foreground/60 font-normal">{pt.label}</span>
                    </>
                  )}
                </button>
              );
            })}
            <button
              onClick={onNewGame}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-muted-foreground/20 text-muted-foreground/50 hover:border-primary/30 hover:text-primary/50 transition-all whitespace-nowrap"
            >
              + New Game
            </button>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
