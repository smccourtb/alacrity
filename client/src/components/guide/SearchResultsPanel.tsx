import { useMemo } from 'react';
import { Sunrise, Sun, Moon, Fish, TreePine, Pin, Footprints, Waves, Hammer, Mountain, Gift, Sparkles, Trophy } from 'lucide-react';
import { Sprite, type PokemonStyle } from '@/components/Sprite';

interface Encounter {
  species_id: number;
  species_name: string;
  sprite_url: string | null;
  location_id: number;
  method: string;
  level_min: number;
  level_max: number;
  encounter_rate: number | null;
  time_of_day: string | null;
}

interface MapLocation {
  id: number;
  display_name: string;
  location_key: string;
  x: number;
  y: number;
}

const METHOD_ICONS: Record<string, typeof Sun> = {
  walk: Footprints, grass: Footprints,
  surf: Waves,
  'old-rod': Fish, 'good-rod': Fish, 'super-rod': Fish,
  headbutt: TreePine,
  'rock-smash': Hammer,
  cave: Mountain,
  static: Pin, stationary: Pin,
  gift: Gift,
  special: Sparkles,
  contest: Trophy,
};

const METHOD_LABELS: Record<string, string> = {
  grass: 'Grass', walk: 'Grass', surf: 'Surf',
  'old-rod': 'Old Rod', 'good-rod': 'Good Rod', 'super-rod': 'Super Rod',
  headbutt: 'Headbutt', 'rock-smash': 'Rock Smash',
  cave: 'Cave',
  gift: 'Gift', static: 'Stationary', stationary: 'Stationary',
  special: 'Special', contest: 'Contest',
};

const TOD_ICON: Record<string, { Icon: typeof Sun; color: string }> = {
  morning: { Icon: Sunrise, color: 'text-amber-400' },
  day: { Icon: Sun, color: 'text-yellow-400' },
  night: { Icon: Moon, color: 'text-indigo-400' },
};

// Mirror of the per-game sprite helper in LocationDetail.tsx so the search
// panel matches the location detail row visuals.
const GAME_SPRITE_STYLE: Record<string, PokemonStyle> = {
  red: 'gen1-red-blue', blue: 'gen1-red-blue', yellow: 'gen1-yellow',
  gold: 'gen2-gold', silver: 'gen2-silver', crystal: 'gen2-crystal',
  ruby: 'gen3-ruby-sapphire', sapphire: 'gen3-ruby-sapphire',
  emerald: 'gen3-emerald',
  firered: 'gen3-firered-leafgreen', leafgreen: 'gen3-firered-leafgreen',
  diamond: 'gen4-diamond-pearl', pearl: 'gen4-diamond-pearl',
  platinum: 'gen4-platinum',
  heartgold: 'gen4-heartgold-soulsilver', soulsilver: 'gen4-heartgold-soulsilver',
  black: 'gen5-black-white', white: 'gen5-black-white',
  black2: 'gen5-black-white', white2: 'gen5-black-white',
  x: 'gen6-x-y', y: 'gen6-x-y',
  omegaruby: 'gen6-omegaruby-alphasapphire', alphasapphire: 'gen6-omegaruby-alphasapphire',
  ultrasun: 'gen7-ultra-sun-ultra-moon', ultramoon: 'gen7-ultra-sun-ultra-moon',
};

function styleForGame(game: string): PokemonStyle {
  return GAME_SPRITE_STYLE[game.toLowerCase()] ?? 'home';
}

interface Props {
  encounters: Encounter[];
  locations: MapLocation[];
  game: string;
  onLocationClick: (loc: MapLocation) => void;
}

interface MergedRow {
  species_id: number;
  species_name: string;
  sprite_url: string | null;
  method: string;
  level_min: number;
  level_max: number;
  rates: { morning?: number; day?: number; night?: number; any?: number };
}

function mergeByMethod(encs: Encounter[]): Record<string, MergedRow[]> {
  const byMethod: Record<string, Map<number, MergedRow>> = {};
  for (const enc of encs) {
    const method = enc.method || 'other';
    if (!byMethod[method]) byMethod[method] = new Map();
    const bucket = byMethod[method];
    const merged = bucket.get(enc.species_id) ?? {
      species_id: enc.species_id,
      species_name: enc.species_name,
      sprite_url: enc.sprite_url,
      method,
      level_min: enc.level_min,
      level_max: enc.level_max,
      rates: {},
    };
    merged.level_min = Math.min(merged.level_min, enc.level_min);
    merged.level_max = Math.max(merged.level_max, enc.level_max);
    const slot: 'morning' | 'day' | 'night' | 'any' = (enc.time_of_day as any) ?? 'any';
    merged.rates[slot] = enc.encounter_rate ?? 0;
    bucket.set(enc.species_id, merged);
  }
  const out: Record<string, MergedRow[]> = {};
  for (const [method, bucket] of Object.entries(byMethod)) {
    out[method] = Array.from(bucket.values());
  }
  return out;
}

export default function SearchResultsPanel({ encounters, locations, game, onLocationClick }: Props) {
  const grouped = useMemo(() => {
    const byLoc = new Map<number, Encounter[]>();
    for (const enc of encounters) {
      if (!byLoc.has(enc.location_id)) byLoc.set(enc.location_id, []);
      byLoc.get(enc.location_id)!.push(enc);
    }
    return Array.from(byLoc.entries()).map(([locId, encs]) => ({
      mapLoc: locations.find(l => l.id === locId),
      locId,
      methodGroups: mergeByMethod(encs),
    })).filter(g => g.mapLoc);
  }, [encounters, locations]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">
          {grouped.length} location{grouped.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {grouped.map(({ mapLoc, locId, methodGroups }) => (
          <div key={locId} className="space-y-2">
            <button
              onClick={() => mapLoc && onLocationClick(mapLoc)}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {mapLoc!.display_name}
            </button>
            {Object.entries(methodGroups).map(([method, rows]) => {
              const MethodIcon = METHOD_ICONS[method] ?? Pin;
              const hasToD = rows.some(r => r.rates.morning != null || r.rates.day != null || r.rates.night != null);
              return (
                <div key={method} className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border">
                    <MethodIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {METHOD_LABELS[method] ?? method.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left font-normal pl-2 pr-1 py-1">Species</th>
                        <th className="text-left font-normal px-1.5 py-1">Lv</th>
                        {hasToD ? (
                          <>
                            <th className="text-center font-normal px-1.5 py-1"><Sunrise className="w-3.5 h-3.5 inline text-amber-400" /></th>
                            <th className="text-center font-normal px-1.5 py-1"><Sun className="w-3.5 h-3.5 inline text-yellow-400" /></th>
                            <th className="text-center font-normal px-1.5 py-1"><Moon className="w-3.5 h-3.5 inline text-indigo-400" /></th>
                          </>
                        ) : (
                          <th className="text-center font-normal px-1.5 py-1">Rate</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.species_id} className="hover:bg-muted/20 transition-colors">
                          <td className="pl-2 pr-1 py-1">
                            <div className="grid grid-cols-[1.25rem_1fr] items-center gap-1.5">
                              {row.species_id ? (
                                <Sprite
                                  kind="pokemon"
                                  id={row.species_id}
                                  style={styleForGame(game)}
                                  size={20}
                                  className="w-5 h-5"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-muted" />
                              )}
                              <span className="capitalize truncate text-foreground">
                                {row.species_name?.replace(/-/g, ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-1.5 py-1 font-mono text-xs text-foreground whitespace-nowrap">
                            {row.level_min === row.level_max ? row.level_min : `${row.level_min}–${row.level_max}`}
                          </td>
                          {hasToD ? (
                            (['morning', 'day', 'night'] as const).map(slot => (
                              <td key={slot} className="px-1.5 py-1 text-center font-mono text-xs text-foreground">
                                {row.rates[slot] != null ? `${row.rates[slot]}%` : (
                                  row.rates.any != null ? <span className="text-muted-foreground">{row.rates.any}%</span> : <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            ))
                          ) : (
                            <td className="px-1.5 py-1 text-center font-mono text-xs text-foreground">
                              {row.rates.any != null ? `${row.rates.any}%` : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
