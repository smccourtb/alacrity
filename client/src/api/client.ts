import { getServerBase } from '../lib/tauri.js';
import { dependenciesApi } from './dependencies.js';
import { configApi } from './config.js';

function getBase() {
  const server = getServerBase();
  return server ? `${server}/api` : '/api';
}

export interface CollectionEntry {
  identity_id: number;
  species_id: number;
  level: number;
  box_slot: string;
  checkpoint_id: number | null;
  bank_file_id: number | null;
  snapshot_data: string | null;
  game: string | null;
  playthrough_id: number | null;
  ot_name: string | null;
  ot_tid: number | null;
  sighting_created_at: string;
  is_home: boolean;
}

export interface CollectionGoal {
  id: number;
  name: string;
  filters: string;
  scope: string;
  target_count: number;
  is_default: number;
  created_at: string;
}

export interface SubMarker {
  id: number;
  type: 'trainer' | 'item' | 'tm' | 'event' | 'custom';
  name: string;
  detail: string | null;
  location_key: string;
  location_name: string;
  location_id: number;
  x: number | null;
  y: number | null;
  method: string | null;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = `${options?.method || 'GET'}:${path}`;
  const isGet = !options?.method || options.method === 'GET';

  // Return cached data for GET requests (skip cache for status/stream endpoints)
  const skipCache = path.includes('/status') || path.includes('/stream') || path.includes('/sessions');
  if (isGet && !skipCache && cache.has(key)) {
    const cached = cache.get(key)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
    cache.delete(key);
  }

  const res = await fetch(`${getBase()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const data = await res.json();

  // Cache GET responses (skip for live data)
  if (isGet && !skipCache) cache.set(key, { data, timestamp: Date.now() });

  // Invalidate related caches on mutations
  if (!isGet) {
    for (const k of cache.keys()) {
      if (k.startsWith('GET:') && k.includes(path.split('/')[1])) {
        cache.delete(k);
      }
    }
  }

  return data;
}

// Invalidate specific cache entries
export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) { cache.clear(); return; }
  for (const k of cache.keys()) {
    if (k.includes(pathPrefix)) cache.delete(k);
  }
}

export const api = {
  species: {
    list: (params?: { gen?: number; type?: string; include_forms?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.gen) q.set('gen', String(params.gen));
      if (params?.type) q.set('type', params.type);
      if (params?.include_forms) q.set('include_forms', 'true');
      return request<any[]>(`/species?${q}`);
    },
    get: (id: number) => request<any>(`/species/${id}`),
    forms: (id: number) => request<any[]>(`/species/${id}/forms`),
  },
  reference: {
    ribbons: () => request<any[]>('/reference/ribbons'),
    marks: () => request<any[]>('/reference/marks'),
    balls: () => request<any[]>('/reference/balls'),
    forms: (params?: { species_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.species_id) q.set('species_id', String(params.species_id));
      return request<any[]>(`/reference/forms?${q}`);
    },
    shinyMethods: (params?: { species_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.species_id) q.set('species_id', String(params.species_id));
      return request<any[]>(`/reference/shiny-methods?${q}`);
    },
  },
  legality: {
    balls: (speciesId: number) => request<{
      species_id: number;
      ball_permit: number;
      legal_balls: string[];
      category: string | null;
    }>(`/legality/balls/${speciesId}`),
    shiny: (speciesId: number) => request<{
      species_id: number;
      shiny_locks: Array<{ form: number; game: string }>;
      is_globally_shiny_locked: boolean;
    }>(`/legality/shiny/${speciesId}`),
    gameVersions: () => request<Array<{
      id: number;
      name: string;
      generation: number;
      origin_mark: string;
      max_species_id: number;
      sort_order: number;
    }>>('/legality/game-versions'),
    categories: () => request<Array<{
      id: number;
      name: string;
      category: string;
    }>>('/legality/categories'),
  },
  pokemon: {
    list: (params?: { shiny?: boolean; species_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.shiny !== undefined) q.set('shiny', String(params.shiny));
      if (params?.species_id) q.set('species_id', String(params.species_id));
      return request<any[]>(`/pokemon?${q}`);
    },
    completion: () => request<any>('/pokemon/completion'),
    completionForSpecies: (id: number) => request<any>(`/pokemon/completion/species/${id}`),
    create: (data: any) => {
      invalidateCache('/pokemon');
      return request<any>('/pokemon', { method: 'POST', body: JSON.stringify(data) });
    },
    update: (id: number, data: any) => {
      invalidateCache('/pokemon');
      return request<any>(`/pokemon/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete: (id: number) => {
      invalidateCache('/pokemon');
      return request<void>(`/pokemon/${id}`, { method: 'DELETE' });
    },
    syncPreview: () => request<{
      auto_imported_count: number;
      manually_edited: Array<{
        id: number;
        species_id: number;
        species_name: string;
        nickname: string;
        manual_fields: string;
        source_save: string;
      }>;
    }>('/pokemon/sync/preview'),
    sync: (keepIds?: number[]) => {
      invalidateCache('/pokemon');
      return request<{
        cleared: number;
        imported: number;
        skipped: number;
        total_parsed: number;
        by_source: Record<string, number>;
      }>('/pokemon/sync', {
        method: 'POST',
        body: JSON.stringify({ keep_ids: keepIds }),
      });
    },
  },
  hunts: {
    list: (opts?: { archived?: boolean }) => request<any[]>(opts?.archived ? '/hunts?archived=true' : '/hunts'),
    presets: () => request<any[]>('/hunts/presets'),
    gameConfigs: () => request<any[]>('/hunts/game-configs'),
    daycareInfo: (savPath: string, game: string) => request<any>('/hunts/daycare-info', { method: 'POST', body: JSON.stringify({ sav_path: savPath, game }) }),
    files: () => request<{ roms: any[]; saves: any[]; scripts: any[] }>('/hunts/files'),
    create: (data: any) => request<any>('/hunts', { method: 'POST', body: JSON.stringify(data) }),
    stop: (id: number) => request<any>(`/hunts/${id}/stop`, { method: 'POST' }),
    resume: (id: number) => request<any>(`/hunts/${id}/resume`, { method: 'POST' }),
    archive: (id: number) => request<any>(`/hunts/${id}/archive`, { method: 'POST' }),
    unarchive: (id: number) => request<any>(`/hunts/${id}/unarchive`, { method: 'POST' }),
    status: (id: number) => request<any>(`/hunts/${id}/status`),
    hitInfo: (id: number) => request<any>(`/hunts/${id}/hit-info`),
    open: (id: number, instance: number) => request<any>(`/hunts/${id}/open`, { method: 'POST', body: JSON.stringify({ instance }) }),
    saveCatch: (id: number, instance: number) => request<any>(`/hunts/${id}/save-catch`, { method: 'POST', body: JSON.stringify({ instance }) }),
    saveToLibrary: (id: number, instance: number, name?: string) => request<any>(`/hunts/${id}/save-to-library`, { method: 'POST', body: JSON.stringify({ instance, name }) }),
    pushTo3DS: (id: number, instance: number) => request<any>(`/hunts/${id}/push-3ds`, { method: 'POST', body: JSON.stringify({ instance }) }),
    browse: (path: string, exts?: string[]) => {
      const q = new URLSearchParams({ path });
      if (exts?.length) q.set('exts', exts.join(','));
      return request<{ path: string; parent: string; entries: { name: string; path: string; isDir: boolean }[] }>(`/hunts/browse?${q}`);
    },
    stream: (id: number) => new EventSource(`${getBase()}/hunts/${id}/stream`),
  },
  threeDS: {
    discover: () => request<{ found: boolean; ip: string | null; port: number | null }>('/3ds/discover'),
    sync: (ip: string, port?: number) => request<any>('/3ds/sync', {
      method: 'POST',
      body: JSON.stringify({ ip, port: port || 5000 }),
    }),
    status: () => request<any>('/3ds/status'),
    parse: () => request<any>('/3ds/parse', { method: 'POST' }),
  },
  saves: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/saves${qs}`);
    },
    heads: () => request<any[]>('/saves/heads'),
    rescan: () => {
      invalidateCache('/saves');
      return request<any>('/saves/rescan', { method: 'POST' });
    },
    update: (id: number, data: { label?: string; notes?: string }) => {
      invalidateCache('/saves');
      return request<any>(`/saves/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    upload: (file: File, game?: string) => {
      const form = new FormData();
      form.append('file', file);
      if (game) form.append('game', game);
      invalidateCache('/saves');
      return fetch(`${getBase()}/saves/upload`, { method: 'POST', body: form }).then(r => r.json());
    },
    backup: (id: number) => {
      invalidateCache('/saves');
      return request<any>(`/saves/${id}/backup`, { method: 'POST' });
    },
    delete: (id: number) => {
      invalidateCache('/saves');
      return request<void>(`/saves/${id}`, { method: 'DELETE' });
    },
    importDirectory: (path: string) => request<any>('/saves/import-directory', { method: 'POST', body: JSON.stringify({ path }) }),
  },
  launcher: {
    preview: (id: string) => request<any>(`/launcher/saves/${id}/preview`),
    saveFile: (id: string) => `${getBase()}/launcher/saves/${id}/file`,
    romUrl: (game: string) => `${getBase()}/launcher/rom/${encodeURIComponent(game)}`,
    uploadSave: (id: string, data: ArrayBuffer, action: string, name?: string) => {
      const params = new URLSearchParams({ action });
      if (name) params.set('name', name);
      return fetch(`${getBase()}/launcher/saves/${id}/upload-save?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: data,
      }).then(r => r.json());
    },
    emulators: () => request<any[]>('/launcher/emulators'),
    updateEmulator: (id: string, data: any) => {
      invalidateCache('/launcher');
      return request<any>(`/launcher/emulators/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    play: (saveId: string, emulatorId?: string) => {
      invalidateCache('/launcher');
      return request<any>('/launcher/play', {
        method: 'POST',
        body: JSON.stringify({ saveId, emulatorId }),
      });
    },
    trade: (saveId1: string, saveId2: string, emulatorId?: string) => {
      invalidateCache('/launcher');
      return request<any>('/launcher/trade', {
        method: 'POST',
        body: JSON.stringify({ saveId1, saveId2, emulatorId }),
      });
    },
    sessions: () => request<any[]>('/launcher/sessions'),
    resolveSession: (id: string, action: string, newName?: string, createCheckpoint?: boolean, includeInCollection?: boolean) => {
      invalidateCache('/launcher');
      return request<any>(`/launcher/sessions/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, newName, createCheckpoint, includeInCollection }),
      });
    },
    sessionStream: () => new EventSource(`${getBase()}/launcher/sessions/stream`),
  },
  encounters: {
    locationArea: (name: string, game: string) =>
      request<Array<{
        species_id: number;
        name: string;
        method: string;
        min_level: number;
        max_level: number;
        chance: number;
        conditions: string[];
      }>>(`/encounters/location-area/${encodeURIComponent(name)}?game=${encodeURIComponent(game)}`),
  },
  moves: {
    lookup: (names: string[]) => request<any[]>(`/moves?names=${names.join(',')}`),
    search: (q: string) => request<any[]>(`/moves/search?q=${encodeURIComponent(q)}`),
  },
  guide: {
    maps: () => request<any[]>('/guide/maps'),
    map: (mapKey: string) => request<any>(`/guide/maps/${mapKey}`),
    locations: (mapKey: string) => request<any[]>(`/guide/locations/${mapKey}`),
    walkthrough: (game: string) => request<any[]>(`/guide/walkthrough/${game}`),
    encounters: (locationId: number, game: string) =>
      request<any[]>(`/guide/encounters/${locationId}?game=${game}`),
    progress: (game: string, saveId: number) =>
      request<any>(`/guide/progress/${game}/${saveId}`),
    toggleProgress: (stepId: number, data: { save_file_id?: number; completed: boolean; notes?: string }) => {
      invalidateCache('/guide');
      return request<any>(`/guide/progress/${stepId}`, { method: 'POST', body: JSON.stringify(data) });
    },
    campaign: () => request<any>('/guide/campaign'),
    scanCompletion: () => {
      invalidateCache('/guide');
      invalidateCache('/specimens');
      return request<any>('/guide/scan-completion', { method: 'POST' });
    },
    updateLocationPosition: (id: number, x: number, y: number) => {
      invalidateCache('/guide/locations');
      return request<{ ok: boolean }>(`/guide/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
    },
    linkStepSave: (stepId: number, save_file_id: number | null) =>
      request<any>(`/guide/steps/${stepId}/save`, {
        method: 'PATCH',
        body: JSON.stringify({ save_file_id }),
      }),
    subMarkers(mapKey: string, game?: string) {
      const params = game ? `?game=${game}` : '';
      return request<SubMarker[]>(`/guide/sub-markers/${mapKey}${params}`);
    },
    updateSubMarkerPosition(table: string, id: number, x: number, y: number) {
      return request(`/guide/sub-markers/${table}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
    },
    createCustomMarker(data: { map_id: number; game?: string; label: string; marker_type?: string; description?: string; x: number; y: number; color?: string; icon?: string }) {
      return request<{ id: number }>('/guide/custom-markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    deleteCustomMarker(id: number) {
      return request('/guide/custom-markers/' + id, { method: 'DELETE' });
    },
    updateCustomMarkerPosition(id: number, x: number, y: number) {
      return request(`/guide/custom-markers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
    },
    exportSubMarkers(mapKey: string) {
      return request(`/guide/sub-markers/export/${mapKey}`);
    },
    importSubMarkers(mapKey: string, data: Record<string, any[]>) {
      return request(`/guide/sub-markers/import/${mapKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    markers: (mapKey: string, game?: string) =>
      request<any[]>(`/guide/markers/${mapKey}${game ? `?game=${game}` : ''}`),
    createMarker: (data: { map_key: string; marker_type: string; reference_id: number; x: number; y: number; game_override?: string | null }) => {
      invalidateCache('/guide/markers');
      return request<{ id: number }>('/guide/markers', { method: 'POST', body: JSON.stringify(data) });
    },
    updateMarker: (id: number, pos: { x: number; y: number }) => {
      invalidateCache('/guide/markers');
      return request<{ ok: boolean }>(`/guide/markers/${id}`, { method: 'PATCH', body: JSON.stringify(pos) });
    },
    deleteMarker: (id: number) => {
      invalidateCache('/guide/markers');
      return request<{ ok: boolean }>(`/guide/markers/${id}`, { method: 'DELETE' });
    },
    updateSubMarkerDescription: (type: string, id: number, description: string) => {
      invalidateCache('/guide/location-detail');
      return request<{ ok: boolean }>(`/guide/sub-marker/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      });
    },
    exportMarkers: (mapKey: string) =>
      request<any[]>(`/guide/markers/${mapKey}/export`),
    importMarkers: (mapKey: string, markers: any[]) => {
      invalidateCache('/guide/markers');
      return request<{ imported: number }>(`/guide/markers/${mapKey}/import`, {
        method: 'POST', body: JSON.stringify({ markers }),
      });
    },
    locationDetail: (locationId: number, game: string) =>
      request<{
        items: any[];
        trainers: any[];
        tms: any[];
        events: any[];
        encounters: any[];
        wiki_prose: string | null;
        wiki_callouts: Array<{ type: string; text: string }>;
      }>(`/guide/location-detail/${locationId}/${game}`),
    speciesLocations: (speciesId: number, game: string) =>
      request<Array<{
        location_id: number;
        location_key: string;
        display_name: string;
        method: string;
        level_min: number;
        level_max: number;
        encounter_rate: number | null;
        time_of_day: string | null;
      }>>(`/guide/species-locations/${speciesId}/${game}`),
    speciesSearch: (q: string, game: string) =>
      request<Array<{
        id: number;
        name: string;
        sprite_url: string;
        type1: string;
        type2: string;
      }>>(`/guide/species-search?q=${encodeURIComponent(q)}&game=${game}`),
    gameMap: (game: string) => request<any>(`/guide/game-map/${game}`),
    locationCollectionStatus: (locationId: number, game?: string) => {
      const q = game ? `?game=${encodeURIComponent(game)}` : '';
      return request<{ encounters: Array<{ species_id: number; species_name: string; sprite_url: string; caught: boolean }>; summary: { total: number; caught: number } }>(
        `/guide/location/${locationId}/collection-status${q}`
      );
    },
  },
  flags: {
    definitions: (game: string) =>
      request<any[]>(`/flags/${game}/definitions`),
    parse: (game: string, saveFileId: number) =>
      request<{
        game: string;
        total_flags: number;
        set_flags: number;
        flags_by_location: Record<string, { total: number; set: number; flags: any[] }>;
        flags_by_category: Record<string, { total: number; set: number }>;
        currentLocationKey?: string;
      }>(`/flags/${game}/${saveFileId}`),
  },
  playthroughs: {
    list: () => request<any[]>('/playthroughs'),
    get: (id: number) => request<any>(`/playthroughs/${id}`),
    create: (data: any) => {
      invalidateCache('/playthroughs');
      return request<any>('/playthroughs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    update: (id: number, data: any) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    delete: (id: number) => {
      invalidateCache('/playthroughs');
      return request<void>(`/playthroughs/${id}`, { method: 'DELETE' });
    },
    reset: (id: number) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/${id}/reset`, { method: 'POST' });
    },
    checkpoints: (id: number) => request<any[]>(`/playthroughs/${id}/checkpoints`),
    createCheckpoint: (id: number, data: any) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/${id}/checkpoints`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    checkpointState: (checkpointId: number) => request<any>(`/playthroughs/checkpoints/${checkpointId}/state`),
    updateCheckpoint: (checkpointId: number, data: any) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/checkpoints/${checkpointId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    deleteCheckpoint: (checkpointId: number) => {
      invalidateCache('/playthroughs');
      return request<void>(`/playthroughs/checkpoints/${checkpointId}`, { method: 'DELETE' });
    },
    goals: (id: number) => request<any[]>(`/playthroughs/${id}/goals`),
    addGoal: (id: number, data: any) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/${id}/goals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    updateGoal: (goalId: number, data: any) => {
      invalidateCache('/playthroughs');
      return request<any>(`/playthroughs/goals/${goalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    deleteGoal: (goalId: number) => {
      invalidateCache('/playthroughs');
      return request<void>(`/playthroughs/goals/${goalId}`, { method: 'DELETE' });
    },
  },
  specimens: {
    legs: () => request<any[]>('/specimens/legs'),
    updateLeg: (key: string, data: { status: string }) => {
      invalidateCache('/specimens');
      return request<any>(`/specimens/legs/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    targets: (params?: { leg?: string; game?: string; species_id?: number; category?: string; status?: string }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return request<any[]>(`/specimens/targets${qs}`);
    },
    target: (id: number) => request<any>(`/specimens/targets/${id}`),
    updateTarget: (id: number, data: any) => {
      invalidateCache('/specimens');
      return request<any>(`/specimens/targets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    createTarget: (data: { species_id: number; description: string; source_game?: string; notes?: string; leg_key?: string }) =>
      request<any>('/specimens/targets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProgress: (targetId: number, data: any) => {
      invalidateCache('/specimens');
      return request<any>(`/specimens/progress/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    updateTask: (taskId: number, data: { status?: string; notes?: string; save_file_id?: number | null }) => {
      invalidateCache('/specimens');
      return request<any>(`/specimens/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    summary: (params?: { leg?: string }) => {
      const qs = params?.leg ? `?leg=${params.leg}` : '';
      return request<any[]>(`/specimens/summary${qs}`);
    },
  },
  stream: {
    start: (savePath: string | undefined, game: string) =>
      request<{ sessionId: string; system: string }>('/stream/start', {
        method: 'POST',
        body: JSON.stringify({ savePath, game }),
      }),
    offer: (sessionId: string, sdp: string) =>
      request<{ sdp: string }>('/stream/offer', {
        method: 'POST',
        body: JSON.stringify({ sessionId, sdp }),
      }),
    stop: (sessionId: string) =>
      request<{ sessionId: string; saveChanged: boolean }>('/stream/stop', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
    resolve: (sessionId: string, action: string, newName?: string) =>
      request<{ success: boolean; newPath?: string }>('/stream/resolve', {
        method: 'POST',
        body: JSON.stringify({ sessionId, action, newName }),
      }),
    sessions: () => request<any[]>('/stream/sessions'),
    emulators: () => request<Record<string, boolean>>('/stream/emulators'),
    games: () => request<{ game: string; system: string }[]>('/stream/games'),
    launch: (game: string, savePath?: string) =>
      request<{ success: boolean; game: string; pid: number }>('/stream/launch', {
        method: 'POST',
        body: JSON.stringify({ game, savePath }),
      }),
  },
  timeline: {
    playthroughs: () => request<any[]>('/playthroughs'),
    tree: (playthroughId: number) => request<any>(`/timeline/playthroughs/${playthroughId}/tree`),
    orphans: (game?: string) => request<any>(`/timeline/orphans${game ? `?game=${encodeURIComponent(game)}` : ''}`),
    scan: (game?: string, saveFileId?: number) =>
      request<any>('/timeline/scan', { method: 'POST', body: JSON.stringify({ game, save_file_id: saveFileId }), headers: { 'Content-Type': 'application/json' } }),
    updateCheckpoint: (id: number, data: { label?: string; notes?: string; is_branch?: number; needs_confirmation?: number; parent_checkpoint_id?: number | null }) =>
      request<any>(`/playthroughs/checkpoints/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    createCheckpoint: (playthroughId: number, data: { save_file_id: number; parent_checkpoint_id?: number; label?: string }) =>
      request<any>(`/playthroughs/${playthroughId}/checkpoints`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    deleteCheckpoint: (id: number) =>
      request<any>(`/playthroughs/checkpoints/${id}`, { method: 'DELETE' }),
    toggleCheckpointCollection: (id: number, include: boolean) => {
      invalidateCache('/timeline');
      return request<any>(`/timeline/checkpoints/${id}/collection`, {
        method: 'PATCH',
        body: JSON.stringify({ include }),
      });
    },
    toggleCheckpointArchive: (id: number, archived: boolean) => {
      invalidateCache('/timeline');
      return request<any>(`/timeline/checkpoints/${id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archived }),
      });
    },
    togglePlaythroughCollection: (id: number, include: boolean) => {
      invalidateCache('/timeline');
      return request<any>(`/timeline/playthroughs/${id}/collection`, {
        method: 'PATCH',
        body: JSON.stringify({ include }),
      });
    },
  },
  collection: {
    dashboard: (params?: { leg?: string }) =>
      request<any>(`/collection/dashboard${params?.leg ? `?leg=${params.leg}` : ''}`),
    scanAll: () => request<any>('/collection/scan/all', { method: 'POST' }),
    scanCheckpoint: (id: number) => request<any>(`/collection/scan/checkpoint/${id}`, { method: 'POST' }),
    list: (params?: { playthrough_id?: number; game?: string }) => {
      const q = new URLSearchParams();
      if (params?.playthrough_id != null) q.set('playthrough_id', String(params.playthrough_id));
      if (params?.game) q.set('game', params.game);
      const qs = q.toString() ? `?${q}` : '';
      return request<CollectionEntry[]>(`/collection${qs}`);
    },
    sourceCounts: () => request<{ save: number; bank: number; manual: number }>('/collection/sources'),
    sightings: (id: number) => request<any[]>(`/collection/${id}/sightings`),
    confirm: (id: number, confirmed: boolean) => {
      invalidateCache('/collection');
      return request<any>(`/collection/${id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmed }),
      });
    },
    goals: {
      list: () => request<CollectionGoal[]>('/collection/goals'),
      create: (data: any) => {
        invalidateCache('/collection/goals');
        return request<CollectionGoal>('/collection/goals', { method: 'POST', body: JSON.stringify(data) });
      },
      update: (id: number, data: any) => {
        invalidateCache('/collection/goals');
        return request<CollectionGoal>(`/collection/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      },
      delete: (id: number) => {
        invalidateCache('/collection/goals');
        return request<void>(`/collection/goals/${id}`, { method: 'DELETE' });
      },
    },
  },
  clientInfo: () => request<{ isLocal: boolean }>('/client-info'),
  dependencies: dependenciesApi,
  config: configApi,
};
