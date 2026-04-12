import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitGraph, ROW_HEIGHT, computeLayout, nodeColor, branchColor } from './GitGraph';
import type { CheckpointNode, Playthrough } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SavePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (node: CheckpointNode) => void;
  title?: string;
  description?: string;
  filterGame?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function gameDisplayName(game: string): string {
  return game
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safely get a display name for a species, handling nulls and garbage data */
function safeSpeciesName(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  if (/^\?+$/.test(name)) return 'Unknown';
  return name;
}

// Collect all nodes (root + descendants) from tree roots into a flat list
// in DFS pre-order, matching computeLayout order.
function flattenNodes(roots: CheckpointNode[]): CheckpointNode[] {
  const result: CheckpointNode[] = [];
  function dfs(node: CheckpointNode) {
    result.push(node);
    for (const child of node.children) dfs(child);
  }
  for (const root of roots) dfs(root);
  return result;
}

// ---------------------------------------------------------------------------
// Compact row (32px)
// ---------------------------------------------------------------------------

const COMPACT_ROW_HEIGHT = 32;

interface CompactRowProps {
  node: CheckpointNode;
  isSelected: boolean;
  onClick: () => void;
  /** pixel offset from the top of the scrollable area */
  top: number;
  /** left offset reserved for the SVG rail */
  railWidth: number;
}

function CompactRow({ node, isSelected, onClick, top, railWidth }: CompactRowProps) {
  const disabled = !node.file_exists;
  const isCatch = node.type === 'catch';
  const color = nodeColor(node.type);
  const snap = node.snapshot;

  const labelText = isCatch ? `★ ${node.label}` : node.label;

  // Safely display location
  const locationText = snap?.location
    ? (/^\?+$/.test(snap.location) ? 'Unknown location' : snap.location)
    : null;

  const locationBadges: string[] = [];
  if (locationText) locationBadges.push(locationText);
  if (snap?.badge_count && snap.badge_count > 0) locationBadges.push(`${snap.badge_count}✦`);
  if (!node.file_exists) locationBadges.push('file missing');

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: COMPACT_ROW_HEIGHT,
        paddingLeft: railWidth,
      }}
      className={[
        'flex items-center gap-2 pr-4 rounded-xl transition-colors select-none',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer',
        isSelected
          ? 'bg-surface-raised ring-1 ring-inset ring-primary/30'
          : disabled
          ? ''
          : 'hover:bg-surface',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        {/* Label row */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: isCatch ? '#10b981' : color }}
          >
            {labelText}
          </span>
          {node.is_active && (
            <span className="text-2xs px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 font-medium leading-none whitespace-nowrap">
              active
            </span>
          )}
        </div>

        {/* Location + date row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {locationBadges.length > 0 && (
            <span className="text-xs text-muted-foreground truncate">
              {locationBadges.join(' · ')}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {formatDate(node.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact tree: SVG rail + rows overlaid
// ---------------------------------------------------------------------------

interface CompactTreeProps {
  roots: CheckpointNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

function CompactTree({ roots, selectedId, onSelect }: CompactTreeProps) {
  // We reuse computeLayout from GitGraph, but scale the y positions to COMPACT_ROW_HEIGHT.
  // computeLayout uses ROW_HEIGHT internally, so we rescale.
  const layout = computeLayout(roots);
  const scale = COMPACT_ROW_HEIGHT / ROW_HEIGHT;

  const { activePathIds, deadEndIds } = layout;

  const scaledNodes = layout.nodes.map((ln) => ({
    ...ln,
    y: ln.y * scale,
  }));

  const totalHeight = layout.totalHeight * scale;
  const svgWidth = layout.totalWidth;

  // Flat list of nodes in DFS order for row rendering
  const flat = flattenNodes(roots);

  return (
    <div style={{ position: 'relative', minHeight: totalHeight }}>
      {/* SVG rail */}
      <svg
        width={svgWidth}
        height={totalHeight}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {/* Edges */}
        {scaledNodes.map((ln) => {
          if (ln.node.parent_id === null) return null;
          const parentLn = scaledNodes.find((p) => p.node.id === ln.node.parent_id);
          if (!parentLn) return null;

          const NODE_RADIUS = 5;
          const color = branchColor(ln.col);
          const edgeOnActivePath = activePathIds.has(ln.node.id) && activePathIds.has(parentLn.node.id);
          const strokeWidth = edgeOnActivePath ? 2 : 1.5;
          const strokeOpacity = edgeOnActivePath ? 0.85 : 0.35;

          if (parentLn.col === ln.col) {
            return (
              <line
                key={`edge-${ln.node.id}`}
                x1={parentLn.x}
                y1={parentLn.y + NODE_RADIUS}
                x2={ln.x}
                y2={ln.y - NODE_RADIUS}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
              />
            );
          }

          // L-shaped path with rounded 90° corners (matching desktop)
          const MAX_R = 6;
          const startY = parentLn.y + NODE_RADIUS;
          const endY = ln.y - NODE_RADIUS;
          const dir = ln.x > parentLn.x ? 1 : -1;
          const turnY = parentLn.y + COMPACT_ROW_HEIGHT / 2;
          const dx = Math.abs(ln.x - parentLn.x);
          const r = Math.min(MAX_R, dx / 2, turnY - startY, endY - turnY);

          const d = [
            `M ${parentLn.x} ${startY}`,
            `L ${parentLn.x} ${turnY - r}`,
            `Q ${parentLn.x} ${turnY} ${parentLn.x + dir * r} ${turnY}`,
            `L ${ln.x - dir * r} ${turnY}`,
            `Q ${ln.x} ${turnY} ${ln.x} ${turnY + r}`,
            `L ${ln.x} ${endY}`,
          ].join(' ');

          return (
            <path
              key={`edge-${ln.node.id}`}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
            />
          );
        })}

        {/* Node circles */}
        {scaledNodes.map((ln) => {
          const color = branchColor(ln.col);
          const NODE_RADIUS = 5;
          const isSelected = selectedId === ln.node.id;
          const disabled = !ln.node.file_exists;
          const isOnActive = activePathIds.has(ln.node.id);
          const isDeadEnd = deadEndIds.has(ln.node.id);
          const nodeOpacity = disabled ? 0.4 : isDeadEnd ? 0.4 : isOnActive ? 1 : 0.6;

          return (
            <g key={`node-${ln.node.id}`} style={{ opacity: nodeOpacity }}>
              {isSelected && (
                <circle
                  cx={ln.x}
                  cy={ln.y}
                  r={NODE_RADIUS + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                />
              )}
              <circle
                cx={ln.x}
                cy={ln.y}
                r={NODE_RADIUS}
                fill={color}
                stroke="none"
              />
            </g>
          );
        })}
      </svg>

      {/* Overlay rows */}
      {flat.map((node, i) => (
        <CompactRow
          key={node.id}
          node={node}
          isSelected={selectedId === node.id}
          onClick={() => onSelect(node)}
          top={i * COMPACT_ROW_HEIGHT}
          railWidth={svgWidth}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SavePicker
// ---------------------------------------------------------------------------

export function SavePicker({
  open,
  onClose,
  onSelect,
  title = 'Choose a Save',
  description,
  filterGame,
}: SavePickerProps) {
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([]);
  const [selectedPlaythrough, setSelectedPlaythrough] = useState<Playthrough | null>(null);
  const [treeRoots, setTreeRoots] = useState<CheckpointNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [loadingPlaythroughs, setLoadingPlaythroughs] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);

  // Fetch playthroughs when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelectedNodeId(null);
    setTreeRoots([]);
    setSelectedPlaythrough(null);

    setLoadingPlaythroughs(true);
    api.timeline
      .playthroughs()
      .then((all: any[]) => {
        const filtered: Playthrough[] = filterGame
          ? all.filter((p: any) =>
              p.game?.toLowerCase() === filterGame.toLowerCase()
            )
          : all;
        setPlaythroughs(filtered);
        if (filtered.length > 0) setSelectedPlaythrough(filtered[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingPlaythroughs(false));
  }, [open, filterGame]);

  // Fetch tree when selected playthrough changes
  useEffect(() => {
    if (!selectedPlaythrough) {
      setTreeRoots([]);
      return;
    }
    setLoadingTree(true);
    setSelectedNodeId(null);
    api.timeline
      .tree(selectedPlaythrough.id)
      .then((data: any) => {
        setTreeRoots(Array.isArray(data) ? data : data.roots ?? []);
      })
      .catch(console.error)
      .finally(() => setLoadingTree(false));
  }, [selectedPlaythrough]);

  // Find the currently selected CheckpointNode by id
  function findNode(roots: CheckpointNode[], id: number): CheckpointNode | null {
    for (const root of roots) {
      if (root.id === id) return root;
      const found = findNode(root.children, id);
      if (found) return found;
    }
    return null;
  }

  const selectedNode = selectedNodeId != null ? findNode(treeRoots, selectedNodeId) : null;

  function handleNodeClick(node: CheckpointNode) {
    if (!node.file_exists) return;
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
  }

  function handleUse() {
    if (!selectedNode) return;
    onSelect(selectedNode);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton
        className="sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden max-h-[85vh] rounded-lg"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-surface-raised">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Playthrough tabs */}
        {playthroughs.length > 0 && (
          <div className="flex gap-1.5 px-5 py-3 border-b border-surface-raised flex-wrap">
            {playthroughs.map((pt) => {
              const isActive = selectedPlaythrough?.id === pt.id;
              return (
                <button
                  key={pt.id}
                  onClick={() => setSelectedPlaythrough(pt)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-surface-raised text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 leading-none">
                    {gameDisplayName(pt.game)}
                  </span>
                  {pt.label ?? pt.ot_name}
                </button>
              );
            })}
          </div>
        )}

        {/* Tree body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
          {loadingPlaythroughs || loadingTree ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : playthroughs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No playthroughs found{filterGame ? ` for ${gameDisplayName(filterGame)}` : ''}.
            </div>
          ) : treeRoots.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No checkpoints yet.
            </div>
          ) : (
            <CompactTree
              roots={treeRoots}
              selectedId={selectedNodeId}
              onSelect={handleNodeClick}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-surface-raised gap-2 sm:gap-2">
          <span className="text-sm text-muted-foreground mr-auto self-center truncate">
            {selectedNode ? `Selected: ${selectedNode.label}` : 'Nothing selected'}
          </span>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-lg"
            disabled={!selectedNode}
            onClick={handleUse}
          >
            Use This Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
