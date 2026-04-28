import { useState } from 'react';
import {
  Sunrise, Sun, Moon, Fish, TreePine, Pin, Footprints, Waves,
  ChevronRight, CheckCircle2, Target,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Sample data — realistic slices across encounter modes
// ─────────────────────────────────────────────────────────────

type ToD = 'morning' | 'day' | 'night';
interface Encounter {
  species_id: number;
  species_name: string;
  sprite_url: string;
  level_min: number;
  level_max: number;
  rates: Partial<Record<ToD, number>>;
  caught: boolean;
  held_item?: string;
}
interface ModeGroup {
  method: string;
  label: string;
  icon: typeof Sun;
  encounters: Encounter[];
  subMethod?: string;
}

const sprite = (id: number) =>
  `/sprites/pokemon/home/${id}.png`;

const MOCK_DATA: ModeGroup[] = [
  {
    method: 'grass', label: 'Tall Grass', icon: Footprints,
    encounters: [
      { species_id: 161, species_name: 'sentret', sprite_url: sprite(161), level_min: 2, level_max: 4, rates: { morning: 40, day: 45 }, caught: false },
      { species_id: 163, species_name: 'hoothoot', sprite_url: sprite(163), level_min: 3, level_max: 4, rates: { night: 45 }, caught: true },
      { species_id: 19, species_name: 'rattata', sprite_url: sprite(19), level_min: 3, level_max: 3, rates: { morning: 10, day: 10, night: 30 }, caught: true },
      { species_id: 16, species_name: 'pidgey', sprite_url: sprite(16), level_min: 2, level_max: 4, rates: { morning: 40, day: 30 }, caught: false },
    ],
  },
  {
    method: 'surf', label: 'Surfing', icon: Waves,
    encounters: [
      { species_id: 129, species_name: 'magikarp', sprite_url: sprite(129), level_min: 10, level_max: 30, rates: { morning: 90, day: 90, night: 90 }, caught: true },
      { species_id: 72, species_name: 'tentacool', sprite_url: sprite(72), level_min: 10, level_max: 25, rates: { morning: 10, day: 10, night: 10 }, caught: false },
    ],
  },
  {
    method: 'old-rod', label: 'Old Rod', icon: Fish, subMethod: 'fishing',
    encounters: [
      { species_id: 129, species_name: 'magikarp', sprite_url: sprite(129), level_min: 10, level_max: 10, rates: { morning: 85, day: 85, night: 85 }, caught: true },
      { species_id: 98, species_name: 'krabby', sprite_url: sprite(98), level_min: 10, level_max: 10, rates: { morning: 15, day: 15, night: 15 }, caught: false },
    ],
  },
  {
    method: 'good-rod', label: 'Good Rod', icon: Fish, subMethod: 'fishing',
    encounters: [
      { species_id: 129, species_name: 'magikarp', sprite_url: sprite(129), level_min: 20, level_max: 20, rates: { morning: 60, day: 60, night: 60 }, caught: true },
      { species_id: 118, species_name: 'goldeen', sprite_url: sprite(118), level_min: 20, level_max: 20, rates: { morning: 20, day: 20, night: 20 }, caught: false },
      { species_id: 60, species_name: 'poliwag', sprite_url: sprite(60), level_min: 20, level_max: 20, rates: { morning: 20, day: 20, night: 20 }, caught: false },
    ],
  },
  {
    method: 'super-rod', label: 'Super Rod', icon: Fish, subMethod: 'fishing',
    encounters: [
      { species_id: 118, species_name: 'goldeen', sprite_url: sprite(118), level_min: 40, level_max: 40, rates: { morning: 40, day: 40, night: 40 }, caught: false },
      { species_id: 119, species_name: 'seaking', sprite_url: sprite(119), level_min: 40, level_max: 40, rates: { morning: 40, day: 40, night: 40 }, caught: false },
    ],
  },
  {
    method: 'headbutt', label: 'Headbutt', icon: TreePine,
    encounters: [
      { species_id: 10, species_name: 'caterpie', sprite_url: sprite(10), level_min: 10, level_max: 12, rates: { morning: 50, day: 50, night: 50 }, caught: true },
      { species_id: 165, species_name: 'ledyba', sprite_url: sprite(165), level_min: 10, level_max: 12, rates: { morning: 30 }, caught: false },
      { species_id: 167, species_name: 'spinarak', sprite_url: sprite(167), level_min: 10, level_max: 12, rates: { night: 30 }, caught: false },
    ],
  },
  {
    method: 'stationary', label: 'Stationary', icon: Pin,
    encounters: [
      { species_id: 249, species_name: 'lugia', sprite_url: sprite(249), level_min: 70, level_max: 70, rates: {}, caught: false, held_item: 'Silver Wing' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Shared UI bits
// ─────────────────────────────────────────────────────────────

const TOD_ICONS = {
  morning: { Icon: Sunrise, color: 'text-amber-400', label: 'Morning' },
  day: { Icon: Sun, color: 'text-yellow-400', label: 'Day' },
  night: { Icon: Moon, color: 'text-indigo-400', label: 'Night' },
} as const;

function CaughtDot({ caught }: { caught: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        caught ? 'bg-emerald-500' : 'border border-muted-foreground/40'
      }`}
      title={caught ? 'In collection' : 'Not collected'}
    />
  );
}

function HuntButton({ encounter, mode, size = 'sm' }: { encounter: Encounter; mode: string; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={() => alert(`Would navigate: /hunt?species=${encounter.species_id}&mode=${mode}`)}
      className={`inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'
      }`}
    >
      <Target className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Hunt
    </button>
  );
}

function LevelRange({ encounter }: { encounter: Encounter }) {
  const same = encounter.level_min === encounter.level_max;
  return (
    <span className="font-mono text-xs text-muted-foreground">
      Lv {encounter.level_min}{same ? '' : `–${encounter.level_max}`}
    </span>
  );
}

function ToDRate({ tod, rate }: { tod: ToD; rate: number | undefined }) {
  const { Icon, color, label } = TOD_ICONS[tod];
  if (rate == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground/30" title={`${label} — n/a`}>
        <Icon className="w-3 h-3" />
        <span className="text-2xs">—</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${color}`} title={`${label} — ${rate}%`}>
      <Icon className="w-3 h-3" />
      <span className="text-2xs font-mono">{rate}%</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 1 — Dense list with collapsible mode sections
// ─────────────────────────────────────────────────────────────

function OptionOne() {
  return (
    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
      {MOCK_DATA.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div key={group.method}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40">
              <GroupIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
              <span className="text-2xs text-muted-foreground/60 ml-auto">
                {group.encounters.length} species
              </span>
            </div>
            {group.encounters.map((enc) => (
              <div
                key={`${group.method}-${enc.species_id}`}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 transition-colors"
              >
                <CaughtDot caught={enc.caught} />
                <img src={enc.sprite_url} alt="" className="w-8 h-8 shrink-0 pixelated" />
                <span className="text-sm font-medium capitalize flex-1 min-w-0 truncate">
                  {enc.species_name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <LevelRange encounter={enc} />
                  <div className="flex items-center gap-1.5">
                    {(['morning', 'day', 'night'] as ToD[]).map((tod) => (
                      <ToDRate key={tod} tod={tod} rate={enc.rates[tod]} />
                    ))}
                  </div>
                  {enc.held_item && (
                    <span className="text-2xs text-amber-500/80 italic">holds {enc.held_item}</span>
                  )}
                  <HuntButton encounter={enc} mode={group.method} />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 2 — Cards per species, mode-specific framing
// ─────────────────────────────────────────────────────────────

function OptionTwo() {
  // Group fishing rods together into one section
  const sections: { key: string; label: string; icon: typeof Sun; groups: ModeGroup[] }[] = [
    { key: 'grass', label: 'Tall Grass', icon: Footprints, groups: MOCK_DATA.filter((g) => g.method === 'grass') },
    { key: 'surf', label: 'Surfing', icon: Waves, groups: MOCK_DATA.filter((g) => g.method === 'surf') },
    { key: 'fishing', label: 'Fishing', icon: Fish, groups: MOCK_DATA.filter((g) => g.subMethod === 'fishing') },
    { key: 'headbutt', label: 'Headbutt', icon: TreePine, groups: MOCK_DATA.filter((g) => g.method === 'headbutt') },
    { key: 'stationary', label: 'Stationary', icon: Pin, groups: MOCK_DATA.filter((g) => g.method === 'stationary') },
  ].filter((s) => s.groups.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-2">
              <SectionIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">{section.label}</h3>
            </div>

            {section.groups.map((group) => (
              <div key={group.method} className="mb-3">
                {group.subMethod === 'fishing' && (
                  <div className="text-xs text-muted-foreground mb-1.5 ml-1">{group.label}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.encounters.map((enc) => (
                    <div
                      key={`${group.method}-${enc.species_id}`}
                      className="flex items-center gap-3 p-2 rounded-md border border-border bg-card hover:border-primary/40 transition-colors"
                    >
                      <div className="relative">
                        <img
                          src={enc.sprite_url}
                          alt=""
                          className={`w-12 h-12 pixelated shrink-0 ${enc.caught ? '' : 'grayscale opacity-40'}`}
                        />
                        {enc.caught && (
                          <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-background rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium capitalize truncate">{enc.species_name}</span>
                          <LevelRange encounter={enc} />
                        </div>
                        <div className="flex items-center gap-2">
                          {(['morning', 'day', 'night'] as ToD[]).map((tod) =>
                            enc.rates[tod] != null ? <ToDRate key={tod} tod={tod} rate={enc.rates[tod]} /> : null
                          )}
                          {Object.keys(enc.rates).length === 0 && (
                            <span className="text-2xs text-muted-foreground italic">always present</span>
                          )}
                        </div>
                        {enc.held_item && (
                          <div className="text-2xs text-amber-500/80 italic mt-0.5">holds {enc.held_item}</div>
                        )}
                      </div>
                      <HuntButton encounter={enc} mode={group.method} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 3 — Table per mode, ToD as columns (clearest for multi-ToD)
// ─────────────────────────────────────────────────────────────

function OptionThree() {
  return (
    <div className="space-y-4">
      {MOCK_DATA.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div key={group.method} className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
              <GroupIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold uppercase tracking-wider">{group.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{group.encounters.length} species</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-normal px-3 py-1.5">Species</th>
                  <th className="text-left font-normal px-2 py-1.5">Level</th>
                  <th className="text-center font-normal px-2 py-1.5">
                    <Sunrise className="w-3.5 h-3.5 inline text-amber-400" />
                  </th>
                  <th className="text-center font-normal px-2 py-1.5">
                    <Sun className="w-3.5 h-3.5 inline text-yellow-400" />
                  </th>
                  <th className="text-center font-normal px-2 py-1.5">
                    <Moon className="w-3.5 h-3.5 inline text-indigo-400" />
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {group.encounters.map((enc) => (
                  <tr key={`${group.method}-${enc.species_id}`} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <img src={enc.sprite_url} alt="" className={`w-7 h-7 pixelated shrink-0 ${enc.caught ? '' : 'grayscale opacity-40'}`} />
                        <span className="capitalize">{enc.species_name}</span>
                        {enc.caught && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                      {enc.level_min === enc.level_max ? enc.level_min : `${enc.level_min}–${enc.level_max}`}
                    </td>
                    {(['morning', 'day', 'night'] as ToD[]).map((tod) => (
                      <td key={tod} className="px-2 py-1.5 text-center font-mono text-xs">
                        {enc.rates[tod] != null ? (
                          <span>{enc.rates[tod]}%</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <HuntButton encounter={enc} mode={group.method} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function EncountersMockup() {
  const [option, setOption] = useState<'1' | '2' | '3'>('1');
  const options = [
    { key: '1', label: 'Dense list', hint: 'Compact rows, ToD icons inline' },
    { key: '2', label: 'Cards', hint: 'One card per species, sprite-forward' },
    { key: '3', label: 'Tables', hint: 'ToD as columns, best for split-rate data' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">Encounter section mockup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Static sample data. Hunt buttons show an alert with the URL they'd navigate to.
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => setOption(o.key as '1' | '2' | '3')}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              option === o.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
            <span className="ml-1 text-xs text-muted-foreground/60">{o.hint}</span>
          </button>
        ))}
      </div>

      {option === '1' && <OptionOne />}
      {option === '2' && <OptionTwo />}
      {option === '3' && <OptionThree />}

      <div className="text-xs text-muted-foreground border-t border-border pt-3 flex items-center gap-2">
        <ChevronRight className="w-3 h-3" />
        Hunt button encodes mode — grass → wild+grass, old-rod → wild+fishing+oldrod, stationary → stationary+species.
      </div>
    </div>
  );
}

