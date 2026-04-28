import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import FilterDropdown from '@/components/FilterDropdown';
import ItemPickerModal from './ItemPickerModal';
import RichTextToolbar from './RichTextToolbar';
import RichText from './RichText';

type MarkerType = 'connection' | 'note' | 'building' | 'poi';

interface ExistingMarker {
  id: number;
  name: string;              // label
  detail: string | null;     // description
  method: string;            // marker_type
  x: number;
  y: number;
  paired_marker_id?: number | null;
  paired_label?: string | null;
  paired_map_name?: string | null;
  sprite_kind?: 'item' | 'pokemon' | null;
  sprite_ref?: string | null;
}

interface Props {
  mode: 'create' | 'edit';
  game: string;
  mapId: number;
  marker?: ExistingMarker;
  pendingPosition?: { x: number; y: number };
  onClose: () => void;
  onSaved: () => void;
  onRequestPairPlacement?: (data: { labelA: string; labelB: string; description?: string }) => void;
  onRequestMove?: () => void;
}

const TYPE_OPTIONS: { value: MarkerType; label: string }[] = [
  { value: 'connection', label: 'Connection' },
  { value: 'note', label: 'Note / Tip' },
  { value: 'building', label: 'Building' },
  { value: 'poi', label: 'Point of Interest' },
];

export default function CustomMarkerEditor({ mode, game, mapId, marker, pendingPosition, onClose, onSaved, onRequestPairPlacement, onRequestMove }: Props) {
  const [label, setLabel] = useState(marker?.name ?? '');
  const [labelB, setLabelB] = useState('');
  const [description, setDescription] = useState(marker?.detail ?? '');
  const [markerType, setMarkerType] = useState<MarkerType>((marker?.method as MarkerType) ?? 'note');
  const [unlinked, setUnlinked] = useState<Array<{ id: number; label: string; map_name: string }>>([]);
  const [spriteKind, setSpriteKind] = useState<'item' | 'pokemon' | null>(marker?.sprite_kind ?? null);
  const [spriteRef, setSpriteRef] = useState<string | null>(marker?.sprite_ref ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const isPairCreate = mode === 'create' && markerType === 'connection' && onRequestPairPlacement;

  useEffect(() => {
    if (mode === 'edit' && markerType === 'connection' && marker && marker.paired_marker_id == null) {
      api.guide.unlinkedConnectionMarkers(game).then(rows => {
        setUnlinked(rows.filter(r => r.id !== marker.id));
      });
    }
  }, [mode, markerType, marker, game]);

  async function handleCreate() {
    if (!label.trim() || !pendingPosition) return;
    await api.guide.createCustomMarker({
      map_id: mapId,
      game,
      label: label.trim(),
      marker_type: markerType,
      description: description.trim() || undefined,
      x: pendingPosition.x,
      y: pendingPosition.y,
      sprite_kind: spriteKind,
      sprite_ref: spriteRef,
    });
    onSaved();
    onClose();
  }

  async function handleUpdate(patch: Record<string, any>) {
    if (!marker) return;
    await api.guide.updateCustomMarker(marker.id, patch);
    onSaved();
  }

  async function handleDelete() {
    if (!marker) return;
    if (!confirm(`Delete "${marker.name}"?`)) return;
    await api.guide.deleteCustomMarker(marker.id);
    onSaved();
    onClose();
  }

  async function handleLink(partnerId: number) {
    if (!marker) return;
    await api.guide.linkCustomMarkers(marker.id, partnerId);
    onSaved();
    onClose();
  }

  async function handleUnlink() {
    if (!marker) return;
    await api.guide.unlinkCustomMarker(marker.id);
    onSaved();
  }

  return (
    <div className="p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{mode === 'create' ? 'New Custom Marker' : 'Edit Custom Marker'}</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{isPairCreate ? 'A label (this side)' : 'Label'}</label>
        <Input
          ref={labelRef}
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={e => {
            if ((e.relatedTarget as HTMLElement | null)?.closest('[data-rt-modal]')) return;
            if (mode === 'edit' && marker && label !== marker.name) handleUpdate({ label });
          }}
          placeholder={isPairCreate ? 'e.g. Entrance to Dark Cave' : 'e.g. Mt. Moon east entrance'}
        />
        <RichTextToolbar inputRef={labelRef} value={label} onChange={setLabel} />
        {label.trim() && (
          <div className="px-2 py-1 rounded border border-dashed border-border/60 bg-background/40">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Preview</div>
            <RichText text={label} className="text-sm" />
          </div>
        )}
      </div>

      {isPairCreate && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">B label (other side)</label>
          <Input
            value={labelB}
            onChange={e => setLabelB(e.target.value)}
            placeholder="e.g. To Route 34"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Type</label>
        <FilterDropdown
          label="Type"
          options={TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          selected={[markerType]}
          onChange={(sel) => {
            const next = (sel[0] as MarkerType) ?? 'note';
            setMarkerType(next);
            if (mode === 'edit' && marker && next !== marker.method) handleUpdate({ marker_type: next });
          }}
          multiSelect={false}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Description / tip</label>
        <Input
          ref={descRef}
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={e => {
            if ((e.relatedTarget as HTMLElement | null)?.closest('[data-rt-modal]')) return;
            if (mode === 'edit' && marker && description !== (marker.detail ?? '')) handleUpdate({ description });
          }}
          placeholder="Shown on hover"
        />
        <RichTextToolbar inputRef={descRef} value={description} onChange={setDescription} />
        {description.trim() && (
          <div className="px-2 py-1 rounded border border-dashed border-border/60 bg-background/40">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Preview</div>
            <RichText text={description} className="text-sm" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Icon</label>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
            {spriteRef && (spriteKind === 'item' || spriteKind === 'pokemon') ? (
              <img
                src={`/sprites/${spriteKind === 'pokemon' ? 'pokemon' : 'items'}/${spriteRef}`}
                alt=""
                style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">none</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs py-1 px-2 rounded bg-muted hover:bg-muted/70"
          >
            Choose icon
          </button>
          {spriteRef && (
            <button
              type="button"
              onClick={() => {
                setSpriteKind(null);
                setSpriteRef(null);
                if (mode === 'edit' && marker) handleUpdate({ sprite_kind: null, sprite_ref: null });
              }}
              className="text-xs py-1 px-2 rounded bg-muted hover:bg-muted/70"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <ItemPickerModal
          onClose={() => setPickerOpen(false)}
          onPick={(picked) => {
            setSpriteKind(picked.sprite_kind);
            setSpriteRef(picked.sprite_ref);
            setPickerOpen(false);
            if (mode === 'edit' && marker) {
              handleUpdate({ sprite_kind: picked.sprite_kind, sprite_ref: picked.sprite_ref });
            }
          }}
        />
      )}

      {mode === 'edit' && markerType === 'connection' && marker && (
        <div className="pt-2 border-t border-border space-y-1.5">
          {marker.paired_marker_id != null ? (
            <>
              <div className="text-xs text-muted-foreground">
                Linked to: <span className="text-foreground">{marker.paired_map_name} — {marker.paired_label}</span>
              </div>
              <button onClick={handleUnlink} className="text-xs py-1 px-2 rounded bg-muted hover:bg-muted/70">
                Unlink
              </button>
            </>
          ) : (
            <>
              <label className="text-xs text-muted-foreground">Link to…</label>
              <FilterDropdown
                label="Pick unlinked connection"
                options={unlinked.map(u => ({ value: String(u.id), label: `${u.map_name} — ${u.label}` }))}
                selected={[]}
                onChange={(sel) => { if (sel[0]) handleLink(Number(sel[0])); }}
                multiSelect={false}
              />
              {unlinked.length === 0 && (
                <div className="text-xs text-muted-foreground italic">No other unlinked connection markers for this game.</div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        {mode === 'create' ? (
          isPairCreate ? (
            <button
              onClick={() => onRequestPairPlacement!({ labelA: label.trim(), labelB: labelB.trim(), description: description.trim() || undefined })}
              disabled={!label.trim() || !labelB.trim()}
              className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              Place pair → click A, then B
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!label.trim() || !pendingPosition}
              className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              {pendingPosition ? 'Create' : 'Click map to place first'}
            </button>
          )
        ) : (
          <>
            {onRequestMove && (
              <button
                onClick={onRequestMove}
                className="text-xs py-1 px-2 rounded bg-muted hover:bg-muted/70"
                title="Click a new spot on the map to reposition this marker"
              >
                Move
              </button>
            )}
            <button
              onClick={handleDelete}
              className="text-xs py-1 px-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
