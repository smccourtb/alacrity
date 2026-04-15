import { useEffect, useMemo, useState, useRef } from 'react';
import type { CheckpointNode } from './types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { api } from '@/api/client';

// ── Source detection ────────────────────────────────────────────────────────
// Categorize a checkpoint by its file path. This is the *default* grouping
// for saves with no user tag set — tagged saves get their own section above.

type SaveSource = 'library' | 'hunt-catch' | 'hunt-base' | 'hunt-instance' | 'other';

interface SaveSourceInfo {
  source: SaveSource;
  huntFolder: string | null;
  role: 'setup' | 'catch' | 'library' | 'other';
}

function detectSource(filePath: string): SaveSourceInfo {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/hunts/')) {
    return { source: 'hunt-instance', huntFolder: null, role: 'other' };
  }
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
  if (p.includes('/saves/library/')) {
    return { source: 'library', huntFolder: null, role: 'library' };
  }
  return { source: 'other', huntFolder: null, role: 'other' };
}

// ── Time helpers ────────────────────────────────────────────────────────────

function mtimeMs(node: CheckpointNode): number {
  const raw = node.file_mtime ?? node.created_at;
  if (!raw) return 0;
  const d = new Date(raw.includes('T') || raw.includes('Z') ? raw : raw + 'Z');
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

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

// ── Meta types ──────────────────────────────────────────────────────────────

interface SaveMeta {
  tag: string | null;
  user_sort_order: number | null;
}

type MetaMap = Record<string, SaveMeta>;

function getMeta(map: MetaMap, saveFileId: number): SaveMeta {
  return map[String(saveFileId)] ?? { tag: null, user_sort_order: null };
}

/** Composite sort: user_sort_order desc (nulls last), then mtime desc. */
function compareSaves(a: CheckpointNode, b: CheckpointNode, map: MetaMap): number {
  const am = getMeta(map, a.save_file_id);
  const bm = getMeta(map, b.save_file_id);
  if (am.user_sort_order != null && bm.user_sort_order == null) return -1;
  if (am.user_sort_order == null && bm.user_sort_order != null) return 1;
  if (am.user_sort_order != null && bm.user_sort_order != null) {
    if (am.user_sort_order !== bm.user_sort_order) return bm.user_sort_order - am.user_sort_order;
  }
  return mtimeMs(b) - mtimeMs(a);
}

// ── Role color palette ─────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  catch: '#10b981',
  setup: '#0ea5e9',
  library: '#f59e0b',
  tag: '#a855f7',
  other: '#94a3b8',
};

// ── Row component ───────────────────────────────────────────────────────────

interface SaveRowProps {
  node: CheckpointNode;
  meta: SaveMeta;
  roleChip?: string | null;
  roleColor?: string;
  isSelected: boolean;
  onSelect: () => void;
  onTagChange: (next: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
  isDragHover: boolean;
  small?: boolean;
}

function SaveRow({
  node,
  meta,
  roleChip,
  roleColor,
  isSelected,
  onSelect,
  onTagChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isDragHover,
  small,
}: SaveRowProps) {
  const [editingTag, setEditingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState(meta.tag ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCatch = node.type === 'catch';
  const dotColor = roleColor ?? ROLE_COLORS.other;
  const dotSize = small ? 6 : 8;
  const relTime = formatRelativeMtime(node);

  useEffect(() => {
    if (editingTag) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingTag]);

  function commitTag() {
    const next = tagDraft.trim() || null;
    setEditingTag(false);
    if (next !== meta.tag) {
      onTagChange(next);
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Setting some data helps some browsers initiate drag reliably.
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(node.save_file_id)); } catch {}
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onClick={(e) => {
        // Don't fire select when clicking the tag editor
        if ((e.target as HTMLElement).closest('[data-tag-editor]')) return;
        onSelect();
      }}
      className={`
        flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors rounded-lg
        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
        ${isDragging ? 'opacity-40' : ''}
        ${isDragHover ? 'bg-primary/10 ring-1 ring-primary/30' : ''}
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
        {meta.tag && !editingTag && (
          <span
            data-tag-editor
            className="text-2xs font-medium px-1.5 py-0.5 rounded shrink-0 leading-none cursor-pointer"
            style={{ color: ROLE_COLORS.tag, backgroundColor: `${ROLE_COLORS.tag}14`, border: `1px solid ${ROLE_COLORS.tag}33` }}
            onClick={(e) => { e.stopPropagation(); setTagDraft(meta.tag ?? ''); setEditingTag(true); }}
          >
            {meta.tag}
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

      {editingTag ? (
        <input
          ref={inputRef}
          data-tag-editor
          type="text"
          value={tagDraft}
          placeholder="tag..."
          onChange={(e) => setTagDraft(e.target.value)}
          onBlur={commitTag}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTag();
            if (e.key === 'Escape') { setEditingTag(false); setTagDraft(meta.tag ?? ''); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-2xs px-1.5 py-0.5 rounded border border-border bg-background w-24 shrink-0"
        />
      ) : !meta.tag ? (
        <button
          data-tag-editor
          onClick={(e) => { e.stopPropagation(); setTagDraft(''); setEditingTag(true); }}
          className="text-2xs text-muted-foreground/60 hover:text-foreground shrink-0 px-1"
          title="Add tag"
        >
          +tag
        </button>
      ) : null}

      <span className="text-2xs text-muted-foreground shrink-0 tabular-nums">
        {relTime}
      </span>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────

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

// ── Main export ─────────────────────────────────────────────────────────────

interface GroupedViewProps {
  roots: CheckpointNode[];
  selectedId: number | null;
  onSelect: (node: CheckpointNode) => void;
}

export function GroupedView({ roots, selectedId, onSelect }: GroupedViewProps) {
  const allNodes = useMemo(() => flattenTree(roots), [roots]);

  // Meta map: save_file_id → { tag, user_sort_order }. Kept in state so we
  // can apply optimistic updates from drag-reorder and tag edits without
  // a full refetch.
  const [meta, setMeta] = useState<MetaMap>({});

  // Drag state
  const [draggedSaveId, setDraggedSaveId] = useState<number | null>(null);
  const [hoverSaveId, setHoverSaveId] = useState<number | null>(null);

  // Fetch meta whenever the set of save ids changes.
  useEffect(() => {
    const ids = allNodes.map(n => n.save_file_id).filter(id => !!id);
    if (ids.length === 0) {
      setMeta({});
      return;
    }
    let cancelled = false;
    api.saves.meta.list(ids).then((m) => {
      if (!cancelled) setMeta(m);
    }).catch((err) => {
      console.error('[GroupedView] failed to fetch save meta:', err);
    });
    return () => { cancelled = true; };
  }, [allNodes]);

  // Enrich and filter hunt-instances.
  const enriched = useMemo(() => {
    return allNodes
      .map((node) => ({ node, info: detectSource(node.file_path) }))
      .filter(({ info }) => info.source !== 'hunt-instance');
  }, [allNodes]);

  // ── Recent: top 3 by mtime, untouched by user sort ────────────────────
  const recent = useMemo(() => {
    return [...enriched].sort((a, b) => mtimeMs(b.node) - mtimeMs(a.node)).slice(0, 3);
  }, [enriched]);

  // ── Partition by tag → source fallback ────────────────────────────────
  //
  // Saves with a non-null meta.tag go into their tag section. Everything
  // else falls into the source-based sections (library / hunt-* / other).
  const { tagSections, progression, hunts, other } = useMemo(() => {
    const tagMap = new Map<string, { node: CheckpointNode; info: SaveSourceInfo }[]>();
    const untagged: typeof enriched = [];

    for (const row of enriched) {
      const m = getMeta(meta, row.node.save_file_id);
      if (m.tag) {
        if (!tagMap.has(m.tag)) tagMap.set(m.tag, []);
        tagMap.get(m.tag)!.push(row);
      } else {
        untagged.push(row);
      }
    }

    // Sort each tag section by (user_sort_order desc, mtime desc).
    const tagSections = Array.from(tagMap.entries())
      .map(([tag, rows]) => ({
        tag,
        rows: rows.sort((a, b) => compareSaves(a.node, b.node, meta)),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

    const progression = untagged
      .filter(({ info }) => info.source === 'library')
      .sort((a, b) => compareSaves(a.node, b.node, meta));

    const huntFolders = new Map<string, { folder: string; members: typeof enriched }>();
    for (const row of untagged) {
      if (row.info.source !== 'hunt-base' && row.info.source !== 'hunt-catch') continue;
      const key = row.info.huntFolder ?? 'unknown';
      if (!huntFolders.has(key)) huntFolders.set(key, { folder: key, members: [] });
      huntFolders.get(key)!.members.push(row);
    }
    const hunts = Array.from(huntFolders.values())
      .map((g) => ({
        folder: g.folder,
        members: g.members.sort((a, b) => {
          const order: Record<string, number> = { setup: 0, catch: 1, other: 2, library: 3 };
          return (order[a.info.role] ?? 99) - (order[b.info.role] ?? 99);
        }),
      }))
      .sort((a, b) => {
        const am = Math.max(...a.members.map(m => mtimeMs(m.node)));
        const bm = Math.max(...b.members.map(m => mtimeMs(m.node)));
        return bm - am;
      });

    const other = untagged
      .filter(({ info }) => info.source === 'other')
      .sort((a, b) => compareSaves(a.node, b.node, meta));

    return { tagSections, progression, hunts, other };
  }, [enriched, meta]);

  const totalVisible = enriched.length;

  // ── Mutations ─────────────────────────────────────────────────────────

  function updateTag(saveFileId: number, nextTag: string | null) {
    // Optimistic local update.
    setMeta((prev) => ({
      ...prev,
      [String(saveFileId)]: {
        tag: nextTag,
        user_sort_order: prev[String(saveFileId)]?.user_sort_order ?? null,
      },
    }));
    api.saves.meta.update(saveFileId, { tag: nextTag }).catch((err) => {
      console.error('[GroupedView] failed to update tag:', err);
    });
  }

  /**
   * Drop: move `draggedSaveId` to the position of `targetSaveId` within
   * the same section. Only reorders; doesn't change tags on drop. Dragging
   * between sections is a no-op in this first pass.
   */
  function handleDrop(targetSaveId: number) {
    if (draggedSaveId == null || draggedSaveId === targetSaveId) {
      setDraggedSaveId(null);
      setHoverSaveId(null);
      return;
    }

    // Find which section the target belongs to, then reorder that section.
    const sectionFor = (saveFileId: number): CheckpointNode[] | null => {
      for (const { rows } of tagSections) {
        if (rows.some(r => r.node.save_file_id === saveFileId)) return rows.map(r => r.node);
      }
      if (progression.some(r => r.node.save_file_id === saveFileId)) {
        return progression.map(r => r.node);
      }
      if (other.some(r => r.node.save_file_id === saveFileId)) {
        return other.map(r => r.node);
      }
      // Hunts and hunt internals are not reorderable per-save for Phase 1b.
      return null;
    };

    const section = sectionFor(targetSaveId);
    const draggedSection = sectionFor(draggedSaveId);
    if (!section || !draggedSection || section !== draggedSection) {
      setDraggedSaveId(null);
      setHoverSaveId(null);
      return;
    }

    // Build the new order: remove dragged, insert at target position.
    const currentIds = section.map(n => n.save_file_id);
    const withoutDragged = currentIds.filter(id => id !== draggedSaveId);
    const targetIdx = withoutDragged.indexOf(targetSaveId);
    if (targetIdx < 0) {
      setDraggedSaveId(null);
      setHoverSaveId(null);
      return;
    }
    const newOrder = [...withoutDragged.slice(0, targetIdx), draggedSaveId, ...withoutDragged.slice(targetIdx)];

    // Renumber: highest = first. Spacing of 100 so future insertions can
    // fit between without a full renumber.
    const updates: Array<{ id: number; order: number }> = [];
    let order = newOrder.length * 100;
    for (const id of newOrder) {
      updates.push({ id, order });
      order -= 100;
    }

    // Optimistic local update
    setMeta((prev) => {
      const next = { ...prev };
      for (const { id, order } of updates) {
        next[String(id)] = {
          tag: prev[String(id)]?.tag ?? null,
          user_sort_order: order,
        };
      }
      return next;
    });
    setDraggedSaveId(null);
    setHoverSaveId(null);

    // Fire PATCHes in parallel. Log errors but don't roll back for Phase 1b.
    Promise.all(
      updates.map(({ id, order }) =>
        api.saves.meta.update(id, { user_sort_order: order }).catch((err) => {
          console.error(`[GroupedView] failed to update sort order for save ${id}:`, err);
        }),
      ),
    );
  }

  function dragProps(saveFileId: number) {
    return {
      onDragStart: () => setDraggedSaveId(saveFileId),
      onDragEnd: () => { setDraggedSaveId(null); setHoverSaveId(null); },
      onDragOver: (e: React.DragEvent) => {
        if (draggedSaveId != null && draggedSaveId !== saveFileId) {
          e.preventDefault();
          setHoverSaveId(saveFileId);
        }
      },
      onDrop: () => handleDrop(saveFileId),
      isDragging: draggedSaveId === saveFileId,
      isDragHover: hoverSaveId === saveFileId,
    };
  }

  // Helper to render a row with all the shared props wired up.
  function renderRow(
    node: CheckpointNode,
    roleChip: string | null,
    roleColor: string,
    small = false,
    keyPrefix = '',
  ) {
    return (
      <SaveRow
        key={`${keyPrefix}${node.id}`}
        node={node}
        meta={getMeta(meta, node.save_file_id)}
        roleChip={roleChip}
        roleColor={roleColor}
        isSelected={selectedId === node.id}
        onSelect={() => onSelect(node)}
        onTagChange={(next) => updateTag(node.save_file_id, next)}
        {...dragProps(node.save_file_id)}
        small={small}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {/* Recent — always open, not reorderable */}
      {recent.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#ec4899' }} />
            <span className="text-sm font-semibold text-foreground flex-1">Recent</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums mr-1">{recent.length}</span>
          </div>
          <div className="space-y-0.5">
            {recent.map(({ node, info }) =>
              renderRow(node, info.role === 'library' ? 'library' : info.role === 'catch' ? 'catch' : info.role === 'setup' ? 'setup' : null, ROLE_COLORS[info.role] ?? ROLE_COLORS.other, false, 'recent-'),
            )}
          </div>
        </div>
      )}

      {/* User tag sections — one per distinct tag */}
      {tagSections.map(({ tag, rows }) => (
        <Section
          key={`tag-${tag}`}
          title={tag}
          count={rows.length}
          color={ROLE_COLORS.tag}
        >
          {rows.map(({ node, info }) =>
            renderRow(node, info.role === 'library' ? 'library' : info.role === 'catch' ? 'catch' : info.role === 'setup' ? 'setup' : null, ROLE_COLORS[info.role] ?? ROLE_COLORS.other, false, `tag-${tag}-`),
          )}
        </Section>
      ))}

      {/* Progression (untagged library saves) */}
      <Section title="Progression" count={progression.length} color={ROLE_COLORS.library}>
        {progression.map(({ node }) => renderRow(node, 'library', ROLE_COLORS.library, false, 'prog-'))}
      </Section>

      {/* Hunts (untagged catch-folder saves, grouped by folder) */}
      <Section title="Hunts" count={hunts.length} color={ROLE_COLORS.catch}>
        {hunts.map((group) => (
          <div key={`hunt-${group.folder}`} className="mx-3 mb-1.5 rounded-lg border border-border/40 bg-muted/15 overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
              <span className="text-sm font-semibold text-foreground flex-1 truncate">{group.folder}</span>
            </div>
            <div className="divide-y divide-border/15">
              {group.members.map(({ node, info }) =>
                renderRow(node, info.role, ROLE_COLORS[info.role] ?? ROLE_COLORS.other, true, `hunt-${group.folder}-`),
              )}
            </div>
          </div>
        ))}
      </Section>

      {/* Other */}
      <Section title="Other" count={other.length} color={ROLE_COLORS.other} defaultOpen={false}>
        {other.map(({ node }) => renderRow(node, null, ROLE_COLORS.other, false, 'other-'))}
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
