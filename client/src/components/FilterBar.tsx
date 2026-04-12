import { useMemo } from 'react';
import FilterDropdown from './FilterDropdown';
import { BallIcon, OriginMark, GenderIcon, GamePill } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  MODE_OPTIONS, STATUS_OPTIONS, GEN_OPTIONS, GAME_OPTIONS,
  FORM_OPTIONS, ORIGIN_OPTIONS, GENDER_OPTIONS,
  type FilterState, DEFAULT_FILTERS, isFilterActive, buildSummary,
} from '@/lib/filter-options';

export type Lens = 'national' | 'origin' | 'mark' | 'ribbon' | 'ball' | 'ability' | 'iv';

const LENSES: { value: Lens; label: string }[] = [
  { value: 'national', label: 'National' },
  { value: 'ball', label: 'Ball' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'mark', label: 'Mark' },
  { value: 'origin', label: 'Origin' },
  { value: 'ability', label: 'Ability' },
  { value: 'iv', label: 'IV' },
];

// Map origin value codes to representative game names for OriginMark
const ORIGIN_TO_GAME: Record<string, string> = {
  GB: 'Red',
  None: 'Ruby',
  Pentagon: 'X',
  Clover: 'Sun',
  LetsGo: "Let's Go Pikachu",
  Galar: 'Sword',
  BDSP: 'Brilliant Diamond',
  Hisui: 'Legends Arceus',
  Paldea: 'Scarlet',
};

interface Props {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  lens: Lens;
  onLensChange: (lens: Lens) => void;
  filteredCount: number;
  totalCount: number;
  balls: any[];
  ribbons: any[];
  marks: any[];
}

export default function FilterBar({
  filters,
  onFilterChange,
  lens,
  onLensChange,
  filteredCount,
  totalCount,
  balls,
  ribbons,
  marks,
}: Props) {
  const update = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearAll = () => onFilterChange({ ...DEFAULT_FILTERS });
  const hasActiveFilters = isFilterActive(filters);
  const summary = buildSummary(filters, filteredCount, totalCount);

  const ballOptions = useMemo(
    () =>
      balls.map(b => ({
        value: b.name,
        label: b.name,
        icon: <BallIcon name={b.name} size="sm" />,
      })),
    [balls],
  );

  const ribbonOptions = useMemo(
    () =>
      ribbons.map((r: any) => ({
        value: String(r.id),
        label: r.name,
        group: r.category,
      })),
    [ribbons],
  );

  const markOptions = useMemo(
    () =>
      marks.map((m: any) => ({
        value: String(m.id),
        label: m.name,
        group: m.category,
      })),
    [marks],
  );

  const originOptions = useMemo(
    () =>
      ORIGIN_OPTIONS.map(o => ({
        ...o,
        icon: <OriginMark game={ORIGIN_TO_GAME[o.value] ?? 'Ruby'} size="sm" />,
      })),
    [],
  );

  const genderOptions = useMemo(
    () =>
      GENDER_OPTIONS.map(o => ({
        ...o,
        icon: <GenderIcon gender={o.value as 'male' | 'female' | 'genderless'} size="sm" />,
      })),
    [],
  );

  const gameOptions = useMemo(
    () =>
      GAME_OPTIONS.map(o => ({
        ...o,
        icon: <GamePill game={o.value} size="sm" />,
      })),
    [],
  );

  return (
    <div>
      {/* Filter buttons row */}
      <div className="flex gap-1.5 flex-wrap items-center mb-2">
        <FilterDropdown
          label="Mode"
          options={MODE_OPTIONS}
          selected={filters.mode === 'living' ? [] : [filters.mode]}
          onChange={sel => update('mode', sel.length > 0 ? sel[0] : 'living')}
          multiSelect={false}
        />
        <FilterDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status === 'all' ? [] : [filters.status]}
          onChange={sel => update('status', sel.length > 0 ? sel[0] : 'all')}
          multiSelect={false}
        />
        <FilterDropdown
          label="Generation"
          options={GEN_OPTIONS}
          selected={filters.generations}
          onChange={sel => update('generations', sel)}
        />
        <FilterDropdown
          label="Game"
          options={gameOptions}
          selected={filters.games}
          onChange={sel => update('games', sel)}
          searchable
        />
        <FilterDropdown
          label="Forms"
          options={FORM_OPTIONS}
          selected={filters.formCategories.filter(f => f !== 'standard')}
          onChange={sel =>
            update('formCategories', sel.length > 0 ? ['standard', ...sel] : ['standard'])
          }
          renderLabel={(sel, opts) => {
            if (sel.length === 0) return 'Forms';
            const labels = sel.map(s => {
              const opt = opts.find(o => o.value === s);
              return opt?.label || s;
            });
            return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
          }}
        />
        <FilterDropdown
          label="Ball"
          options={ballOptions}
          selected={filters.balls}
          onChange={sel => update('balls', sel)}
          searchable
        />
        <FilterDropdown
          label="Origin"
          options={originOptions}
          selected={filters.origins}
          onChange={sel => update('origins', sel)}
        />
        <FilterDropdown
          label="Gender"
          options={genderOptions}
          selected={filters.genders}
          onChange={sel => update('genders', sel)}
        />
        <FilterDropdown
          label="Ribbon"
          options={ribbonOptions}
          selected={filters.ribbons}
          onChange={sel => update('ribbons', sel)}
          searchable
        />
        <FilterDropdown
          label="Mark"
          options={markOptions}
          selected={filters.marks}
          onChange={sel => update('marks', sel)}
          searchable
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-muted-foreground/50 hover:text-primary transition-all underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Lens row */}
      <div className="flex gap-1.5 items-center mb-2">
        <span className="text-2xs font-bold text-muted-foreground/40 uppercase tracking-wider mr-0.5">
          Lens
        </span>
        {LENSES.map(l => (
          <button
            key={l.value}
            type="button"
            onClick={() => onLensChange(l.value)}
            className={cn(
              'px-2 py-0.5 rounded-md text-2xs font-semibold transition-all',
              lens === l.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface-sunken text-muted-foreground/50 hover:text-muted-foreground hover:bg-surface-pressed',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Summary text */}
      <p
        className="text-xs text-muted-foreground/60"
        dangerouslySetInnerHTML={{
          __html: summary.replace(
            /(\d[\d,]*)/,
            '<strong class="text-foreground">$1</strong>',
          ),
        }}
      />
    </div>
  );
}
