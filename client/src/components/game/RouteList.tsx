import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { GamePill } from '@/components/icons';
import { api } from '../../api/client';
import { EncounterTable } from './EncounterTable';
import { VERSION_SLUG_TO_DISPLAY, METHOD_TO_HUNT_MODE } from './types';
import type { LocationInfo, EncounterEntry } from './types';

// In-memory cache for route encounter details (persists across re-renders)
const routeCache = new Map<string, EncounterEntry[]>();

interface RouteListProps {
  speciesId: number;
  locationsByGame: Record<string, LocationInfo[]>;
  onStartHunt: (game: string, encounterMethod?: string) => void;
}

export function RouteList({ speciesId, locationsByGame, onStartHunt }: RouteListProps) {
  const [selectedGame, setSelectedGame] = useState<string>(() => {
    const games = Object.keys(locationsByGame);
    return games.length > 0 ? games[0] : '';
  });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [routeEncounters, setRouteEncounters] = useState<Record<string, EncounterEntry[]>>({});
  const [routeLoading, setRouteLoading] = useState<string | null>(null);

  const gamePillOptions = useMemo(() => {
    return Object.keys(locationsByGame).map(game => ({
      value: game,
      label: game.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    }));
  }, [locationsByGame]);

  const currentRoutes = useMemo(() => {
    return locationsByGame[selectedGame] || [];
  }, [locationsByGame, selectedGame]);

  if (gamePillOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not found in the wild. May require trading, breeding, events, or evolving.
      </p>
    );
  }

  return (
    <>
      {/* Game filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {gamePillOptions.map(opt => {
          const isSelected = selectedGame === opt.value;
          const displayName = VERSION_SLUG_TO_DISPLAY[opt.value] || opt.label;
          return (
            <span
              key={opt.value}
              className={`cursor-pointer transition-opacity ${isSelected ? '' : 'opacity-30 hover:opacity-60'}`}
              onClick={() => {
                setSelectedGame(opt.value);
                setExpandedRoute(null);
              }}
            >
              <GamePill game={displayName} size="sm" />
            </span>
          );
        })}
      </div>

      {/* Route accordion cards */}
      <div className="space-y-2">
        {currentRoutes.map(route => {
          const cacheKey = `${route.slug}:${selectedGame}`;
          const encounters = routeEncounters[cacheKey];
          const isLoading = routeLoading === route.slug;
          const isExpanded = expandedRoute === route.slug;

          return (
            <Collapsible
              key={route.slug}
              open={isExpanded}
              onOpenChange={(open) => {
                setExpandedRoute(open ? route.slug : null);
                if (open) {
                  // Lazy-load encounters
                  const ck = `${route.slug}:${selectedGame}`;
                  if (routeCache.has(ck)) {
                    setRouteEncounters(prev => ({ ...prev, [ck]: routeCache.get(ck)! }));
                  } else {
                    setRouteLoading(route.slug);
                    api.encounters.locationArea(route.slug, selectedGame).then(data => {
                      routeCache.set(ck, data);
                      setRouteEncounters(prev => ({ ...prev, [ck]: data }));
                      setRouteLoading(null);
                    }).catch(() => setRouteLoading(null));
                  }
                }
              }}
              className="bg-white rounded-lg overflow-hidden shadow-sm"
            >
              {/* Header -- always visible */}
              <CollapsibleTrigger className="px-3 py-2.5 flex justify-between items-center cursor-pointer hover:bg-surface transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs capitalize">{route.displayName}</span>
                  {encounters && !isExpanded && (
                    <span className="text-2xs text-muted-foreground bg-surface-raised px-2 py-0.5 rounded-full">
                      {encounters.length} Pokemon
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const method = encounters?.find(en => en.species_id === speciesId)?.method;
                    onStartHunt(selectedGame, method);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isExpanded
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-surface-raised text-muted-foreground hover:bg-surface-sunken'
                  }`}
                >
                  Start Hunt →
                </button>
              </CollapsibleTrigger>

              {/* Expanded encounter table */}
              <CollapsibleContent className="px-3 pb-3 border-t border-[#f0eeeb]">
                {isLoading ? (
                  <div className="text-xs text-muted-foreground py-3 text-center">Loading encounters...</div>
                ) : encounters ? (
                  <EncounterTable encounters={encounters} speciesId={speciesId} />
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </>
  );
}
