import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import PokemonGrid from '../components/PokemonGrid';
import PokemonTable from '../components/PokemonTable';
import PokemonDetail from '../components/PokemonDetail';
import FilterBar from '@/components/FilterBar';
import ProgressRing from '../components/ProgressRing';
import StatsDrawer from '../components/StatsDrawer';
import { usePokedexFilters } from '../hooks/usePokedexFilters';
import { useCollectionGoals } from '../hooks/useCollectionGoals';
import { GoalManager } from '@/components/pokedex/GoalManager';
import SourceToggleGroup from '@/components/pokedex/SourceToggleGroup';

export default function Pokedex() {
  const {
    species,
    collection,
    filters,
    search,
    lens,
    globalCompletion,
    balls,
    ribbons,
    marks,
    setFilters,
    setSearch,
    setLens,
    displayItems,
    finalItems,
    itemCaughtMap,
    caughtCount,
    shinyMode,
    load,
    refreshCompletion,
    serializeFilters,
    loadFilters,
    sourceCounts,
    activeSources,
    toggleSource,
  } = usePokedexFilters();

  const { goals, activeGoal, selectGoal, createGoal, deleteGoal } = useCollectionGoals();

  // When a goal is selected, apply its filters
  useEffect(() => {
    if (activeGoal) {
      try {
        const parsed = typeof activeGoal.filters === 'string'
          ? JSON.parse(activeGoal.filters)
          : activeGoal.filters;
        loadFilters(parsed);
      } catch {
        // ignore malformed filter JSON
      }
    }
  }, [activeGoal?.id]);

  const [selected, setSelected] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleSelect = useCallback((item: any) => {
    if (item._isFormItem) {
      const original = species.find((s: any) => s.id === item.id);
      setSelected(original || item);
    } else {
      setSelected(item);
    }
  }, [species]);

  return (
    <div className="-m-6 min-h-screen bg-surface-raised p-6">
      <div className="max-w-7xl mx-auto transition-[margin-right] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ marginRight: drawerOpen ? 320 : undefined }}>
        {/* Filter Card -- sticky */}
        <div className="bg-card shadow-soft rounded-lg overflow-hidden mb-5 sticky top-0 z-10">
          <div className="h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />
          <div className="p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">Pokedex</h2>
                  <p className="text-sm text-muted-foreground/50 mt-0.5">
                    {caughtCount} / {finalItems.length} {shinyMode ? 'shiny' : ''} caught
                  </p>
                </div>
                <ProgressRing
                  size={48}
                  strokeWidth={4}
                  color={shinyMode ? '#eab308' : '#e53e3e'}
                  percent={finalItems.length > 0 ? (caughtCount / finalItems.length) * 100 : 0}
                  label={`${finalItems.length > 0 ? Math.round((caughtCount / finalItems.length) * 100) : 0}%`}
                  onClick={() => setDrawerOpen(prev => !prev)}
                  className="hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex items-center gap-3">
                {/* Grid/Table toggle */}
                <div className="flex bg-surface-sunken rounded-md p-0.5">
                  <button
                    type="button"
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-soft-sm' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={viewMode === 'grid' ? '#333' : '#bbb'}>
                      <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
                      <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-soft-sm' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table view"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={viewMode === 'table' ? '#333' : '#bbb'}>
                      <rect x="1" y="1" width="14" height="3" rx="1"/><rect x="1" y="6.5" width="14" height="3" rx="1"/>
                      <rect x="1" y="12" width="14" height="3" rx="1"/>
                    </svg>
                  </button>
                </div>
                <button
                  className={`p-1.5 rounded-lg transition-all ${drawerOpen ? 'bg-red-500 text-white' : 'bg-surface-sunken text-muted-foreground/40 hover:bg-surface-pressed'}`}
                  onClick={() => setDrawerOpen(prev => !prev)}
                  title="Toggle stats panel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="12" width="4" height="9" rx="1"/>
                    <rect x="10" y="7" width="4" height="14" rx="1"/>
                    <rect x="17" y="3" width="4" height="18" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-3">
              <Input
                type="text"
                placeholder="Search name or #..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-[280px]"
              />
            </div>

            {/* Source toggles */}
            <div className="mb-3">
              <SourceToggleGroup
                sourceCounts={sourceCounts}
                activeSources={activeSources}
                onToggle={toggleSource}
              />
            </div>

            {/* Goal manager + FilterBar */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <FilterBar
                  filters={filters}
                  onFilterChange={setFilters}
                  lens={lens}
                  onLensChange={setLens}
                  filteredCount={caughtCount}
                  totalCount={finalItems.length}
                  balls={balls}
                  ribbons={ribbons}
                  marks={marks}
                />
              </div>
              <div className="shrink-0 pt-0.5">
                <GoalManager
                  goals={goals}
                  activeGoal={activeGoal}
                  currentFilters={serializeFilters()}
                  displayItemCount={finalItems.length}
                  onSelectGoal={selectGoal}
                  onCreateGoal={createGoal}
                  onDeleteGoal={deleteGoal}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        {finalItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            {/* Silhouetted Pikachu -- "Who's That Pokemon?" style */}
            <div className="relative mb-6">
              <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                alt=""
                className="w-32 h-32 brightness-0 opacity-20 select-none"
                draggable={false}
              />
              <span className="absolute -top-1 -right-1 text-2xl select-none" aria-hidden>?</span>
            </div>
            <p className="text-lg font-bold text-muted-foreground/40 mb-1">No legal combination found</p>
            <p className="text-sm text-muted-foreground/30 max-w-xs text-center">
              This filter combination isn't possible. Try removing a filter to see what's available.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <PokemonGrid
            species={finalItems}
            collection={collection}
            itemCaughtMap={itemCaughtMap}
            shinyMode={shinyMode}
            onSelect={handleSelect}
            lens={lens}
          />
        ) : (
          <PokemonTable
            species={finalItems}
            collection={collection}
            caughtIds={new Set()}
            shinyCaughtIds={new Set()}
            shinyMode={shinyMode}
            onSelect={handleSelect}
            lens={lens}
          />
        )}

        {selected && (
          <PokemonDetail
            species={selected}
            onClose={() => setSelected(null)}
            onSave={load}
          />
        )}
      </div>
      <StatsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={shinyMode ? 'shiny' : 'living'}
        globalCompletion={globalCompletion}
        filteredItems={displayItems}
        filteredCaughtCount={caughtCount}
        itemCaughtMap={itemCaughtMap}
        activeFilters={filters}
      />

    </div>
  );
}
