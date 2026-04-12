import { useState, useMemo, useEffect } from 'react';
import { MovePill, GamePill } from '@/components/icons';
import FilterDropdown from '@/components/FilterDropdown';
import { api } from '../../api/client';
import { VERSION_GROUP_TO_GAMES } from './types';
import type { MoveEntry } from './types';

interface MovesTabProps {
  rawMoves: Record<string, MoveEntry[]>;
}

export function MovesTab({ rawMoves }: MovesTabProps) {
  const [moveFilter, setMoveFilter] = useState('egg');
  const [moveGameFilter, setMoveGameFilter] = useState('all');
  const [moveMetadata, setMoveMetadata] = useState<Record<string, { type: string; category: string }>>({});

  // Move metadata for type coloring
  useEffect(() => {
    const allNames = Object.values(rawMoves).flat().map(m => m.name.replace(/\s+/g, '-'));
    const unique = [...new Set(allNames)];
    if (unique.length === 0) return;
    api.moves.lookup(unique).then((moves: any[]) => {
      const map: Record<string, { type: string; category: string }> = {};
      for (const m of moves) map[m.name] = { type: m.type, category: m.category };
      setMoveMetadata(map);
    });
  }, [rawMoves]);

  const filteredMoves = useMemo(() => {
    const moves = rawMoves[moveFilter] || [];
    if (moveGameFilter === 'all') return moves;
    return moves.filter(m => m.versions.some(v => v.includes(moveGameFilter)));
  }, [rawMoves, moveFilter, moveGameFilter]);

  const availableMoveGames = useMemo(() => {
    const all = new Set<string>();
    for (const method of Object.values(rawMoves)) {
      for (const m of method) {
        for (const v of m.versions) all.add(v);
      }
    }
    return Array.from(all).sort();
  }, [rawMoves]);

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        {['egg', 'tutor', 'machine'].map(m => (
          <button
            key={m}
            onClick={() => setMoveFilter(m)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              moveFilter === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {m === 'egg' ? 'Egg Moves' : m === 'tutor' ? 'Tutor' : 'TM/HM'}
          </button>
        ))}
        <div className="ml-auto">
          <FilterDropdown
            label="All Games"
            options={availableMoveGames.map(g => ({ value: g, label: g.replace(/-/g, ' ') }))}
            selected={moveGameFilter !== 'all' ? [moveGameFilter] : []}
            onChange={(sel) => setMoveGameFilter(sel[0] ?? 'all')}
            multiSelect={false}
          />
        </div>
      </div>

      {filteredMoves.length === 0 && (
        <p className="text-sm text-muted-foreground">None found.</p>
      )}

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filteredMoves.map((m, i) => {
          const slug = m.name.replace(/\s+/g, '-');
          const data = moveMetadata[slug];
          return (
            <div key={i} className="flex justify-between items-center px-2 py-1 text-xs">
              <MovePill name={m.name} type={data?.type} category={data?.category as 'physical' | 'special' | 'status' | undefined} size="sm" />
              <div className="flex gap-0.5 flex-wrap justify-end max-w-[55%]">
                {m.versions.length <= 3
                  ? m.versions.flatMap(v => VERSION_GROUP_TO_GAMES[v] || [v.replace(/-/g, ' ')]).map((g, j) => (
                      <GamePill key={j} game={g} size="sm" />
                    ))
                  : <span className="text-muted-foreground text-xs">{m.versions.length} games</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
