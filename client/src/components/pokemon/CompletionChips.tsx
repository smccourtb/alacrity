interface CompletionData {
  living: boolean;
  shiny: boolean;
  origins: number;
  total_origins: number;
  ribbons: number;
  marks: number;
  balls: number;
  total_balls?: number;
  abilities: number;
  total_abilities: number;
  has_perfect_ivs: boolean;
  entries_count: number;
}

interface Props {
  completion: CompletionData | null;
}

function ProgressChip({ label, current, total, colorClass, bgClass }: {
  label: string;
  current: number;
  total: number;
  colorClass: string;
  bgClass: string;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const complete = current >= total && total > 0;

  return (
    <div className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 ${complete ? colorClass : 'border-border/50'}`}>
      {/* Progress fill */}
      {total > 0 && (
        <div
          className={`absolute inset-0 ${bgClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      )}
      <div className="relative flex items-center gap-1.5">
        <span className={`text-2xs font-semibold ${complete ? '' : 'text-muted-foreground/70'}`}>{label}</span>
        <span className={`text-xs font-extrabold ml-auto ${complete ? '' : 'text-muted-foreground/50'}`}>
          {current}/{total}
        </span>
      </div>
    </div>
  );
}

function BoolChip({ label, value, colorClass }: {
  label: string;
  value: boolean;
  colorClass: string;
}) {
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 ${value ? colorClass : 'border-border/50'}`}>
      <span className={`text-2xs font-semibold ${value ? '' : 'text-muted-foreground/40'}`}>{label}</span>
      <span className={`text-xs font-extrabold ${value ? '' : 'text-muted-foreground/30'}`}>
        {value ? '✓' : '—'}
      </span>
    </div>
  );
}

export default function CompletionChips({ completion }: Props) {
  if (!completion) return null;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      <BoolChip
        label="Living"
        value={completion.living}
        colorClass="bg-green-50 text-green-600 border-green-200"
      />
      <BoolChip
        label="Shiny"
        value={completion.shiny}
        colorClass="bg-amber-50 text-amber-600 border-amber-200"
      />
      <BoolChip
        label="Perfect IVs"
        value={completion.has_perfect_ivs}
        colorClass="bg-emerald-50 text-emerald-600 border-emerald-200"
      />
      <ProgressChip
        label="Entries"
        current={completion.entries_count}
        total={completion.entries_count}
        colorClass="bg-slate-50 text-slate-600 border-slate-200"
        bgClass="bg-slate-50"
      />
      <ProgressChip
        label="Origin Marks"
        current={completion.origins}
        total={completion.total_origins}
        colorClass="bg-blue-50 text-blue-600 border-blue-200"
        bgClass="bg-blue-50"
      />
      <ProgressChip
        label="Ribbons"
        current={completion.ribbons}
        total={93}
        colorClass="bg-purple-50 text-purple-600 border-purple-200"
        bgClass="bg-purple-50"
      />
      <ProgressChip
        label="Marks"
        current={completion.marks}
        total={54}
        colorClass="bg-orange-50 text-orange-600 border-orange-200"
        bgClass="bg-orange-50"
      />
      <ProgressChip
        label="Balls"
        current={completion.balls}
        total={completion.total_balls || 28}
        colorClass="bg-sky-50 text-sky-600 border-sky-200"
        bgClass="bg-sky-50"
      />
      <ProgressChip
        label="Abilities"
        current={completion.abilities}
        total={completion.total_abilities}
        colorClass="bg-pink-50 text-pink-600 border-pink-200"
        bgClass="bg-pink-50"
      />
    </div>
  );
}
