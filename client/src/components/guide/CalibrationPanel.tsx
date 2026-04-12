import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, SkipForward } from 'lucide-react';
import CalibrationSearch from './CalibrationSearch';
import { TYPE_COLORS } from './SubMarker';
import type { SubMarker } from '@/api/client';
import { Input } from '@/components/ui/input';
import FilterDropdown from '@/components/FilterDropdown';

interface CalibrationLocation {
  location_key: string;
  display_name: string;
  x: number;
  y: number;
}

const SUB_MARKER_TYPES = [
  { key: 'trainer', label: 'Trainers', color: TYPE_COLORS.trainer },
  { key: 'item', label: 'Items', color: TYPE_COLORS.item },
  { key: 'tm', label: 'TMs', color: TYPE_COLORS.tm },
  { key: 'event', label: 'Events', color: TYPE_COLORS.event },
  { key: 'custom', label: 'Custom', color: TYPE_COLORS.custom },
];

interface CalibrationPanelProps {
  // Location marker calibration (existing)
  locations: CalibrationLocation[];
  activeLocationIndex: number;
  onLocationPrev: () => void;
  onLocationNext: () => void;
  onLocationSkip: () => void;
  onLocationSelect: (index: number) => void;
  onExport: () => void;
  mapWidth: number;
  mapHeight: number;
  // Sub-marker calibration (new)
  subMarkers: SubMarker[];
  activeSubMarker: SubMarker | null;
  onSubMarkerSelect: (marker: SubMarker) => void;
  onSubMarkerPrev: () => void;
  onSubMarkerNext: () => void;
  onSubMarkerSkip: () => void;
  typeFilter: Set<string>;
  onTypeFilterToggle: (type: string) => void;
  locationFilter: string | null;
  onLocationFilterChange: (key: string | null) => void;
  mode: 'locations' | 'sub-markers';
  onModeChange: (mode: 'locations' | 'sub-markers') => void;
  onCreateCustomMarker: (data: { label: string; marker_type: string; description?: string }) => void;
}

export default function CalibrationPanel({
  locations,
  activeLocationIndex,
  onLocationPrev,
  onLocationNext,
  onLocationSkip,
  onLocationSelect,
  onExport,
  mapWidth,
  mapHeight,
  subMarkers,
  activeSubMarker,
  onSubMarkerSelect,
  onSubMarkerPrev,
  onSubMarkerNext,
  onSubMarkerSkip,
  typeFilter,
  onTypeFilterToggle,
  locationFilter,
  onLocationFilterChange,
  mode,
  onModeChange,
  onCreateCustomMarker,
}: CalibrationPanelProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState('note');
  const [customDesc, setCustomDesc] = useState('');

  const currentLocation = locations[activeLocationIndex];
  const px = currentLocation
    ? {
        x: (currentLocation.x * mapWidth).toFixed(0),
        y: (currentLocation.y * mapHeight).toFixed(0),
      }
    : null;

  const filteredMarkers = useMemo(() => {
    return subMarkers.filter(m => {
      if (typeFilter.size > 0 && !typeFilter.has(m.type)) return false;
      if (locationFilter && m.location_key !== locationFilter) return false;
      return true;
    });
  }, [subMarkers, typeFilter, locationFilter]);

  const placedCount = filteredMarkers.filter(m => m.x != null).length;
  const totalCount = filteredMarkers.length;
  const progressPct = totalCount > 0 ? (placedCount / totalCount) * 100 : 0;

  const uniqueLocations = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of subMarkers) {
      if (!seen.has(m.location_key)) seen.set(m.location_key, m.location_name);
    }
    return Array.from(seen.entries()).map(([key, name]) => ({ key, name }));
  }, [subMarkers]);

  return (
    <div className="absolute top-14 left-3 z-[1000] w-72 rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-xs font-semibold tracking-widest text-amber-400/90">
            CALIBRATION
          </span>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-md overflow-hidden border border-white/10 mb-3">
        <button
          onClick={() => onModeChange('locations')}
          className={`flex-1 text-xs py-1.5 transition-colors ${
            mode === 'locations'
              ? 'bg-white/15 text-white font-medium'
              : 'text-white/50 hover:text-white/75 hover:bg-white/5'
          }`}
        >
          Locations
        </button>
        <button
          onClick={() => onModeChange('sub-markers')}
          className={`flex-1 text-xs py-1.5 transition-colors ${
            mode === 'sub-markers'
              ? 'bg-white/15 text-white font-medium'
              : 'text-white/50 hover:text-white/75 hover:bg-white/5'
          }`}
        >
          Sub-Markers
        </button>
      </div>

      {/* Locations Mode */}
      {mode === 'locations' && (
        <>
          <div className="mb-2">
            <FilterDropdown
              label="Select location..."
              options={locations.map((loc, i) => ({ value: String(i), label: `${i + 1}. ${loc.display_name}` }))}
              selected={[String(activeLocationIndex)]}
              onChange={(sel) => { if (sel[0] !== undefined) onLocationSelect(Number(sel[0])); }}
              multiSelect={false}
            />
          </div>

          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={onLocationPrev}
              disabled={activeLocationIndex === 0}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center text-sm font-medium truncate">
              {currentLocation?.display_name}
            </div>
            <button
              onClick={onLocationSkip}
              className="p-1.5 rounded hover:bg-white/10"
              title="Skip to next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={onLocationNext}
              disabled={activeLocationIndex === locations.length - 1}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {px && (
            <div className="text-xs text-muted-foreground text-center mb-2">
              px: ({px.x}, {px.y}) — ratio: ({currentLocation.x.toFixed(4)},{' '}
              {currentLocation.y.toFixed(4)})
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Click the map to place this marker. Click an existing marker to select it.
          </p>
        </>
      )}

      {/* Sub-Markers Mode */}
      {mode === 'sub-markers' && (
        <>
          {/* Search */}
          <div className="mb-2">
            <CalibrationSearch markers={filteredMarkers} onSelect={onSubMarkerSelect} />
          </div>

          {/* Type filter pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => {
                for (const t of Array.from(typeFilter)) onTypeFilterToggle(t);
              }}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                typeFilter.size === 0
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              All
            </button>
            {SUB_MARKER_TYPES.map(({ key, label, color }) => {
              const active = typeFilter.has(key);
              return (
                <button
                  key={key}
                  onClick={() => onTypeFilterToggle(key)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    active ? 'bg-white/10 border-white/20' : 'border-white/10 opacity-40 hover:opacity-70'
                  }`}
                  style={active ? { color, borderColor: color + '60' } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Location filter */}
          <div className="mb-2">
            <FilterDropdown
              label="All locations"
              options={uniqueLocations.map(({ key, name }) => ({ value: key, label: name }))}
              selected={locationFilter ? [locationFilter] : []}
              onChange={(sel) => onLocationFilterChange(sel[0] ?? null)}
              multiSelect={false}
            />
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Progress</span>
              <span>
                {placedCount} / {totalCount}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                }}
              />
            </div>
          </div>

          {/* Active item card */}
          {activeSubMarker ? (
            <div
              className="rounded-md border border-white/10 bg-white/[0.04] p-2 mb-2 text-xs"
              style={{ borderLeftWidth: 3, borderLeftColor: TYPE_COLORS[activeSubMarker.type] ?? TYPE_COLORS.custom }}
            >
              <div className="font-medium truncate mb-0.5">{activeSubMarker.name}</div>
              <div className="text-white/50 truncate">{activeSubMarker.location_name}</div>
              {activeSubMarker.method && (
                <div className="text-white/40 text-xs mt-0.5">{activeSubMarker.method}</div>
              )}
              <div className="mt-1 text-xs">
                {activeSubMarker.x != null ? (
                  <span className="text-emerald-400">
                    ({activeSubMarker.x.toFixed(4)}, {activeSubMarker.y!.toFixed(4)})
                  </span>
                ) : (
                  <span className="text-white/30 italic">Click map to place</span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-2 mb-2 text-xs text-white/30 italic text-center">
              No marker selected
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSubMarkerPrev}
              className="p-1.5 rounded hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={onSubMarkerSkip}
              className="p-1.5 rounded hover:bg-white/10"
              title="Skip to next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={onSubMarkerNext}
              className="p-1.5 rounded hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Custom marker creation */}
          <div className="mt-2 pt-2 border-t border-white/10">
            {showCustomForm ? (
              <div className="space-y-1.5">
                <Input
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder="Label"
                  className="w-full"
                  autoFocus
                />
                <FilterDropdown
                  label="Type"
                  options={[
                    { value: 'note', label: 'Note' },
                    { value: 'pokemon', label: 'Pokemon' },
                    { value: 'item', label: 'Item' },
                    { value: 'trainer', label: 'Trainer' },
                    { value: 'event', label: 'Event' },
                  ]}
                  selected={[customType]}
                  onChange={(sel) => setCustomType(sel[0] ?? 'note')}
                  multiSelect={false}
                />
                <Input
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (!customLabel.trim()) return;
                      onCreateCustomMarker({
                        label: customLabel.trim(),
                        marker_type: customType,
                        description: customDesc.trim() || undefined,
                      });
                      setCustomLabel('');
                      setCustomType('note');
                      setCustomDesc('');
                      setShowCustomForm(false);
                    }}
                    disabled={!customLabel.trim()}
                    className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                  >
                    Create & Place
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="text-xs py-1 px-2 rounded bg-white/10 hover:bg-white/15 text-white/60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full text-xs py-1.5 rounded border border-dashed border-white/20 text-white/50 hover:text-white/70 hover:border-white/30 transition-colors"
              >
                + Custom Marker
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
