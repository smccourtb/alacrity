import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { LocationTab } from './LocationTab';
import { api } from '@/api/client';
import InlineNotes from './InlineNotes';
import { ProgressBar } from '@/components/ui/progress-bar';

interface LocationDetailProps {
  locationId: number;
  locationName: string;
  game: string;
  flagReport?: any | null;
  locationKey: string;
  activeSubMarker?: { type: string; referenceId: number } | null;
  onClearActiveSubMarker?: () => void;
}

function subMarkerTab(type: string | undefined): string {
  if (!type) return 'pokemon';
  if (type === 'item' || type === 'hidden_item') return 'items';
  if (type === 'trainer') return 'trainers';
  if (type === 'tm') return 'tms';
  if (type === 'event') return 'events';
  return 'pokemon';
}

interface LocationDetailData {
  items: any[];
  trainers: any[];
  tms: any[];
  events: any[];
  encounters: any[];
  wiki_prose: string | null;
  wiki_callouts: Array<{ type: string; text: string }>;
}

function Checkmark({ done }: { done: boolean }) {
  if (!done) return <span className="w-4 h-4 rounded border border-border/60 shrink-0" />;
  return (
    <span className="w-4 h-4 rounded bg-green-600 shrink-0 flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

const CALLOUT_STYLES: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  prerequisite: { icon: '🔧', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  warning: { icon: '⚠️', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  tip: { icon: '💡', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  choice: { icon: '🔀', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
};

function WikiProse({ prose }: { prose: string }) {
  const isLong = prose.length > 400;

  if (!isLong) {
    return (
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Walkthrough
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {prose}
        </div>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={false} className="px-4 py-3">
      <CollapsibleTrigger showChevron={false} className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors">
        Walkthrough
      </CollapsibleTrigger>
      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {prose.slice(0, 400)}...
      </div>
      <CollapsibleContent>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {prose.slice(400)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const styles: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    field: 'bg-sky-500/10 text-sky-400',
    hidden: 'bg-amber-500/10 text-amber-400',
    gift: 'bg-violet-500/10 text-violet-400',
    purchase: 'bg-emerald-500/10 text-emerald-400',
    reward: 'bg-rose-500/10 text-rose-400',
    gym_reward: 'bg-rose-500/10 text-rose-400',
    gym: 'bg-orange-500/10 text-orange-400',
    story: 'bg-sky-500/10 text-sky-400',
    legendary: 'bg-amber-500/10 text-amber-400',
    gift_pokemon: 'bg-violet-500/10 text-violet-400',
    side_quest: 'bg-emerald-500/10 text-emerald-400',
    trade: 'bg-pink-500/10 text-pink-400',
    boss: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`text-xs leading-none px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${styles[variant] ?? styles.default}`}>
      {children}
    </span>
  );
}

function flagCompletedCount(items: any[], flagReport: any, locationKey: string): number {
  if (!flagReport) return 0;
  const locFlags = flagReport.flags_by_location?.[locationKey];
  if (!locFlags) return 0;
  return items.filter(item =>
    item.flag_index != null &&
    locFlags.flags.some((f: any) => f.index === item.flag_index && f.set)
  ).length;
}

function tabCount(label: string, total: number, completed?: number) {
  if (total === 0) return label;
  if (completed !== undefined) return `${label} ${completed}/${total}`;
  return `${label} ${total}`;
}

// Group encounters by method for cleaner display
function groupEncountersByMethod(encounters: any[]) {
  const groups: Record<string, any[]> = {};
  for (const enc of encounters) {
    const method = enc.method || 'other';
    if (!groups[method]) groups[method] = [];
    groups[method].push(enc);
  }
  return groups;
}

const METHOD_LABELS: Record<string, string> = {
  'walk': 'Tall Grass',
  'grass': 'Tall Grass',
  'surf': 'Surfing',
  'old-rod': 'Old Rod',
  'good-rod': 'Good Rod',
  'super-rod': 'Super Rod',
  'headbutt': 'Headbutt',
  'rock-smash': 'Rock Smash',
};

export function LocationDetail({
  locationId,
  locationName,
  game,
  flagReport,
  locationKey,
  activeSubMarker,
  onClearActiveSubMarker,
}: LocationDetailProps) {
  const [data, setData] = useState<LocationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [caughtSpecies, setCaughtSpecies] = useState<Set<number>>(new Set());
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.guide.locationDetail(locationId, game)
      .then(setData)
      .finally(() => setLoading(false));
  }, [locationId, game]);

  useEffect(() => {
    api.guide.locationCollectionStatus(locationId, game)
      .then(({ encounters }) => {
        setCaughtSpecies(new Set(encounters.filter(e => e.caught).map(e => e.species_id)));
      })
      .catch(() => setCaughtSpecies(new Set()));
  }, [locationId, game]);

  useEffect(() => {
    if (activeSubMarker && activeRef.current) {
      setTimeout(() => {
        activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeSubMarker, data]);

  const locFlags = flagReport?.flags_by_location?.[locationKey];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="font-bold text-base">{locationName}</h2>
        {flagReport && locFlags && locFlags.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{locFlags.set}/{locFlags.total}</span>
            </div>
            <ProgressBar value={locFlags.set / locFlags.total} color="bg-green-600" size="sm" />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {!loading && data && (
        <Tabs
          key={`${locationId}-${activeSubMarker?.type}-${activeSubMarker?.referenceId}`}
          defaultValue={subMarkerTab(activeSubMarker?.type)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-3 shrink-0">
            <TabsList variant="line" className="w-full h-auto flex gap-1">
              {[
                { value: 'pokemon', label: tabCount('Pokemon', data.encounters.length) },
                { value: 'trainers', label: tabCount('Trainers', data.trainers.length, flagReport ? flagCompletedCount(data.trainers, flagReport, locationKey) : undefined) },
                { value: 'items', label: tabCount('Items', data.items.length, flagReport ? flagCompletedCount(data.items, flagReport, locationKey) : undefined) },
                { value: 'tms', label: tabCount('TMs', data.tms.length, flagReport ? flagCompletedCount(data.tms, flagReport, locationKey) : undefined) },
                { value: 'events', label: tabCount('Events', data.events.length, flagReport ? flagCompletedCount(data.events, flagReport, locationKey) : undefined) },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative text-sm px-2.5 py-1.5 whitespace-nowrap rounded-md border-none after:hidden transition-colors duration-200 ease-in-out hover:text-current hover:[text-shadow:0_0_0.5px_currentColor,0_0_0.5px_currentColor] data-active:hover:text-primary-foreground data-active:text-primary-foreground before:absolute before:inset-0 before:rounded-md before:bg-primary before:shadow-md before:origin-center before:scale-0 before:transition-transform before:duration-200 before:ease-out data-active:before:scale-100 [&>*]:relative [&>*]:z-10"
                >
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Pokemon Tab — grouped by encounter method */}
            <TabsContent value="pokemon" className="m-0">
              {data.encounters.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No wild encounters</p>
              ) : (
                Object.entries(groupEncountersByMethod(data.encounters)).map(([method, encs]) => (
                  <div key={method}>
                    <div className="px-4 py-1.5 bg-muted/30 border-b border-border">
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {METHOD_LABELS[method] || method.replace(/-/g, ' ')}
                      </span>
                    </div>
                    {encs.map((enc: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/20 transition-colors">
                        {enc.sprite_url ? (
                          <img src={enc.sprite_url} alt="" className="w-8 h-8 pixelated shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium capitalize">
                              {enc.species_name?.replace(/-/g, ' ')}
                            </span>
                            {caughtSpecies.has(enc.species_id) && (
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0"
                                title="In collection"
                              />
                            )}
                            {enc.time_of_day && (
                              <span className="text-xs" title={enc.time_of_day}>
                                {enc.time_of_day === 'morning' ? '🌅' : enc.time_of_day === 'day' ? '☀️' : '🌙'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">
                            Lv {enc.level_min}{enc.level_min !== enc.level_max ? `–${enc.level_max}` : ''}
                          </div>
                          {enc.encounter_rate != null && (
                            <div className="text-sm text-muted-foreground">{enc.encounter_rate}%</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Trainers Tab */}
            <TabsContent value="trainers" className="m-0">
              {data.trainers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No trainers</p>
              ) : (
                <LocationTab
                  items={data.trainers}
                  flagReport={flagReport}
                  locationKey={locationKey}
                  renderItem={(trainer, isComplete) => {
                    const party = Array.isArray(trainer.party_pokemon) ? trainer.party_pokemon : [];
                    const isActive = activeSubMarker?.referenceId === trainer.id && activeSubMarker?.type === 'trainer';
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        className={`px-4 py-2 border-b border-border/50 hover:bg-muted/20 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkmark done={isComplete} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{trainer.trainer_name}</span>
                              {trainer.is_boss === 1 && <Badge variant="boss">Boss</Badge>}
                            </div>
                            {trainer.trainer_class && (
                              <span className="text-sm text-muted-foreground">{trainer.trainer_class}</span>
                            )}
                            <InlineNotes markerType="trainer" referenceId={trainer.id} initialValue={trainer.description || ''} />
                          </div>
                        </div>
                        {party.length > 0 && (
                          <div className="ml-6 mt-1.5 flex flex-col gap-1">
                            {party.map((p: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                {p.sprite_url ? (
                                  <img src={p.sprite_url} alt="" className="w-6 h-6 pixelated shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-muted shrink-0" />
                                )}
                                <span className="text-xs font-medium capitalize">{p.species?.replace(/-/g, ' ') ?? '???'}</span>
                                <span className="text-sm text-muted-foreground">Lv{p.level}</span>
                                {p.moves?.length > 0 && (
                                  <span className="text-xs text-muted-foreground/70 truncate">
                                    {p.moves.join(', ')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="m-0">
              {data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No items</p>
              ) : (
                <LocationTab
                  items={data.items}
                  flagReport={flagReport}
                  locationKey={locationKey}
                  renderItem={(item, isComplete) => {
                    const isActive = activeSubMarker?.referenceId === item.id && (activeSubMarker?.type === 'item' || activeSubMarker?.type === 'hidden_item');
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        className={`flex items-start gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/20 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <Checkmark done={isComplete} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isComplete ? 'line-through' : ''}`}>
                              {item.item_name}
                            </span>
                            {item.method && <Badge variant={item.method}>{item.method}</Badge>}
                          </div>
                          <InlineNotes
                            markerType={item.method === 'hidden' ? 'hidden_item' : 'item'}
                            referenceId={item.id}
                            initialValue={item.description || ''}
                          />
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>

            {/* TMs Tab */}
            <TabsContent value="tms" className="m-0">
              {data.tms.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No TMs or HMs</p>
              ) : (
                <LocationTab
                  items={data.tms}
                  flagReport={flagReport}
                  locationKey={locationKey}
                  renderItem={(tm, isComplete) => {
                    const isActive = activeSubMarker?.referenceId === tm.id && activeSubMarker?.type === 'tm';
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        className={`px-4 py-2 border-b border-border/50 hover:bg-muted/20 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkmark done={isComplete} />
                          <span className="font-mono text-sm text-muted-foreground w-10 shrink-0">
                            {tm.tm_number}
                          </span>
                          <span className={`text-sm font-medium flex-1 ${isComplete ? 'line-through' : ''}`}>
                            {tm.move_name}
                          </span>
                          {tm.method && <Badge variant={tm.method}>{tm.method.replace('_', ' ')}</Badge>}
                        </div>
                        <div className="ml-7">
                          <InlineNotes markerType="tm" referenceId={tm.id} initialValue={tm.description || ''} />
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="m-0">
              {data.events.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No events</p>
              ) : (
                <LocationTab
                  items={data.events}
                  flagReport={flagReport}
                  locationKey={locationKey}
                  renderItem={(evt, isComplete) => {
                    const isActive = activeSubMarker?.referenceId === evt.id && activeSubMarker?.type === 'event';
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        className={`flex items-start gap-3 px-4 py-2 border-b border-border/50 hover:bg-muted/20 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <Checkmark done={isComplete} />
                        {evt.sprite_url && (
                          <img src={evt.sprite_url} alt="" className="w-6 h-6 pixelated shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{evt.event_name}</span>
                            {evt.event_type && (
                              <Badge variant={evt.event_type}>{evt.event_type.replace('_', ' ')}</Badge>
                            )}
                          </div>
                          <InlineNotes markerType="event" referenceId={evt.id} initialValue={evt.description || ''} />
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
