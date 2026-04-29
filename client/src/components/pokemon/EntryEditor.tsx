import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/api/client';
import SummaryCard from './SummaryCard';
import BallPicker from './BallPicker';
import FormPicker from './FormPicker';
import MoveStrip from './MoveStrip';
import RibbonSection from './RibbonSection';
import MarkSection from './MarkSection';

interface Props {
  entry: any;
  species: any;
  ribbons: any[];
  marks: any[];
  balls: any[];
  forms: any[];
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
];

const GENDERS: Array<{ value: string; label: string }> = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Genderless' },
];

function gameToGen(originGame: string, gameVersions: Array<{ name: string; generation: number }>): number {
  const match = gameVersions.find(v => v.name === originGame);
  return match?.generation ?? 0;
}

export default function EntryEditor({ entry, species, ribbons, marks, balls, forms, onUpdate, onDelete }: Props) {
  const [ballPickerOpen, setBallPickerOpen] = useState(false);
  const [teraTypes, setTeraTypes] = useState<{ key: string; name: string; color: string }[]>([]);
  const [gameVersions, setGameVersions] = useState<Array<{ id: number; name: string; generation: number; sort_order: number }>>([]);

  useEffect(() => {
    api.reference.teraTypes().then(setTeraTypes).catch(() => setTeraTypes([]));
    api.legality.gameVersions().then(setGameVersions).catch(() => setGameVersions([]));
  }, []);

  const earnedRibbons: number[] = (() => {
    try { return JSON.parse(entry.ribbons || '[]'); } catch { return []; }
  })();
  const earnedMarks: number[] = (() => {
    try { return JSON.parse(entry.marks || '[]'); } catch { return []; }
  })();

  const handleRibbonToggle = (ribbonId: number) => {
    const current = new Set(earnedRibbons);
    if (current.has(ribbonId)) current.delete(ribbonId);
    else current.add(ribbonId);
    onUpdate({ ribbons: [...current] });
  };

  const handleMarkToggle = (markId: number) => {
    const current = new Set(earnedMarks);
    if (current.has(markId)) current.delete(markId);
    else current.add(markId);
    onUpdate({ marks: [...current] });
  };

  const moves = [
    entry.move1 ?? null,
    entry.move2 ?? null,
    entry.move3 ?? null,
    entry.move4 ?? null,
  ];

  const handleMoveUpdate = (moveIndex: number, value: string) => {
    const key = `move${moveIndex + 1}` as 'move1' | 'move2' | 'move3' | 'move4';
    onUpdate({ [key]: value || null });
  };

  // Manual override banner
  const manualFields: string[] = entry.manual_fields
    ? (typeof entry.manual_fields === 'string' ? JSON.parse(entry.manual_fields) : entry.manual_fields)
    : [];

  // Origin-gated fields
  const gen = entry.origin_game ? gameToGen(entry.origin_game, gameVersions) : 0;
  const showTera = gen >= 9;
  const showAlpha = entry.origin_game === 'Legends Arceus';
  const showMega = entry.origin_game === 'Legends Z-A';

  // Build ability options from species
  const abilityOptions = [species?.ability1, species?.ability2, species?.hidden_ability]
    .filter(Boolean) as string[];

  // Group game versions by generation for the origin Select
  const gameByGen = gameVersions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .reduce<Record<number, Array<{ id: number; name: string }>>>((acc, v) => {
      (acc[v.generation] ||= []).push({ id: v.id, name: v.name });
      return acc;
    }, {});

  return (
    <div className="space-y-0">
      {entry.source === 'auto' && manualFields.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <span className="font-bold">Manual overrides:</span>
          <span className="opacity-70">{manualFields.join(', ')}</span>
        </div>
      )}

      <SummaryCard
        entry={entry}
        species={species}
        onUpdate={onUpdate}
        onBallClick={() => setBallPickerOpen(prev => !prev)}
      />

      <FormPicker
        value={entry.form_id || null}
        forms={forms}
        onChange={formId => onUpdate({ form_id: formId })}
      />

      <BallPicker
        value={entry.ball || ''}
        balls={balls}
        open={ballPickerOpen}
        onChange={ball => onUpdate({ ball })}
        onClose={() => setBallPickerOpen(false)}
      />

      {/* Attributes panel — fields not covered by SummaryCard's pills */}
      <div className="bg-gradient-to-br from-muted/20 to-muted/5 rounded-lg p-3 border border-border/50 mb-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Origin game */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Origin game</span>
            <Select
              value={entry.origin_game ?? ''}
              onValueChange={(v) => onUpdate({ origin_game: v || null })}
            >
              <SelectTrigger className="w-full mt-1" size="sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(gameByGen).sort((a, b) => Number(a) - Number(b)).map(g => (
                  <SelectGroup key={g}>
                    <SelectLabel className="px-2 py-1 text-2xs uppercase text-muted-foreground/60">Gen {g}</SelectLabel>
                    {gameByGen[Number(g)].map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Nature */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Nature</span>
            <Select
              value={entry.nature ?? ''}
              onValueChange={(v) => onUpdate({ nature: v || null })}
            >
              <SelectTrigger className="w-full mt-1" size="sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {NATURES.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Ability */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Ability</span>
            <Select
              value={entry.ability ?? ''}
              onValueChange={(v) => onUpdate({ ability: v || null })}
            >
              <SelectTrigger className="w-full mt-1" size="sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {abilityOptions.map(a => (
                  <SelectItem key={a} value={a}>
                    <span className="capitalize">{a}</span>
                    {a === species?.hidden_ability && <span className="ml-1 text-pink-500 text-2xs">(HA)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Gender */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Gender</span>
            <Select
              value={entry.gender ?? ''}
              onValueChange={(v) => onUpdate({ gender: v || null })}
            >
              <SelectTrigger className="w-full mt-1" size="sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Held item */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Held item</span>
            <input
              type="text"
              value={entry.held_item ?? ''}
              onChange={e => onUpdate({ held_item: e.target.value || null })}
              className="w-full mt-1 h-7 rounded-md border border-input bg-surface-raised px-2 text-sm"
              placeholder="—"
            />
          </label>

          {/* Caught date */}
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Caught date</span>
            <input
              type="date"
              value={entry.caught_date ?? ''}
              onChange={e => onUpdate({ caught_date: e.target.value || null })}
              className="w-full mt-1 h-7 rounded-md border border-input bg-surface-raised px-2 text-sm"
            />
          </label>
        </div>

        {/* Tera type — gen 9+ */}
        {showTera && (
          <label className="block text-xs">
            <span className="text-muted-foreground/70 font-semibold">Tera type</span>
            <Select
              value={entry.tera_type ?? ''}
              onValueChange={(v) => onUpdate({ tera_type: v || null })}
            >
              <SelectTrigger className="w-full mt-1" size="sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {teraTypes.map(t => (
                  <SelectItem key={t.key} value={t.key}>
                    <span
                      className="inline-block w-3 h-3 rounded-sm mr-1.5"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {/* Alpha / Mega toggles */}
        {(showAlpha || showMega) && (
          <div className="flex gap-1.5">
            {showAlpha && (
              <button
                type="button"
                onClick={() => onUpdate({ is_alpha: entry.is_alpha ? 0 : 1 })}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-all ${
                  entry.is_alpha
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-white text-muted-foreground/40 border-muted-foreground/10'
                }`}
              >
                α Alpha
              </button>
            )}
            {showMega && (
              <button
                type="button"
                onClick={() => onUpdate({ is_mega: entry.is_mega ? 0 : 1 })}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-all ${
                  entry.is_mega
                    ? 'bg-purple-50 text-purple-600 border-purple-200'
                    : 'bg-white text-muted-foreground/40 border-muted-foreground/10'
                }`}
              >
                Mega
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <label className="block text-xs">
          <span className="text-muted-foreground/70 font-semibold">Notes</span>
          <textarea
            value={entry.notes ?? ''}
            onChange={e => onUpdate({ notes: e.target.value || null })}
            rows={2}
            className="w-full mt-1 rounded-md border border-input bg-surface-raised px-2 py-1.5 text-sm resize-y"
            placeholder="—"
          />
        </label>
      </div>

      <MoveStrip moves={moves} onUpdate={handleMoveUpdate} />

      <RibbonSection ribbons={ribbons} earned={earnedRibbons} onToggle={handleRibbonToggle} />

      <MarkSection marks={marks} earned={earnedMarks} onToggle={handleMarkToggle} />

      {onDelete && (
        <div className="pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="text-xs h-7"
          >
            Delete Entry
          </Button>
        </div>
      )}
    </div>
  );
}
