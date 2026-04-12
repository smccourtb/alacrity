import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/api/client';
import { SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';
import FilterDropdown from '@/components/FilterDropdown';

interface PlaceableItem {
  id: number;
  type: SubMarkerType;
  name: string;
  detail: string | null;
  location_key: string;
  placed: boolean;
  markerId?: number;
  x?: number;
  y?: number;
}

interface SubMarkerCalibrationProps {
  mapKey: string;
  game: string;
  locations: any[];
  existingMarkers: any[];
  onClose: () => void;
  mapWidth: number;
  mapHeight: number;
  activeItem: PlaceableItem | null;
  onSelectItem: (item: PlaceableItem | null) => void;
  selectedLocationKey?: string;
  onLocationKeyChange?: (key: string) => void;
}

export type { PlaceableItem };

export default function SubMarkerCalibration({
  mapKey, game, locations, existingMarkers, onClose,
  mapWidth, mapHeight, activeItem, onSelectItem,
  selectedLocationKey, onLocationKeyChange,
}: SubMarkerCalibrationProps) {
  const [internalLocation, setInternalLocation] = useState<string>('');
  const selectedLocation = selectedLocationKey ?? internalLocation;
  const setSelectedLocation = (key: string) => {
    if (onLocationKeyChange) onLocationKeyChange(key);
    else setInternalLocation(key);
  };
  const activeCalibRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<PlaceableItem[]>([]);
  const [filter, setFilter] = useState<SubMarkerType | 'all'>('all');

  // Load location detail when location changes
  useEffect(() => {
    if (!selectedLocation) { setItems([]); return; }
    const loc = locations.find((l: any) => l.location_key === selectedLocation);
    if (!loc) return;

    api.guide.locationDetail(loc.id, game).then(data => {
      const placeable: PlaceableItem[] = [];

      for (const item of data.items) {
        const type: SubMarkerType = item.method === 'hidden' ? 'hidden_item' : 'item';
        const existing = existingMarkers.find(m => m.marker_type === type && m.reference_id === item.id);
        placeable.push({
          id: item.id, type, name: item.item_name, detail: item.method,
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const t of data.trainers) {
        const existing = existingMarkers.find(m => m.marker_type === 'trainer' && m.reference_id === t.id);
        placeable.push({
          id: t.id, type: 'trainer', name: t.trainer_name, detail: t.trainer_class,
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const tm of data.tms) {
        const existing = existingMarkers.find(m => m.marker_type === 'tm' && m.reference_id === tm.id);
        placeable.push({
          id: tm.id, type: 'tm', name: `${tm.tm_number} ${tm.move_name}`, detail: tm.method,
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const evt of data.events) {
        const existing = existingMarkers.find(m => m.marker_type === 'event' && m.reference_id === evt.id);
        placeable.push({
          id: evt.id, type: 'event', name: evt.event_name, detail: evt.event_type,
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }

      setItems(placeable);
    });
  }, [selectedLocation, game, locations, existingMarkers]);

  // Scroll active item into view when it changes
  useEffect(() => {
    if (activeItem && activeCalibRef.current) {
      activeCalibRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeItem]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => i.type === filter);
  }, [items, filter]);

  const placedCount = items.filter(i => i.placed).length;

  function nextUnplaced() {
    const next = filtered.find(i => !i.placed && i !== activeItem);
    if (next) onSelectItem(next);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm">Calibration</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>

        <div className="mb-2">
          <FilterDropdown
            label="Select location..."
            options={locations.map((l: any) => ({ value: l.location_key, label: l.display_name }))}
            selected={selectedLocation ? [selectedLocation] : []}
            onChange={(sel) => { setSelectedLocation(sel[0] ?? ''); onSelectItem(null); }}
            multiSelect={false}
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'item', 'hidden_item', 'trainer', 'tm', 'event'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-2xs px-1.5 py-0.5 rounded ${filter === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            >
              {t === 'all' ? 'All' : t === 'hidden_item' ? 'Hidden' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {items.length > 0 && (
            <span className="text-2xs text-muted-foreground ml-auto">{placedCount}/{items.length}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(item => {
          const isActive = activeItem?.id === item.id && activeItem?.type === item.type;
          return (
            <button
              key={`${item.type}-${item.id}`}
              ref={isActive ? activeCalibRef : undefined}
              onClick={() => onSelectItem(isActive ? null : item)}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border/50 transition-colors ${
                isActive ? 'bg-orange-500/15 border-l-2 border-l-orange-500' :
                item.placed ? 'opacity-50' : 'hover:bg-muted/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{
                background: item.placed ? '#4ade80' : isActive ? '#f97316' : SUB_MARKER_COLORS[item.type],
              }} />
              <span className="flex-1 min-w-0 truncate">{item.name}</span>
              {item.detail && (
                <span className="text-2xs text-muted-foreground">{item.detail}</span>
              )}
              {item.placed && <span className="text-2xs text-green-500">✓</span>}
              {isActive && !item.placed && (
                <span className="text-2xs text-orange-400">click map →</span>
              )}
            </button>
          );
        })}
        {selectedLocation && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground p-4 text-center">No items for this location</p>
        )}
      </div>

      <div className="p-2 border-t border-border flex gap-2">
        {selectedLocation && items.length > 0 && (
          <button
            onClick={nextUnplaced}
            className="flex-1 text-xs py-1 bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            Next unplaced
          </button>
        )}
        <button
          onClick={() => window.open(`/api/guide/markers/${mapKey}/export`, '_blank')}
          className="flex-1 text-xs py-1 bg-muted rounded text-muted-foreground hover:text-foreground"
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}
