import { memo, useMemo } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import RichText from './RichText';
import { markerSpriteUrl } from './spriteUrl';

export interface CustomMarker {
  id: number;
  natural_id?: string;
  name: string;           // = label
  detail: string | null;  // = description
  method: string;         // = marker_type ('connection' | 'note' | 'building' | 'poi')
  x: number;
  y: number;
  paired_marker_id?: number | null;
  paired_x?: number | null;
  paired_y?: number | null;
  paired_label?: string | null;
  paired_map_key?: string | null;
  paired_map_name?: string | null;
  sprite_kind?: 'item' | 'pokemon' | null;
  sprite_ref?: string | null;
}

interface Props {
  markers: CustomMarker[];
  mapWidth: number;
  mapHeight: number;
  onMarkerClick: (m: CustomMarker) => void;
  onMarkerContextMenu?: (m: CustomMarker, e: L.LeafletMouseEvent) => void;
  typeFilters?: Partial<Record<'connection' | 'note' | 'building' | 'poi', boolean>>;
  pinnedMarkerKey?: string | null;
  // Custom marker ids hidden because they're a cluster primary or hidden member.
  hiddenIds?: Set<number>;
  // When set, draws a blue active-ring on this marker — used to show the
  // user which custom marker is armed for a Move (next map click repositions it).
  activeId?: number | null;
}

const TYPE_COLOR: Record<string, string> = {
  connection: '#60a5fa',
  note: '#fbbf24',
  building: '#a78bfa',
  poi: '#f472b6',
};

const TYPE_GLYPH: Record<string, string> = {
  connection: '<path d="M4 8 L12 8 M4 8 L6 6 M4 8 L6 10 M12 8 L10 6 M12 8 L10 10" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
  note: '<path d="M6 5.5 Q8 4.5 10 5.5 Q10 8 8 9 L8 10 M8 11.5 L8 11.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
  building: '<path d="M4 11 L4 6 L8 4 L12 6 L12 11 Z M7 11 L7 8 L9 8 L9 11" stroke="#fff" stroke-width="1.2" fill="none" stroke-linejoin="round"/>',
  poi: '<circle cx="8" cy="8" r="2.5" fill="#fff"/>',
};

function makeIcon(m: CustomMarker, active = false) {
  const ring = active
    ? `<span style="position:absolute;inset:-4px;border:2px solid #3b82f6;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px rgba(59,130,246,0.25);box-sizing:border-box"></span>`
    : '';
  const url = markerSpriteUrl(m.sprite_kind, m.sprite_ref);
  if (url) {
    return L.divIcon({
      html: `<div class="custom-marker-sprite" style="position:relative">${ring}<img src="${url}" alt="" /></div>`,
      className: 'marker-icon custom-marker-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }
  const color = TYPE_COLOR[m.method] ?? '#f472b6';
  const glyph = TYPE_GLYPH[m.method] ?? TYPE_GLYPH.poi;
  const svg = `<svg viewBox="0 0 16 16" width="20" height="20" style="overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
    <circle cx="8" cy="8" r="8" fill="${color}" stroke="#fff" stroke-width="1.25"/>
    ${glyph}
  </svg>`;
  // Wrap SVG in a 20x20 relative box so the ring can absolute-position around
  // it without shifting the SVG's centering.
  return L.divIcon({
    html: `<div style="position:relative;width:20px;height:20px;display:block">${ring}${svg}</div>`,
    className: 'marker-icon custom-marker-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function CustomMarkerLayer({ markers, mapWidth, mapHeight, onMarkerClick, onMarkerContextMenu, typeFilters, pinnedMarkerKey, hiddenIds, activeId }: Props) {
  const connectionLines = markers.flatMap(m => {
    if (m.method !== 'connection') return [];
    if (typeFilters && typeFilters.connection === false) return [];
    if (m.paired_marker_id == null || m.paired_x == null || m.paired_y == null) return [];
    // Only draw once per pair: whichever id is lower owns the line
    if (m.paired_marker_id < m.id) return [];
    return [{
      id: m.id,
      a: L.latLng(-m.y * mapHeight, m.x * mapWidth),
      b: L.latLng(-m.paired_y * mapHeight, m.paired_x * mapWidth),
    }];
  });

  return (
    <>
      {connectionLines.map(line => (
        <Polyline
          key={`line-${line.id}`}
          positions={[line.a, line.b]}
          pathOptions={{ color: TYPE_COLOR.connection, weight: 2, opacity: 0.6, dashArray: '6 4' }}
        />
      ))}
      {markers.map(m => {
        if (hiddenIds?.has(m.id)) return null;
        if (typeFilters && typeFilters[m.method as 'connection' | 'note' | 'building' | 'poi'] === false) return null;
        return (
          <CustomMarkerItem
            key={`custom-${m.id}`}
            m={m}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            pinned={pinnedMarkerKey === `custom:${m.id}`}
            active={activeId === m.id}
            onMarkerClick={onMarkerClick}
            onMarkerContextMenu={onMarkerContextMenu}
          />
        );
      })}
    </>
  );
}

interface CustomItemProps {
  m: CustomMarker;
  mapWidth: number;
  mapHeight: number;
  pinned: boolean;
  active?: boolean;
  onMarkerClick: (m: CustomMarker) => void;
  onMarkerContextMenu?: (m: CustomMarker, e: L.LeafletMouseEvent) => void;
}

// Memoized for the same reason as SubMarkerItem — stable icon + position refs
// prevent react-leaflet from calling setIcon on every parent re-render, which
// otherwise rebuilds the marker DOM post-zoomend and loses the zoom-animation
// class, leaving the node hidden.
const CustomMarkerItem = memo(function CustomMarkerItem({
  m, mapWidth, mapHeight, pinned, active, onMarkerClick, onMarkerContextMenu,
}: CustomItemProps) {
  const icon = useMemo(() => makeIcon(m, !!active), [m.method, m.sprite_kind, m.sprite_ref, active]);
  const position = useMemo(
    () => L.latLng(-m.y * mapHeight, m.x * mapWidth),
    [m.x, m.y, mapWidth, mapHeight]
  );
  const eventHandlers = useMemo(
    () => ({
      click: () => onMarkerClick(m),
      contextmenu: (e: L.LeafletMouseEvent) => {
        L.DomEvent.preventDefault(e.originalEvent);
        onMarkerContextMenu?.(m, e);
      },
    }),
    [m, onMarkerClick, onMarkerContextMenu]
  );

  const isConnection = m.method === 'connection';
  const linked = isConnection && m.paired_marker_id != null;
  const tooltipSub = isConnection && !linked ? 'unlinked connection' : m.detail;

  return (
    <Marker position={position} icon={icon} eventHandlers={eventHandlers}>
      <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={pinned} className="guide-marker-tooltip">
        <div className="font-medium"><RichText text={m.name} /></div>
        {tooltipSub && (
          <div className="text-xs opacity-80 mt-0.5 leading-snug"><RichText text={tooltipSub} /></div>
        )}
      </Tooltip>
    </Marker>
  );
});
