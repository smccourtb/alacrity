import { useState } from 'react';
import { computeLayout, branchColor, type LayoutNode } from '@/components/timeline/GitGraph';
import { TimelineNode } from '@/components/timeline/TimelineNode';
import type { CheckpointNode, CheckpointType } from '@/components/timeline/types';

// --- Shared helpers ----------------------------------------------------------

function buildParentMap(nodes: LayoutNode[]): Map<number, LayoutNode> {
  const m = new Map<number, LayoutNode>();
  for (const ln of nodes) {
    for (const child of ln.node.children) m.set(child.id, ln);
  }
  return m;
}

function buildRemappedCols(nodes: LayoutNode[], parentMap: Map<number, LayoutNode>) {
  const colMap = new Map<number, number>();
  const forkGroups = new Map<number, LayoutNode[]>();
  for (const ln of nodes) {
    const parent = parentMap.get(ln.node.id);
    if (!parent || parent.col === ln.col) {
      colMap.set(ln.node.id, parent ? (colMap.get(parent.node.id) ?? 0) : 0);
    } else {
      const pid = parent.node.id;
      if (!forkGroups.has(pid)) forkGroups.set(pid, []);
      forkGroups.get(pid)!.push(ln);
    }
  }
  for (const [pid, children] of forkGroups) {
    const parentCol = colMap.get(pid) ?? 0;
    children.forEach((ln, i) => colMap.set(ln.node.id, parentCol + 1 + i));
  }
  return (ln: LayoutNode) => colMap.get(ln.node.id) ?? ln.col;
}

// Group nodes into mainline + branch clusters for non-graph layouts
interface NodeGroup {
  mainline: LayoutNode;
  branches: LayoutNode[];
}

function buildNodeGroups(nodes: LayoutNode[], parentMap: Map<number, LayoutNode>, remappedCol: (ln: LayoutNode) => number): NodeGroup[] {
  const groups: NodeGroup[] = [];
  const branchChildIds = new Set<number>();

  // Find all branch children
  for (const ln of nodes) {
    const parent = parentMap.get(ln.node.id);
    if (parent && remappedCol(parent) !== remappedCol(ln)) {
      branchChildIds.add(ln.node.id);
    }
  }

  // Build groups: mainline nodes with their branch children attached
  for (const ln of nodes) {
    if (branchChildIds.has(ln.node.id)) continue;
    const branches = ln.node.children
      .filter(c => branchChildIds.has(c.id))
      .map(c => nodes.find(n => n.node.id === c.id)!)
      .filter(Boolean);
    groups.push({ mainline: ln, branches });
  }
  return groups;
}

// --- Tree View ---------------------------------------------------------------

export interface TreeViewProps {
  roots: CheckpointNode[];
  layout: ReturnType<typeof computeLayout>;
  filteredNodes: CheckpointNode[];
  searchQuery: string;
  activeFilters: Set<CheckpointType>;
  selectedNodeId: number | null;
  isMobile: boolean;
  desktopLayout: 'A' | 'B' | 'C' | 'D';
  isLocal?: boolean;
  onSelect: (node: CheckpointNode) => void;
  onSetActive: (node: CheckpointNode) => void;
  onPlay?: (node: CheckpointNode) => void;
  onStreamPlay?: (node: CheckpointNode) => void;
  onWebPlay?: (node: CheckpointNode) => void;
  onTrade?: (node: CheckpointNode) => void;
}

export function TreeView({
  layout,
  filteredNodes,
  searchQuery,
  activeFilters,
  selectedNodeId,
  isMobile,
  desktopLayout,
  isLocal,
  onSelect,
  onSetActive,
  onPlay,
  onStreamPlay,
  onWebPlay,
  onTrade,
}: TreeViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const hasFilter = searchQuery.trim() || activeFilters.size > 0;
  const filteredIds = new Set(filteredNodes.map((n) => n.id));
  const { nodes, activePathIds, deadEndIds, rowHeight } = layout;

  const parentMap = buildParentMap(nodes);
  const remappedCol = buildRemappedCols(nodes, parentMap);

  if (isMobile) {
    return (
      <MobileTreeView
        layout={layout}
        hasFilter={hasFilter}
        filteredIds={filteredIds}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        parentMap={parentMap}
        remappedCol={remappedCol}
      />
    );
  }

  const groups = buildNodeGroups(nodes, parentMap, remappedCol);

  // Helper to render a node row with popover
  function renderRow(node: CheckpointNode, opts: { small?: boolean; className?: string; style?: React.CSSProperties } = {}) {
    const isFiltered = hasFilter && !filteredIds.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const onActive = activePathIds.has(node.id);
    const isDead = deadEndIds.has(node.id);
    const opacity = isFiltered ? 0.25 : isDead ? 0.4 : onActive ? 1 : 0.6;
    const activeClass = '';

    return (
      <div
        key={node.id}
        className={[activeClass, opts.className].filter(Boolean).join(' ')}
        style={{ opacity, transition: 'opacity 150ms', ...opts.style }}
      >
        <TimelineNode
          node={node}
          isSelected={isSelected}
          onSelect={() => !isFiltered && onSelect(node)}
        />
      </div>
    );
  }

  // ========== LAYOUT A -- Left Border Groups ==========
  if (desktopLayout === 'A') {
    return (
      <div className="py-2">
        {groups.map(({ mainline, branches }) => {
          const node = mainline.node;
          const color = branchColor(remappedCol(mainline));
          return (
            <div key={node.id}>
              {/* Mainline row */}
              <div className="flex items-center" style={{ height: rowHeight }}>
                <div
                  className="flex-shrink-0 rounded-full ml-3 mr-2.5"
                  style={{
                    width: 10, height: 10, backgroundColor: color,
                    opacity: activePathIds.has(node.id) ? 1 : 0.6,
                    boxShadow: node.is_active ? `0 0 0 3px ${color}33` : undefined,
                  }}
                />
                <div className="flex-1 min-w-0">{renderRow(node)}</div>
              </div>
              {/* Branch children */}
              {branches.length > 0 && (
                <div className="ml-[18px] pl-5 border-l-2" style={{ borderColor: branchColor(remappedCol(branches[0])) + '44' }}>
                  {branches.map((ln) => {
                    const bColor = branchColor(remappedCol(ln));
                    return (
                      <div key={ln.node.id} className="flex items-center" style={{ height: rowHeight - 4 }}>
                        <div
                          className="flex-shrink-0 rounded-full mr-2.5"
                          style={{ width: 7, height: 7, backgroundColor: bColor, opacity: 0.6 }}
                        />
                        <div className="flex-1 min-w-0">{renderRow(ln.node, { small: true })}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ========== LAYOUT B -- Collapsible Clusters ==========
  if (desktopLayout === 'B') {
    function toggleGroup(id: number) {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }

    return (
      <div className="py-2">
        {groups.map(({ mainline, branches }) => {
          const node = mainline.node;
          const color = branchColor(remappedCol(mainline));
          const expanded = expandedGroups.has(node.id);
          const hasBranches = branches.length > 0;

          return (
            <div key={node.id}>
              <div className="flex items-center" style={{ height: rowHeight }}>
                <div
                  className="flex-shrink-0 rounded-full ml-3 mr-2.5"
                  style={{
                    width: 10, height: 10, backgroundColor: color,
                    opacity: activePathIds.has(node.id) ? 1 : 0.6,
                    boxShadow: node.is_active ? `0 0 0 3px ${color}33` : undefined,
                  }}
                />
                <div className="flex-1 min-w-0">{renderRow(node)}</div>
                {hasBranches && (
                  <button
                    onClick={() => toggleGroup(node.id)}
                    className="flex items-center gap-1 mr-3 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <span>{branches.length}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
                      <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                )}
              </div>
              {hasBranches && expanded && (
                <div className="mx-3 mb-2 rounded-lg overflow-hidden" style={{ backgroundColor: branchColor(remappedCol(branches[0])) + '08', border: `1px solid ${branchColor(remappedCol(branches[0]))}15` }}>
                  {branches.map((ln) => {
                    const bColor = branchColor(remappedCol(ln));
                    return (
                      <div key={ln.node.id} className="flex items-center px-3" style={{ height: rowHeight - 6 }}>
                        <div
                          className="flex-shrink-0 rounded-full mr-2"
                          style={{ width: 6, height: 6, backgroundColor: bColor, opacity: 0.7 }}
                        />
                        <div className="flex-1 min-w-0">{renderRow(ln.node, { small: true })}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ========== LAYOUT C -- Inline Chips ==========
  if (desktopLayout === 'C') {
    return (
      <div className="py-2">
        {groups.map(({ mainline, branches }) => {
          const node = mainline.node;
          const color = branchColor(remappedCol(mainline));

          return (
            <div key={node.id}>
              <div className="flex items-center" style={{ height: rowHeight }}>
                <div
                  className="flex-shrink-0 rounded-full ml-3 mr-2.5"
                  style={{
                    width: 10, height: 10, backgroundColor: color,
                    opacity: activePathIds.has(node.id) ? 1 : 0.6,
                    boxShadow: node.is_active ? `0 0 0 3px ${color}33` : undefined,
                  }}
                />
                <div className="flex-1 min-w-0">{renderRow(node)}</div>
              </div>
              {branches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-[34px] mr-3 pb-2">
                  {branches.map((ln) => {
                    const bColor = branchColor(remappedCol(ln));
                    const isSelected = selectedNodeId === ln.node.id;
                    return (
                      <button
                        key={ln.node.id}
                        onClick={() => onSelect(ln.node)}
                        className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                          transition-all cursor-pointer border
                          ${isSelected
                            ? 'bg-foreground/5 border-foreground/20 text-foreground'
                            : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'}
                        `}
                        style={{ opacity: deadEndIds.has(ln.node.id) ? 0.4 : activePathIds.has(ln.node.id) ? 1 : 0.7 }}
                      >
                        <span className="rounded-full" style={{ width: 5, height: 5, backgroundColor: bColor }} />
                        <span className="truncate max-w-[140px]">{ln.node.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ========== LAYOUT D -- Nested Cards with Trunk Line ==========
  const TRUNK_X = 18; // center of trunk line / dots
  return (
    <div className="relative py-2">
      {/* Trunk line -- continuous vertical behind everything */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: TRUNK_X - 1, width: 2, backgroundColor: branchColor(0), opacity: 0.15 }}
      />

      {groups.map(({ mainline, branches }) => {
        const node = mainline.node;
        const color = branchColor(remappedCol(mainline));

        return (
          <div key={node.id} className="relative">
            {/* Mainline row with dot on trunk */}
            <div className="flex items-center relative" style={{ height: rowHeight }}>
              {/* Dot on trunk */}
              <div
                className="absolute flex-shrink-0 rounded-full z-10"
                style={{
                  left: TRUNK_X - 5,
                  width: 10, height: 10, backgroundColor: color,
                  opacity: activePathIds.has(node.id) ? 1 : 0.6,
                  boxShadow: node.is_active
                    ? `0 0 0 3px ${color}33, 0 0 0 1px white`
                    : `0 0 0 1px white`,
                }}
              />
              {/* Label -- offset past the trunk */}
              <div className="flex-1 min-w-0" style={{ paddingLeft: TRUNK_X + 14 }}>
                {renderRow(node)}
              </div>
            </div>

            {/* Branch card -- indented to the right of trunk */}
            {branches.length > 0 && (
              <div className="relative" style={{ marginLeft: TRUNK_X + 14, marginRight: 12, marginBottom: 8 }}>
                <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30">
                    <div className="flex -space-x-1">
                      {branches.slice(0, 4).map((ln) => (
                        <div
                          key={ln.node.id}
                          className="rounded-full border-2 border-white"
                          style={{ width: 8, height: 8, backgroundColor: branchColor(remappedCol(ln)) }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {branches.length} branch{branches.length !== 1 ? 'es' : ''} from <span className="text-foreground">{node.label}</span>
                    </span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {branches.map((ln) => {
                      const bColor = branchColor(remappedCol(ln));
                      return (
                        <div key={ln.node.id} className="flex items-center px-3 hover:bg-muted/30 transition-colors" style={{ height: rowHeight - 6 }}>
                          <div
                            className="flex-shrink-0 rounded-full mr-2"
                            style={{ width: 6, height: 6, backgroundColor: bColor, opacity: 0.7 }}
                          />
                          <div className="flex-1 min-w-0">{renderRow(ln.node, { small: true })}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Mobile Tree View --------------------------------------------------------
// Trunk line + nested cards (same as desktop Layout D, tighter spacing).

const M_TRUNK_X = 14;
const M_ROW_H = 34;

interface MobileTreeViewProps {
  layout: ReturnType<typeof computeLayout>;
  hasFilter: boolean;
  filteredIds: Set<number>;
  selectedNodeId: number | null;
  onSelect: (node: CheckpointNode) => void;
  parentMap: Map<number, LayoutNode>;
  remappedCol: (ln: LayoutNode) => number;
}

function MobileTreeView({ layout, hasFilter, filteredIds, selectedNodeId, onSelect, parentMap, remappedCol }: MobileTreeViewProps) {
  const { nodes, activePathIds, deadEndIds } = layout;
  const groups = buildNodeGroups(nodes, parentMap, remappedCol);

  return (
    <div className="relative py-1">
      {/* Trunk line */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: M_TRUNK_X - 1, width: 2, backgroundColor: branchColor(0), opacity: 0.12 }}
      />

      {groups.map(({ mainline, branches }) => {
        const node = mainline.node;
        const color = branchColor(remappedCol(mainline));
        const isFiltered = hasFilter && !filteredIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const onActive = activePathIds.has(node.id);
        const isDead = deadEndIds.has(node.id);
        const nodeOpacity = isFiltered ? 0.25 : isDead ? 0.4 : onActive ? 1 : 0.6;

        return (
          <div key={node.id} className="relative">
            {/* Mainline row */}
            <div className="flex items-center relative" style={{ height: M_ROW_H, opacity: nodeOpacity, transition: 'opacity 150ms' }}>
              <div
                className="absolute flex-shrink-0 rounded-full z-10"
                style={{
                  left: M_TRUNK_X - 4,
                  width: 8, height: 8, backgroundColor: color,
                  opacity: onActive ? 1 : 0.6,
                  boxShadow: node.is_active ? `0 0 0 3px ${color}33, 0 0 0 1px white` : '0 0 0 1px white',
                }}
              />
              <div className="flex-1 min-w-0" style={{ paddingLeft: M_TRUNK_X + 10 }}>
                <TimelineNode node={node} isSelected={isSelected} onSelect={() => !isFiltered && onSelect(node)} />
              </div>
            </div>

            {/* Branch card */}
            {branches.length > 0 && (
              <div className="relative" style={{ marginLeft: M_TRUNK_X + 10, marginRight: 8, marginBottom: 6 }}>
                <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-border/30">
                    <div className="flex -space-x-1">
                      {branches.slice(0, 3).map((ln) => (
                        <div
                          key={ln.node.id}
                          className="rounded-full border border-white"
                          style={{ width: 6, height: 6, backgroundColor: branchColor(remappedCol(ln)) }}
                        />
                      ))}
                    </div>
                    <span className="text-2xs text-muted-foreground font-medium">
                      {branches.length} branch{branches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {branches.map((ln) => {
                      const bColor = branchColor(remappedCol(ln));
                      const bFiltered = hasFilter && !filteredIds.has(ln.node.id);
                      const bSelected = selectedNodeId === ln.node.id;
                      const bActive = activePathIds.has(ln.node.id);
                      const bDead = deadEndIds.has(ln.node.id);
                      const bOpacity = bFiltered ? 0.25 : bDead ? 0.4 : bActive ? 1 : 0.6;

                      return (
                        <div
                          key={ln.node.id}
                          className="flex items-center px-2.5"
                          style={{ height: M_ROW_H - 6, opacity: bOpacity, transition: 'opacity 150ms' }}
                        >
                          <div className="flex-shrink-0 rounded-full mr-2" style={{ width: 5, height: 5, backgroundColor: bColor, opacity: 0.7 }} />
                          <div className="flex-1 min-w-0">
                            <TimelineNode node={ln.node} isSelected={bSelected} onSelect={() => !bFiltered && onSelect(ln.node)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
