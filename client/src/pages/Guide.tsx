import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Minus, BookMarked } from 'lucide-react';
import { api } from '@/api/client';
import GameMap from '@/components/guide/GameMap';
import MapMarker, { type MarkerStatus } from '@/components/guide/MapMarker';
import { LocationDetail } from '@/components/guide/LocationDetail';
import GamePicker from '@/components/guide/GamePicker';
import SaveOverlaySelector from '@/components/guide/SaveOverlaySelector';
import SubMarkerLayer, { type SubMarkerData } from '@/components/guide/SubMarkerLayer';
import CustomMarkerLayer from '@/components/guide/CustomMarkerLayer';
import CustomMarkerEditor from '@/components/guide/CustomMarkerEditor';
import FilterPills, { type FilterState } from '@/components/guide/FilterPills';
import SubMarkerCalibration from '@/components/guide/SubMarkerCalibration';
import PokemonSearch from '@/components/guide/PokemonSearch';
import SearchResultsPanel from '@/components/guide/SearchResultsPanel';
import ClusterMarker, { type ClusterData } from '@/components/guide/ClusterMarker';
import ClusterPopover from '@/components/guide/ClusterPopover';
import GroupWithBar from '@/components/guide/GroupWithBar';
import LocationPinModal from '@/components/guide/LocationPinModal';

const LAST_GAME_KEY = 'alacrity.guide.lastGame';
const LAST_SAVE_KEY = 'alacrity.guide.lastSaveId';

export default function Guide() {
  const [searchParams] = useSearchParams();
  const initialGame = searchParams.get('game') || localStorage.getItem(LAST_GAME_KEY) || 'red';
  const storedSave = Number(localStorage.getItem(LAST_SAVE_KEY));

  const [game, setGame] = useState(initialGame);
  const [mapData, setMapData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedSaveId, setSelectedSaveId] = useState<number | null>(
    Number.isFinite(storedSave) && storedSave > 0 ? storedSave : null
  );
  const [flagReport, setFlagReport] = useState<any | null>(null);
  const [playerLocationKey, setPlayerLocationKey] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [subMarkers, setSubMarkers] = useState<SubMarkerData[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [customMarkers, setCustomMarkers] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({ item: true, hidden_item: true, trainer: true, tm: false, event: false, shop: true, connection: true, note: true, building: true, poi: true, hideDone: false });
  const [zoom, setZoom] = useState(-2);
  const isCalibrating = searchParams.get('calibrate') === 'true';
  const [calibrationItem, setCalibrationItem] = useState<any>(null);
  const [selectedLocationForMove, setSelectedLocationForMove] = useState<any>(null);
  const [highlightedLocationIds, setHighlightedLocationIds] = useState<Set<number>>(new Set());
  const [searchEncounters, setSearchEncounters] = useState<any[]>([]);
  const [flyTo, setFlyTo] = useState<{ x: number; y: number } | null>(null);
  const [activeSubMarker, setActiveSubMarker] = useState<{ type: string; referenceId: number } | null>(null);
  const [calibrationLocationKey, setCalibrationLocationKey] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const [editingCustomMarker, setEditingCustomMarker] = useState<any | null>(null);
  const [movingCustomMarker, setMovingCustomMarker] = useState<any | null>(null);
  const [pendingCustomPosition, setPendingCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [pairPending, setPairPending] = useState<{ labelA: string; labelB: string; description?: string; aPos?: { x: number; y: number } } | null>(null);
  const [pinnedMarkerKey, setPinnedMarkerKey] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
  const [groupMode, setGroupMode] = useState<null | {
    picks: Array<{ marker_type: string; reference_id: number }>;
  }>(null);
  const [groupPrimaryPickerOpen, setGroupPrimaryPickerOpen] = useState(false);
  const [primaryPick, setPrimaryPick] = useState<{ marker_type: string; reference_id: number } | null>(null);
  const [hideMembers, setHideMembers] = useState(true);
  const [placingLocationPin, setPlacingLocationPin] = useState(false);
  const [newPinAt, setNewPinAt] = useState<{ x: number; y: number } | null>(null);
  const [editingPinId, setEditingPinId] = useState<number | null>(null);
  const mapHandleRef = useRef<any>(null);

  useEffect(() => {
    if (game) localStorage.setItem(LAST_GAME_KEY, game);
  }, [game]);
  useEffect(() => {
    if (selectedSaveId != null) localStorage.setItem(LAST_SAVE_KEY, String(selectedSaveId));
    else localStorage.removeItem(LAST_SAVE_KEY);
  }, [selectedSaveId]);

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
      .then(({ markers, clusters }) => {
        setSubMarkers(markers);
        setClusters(clusters);
      })
      .catch(() => { setSubMarkers([]); setClusters([]); });
    api.guide.subMarkers(mapData.map_key, game)
      .then((rows: any[]) => setCustomMarkers(rows.filter(r => r.type === 'custom')))
      .catch(() => setCustomMarkers([]));
  }, [mapData, game]);

  const overridesByKey = useMemo(() => {
    const m = new Map<string, { sprite_kind: string; sprite_ref: string }>();
    for (const sm of subMarkers) {
      if (sm.sprite_kind && sm.sprite_ref) {
        m.set(`${sm.marker_type}:${sm.reference_id}`, {
          sprite_kind: sm.sprite_kind,
          sprite_ref: sm.sprite_ref,
        });
      }
    }
    return m;
  }, [subMarkers]);

  function refetchSubMarkers() {
    if (!mapData || !game) return;
    api.guide.markers(mapData.map_key, game)
      .then(({ markers, clusters }) => {
        setSubMarkers(markers);
        setClusters(clusters);
      })
      .catch(() => { setSubMarkers([]); setClusters([]); });
  }

  async function navigateToPairedMarker(mapKey: string, x: number, y: number) {
    if (!mapData) return;
    if (mapData.map_key === mapKey) {
      setFlyTo({ x: x * mapData.width, y: y * mapData.height });
      setTimeout(() => setFlyTo(null), 600);
      return;
    }
    const map = await api.guide.map(mapKey);
    setMapData(map);
    const locs = await api.guide.locations(map.map_key);
    setLocations(locs);
    setTimeout(() => {
      setFlyTo({ x: x * map.width, y: y * map.height });
      setTimeout(() => setFlyTo(null), 600);
    }, 50);
  }

  function focusSubMarkerOnMap(m: { marker_type: string; reference_id: number; x?: number | null; y?: number | null }) {
    if (m.x == null || m.y == null || !mapHandleRef.current || !mapData) return;
    const target: [number, number] = [-m.y * mapData.height, m.x * mapData.width];
    const currentZoom = mapHandleRef.current.getZoom();
    mapHandleRef.current.flyTo(target, currentZoom, { duration: 0.8 });
    setActiveSubMarker({ type: m.marker_type, referenceId: m.reference_id });
  }

  function handleLocationClick(loc: any) {
    if (isCalibrating) {
      // In calibration mode, clicking a location marker selects it for
      // repositioning AND selects it in the calibration dropdown + guide
      // sidebar, so the user sees the same context as clicking elsewhere.
      setSelectedLocationForMove(
        selectedLocationForMove?.id === loc.id ? null : loc
      );
      setCalibrationItem(null); // deselect sub-marker
      setCalibrationLocationKey(loc.location_key);
      setSelectedLocationId(loc.id);
      setSelectedLocationKey(loc.location_key);
      setSelectedLocationName(loc.display_name);
      if (mapData) {
        setFlyTo({ x: loc.x * mapData.width, y: loc.y * mapData.height });
        setTimeout(() => setFlyTo(null), 600);
      }
      return;
    }
    setActiveSubMarker(null);
    // Clicking a marker always escapes out of the species-search view so the
    // location's own detail panel takes over the sidebar.
    setSearchEncounters([]);
    setHighlightedLocationIds(new Set());
    setSearchClearSignal(n => n + 1);
    setSelectedLocationId(loc.id);
    setSelectedLocationKey(loc.location_key);
    setSelectedLocationName(loc.display_name);
    // Fly-to on click: centers the clicked location. Short timeout clears the
    // prop so re-clicking the same marker retriggers the animation.
    if (mapData) {
      setFlyTo({ x: loc.x * mapData.width, y: loc.y * mapData.height });
      setTimeout(() => setFlyTo(null), 600);
    }
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

    if (pairPending && mapData && game) {
      const pos = { x: pixel.x / mapData.width, y: pixel.y / mapData.height };
      if (!pairPending.aPos) {
        setPairPending({ ...pairPending, aPos: pos });
        return;
      }
      const mapId = mapData.id;
      const snapshot = pairPending;
      setPairPending(null);
      api.guide.createCustomMarkerPair({
        game,
        a: { map_id: mapId, label: snapshot.labelA, x: snapshot.aPos!.x, y: snapshot.aPos!.y, description: snapshot.description },
        b: { map_id: mapId, label: snapshot.labelB, x: pos.x, y: pos.y, description: snapshot.description },
      }).then(() =>
        api.guide.subMarkers(mapData.map_key, game).then((rows: any[]) =>
          setCustomMarkers(rows.filter(r => r.type === 'custom'))
        )
      );
      return;
    }

    if (placingLocationPin && mapData) {
      setNewPinAt({ x: pixel.x / mapData.width, y: pixel.y / mapData.height });
      setPlacingLocationPin(false);
      return;
    }

    if (creatingCustom && mapData) {
      setPendingCustomPosition({ x: pixel.x / mapData.width, y: pixel.y / mapData.height });
      setCreatingCustom(false);
      return;
    }

    const nx = pixel.x / mapData.width;
    const ny = pixel.y / mapData.height;

    // Moving a custom marker (building/connection/note/poi)
    if (movingCustomMarker) {
      const id = movingCustomMarker.id;
      api.guide.updateCustomMarker(id, { x: nx, y: ny }).then(() => {
        setCustomMarkers(prev => prev.map(c => c.id === id ? { ...c, x: nx, y: ny } : c));
        setMovingCustomMarker(null);
      });
      return;
    }

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

    // Shops live on location_shops (own x/y columns) — different endpoint.
    const promise = calibrationItem.type === 'shop'
      ? api.guide.updateShopPosition(calibrationItem.id, { x: nx, y: ny })
      : (() => {
          const existing = subMarkers.find(
            m => m.marker_type === calibrationItem.type && m.reference_id === calibrationItem.id
          );
          return existing
            ? api.guide.updateMarker(existing.id, { x: nx, y: ny })
            : api.guide.createMarker({
                map_key: mapData.map_key,
                marker_type: calibrationItem.type,
                reference_id: calibrationItem.id,
                x: nx,
                y: ny,
                game_override: null,
              });
        })();

    promise.then(() => {
      api.guide.markers(mapData.map_key, game)
        .then(({ markers, clusters }) => {
          setSubMarkers(markers);
          setClusters(clusters);
        })
        .catch(() => { setSubMarkers([]); setClusters([]); });
    });
  }

  const hiddenMarkerKeys = useMemo(() => {
    const s = new Set<string>();
    for (const c of clusters) {
      s.add(`${c.primary.marker_type}:${c.primary.reference_id}`);
      if (c.hide_members) {
        for (const m of c.member_ids) s.add(`${m.marker_type}:${m.reference_id}`);
      }
    }
    return s;
  }, [clusters]);

  const visibleSubMarkers = useMemo(
    () => subMarkers.filter(m => !hiddenMarkerKeys.has(`${m.marker_type}:${m.reference_id}`)),
    [subMarkers, hiddenMarkerKeys]
  );

  const hiddenCustomIds = useMemo(() => {
    const s = new Set<number>();
    for (const c of clusters) {
      if (c.primary.marker_type === 'custom') s.add(c.primary.reference_id);
      if (c.hide_members) {
        for (const m of c.member_ids) {
          if (m.marker_type === 'custom') s.add(m.reference_id);
        }
      }
    }
    return s;
  }, [clusters]);

  const markerById = useMemo(() => {
    const m = new Map<string, any>();
    for (const sm of subMarkers) m.set(`${sm.marker_type}:${sm.reference_id}`, sm);
    // Merge custom markers under the same key scheme so clusters whose primary
    // or members are custom markers can resolve name/icon/coords.
    for (const cm of customMarkers) {
      m.set(`custom:${cm.id}`, {
        id: cm.id,
        marker_type: 'custom',
        reference_id: cm.id,
        x: cm.x,
        y: cm.y,
        name: cm.name,
        detail: cm.detail,
        description: cm.detail,
        flag_index: null,
        location_id: null,
        location_key: null,
        sprite_kind: cm.sprite_kind,
        sprite_ref: cm.sprite_ref,
        method: cm.method,
      });
    }
    return m;
  }, [subMarkers, customMarkers]);

  const startGroupWith = (seed: { marker_type: string; reference_id: number }) =>
    setGroupMode({ picks: [seed] });

  // sameLocation is true only if every picked marker resolves to the same
  // non-null location_id. Treating null as "matches" was a bug: custom markers
  // (connections, buildings) carry null location_id, and a location_aggregate
  // cluster with scope_location_id=null matches every null-location marker on
  // the map in the resolver.
  const sharedLocationId = useMemo<number | null>(() => {
    if (!groupMode) return null;
    const ids = groupMode.picks.map(
      p => markerById.get(`${p.marker_type}:${p.reference_id}`)?.location_id ?? null
    );
    if (ids.length === 0) return null;
    const first = ids[0];
    if (first == null) return null;
    return ids.every(id => id === first) ? first : null;
  }, [groupMode, markerById]);
  const sameLocation = sharedLocationId != null;

  async function confirmGroup() {
    if (!groupMode || !primaryPick || !mapData) return;
    // The "Group with…" flow is always a proximity cluster with only the
    // explicitly picked members. location_aggregate (which absorbs every
    // marker at a location) is an entirely separate concept wired through
    // the LocationPinModal — don't escalate into it implicitly just because
    // the picks happen to share a location_id.
    await api.guide.createCluster({
      map_key: mapData.map_key,
      kind: 'proximity',
      scope_location_id: null,
      x: null,
      y: null,
      primary_marker_type: primaryPick.marker_type,
      primary_reference_id: primaryPick.reference_id,
      hide_members: hideMembers,
      members: groupMode.picks,
    });
    setGroupMode(null);
    setGroupPrimaryPickerOpen(false);
    setPrimaryPick(null);
    setHideMembers(true);
    refetchSubMarkers();
  }

  async function splitRequest(m: { marker_type: string; reference_id: number }) {
    if (!mapData) return;
    const cluster = clusters.find((c: ClusterData) =>
      c.member_ids.some(mm => mm.marker_type === m.marker_type && mm.reference_id === m.reference_id)
    );
    if (!cluster) return;
    if (cluster.id > 0) {
      await api.guide.removeClusterMember(cluster.id, m);
    } else {
      await api.guide.addClusterSplit({ map_key: mapData.map_key, marker_type: m.marker_type, reference_id: m.reference_id });
    }
    refetchSubMarkers();
  }

  async function setPrimaryRequest(m: { marker_type: string; reference_id: number }) {
    const cluster = clusters.find((c: ClusterData) =>
      c.member_ids.some(mm => mm.marker_type === m.marker_type && mm.reference_id === m.reference_id)
    );
    if (!cluster || cluster.id < 0) return;
    await api.guide.updateCluster(cluster.id, {
      primary_marker_type: m.marker_type,
      primary_reference_id: m.reference_id,
    });
    refetchSubMarkers();
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
    <div className="relative h-[100dvh] -m-6 overflow-hidden">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <GameMap
          imagePath={mapData.image_path}
          width={mapData.width}
          height={mapData.height}
          selectedLocation={flyTo}
          onZoomChange={setZoom}
          onMapClick={isCalibrating ? handleCalibrationClick : undefined}
          mapHandleRef={mapHandleRef}
        >
          {locations.map(loc => {
            const coordX = loc.x * mapData.width;
            const coordY = loc.y * mapData.height;

            // Show the same counts as the LocationDetail progress bar:
            // linked_set / linked_total, restricted to flag-trackable rows.
            // Pulling from the server-decorated flagReport keeps the badge,
            // progress bar, and tab counts consistent — no more "7/9 here vs
            // 7/8 there" because shops + un-flagged rows are uniformly
            // excluded from both numerator and denominator.
            const locFlags = flagReport?.flags_by_location?.[loc.location_key];
            const badge = zoom < (mapData.sub_marker_zoom_threshold ?? 0)
              && locFlags && (locFlags.linked_total ?? 0) > 0
              ? { total: locFlags.linked_total, done: locFlags.linked_set ?? 0 }
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
              markers={visibleSubMarkers}
              mapWidth={mapData.width}
              mapHeight={mapData.height}
              filters={filters}
              flagReport={flagReport}
              pinnedMarkerKey={pinnedMarkerKey}
              activeKey={calibrationItem ? `${calibrationItem.type}:${calibrationItem.id}` : null}
              onMarkerClick={(m) => {
                if (isCalibrating && groupMode) {
                  setGroupMode(gm => gm && {
                    picks: gm.picks.some(p => p.marker_type === m.marker_type && p.reference_id === m.reference_id)
                      ? gm.picks
                      : [...gm.picks, { marker_type: m.marker_type, reference_id: m.reference_id }]
                  });
                  return;
                }
                if (isCalibrating) {
                  // Auto-select location and item in calibration sidebar AND
                  // the guide sidebar, so the user sees the location's guide
                  // entry without an extra click.
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
                  if (m.location_id) {
                    const loc = locations.find((l: any) => l.id === m.location_id);
                    if (loc) {
                      setActiveSubMarker({ type: m.marker_type, referenceId: m.reference_id });
                      setSelectedLocationId(loc.id);
                      setSelectedLocationKey(loc.location_key);
                      setSelectedLocationName(loc.display_name);
                    }
                  }
                  return;
                }
                // Normal mode — pin tooltip + open location detail
                const key = `sub:${m.marker_type}:${m.reference_id}`;
                setPinnedMarkerKey(prev => (prev === key ? null : key));
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
              onMarkerContextMenu={(m) => {
                if (!isCalibrating) return;
                if (!groupMode) {
                  startGroupWith({ marker_type: m.marker_type, reference_id: m.reference_id });
                } else {
                  setGroupMode(gm => gm && {
                    picks: gm.picks.some(p => p.marker_type === m.marker_type && p.reference_id === m.reference_id)
                      ? gm.picks
                      : [...gm.picks, { marker_type: m.marker_type, reference_id: m.reference_id }]
                  });
                }
              }}
            />
          )}
          {zoom >= (mapData.sub_marker_zoom_threshold ?? 0) && clusters.map((c: ClusterData) => (
            <ClusterMarker
              key={`cluster-${c.id}`}
              cluster={c}
              mapWidth={mapData.width}
              mapHeight={mapData.height}
              primaryMarker={markerById.get(`${c.primary.marker_type}:${c.primary.reference_id}`)}
              onClick={(cl) => setActiveClusterId(cl.id)}
              onContextMenu={(cl) => { if (isCalibrating) setEditingPinId(cl.id); }}
            />
          ))}
          {activeClusterId != null && (() => {
            const c = clusters.find((cl: ClusterData) => cl.id === activeClusterId);
            if (!c) return null;
            return (
              <ClusterPopover
                cluster={c}
                mapWidth={mapData.width}
                mapHeight={mapData.height}
                markerById={markerById}
                onClose={() => setActiveClusterId(null)}
                onRowClick={(m) => {
                  setActiveSubMarker({ type: m.marker_type, referenceId: m.reference_id });
                  if (m.location_id) {
                    const loc = locations.find((l: any) => l.id === m.location_id);
                    if (loc) { setSelectedLocationId(loc.id); setSelectedLocationKey(loc.location_key); setSelectedLocationName(loc.display_name); }
                  }
                  if (m.x != null && m.y != null) {
                    setFlyTo({ x: m.x * mapData.width, y: m.y * mapData.height });
                    setTimeout(() => setFlyTo(null), 600);
                  }
                  setActiveClusterId(null);
                }}
                onEditPrimary={(primary) => {
                  const custom = customMarkers.find(cm => cm.id === primary.reference_id);
                  if (custom) setEditingCustomMarker(custom);
                  setActiveClusterId(null);
                }}
              />
            );
          })()}
          {zoom >= (mapData.sub_marker_zoom_threshold ?? 0) && customMarkers.length > 0 && (
            <CustomMarkerLayer
              markers={customMarkers as any}
              mapWidth={mapData.width}
              mapHeight={mapData.height}
              typeFilters={{ connection: filters.connection, note: filters.note, building: filters.building, poi: filters.poi }}
              pinnedMarkerKey={pinnedMarkerKey}
              hiddenIds={hiddenCustomIds}
              activeId={movingCustomMarker?.id ?? null}
              onMarkerClick={(m) => {
                if (isCalibrating && groupMode) {
                  setGroupMode(gm => gm && {
                    picks: gm.picks.some(p => p.marker_type === 'custom' && p.reference_id === m.id)
                      ? gm.picks
                      : [...gm.picks, { marker_type: 'custom', reference_id: m.id }]
                  });
                  return;
                }
                if (isCalibrating) {
                  setEditingCustomMarker(m);
                  return;
                }
                if (m.method === 'connection' && m.paired_marker_id != null && m.paired_map_key != null && m.paired_x != null && m.paired_y != null) {
                  navigateToPairedMarker(m.paired_map_key, m.paired_x, m.paired_y);
                  return;
                }
                const key = `custom:${m.id}`;
                setPinnedMarkerKey(prev => (prev === key ? null : key));
              }}
              onMarkerContextMenu={(m) => {
                if (!isCalibrating) return;
                if (!groupMode) {
                  startGroupWith({ marker_type: 'custom', reference_id: m.id });
                } else {
                  setGroupMode(gm => gm && {
                    picks: gm.picks.some(p => p.marker_type === 'custom' && p.reference_id === m.id)
                      ? gm.picks
                      : [...gm.picks, { marker_type: 'custom', reference_id: m.id }]
                  });
                }
              }}
            />
          )}
        </GameMap>
      </div>

      {/* Sidebar expand toggle — shown when collapsed, bottom-left (opposite legend) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute bottom-4 left-4 z-[1001] bg-card/95 backdrop-blur-md border border-border rounded-lg p-2 shadow-lg pointer-events-auto hover:bg-muted/40 transition-colors"
          title="Show panel"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Floating sidebar */}
      {!sidebarCollapsed && (
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
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Hide panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          {!isCalibrating && (
            <PokemonSearch
              game={game}
              onSelect={handleSpeciesSelect}
              onClear={handleSearchClear}
              clearSignal={searchClearSignal}
            />
          )}
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              if (isCalibrating) url.searchParams.delete('calibrate');
              else url.searchParams.set('calibrate', 'true');
              window.history.replaceState({}, '', url.toString());
              window.location.reload();
            }}
            className={`w-full text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              isCalibrating
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
            }`}
          >
            {isCalibrating ? 'Exit Calibrate' : 'Calibrate Markers'}
          </button>
        </div>

        {/* Filter pills */}
        <FilterPills
          game={game}
          counts={(() => {
            const c: any = {};
            for (const m of subMarkers) c[m.marker_type] = (c[m.marker_type] || 0) + 1;
            for (const m of customMarkers) c[m.method] = (c[m.method] || 0) + 1;
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
              onLocationKeyChange={(key) => {
                setCalibrationLocationKey(key);
                // Mirror the behavior of clicking a location pin: fly to the
                // marker and open its guide entry in the sidebar.
                if (!key) return;
                const loc = locations.find((l: any) => l.location_key === key);
                if (!loc) return;
                setSelectedLocationId(loc.id);
                setSelectedLocationKey(loc.location_key);
                setSelectedLocationName(loc.display_name);
                if (mapData) {
                  setFlyTo({ x: loc.x * mapData.width, y: loc.y * mapData.height });
                  setTimeout(() => setFlyTo(null), 600);
                }
              }}
              creatingCustom={creatingCustom}
              onStartCreateCustom={() => setCreatingCustom(true)}
              onOverridesChanged={refetchSubMarkers}
              placingLocationPin={placingLocationPin}
              onStartNewLocationPin={() => setPlacingLocationPin(true)}
            />
          ) : searchEncounters.length > 0 ? (
            <SearchResultsPanel
              encounters={searchEncounters}
              locations={locations}
              game={game}
              onLocationClick={(mapLoc) => {
                setFlyTo({ x: mapLoc.x * mapData.width, y: mapLoc.y * mapData.height });
                setTimeout(() => setFlyTo(null), 600);
                handleLocationClick(mapLoc);
              }}
            />
          ) : selectedLocationId && game ? (
            <LocationDetail
              locationId={selectedLocationId}
              locationName={selectedLocationName}
              game={game}
              flagReport={flagReport}
              locationKey={selectedLocationKey}
              activeSubMarker={activeSubMarker}
              onClearActiveSubMarker={() => setActiveSubMarker(null)}
              overrides={overridesByKey}
              onOverridesChanged={refetchSubMarkers}
              isCalibrating={isCalibrating}
              onFocusMarker={focusSubMarkerOnMap}
              clusters={clusters}
              onStartGroupWith={startGroupWith}
              onSplitRequest={splitRequest}
              onSetPrimaryRequest={setPrimaryRequest}
              onOpenPinEditor={(key: string) => {
                const cluster = clusters.find((c: ClusterData) =>
                  `${c.primary.marker_type}:${c.primary.reference_id}` === key ||
                  c.member_ids.some(mm => `${mm.marker_type}:${mm.reference_id}` === key));
                if (cluster) setEditingPinId(cluster.id);
              }}
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
      )}

      {/* Custom marker editor — top-left overlay in calibration mode */}
      {isCalibrating && mapData && game && (editingCustomMarker || pendingCustomPosition || (creatingCustom && !pairPending)) && (
        <div className="absolute top-14 left-3 z-[1000] w-72 rounded-lg border border-border bg-card/95 backdrop-blur-xl shadow-lg pointer-events-auto">
          <CustomMarkerEditor
            mode={editingCustomMarker ? 'edit' : 'create'}
            game={game}
            mapId={mapData.id}
            marker={editingCustomMarker ?? undefined}
            pendingPosition={pendingCustomPosition ?? undefined}
            onClose={() => { setEditingCustomMarker(null); setPendingCustomPosition(null); setCreatingCustom(false); }}
            onSaved={() => api.guide.subMarkers(mapData.map_key, game).then((rows: any[]) => setCustomMarkers(rows.filter(r => r.type === 'custom')))}
            onRequestPairPlacement={({ labelA, labelB, description }) => {
              setPairPending({ labelA, labelB, description });
              setCreatingCustom(false);
              setPendingCustomPosition(null);
            }}
            onRequestMove={() => {
              // Stash the target, close the editor so the next map click
              // in handleCalibrationClick repositions it.
              setMovingCustomMarker(editingCustomMarker);
              setEditingCustomMarker(null);
            }}
          />
        </div>
      )}

      {/* New location pin modal */}
      {newPinAt && mapData && (
        <LocationPinModal
          locations={locations}
          markers={subMarkers}
          position={newPinAt}
          onCancel={() => setNewPinAt(null)}
          onConfirm={async (p) => {
            await api.guide.createCluster({
              map_key: mapData.map_key,
              kind: 'location_aggregate',
              scope_location_id: p.scope_location_id,
              x: newPinAt.x,
              y: newPinAt.y,
              primary_marker_type: p.primary_marker_type,
              primary_reference_id: p.primary_reference_id,
              hide_members: p.hide_members,
            });
            setNewPinAt(null);
            refetchSubMarkers();
          }}
        />
      )}

      {/* Edit / delete cluster overlay */}
      {editingPinId != null && (() => {
        const editing = clusters.find((c: ClusterData) => c.id === editingPinId);
        return (
        <div className="absolute inset-0 z-[2000] bg-black/40 flex items-center justify-center" onClick={() => setEditingPinId(null)}>
          <div className="bg-card border border-border rounded-lg p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="font-semibold mb-2 text-sm">Edit cluster #{editingPinId}</div>
            {editing && editingPinId! > 0 && (
              <label className="flex items-center gap-2 text-sm mb-3">
                <input
                  type="checkbox"
                  checked={editing.hide_members}
                  onChange={async (e) => {
                    await api.guide.updateCluster(editingPinId!, { hide_members: e.target.checked });
                    refetchSubMarkers();
                  }}
                />
                Hide members
              </label>
            )}
            <button
              onClick={async () => {
                if (editingPinId! > 0) await api.guide.deleteCluster(editingPinId!);
                setEditingPinId(null);
                refetchSubMarkers();
              }}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
            >
              Delete cluster
            </button>
            <button onClick={() => setEditingPinId(null)} className="text-xs px-2 py-1 ml-2">Cancel</button>
          </div>
        </div>
        );
      })()}

      {/* Group-with floating bar */}
      {isCalibrating && groupMode && (
        <GroupWithBar
          count={groupMode.picks.length}
          onCancel={() => setGroupMode(null)}
          onNext={() => setGroupPrimaryPickerOpen(true)}
        />
      )}

      {/* Primary picker modal */}
      {groupMode && groupPrimaryPickerOpen && (
        <div className="absolute inset-0 z-[2000] bg-black/40 flex items-center justify-center"
             onClick={() => setGroupPrimaryPickerOpen(false)}>
          <div className="bg-card border border-border rounded-lg p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="font-semibold mb-2 text-sm">Pick primary</div>
            <ul className="mb-3 space-y-1">
              {groupMode.picks.map(p => {
                const m = markerById.get(`${p.marker_type}:${p.reference_id}`);
                return (
                  <li key={`${p.marker_type}:${p.reference_id}`}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="primary"
                        checked={primaryPick?.marker_type === p.marker_type && primaryPick?.reference_id === p.reference_id}
                        onChange={() => setPrimaryPick(p)} />
                      {m?.name ?? `${p.marker_type} ${p.reference_id}`}
                    </label>
                  </li>
                );
              })}
            </ul>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={hideMembers} onChange={e => setHideMembers(e.target.checked)} />
              Hide members {sameLocation ? '(location-aggregate pin)' : '(proximity cluster)'}
            </label>
            <div className="flex justify-end gap-2">
              <button className="text-xs px-2 py-1" onClick={() => setGroupPrimaryPickerOpen(false)}>Cancel</button>
              <button className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40"
                      onClick={confirmGroup} disabled={!primaryPick}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Pair-placement status banner */}
      {isCalibrating && pairPending && (
        <div className="absolute top-14 left-3 z-[1000] rounded-lg border border-primary bg-primary/10 backdrop-blur-xl shadow-lg px-3 py-2 pointer-events-auto text-xs font-medium flex items-center gap-3">
          <span className="text-primary animate-pulse">
            {pairPending.aPos ? `Click point B — "${pairPending.labelB}"` : `Click point A — "${pairPending.labelA}"`}
          </span>
          <button
            onClick={() => setPairPending(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

{/* Map legend — bottom right (collapsible) */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
      {legendCollapsed ? (
        <button
          onClick={() => setLegendCollapsed(false)}
          className="bg-card/90 backdrop-blur-md border border-border rounded-lg p-2 shadow-lg hover:bg-muted/40 transition-colors"
          title="Show legend"
        >
          <BookMarked className="w-4 h-4" />
        </button>
      ) : (
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-lg px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Map Legend</div>
          <button
            onClick={() => setLegendCollapsed(true)}
            className="p-0.5 -mr-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Hide legend"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
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
      )}
      </div>
    </div>
  );
}
