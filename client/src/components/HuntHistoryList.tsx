// client/src/components/HuntHistoryList.tsx
import { useState, useMemo, type ReactNode } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import FilterDropdown from '@/components/FilterDropdown';
import PostShinyWorkflow from '@/components/PostShinyWorkflow';
import { ShinyIcon, GenderIcon, GamePill } from '@/components/icons';

interface Hunt {
  id: number;
  target_name: string;
  game: string;
  hunt_mode: string;
  engine: string;
  num_instances: number;
  target_shiny: number;
  target_perfect: number;
  target_gender: string;
  min_atk: number;
  min_def: number;
  min_spd: number;
  min_spc: number;
  status: string;
  total_attempts: number;
  elapsed_seconds: number;
  hit_details: string | null;
  started_at: string;
  ended_at: string | null;
  is_archived: number;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '\u2014';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getHitCount(hit_details: string | null): number {
  if (!hit_details) return 0;
  try { return JSON.parse(hit_details).length; } catch { return 0; }
}

export default function HuntHistoryList({
  hunts,
  onResume,
  onArchive,
  onUnarchive,
}: {
  hunts: Hunt[];
  onResume: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleExpandChange = (id: number, open: boolean) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      open ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const filteredHunts = useMemo(() => {
    let result = hunts;
    if (gameFilter) result = result.filter(h => h.game === gameFilter);
    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      result = result.filter(h =>
        h.target_name.toLowerCase().includes(q) ||
        h.game.toLowerCase().includes(q)
      );
    }
    return result;
  }, [hunts, gameFilter, globalFilter]);

  const sortedHunts = useMemo(() => {
    return [...filteredHunts].sort((a, b) =>
      (b.started_at || '').localeCompare(a.started_at || '')
    );
  }, [filteredHunts]);

  const pageCount = Math.ceil(sortedHunts.length / pageSize);
  const pagedHunts = sortedHunts.slice(page * pageSize, (page + 1) * pageSize);

  const uniqueGames = useMemo(() =>
    [...new Set(hunts.map(h => h.game))].sort(),
    [hunts]
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search hunts..."
          value={globalFilter}
          onChange={e => { setGlobalFilter(e.target.value); setPage(0); }}
          className="w-44"
        />
        <FilterDropdown
          label="All games"
          options={uniqueGames.map(g => ({ value: g, label: g }))}
          selected={gameFilter ? [gameFilter] : []}
          onChange={(sel) => { setGameFilter(sel[0] ?? ''); setPage(0); }}
          multiSelect={false}
        />
        {(globalFilter || gameFilter) && (
          <button
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => { setGlobalFilter(''); setGameFilter(''); setPage(0); }}
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/40">
          {sortedHunts.length} hunt{sortedHunts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Card rows */}
      <div className="flex flex-col gap-2">
        {pagedHunts.length === 0 && (
          <div className="text-center text-muted-foreground/40 py-12 text-sm">No hunts found.</div>
        )}
        {pagedHunts.map(hunt => {
          const hits = getHitCount(hunt.hit_details);
          const isHit = hits > 0;
          const isExpanded = expandedRows.has(hunt.id);

          // Condition badges
          const tags: { label: string; className: string; icon?: ReactNode }[] = [];
          if (hunt.target_shiny) tags.push({ label: 'Shiny', className: 'bg-yellow-500/10 text-amber-600', icon: <ShinyIcon size="sm" /> });
          if (hunt.target_perfect) tags.push({ label: 'Perfect', className: 'bg-blue-500/10 text-blue-600' });
          if (hunt.target_gender && hunt.target_gender !== 'any') {
            tags.push({
              label: hunt.target_gender === 'male' ? 'Male' : 'Female',
              className: hunt.target_gender === 'male' ? 'bg-sky-500/10 text-sky-600' : 'bg-pink-500/10 text-pink-600',
              icon: <GenderIcon gender={hunt.target_gender as 'male' | 'female'} size="sm" />,
            });
          }
          const mins = [
            hunt.min_atk > 0 && `A${hunt.min_atk}`,
            hunt.min_def > 0 && `D${hunt.min_def}`,
            hunt.min_spd > 0 && `Sp${hunt.min_spd}`,
            hunt.min_spc > 0 && `Sc${hunt.min_spc}`,
          ].filter(Boolean);
          if (mins.length > 0) tags.push({ label: `Min ${mins.join('/')}`, className: 'bg-purple-500/10 text-purple-600' });

          return (
            <Collapsible
              key={hunt.id}
              open={expandedRows.has(hunt.id)}
              onOpenChange={(open) => handleExpandChange(hunt.id, open)}
            >
              <CollapsibleTrigger
                showChevron={false}
                className={`w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3.5 transition-shadow hover:shadow-md ${
                  isHit ? 'border-l-4 border-yellow-500 shadow-[0_1px_4px_rgba(234,179,8,0.1)]' : 'shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                } ${hunt.is_archived ? 'opacity-50' : ''} ${!isHit ? 'cursor-default' : ''}`}
                onClick={!isHit ? (e: React.MouseEvent) => e.preventDefault() : undefined}
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isHit ? 'bg-yellow-500/10' : 'bg-surface-raised'
                }`}>
                  {isHit ? (
                    <ShinyIcon size="sm" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base font-bold text-foreground">{hunt.target_name}</span>
                    <GamePill game={hunt.game} size="sm" />
                    {tags.map(t => (
                      <span key={t.label} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-2xs font-semibold ${t.className}`}>
                        {t.icon}{t.label}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground/40 mt-0.5">
                    {hunt.total_attempts?.toLocaleString() || 0} encounters
                    {' \u00B7 '}{formatDuration(hunt.elapsed_seconds)}
                    {' \u00B7 '}{hunt.started_at ? hunt.started_at.split('T')[0] : '\u2014'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isHit ? (
                    <span className="text-sm font-semibold text-yellow-500">{isExpanded ? 'Hide' : 'Workflow'}</span>
                  ) : (
                    <>
                      {hunt.status === 'stopped' && !hunt.is_archived && (
                        <button
                          className="bg-surface-raised rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-sunken transition-colors"
                          onClick={(e) => { e.stopPropagation(); onResume(hunt.id); }}
                        >
                          Resume
                        </button>
                      )}
                      {hunt.is_archived ? (
                        <button
                          className="bg-surface-raised rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground/50 hover:bg-surface-sunken transition-colors"
                          onClick={(e) => { e.stopPropagation(); onUnarchive(hunt.id); }}
                        >
                          Unarchive
                        </button>
                      ) : (
                        <button
                          className="bg-surface-raised rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground/30 hover:bg-surface-sunken transition-colors"
                          onClick={(e) => { e.stopPropagation(); onArchive(hunt.id); }}
                        >
                          Archive
                        </button>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleTrigger>

              {/* Expanded workflow */}
              {isHit && (
                <CollapsibleContent className="mt-2 ml-4">
                  <PostShinyWorkflow huntId={hunt.id} />
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-1 pt-2">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors ${
                i === page
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-muted-foreground hover:bg-surface-raised shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
