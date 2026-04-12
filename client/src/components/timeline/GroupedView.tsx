import type { CheckpointNode, CheckpointType } from './types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// Category definitions
interface Category {
  key: string;
  label: string;
  color: string;
  types: CheckpointType[];
}

const CATEGORIES: Category[] = [
  { key: 'catches', label: 'Catches', color: '#10b981', types: ['catch'] },
  { key: 'progression', label: 'Progression', color: '#f59e0b', types: ['root', 'progression'] },
  { key: 'snapshots', label: 'Snapshots', color: '#64748b', types: ['snapshot', 'hunt_base', 'daycare_swap'] },
];

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

function parseDate(raw: string): Date {
  // SQLite timestamps lack timezone — treat as UTC
  const d = new Date(raw.includes('T') || raw.includes('Z') ? raw : raw + 'Z');
  return d;
}

function formatDate(raw: string): string {
  return parseDate(raw).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Safe location display */
function safeLocation(location: string | null | undefined): string | null {
  if (!location || location === 'unknown') return null;
  return location;
}

// --- Grouped node with same-type children ---

interface GroupedNode {
  node: CheckpointNode;
  sameTypeChildren: CheckpointNode[];
}

/** Build grouped nodes: nest saves under their nearest ancestor in the same category.
 *  Walks up through cross-type nodes to find the relationship. */
function buildGroupedNodes(nodes: CheckpointNode[], allNodes: CheckpointNode[]): GroupedNode[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build parent map across entire tree
  const parentMap = new Map<number, CheckpointNode>();
  function mapParents(node: CheckpointNode) {
    for (const child of node.children) {
      parentMap.set(child.id, node);
      mapParents(child);
    }
  }
  for (const n of allNodes) mapParents(n);

  // For each node, find its nearest ancestor that's also in this category
  const ancestorInCategory = new Map<number, number | null>();
  for (const n of nodes) {
    let current = parentMap.get(n.id);
    let found: number | null = null;
    while (current) {
      if (nodeIds.has(current.id)) {
        found = current.id;
        break;
      }
      current = parentMap.get(current.id);
    }
    ancestorInCategory.set(n.id, found);
  }

  // Nodes with an ancestor in the category are children; the rest are top-level
  const childrenOf = new Map<number, CheckpointNode[]>();
  const topLevel: CheckpointNode[] = [];

  for (const n of nodes) {
    const ancestorId = ancestorInCategory.get(n.id);
    if (ancestorId != null) {
      if (!childrenOf.has(ancestorId)) childrenOf.set(ancestorId, []);
      childrenOf.get(ancestorId)!.push(n);
    } else {
      topLevel.push(n);
    }
  }

  return topLevel.map(n => ({
    node: n,
    sameTypeChildren: childrenOf.get(n.id) ?? [],
  }));
}

// --- Row component ---

interface SaveRowProps {
  node: CheckpointNode;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  small?: boolean;
}

function SaveRow({ node, color, isSelected, onSelect, small }: SaveRowProps) {
  const snap = node.snapshot;
  const isCatch = node.type === 'catch';
  const location = safeLocation(snap?.location);
  const dotSize = small ? 6 : 8;

  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors rounded-lg
        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
      `}
    >
      <div
        className="rounded-full shrink-0"
        style={{ width: dotSize, height: dotSize, backgroundColor: color, opacity: 0.7 }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold truncate ${isCatch ? 'text-emerald-600' : 'text-foreground'} ${small ? 'opacity-70' : ''}`}>
            {isCatch && '★ '}{node.label}
          </span>
          {node.is_active && (
            <span className="text-2xs px-1 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 leading-none shrink-0 font-semibold">
              active
            </span>
          )}
          {!node.file_exists && (
            <span className="text-2xs px-1 py-0.5 rounded bg-red-50 text-red-600 leading-none shrink-0 font-semibold">
              missing
            </span>
          )}
        </div>
        {location && !small && (
          <span className="text-2xs text-muted-foreground">{location}</span>
        )}
      </div>
      <span className="text-2xs text-muted-foreground shrink-0 tabular-nums">
        {formatDate(node.created_at)}
      </span>
    </div>
  );
}

// --- Category section ---

interface CategorySectionProps {
  category: Category;
  groupedNodes: GroupedNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

function CategorySection({ category, groupedNodes, selectedId, onSelect }: CategorySectionProps) {
  const totalCount = groupedNodes.reduce((sum, g) => sum + 1 + g.sameTypeChildren.length, 0);

  if (groupedNodes.length === 0) return null;

  return (
    <Collapsible defaultOpen={true}>
      {/* Category header */}
      <CollapsibleTrigger className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/30 rounded-lg transition-colors">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-sm font-semibold text-foreground flex-1">{category.label}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums mr-1">
          {totalCount}
        </span>
      </CollapsibleTrigger>

      {/* Rows */}
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {groupedNodes.map(({ node, sameTypeChildren }) => (
          <div key={node.id}>
            <SaveRow
              node={node}
              color={category.color}
              isSelected={selectedId === node.id}
              onSelect={() => onSelect(node)}
            />
            {/* Nested same-type children as a card */}
            {sameTypeChildren.length > 0 && (
              <div className="mx-3 mb-1.5 rounded-lg border border-border/40 bg-muted/15 overflow-hidden">
                <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-border/25">
                  <div className="flex -space-x-1">
                    {sameTypeChildren.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="rounded-full border border-white"
                        style={{ width: 6, height: 6, backgroundColor: category.color, opacity: 0.6 }}
                      />
                    ))}
                  </div>
                  <span className="text-2xs text-muted-foreground font-medium">
                    {sameTypeChildren.length} branch{sameTypeChildren.length !== 1 ? 'es' : ''} from <span className="text-foreground font-semibold">{node.label}</span>
                  </span>
                </div>
                <div className="divide-y divide-border/15">
                  {sameTypeChildren.map((child) => (
                    <SaveRow
                      key={child.id}
                      node={child}
                      color={category.color}
                      isSelected={selectedId === child.id}
                      onSelect={() => onSelect(child)}
                      small
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- Main export ---

interface GroupedViewProps {
  roots: CheckpointNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

export function GroupedView({ roots, selectedId, onSelect }: GroupedViewProps) {
  const allNodes = flattenTree(roots);

  // Group by category, then build nested groups
  const grouped = new Map<string, GroupedNode[]>();
  for (const cat of CATEGORIES) {
    const catNodes = allNodes.filter(n => (cat.types as string[]).includes(n.type));
    grouped.set(cat.key, buildGroupedNodes(catNodes, allNodes));
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.key}
          category={cat}
          groupedNodes={grouped.get(cat.key) ?? []}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}

      {/* Empty state */}
      {allNodes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm font-medium">No saves yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Play with checkpoint tracking to populate this view</p>
        </div>
      )}
    </div>
  );
}
