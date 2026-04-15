import type { CheckpointNode } from './types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// ── Source detection ────────────────────────────────────────────────────────
//
// Categorize a checkpoint by its file path rather than the derived
// CheckpointType. This matches how the saves actually live on disk and
// produces groupings the user can reason about.

type SaveSource = 'library' | 'hunt-catch' | 'hunt-base' | 'hunt-instance' | 'other';

interface SaveSourceInfo {
  source: SaveSource;
  huntFolder: string | null;  // the folder under catches/<game>/ — used to group hunts
  role: 'setup' | 'catch' | 'library' | 'other';
}

function detectSource(filePath: string): SaveSourceInfo {
  // Normalize so we match on path segments regardless of OS separator.
  const p = filePath.replace(/\\/g, '/');

  // hunts/<hunt_dir>/... — internally spawned hunt instances. Hidden per
  // user request.
  if (p.includes('/hunts/')) {
    return { source: 'hunt-instance', huntFolder: null, role: 'other' };
  }

  // saves/catches/<game>/<hunt_folder>/(catch|base).sav
  const catchMatch = p.match(/\/saves\/catches\/[^/]+\/([^/]+)\/(base|catch)\.sav$/);
  if (catchMatch) {
    const huntFolder = catchMatch[1];
    const filename = catchMatch[2];
    return {
      source: filename === 'base' ? 'hunt-base' : 'hunt-catch',
      huntFolder,
      role: filename === 'base' ? 'setup' : 'catch',
    };
  }

  // saves/library/... — manual progression saves
  if (p.includes('/saves/library/')) {
    return { source: 'library', huntFolder: null, role: 'library' };
  }

  return { source: 'other', huntFolder: null, role: 'other' };
}

// ── Sorting helpers ─────────────────────────────────────────────────────────

function mtimeMs(node: CheckpointNode): number {
  const raw = node.file_mtime ?? node.created_at;
  if (!raw) return 0;
  // SQLite timestamps may lack timezone — treat as UTC.
  const d = new Date(raw.includes('T') || raw.includes('Z') ? raw : raw + 'Z');
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function byMtimeDesc(a: CheckpointNode, b: CheckpointNode): number {
  return mtimeMs(b) - mtimeMs(a);
}

// ── Time formatting ─────────────────────────────────────────────────────────

function formatRelativeMtime(node: CheckpointNode): string {
  const ms = mtimeMs(node);
  if (ms === 0) return '';
  const diffMs = Date.now() - ms;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Older than a week — fall back to absolute date.
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Tree flattening ─────────────────────────────────────────────────────────

function flattenTree(roots: CheckpointNode[]): CheckpointNode[] {
  const out: CheckpointNode[] = [];
  function walk(node: CheckpointNode) {
    out.push(node);
    for (const child of node.children) walk(child);
  }
  for (const root of roots) walk(root);
  return out;
}

// ── Row component ───────────────────────────────────────────────────────────

interface SaveRowProps {
  node: CheckpointNode;
  roleChip?: string | null;  // e.g. 'catch', 'setup', 'library'
  roleColor?: string;
  isSelected: boolean;
  onSelect: () => void;
  small?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  catch: '#10b981',    // emerald
  setup: '#0ea5e9',    // sky
  library: '#f59e0b',  // amber
  other: '#94a3b8',    // slate
};

function SaveRow({ node, roleChip, roleColor, isSelected, onSelect, small }: SaveRowProps) {
  const isCatch = node.type === 'catch';
  const dotColor = roleColor ?? ROLE_COLORS.other;
  const dotSize = small ? 6 : 8;
  const relTime = formatRelativeMtime(node);

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
        style={{ width: dotSize, height: dotSize, backgroundColor: dotColor, opacity: 0.8 }}
      />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-sm font-semibold truncate ${isCatch ? 'text-emerald-600' : 'text-foreground'} ${small ? 'opacity-80' : ''}`}>
          {isCatch && '★ '}{node.label}
        </span>
        {roleChip && (
          <span
            className="text-2xs font-medium px-1.5 py-0.5 rounded shrink-0 leading-none"
            style={{ color: dotColor, backgroundColor: `${dotColor}14`, border: `1px solid ${dotColor}33` }}
          >
            {roleChip}
          </span>
        )}
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
      <span className="text-2xs text-muted-foreground shrink-0 tabular-nums">
        {relTime}
      </span>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count: number;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, count, color, defaultOpen = true, children }: SectionProps) {
  if (count === 0) return null;
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/30 rounded-lg transition-colors">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums mr-1">
          {count}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Hunt group card ─────────────────────────────────────────────────────────

interface HuntGroup {
  folder: string;
  members: { node: CheckpointNode; info: SaveSourceInfo }[];
}

interface HuntGroupCardProps {
  group: HuntGroup;
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

function HuntGroupCard({ group, selectedId, onSelect }: HuntGroupCardProps) {
  // Sort members: setup → catch (base comes before catch inside a hunt folder)
  const ordered = [...group.members].sort((a, b) => {
    const order: Record<string, number> = { setup: 0, catch: 1, other: 2, library: 3 };
    return (order[a.info.role] ?? 99) - (order[b.info.role] ?? 99);
  });
  const latestMtime = Math.max(...group.members.map(m => mtimeMs(m.node)));

  return (
    <div className="mx-3 mb-1.5 rounded-lg border border-border/40 bg-muted/15 overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{group.folder}</span>
        <span className="text-2xs text-muted-foreground tabular-nums shrink-0">
          {latestMtime > 0 ? formatRelativeMtime({ ...group.members[0].node, file_mtime: new Date(latestMtime).toISOString() } as CheckpointNode) : ''}
        </span>
      </div>
      <div className="divide-y divide-border/15">
        {ordered.map(({ node, info }) => (
          <SaveRow
            key={node.id}
            node={node}
            roleChip={info.role === 'setup' ? 'setup' : info.role === 'catch' ? 'catch' : null}
            roleColor={ROLE_COLORS[info.role] ?? ROLE_COLORS.other}
            isSelected={selectedId === node.id}
            onSelect={() => onSelect(node)}
            small
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

interface GroupedViewProps {
  roots: CheckpointNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

export function GroupedView({ roots, selectedId, onSelect }: GroupedViewProps) {
  const allNodes = flattenTree(roots);

  // Enrich every node with its detected source info, filter out hunt instances.
  const enriched = allNodes
    .map((node) => ({ node, info: detectSource(node.file_path) }))
    .filter(({ info }) => info.source !== 'hunt-instance');

  // ── Recent: top 3 by mtime, regardless of category ────────────────────
  const recent = [...enriched]
    .sort((a, b) => mtimeMs(b.node) - mtimeMs(a.node))
    .slice(0, 3);

  // ── Progression: library saves sorted desc by mtime ────────────────────
  const progression = enriched
    .filter(({ info }) => info.source === 'library')
    .sort((a, b) => mtimeMs(b.node) - mtimeMs(a.node));

  // ── Hunts: group hunt-base + hunt-catch by folder, sorted by latest mtime
  const huntFolders = new Map<string, HuntGroup>();
  for (const { node, info } of enriched) {
    if (info.source !== 'hunt-base' && info.source !== 'hunt-catch') continue;
    const key = info.huntFolder ?? 'unknown';
    if (!huntFolders.has(key)) {
      huntFolders.set(key, { folder: key, members: [] });
    }
    huntFolders.get(key)!.members.push({ node, info });
  }
  const hunts = Array.from(huntFolders.values()).sort((a, b) => {
    const am = Math.max(...a.members.map(m => mtimeMs(m.node)));
    const bm = Math.max(...b.members.map(m => mtimeMs(m.node)));
    return bm - am;
  });

  // ── Other: anything else ───────────────────────────────────────────────
  const other = enriched
    .filter(({ info }) => info.source === 'other')
    .sort((a, b) => mtimeMs(b.node) - mtimeMs(a.node));

  // Total visible count for the empty state check.
  const totalVisible = enriched.length;

  return (
    <div className="flex flex-col gap-1 py-2">
      {/* Recent — always open, can't be collapsed */}
      {recent.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#ec4899' }} />
            <span className="text-sm font-semibold text-foreground flex-1">Recent</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums mr-1">
              {recent.length}
            </span>
          </div>
          <div className="space-y-0.5">
            {recent.map(({ node, info }) => (
              <SaveRow
                key={`recent-${node.id}`}
                node={node}
                roleChip={info.role === 'catch' ? 'catch' : info.role === 'setup' ? 'setup' : info.role === 'library' ? 'library' : null}
                roleColor={ROLE_COLORS[info.role] ?? ROLE_COLORS.other}
                isSelected={selectedId === node.id}
                onSelect={() => onSelect(node)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progression */}
      <Section title="Progression" count={progression.length} color={ROLE_COLORS.library}>
        {progression.map(({ node }) => (
          <SaveRow
            key={`prog-${node.id}`}
            node={node}
            roleChip="library"
            roleColor={ROLE_COLORS.library}
            isSelected={selectedId === node.id}
            onSelect={() => onSelect(node)}
          />
        ))}
      </Section>

      {/* Hunts */}
      <Section title="Hunts" count={hunts.length} color={ROLE_COLORS.catch}>
        {hunts.map((group) => (
          <HuntGroupCard
            key={`hunt-${group.folder}`}
            group={group}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </Section>

      {/* Other */}
      <Section title="Other" count={other.length} color={ROLE_COLORS.other} defaultOpen={false}>
        {other.map(({ node }) => (
          <SaveRow
            key={`other-${node.id}`}
            node={node}
            roleColor={ROLE_COLORS.other}
            isSelected={selectedId === node.id}
            onSelect={() => onSelect(node)}
          />
        ))}
      </Section>

      {/* Empty state */}
      {totalVisible === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm font-medium">No saves yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Import or play with checkpoint tracking to populate this view</p>
        </div>
      )}
    </div>
  );
}
