import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { createMarkerIcon } from './MarkerIcon';

export type MarkerStatus = 'complete' | 'current' | 'partial' | 'upcoming' | 'unavailable';

interface MapMarkerProps {
  x: number;
  y: number;
  name: string;
  status: MarkerStatus;
  onClick: () => void;
  children?: React.ReactNode;
  dimmed?: boolean;
  active?: boolean;
  highlighted?: boolean;
  saveCount?: number;
  locationType?: string;
  badge?: { done: number; total: number } | null;
}

const STATUS_COLORS: Record<MarkerStatus, string> = {
  complete: '#22c55e',
  current: '#ef4444',
  partial: '#fb923c',
  upcoming: '#94a3b8',
  unavailable: '#475569',
};

export default function MapMarker({ x, y, name, status, onClick, children, dimmed, active, highlighted, saveCount, locationType = 'city', badge }: MapMarkerProps) {
  const color = active ? '#3b82f6' : highlighted ? '#facc15' : STATUS_COLORS[status];
  const opacity = dimmed ? 0.2 : status === 'unavailable' ? 0.3 : 0.9;

  const icon = createMarkerIcon({ locationType, color, opacity, active, highlighted, badge });

  return (
    <Marker
      position={L.latLng(-y, x)}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        {name}{saveCount && saveCount > 0 ? ` 💾 ${saveCount}` : ''}
      </Tooltip>
      {children}
    </Marker>
  );
}
