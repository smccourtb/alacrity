import { useState, useMemo } from 'react';
import ProgressRing from './ProgressRing';
import { type FilterState, GEN_RANGE } from '@/lib/filter-options';

interface GenStat {
  generation: number;
  total: number;
  caught: number;
  shiny_caught: number;
}

interface CompletionData {
  total: number;
  caught: number;
  shinyCaught: number;
  byGen: GenStat[];
}

interface StatsDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: 'living' | 'shiny';
  globalCompletion: CompletionData | null;
  filteredItems: any[];
  filteredCaughtCount: number;
  itemCaughtMap: Map<string, { caught: boolean; shinyCaught: boolean }>;
  activeFilters: FilterState;
}

export default function StatsDrawer({
  open,
  onClose,
  mode,
  globalCompletion,
  filteredItems,
  filteredCaughtCount,
  itemCaughtMap,
  activeFilters,
}: StatsDrawerProps) {
  const [tab, setTab] = useState<'overview' | 'filtered'>('overview');
  const isShiny = mode === 'shiny';
  const ringColor = isShiny ? '#eab308' : '#e53e3e';

  // Derive filtered per-gen stats from displayItems + itemCaughtMap
  const filteredGenStats = useMemo(() => {
    const genMap = new Map<number, { total: number; caught: number }>();
    for (const item of filteredItems) {
      // Find which gen this species belongs to
      let gen = 0;
      for (const [g, [min, max]] of Object.entries(GEN_RANGE)) {
        if (item.id >= min && item.id <= max) { gen = Number(g); break; }
      }
      if (gen === 0) continue;

      if (!genMap.has(gen)) genMap.set(gen, { total: 0, caught: 0 });
      const entry = genMap.get(gen)!;
      entry.total++;

      const key = item._isFormItem ? `form-${item._formId}` : `${item.id}`;
      const status = itemCaughtMap.get(key);
      if (isShiny ? status?.shinyCaught : status?.caught) entry.caught++;
    }

    return [...genMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([gen, stat]) => ({ generation: gen, ...stat }));
  }, [filteredItems, itemCaughtMap, isShiny]);

  // Check if any filter beyond defaults is active
  const hasActiveFilters = activeFilters.generations.length > 0
    || activeFilters.games.length > 0
    || activeFilters.balls.length > 0
    || activeFilters.origins.length > 0
    || activeFilters.genders.length > 0
    || activeFilters.ribbons.length > 0
    || activeFilters.marks.length > 0
    || activeFilters.abilities.length > 0
    || (activeFilters.formCategories.length > 1
      || (activeFilters.formCategories.length === 1 && activeFilters.formCategories[0] !== 'standard'));

  // Build filter tag labels
  const filterTags = useMemo(() => {
    const tags: string[] = [];
    if (isShiny) tags.push('Shiny');
    activeFilters.generations.forEach(g => tags.push(`Gen ${g}`));
    activeFilters.games.forEach(g => tags.push(g));
    activeFilters.balls.forEach(b => tags.push(b));
    activeFilters.origins.forEach(o => tags.push(o));
    activeFilters.genders.forEach(g => tags.push(g));
    if (activeFilters.ribbons.length > 0) tags.push(`${activeFilters.ribbons.length} ribbon${activeFilters.ribbons.length > 1 ? 's' : ''}`);
    if (activeFilters.marks.length > 0) tags.push(`${activeFilters.marks.length} mark${activeFilters.marks.length > 1 ? 's' : ''}`);
    if (activeFilters.abilities.length > 0) tags.push(...activeFilters.abilities);
    const formLabels = activeFilters.formCategories
      .filter(f => f !== 'standard')
      .map(f => f.charAt(0).toUpperCase() + f.slice(1));
    if (formLabels.length > 0) tags.push(...formLabels);
    return tags;
  }, [activeFilters, isShiny]);

  const filteredTotal = filteredItems.length;
  const filteredPercent = filteredTotal > 0 ? Math.round((filteredCaughtCount / filteredTotal) * 100) : 0;
  const missingCount = Math.max(0, filteredTotal - filteredCaughtCount);

  const globalTotal = globalCompletion?.total ?? 0;

  return (
    <div
      className="fixed top-0 right-0 h-screen w-[320px] bg-white border-l border-surface-pressed shadow-[-8px_0_30px_rgba(0,0,0,0.06)] z-20 flex flex-col overflow-y-auto transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {/* Accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-red-500 to-orange-500 shrink-0" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
        <h3 className="text-lg font-bold">Collection Stats</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-surface-sunken hover:bg-surface-pressed flex items-center justify-center text-sm text-muted-foreground/50 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex bg-surface-sunken rounded-xl p-[3px]">
          <button
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${tab === 'overview' ? 'bg-white text-foreground shadow-soft-sm' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${tab === 'filtered' ? 'bg-white text-foreground shadow-soft-sm' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
            onClick={() => setTab('filtered')}
          >
            Filtered
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-5 flex-1">
        {tab === 'overview' ? (
          /* Overview Tab */
          <>
            {/* Dual rings */}
            <div className="flex gap-4 mb-6 pb-5 border-b border-surface-sunken">
              <div className="flex-1 bg-surface rounded-lg p-4 flex flex-col items-center text-center">
                <ProgressRing
                  size={68} strokeWidth={5} color="#e53e3e" label={`${globalTotal > 0 ? Math.round(((globalCompletion?.caught ?? 0) / globalTotal) * 100) : 0}%`}
                  percent={globalTotal > 0 ? ((globalCompletion?.caught ?? 0) / globalTotal) * 100 : 0}
                />
                <div className="text-sm font-bold text-muted-foreground mt-2">Living Dex</div>
                <div className="text-xs text-muted-foreground/40 mt-0.5">{globalCompletion?.caught ?? 0} / {globalTotal}</div>
              </div>
              <div className="flex-1 bg-surface rounded-lg p-4 flex flex-col items-center text-center">
                <ProgressRing
                  size={68} strokeWidth={5} color="#eab308" label={`${globalTotal > 0 ? Math.round(((globalCompletion?.shinyCaught ?? 0) / globalTotal) * 100) : 0}%`}
                  percent={globalTotal > 0 ? ((globalCompletion?.shinyCaught ?? 0) / globalTotal) * 100 : 0}
                />
                <div className="text-sm font-bold text-muted-foreground mt-2">Shiny Dex</div>
                <div className="text-xs text-muted-foreground/40 mt-0.5">{globalCompletion?.shinyCaught ?? 0} / {globalTotal}</div>
              </div>
            </div>

            {/* Gen bars */}
            <div className="mb-5">
              <div className="text-sm font-bold text-muted-foreground/40 uppercase tracking-wider mb-3">By Generation</div>
              {(globalCompletion?.byGen ?? []).map((g: GenStat) => {
                const val = isShiny ? g.shiny_caught : g.caught;
                const pct = g.total > 0 ? (val / g.total) * 100 : 0;
                return (
                  <div key={g.generation} className="flex items-center gap-2.5 mb-2.5">
                    <span className="text-sm font-semibold text-muted-foreground/70 w-11 shrink-0">Gen {g.generation}</span>
                    <div className="flex-1 h-2 bg-surface-sunken rounded overflow-hidden">
                      <div
                        className="h-full rounded bg-gradient-to-r from-red-500 to-orange-500 transition-[width] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground/40 w-16 text-right shrink-0">{val} / {g.total}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Filtered Tab */
          <>
            {/* Filter context badge */}
            {hasActiveFilters && filterTags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-2.5 px-3.5 mb-4 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Showing stats for active filters:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {filterTags.map(tag => (
                      <span key={tag} className="text-2xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-md font-semibold">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Big ring + stats */}
            <div className="flex items-center gap-5 mb-6 pb-5 border-b border-surface-sunken">
              <ProgressRing
                size={80} strokeWidth={5} color={ringColor}
                percent={filteredPercent}
                label={`${filteredPercent}%`}
                sublabel="caught"
              />
              <div>
                <h4 className="text-xl font-extrabold">
                  {filteredCaughtCount} <span className="text-muted-foreground/40 font-semibold text-base">/ {filteredTotal}</span>
                </h4>
                <p className="text-sm text-muted-foreground/50 mt-0.5">species matching filters</p>
              </div>
            </div>

            {/* Filtered gen bars */}
            {filteredGenStats.length > 0 && (
              <div className="mb-5">
                <div className="text-sm font-bold text-muted-foreground/40 uppercase tracking-wider mb-3">Filtered Generations</div>
                {filteredGenStats.map(g => {
                  const pct = g.total > 0 ? (g.caught / g.total) * 100 : 0;
                  return (
                    <div key={g.generation} className="flex items-center gap-2.5 mb-2.5">
                      <span className="text-sm font-semibold text-muted-foreground/70 w-11 shrink-0">Gen {g.generation}</span>
                      <div className="flex-1 h-2 bg-surface-sunken rounded overflow-hidden">
                        <div
                          className="h-full rounded bg-gradient-to-r from-red-500 to-orange-500 transition-[width] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground/40 w-16 text-right shrink-0">{g.caught} / {g.total}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missing count */}
            <div className="bg-surface rounded-xl p-3.5 mt-2">
              <div className="text-xs text-muted-foreground/40 font-semibold uppercase tracking-wider mb-1">Missing</div>
              <div className="text-2xl font-extrabold" style={{ color: ringColor }}>{missingCount}</div>
              <div className="text-sm text-muted-foreground/50 mt-0.5">species still needed</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
