import { Popup } from 'react-leaflet';
import L from 'leaflet';
import type { ClusterData } from './ClusterMarker';
import type { SubMarkerData } from './SubMarkerLayer';
import { SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';
import { prettifyMarkerDetail } from '@/lib/marker-labels';
import RichText from './RichText';

interface Props {
  cluster: ClusterData;
  mapWidth: number;
  mapHeight: number;
  markerById: Map<string, SubMarkerData>;
  onRowClick: (member: SubMarkerData) => void;
  onClose: () => void;
  // When the cluster primary is a custom marker, this opens the custom-marker
  // editor (Move/Delete/etc). Omit to hide the edit affordance.
  onEditPrimary?: (primary: SubMarkerData) => void;
}

function summaryForRow(m: SubMarkerData): string {
  // Mirror the guide sidebar's Badge text — just the prettified detail/method
  // for items/TMs/events/trainers. Fall back only when there's no detail.
  if ((m.marker_type as string) === 'shop') return 'Shop';
  if ((m.marker_type as string) === 'custom') return prettifyMarkerDetail((m as any).method);
  return prettifyMarkerDetail(m.detail);
}

// Inline badge matching the marker on the map: sprite override when set, else
// a small colored shape that mirrors SubMarkerIcon's vocabulary.
function RowIcon({ m }: { m: SubMarkerData }) {
  const base = m.sprite_kind === 'pokemon' ? 'pokemon' : m.sprite_kind === 'item' ? 'items' : null;
  if (base && m.sprite_ref) {
    return (
      <img
        src={`/sprites/${base}/${m.sprite_ref}`}
        alt=""
        className="w-5 h-5 shrink-0 object-contain"
      />
    );
  }
  const type = m.marker_type as SubMarkerType;
  const fill = SUB_MARKER_COLORS[type] ?? '#94a3b8';
  const shape: Record<string, string> = {
    item: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
    hidden_item: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 1.5"/>`,
    trainer: `<rect x="3" y="3" width="10" height="10" rx="2.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
    tm: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/><text x="8" y="10.5" text-anchor="middle" font-size="5.5" fill="#fff" font-weight="bold" font-family="system-ui">TM</text>`,
    event: `<polygon points="8,1.5 9.8,5.8 14.5,5.8 10.7,8.7 12.2,13.5 8,10.8 3.8,13.5 5.3,8.7 1.5,5.8 6.2,5.8" fill="${fill}" stroke="#fff" stroke-width="0.8"/>`,
    shop: `<path d="M3 6 L3 13 L13 13 L13 6 Z M3 6 L4.5 3 L11.5 3 L13 6 Z" fill="${fill}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`,
  };
  return (
    <span
      className="shrink-0"
      style={{ width: 20, height: 20, display: 'inline-block' }}
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 16 16" width="20" height="20">${shape[type] ?? shape.item}</svg>`,
      }}
    />
  );
}

export default function ClusterPopover({ cluster, mapWidth, mapHeight, markerById, onRowClick, onClose, onEditPrimary }: Props) {
  const coordX = cluster.x * mapWidth;
  const coordY = cluster.y * mapHeight;

  return (
    <Popup
      position={L.latLng(-coordY, coordX)}
      eventHandlers={{ remove: onClose }}
      className="cluster-popover"
      maxWidth={260}
    >
      <div className="py-1">
        {(() => {
          const primary = markerById.get(`${cluster.primary.marker_type}:${cluster.primary.reference_id}`);
          if (!primary) return null;
          const canEdit = onEditPrimary && (primary.marker_type as string) === 'custom';
          return (
            <div className="px-2 py-1.5 flex items-center gap-2 border-b border-border">
              <RowIcon m={primary} />
              <span className="font-bold text-sm truncate flex-1">{primary.name}</span>
              {canEdit && (
                <button
                  onClick={() => onEditPrimary!(primary)}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          );
        })()}
        {cluster.member_ids
          .filter(mid => !(mid.marker_type === cluster.primary.marker_type && mid.reference_id === cluster.primary.reference_id))
          .map(mid => {
          const m = markerById.get(`${mid.marker_type}:${mid.reference_id}`);
          if (!m) return null;
          return (
            <button
              key={`${mid.marker_type}:${mid.reference_id}`}
              onClick={() => onRowClick(m)}
              className="w-full text-left px-2 py-1 hover:bg-muted/30 flex items-center gap-2 text-sm"
            >
              <RowIcon m={m} />
              <span className="font-medium truncate flex-1"><RichText text={m.name} /></span>
              <span className="text-xs text-muted-foreground">{summaryForRow(m)}</span>
            </button>
          );
        })}
      </div>
    </Popup>
  );
}
