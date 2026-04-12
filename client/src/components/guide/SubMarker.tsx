import { CircleMarker, Tooltip } from 'react-leaflet';
import type { SubMarker as SubMarkerData } from '@/api/client';

const TYPE_COLORS: Record<string, string> = {
  trainer: '#ef4444',
  item: '#f59e0b',
  'item-hidden': '#06b6d4',
  tm: '#8b5cf6',
  event: '#10b981',
  custom: '#94a3b8',
};

const TYPE_LABELS: Record<string, string> = {
  trainer: '⚔',
  item: '●',
  'item-hidden': '◉',
  tm: 'TM',
  event: '★',
  custom: '📌',
};

function getSubMarkerColor(marker: SubMarkerData): string {
  if (marker.type === 'item' && marker.method === 'hidden') return TYPE_COLORS['item-hidden'];
  return TYPE_COLORS[marker.type] ?? TYPE_COLORS.custom;
}

function getSubMarkerLabel(marker: SubMarkerData): string {
  if (marker.type === 'item' && marker.method === 'hidden') return TYPE_LABELS['item-hidden'];
  return TYPE_LABELS[marker.type] ?? TYPE_LABELS.custom;
}

interface SubMarkerProps {
  marker: SubMarkerData;
  mapWidth: number;
  mapHeight: number;
  active?: boolean;
  onClick?: () => void;
}

export default function SubMarker({ marker, mapWidth, mapHeight, active, onClick }: SubMarkerProps) {
  if (marker.x == null || marker.y == null) return null;

  const pixelX = marker.x * mapWidth;
  const pixelY = marker.y * mapHeight;
  const color = getSubMarkerColor(marker);

  return (
    <CircleMarker
      center={[-pixelY, pixelX]}
      radius={active ? 8 : 5}
      pathOptions={{
        fillColor: active ? '#3b82f6' : color,
        fillOpacity: 0.9,
        color: active ? '#fff' : color,
        weight: active ? 2 : 1,
      }}
      eventHandlers={onClick ? { click: onClick } : {}}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        <span style={{ color }}>{getSubMarkerLabel(marker)}</span>{' '}
        <strong>{marker.name}</strong>
        {marker.location_name && <div className="text-xs opacity-75">{marker.location_name}</div>}
        {marker.detail && <div className="text-xs opacity-60">{marker.detail}</div>}
      </Tooltip>
    </CircleMarker>
  );
}

export { TYPE_COLORS, TYPE_LABELS, getSubMarkerColor, getSubMarkerLabel };
