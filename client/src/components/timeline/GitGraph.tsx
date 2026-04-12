import type { CheckpointNode, CheckpointType } from './types';

// Layout constants
export const COL_WIDTH = 24;
export const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;
const LEFT_PAD = 20;

export interface LayoutNode {
  node: CheckpointNode;
  x: number; // pixel x (column center)
  y: number; // pixel y (row center)
  col: number;
  row: number;
  parentCol: number | null;
  parentRow: number | null;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  totalWidth: number;
  totalHeight: number;
  rowHeight: number;
  activePathIds: Set<number>;
  deadEndIds: Set<number>;
}

const TYPE_COLORS: Record<CheckpointType, string> = {
  root: '#f59e0b',
  progression: '#f59e0b',
  hunt_base: '#3b82f6',
  catch: '#10b981',
  daycare_swap: '#8b5cf6',
  snapshot: '#64748b',
};

export function nodeColor(type: CheckpointType): string {
  return TYPE_COLORS[type];
}

// Branch palette — each column gets a distinct color
const BRANCH_COLORS = [
  '#f59e0b', // amber  (main trunk)
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function branchColor(col: number): string {
  return BRANCH_COLORS[col % BRANCH_COLORS.length];
}

export function computeLayout(roots: CheckpointNode[], rowHeight = ROW_HEIGHT): GraphLayout {
  const layoutNodes: LayoutNode[] = [];
  let nextCol = 0;
  let rowCounter = 0;

  // Build active path: set of node IDs from root → active checkpoint.
  // The child on this path always gets the mainline column (col 0).
  const activePathIds = new Set<number>();
  function findActivePath(node: CheckpointNode): boolean {
    if (node.is_active) { activePathIds.add(node.id); return true; }
    for (const child of node.children) {
      if (findActivePath(child)) { activePathIds.add(node.id); return true; }
    }
    return false;
  }
  for (const root of roots) findActivePath(root);

  // Build set of dead-end leaf IDs (not on active path, no children)
  const deadEndIds = new Set<number>();
  function markDeadEnds(node: CheckpointNode) {
    if (node.children.length === 0 && !activePathIds.has(node.id)) {
      deadEndIds.add(node.id);
    }
    for (const child of node.children) markDeadEnds(child);
  }
  for (const root of roots) markDeadEnds(root);

  function dfs(node: CheckpointNode, col: number, parentLayoutNode: LayoutNode | null) {
    const row = rowCounter++;
    const x = LEFT_PAD + col * COL_WIDTH;
    const y = rowHeight / 2 + row * rowHeight;

    const lNode: LayoutNode = {
      node,
      x,
      y,
      col,
      row,
      parentCol: parentLayoutNode ? parentLayoutNode.col : null,
      parentRow: parentLayoutNode ? parentLayoutNode.row : null,
    };
    layoutNodes.push(lNode);

    if (node.children.length === 0) return;

    // Separate mainline child (active path) from fork children.
    // Render forks FIRST as short stubs next to the parent ("candles"),
    // then the mainline child continues on the same column ("stairs").
    const children = [...node.children];
    const activeIdx = children.findIndex(c => activePathIds.has(c.id));
    const mainlineChild = activeIdx >= 0 ? children.splice(activeIdx, 1)[0] : children.shift()!;
    const forkChildren = children;

    // Fork children render first (short stubs to the right)
    for (const fork of forkChildren) {
      nextCol = Math.max(nextCol, col) + 1;
      dfs(fork, nextCol, lNode);
    }

    // Mainline child continues on same column (stairs keep going down)
    dfs(mainlineChild, col, lNode);
  }

  // Active-path root gets column 0
  const sortedRoots = [...roots];
  const activeRootIdx = sortedRoots.findIndex(r => activePathIds.has(r.id));
  if (activeRootIdx > 0) {
    const [activeRoot] = sortedRoots.splice(activeRootIdx, 1);
    sortedRoots.unshift(activeRoot);
  }

  for (const root of sortedRoots) {
    dfs(root, nextCol, null);
    nextCol++;
  }

  const maxCol = layoutNodes.reduce((m, n) => Math.max(m, n.col), 0);
  const totalWidth = LEFT_PAD + (maxCol + 1) * COL_WIDTH + LEFT_PAD;
  const totalHeight = rowCounter * rowHeight;

  return { nodes: layoutNodes, totalWidth, totalHeight, rowHeight, activePathIds, deadEndIds };
}

// Build a map from node id → LayoutNode for edge drawing
function buildLayoutMap(nodes: LayoutNode[]): Map<number, LayoutNode> {
  const map = new Map<number, LayoutNode>();
  for (const n of nodes) map.set(n.node.id, n);
  return map;
}

interface EdgeProps {
  parent: LayoutNode;
  child: LayoutNode;
  isActivePath: boolean;
  rowHeight: number;
}

function Edge({ parent, child, isActivePath, rowHeight }: EdgeProps) {
  const color = branchColor(child.col);
  const strokeWidth = isActivePath ? 2 : 1.5;
  const strokeOpacity = isActivePath ? 0.85 : 0.35;

  if (parent.col === child.col) {
    // Straight vertical line
    return (
      <line
        x1={parent.x}
        y1={parent.y + NODE_RADIUS}
        x2={child.x}
        y2={child.y - NODE_RADIUS}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
    );
  }

  // Cross-column fork: L-shaped path with rounded 90° corners
  const MAX_R = 6;
  const startY = parent.y + NODE_RADIUS;
  const endY = child.y - NODE_RADIUS;
  const dir = child.x > parent.x ? 1 : -1;

  // Horizontal segment near the parent for early divergence
  const turnY = parent.y + rowHeight / 2;

  // Clamp radius to available space
  const dx = Math.abs(child.x - parent.x);
  const r = Math.min(MAX_R, dx / 2, turnY - startY, endY - turnY);

  const d = [
    `M ${parent.x} ${startY}`,
    `L ${parent.x} ${turnY - r}`,
    `Q ${parent.x} ${turnY} ${parent.x + dir * r} ${turnY}`,
    `L ${child.x - dir * r} ${turnY}`,
    `Q ${child.x} ${turnY} ${child.x} ${turnY + r}`,
    `L ${child.x} ${endY}`,
  ].join(' ');

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
    />
  );
}

interface NodeCircleProps {
  layoutNode: LayoutNode;
  isSelected: boolean;
  isOnActivePath: boolean;
  isDeadEnd: boolean;
  onClick: () => void;
}

function NodeCircle({ layoutNode, isSelected, isOnActivePath, isDeadEnd, onClick }: NodeCircleProps) {
  const { node, x, y, col } = layoutNode;
  const color = branchColor(col);
  const isCatch = node.type === 'catch';

  // Dead-end branches fade out; off-active-path nodes dim slightly
  const nodeOpacity = isDeadEnd ? 0.4 : isOnActivePath ? 1 : 0.6;

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer', opacity: nodeOpacity }}
      role="button"
      aria-label={node.label}
    >
      {/* Active ring */}
      {node.is_active && (
        <circle
          cx={x}
          cy={y}
          r={NODE_RADIUS + 4}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={NODE_RADIUS + 6}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.9}
        />
      )}

      {/* Main circle — all nodes are filled now */}
      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS}
        fill={color}
        stroke="none"
      />

      {/* Star for catches */}
      {isCatch && (
        <text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          ★
        </text>
      )}
    </g>
  );
}

interface GitGraphProps {
  roots: CheckpointNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
  rowHeight?: number;
}

export function GitGraph({ roots, selectedId, onSelect, rowHeight }: GitGraphProps) {
  const layout = computeLayout(roots, rowHeight);
  const layoutMap = buildLayoutMap(layout.nodes);
  const { activePathIds, deadEndIds, rowHeight: effectiveRowHeight } = layout;

  return (
    <svg
      width={layout.totalWidth}
      height={layout.totalHeight}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="Save timeline graph"
    >
      {/* Edges first (drawn under nodes) */}
      {layout.nodes.map((lNode) => {
        if (lNode.node.parent_id === null) return null;
        const parentLayout = layoutMap.get(lNode.node.parent_id);
        if (!parentLayout) return null;
        // Edge is on active path if both parent and child are
        const edgeOnActivePath = activePathIds.has(lNode.node.id) && activePathIds.has(parentLayout.node.id);
        return (
          <Edge
            key={`edge-${lNode.node.id}`}
            parent={parentLayout}
            child={lNode}
            isActivePath={edgeOnActivePath}
            rowHeight={effectiveRowHeight}
          />
        );
      })}

      {/* Nodes */}
      {layout.nodes.map((lNode) => (
        <NodeCircle
          key={`node-${lNode.node.id}`}
          layoutNode={lNode}
          isSelected={selectedId === lNode.node.id}
          isOnActivePath={activePathIds.has(lNode.node.id)}
          isDeadEnd={deadEndIds.has(lNode.node.id)}
          onClick={() => onSelect(lNode.node)}
        />
      ))}
    </svg>
  );
}
