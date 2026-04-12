interface VersionOverlayProps {
  currentGame: string;
  mapGames: string[];
  activeOverlays: Set<string>;
  onToggle: (game: string) => void;
}

const GAME_COLORS: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  yellow: '#eab308',
};

export default function VersionOverlay({ currentGame, mapGames, activeOverlays, onToggle }: VersionOverlayProps) {
  const otherGames = mapGames.filter(g => g !== currentGame);
  if (otherGames.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
        Version Overlay
      </div>
      {otherGames.map(g => (
        <label key={g} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
          <input
            type="checkbox"
            checked={activeOverlays.has(g)}
            onChange={() => onToggle(g)}
            className="rounded"
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: GAME_COLORS[g] || '#888' }}
          />
          <span className="capitalize">{g}</span>
        </label>
      ))}
    </div>
  );
}
