import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { nodeColor } from './GitGraph';
import { safeSpeciesName } from '@/components/pokemon/sprites';
import { SavePreviewBody } from '@/components/SavePreviewBody';
import { TypeBadge, ActiveBadge } from './TypeBadge';
import type { CheckpointNode, CheckpointDiff, SaveSnapshot, CheckpointType } from './types';
import { LaunchActions } from '@/components/play/LaunchActions';
import { GAME_ACCENTS } from '@/lib/game-constants';
import { CollectionToggle } from './CollectionToggle';

/** Safely display location text */
function safeLocation(location: string | null | undefined): string | null {
  if (!location || location === 'unknown') return null;
  return location;
}

/** Trim absolute path to relative */
function relativeFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const idx = filePath.indexOf('saves/');
  if (idx >= 0) return filePath.slice(idx);
  const parts = filePath.split('/');
  return parts[parts.length - 1] || null;
}

function buildDiffSummary(diff: CheckpointDiff | null, snap: SaveSnapshot | null): string[] {
  if (!diff) return [];
  const lines: string[] = [];

  if (diff.new_badges) {
    lines.push(`Earned ${diff.new_badges} new badge${diff.new_badges > 1 ? 's' : ''} (now ${snap?.badge_count ?? '?'} total)`);
  }
  if (diff.new_shinies && diff.new_shinies.length > 0) {
    const names = diff.new_shinies.map(n => safeSpeciesName(n.species_name));
    lines.push(`Caught shiny: ${names.join(', ')}`);
  }
  if (diff.daycare_changed) {
    lines.push('Daycare Pokemon changed');
  }
  if (diff.location_changed) {
    lines.push(`Moved to ${safeLocation(snap?.location) ?? 'new location'}`);
  }
  if (diff.party_changed) {
    lines.push('Party composition changed');
  }
  return lines;
}


interface NodeDetailProps {
  node: CheckpointNode;
  allNodes?: CheckpointNode[];
  onPlay?: () => void;
  onHunt?: () => void;
  onSetActive?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  onReparent?: (nodeId: number, newParentId: number | null) => void;
  onUpdate?: (nodeId: number, data: { label?: string; notes?: string }) => Promise<void>;
  onClose?: () => void;
  isLocal?: boolean;
  onStreamPlay?: () => void;
  onWebPlay?: () => void;
  onTrade?: () => void;
  onToggle?: () => void;
}

export function NodeDetail({
  node,
  allNodes,
  onPlay,
  onHunt,
  onSetActive,
  onEdit,
  onDownload,
  onReparent,
  onUpdate,
  onClose,
  isLocal,
  onStreamPlay,
  onWebPlay,
  onTrade,
  onToggle,
}: NodeDetailProps) {
  const [reparenting, setReparenting] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(node.label);
  const [saving, setSaving] = useState(false);
  const snap = node.snapshot;
  const isHuntable = node.type === 'hunt_base' || node.type === 'daycare_swap';
  const diffLines = buildDiffSummary(node.diff, snap);
  const relPath = relativeFilePath(node.file_path);
  const fileName = node.file_path ? node.file_path.split('/').pop() : null;

  // Collect all node IDs in this node's subtree (to prevent cycles in reparent)
  function getDescendantIds(n: CheckpointNode): Set<number> {
    const ids = new Set<number>();
    function walk(c: CheckpointNode) { ids.add(c.id); c.children.forEach(walk); }
    walk(n);
    return ids;
  }
  const descendantIds = getDescendantIds(node);
  const reparentOptions = allNodes?.filter(n => !descendantIds.has(n.id)) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-raised">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {editingLabel && onUpdate ? (
              <input
                autoFocus
                className="text-base font-semibold text-foreground bg-surface-raised rounded-md px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-ring/20 min-w-0 flex-1"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    setSaving(true);
                    await onUpdate(node.id, { label: labelDraft });
                    setEditingLabel(false);
                    setSaving(false);
                  }
                  if (e.key === 'Escape') {
                    setLabelDraft(node.label);
                    setEditingLabel(false);
                  }
                }}
                onBlur={() => { setLabelDraft(node.label); setEditingLabel(false); }}
                disabled={saving}
              />
            ) : (
              <span
                className={`text-base font-semibold text-foreground ${onUpdate ? 'cursor-pointer hover:bg-surface-raised rounded-md px-1 -mx-1 transition-colors' : ''}`}
                onClick={() => { if (onUpdate) { setLabelDraft(node.label); setEditingLabel(true); } }}
                title={onUpdate ? 'Click to rename' : undefined}
              >
                {node.label}
              </span>
            )}
            <TypeBadge type={node.type} />
            {node.is_active && <ActiveBadge />}
          </div>
          {relPath && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate" title={node.file_path}>
              {relPath}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-colors shrink-0 ml-2"
            aria-label="Close detail panel"
          >
            &#10005;
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* File info — stays in NodeDetail */}
        {fileName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">File:</span>
            <code className="text-sm bg-surface-raised px-2 py-0.5 rounded font-mono text-foreground/80 truncate max-w-full">
              {fileName}
            </code>
            {!node.file_exists && (
              <span className="text-red-500 text-xs font-medium">not found</span>
            )}
          </div>
        )}

        {/* Shared preview body */}
        {snap ? (
          <SavePreviewBody
            snapshot={snap}
            showBoxes
            showNotes={!!onUpdate}
            notes={node.notes}
            onNotesChange={onUpdate ? async (notes) => { await onUpdate(node.id, { notes }); } : undefined}
          >
            {/* Diff summary — NodeDetail-specific */}
            {diffLines.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wide font-semibold mb-2">
                  Changes from parent
                </div>
                <ul className="flex flex-col gap-1">
                  {diffLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-muted-foreground mt-0.5">&bull;</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SavePreviewBody>
        ) : (
          <div className="text-sm text-muted-foreground/60 bg-surface rounded-lg px-3 py-2">
            Save snapshot not available. Binary parsing may have failed for this save file.
          </div>
        )}

        {/* File status warning */}
        {!node.file_exists && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Save file not found on disk
          </div>
        )}

        {/* Reparent control */}
        {onReparent && reparenting && (
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Move under a different parent
            </div>
            <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
              <button
                className={`text-left text-sm px-2 py-1.5 rounded-md hover:bg-white transition-colors ${
                  node.parent_id === null ? 'font-semibold text-primary' : 'text-foreground'
                }`}
                onClick={() => { onReparent(node.id, null); setReparenting(false); }}
              >
                (Root — no parent)
              </button>
              {reparentOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`flex items-center gap-1.5 text-left text-sm px-2 py-1.5 rounded-md hover:bg-white transition-colors min-w-0 ${
                    node.parent_id === opt.id ? 'font-semibold text-primary' : 'text-foreground'
                  }`}
                  title={opt.label}
                  onClick={() => { onReparent(node.id, opt.id); setReparenting(false); }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: nodeColor(opt.type) }}
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setReparenting(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(onPlay || onStreamPlay) && (
            <LaunchActions
              game={snap?.game ?? ''}
              generation={snap?.generation}
              fileExists={node.file_exists}
              isLocal={isLocal ?? false}
              accentColor={GAME_ACCENTS[snap?.game ?? '']}
              onDesktopPlay={onPlay ?? (() => {})}
              onStreamPlay={onStreamPlay ?? (() => {})}
              onWebPlay={onWebPlay ?? (() => {})}
              onTrade={onTrade}
            />
          )}
          {onHunt && isHuntable && (
            <Button size="sm" variant="outline" className="rounded-lg" disabled={!node.file_exists} onClick={onHunt}>
              &#9876; Start Hunt
            </Button>
          )}
          {onSetActive && !node.is_active && (
            <Button size="sm" variant="outline" className="rounded-lg" onClick={onSetActive}>
              Set as Active
            </Button>
          )}
          {onReparent && !reparenting && (
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setReparenting(true)}>
              Move...
            </Button>
          )}
          {onDownload && node.file_exists && (
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={onDownload}>
              Download
            </Button>
          )}
        </div>

        {/* Collection toggle */}
        <CollectionToggle
          checkpointId={node.id}
          included={node.include_in_collection}
          archived={node.archived}
          isActive={node.is_active}
          onToggle={onToggle ?? (() => {})}
        />
      </div>
    </div>
  );
}
