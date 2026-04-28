import { useMemo, useState } from 'react';

interface Props {
  locations: Array<{ id: number; display_name: string; location_key: string }>;
  markers: Array<{ marker_type: string; reference_id: number; name: string; location_id: number | null }>;
  position: { x: number; y: number };
  onCancel: () => void;
  onConfirm: (p: {
    scope_location_id: number;
    primary_marker_type: string;
    primary_reference_id: number;
    hide_members: boolean;
  }) => void;
}

export default function LocationPinModal({ locations, markers, position, onCancel, onConfirm }: Props) {
  const [locId, setLocId] = useState<number | null>(null);
  const [primary, setPrimary] = useState<{ marker_type: string; reference_id: number } | null>(null);
  const [hideMembers, setHideMembers] = useState(true);
  const candidates = useMemo(() =>
    locId == null ? [] : markers.filter(m => m.location_id === locId), [locId, markers]);

  return (
    <div className="absolute inset-0 z-[2000] bg-black/40 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-card border border-border rounded-lg p-4 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="font-semibold mb-2 text-sm">New location pin</div>
        <div className="text-xs text-muted-foreground mb-3">
          Position: {position.x.toFixed(3)}, {position.y.toFixed(3)}
        </div>
        <label className="block text-xs mb-2">
          Location
          <select value={locId ?? ''} onChange={e => { setLocId(Number(e.target.value) || null); setPrimary(null); }}
                  className="w-full mt-1 p-1 border border-border rounded bg-background text-sm">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.display_name}</option>)}
          </select>
        </label>
        <label className="block text-xs mb-2">
          Primary sub-marker
          <select
            value={primary ? `${primary.marker_type}:${primary.reference_id}` : ''}
            onChange={e => {
              const [t, id] = e.target.value.split(':');
              setPrimary(t && id ? { marker_type: t, reference_id: Number(id) } : null);
            }}
            className="w-full mt-1 p-1 border border-border rounded bg-background text-sm"
            disabled={!locId}
          >
            <option value="">—</option>
            {candidates.map(c => (
              <option key={`${c.marker_type}:${c.reference_id}`} value={`${c.marker_type}:${c.reference_id}`}>
                [{c.marker_type}] {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={hideMembers} onChange={e => setHideMembers(e.target.checked)} />
          Hide members (only the aggregate pin renders)
        </label>
        <div className="flex justify-end gap-2">
          <button className="text-xs px-2 py-1" onClick={onCancel}>Cancel</button>
          <button
            disabled={!locId || !primary}
            onClick={() => locId && primary && onConfirm({
              scope_location_id: locId,
              primary_marker_type: primary.marker_type,
              primary_reference_id: primary.reference_id,
              hide_members: hideMembers,
            })}
            className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
