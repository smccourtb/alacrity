import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { createSubMarkerIcon, type SubMarkerType } from './SubMarkerIcon';
import RichText from './RichText';
import { markerSpriteUrl } from './spriteUrl';

export interface ClusterData {
  id: number;
  kind: 'proximity' | 'location_aggregate';
  x: number;
  y: number;
  primary: { marker_type: string; reference_id: number };
  member_ids: Array<{ marker_type: string; reference_id: number }>;
  hide_members: boolean;
  count: number;
}

interface Props {
  cluster: ClusterData;
  mapWidth: number;
  mapHeight: number;
  primaryMarker?: { sprite_kind?: string | null; sprite_ref?: string | null; marker_type: string; name?: string };
  onClick: (cluster: ClusterData) => void;
  onContextMenu?: (cluster: ClusterData) => void;
}

export default function ClusterMarker({ cluster, mapWidth, mapHeight, primaryMarker, onClick, onContextMenu }: Props) {
  const extras = Math.max(0, cluster.count - 1);
  const coordX = cluster.x * mapWidth;
  const coordY = cluster.y * mapHeight;

  const primaryType = primaryMarker?.marker_type ?? cluster.primary.marker_type;
  const spriteUrl = markerSpriteUrl(primaryMarker?.sprite_kind, primaryMarker?.sprite_ref);
  const baseIcon = spriteUrl
    ? `<div class="custom-marker-sprite"><img src="${spriteUrl}" alt="" /></div>`
    : primaryType === 'custom'
      ? `<svg viewBox="0 0 16 16" width="20" height="20" style="overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
           <circle cx="8" cy="8" r="8" fill="#f472b6" stroke="#fff" stroke-width="1.25"/>
           <circle cx="8" cy="8" r="2.5" fill="#fff"/>
         </svg>`
      : createSubMarkerIcon({
          markerType: primaryType as SubMarkerType,
          completed: false,
        }).options.html as string;

  const badge = extras > 0
    ? `<div class="cluster-badge" style="
         position:absolute; bottom:0; right:0;
         transform:translate(50%, 50%);
         background:#111; color:#fff; font-size:10px; font-weight:700;
         min-width:16px; height:16px; padding:0 4px;
         border-radius:8px; border:1.5px solid #fff;
         display:flex; align-items:center; justify-content:center;
         box-shadow:0 1px 2px rgba(0,0,0,0.4);
       ">+${extras}</div>`
    : '';

  // Sprite-backed primaries render at 32px (the native PokéAPI sprite size);
  // SVG/shape primaries are 20px. Sizing/anchor matches the inner content so
  // the +N badge sits on the icon's lower-right corner either way.
  const isSprite = !!spriteUrl;
  const size = isSprite ? 32 : 20;

  const icon = L.divIcon({
    html: `<div style="position:relative; display:inline-block; width:${size}px; height:${size}px">${baseIcon}${badge}</div>`,
    className: 'marker-icon sub-marker-icon cluster-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return (
    <Marker
      position={L.latLng(-coordY, coordX)}
      icon={icon}
      eventHandlers={{
        click: () => onClick(cluster),
        contextmenu: (e: L.LeafletMouseEvent) => {
          L.DomEvent.preventDefault(e.originalEvent);
          onContextMenu?.(cluster);
        },
      }}
    >
      {primaryMarker?.name && (
        <Tooltip direction="top" offset={[0, -10]} opacity={1} className="guide-marker-tooltip">
          <div className="font-medium"><RichText text={primaryMarker.name} /></div>
        </Tooltip>
      )}
    </Marker>
  );
}
