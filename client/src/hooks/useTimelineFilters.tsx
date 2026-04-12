import { useState, useMemo } from 'react';
import type { CheckpointNode, CheckpointType } from '@/components/timeline/types';

function flattenTree(roots: CheckpointNode[]): CheckpointNode[] {
  const result: CheckpointNode[] = [];
  function walk(node: CheckpointNode) {
    result.push(node);
    for (const child of node.children) walk(child);
  }
  for (const root of roots) walk(root);
  return result;
}

function matchesSearch(node: CheckpointNode, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (node.label.toLowerCase().includes(q)) return true;
  if (node.file_path?.toLowerCase().includes(q)) return true;
  const snap = node.snapshot;
  if (!snap) return false;
  if (snap.location?.toLowerCase().includes(q)) return true;
  for (const p of snap.party) {
    if (p.species_name?.toLowerCase().includes(q)) return true;
  }
  if (snap.daycare) {
    const { parent1, parent2, offspring } = snap.daycare;
    if (
      parent1?.species_name?.toLowerCase().includes(q) ||
      parent2?.species_name?.toLowerCase().includes(q) ||
      offspring?.species_name?.toLowerCase().includes(q)
    ) return true;
  }
  return false;
}

export const FILTER_TYPES: CheckpointType[] = ['progression', 'catch', 'snapshot'];

export const FILTER_LABELS: Record<CheckpointType, string> = {
  root: 'Root',
  progression: 'Progression',
  hunt_base: 'Hunt Base',
  catch: 'Catch',
  daycare_swap: 'Daycare',
  snapshot: 'Snapshot',
};

export const FILTER_ICONS: Record<CheckpointType, React.ReactNode> = {
  root: null,
  progression: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10 L6 3 L10 10" /><line x1="3.5" y1="7" x2="8.5" y2="7" />
    </svg>
  ),
  hunt_base: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4" /><line x1="6" y1="2" x2="6" y2="6" /><line x1="6" y1="6" x2="8.5" y2="7.5" />
    </svg>
  ),
  catch: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M3 6.5 L5 8.5 L9.5 3.5" />
    </svg>
  ),
  daycare_swap: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 L10 4 L8 6" /><path d="M4 6 L2 8 L4 10" /><path d="M10 4 H3" /><path d="M2 8 H9" />
    </svg>
  ),
  snapshot: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="8" height="6" rx="1" /><circle cx="6" cy="6" r="1.5" /><path d="M4 3 L5 1.5 H7 L8 3" />
    </svg>
  ),
};

export const FILTER_COLORS: Record<CheckpointType, string> = {
  root: '#f59e0b',
  progression: '#f59e0b',
  hunt_base: '#3b82f6',
  catch: '#10b981',
  daycare_swap: '#8b5cf6',
  snapshot: '#64748b',
};

export function useTimelineFilters(treeRoots: CheckpointNode[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<CheckpointType>>(new Set());

  const allNodes = useMemo(() => flattenTree(treeRoots), [treeRoots]);

  const filteredNodes = useMemo(
    () =>
      allNodes.filter((node) => {
        if (!matchesSearch(node, searchQuery)) return false;
        if (activeFilters.size > 0 && !activeFilters.has(node.type)) return false;
        return true;
      }),
    [allNodes, searchQuery, activeFilters],
  );

  function toggleFilter(type: CheckpointType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    allNodes,
    filteredNodes,
  };
}
