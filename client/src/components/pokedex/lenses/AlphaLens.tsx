interface Props {
  entries: Array<{ is_alpha?: boolean | number; origin_game?: string }>;
}

export function AlphaLens({ entries }: Props) {
  const hasAlpha = entries.some(
    e => (e.is_alpha === 1 || e.is_alpha === true) && e.origin_game === 'legends-arceus',
  );
  if (!hasAlpha) return null;
  return (
    <div
      className="absolute top-0.5 right-0.5 z-10 bg-amber-500 text-white text-2xs font-bold rounded px-1 shadow"
      title="Alpha (Legends Arceus)"
    >
      α
    </div>
  );
}
