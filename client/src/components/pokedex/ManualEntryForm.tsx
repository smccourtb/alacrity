import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// NOTE: T10 scope intentionally omits IV/EV/move editors. The POST /api/pokemon
// route expects scalar iv_*/ev_* fields and move1..move4 strings; the plan's
// nested ivs/evs/moves shape would not post correctly. Leaving editors as a
// follow-up; the notes textarea + tera/alpha/mega/marks/ribbons coverage is
// the priority.

type GameKey = string;

export interface ManualEntryFormState {
  species_id: number | '';
  origin_game: GameKey | '';
  is_shiny: boolean;
  form_id?: number;
  gender?: 'M' | 'F' | 'N';
  nickname?: string;
  caught_date?: string;
  ball?: string;
  level?: number;
  ot_name?: string;
  ot_tid?: number;
  nature?: string;
  ability?: string;
  ribbons?: string[];
  marks?: string[];
  tera_type?: string;
  is_alpha?: boolean;
  is_mega?: boolean;
  notes?: string;
}

interface Props {
  onSubmit: (state: ManualEntryFormState) => Promise<void>;
  onCancel: () => void;
  activeLegs: Array<{ key: string; label: string; games: string[] }>;
}

const GEN_OF: Record<string, number> = {
  red: 1, blue: 1, yellow: 1,
  gold: 2, silver: 2, crystal: 2,
  ruby: 3, sapphire: 3, emerald: 3, firered: 3, leafgreen: 3,
  diamond: 4, pearl: 4, platinum: 4, heartgold: 4, soulsilver: 4,
  black: 5, white: 5, black2: 5, white2: 5,
  x: 6, y: 6, 'omega-ruby': 6, 'alpha-sapphire': 6,
  sun: 7, moon: 7, 'ultra-sun': 7, 'ultra-moon': 7, 'lets-go-pikachu': 7, 'lets-go-eevee': 7,
  sword: 8, shield: 8, 'brilliant-diamond': 8, 'shining-pearl': 8, 'legends-arceus': 8,
  scarlet: 9, violet: 9, 'legends-z-a': 9,
};

interface GroupProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Group({ title, open, onToggle, children }: GroupProps) {
  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-surface-sunken"
      >
        <span>{title}</span>
        <span className="text-xs text-muted-foreground">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-3 border-t border-border space-y-2">{children}</div>}
    </div>
  );
}

export function ManualEntryForm({ onSubmit, onCancel, activeLegs }: Props) {
  const [state, setState] = useState<ManualEntryFormState>({
    species_id: '',
    origin_game: '',
    is_shiny: false,
  });

  const [openGroups, setOpenGroups] = useState({
    identity: true,
    catch: false,
    battle: false,
    cosmetic: false,
  });
  const toggleGroup = (k: keyof typeof openGroups) =>
    setOpenGroups(g => ({ ...g, [k]: !g[k] }));

  const [teraTypes, setTeraTypes] = useState<{ key: string; name: string; color: string }[]>([]);
  const [marksList, setMarksList] = useState<{ key: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dedupe games across legs
  const games = useMemo(
    () => Array.from(new Set(activeLegs.flatMap(l => l.games))),
    [activeLegs],
  );

  const gen = state.origin_game ? GEN_OF[state.origin_game] ?? 0 : 0;
  const showTera = gen >= 9;
  const showAlpha = state.origin_game === 'legends-arceus';
  const showIsMega = state.origin_game === 'legends-z-a';
  const showMarks = gen >= 8;

  useEffect(() => {
    api.reference.teraTypes().then(setTeraTypes).catch(() => setTeraTypes([]));
  }, []);

  useEffect(() => {
    if (!showMarks || !state.origin_game) {
      setMarksList([]);
      return;
    }
    api.reference
      .marks({ game: state.origin_game })
      .then((rows) => setMarksList(rows as any))
      .catch(() => setMarksList([]));
  }, [state.origin_game, showMarks]);

  function update<K extends keyof ManualEntryFormState>(key: K, value: ManualEntryFormState[K]) {
    setState(s => ({ ...s, [key]: value }));
  }

  function toggleArr(key: 'marks' | 'ribbons', value: string) {
    setState(s => {
      const cur = s[key] ?? [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...s, [key]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!state.species_id) {
      setError('species_id is required');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(state);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <Group title="Identity" open={openGroups.identity} onToggle={() => toggleGroup('identity')}>
        <label className="block text-xs">
          <span className="text-muted-foreground">Species ID</span>
          <Input
            type="number"
            value={state.species_id === '' ? '' : state.species_id}
            onChange={e => update('species_id', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Nickname</span>
          <Input
            value={state.nickname ?? ''}
            onChange={e => update('nickname', e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Origin game</span>
          <select
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
            value={state.origin_game}
            onChange={e => update('origin_game', e.target.value)}
          >
            <option value="">— select —</option>
            {games.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={state.is_shiny}
            onChange={e => update('is_shiny', e.target.checked)}
          />
          <span>Shiny</span>
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Gender</span>
          <select
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
            value={state.gender ?? ''}
            onChange={e => update('gender', (e.target.value || undefined) as any)}
          >
            <option value="">—</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="N">Genderless</option>
          </select>
        </label>
      </Group>

      <Group title="Catch" open={openGroups.catch} onToggle={() => toggleGroup('catch')}>
        <label className="block text-xs">
          <span className="text-muted-foreground">Caught date</span>
          <Input
            type="date"
            value={state.caught_date ?? ''}
            onChange={e => update('caught_date', e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Ball</span>
          <Input
            value={state.ball ?? ''}
            onChange={e => update('ball', e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Level</span>
          <Input
            type="number"
            value={state.level ?? ''}
            onChange={e => update('level', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">OT name</span>
          <Input
            value={state.ot_name ?? ''}
            onChange={e => update('ot_name', e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">OT TID</span>
          <Input
            type="number"
            value={state.ot_tid ?? ''}
            onChange={e => update('ot_tid', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </label>
      </Group>

      <Group title="Battle" open={openGroups.battle} onToggle={() => toggleGroup('battle')}>
        <label className="block text-xs">
          <span className="text-muted-foreground">Nature</span>
          <Input
            value={state.nature ?? ''}
            onChange={e => update('nature', e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Ability</span>
          <Input
            value={state.ability ?? ''}
            onChange={e => update('ability', e.target.value)}
          />
        </label>
        {showTera && (
          <label className="block text-xs">
            <span className="text-muted-foreground">Tera type</span>
            <select
              className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
              value={state.tera_type ?? ''}
              onChange={e => update('tera_type', e.target.value || undefined)}
            >
              <option value="">—</option>
              {teraTypes.map(t => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
        {showAlpha && (
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!state.is_alpha}
              onChange={e => update('is_alpha', e.target.checked)}
            />
            <span>Alpha</span>
          </label>
        )}
        {showIsMega && (
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!state.is_mega}
              onChange={e => update('is_mega', e.target.checked)}
            />
            <span>Mega</span>
          </label>
        )}
      </Group>

      <Group
        title="Cosmetic / game-specific"
        open={openGroups.cosmetic}
        onToggle={() => toggleGroup('cosmetic')}
      >
        {showMarks && marksList.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Marks</div>
            <div className="flex flex-wrap gap-1">
              {marksList.map(m => {
                const active = (state.marks ?? []).includes(m.key);
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => toggleArr('marks', m.key)}
                    className={`text-xs px-2 py-0.5 rounded-md border ${active ? 'bg-red-500 text-white border-red-500' : 'border-border'}`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label className="block text-xs">
          <span className="text-muted-foreground">Notes</span>
          <textarea
            className="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-background"
            rows={3}
            value={state.notes ?? ''}
            onChange={e => update('notes', e.target.value)}
          />
        </label>
      </Group>

      {error && <div className="text-xs text-red-500">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

export default ManualEntryForm;
