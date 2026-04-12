import type { SaveWorldState } from './types';

interface PartyBarProps {
  worldState: SaveWorldState | null;
}

export default function PartyBar({ worldState }: PartyBarProps) {
  if (!worldState) return null;

  const totalBalls = worldState.balls.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border-t border-border text-xs">
      <span className="text-muted-foreground mr-1">Party:</span>
      <div className="flex gap-1">
        {worldState.party.map((p, i) => (
          <div
            key={i}
            className="w-7 h-7 bg-card rounded flex items-center justify-center border border-border"
            title={`${p.species_name ?? `#${p.species_id}`} Lv${p.level}`}
          >
            {p.sprite_url ? (
              <img src={p.sprite_url} alt="" className="w-6 h-6 pixelated" />
            ) : (
              <span className="text-xs text-muted-foreground">{p.species_id}</span>
            )}
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 6 - (worldState.party?.length ?? 0)) }).map((_, i) => (
          <div key={`empty-${i}`} className="w-7 h-7 bg-background rounded border border-border/50" />
        ))}
      </div>
      <div className="ml-auto flex gap-3 text-muted-foreground">
        {totalBalls > 0 && <span>🎒 {totalBalls} balls</span>}
        <span>🏅 {worldState.badgeCount}</span>
      </div>
    </div>
  );
}
