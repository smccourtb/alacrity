import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '../api/client';
import { RouteList } from './game/RouteList';
import { MovesTab } from './game/MovesTab';
import { ShinyInfoTab } from './game/ShinyInfoTab';
import { METHOD_TO_HUNT_MODE } from './game/types';
import type { LocationInfo, MoveEntry } from './game/types';

const POKE_API = 'https://pokeapi.co/api/v2';

const pokeApiCache = new Map<string, any>();
async function cachedFetch(url: string) {
  if (pokeApiCache.has(url)) return pokeApiCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: ${url}`);
  const data = await res.json();
  pokeApiCache.set(url, data);
  return data;
}

interface Props {
  speciesId: number;
  onClose?: () => void;
}

export default function GameInfo({ speciesId, onClose }: Props) {
  const navigate = useNavigate();

  const [locationsByGame, setLocationsByGame] = useState<Record<string, LocationInfo[]>>({});
  const [rawMoves, setRawMoves] = useState<Record<string, MoveEntry[]>>({});
  const [shinyAvail, setShinyAvail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Initial data fetch ---
  useEffect(() => {
    setLoading(true);
    Promise.all([
      cachedFetch(`${POKE_API}/pokemon/${speciesId}/encounters`),
      cachedFetch(`${POKE_API}/pokemon/${speciesId}`),
      api.species.get(speciesId),
    ]).then(([loc, poke, speciesData]) => {
      // Build locations grouped by game version, preserving slugs
      const grouped: Record<string, LocationInfo[]> = {};
      for (const entry of loc) {
        const slug = entry.location_area.name;
        const displayName = slug.replace(/-/g, ' ');
        for (const ver of entry.version_details) {
          const game = ver.version.name;
          if (!grouped[game]) grouped[game] = [];
          if (!grouped[game].some((l: LocationInfo) => l.slug === slug)) {
            grouped[game].push({ slug, displayName });
          }
        }
      }
      setLocationsByGame(grouped);

      // Moves
      const movesByMethod: Record<string, Record<string, Set<string>>> = {
        egg: {}, tutor: {}, machine: {},
      };
      for (const m of poke.moves) {
        for (const vg of m.version_group_details) {
          const method = vg.move_learn_method.name;
          if (!movesByMethod[method]) continue;
          const moveName = m.move.name.replace(/-/g, ' ');
          if (!movesByMethod[method][moveName]) movesByMethod[method][moveName] = new Set();
          movesByMethod[method][moveName].add(vg.version_group.name);
        }
      }
      const processed: Record<string, MoveEntry[]> = {};
      for (const [method, moves] of Object.entries(movesByMethod)) {
        processed[method] = Object.entries(moves)
          .map(([name, versions]) => ({ name, versions: Array.from(versions) }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      setRawMoves(processed);

      setShinyAvail(speciesData.shiny_availability || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [speciesId]);

  // --- Start Hunt CTA ---
  const handleStartHunt = useCallback((game: string, encounterMethod?: string) => {
    const mode = encounterMethod ? (METHOD_TO_HUNT_MODE[encounterMethod] || 'wild') : 'wild';
    const params = new URLSearchParams({
      game,
      target: String(speciesId),
      mode,
    });
    onClose?.();
    navigate(`/hunt?${params}`);
  }, [speciesId, navigate, onClose]);

  if (loading) return <div className="text-sm text-muted-foreground py-3">Loading game info...</div>;

  return (
    <Tabs defaultValue="encounters" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="encounters" className="flex-1">Encounters</TabsTrigger>
        <TabsTrigger value="moves" className="flex-1">Moves</TabsTrigger>
        <TabsTrigger value="shiny" className="flex-1">Shiny Info</TabsTrigger>
      </TabsList>

      <TabsContent value="encounters" className="space-y-3 pt-2">
        <RouteList
          speciesId={speciesId}
          locationsByGame={locationsByGame}
          onStartHunt={handleStartHunt}
        />
      </TabsContent>

      <TabsContent value="moves" className="space-y-3 pt-2">
        <MovesTab rawMoves={rawMoves} />
      </TabsContent>

      <TabsContent value="shiny" className="space-y-3 pt-2">
        <ShinyInfoTab speciesId={speciesId} shinyAvail={shinyAvail} />
      </TabsContent>
    </Tabs>
  );
}
