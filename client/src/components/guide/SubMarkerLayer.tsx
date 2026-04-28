import { memo, useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { createSubMarkerIcon, SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';
import type { FilterState } from './FilterPills';
import { prettifyMarkerDetail } from '@/lib/marker-labels';
import RichText from './RichText';
import { markerSpriteUrl } from './spriteUrl';

export interface SubMarkerData {
  id: number;
  marker_type: SubMarkerType;
  reference_id: number;
  x: number;
  y: number;
  name: string;
  detail: string | null;
  description: string | null;
  flag_index: number | null;
  location_id: number | null;
  location_key: string | null;
  sprite_kind?: 'item' | 'pokemon' | null;
  sprite_ref?: string | null;
  // Shops only: inventory with per-game filtering already applied server-side.
  inventory?: Array<{ item_name: string; price: number | null; badge_gate: number; sprite_path?: string | null; notes?: string | null }>;
}

interface SubMarkerLayerProps {
  markers: SubMarkerData[];
  mapWidth: number;
  mapHeight: number;
  filters: FilterState;
  flagReport: any | null;
  onMarkerClick: (marker: SubMarkerData) => void;
  pinnedMarkerKey?: string | null;
  onMarkerContextMenu?: (m: SubMarkerData, e: L.LeafletMouseEvent) => void;
  // `${marker_type}:${reference_id}` of the marker currently selected for
  // repositioning in calibration mode. Renders a blue active-ring.
  activeKey?: string | null;
}

export default function SubMarkerLayer({
  markers,
  mapWidth,
  mapHeight,
  filters,
  flagReport,
  onMarkerClick,
  pinnedMarkerKey,
  onMarkerContextMenu,
  activeKey,
}: SubMarkerLayerProps) {
  const visible = useMemo(() => {
    return markers.filter(m => {
      if ((m.marker_type as string) === 'custom') return false;
      if (!filters[m.marker_type]) return false;

      if (filters.hideDone && m.flag_index != null && m.location_key) {
        const locFlags = flagReport?.flags_by_location?.[m.location_key];
        if (locFlags?.flags?.some((f: any) => f.index === m.flag_index && f.set)) {
          return false;
        }
      }

      return true;
    });
  }, [markers, filters, flagReport]);

  return (
    <>
      {visible.map(m => {
        const isCompleted = !!(m.flag_index != null && m.location_key &&
          flagReport?.flags_by_location?.[m.location_key]?.flags?.some(
            (f: any) => f.index === m.flag_index && f.set
          ));
        const pinned = pinnedMarkerKey === `sub:${m.marker_type}:${m.reference_id}`;
        const active = activeKey === `${m.marker_type}:${m.reference_id}`;

        return (
          <SubMarkerItem
            key={`sub-${m.id}`}
            m={m}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            isCompleted={isCompleted}
            pinned={pinned}
            active={active}
            onMarkerClick={onMarkerClick}
            onMarkerContextMenu={onMarkerContextMenu}
          />
        );
      })}
    </>
  );
}

interface ItemProps {
  m: SubMarkerData;
  mapWidth: number;
  mapHeight: number;
  isCompleted: boolean;
  pinned: boolean;
  active?: boolean;
  onMarkerClick: (marker: SubMarkerData) => void;
  onMarkerContextMenu?: (m: SubMarkerData, e: L.LeafletMouseEvent) => void;
}

// Icons and latLng are memoized so `setIcon` / `setLatLng` don't fire on every
// parent re-render (e.g. zoomend -> setZoom -> Guide re-render). When those
// fire mid-zoom-animation, Leaflet re-inits the marker DOM without the
// `leaflet-zoom-animated` class — the new node lands with `leaflet-zoom-hide`
// (visibility: hidden) and the marker disappears after the animation settles.
const SubMarkerItem = memo(function SubMarkerItem({
  m, mapWidth, mapHeight, isCompleted, pinned, active, onMarkerClick, onMarkerContextMenu,
}: ItemProps) {
  const icon = useMemo(() => {
    const url = markerSpriteUrl(m.sprite_kind, m.sprite_ref);
    if (url) {
      const ring = active
        ? `<span style="position:absolute;inset:-4px;border:2px solid #3b82f6;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px rgba(59,130,246,0.25)"></span>`
        : '';
      return L.divIcon({
        html: `<div class="custom-marker-sprite" style="position:relative">${ring}<img src="${url}" alt="" /></div>`,
        className: 'marker-icon sub-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }
    return createSubMarkerIcon({ markerType: m.marker_type, completed: isCompleted, active });
  }, [m.sprite_kind, m.sprite_ref, m.marker_type, isCompleted, active]);

  const position = useMemo(
    () => L.latLng(-m.y * mapHeight, m.x * mapWidth),
    [m.x, m.y, mapWidth, mapHeight]
  );

  const eventHandlers = useMemo(() => ({
    click: () => onMarkerClick(m),
    contextmenu: (e: L.LeafletMouseEvent) => {
      (e.originalEvent as MouseEvent).preventDefault();
      onMarkerContextMenu?.(m, e);
    },
  }), [m, onMarkerClick, onMarkerContextMenu]);

  return (
    <Marker position={position} icon={icon} eventHandlers={eventHandlers}>
      <Tooltip
        direction="top"
        offset={[0, -6]}
        opacity={1}
        permanent={pinned}
        className="guide-marker-tooltip"
      >
        <MarkerTooltipBody m={m} isCompleted={isCompleted} />
      </Tooltip>
    </Marker>
  );
});

// Compact, shared tooltip body styled after ClusterPopover: bold header row
// (marker icon + name), optional description, and an itemized list for shops.
function MarkerTooltipBody({ m, isCompleted }: { m: SubMarkerData; isCompleted: boolean }) {
  const summary = m.marker_type === 'shop'
    ? 'Shop'
    : prettifyMarkerDetail(m.detail);
  return (
    <div className="min-w-[160px]">
      <div className="flex items-center gap-2 pb-1 border-b border-border/60">
        <TooltipIcon m={m} />
        <span className="font-bold flex-1 leading-tight">
          {m.name}{isCompleted ? ' ✓' : ''}
        </span>
        {summary && (
          <span className="text-[10px] opacity-70 shrink-0">{summary}</span>
        )}
      </div>
      {m.description && (
        <div className="text-xs opacity-80 mt-1 leading-snug"><RichText text={m.description} /></div>
      )}
      {m.marker_type === 'shop' && m.inventory && m.inventory.length > 0 && (
        <ul className="text-xs mt-1 divide-y divide-border/40">
          {m.inventory.map((inv, idx) => (
            <li key={`inv-${idx}`} className="flex items-center gap-2 py-1">
              {inv.sprite_path ? (
                <img
                  src={inv.sprite_path}
                  alt=""
                  className="w-4 h-4 shrink-0 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span
                  className="shrink-0"
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: SUB_MARKER_COLORS.item,
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                />
              )}
              <span className="flex-1">
                <span>{inv.item_name}</span>
                {inv.badge_gate > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">· Badge {inv.badge_gate}</span>
                )}
                {inv.notes && (
                  <div className="text-[10px] opacity-60 leading-tight">{inv.notes}</div>
                )}
              </span>
              {inv.price != null && (
                <span className="tabular-nums opacity-90">¥{inv.price.toLocaleString()}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TooltipIcon({ m }: { m: SubMarkerData }) {
  const base = m.sprite_kind === 'pokemon' ? 'pokemon' : m.sprite_kind === 'item' ? 'items' : null;
  if (base && m.sprite_ref) {
    return (
      <img
        src={`/sprites/${base}/${m.sprite_ref}`}
        alt=""
        className="w-5 h-5 shrink-0 object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  const fill = SUB_MARKER_COLORS[m.marker_type as SubMarkerType] ?? '#94a3b8';
  const shapes: Record<string, string> = {
    item: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
    hidden_item: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 1.5"/>`,
    trainer: `<rect x="3" y="3" width="10" height="10" rx="2.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
    tm: `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/><text x="8" y="10.5" text-anchor="middle" font-size="5.5" fill="#fff" font-weight="bold" font-family="system-ui">TM</text>`,
    event: `<polygon points="8,1.5 9.8,5.8 14.5,5.8 10.7,8.7 12.2,13.5 8,10.8 3.8,13.5 5.3,8.7 1.5,5.8 6.2,5.8" fill="${fill}" stroke="#fff" stroke-width="0.8"/>`,
    shop: `<path d="M3 6 L3 13 L13 13 L13 6 Z M3 6 L4.5 3 L11.5 3 L13 6 Z" fill="${fill}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`,
  };
  return (
    <span
      className="shrink-0 inline-block"
      style={{ width: 18, height: 18 }}
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 16 16" width="18" height="18">${shapes[m.marker_type as string] ?? shapes.item}</svg>`,
      }}
    />
  );
}
