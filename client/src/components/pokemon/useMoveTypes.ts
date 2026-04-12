// client/src/components/pokemon/useMoveTypes.ts

import { useState, useEffect } from 'react';
import { api } from '@/api/client';

const moveTypeCache = new Map<string, string>();

/** Hook: batch-fetch move types for a list of move names */
export function useMoveTypes(moves: string[]): Map<string, string> {
  const [types, setTypes] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const unknown = moves.filter(m => m && !moveTypeCache.has(m));
    if (unknown.length === 0) {
      setTypes(new Map(moves.filter(Boolean).map(m => [m, moveTypeCache.get(m) ?? ''])));
      return;
    }
    api.moves.lookup(unknown).then((data: any[]) => {
      for (const m of data) {
        if (m.name && m.type) moveTypeCache.set(m.name, m.type);
      }
      setTypes(new Map(moves.filter(Boolean).map(m => [m, moveTypeCache.get(m) ?? ''])));
    }).catch(() => {});
  }, [moves.join(',')]);

  return types;
}
