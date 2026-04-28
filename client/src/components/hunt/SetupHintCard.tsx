import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface Props {
  game: string | null | undefined;
  mode: string;
  speciesId: number | null;
}

interface Hint {
  image_path: string;
  caption: string | null;
}

/**
 * Optional visual setup hint for a hunt — most useful for egg / certain gifts.
 * Renders nothing when no hint exists for (game, mode, species), so it's a
 * no-op for hunts that don't have one seeded.
 */
export default function SetupHintCard({ game, mode, speciesId }: Props) {
  const [hint, setHint] = useState<Hint | null>(null);

  useEffect(() => {
    if (!game || !mode) { setHint(null); return; }
    let cancelled = false;
    api.hunts.setupHint({ game, mode, species_id: speciesId })
      .then(r => { if (!cancelled) setHint(r.hint); })
      .catch(() => { if (!cancelled) setHint(null); });
    return () => { cancelled = true; };
  }, [game, mode, speciesId]);

  if (!hint) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">Save here</div>
      <img
        src={hint.image_path}
        alt={hint.caption ?? 'Setup hint'}
        className="w-full rounded border border-border"
        style={{ imageRendering: 'pixelated' }}
      />
      {hint.caption && (
        <div className="text-xs text-muted-foreground">{hint.caption}</div>
      )}
    </div>
  );
}
