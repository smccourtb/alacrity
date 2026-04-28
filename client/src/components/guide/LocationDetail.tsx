import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sunrise, Sun, Moon, Fish, TreePine, Pin, Footprints, Waves, Target, CheckCircle2, Hammer,
  Mountain, Gift, Sparkles, Trophy,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { LocationTab } from './LocationTab';
import { api } from '@/api/client';
import InlineNotes from './InlineNotes';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Sprite, pokemonSrc, type PokemonStyle } from '@/components/Sprite';
import ItemPickerModal from './ItemPickerModal';
import SubMarkerRowMenu from './SubMarkerRowMenu';
import { PartyRow } from '@/components/pokemon/PartyRow';
import { prettifyMarkerDetail } from '@/lib/marker-labels';

interface LocationDetailProps {
  locationId: number;
  locationName: string;
  game: string;
  flagReport?: any | null;
  locationKey: string;
  activeSubMarker?: { type: string; referenceId: number } | null;
  onClearActiveSubMarker?: () => void;
  overrides?: Map<string, { sprite_kind: string; sprite_ref: string }>;
  onOverridesChanged?: () => void;
  isCalibrating?: boolean;
  onFocusMarker?: (m: { marker_type: string; reference_id: number; x?: number | null; y?: number | null }) => void;
  clusters?: Array<{
    id: number; kind: 'proximity' | 'location_aggregate';
    primary: { marker_type: string; reference_id: number };
    member_ids: Array<{ marker_type: string; reference_id: number }>;
  }>;
  onStartGroupWith?: (seed: { marker_type: string; reference_id: number }) => void;
  onSplitRequest?: (m: { marker_type: string; reference_id: number }) => void;
  onSetPrimaryRequest?: (m: { marker_type: string; reference_id: number }) => void;
  onOpenPinEditor?: (key: string) => void;
}

function subMarkerTab(type: string | undefined): string {
  if (!type) return 'pokemon';
  if (type === 'item' || type === 'hidden_item') return 'items';
  if (type === 'trainer') return 'trainers';
  if (type === 'tm') return 'tms';
  if (type === 'event') return 'events';
  if (type === 'shop') return 'shops';
  return 'pokemon';
}

interface ShopInventoryItem {
  item_name: string;
  price: number | null;
  badge_gate: number;
  games: string[] | null;
  sprite_path?: string;
}

interface Shop {
  id: number;
  shop_name: string;
  x: number | null;
  y: number | null;
  inventory: ShopInventoryItem[];
}

interface LocationDetailData {
  items: any[];
  trainers: any[];
  tms: any[];
  events: any[];
  encounters: any[];
  shops?: Shop[];
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
    recurring: 'bg-cyan-500/10 text-cyan-400',
  };
  return (
    <span className={`text-xs leading-none px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${styles[variant] ?? styles.default}`}>
      {children}
    </span>
  );
}

// Render a small "Daily" / "Buy" / "Scripted" badge for items the linker
// classified as un-trackable-by-design (flag_source ∈ recurring/transactional/scripted).
// These have flag_index NULL because the game has no permanent flag — the
// state is bag inventory, daily timer, or scene sentinel. Showing a tag here
// distinguishes "data we couldn't link" from "by design no checkbox".
function pickupKindBadge(flagSource: string | null | undefined): React.ReactNode {
  if (!flagSource) return null;
  if (flagSource === 'recurring')       return <Badge variant="recurring">Daily</Badge>;
  if (flagSource === 'transactional')   return <Badge variant="purchase">Buy</Badge>;
  if (flagSource === 'scripted')        return <Badge variant="story">Auto</Badge>;
  if (flagSource === 'engine_pending')  return <Badge variant="default">Engine—pending</Badge>;
  return null;
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

// Count trackable rows (those with a flag_index). Recurring / transactional /
// scripted / engine_pending rows have NULL flag_index by design — they
// can't be "completed" in the player-progress sense, so they're excluded
// from progress denominators throughout the UI.
function trackableCount(items: any[]): number {
  return items.filter(item => item.flag_index != null).length;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function tabCount(label: string, total: number, completed?: number) {
  if (total === 0) return label;
  if (completed !== undefined) return `${label} ${completed}/${total}`;
  return `${label} ${total}`;
}

// Merge per-species per-method encounter rows into one row with ToD-split rates.
// Gen 2+ splits encounter tables by time_of_day; Gen 1 rows have time_of_day = null.
interface MergedEncounter {
  species_id: number;
  species_name: string;
  sprite_url: string | null;
  level_min: number;
  level_max: number;
  rates: { morning?: number; day?: number; night?: number; any?: number };
}

function mergeEncounters(encounters: any[]): Record<string, MergedEncounter[]> {
  const byMethod: Record<string, Map<number, MergedEncounter>> = {};
  for (const enc of encounters) {
    const method = enc.method || 'other';
    if (!byMethod[method]) byMethod[method] = new Map();
    const bucket = byMethod[method];
    const merged: MergedEncounter = bucket.get(enc.species_id) ?? {
      species_id: enc.species_id,
      species_name: enc.species_name,
      sprite_url: enc.sprite_url,
      level_min: enc.level_min,
      level_max: enc.level_max,
      rates: {},
    };
    merged.level_min = Math.min(merged.level_min, enc.level_min);
    merged.level_max = Math.max(merged.level_max, enc.level_max);
    const slot: 'morning' | 'day' | 'night' | 'any' = enc.time_of_day ?? 'any';
    merged.rates[slot] = enc.encounter_rate ?? 0;
    bucket.set(enc.species_id, merged);
  }
  const out: Record<string, MergedEncounter[]> = {};
  for (const [method, bucket] of Object.entries(byMethod)) {
    out[method] = Array.from(bucket.values()).sort((a, b) => a.species_id - b.species_id);
  }
  return out;
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
  'cave': 'Cave',
  'gift': 'Gift',
  'static': 'Stationary',
  'stationary': 'Stationary',
  'special': 'Special',
  'contest': 'Contest',
};

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

// Per-game sprite style. Falls back to 'home' if the game isn't mapped.
const GAME_SPRITE_STYLE: Record<string, PokemonStyle> = {
  red: 'gen1-red-blue',
  blue: 'gen1-red-blue',
  yellow: 'gen1-yellow',
  gold: 'gen2-gold',
  silver: 'gen2-silver',
  crystal: 'gen2-crystal',
  ruby: 'gen3-ruby-sapphire',
  sapphire: 'gen3-ruby-sapphire',
  emerald: 'gen3-emerald',
  firered: 'gen3-firered-leafgreen',
  leafgreen: 'gen3-firered-leafgreen',
  diamond: 'gen4-diamond-pearl',
  pearl: 'gen4-diamond-pearl',
  platinum: 'gen4-platinum',
  heartgold: 'gen4-heartgold-soulsilver',
  soulsilver: 'gen4-heartgold-soulsilver',
  black: 'gen5-black-white',
  white: 'gen5-black-white',
  black2: 'gen5-black-white',
  white2: 'gen5-black-white',
  x: 'gen6-x-y',
  y: 'gen6-x-y',
  omegaruby: 'gen6-omegaruby-alphasapphire',
  alphasapphire: 'gen6-omegaruby-alphasapphire',
  ultrasun: 'gen7-ultra-sun-ultra-moon',
  ultramoon: 'gen7-ultra-sun-ultra-moon',
};

function styleForGame(game: string): PokemonStyle {
  return GAME_SPRITE_STYLE[game.toLowerCase()] ?? 'home';
}

// Map our encounter method to HuntDashboard's hunt_mode param.
function huntModeForMethod(method: string): string {
  if (method === 'old-rod' || method === 'good-rod' || method === 'super-rod') return 'fishing';
  if (method === 'static' || method === 'stationary') return 'stationary';
  if (method === 'gift') return 'gift';
  return 'wild';
}

export function LocationDetail({
  locationId,
  locationName,
  game,
  flagReport,
  locationKey,
  activeSubMarker,
  onClearActiveSubMarker,
  overrides,
  onOverridesChanged,
  isCalibrating,
  onFocusMarker,
  clusters,
  onStartGroupWith,
  onSplitRequest,
  onSetPrimaryRequest,
  onOpenPinEditor,
}: LocationDetailProps) {
  const [data, setData] = useState<LocationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [caughtSpecies, setCaughtSpecies] = useState<Set<number>>(new Set());
  const activeRef = useRef<HTMLDivElement>(null);
  const [pickerFor, setPickerFor] = useState<{ type: string; referenceId: number } | null>(null);
  const [editingNoteFor, setEditingNoteFor] = useState<{ type: string; id: number } | null>(null);

  const isMemberMap = useMemo(() => {
    const m = new Map<string, { clusterId: number; isPrimary: boolean }>();
    for (const c of clusters ?? []) {
      for (const mid of c.member_ids) {
        m.set(`${mid.marker_type}:${mid.reference_id}`, {
          clusterId: c.id,
          isPrimary: mid.marker_type === c.primary.marker_type && mid.reference_id === c.primary.reference_id,
        });
      }
    }
    return m;
  }, [clusters]);

  const isPrimaryOrAggregate = (key: string) => {
    const v = isMemberMap.get(key);
    if (!v) return false;
    if (v.isPrimary) return true;
    return (clusters ?? []).some(c => c.kind === 'location_aggregate' && v.clusterId === c.id);
  };

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.guide.locationDetail(locationId, game)
      .then(setData)
      .finally(() => setLoading(false));
  }, [locationId, game]);

  // Caught state reflects the Pokedex: species that appear in the opted-in
  // collection for this game (manual, save-backed, or bank entries). No save
  // needs to be loaded — this is the same scope the Pokedex page shows.
  useEffect(() => {
    api.collection.list({ game })
      .then((entries: any[]) => {
        setCaughtSpecies(new Set(entries.map(e => e.species_id).filter(Boolean)));
      })
      .catch(() => setCaughtSpecies(new Set()));
  }, [game]);

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
      {/* Header — no bottom border. The tab strip below provides the
          natural visual divider between header and content. */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="font-bold text-base">{locationName}</h2>
        {flagReport && locFlags && (locFlags.linked_total ?? 0) > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{locFlags.linked_set ?? 0}/{locFlags.linked_total}</span>
            </div>
            <ProgressBar value={(locFlags.linked_set ?? 0) / locFlags.linked_total} color="bg-green-600" size="sm" />
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
          {/* Segmented-control tab strip. Vertical padding `pb-3` matches
              the header's `pb-3` so the gap above and below the tabs is
              symmetric. Inactive tabs are visible grey pills (`bg-muted`,
              not the too-subtle `surface-sunken`). Active tab is solid red
              with white text — Tailwind v4 important suffix `!` is used
              because the base TabsTrigger sets its own data-active styles. */}
          <div className="shrink-0 relative px-4 pb-3">
            <TabsList
              variant="line"
              className="w-fit max-w-full h-auto flex flex-nowrap gap-1.5 p-0 rounded-none overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none] snap-x bg-transparent"
            >
              {[
                // Pokemon and Shops have no progress tracking — total
                // shows row count for tab discovery, no done value.
                // Trainers/Items/TMs/Events use trackable-count for the
                // denominator: rows tagged Daily/Buy/Auto/Engine-pending
                // (no flag_index) are listed in the tab body but excluded
                // from the X/Y display since they can't be "completed."
                { value: 'pokemon', label: 'Pokemon', listTotal: data.encounters.length, total: new Set(data.encounters.map((e: any) => e.species_id)).size, done: undefined },
                { value: 'trainers', label: 'Trainers', listTotal: data.trainers.length, total: trackableCount(data.trainers), done: flagReport ? flagCompletedCount(data.trainers, flagReport, locationKey) : undefined },
                { value: 'items', label: 'Items', listTotal: data.items.length, total: trackableCount(data.items), done: flagReport ? flagCompletedCount(data.items, flagReport, locationKey) : undefined },
                { value: 'tms', label: 'TMs', listTotal: data.tms.length, total: trackableCount(data.tms), done: flagReport ? flagCompletedCount(data.tms, flagReport, locationKey) : undefined },
                { value: 'events', label: 'Events', listTotal: data.events.length, total: trackableCount(data.events), done: flagReport ? flagCompletedCount(data.events, flagReport, locationKey) : undefined },
                ...(data.shops?.length ? [{ value: 'shops', label: 'Shops', listTotal: data.shops.length, total: data.shops.length, done: undefined as number | undefined }] : []),
              ].filter(t => t.listTotal > 0).map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="
                    relative shrink-0 grow-0 basis-auto! flex-none!
                    snap-start
                    flex items-center justify-center gap-1
                    h-8 w-[5.25rem] px-2
                    rounded-md text-xs font-medium whitespace-nowrap leading-none
                    border-none after:hidden
                    bg-muted! text-muted-foreground!
                    transition-all duration-150
                    hover:text-foreground! hover:bg-muted/70!
                    hover:[text-shadow:0_0_0.5px_currentColor,0_0_0.5px_currentColor]
                    data-active:bg-primary! data-active:text-white!
                    data-active:shadow-md!
                    data-active:[text-shadow:0_1px_1px_rgba(0,0,0,0.35)]
                    data-active:hover:bg-primary! data-active:hover:text-white!
                  "
                >
                  <span>{tab.label}</span>
                  {tab.total > 0 && (
                    <span className="tabular-nums text-[10px] opacity-70">
                      {tab.done != null ? `${tab.done}/${tab.total}` : tab.total}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {/* Right-edge fade hints at horizontal scroll without a scrollbar. */}
            <div className="pointer-events-none absolute inset-y-0 right-4 w-6 bg-gradient-to-l from-card to-transparent" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Pokemon Tab — Stationary specials (Friday Lapras, Mewtwo, Suicune…) first, then per-method wild tables */}
            <TabsContent value="pokemon" className="m-0 px-3 pb-3 space-y-3">
              {(() => {
                const stationary = (data.events ?? []).filter(
                  (e: any) => e.species_id != null
                    && ['static_pokemon', 'legendary', 'story'].includes(e.event_type)
                );
                if (stationary.length === 0) return null;
                return (
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                      <Pin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold uppercase tracking-wider">Stationary</span>
                      <span className="text-xs text-muted-foreground ml-auto">{stationary.length} species</span>
                    </div>
                    <div className="divide-y divide-border">
                      {stationary.map((ev: any) => {
                        const caught = caughtSpecies.has(ev.species_id);
                        return (
                          <div key={ev.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/20 transition-colors">
                            <Sprite
                              kind="pokemon"
                              id={ev.species_id}
                              style={styleForGame(game)}
                              size={20}
                              className={`w-5 h-5 mt-0.5 shrink-0 ${caught ? '' : 'grayscale opacity-40'}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm capitalize truncate">{ev.species_name?.replace(/-/g, ' ')}</span>
                                {caught && <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="In collection" />}
                              </div>
                              {ev.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                  {ev.description}
                                </div>
                              )}
                            </div>
                            <Link
                              to={`/hunt?game=${game}&target=${ev.species_id}&mode=stationary`}
                              className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 text-xs"
                            >
                              <Target className="w-3 h-3" />
                              Hunt
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {data.encounters.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No wild encounters</p>
              ) : (
                Object.entries(mergeEncounters(data.encounters)).map(([method, rows]) => {
                  const MethodIcon = METHOD_ICONS[method] ?? Footprints;
                  const hasToD = rows.some(r => r.rates.morning != null || r.rates.day != null || r.rates.night != null);
                  const huntMode = huntModeForMethod(method);
                  return (
                    <div key={method} className="border border-border rounded-lg overflow-hidden bg-card">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                        <MethodIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold uppercase tracking-wider">
                          {METHOD_LABELS[method] || method.replace(/-/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{rows.length} species</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="text-left font-normal pl-1 pr-1 py-1.5">Species</th>
                            <th className="text-left font-normal px-2 py-1.5">Level</th>
                            {hasToD ? (
                              <>
                                <th className="text-center font-normal px-2 py-1.5" title="Morning">
                                  <Sunrise className="w-3.5 h-3.5 inline text-amber-400" />
                                </th>
                                <th className="text-center font-normal px-2 py-1.5" title="Day">
                                  <Sun className="w-3.5 h-3.5 inline text-yellow-400" />
                                </th>
                                <th className="text-center font-normal px-2 py-1.5" title="Night">
                                  <Moon className="w-3.5 h-3.5 inline text-indigo-400" />
                                </th>
                              </>
                            ) : (
                              <th className="text-center font-normal px-2 py-1.5">Rate</th>
                            )}
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => {
                            const caught = caughtSpecies.has(row.species_id);
                            return (
                              <tr key={row.species_id} className="hover:bg-muted/20 transition-colors">
                                <td className="pl-2 pr-1 py-1">
                                  <div className="grid grid-cols-[1.25rem_1fr_1rem] items-center gap-1.5">
                                    {row.species_id ? (
                                      <Sprite
                                        kind="pokemon"
                                        id={row.species_id}
                                        style={styleForGame(game)}
                                        size={20}
                                        className={`w-5 h-5 ${caught ? '' : 'grayscale opacity-40'}`}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded bg-muted" />
                                    )}
                                    <span className="capitalize truncate">{row.species_name?.replace(/-/g, ' ')}</span>
                                    {caught ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="In collection" />
                                    ) : (
                                      <span />
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                  {row.level_min === row.level_max ? row.level_min : `${row.level_min}–${row.level_max}`}
                                </td>
                                {hasToD ? (
                                  (['morning', 'day', 'night'] as const).map(slot => (
                                    <td key={slot} className="px-2 py-1.5 text-center font-mono text-xs">
                                      {row.rates[slot] != null ? (
                                        <span>{row.rates[slot]}%</span>
                                      ) : row.rates.any != null ? (
                                        <span className="text-muted-foreground">{row.rates.any}%</span>
                                      ) : (
                                        <span className="text-muted-foreground/30">—</span>
                                      )}
                                    </td>
                                  ))
                                ) : (
                                  <td className="px-2 py-1.5 text-center font-mono text-xs">
                                    {row.rates.any != null ? `${row.rates.any}%` : '—'}
                                  </td>
                                )}
                                <td className="px-2 py-1.5 text-right">
                                  <Link
                                    to={`/hunt?game=${game}&target=${row.species_id}&mode=${huntMode}`}
                                    className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 text-xs"
                                  >
                                    <Target className="w-3 h-3" />
                                    Hunt
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })
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
                    const hasCoords = (trainer as any).x != null && (trainer as any).y != null;
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        onClick={() => hasCoords && onFocusMarker?.({
                          marker_type: 'trainer',
                          reference_id: trainer.id,
                          x: (trainer as any).x,
                          y: (trainer as any).y,
                        })}
                        className={`px-4 py-2 border-b border-border/50 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''} ${hasCoords ? 'cursor-pointer hover:bg-muted/20' : 'opacity-50'}`}
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
                            <InlineNotes
                              markerType="trainer"
                              referenceId={trainer.id}
                              initialValue={trainer.description || ''}
                              externalEditing={editingNoteFor?.type === 'trainer' && editingNoteFor?.id === trainer.id}
                              onEditingChange={(e) => setEditingNoteFor(e ? { type: 'trainer', id: trainer.id } : null)}
                            />
                          </div>
                          {isCalibrating && (
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                              {(() => {
                                const override = overrides?.get(`trainer:${trainer.id}`);
                                if ((override?.sprite_kind === 'item' || override?.sprite_kind === 'pokemon') && override.sprite_ref) {
                                  const base = override.sprite_kind === 'pokemon' ? 'pokemon' : 'items';
                                  return (
                                    <img
                                      src={`/sprites/${base}/${override.sprite_ref}`}
                                      alt=""
                                      className="w-5 h-5"
                                      style={{ imageRendering: 'pixelated' }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <SubMarkerRowMenu
                                onEditNote={() => setEditingNoteFor({ type: 'trainer', id: trainer.id })}
                                onOverrideIcon={() => setPickerFor({ type: 'trainer', referenceId: trainer.id })}
                                onGroupWith={() => onStartGroupWith?.({ marker_type: 'trainer', reference_id: trainer.id })}
                                isClusterMember={isMemberMap.get(`trainer:${trainer.id}`) != null}
                                onSplitFromGroup={() => onSplitRequest?.({ marker_type: 'trainer', reference_id: trainer.id })}
                                onSetAsPrimary={() => onSetPrimaryRequest?.({ marker_type: 'trainer', reference_id: trainer.id })}
                                isClusterPrimaryOrAggregate={isPrimaryOrAggregate(`trainer:${trainer.id}`)}
                                onOpenLocationPinEditor={() => onOpenPinEditor?.(`trainer:${trainer.id}`)}
                              />
                            </div>
                          )}
                        </div>
                        {party.length > 0 && (
                          <PartyRow
                            className="ml-6 mt-1.5"
                            size="md"
                            tooltip="full"
                            showEmpty={false}
                            showLevel
                            party={party.map((p: any) => ({
                              species_id: p.species_id ?? 0,
                              name: (p.species ?? '???').replace(/-/g, ' '),
                              level: p.level,
                              moves: p.moves ?? [],
                              // Use the selected game's era-appropriate sprite
                              // for trainer parties (Crystal save → Gen 2
                              // crystal sprite, Ultra Moon → Gen 7, etc.)
                              // instead of falling back to the universal box icon.
                              sprite_url: p.species_id
                                ? pokemonSrc(p.species_id, false, styleForGame(game))
                                : (p.sprite_url ?? null),
                            }))}
                          />
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
                    const hasCoords = (item as any).x != null && (item as any).y != null;
                    const itemType = item.method === 'hidden' ? 'hidden_item' : 'item';
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        onClick={() => hasCoords && onFocusMarker?.({
                          marker_type: itemType,
                          reference_id: item.id,
                          x: (item as any).x,
                          y: (item as any).y,
                        })}
                        className={`flex items-start gap-3 px-4 py-2 border-b border-border/50 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''} ${hasCoords ? 'cursor-pointer hover:bg-muted/20' : 'opacity-50'}`}
                      >
                        <Checkmark done={isComplete} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isComplete ? 'line-through' : ''}`}>
                              {item.item_name}
                            </span>
                            {item.method && <Badge variant={item.method}>{prettifyMarkerDetail(item.method)}</Badge>}
                            {pickupKindBadge((item as any).flag_source)}
                          </div>
                          <InlineNotes
                            markerType={itemType}
                            referenceId={item.id}
                            initialValue={item.description || ''}
                            externalEditing={editingNoteFor?.type === itemType && editingNoteFor?.id === item.id}
                            onEditingChange={(e) => setEditingNoteFor(e ? { type: itemType, id: item.id } : null)}
                          />
                        </div>
                        {isCalibrating && (
                          <div className="flex items-center gap-1 ml-auto shrink-0">
                            {(() => {
                              const override = overrides?.get(`${itemType}:${item.id}`);
                              if ((override?.sprite_kind === 'item' || override?.sprite_kind === 'pokemon') && override.sprite_ref) {
                                const base = override.sprite_kind === 'pokemon' ? 'pokemon' : 'items';
                                return (
                                  <img
                                    src={`/sprites/${base}/${override.sprite_ref}`}
                                    alt=""
                                    className="w-5 h-5"
                                    style={{ imageRendering: 'pixelated' }}
                                  />
                                );
                              }
                              return null;
                            })()}
                            <SubMarkerRowMenu
                              onEditNote={() => setEditingNoteFor({ type: itemType, id: item.id })}
                              onOverrideIcon={() => setPickerFor({ type: itemType, referenceId: item.id })}
                              onGroupWith={() => onStartGroupWith?.({ marker_type: itemType, reference_id: item.id })}
                              isClusterMember={isMemberMap.get(`${itemType}:${item.id}`) != null}
                              onSplitFromGroup={() => onSplitRequest?.({ marker_type: itemType, reference_id: item.id })}
                              onSetAsPrimary={() => onSetPrimaryRequest?.({ marker_type: itemType, reference_id: item.id })}
                              isClusterPrimaryOrAggregate={isPrimaryOrAggregate(`${itemType}:${item.id}`)}
                              onOpenLocationPinEditor={() => onOpenPinEditor?.(`${itemType}:${item.id}`)}
                            />
                          </div>
                        )}
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
                    const hasCoords = (tm as any).x != null && (tm as any).y != null;
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        onClick={() => hasCoords && onFocusMarker?.({
                          marker_type: 'tm',
                          reference_id: tm.id,
                          x: (tm as any).x,
                          y: (tm as any).y,
                        })}
                        className={`px-4 py-2 border-b border-border/50 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''} ${hasCoords ? 'cursor-pointer hover:bg-muted/20' : 'opacity-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkmark done={isComplete} />
                          <span className="font-mono text-sm text-muted-foreground w-10 shrink-0">
                            {tm.tm_number}
                          </span>
                          <span className={`text-sm font-medium flex-1 ${isComplete ? 'line-through' : ''}`}>
                            {tm.move_name}
                          </span>
                          {tm.method && <Badge variant={tm.method}>{prettifyMarkerDetail(tm.method)}</Badge>}
                          {isCalibrating && (
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                              {(() => {
                                const override = overrides?.get(`tm:${tm.id}`);
                                if ((override?.sprite_kind === 'item' || override?.sprite_kind === 'pokemon') && override.sprite_ref) {
                                  const base = override.sprite_kind === 'pokemon' ? 'pokemon' : 'items';
                                  return (
                                    <img
                                      src={`/sprites/${base}/${override.sprite_ref}`}
                                      alt=""
                                      className="w-5 h-5"
                                      style={{ imageRendering: 'pixelated' }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <SubMarkerRowMenu
                                onEditNote={() => setEditingNoteFor({ type: 'tm', id: tm.id })}
                                onOverrideIcon={() => setPickerFor({ type: 'tm', referenceId: tm.id })}
                                onGroupWith={() => onStartGroupWith?.({ marker_type: 'tm', reference_id: tm.id })}
                                isClusterMember={isMemberMap.get(`tm:${tm.id}`) != null}
                                onSplitFromGroup={() => onSplitRequest?.({ marker_type: 'tm', reference_id: tm.id })}
                                onSetAsPrimary={() => onSetPrimaryRequest?.({ marker_type: 'tm', reference_id: tm.id })}
                                isClusterPrimaryOrAggregate={isPrimaryOrAggregate(`tm:${tm.id}`)}
                                onOpenLocationPinEditor={() => onOpenPinEditor?.(`tm:${tm.id}`)}
                              />
                            </div>
                          )}
                        </div>
                        <div className="ml-7">
                          <InlineNotes
                            markerType="tm"
                            referenceId={tm.id}
                            initialValue={tm.description || ''}
                            externalEditing={editingNoteFor?.type === 'tm' && editingNoteFor?.id === tm.id}
                            onEditingChange={(e) => setEditingNoteFor(e ? { type: 'tm', id: tm.id } : null)}
                          />
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
                    const hasCoords = (evt as any).x != null && (evt as any).y != null;
                    return (
                      <div
                        ref={isActive ? activeRef : undefined}
                        onClick={() => hasCoords && onFocusMarker?.({
                          marker_type: 'event',
                          reference_id: evt.id,
                          x: (evt as any).x,
                          y: (evt as any).y,
                        })}
                        className={`flex items-start gap-3 px-4 py-2 border-b border-border/50 transition-colors ${isComplete ? 'opacity-40' : ''} ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''} ${hasCoords ? 'cursor-pointer hover:bg-muted/20' : 'opacity-50'}`}
                      >
                        <Checkmark done={isComplete} />
                        {evt.sprite_url && (
                          <img src={evt.sprite_url} alt="" className="w-6 h-6 pixelated shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{evt.event_name}</span>
                            {evt.event_type && (
                              <Badge variant={evt.event_type}>{prettifyMarkerDetail(evt.event_type)}</Badge>
                            )}
                          </div>
                          <InlineNotes
                            markerType="event"
                            referenceId={evt.id}
                            initialValue={evt.description || ''}
                            externalEditing={editingNoteFor?.type === 'event' && editingNoteFor?.id === evt.id}
                            onEditingChange={(e) => setEditingNoteFor(e ? { type: 'event', id: evt.id } : null)}
                          />
                        </div>
                        {isCalibrating && (
                          <div className="flex items-center gap-1 ml-auto shrink-0">
                            {(() => {
                              const override = overrides?.get(`event:${evt.id}`);
                              if ((override?.sprite_kind === 'item' || override?.sprite_kind === 'pokemon') && override.sprite_ref) {
                                const base = override.sprite_kind === 'pokemon' ? 'pokemon' : 'items';
                                return (
                                  <img
                                    src={`/sprites/${base}/${override.sprite_ref}`}
                                    alt=""
                                    className="w-5 h-5"
                                    style={{ imageRendering: 'pixelated' }}
                                  />
                                );
                              }
                              return null;
                            })()}
                            <SubMarkerRowMenu
                              onEditNote={() => setEditingNoteFor({ type: 'event', id: evt.id })}
                              onOverrideIcon={() => setPickerFor({ type: 'event', referenceId: evt.id })}
                              onGroupWith={() => onStartGroupWith?.({ marker_type: 'event', reference_id: evt.id })}
                              isClusterMember={isMemberMap.get(`event:${evt.id}`) != null}
                              onSplitFromGroup={() => onSplitRequest?.({ marker_type: 'event', reference_id: evt.id })}
                              onSetAsPrimary={() => onSetPrimaryRequest?.({ marker_type: 'event', reference_id: evt.id })}
                              isClusterPrimaryOrAggregate={isPrimaryOrAggregate(`event:${evt.id}`)}
                              onOpenLocationPinEditor={() => onOpenPinEditor?.(`event:${evt.id}`)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>

            {/* Shops Tab */}
            <TabsContent value="shops" className="m-0">
              {!data.shops?.length ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No shops</p>
              ) : (
                <div className="space-y-3 px-3 pb-3">
                  {data.shops.map(shop => {
                    const hasCoords = shop.x != null && shop.y != null;
                    return (
                    <div key={shop.id} className="border border-border rounded-lg overflow-hidden bg-card">
                      <div
                        onClick={() => hasCoords && onFocusMarker?.({
                          marker_type: 'shop',
                          reference_id: shop.id,
                          x: shop.x,
                          y: shop.y,
                        })}
                        className={`px-3 py-2 bg-muted/40 border-b border-border text-sm font-semibold ${hasCoords ? 'cursor-pointer hover:bg-muted/60' : 'opacity-50'}`}
                      >
                        {shop.shop_name}
                      </div>
                      <ul className="divide-y divide-border/50">
                        {shop.inventory.map((inv: ShopInventoryItem, idx: number) => (
                          <li key={`${shop.id}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                            {(inv as any).sprite_path && (
                              <img
                                src={(inv as any).sprite_path}
                                alt=""
                                className="w-5 h-5 shrink-0 object-contain"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            )}
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2">
                                {inv.item_name}
                                {inv.badge_gate > 0 && (
                                  <Badge variant="item">Badge {inv.badge_gate}</Badge>
                                )}
                              </span>
                              {(inv as any).notes && (
                                <div className="text-xs text-muted-foreground leading-snug">{(inv as any).notes}</div>
                              )}
                            </span>
                            {inv.price != null && (
                              <span className="text-muted-foreground tabular-nums">₽{inv.price.toLocaleString()}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}
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
