import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPinPlus, ImageIcon } from 'lucide-react';
import { api } from '@/api/client';
import { SUB_MARKER_COLORS, type SubMarkerType } from './SubMarkerIcon';
import FilterDropdown from '@/components/FilterDropdown';
import InlineNotes from './InlineNotes';
import ItemPickerModal from './ItemPickerModal';
import { prettifyMarkerDetail } from '@/lib/marker-labels';

interface PlaceableItem {
  id: number;
  type: SubMarkerType;
  name: string;
  detail: string | null;
  description: string;
  location_key: string;
  placed: boolean;
  markerId?: number;
  x?: number;
  y?: number;
  // Shops expose their inventory here so the sidebar can preview items/prices
  // without forcing the user to click away from calibration.
  inventory?: Array<{ item_name: string; price: number | null; badge_gate: number; sprite_path?: string | null; notes?: string | null }>;
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
  creatingCustom?: boolean;
  onStartCreateCustom?: () => void;
  onOverridesChanged?: () => void;
  placingLocationPin?: boolean;
  onStartNewLocationPin?: () => void;
}

export type { PlaceableItem };

export default function SubMarkerCalibration({
  mapKey, game, locations, existingMarkers, onClose,
  mapWidth, mapHeight, activeItem, onSelectItem,
  selectedLocationKey, onLocationKeyChange,
  creatingCustom, onStartCreateCustom,
  onOverridesChanged, placingLocationPin, onStartNewLocationPin,
}: SubMarkerCalibrationProps) {
  const [pickerFor, setPickerFor] = useState<{ type: string; referenceId: number } | null>(null);
  const overridesByKey = useMemo(() => {
    const m = new Map<string, { kind: 'item' | 'pokemon'; ref: string }>();
    for (const em of existingMarkers ?? []) {
      if ((em.sprite_kind === 'item' || em.sprite_kind === 'pokemon') && em.sprite_ref) {
        m.set(`${em.marker_type}:${em.reference_id}`, { kind: em.sprite_kind, ref: em.sprite_ref });
      }
    }
    return m;
  }, [existingMarkers]);
  const [internalLocation, setInternalLocation] = useState<string>('');
  const selectedLocation = selectedLocationKey ?? internalLocation;
  const setSelectedLocation = (key: string) => {
    if (onLocationKeyChange) onLocationKeyChange(key);
    else setInternalLocation(key);
  };
  const activeCalibRef = useRef<HTMLDivElement>(null);
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
          description: item.description || '',
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const t of data.trainers) {
        const existing = existingMarkers.find(m => m.marker_type === 'trainer' && m.reference_id === t.id);
        placeable.push({
          id: t.id, type: 'trainer', name: t.trainer_name, detail: t.trainer_class,
          description: t.description || '',
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const tm of data.tms) {
        const existing = existingMarkers.find(m => m.marker_type === 'tm' && m.reference_id === tm.id);
        placeable.push({
          id: tm.id, type: 'tm', name: `${tm.tm_number} ${tm.move_name}`, detail: tm.method,
          description: tm.description || '',
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      for (const evt of data.events) {
        const existing = existingMarkers.find(m => m.marker_type === 'event' && m.reference_id === evt.id);
        placeable.push({
          id: evt.id, type: 'event', name: evt.event_name, detail: evt.event_type,
          description: evt.description || '',
          location_key: selectedLocation, placed: !!existing,
          markerId: existing?.id, x: existing?.x, y: existing?.y,
        });
      }
      // Shops store their x/y directly on location_shops rather than in
      // marker_positions, so "placed" is derived from the shop row itself.
      for (const shop of data.shops ?? []) {
        const placed = shop.x != null && shop.y != null;
        placeable.push({
          id: shop.id, type: 'shop', name: shop.shop_name,
          detail: `${shop.inventory?.length ?? 0} items`,
          description: '',
          location_key: selectedLocation, placed,
          x: placed ? (shop.x ?? undefined) : undefined, y: placed ? (shop.y ?? undefined) : undefined,
          inventory: shop.inventory ?? [],
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

        <div className="mb-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <FilterDropdown
              label="Select location..."
              options={locations.map((l: any) => ({ value: l.location_key, label: l.display_name }))}
              selected={selectedLocation ? [selectedLocation] : []}
              onChange={(sel) => { setSelectedLocation(sel[0] ?? ''); onSelectItem(null); }}
              multiSelect={false}
            />
          </div>
          {onStartCreateCustom && (
            <button
              type="button"
              onClick={onStartCreateCustom}
              title={creatingCustom ? 'Click map to place custom marker…' : 'Add pin'}
              className={`shrink-0 p-1.5 rounded-md border transition-colors ${
                creatingCustom
                  ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <MapPinPlus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'item', 'hidden_item', 'trainer', 'tm', 'event', 'shop'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-2xs px-1.5 py-0.5 rounded ${filter === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            >
              {t === 'all' ? 'All' : t === 'hidden_item' ? 'Hidden' : t === 'shop' ? 'Shops' : t.charAt(0).toUpperCase() + t.slice(1)}
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
            <div
              key={`${item.type}-${item.id}`}
              ref={isActive ? activeCalibRef : undefined}
              className={`border-b border-border/50 ${
                isActive ? 'bg-orange-500/15 border-l-2 border-l-orange-500' :
                item.placed ? 'opacity-50' : ''
              }`}
            >
              <button
                onClick={() => onSelectItem(isActive ? null : item)}
                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  isActive ? '' : 'hover:bg-muted/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{
                  background: item.placed ? '#4ade80' : isActive ? '#f97316' : SUB_MARKER_COLORS[item.type],
                }} />
                <span className="flex-1 min-w-0 truncate">{item.name}</span>
                {item.detail && (
                  <span className="text-2xs text-muted-foreground">{prettifyMarkerDetail(item.detail)}</span>
                )}
                {item.placed && <span className="text-2xs text-green-500">✓</span>}
                {isActive && !item.placed && (
                  <span className="text-2xs text-orange-400">click map →</span>
                )}
              </button>
              {isActive && item.type === 'shop' && item.inventory && item.inventory.length > 0 && (
                <ul className="px-3 pb-1.5 text-2xs text-muted-foreground divide-y divide-border/40">
                  {item.inventory.map((inv, idx) => (
                    <li key={`${item.id}-inv-${idx}`} className="flex items-center gap-2 py-1">
                      {inv.sprite_path && (
                        <img
                          src={inv.sprite_path}
                          alt=""
                          className="w-4 h-4 shrink-0 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      <span className="flex-1">
                        <span>{inv.item_name}</span>
                        {inv.badge_gate > 0 && (
                          <span className="ml-1 text-[9px] text-orange-400/80">· Badge {inv.badge_gate}</span>
                        )}
                        {inv.notes && (
                          <div className="text-[9px] opacity-60 leading-tight">{inv.notes}</div>
                        )}
                      </span>
                      {inv.price != null && (
                        <span className="tabular-nums">¥{inv.price.toLocaleString()}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isActive && (
                <div className="px-3 pb-2 space-y-1.5">
                  <InlineNotes
                    markerType={item.type}
                    referenceId={item.id}
                    initialValue={item.description}
                    onSaved={(value) => {
                      setItems(prev => prev.map(p =>
                        p.id === item.id && p.type === item.type
                          ? { ...p, description: value }
                          : p
                      ));
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-muted-foreground">Icon:</span>
                    {overridesByKey.has(`${item.type}:${item.id}`) ? (
                      <>
                        {(() => {
                          const o = overridesByKey.get(`${item.type}:${item.id}`)!;
                          return (
                            <img
                              src={`/sprites/${o.kind === 'pokemon' ? 'pokemon' : 'items'}/${o.ref}`}
                              alt=""
                              className="w-5 h-5"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          );
                        })()}
                        <button
                          type="button"
                          onClick={async () => {
                            await api.guide.clearSubMarkerOverride(item.type, item.id);
                            onOverridesChanged?.();
                          }}
                          className="text-2xs text-muted-foreground hover:text-foreground px-1"
                        >
                          Clear
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPickerFor({ type: item.type, referenceId: item.id })}
                      className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {overridesByKey.has(`${item.type}:${item.id}`) ? 'Change' : 'Set icon'}
                    </button>
                  </div>
                  {item.placed && (
                    <button
                      type="button"
                      onClick={async () => {
                        const table =
                          item.type === 'item' || item.type === 'hidden_item' ? 'items'
                          : item.type === 'trainer' ? 'trainers'
                          : item.type === 'tm' ? 'tms'
                          : item.type === 'event' ? 'events'
                          : null;
                        if (!table) return;
                        await api.guide.clearSubMarkerPosition(table, item.id);
                        onOverridesChanged?.();
                      }}
                      className="text-2xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-500/10"
                    >
                      Unplace
                    </button>
                  )}
                </div>
              )}
            </div>
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
      {pickerFor && (
        <ItemPickerModal
          onClose={() => setPickerFor(null)}
          onPick={async (picked) => {
            await api.guide.setSubMarkerOverride({
              sub_marker_type: pickerFor.type,
              reference_id: pickerFor.referenceId,
              sprite_kind: picked.sprite_kind,
              sprite_ref: picked.sprite_ref,
            });
            setPickerFor(null);
            onOverridesChanged?.();
          }}
        />
      )}
    </div>
  );
}
