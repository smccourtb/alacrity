import { useEffect, useMemo, useState, useRef } from 'react';
import { XIcon, PaletteIcon, GripVerticalIcon } from 'lucide-react';
import type { CheckpointNode } from './types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/api/client';

// ── Source detection ────────────────────────────────────────────────────────

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
type TagColorMap = Record<string, string | null>;

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

// ── Role → Badge variant map ────────────────────────────────────────────────

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'secondary'> = {
  catch: 'success',
  setup: 'info',
  library: 'warning',
  other: 'secondary',
};

// ── Drop target type ────────────────────────────────────────────────────────

type BucketKind =
  | { kind: 'tag'; tag: string }
  | { kind: 'untag' }
  | { kind: 'none' };

// ── Default colors (tags without a user-chosen color) ─────────────────────

const DEFAULT_TAG_COLOR = '#a855f7'; // purple
const DEFAULT_DEFAULT_COLOR = '#94a3b8';  // slate (for the Default section)
const DEFAULT_HUNTS_COLOR = '#10b981';    // emerald (for the Hunts section)
const SECTION_COLORS = {
  recent: '#ec4899',      // pink
} as const;

// Reserved keys in save_tag_meta that store colors for the built-in sections
// rather than user-authored tags. Filtered out of the user tag list.
const RESERVED_DEFAULT = '__default';
const RESERVED_HUNTS = '__hunts';
const RESERVED_KEYS = new Set([RESERVED_DEFAULT, RESERVED_HUNTS]);

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#94a3b8', // slate
];

// ── Row component ───────────────────────────────────────────────────────────

interface SaveRowProps {
  node: CheckpointNode;
  meta: SaveMeta;
  roleLabel: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onTagChange: (next: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRowDragOver: (e: React.DragEvent) => void;
  onRowDrop: () => void;
  isDragging: boolean;
  isDragHover: boolean;
  small?: boolean;
}

function SaveRow({
  node,
  meta,
  roleLabel,
  isSelected,
  onSelect,
  onTagChange,
  onDragStart,
  onDragEnd,
  onRowDragOver,
  onRowDrop,
  isDragging,
  isDragHover,
  small,
}: SaveRowProps) {
  const [editingTag, setEditingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState(meta.tag ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCatch = node.type === 'catch';
  const relTime = formatRelativeMtime(node);
  const variant = roleLabel ? ROLE_BADGE_VARIANT[roleLabel] ?? 'secondary' : 'secondary';

  useEffect(() => {
    if (editingTag) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingTag]);

  function commitTag() {
    const next = tagDraft.trim() || null;
    setEditingTag(false);
    if (next !== meta.tag) onTagChange(next);
  }

  return (
    <div
      onDragOver={onRowDragOver}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRowDrop();
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-tag-editor]')) return;
        if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
        onSelect();
      }}
      className={`
        group flex items-center gap-1 px-1 py-1.5 rounded-md transition-colors
        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
        ${isDragging ? 'opacity-40' : ''}
        ${isDragHover ? 'bg-primary/10 ring-1 ring-primary/40' : ''}
      `}
    >
      {/* Drag handle — the ONLY draggable element. Keeping the handle small
          and explicit avoids any click-vs-drag confusion with the rest of
          the row. */}
      <div
        data-drag-handle
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', String(node.save_file_id)); } catch {}
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground px-0.5 py-1 rounded"
        title="Drag to reorder or move to another section"
      >
        <GripVerticalIcon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-sm font-medium truncate ${isCatch ? 'text-emerald-600' : 'text-foreground'} ${small ? 'opacity-80' : ''}`}>
          {isCatch && '★ '}{node.label}
        </span>

        {roleLabel && <Badge variant={variant}>{roleLabel}</Badge>}

        {meta.tag && !editingTag && (
          <Badge
            variant="outline"
            data-tag-editor
            className="gap-1 cursor-pointer hover:bg-surface-raised"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setTagDraft(meta.tag ?? '');
              setEditingTag(true);
            }}
          >
            <span>{meta.tag}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTagChange(null); }}
              className="opacity-60 hover:opacity-100"
              title="Remove tag"
              aria-label="Remove tag"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        )}

        {node.is_active && <Badge variant="warning">active</Badge>}
        {!node.file_exists && <Badge variant="destructive">missing</Badge>}
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
          className="text-2xs text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:text-foreground! shrink-0 px-1 transition-opacity"
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

// ── Color picker ────────────────────────────────────────────────────────────

interface ColorPickerProps {
  currentColor: string;
  onPick: (color: string) => void;
  onClose: () => void;
}

function ColorPicker({ currentColor, onPick, onClose }: ColorPickerProps) {
  return (
    <div
      className="bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${currentColor === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-popover' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => { onPick(c); onClose(); }}
          aria-label={`Pick color ${c}`}
        />
      ))}
    </div>
  );
}

// ── Section wrapper (accordion with drop target + nested vertical line) ───

interface SectionProps {
  title: string;
  count: number;
  color: string;
  bucket: BucketKind;
  isBucketDragHover: boolean;
  onBucketDragOver: (e: React.DragEvent) => void;
  onBucketDrop: () => void;
  onPickColor?: (color: string) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  title,
  count,
  color,
  bucket,
  isBucketDragHover,
  onBucketDragOver,
  onBucketDrop,
  onPickColor,
  defaultOpen = true,
  children,
}: SectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDropTarget = bucket.kind !== 'none';
  const hasContent = count > 0 || isDropTarget;
  if (!hasContent) return null;

  // Layout: [color-button | CollapsibleTrigger title+count]. The color button
  // is OUTSIDE the Collapsible trigger so it's a proper sibling button — no
  // nested <button> HTML, and clicking it doesn't toggle the accordion.
  // Drop handlers go on the outer wrapper so the Collapsible's children
  // (Trigger + Content) remain direct children of Collapsible (which walks
  // children by reference to wire up the toggle).
  return (
    <div
      onDragOver={isDropTarget ? onBucketDragOver : undefined}
      onDrop={isDropTarget ? (e) => { e.preventDefault(); onBucketDrop(); } : undefined}
      className={`
        relative rounded-lg transition-all
        ${isBucketDragHover ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
      `}
    >
      {/* items-start pins the color button to the top of the section so it
          doesn't vertically center when the accordion is open and expands
          the Collapsible's height to include the nested content. */}
      <div className="flex items-start">
        {/* Color-dot button: sibling of CollapsibleTrigger, not nested inside. */}
        {onPickColor ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((o) => !o);
            }}
            className="flex items-center gap-1 pl-3 pr-1.5 py-2.5 hover:bg-muted/30 rounded-l-lg transition-colors shrink-0"
            title="Change tag color"
            aria-label="Change tag color"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-border"
              style={{ backgroundColor: color }}
            />
            <PaletteIcon className="size-3 text-muted-foreground/60 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center pl-3 pr-1.5 py-2.5 shrink-0">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          </div>
        )}

        <Collapsible defaultOpen={defaultOpen} className="flex-1 min-w-0">
          <CollapsibleTrigger className="w-full flex items-center gap-2 pr-3 py-2.5 text-left hover:bg-muted/30 rounded-r-lg transition-colors">
            <span className="text-sm font-bold text-foreground flex-1 uppercase tracking-wide truncate">{title}</span>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">{count}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              className="ml-5 pl-3 border-l-2 pt-0.5 pb-1 space-y-0.5"
              style={{ borderColor: `${color}40` }}
            >
              {count === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground/60 italic">
                  {isBucketDragHover ? `Drop to add to "${title}"` : 'Drop saves here to tag them'}
                </div>
              ) : children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {pickerOpen && onPickColor && (
        <>
          {/* backdrop to catch outside-clicks */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setPickerOpen(false)}
          />
          <div className="absolute top-11 left-3 z-20">
            <ColorPicker
              currentColor={color}
              onPick={onPickColor}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        </>
      )}
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
  const allNodes = useMemo(() => flattenTree(roots), [roots]);

  const [meta, setMeta] = useState<MetaMap>({});
  const [tagColors, setTagColors] = useState<TagColorMap>({});

  // Drag state — kept in BOTH state (for re-rendering the drop-target
  // highlight) and a ref (so that drag event handlers, which capture
  // closures from their render, always read the CURRENT dragged id rather
  // than a stale snapshot). Without the ref, the first onDragOver after
  // onDragStart fires with the pre-start closure and skips preventDefault,
  // which makes the drop target silently reject the drop.
  const [draggedSaveId, setDraggedSaveId] = useState<number | null>(null);
  const [rowHoverSaveId, setRowHoverSaveId] = useState<number | null>(null);
  const [bucketHoverKey, setBucketHoverKey] = useState<string | null>(null);
  const draggedSaveIdRef = useRef<number | null>(null);
  function setDragged(id: number | null) {
    draggedSaveIdRef.current = id;
    setDraggedSaveId(id);
  }

  // Fetch save meta whenever the set of save ids changes.
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

  // Fetch tag colors once (includes user tags + reserved section colors).
  useEffect(() => {
    let cancelled = false;
    api.saves.tags.list().then((m) => {
      if (!cancelled) {
        const out: TagColorMap = {};
        for (const [tag, v] of Object.entries(m)) out[tag] = v?.color ?? null;
        setTagColors(out);
      }
    }).catch((err) => {
      console.error('[GroupedView] failed to fetch tag colors:', err);
    });
    return () => { cancelled = true; };
  }, []);

  // Effective color for the built-in sections (picks up user choices or
  // falls back to the hard-coded default).
  const defaultSectionColor = tagColors[RESERVED_DEFAULT] ?? DEFAULT_DEFAULT_COLOR;
  const huntsSectionColor = tagColors[RESERVED_HUNTS] ?? DEFAULT_HUNTS_COLOR;

  const enriched = useMemo(() => {
    return allNodes
      .map((node) => ({ node, info: detectSource(node.file_path) }))
      .filter(({ info }) => info.source !== 'hunt-instance');
  }, [allNodes]);

  const recent = useMemo(() => {
    return [...enriched].sort((a, b) => mtimeMs(b.node) - mtimeMs(a.node)).slice(0, 3);
  }, [enriched]);

  const { tagSections, defaultBucket, hunts, sectionKeyForSave } = useMemo(() => {
    const tagMap = new Map<string, { node: CheckpointNode; info: SaveSourceInfo }[]>();
    const untagged: typeof enriched = [];
    const keyFor = new Map<number, string>();

    for (const row of enriched) {
      const m = getMeta(meta, row.node.save_file_id);
      if (m.tag) {
        if (!tagMap.has(m.tag)) tagMap.set(m.tag, []);
        tagMap.get(m.tag)!.push(row);
        keyFor.set(row.node.save_file_id, `tag:${m.tag}`);
      } else {
        untagged.push(row);
      }
    }

    const tagSections = Array.from(tagMap.entries())
      .map(([tag, rows]) => ({
        tag,
        rows: rows.sort((a, b) => compareSaves(a.node, b.node, meta)),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

    // Hunts: untagged saves that live in a catches folder (hunt-base or
    // hunt-catch), grouped by folder.
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
    for (const g of hunts) {
      for (const m of g.members) keyFor.set(m.node.save_file_id, `hunt:${g.folder}`);
    }

    // Default bucket: everything else untagged (library, other, anything
    // that isn't in a hunt folder and hasn't been tagged by the user).
    const defaultBucket = untagged
      .filter(({ info }) => info.source !== 'hunt-base' && info.source !== 'hunt-catch')
      .sort((a, b) => compareSaves(a.node, b.node, meta));
    for (const r of defaultBucket) keyFor.set(r.node.save_file_id, 'default');

    return { tagSections, defaultBucket, hunts, sectionKeyForSave: keyFor };
  }, [enriched, meta]);

  const totalVisible = enriched.length;

  // ── Mutations ─────────────────────────────────────────────────────────

  function updateTag(saveFileId: number, nextTag: string | null) {
    setMeta((prev) => ({
      ...prev,
      [String(saveFileId)]: {
        tag: nextTag,
        user_sort_order: null,
      },
    }));
    api.saves.meta.update(saveFileId, { tag: nextTag, user_sort_order: null }).catch((err) => {
      console.error('[GroupedView] failed to update tag:', err);
    });
  }

  function updateTagColor(tag: string, color: string) {
    setTagColors((prev) => ({ ...prev, [tag]: color }));
    api.saves.tags.update(tag, { color }).catch((err) => {
      console.error('[GroupedView] failed to update tag color:', err);
    });
  }

  /**
   * Drop on a row. Behavior depends on whether source and target are in the
   * same section (compared via string key, not array reference — the old bug).
   */
  function handleRowDrop(targetSaveId: number) {
    const dragged = draggedSaveIdRef.current;
    if (dragged == null || dragged === targetSaveId) {
      setDragged(null);
      setRowHoverSaveId(null);
      return;
    }

    const sourceKey = sectionKeyForSave.get(dragged);
    const targetKey = sectionKeyForSave.get(targetSaveId);

    if (!sourceKey || !targetKey) {
      setDragged(null);
      setRowHoverSaveId(null);
      return;
    }

    // Cross-section row drop: move to the target's section.
    if (sourceKey !== targetKey) {
      if (targetKey.startsWith('tag:')) {
        updateTag(dragged, targetKey.slice(4));
      } else if (targetKey === 'default') {
        updateTag(dragged, null);
      }
      setDragged(null);
      setRowHoverSaveId(null);
      return;
    }

    // Same section → reorder.
    const sectionRows: CheckpointNode[] =
      targetKey.startsWith('tag:')
        ? (tagSections.find(s => s.tag === targetKey.slice(4))?.rows.map(r => r.node) ?? [])
        : targetKey === 'default'
          ? defaultBucket.map(r => r.node)
          : [];

    if (sectionRows.length === 0) {
      setDragged(null);
      setRowHoverSaveId(null);
      return;
    }

    const currentIds = sectionRows.map(n => n.save_file_id);
    const withoutDragged = currentIds.filter(id => id !== dragged);
    const targetIdx = withoutDragged.indexOf(targetSaveId);
    if (targetIdx < 0) {
      setDragged(null);
      setRowHoverSaveId(null);
      return;
    }
    const newOrder = [...withoutDragged.slice(0, targetIdx), dragged, ...withoutDragged.slice(targetIdx)];

    const updates: Array<{ id: number; order: number }> = [];
    let order = newOrder.length * 100;
    for (const id of newOrder) {
      updates.push({ id, order });
      order -= 100;
    }

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
    setDragged(null);
    setRowHoverSaveId(null);

    Promise.all(
      updates.map(({ id, order }) =>
        api.saves.meta.update(id, { user_sort_order: order }).catch((err) => {
          console.error(`[GroupedView] failed to update sort order for save ${id}:`, err);
        }),
      ),
    );
  }

  /** Drop on a section → set or clear the tag on the dragged save. */
  function handleBucketDrop(bucket: BucketKind) {
    const dragged = draggedSaveIdRef.current;
    if (dragged == null || bucket.kind === 'none') {
      setDragged(null);
      setBucketHoverKey(null);
      return;
    }
    if (bucket.kind === 'tag') {
      updateTag(dragged, bucket.tag);
    } else {
      updateTag(dragged, null);
    }
    setDragged(null);
    setBucketHoverKey(null);
  }

  function rowDragProps(saveFileId: number) {
    return {
      onDragStart: () => setDragged(saveFileId),
      onDragEnd: () => { setDragged(null); setRowHoverSaveId(null); setBucketHoverKey(null); },
      onRowDragOver: (e: React.DragEvent) => {
        // Read the ref, not the state closure — the closure is stale on the
        // first dragover after dragstart because React hasn't re-rendered yet.
        const dragged = draggedSaveIdRef.current;
        if (dragged != null && dragged !== saveFileId) {
          e.preventDefault();
          e.stopPropagation();
          if (rowHoverSaveId !== saveFileId) setRowHoverSaveId(saveFileId);
        }
      },
      onRowDrop: () => handleRowDrop(saveFileId),
      isDragging: draggedSaveId === saveFileId,
      isDragHover: rowHoverSaveId === saveFileId,
    };
  }

  function bucketDragProps(key: string, bucket: BucketKind) {
    return {
      bucket,
      isBucketDragHover: bucketHoverKey === key && bucket.kind !== 'none',
      onBucketDragOver: (e: React.DragEvent) => {
        if (draggedSaveIdRef.current != null && bucket.kind !== 'none') {
          e.preventDefault();
          if (bucketHoverKey !== key) setBucketHoverKey(key);
        }
      },
      onBucketDrop: () => handleBucketDrop(bucket),
    };
  }

  function renderRow(
    node: CheckpointNode,
    roleLabel: string | null,
    small = false,
    keyPrefix = '',
  ) {
    return (
      <SaveRow
        key={`${keyPrefix}${node.id}`}
        node={node}
        meta={getMeta(meta, node.save_file_id)}
        roleLabel={roleLabel}
        isSelected={selectedId === node.id}
        onSelect={() => onSelect(node)}
        onTagChange={(next) => updateTag(node.save_file_id, next)}
        {...rowDragProps(node.save_file_id)}
        small={small}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Drag diagnostic: shows current drag state. Remove once drag is
          confirmed working end-to-end. */}
      {draggedSaveId != null && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white text-xs px-3 py-2 rounded-lg shadow-lg font-mono">
          Dragging save #{draggedSaveId}
          {rowHoverSaveId != null && <> → row #{rowHoverSaveId}</>}
          {bucketHoverKey != null && <> → bucket {bucketHoverKey}</>}
        </div>
      )}

      {/* Recent — its own standalone card so it pops */}
      {recent.length > 0 && (
        <Card className="py-3 gap-2">
          <div className="flex items-center gap-3 px-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SECTION_COLORS.recent }} />
            <span className="text-sm font-bold text-foreground flex-1 uppercase tracking-wide">Recent</span>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">{recent.length}</span>
          </div>
          <div
            className="ml-5 pl-3 border-l-2 space-y-0.5"
            style={{ borderColor: `${SECTION_COLORS.recent}40` }}
          >
            {recent.map(({ node, info }) => renderRow(node, info.role === 'other' ? null : info.role, false, 'recent-'))}
          </div>
        </Card>
      )}

      {/* All other sections in one card */}
      <Card className="py-3 gap-1">
        {/* User tag sections (filters out reserved __default / __hunts keys) */}
        {tagSections
          .filter(({ tag }) => !RESERVED_KEYS.has(tag))
          .map(({ tag, rows }) => {
            const color = tagColors[tag] ?? DEFAULT_TAG_COLOR;
            return (
              <Section
                key={`tag-${tag}`}
                title={tag}
                count={rows.length}
                color={color}
                onPickColor={(c) => updateTagColor(tag, c)}
                {...bucketDragProps(`tag-${tag}`, { kind: 'tag', tag })}
              >
                {rows.map(({ node, info }) => renderRow(node, info.role === 'other' ? null : info.role, false, `tag-${tag}-`))}
              </Section>
            );
          })}

        {/* Hunts — auto-grouped by hunt folder, not a drop target */}
        <Section
          title="Hunts"
          count={hunts.length}
          color={huntsSectionColor}
          onPickColor={(c) => updateTagColor(RESERVED_HUNTS, c)}
          {...bucketDragProps('hunts', { kind: 'none' })}
        >
          {hunts.map((group) => (
            <div key={`hunt-${group.folder}`} className="mb-1.5 rounded-md border border-border/40 bg-muted/15 overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
                <span className="text-sm font-semibold text-foreground flex-1 truncate">{group.folder}</span>
              </div>
              <div className="divide-y divide-border/15">
                {group.members.map(({ node, info }) => renderRow(node, info.role, true, `hunt-${group.folder}-`))}
              </div>
            </div>
          ))}
        </Section>

        {/* Default bucket — everything untagged and not in a hunt folder */}
        <Section
          title="Saves"
          count={defaultBucket.length}
          color={defaultSectionColor}
          onPickColor={(c) => updateTagColor(RESERVED_DEFAULT, c)}
          {...bucketDragProps('default', { kind: 'untag' })}
        >
          {defaultBucket.map(({ node, info }) => renderRow(node, info.role === 'other' ? null : info.role, false, 'default-'))}
        </Section>

        {totalVisible === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm font-medium">No saves yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Import or play with checkpoint tracking to populate this view</p>
          </div>
        )}
      </Card>
    </div>
  );
}
