type PokemonEntry = {
  is_shiny: boolean;
  origin_game: string | null;
  ball: string | null;
  [key: string]: any;
};

const MARK_GROUPS: Record<string, string[]> = {
  'GB': ['Red', 'Blue', 'Yellow', 'Gold', 'Silver', 'Crystal'],
  'Pentagon': ['X', 'Y', 'Omega Ruby', 'Alpha Sapphire'],
  'Clover': ['Sun', 'Moon', 'Ultra Sun', 'Ultra Moon'],
  'Galar': ['Sword', 'Shield'],
  'Paldea': ['Scarlet', 'Violet'],
};

function computeGoals(entries: PokemonEntry[]) {
  const goals: Array<{ label: string; status: 'done' | 'partial' | 'missing'; detail?: string }> = [];

  goals.push({
    label: 'Living',
    status: entries.length > 0 ? 'done' : 'missing',
  });

  const hasShiny = entries.some(e => e.is_shiny);
  goals.push({
    label: 'Shiny',
    status: hasShiny ? 'done' : 'missing',
  });

  for (const [mark, games] of Object.entries(MARK_GROUPS)) {
    const has = entries.some(e => e.origin_game && games.includes(e.origin_game));
    if (has) {
      goals.push({ label: mark, status: 'done' });
    }
  }

  const uniqueBalls = new Set(entries.map(e => e.ball).filter(Boolean));
  if (uniqueBalls.size > 0) {
    goals.push({
      label: `${uniqueBalls.size} Ball${uniqueBalls.size !== 1 ? 's' : ''}`,
      status: uniqueBalls.size >= 3 ? 'done' : 'partial',
    });
  }

  return goals;
}

export default function GoalChips({ entries }: { entries: PokemonEntry[] }) {
  const goals = computeGoals(entries);

  if (goals.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {goals.map((g) => (
        <span
          key={g.label}
          className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
            g.status === 'done'
              ? 'bg-green-500/10 text-green-600'
              : g.status === 'partial'
              ? 'bg-yellow-500/10 text-amber-600'
              : 'bg-muted text-muted-foreground opacity-50'
          }`}
        >
          {g.status === 'done' ? '✓ ' : g.status === 'partial' ? '½ ' : ''}{g.label}
        </span>
      ))}
    </div>
  );
}
