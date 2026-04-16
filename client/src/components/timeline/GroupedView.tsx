import { useEffect, useMemo, useState } from 'react';
import { XIcon, GripVerticalIcon } from 'lucide-react';
import type { CheckpointNode } from './types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/api/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Source detection ────────────────────────────────────────────────────────

type SaveSource = 'library' | 'hunt-catch' | 'hunt-base' | 'hunt-instance' | 'other';

interface SaveSourceInfo {
  source: SaveSource;
  huntFolder: string | null;
  role: 'setup' | 'catch' | 'encounter' | 'library' | 'other';
}

function detectSource(filePath: string): SaveSourceInfo {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/hunts/')) {
    return { source: 'hunt-instance', huntFolder: null, role: 'other' };
  }
  // Encounter state file: catches/{game}/{folder}/shiny.ss1
  const encounterMatch = p.match(/\/saves\/catches\/[^/]+\/([^/]+)\/shiny\.ss1$/);
  if (encounterMatch) {
    return { source: 'hunt-catch', huntFolder: encounterMatch[1], role: 'encounter' };
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

// ── Role → Badge variant ────────────────────────────────────────────────────

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'secondary' | 'shiny'> = {
  catch: 'success',
  setup: 'info',
  encounter: 'shiny',
  library: 'warning',
  other: 'secondary',
};

const ROLE_DOT_COLOR: Record<string, string> = {
  setup: '#0ea5e9',    // sky-500, matches info badge
  encounter: '#eab308', // yellow-500, matches shiny badge
  catch: '#22c55e',    // green-500, matches success badge
};

// ── Color constants ────────────────────────────────────────────────────────

const DEFAULT_TAG_COLOR = '#a855f7';
const DEFAULT_DEFAULT_COLOR = '#94a3b8';
const DEFAULT_HUNTS_COLOR = '#10b981';
const SECTION_COLORS = {
  recent: '#ec4899',
} as const;
const RESERVED_DEFAULT = '__default';
const RESERVED_HUNTS = '__hunts';
const RESERVED_KEYS = new Set([RESERVED_DEFAULT, RESERVED_HUNTS]);

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#94a3b8',
];

// ── Section key encoding ────────────────────────────────────────────────────
//
// Each section (tag / default / hunts) has a stable string key so dnd-kit can
// identify which container a dragged item belongs to.
//   'tag:<tag name>'  → user tag section, reorderable, drop target
//   'default'          → untagged default bucket, reorderable, drop target
//   'hunts'            → hunts section, NOT reorderable, NOT a drop target
// Sortable item ids are 'save:<save_file_id>' so they can't collide with
// section keys.

function saveId(saveFileId: number): string {
  return `save:${saveFileId}`;
}

function parseSaveId(id: string): number | null {
  if (!id.startsWith('save:')) return null;
  return Number(id.slice(5));
}

function huntId(folder: string): string {
  return `hunt:${folder}`;
}

function parseHuntId(id: string): string | null {
  if (!id.startsWith('hunt:')) return null;
  return id.slice(5);
}

// ── Sortable row component ─────────────────────────────────────────────────

interface SortableSaveRowProps {
  node: CheckpointNode;
  meta: SaveMeta;
  roleLabel: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onTagChange: (next: string | null) => void;
  small?: boolean;
}

function SortableSaveRow(props: SortableSaveRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: saveId(props.node.save_file_id),
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} data-save-file-id={props.node.save_file_id}>
      <SaveRow {...props} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
}

// ── Draggable hunt card (entire hunt folder as one drag unit) ─────────────

function DraggableHuntCard({
  folder,
  members,
  selectedId,
  getMetaFn,
  onSelect,
}: {
  folder: string;
  members: Array<{ node: CheckpointNode; info: SaveSourceInfo }>;
  selectedId: number | null;
  getMetaFn: (sfId: number) => SaveMeta;
  onSelect: (node: CheckpointNode) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: huntId(folder),
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1.5 rounded-md border border-border/40 bg-muted/15 overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/25">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground px-0.5 py-1 rounded touch-none"
          title="Drag to reorder hunt"
        >
          <GripVerticalIcon className="size-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{folder}</span>
      </div>
      <div className="relative">
        {/* Vertical spine aligned with the drag handle center (10px pad + 2px grip pad + 7px half-icon = 19px) */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border/40" />
        {members.map(({ node, info }, i) => (
          <div key={`hunt-${folder}-${node.id}`} className="relative flex items-center">
            {/* Node dot on the spine — colored by role */}
            <div
              className="absolute left-[16px] w-[5px] h-[5px] rounded-full z-[1]"
              style={{ backgroundColor: ROLE_DOT_COLOR[info.role] ?? '#9ca3af' }}
            />
            <div className="flex-1 min-w-0 pl-7">
              <SaveRow
                node={node}
                meta={getMetaFn(node.save_file_id)}
                roleLabel={info.role}
                isSelected={selectedId === node.id}
                onSelect={() => onSelect(node)}
                onTagChange={() => {}}
                small
                hideDragHandle
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plain row component (no sortable state) ───────────────────────────────

interface SaveRowProps {
  node: CheckpointNode;
  meta: SaveMeta;
  roleLabel: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onTagChange: (next: string | null) => void;
  small?: boolean;
  hideDragHandle?: boolean;
  // dnd-kit types these as SyntheticListenerMap — accept as loose objects
  // and spread onto the drag handle element.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: any;
  isOverlay?: boolean;
}

function SaveRow({
  node,
  meta,
  roleLabel,
  isSelected,
  onSelect,
  onTagChange,
  small,
  hideDragHandle,
  dragAttributes,
  dragListeners,
  isOverlay,
}: SaveRowProps) {
  const [editingTag, setEditingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState(meta.tag ?? '');
  const isCatch = node.type === 'catch';
  const relTime = formatRelativeMtime(node);
  const variant = roleLabel ? ROLE_BADGE_VARIANT[roleLabel] ?? 'secondary' : 'secondary';

  function commitTag() {
    const next = tagDraft.trim() || null;
    setEditingTag(false);
    if (next !== meta.tag) onTagChange(next);
  }

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-tag-editor]')) return;
        if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
        onSelect();
      }}
      className={`
        group flex items-center gap-1 px-1 py-1.5 rounded-md transition-colors
        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
        ${isOverlay ? 'bg-card shadow-lg ring-1 ring-border' : ''}
      `}
    >
      {/* Drag handle — only this element is the drag listener target */}
      {!hideDragHandle && (
        <div
          data-drag-handle
          {...(dragAttributes ?? {})}
          {...(dragListeners ?? {})}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground px-0.5 py-1 rounded touch-none"
          title="Drag to reorder or move to another section"
        >
          <GripVerticalIcon className="size-3.5" />
        </div>
      )}
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
          autoFocus
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
      ) : !meta.tag && !isOverlay ? (
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

// ── Section wrapper ────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count: number;
  color: string;
  sectionKey: string;           // dnd-kit droppable id
  isDropTarget: boolean;         // true = section accepts drops (re-tag)
  onPickColor?: (color: string) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  title,
  count,
  color,
  sectionKey,
  isDropTarget,
  onPickColor,
  defaultOpen = true,
  children,
}: SectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Register the section as a dnd-kit droppable so the container itself can
  // receive drops (moving a save into a tag section, etc).
  const { isOver, setNodeRef } = useDroppable({
    id: sectionKey,
    disabled: !isDropTarget,
  });

  const hasContent = count > 0 || isDropTarget;
  if (!hasContent) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative rounded-lg transition-colors
        ${isOver && isDropTarget ? 'bg-muted/50' : ''}
      `}
    >
      <div className="flex items-start group/section">
        {onPickColor ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((o) => !o);
            }}
            className="flex items-center pl-3 pr-1.5 py-2.5 group-hover/section:bg-muted/30 rounded-l-lg transition-colors shrink-0"
            title="Change tag color"
            aria-label="Change tag color"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-border hover:scale-125 transition-transform"
              style={{ backgroundColor: color }}
            />
          </button>
        ) : (
          <div className="flex items-center pl-3 pr-1.5 py-2.5 shrink-0">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          </div>
        )}

        <Collapsible defaultOpen={defaultOpen} className="flex-1 min-w-0">
          <CollapsibleTrigger className="w-full flex items-center gap-2 pr-3 py-2.5 text-left group-hover/section:bg-muted/30 rounded-r-lg transition-colors">
            <span className="text-sm font-bold text-foreground flex-1 uppercase tracking-wide truncate">{title}</span>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">{count}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-4 pb-1 space-y-0.5">
              {count === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground/60 italic">
                  {isOver && isDropTarget ? `Drop to add to "${title}"` : 'Drop saves here to tag them'}
                </div>
              ) : children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {pickerOpen && onPickColor && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
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
  scrollToSaveFileId?: number | null;
  pulseSaveFileId?: number | null;
}

export function GroupedView({ roots, selectedId, onSelect, scrollToSaveFileId, pulseSaveFileId }: GroupedViewProps) {
  const allNodes = useMemo(() => flattenTree(roots), [roots]);

  const [meta, setMeta] = useState<MetaMap>({});
  const [tagColors, setTagColors] = useState<TagColorMap>({});
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [activeDragHunt, setActiveDragHunt] = useState<string | null>(null);

  // Require a small pointer movement before drag activates, so clicks still
  // work on the row (tag editor, select, color button).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Fetch save meta whenever save ids change.
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

  // Fetch tag colors once.
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

  useEffect(() => {
    if (scrollToSaveFileId == null && pulseSaveFileId == null) return;
    if (roots.length === 0) return;
    const targetId = scrollToSaveFileId ?? pulseSaveFileId;

    let rafId: number | null = null;
    let clearTimer: number | null = null;
    let attempts = 0;

    const apply = () => {
      const wrapper = document.querySelector<HTMLElement>(
        `[data-save-file-id="${targetId}"]`,
      );
      if (!wrapper) {
        // Row may not be mounted yet on the same frame the effect fires.
        if (attempts++ < 20) rafId = requestAnimationFrame(apply);
        return;
      }
      const card = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;

      if (scrollToSaveFileId != null) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (pulseSaveFileId != null) {
        const classes = ['ring-4', 'ring-primary', 'ring-offset-2', 'transition-all'];
        card.classList.add(...classes);
        clearTimer = window.setTimeout(() => {
          card.classList.remove(...classes);
        }, 3000);
      }
    };

    apply();

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (clearTimer != null) clearTimeout(clearTimer);
    };
  }, [scrollToSaveFileId, pulseSaveFileId, roots]);

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

  const { tagSections, defaultBucket, hunts, saveToSection } = useMemo(() => {
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
      .filter(([tag]) => !RESERVED_KEYS.has(tag))
      .map(([tag, rows]) => ({
        tag,
        rows: rows.sort((a, b) => compareSaves(a.node, b.node, meta)),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

    // Hunts: untagged saves in a catches folder, grouped by folder.
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
          const order: Record<string, number> = { setup: 0, encounter: 1, catch: 2, other: 3, library: 4 };
          return (order[a.info.role] ?? 99) - (order[b.info.role] ?? 99);
        }),
      }))
      .sort((a, b) => {
        // Respect user sort order (stored on first member) if set
        const aOrder = getMeta(meta, a.members[0]?.node.save_file_id ?? 0).user_sort_order;
        const bOrder = getMeta(meta, b.members[0]?.node.save_file_id ?? 0).user_sort_order;
        if (aOrder != null && bOrder == null) return -1;
        if (aOrder == null && bOrder != null) return 1;
        if (aOrder != null && bOrder != null && aOrder !== bOrder) return bOrder - aOrder;
        const am = Math.max(...a.members.map(m => mtimeMs(m.node)));
        const bm = Math.max(...b.members.map(m => mtimeMs(m.node)));
        return bm - am;
      });
    for (const g of hunts) {
      for (const m of g.members) keyFor.set(m.node.save_file_id, 'hunts');
    }

    // Default bucket: everything else untagged.
    const defaultBucket = untagged
      .filter(({ info }) => info.source !== 'hunt-base' && info.source !== 'hunt-catch')
      .sort((a, b) => compareSaves(a.node, b.node, meta));
    for (const r of defaultBucket) keyFor.set(r.node.save_file_id, 'default');

    return { tagSections, defaultBucket, hunts, saveToSection: keyFor };
  }, [enriched, meta]);

  const totalVisible = enriched.length;

  // ── Mutations ─────────────────────────────────────────────────────────

  function updateTag(saveFileId: number, nextTag: string | null) {
    setMeta((prev) => ({
      ...prev,
      [String(saveFileId)]: { tag: nextTag, user_sort_order: null },
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

  function persistOrder(sectionIds: number[]) {
    // Renumber the whole section: highest goes first, spacing of 100 so
    // future single insertions can fit between without a full renumber.
    const updates: Array<{ id: number; order: number }> = [];
    let order = sectionIds.length * 100;
    for (const id of sectionIds) {
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
    Promise.all(
      updates.map(({ id, order }) =>
        api.saves.meta.update(id, { user_sort_order: order }).catch((err) => {
          console.error(`[GroupedView] failed to update sort order for save ${id}:`, err);
        }),
      ),
    );
  }

  // ── dnd-kit handlers ─────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const idStr = String(event.active.id);
    const sid = parseSaveId(idStr);
    if (sid != null) { setActiveDragId(sid); return; }
    const hid = parseHuntId(idStr);
    if (hid != null) { setActiveDragHunt(hid); return; }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragHunt(null);
    if (!over) return;

    const overIdStr = String(over.id);

    // Hunt group drag — reorder within hunts only
    const huntFolder = parseHuntId(String(active.id));
    if (huntFolder != null) {
      const overFolder = parseHuntId(overIdStr);
      if (overFolder == null || overFolder === huntFolder) return;
      const folders = hunts.map(g => g.folder);
      const oldIndex = folders.indexOf(huntFolder);
      const newIndex = folders.indexOf(overFolder);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(folders, oldIndex, newIndex);
      // Persist order using the first member's save_file_id for each group
      const ids = reordered.map(f => {
        const group = hunts.find(g => g.folder === f);
        return group?.members[0]?.node.save_file_id ?? 0;
      }).filter(id => id > 0);
      persistOrder(ids);
      return;
    }

    // Individual save drag (existing logic)
    const activeSaveFileId = parseSaveId(String(active.id));
    if (activeSaveFileId == null) return;

    const overSaveFileId = parseSaveId(overIdStr);

    if (overSaveFileId != null) {
      if (overSaveFileId === activeSaveFileId) return;
      const sourceSection = saveToSection.get(activeSaveFileId);
      const targetSection = saveToSection.get(overSaveFileId);
      if (!sourceSection || !targetSection) return;

      if (sourceSection !== targetSection) {
        if (targetSection.startsWith('tag:')) {
          updateTag(activeSaveFileId, targetSection.slice(4));
        } else if (targetSection === 'default') {
          updateTag(activeSaveFileId, null);
        }
        return;
      }

      const ids = sectionIdsFor(targetSection);
      if (ids.length === 0) return;
      const oldIndex = ids.indexOf(activeSaveFileId);
      const newIndex = ids.indexOf(overSaveFileId);
      if (oldIndex < 0 || newIndex < 0) return;
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      persistOrder(newOrder);
      return;
    }

    if (overIdStr.startsWith('tag:')) {
      updateTag(activeSaveFileId, overIdStr.slice(4));
    } else if (overIdStr === 'default') {
      updateTag(activeSaveFileId, null);
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Reserved for future cross-section live-preview. Empty for now —
    // dnd-kit's sortable strategy handles same-section item shifting
    // automatically.
  }

  // Helper: the current save_file_id list for a given section key.
  function sectionIdsFor(key: string): number[] {
    if (key.startsWith('tag:')) {
      const tag = key.slice(4);
      return tagSections.find(s => s.tag === tag)?.rows.map(r => r.node.save_file_id) ?? [];
    }
    if (key === 'default') return defaultBucket.map(r => r.node.save_file_id);
    return [];
  }

  // ── Rendering helpers ────────────────────────────────────────────────

  function renderSortableRow(
    node: CheckpointNode,
    roleLabel: string | null,
    small = false,
  ) {
    return (
      <SortableSaveRow
        key={node.save_file_id}
        node={node}
        meta={getMeta(meta, node.save_file_id)}
        roleLabel={roleLabel}
        isSelected={selectedId === node.id}
        onSelect={() => onSelect(node)}
        onTagChange={(next) => updateTag(node.save_file_id, next)}
        small={small}
      />
    );
  }

  // The currently-dragged node, for rendering in the DragOverlay
  const activeNode = activeDragId != null
    ? allNodes.find(n => n.save_file_id === activeDragId) ?? null
    : null;
  const activeRoleLabel = activeNode
    ? (() => {
        const info = detectSource(activeNode.file_path);
        return info.role === 'other' ? null : info.role;
      })()
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Recent — standalone, not sortable, not a drop target */}
        {recent.length > 0 && (
          <Card className="py-3 gap-2">
            <div className="flex items-center gap-3 px-3 py-1">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SECTION_COLORS.recent }} />
              <span className="text-sm font-bold text-foreground flex-1 uppercase tracking-wide">Recent</span>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">{recent.length}</span>
            </div>
            <div className="ml-4 space-y-0.5">
              {recent.map(({ node, info }) => (
                <SaveRow
                  key={`recent-${node.id}`}
                  node={node}
                  meta={getMeta(meta, node.save_file_id)}
                  roleLabel={info.role === 'other' ? null : info.role}
                  isSelected={selectedId === node.id}
                  onSelect={() => onSelect(node)}
                  onTagChange={(next) => updateTag(node.save_file_id, next)}
                />
              ))}
            </div>
          </Card>
        )}

        <Card className="py-3 gap-1">
          {/* User tag sections */}
          {tagSections.map(({ tag, rows }) => {
            const color = tagColors[tag] ?? DEFAULT_TAG_COLOR;
            const sectionKey = `tag:${tag}`;
            const ids = rows.map(r => saveId(r.node.save_file_id));
            return (
              <Section
                key={sectionKey}
                title={tag}
                count={rows.length}
                color={color}
                sectionKey={sectionKey}
                isDropTarget={true}
                onPickColor={(c) => updateTagColor(tag, c)}
              >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {rows.map(({ node, info }) => renderSortableRow(node, info.role === 'other' ? null : info.role))}
                </SortableContext>
              </Section>
            );
          })}

          {/* Hunts — auto-grouped by folder, NOT a drop target, NOT reorderable */}
          <Section
            title="Hunts"
            count={hunts.length}
            color={huntsSectionColor}
            sectionKey="hunts"
            isDropTarget={false}
            onPickColor={(c) => updateTagColor(RESERVED_HUNTS, c)}
          >
            <SortableContext items={hunts.map(g => huntId(g.folder))} strategy={verticalListSortingStrategy}>
              {hunts.map((group) => (
                <DraggableHuntCard
                  key={`hunt-${group.folder}`}
                  folder={group.folder}
                  members={group.members}
                  selectedId={selectedId}
                  getMetaFn={(sfId) => getMeta(meta, sfId)}
                  onSelect={onSelect}
                />
              ))}
            </SortableContext>
          </Section>

          {/* Default bucket — untagged saves */}
          <Section
            title="Saves"
            count={defaultBucket.length}
            color={defaultSectionColor}
            sectionKey="default"
            isDropTarget={true}
            onPickColor={(c) => updateTagColor(RESERVED_DEFAULT, c)}
          >
            <SortableContext
              items={defaultBucket.map(r => saveId(r.node.save_file_id))}
              strategy={verticalListSortingStrategy}
            >
              {defaultBucket.map(({ node, info }) => renderSortableRow(node, info.role === 'other' ? null : info.role))}
            </SortableContext>
          </Section>

          {totalVisible === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">No saves yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Import or play with checkpoint tracking to populate this view</p>
            </div>
          )}
        </Card>
      </div>

      {/* Floating drag preview that follows the cursor during a drag */}
      <DragOverlay>
        {activeNode ? (
          <div className="pointer-events-none max-w-md">
            <SaveRow
              node={activeNode}
              meta={getMeta(meta, activeNode.save_file_id)}
              roleLabel={activeRoleLabel}
              isSelected={false}
              onSelect={() => {}}
              onTagChange={() => {}}
              isOverlay
            />
          </div>
        ) : activeDragHunt ? (
          <div className="bg-card shadow-lg ring-1 ring-border rounded-md px-3 py-2 flex items-center gap-2">
            <GripVerticalIcon className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">{activeDragHunt}</span>
            <Badge variant="secondary">{hunts.find(g => g.folder === activeDragHunt)?.members.length ?? 0}</Badge>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
