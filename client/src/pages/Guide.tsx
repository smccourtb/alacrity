import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import GameMap from '@/components/guide/GameMap';
import MapMarker, { type MarkerStatus } from '@/components/guide/MapMarker';
import { LocationDetail } from '@/components/guide/LocationDetail';
import GamePicker from '@/components/guide/GamePicker';
import SaveOverlaySelector from '@/components/guide/SaveOverlaySelector';
import SubMarkerLayer, { type SubMarkerData } from '@/components/guide/SubMarkerLayer';
import FilterPills, { type FilterState } from '@/components/guide/FilterPills';
import SubMarkerCalibration from '@/components/guide/SubMarkerCalibration';
import PokemonSearch from '@/components/guide/PokemonSearch';

export default function Guide() {
  const [searchParams] = useSearchParams();
  const initialGame = searchParams.get('game') || 'red';

  const [game, setGame] = useState(initialGame);
  const [mapData, setMapData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedSaveId, setSelectedSaveId] = useState<number | null>(null);
  const [flagReport, setFlagReport] = useState<any | null>(null);
  const [playerLocationKey, setPlayerLocationKey] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [subMarkers, setSubMarkers] = useState<SubMarkerData[]>([]);
  const [filters, setFilters] = useState<FilterState>({ item: true, hidden_item: true, trainer: true, tm: false, event: false, hideDone: false });
  const [zoom, setZoom] = useState(-2);
  const isCalibrating = searchParams.get('calibrate') === 'true';
  const [calibrationItem, setCalibrationItem] = useState<any>(null);
  const [selectedLocationForMove, setSelectedLocationForMove] = useState<any>(null);
  const [highlightedLocationIds, setHighlightedLocationIds] = useState<Set<number>>(new Set());
  const [searchEncounters, setSearchEncounters] = useState<any[]>([]);
  const [flyTo, setFlyTo] = useState<{ x: number; y: number } | null>(null);
  const [activeSubMarker, setActiveSubMarker] = useState<{ type: string; referenceId: number } | null>(null);
  const [calibrationLocationKey, setCalibrationLocationKey] = useState<string>('');

  // Load map when game changes
  useEffect(() => {
    if (!game) return;
    api.guide.gameMap(game)
      .then(map => {
        setMapData(map);
        api.guide.locations(map.map_key).then(setLocations);
      })
      .catch(() => {
        setMapData(null);
        setLocations([]);
      });
    setSelectedLocationId(null);
    setSelectedLocationKey('');
    setSelectedLocationName('');
    setActiveSubMarker(null);
  }, [game]);

  // Fetch flag report when save selected
  useEffect(() => {
    if (!selectedSaveId || !game) {
      setFlagReport(null);
      setPlayerLocationKey(null);
      return;
    }
    api.flags.parse(game, selectedSaveId)
      .then((report) => {
        setFlagReport(report);
        setPlayerLocationKey(report.currentLocationKey || null);
      })
      .catch(() => { setFlagReport(null); setPlayerLocationKey(null); });
  }, [selectedSaveId, game]);

  // Load sub-markers when map is available
  useEffect(() => {
    if (!mapData || !game) return;
    api.guide.markers(mapData.map_key, game)
      .then(setSubMarkers)
      .catch(() => setSubMarkers([]));
  }, [mapData, game]);

  function handleLocationClick(loc: any) {
    if (isCalibrating) {
      // In calibration mode, clicking a location marker selects it for repositioning
      setSelectedLocationForMove(
        selectedLocationForMove?.id === loc.id ? null : loc
      );
      setCalibrationItem(null); // deselect sub-marker
      return;
    }
    setActiveSubMarker(null);
    setSelectedLocationId(loc.id);
    setSelectedLocationKey(loc.location_key);
    setSelectedLocationName(loc.display_name);
  }

  function getMarkerStatus(loc: any): MarkerStatus {
    if (selectedLocationId === loc.id) return 'current';
    if (playerLocationKey && loc.location_key === playerLocationKey) return 'current';
    if (!flagReport) return 'upcoming';
    const locFlags = flagReport.flags_by_location[loc.location_key];
    if (!locFlags || locFlags.total === 0) return 'upcoming';
    if (locFlags.set === locFlags.total) return 'complete';
    if (locFlags.set > 0) return 'partial';
    return 'upcoming';
  }

  function handleSpeciesSelect(speciesId: number) {
    api.guide.speciesLocations(speciesId, game).then(encounters => {
      setSearchEncounters(encounters);
      const locIds = new Set(encounters.map((e: any) => e.location_id));
      setHighlightedLocationIds(locIds);
      // Clear selected location so the sidebar can show search results
      setSelectedLocationId(null);
    }).catch(() => {
      setSearchEncounters([]);
      setHighlightedLocationIds(new Set());
    });
  }

  function handleSearchClear() {
    setHighlightedLocationIds(new Set());
    setSearchEncounters([]);
  }

  function handleCalibrationClick(pixel: { x: number; y: number }) {
    if (!isCalibrating || !mapData) return;
    const nx = pixel.x / mapData.width;
    const ny = pixel.y / mapData.height;

    // Moving a location marker
    if (selectedLocationForMove) {
      api.guide.updateLocationPosition(selectedLocationForMove.id, nx, ny).then(() => {
        setLocations(prev => prev.map(l =>
          l.id === selectedLocationForMove.id ? { ...l, x: nx, y: ny } : l
        ));
      });
      return;
    }

    // Placing/moving a sub-marker
    if (!calibrationItem) return;
    const existing = subMarkers.find(
      m => m.marker_type === calibrationItem.type && m.reference_id === calibrationItem.id
    );

    const promise = existing
      ? api.guide.updateMarker(existing.id, { x: nx, y: ny })
      : api.guide.createMarker({
          map_key: mapData.map_key,
          marker_type: calibrationItem.type,
          reference_id: calibrationItem.id,
          x: nx,
          y: ny,
          game_override: null,
        });

    promise.then(() => {
      api.guide.markers(mapData.map_key, game).then(setSubMarkers);
    });
  }

  if (!mapData) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Select a game to load its map</p>
          <GamePicker value={game} onChange={setGame} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-6rem)] -m-6 overflow-hidden">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <GameMap
          imagePath={mapData.image_path}
          width={mapData.width}
          height={mapData.height}
          selectedLocation={flyTo}
          onZoomChange={setZoom}
          onMapClick={isCalibrating ? handleCalibrationClick : undefined}
        >
          {locations.map(loc => {
            const coordX = loc.x * mapData.width;
            const coordY = loc.y * mapData.height;

            // Compute sub-marker counts for this location (only show badge when zoomed out)
            const locSubMarkers = subMarkers.filter(m => m.location_key === loc.location_key);
            const badge = zoom < (mapData.sub_marker_zoom_threshold ?? 0) && locSubMarkers.length > 0
              ? {
                  total: locSubMarkers.length,
                  done: locSubMarkers.filter(m =>
                    m.flag_index != null && m.location_key &&
                    flagReport?.flags_by_location?.[m.location_key]?.flags?.some(
                      (f: any) => f.index === m.flag_index && f.set
                    )
                  ).length,
                }
              : null;

            return (
              <MapMarker
                key={loc.location_key}
                x={coordX}
                y={coordY}
                name={loc.display_name}
                status={getMarkerStatus(loc)}
                locationType={loc.location_type}
                onClick={() => handleLocationClick(loc)}
                active={selectedLocationId === loc.id || selectedLocationForMove?.id === loc.id}
                highlighted={highlightedLocationIds.has(loc.id)}
                badge={badge}
              />
            );
          })}
          {/* Sub-markers — only show when zoomed in */}
          {zoom >= (mapData.sub_marker_zoom_threshold ?? 0) && subMarkers.length > 0 && (
            <SubMarkerLayer
              markers={subMarkers}
              mapWidth={mapData.width}
              mapHeight={mapData.height}
              filters={filters}
              flagReport={flagReport}
              onMarkerClick={(m) => {
                if (isCalibrating) {
                  // Auto-select location and item in calibration sidebar
                  setCalibrationLocationKey(m.location_key ?? '');
                  setCalibrationItem({
                    id: m.reference_id,
                    type: m.marker_type,
                    name: m.name,
                    detail: m.detail,
                    location_key: m.location_key ?? '',
                    placed: true,
                    markerId: m.id,
                    x: m.x,
                    y: m.y,
                  });
                  setSelectedLocationForMove(null);
                  return;
                }
                // Normal mode — existing code
                if (m.location_id) {
                  const loc = locations.find((l: any) => l.id === m.location_id);
                  if (loc) {
                    setActiveSubMarker({ type: m.marker_type, referenceId: m.reference_id });
                    setSelectedLocationId(loc.id);
                    setSelectedLocationKey(loc.location_key);
                    setSelectedLocationName(loc.display_name);
                  }
                }
              }}
            />
          )}
        </GameMap>
      </div>

      {/* Floating sidebar */}
      <div className="absolute top-4 left-4 bottom-4 w-[380px] z-[1000] flex flex-col gap-3 pointer-events-none">
        {/* Controls card */}
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 pointer-events-auto space-y-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <GamePicker value={game} onChange={setGame} />
            <SaveOverlaySelector game={game} value={selectedSaveId} onChange={setSelectedSaveId} />
            {flagReport && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {flagReport.set_flags}/{flagReport.total_flags}
              </span>
            )}
          </div>
          {!isCalibrating && (
            <PokemonSearch game={game} onSelect={handleSpeciesSelect} onClear={handleSearchClear} />
          )}
        </div>

        {/* Filter pills */}
        <FilterPills
          game={game}
          counts={(() => {
            const c: any = {};
            for (const m of subMarkers) {
              c[m.marker_type] = (c[m.marker_type] || 0) + 1;
            }
            return c;
          })()}
          onChange={setFilters}
        />

        {/* Location detail card */}
        <div className="flex-1 min-h-0 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden pointer-events-auto">
          {isCalibrating ? (
            <SubMarkerCalibration
              mapKey={mapData.map_key}
              game={game}
              locations={locations}
              existingMarkers={subMarkers}
              onClose={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('calibrate');
                window.history.replaceState({}, '', url.toString());
                window.location.reload();
              }}
              mapWidth={mapData.width}
              mapHeight={mapData.height}
              activeItem={calibrationItem}
              onSelectItem={(item) => { setCalibrationItem(item); setSelectedLocationForMove(null); }}
              selectedLocationKey={calibrationLocationKey}
              onLocationKeyChange={setCalibrationLocationKey}
            />
          ) : searchEncounters.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">{highlightedLocationIds.size} location{highlightedLocationIds.size !== 1 ? 's' : ''}</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {Array.from(new Set(searchEncounters.map((e: any) => e.location_id))).map(locId => {
                  const locEncs = searchEncounters.filter((e: any) => e.location_id === locId);
                  const loc = locEncs[0];
                  const mapLoc = locations.find((l: any) => l.id === locId);
                  return (
                    <button
                      key={locId}
                      onClick={() => {
                        if (mapLoc) {
                          setFlyTo({ x: mapLoc.x * mapData.width, y: mapLoc.y * mapData.height });
                          // Clear flyTo after animation so it doesn't re-trigger
                          setTimeout(() => setFlyTo(null), 600);
                          handleLocationClick(mapLoc);
                        }
                      }}
                      className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="text-sm font-medium mb-2">{loc.display_name}</div>
                      <div className="flex flex-col gap-1.5">
                        {locEncs.map((enc: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="shrink-0 w-3.5 text-center">
                              {enc.method === 'grass' || enc.method === 'walk' ? '🌿' :
                               enc.method === 'surf' ? '🌊' :
                               enc.method.includes('rod') ? '🎣' :
                               enc.method === 'gift' || enc.method === 'special' ? '🎁' :
                               enc.method === 'headbutt' ? '🌳' : '📍'}
                            </span>
                            <span className="capitalize">{enc.method.replace(/-/g, ' ')}</span>
                            <span className="font-bold text-foreground/70">
                              LVL {enc.level_min}{enc.level_min !== enc.level_max ? `–${enc.level_max}` : ''}
                            </span>
                            {enc.encounter_rate != null && (
                              <span className="ml-auto tabular-nums">{enc.encounter_rate}%</span>
                            )}
                            {enc.time_of_day && (
                              <span>{enc.time_of_day === 'morning' ? '🌅' : enc.time_of_day === 'day' ? '☀️' : '🌙'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : selectedLocationId && game ? (
            <LocationDetail
              locationId={selectedLocationId}
              locationName={selectedLocationName}
              game={game}
              flagReport={flagReport}
              locationKey={selectedLocationKey}
              activeSubMarker={activeSubMarker}
              onClearActiveSubMarker={() => setActiveSubMarker(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Click a location on the map</p>
                <p className="text-xs text-muted-foreground/60 mt-1">to view encounters, items, trainers & more</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map legend + calibrate — bottom right */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          onClick={() => {
            const url = new URL(window.location.href);
            if (isCalibrating) {
              url.searchParams.delete('calibrate');
            } else {
              url.searchParams.set('calibrate', 'true');
            }
            window.history.replaceState({}, '', url.toString());
            window.location.reload();
          }}
          className={`text-xs px-2.5 py-1.5 rounded-lg shadow-md border transition-colors ${
            isCalibrating
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-card/90 backdrop-blur-sm text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          {isCalibrating ? 'Exit Calibrate' : 'Calibrate'}
        </button>
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-lg px-4 py-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Map Legend</div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill="#9ca3af" stroke="#fff" strokeWidth="1.5"/></svg>
            <span className="text-sm text-muted-foreground">City</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="8" fill="none" stroke="#9ca3af" strokeWidth="2.5"/></svg>
            <span className="text-sm text-muted-foreground">Route</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><polygon points="12,2 22,22 2,22" fill="#9ca3af" stroke="#fff" strokeWidth="1.5"/></svg>
            <span className="text-sm text-muted-foreground">Cave</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2" fill="#9ca3af" stroke="#fff" strokeWidth="1.5"/></svg>
            <span className="text-sm text-muted-foreground">Building</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><polygon points="12,2 22,12 12,22 2,12" fill="#9ca3af" stroke="#fff" strokeWidth="1.5"/></svg>
            <span className="text-sm text-muted-foreground">Dungeon</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="12" height="12"><polygon points="12,1 15,9 24,9 17,14 19,23 12,18 5,23 7,14 0,9 9,9" fill="#9ca3af" stroke="#fff" strokeWidth="1.5"/></svg>
            <span className="text-sm text-muted-foreground">Legendary</span>
          </div>
        </div>
        {flagReport && (
          <>
            <div className="border-t border-border my-2" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                <span className="text-sm text-muted-foreground">Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.5)]" />
                <span className="text-sm text-muted-foreground">Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="text-sm text-muted-foreground">New</span>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
