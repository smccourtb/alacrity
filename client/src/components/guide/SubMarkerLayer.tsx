import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { createSubMarkerIcon, type SubMarkerType } from './SubMarkerIcon';
import type { FilterState } from './FilterPills';

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
}

interface SubMarkerLayerProps {
  markers: SubMarkerData[];
  mapWidth: number;
  mapHeight: number;
  filters: FilterState;
  flagReport: any | null;
  onMarkerClick: (marker: SubMarkerData) => void;
}

export default function SubMarkerLayer({
  markers,
  mapWidth,
  mapHeight,
  filters,
  flagReport,
  onMarkerClick,
}: SubMarkerLayerProps) {
  const visible = useMemo(() => {
    return markers.filter(m => {
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
        const isCompleted = m.flag_index != null && m.location_key &&
          flagReport?.flags_by_location?.[m.location_key]?.flags?.some(
            (f: any) => f.index === m.flag_index && f.set
          );

        const icon = createSubMarkerIcon({
          markerType: m.marker_type,
          completed: !!isCompleted,
        });

        const coordX = m.x * mapWidth;
        const coordY = m.y * mapHeight;

        return (
          <Marker
            key={`sub-${m.id}`}
            position={L.latLng(-coordY, coordX)}
            icon={icon}
            eventHandlers={{ click: () => onMarkerClick(m) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="max-w-[240px]">
                <div className="font-medium">{m.name}{isCompleted ? ' ✓' : ''}</div>
                {m.description && (
                  <div className="text-xs opacity-80 whitespace-normal mt-0.5">{m.description}</div>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
