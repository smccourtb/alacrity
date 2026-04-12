import { cn } from '@/lib/utils';

export type DexLens = 'national' | 'origin' | 'mark' | 'ribbon' | 'ball' | 'ability' | 'iv';

interface LensInfo {
  value: DexLens;
  label: string;
  description: string;
}

const LENSES: LensInfo[] = [
  { value: 'national', label: 'National', description: 'Living dex — one of each species + forms' },
  { value: 'origin', label: 'Origin Mark', description: 'Collect from every game origin' },
  { value: 'mark', label: 'Marks', description: '54 encounter marks per species' },
  { value: 'ribbon', label: 'Ribbons', description: '93 ribbons per species' },
  { value: 'ball', label: 'Ball Dex', description: 'Catch in every ball type' },
  { value: 'ability', label: 'Abilities', description: 'Every ability variant per species' },
  { value: 'iv', label: 'IVs', description: 'Perfect IV spreads' },
];

interface Props {
  value: DexLens;
  onChange: (lens: DexLens) => void;
}

export default function DexLensSwitcher({ value, onChange }: Props) {
  const active = LENSES.find(l => l.value === value) ?? LENSES[0];

  return (
    <div className="mb-4">
      {/* Pill bar */}
      <div className="flex bg-surface-sunken rounded-lg p-1 gap-0.5">
        {LENSES.map(lens => (
          <button
            key={lens.value}
            type="button"
            onClick={() => onChange(lens.value)}
            className={cn(
              'flex-1 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-all whitespace-nowrap',
              lens.value === value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-pressed'
            )}
          >
            {lens.label}
          </button>
        ))}
      </div>

      {/* Context bar */}
      <div className="mt-1.5 px-3 py-2 bg-red-50/50 rounded-lg border border-red-100/50 flex items-center gap-2">
        <span className="text-sm font-semibold text-red-700/80">{active.label}</span>
        <span className="text-sm text-muted-foreground/60">—</span>
        <span className="text-sm text-muted-foreground/70">{active.description}</span>
      </div>
    </div>
  );
}
