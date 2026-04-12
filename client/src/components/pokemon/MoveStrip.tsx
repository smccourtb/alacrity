import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { MovePill, MoveCategoryIcon, TypePill } from '@/components/icons';
import {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';

function formatMove(name: string) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface Props {
  moves: (string | null)[];
  onUpdate: (moveIndex: number, value: string) => void;
}

function MoveSlot({ move, moveData, onSelect }: {
  move: string | null;
  moveData?: { type: string; category: string } | null;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (open && results.length === 0) {
      api.moves.search('').then(setResults);
    }
  }, [open]);

  const handleSearch = useCallback((value: string) => {
    setHasSearched(value.length > 0);
    api.moves.search(value).then(setResults);
  }, []);

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      value={move ? [move] : []}
      onValueChange={(val: any) => {
        const selected = Array.isArray(val) ? val[0] : val;
        if (selected) {
          onSelect(selected);
          setOpen(false);
        }
      }}
    >
      <ComboboxTrigger className="w-full cursor-pointer [&>svg]:hidden">
        {move ? (
          <MovePill
            name={move}
            type={moveData?.type || ''}
            category={moveData?.category as any}
            size="sm"
          />
        ) : (
          <div className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-dashed border-muted-foreground/15 text-xs text-muted-foreground/30 font-semibold hover:border-primary/30 hover:text-primary/50 transition-all text-center">
            + Move
          </div>
        )}
      </ComboboxTrigger>
      <ComboboxContent side="bottom" align="start" className="w-72">
        <ComboboxInput
          placeholder="Search moves..."
          onValueChange={handleSearch}
          showTrigger={false}
        />
        <ComboboxList>
          {hasSearched && <ComboboxEmpty>No moves found.</ComboboxEmpty>}
          {results.map(m => (
            <ComboboxItem key={m.name} value={m.name} className="text-sm">
              <TypePill type={m.type} variant="icon-only" size="sm" />
              <MoveCategoryIcon category={m.category} size="sm" />
              <span className="font-semibold flex-1">{formatMove(m.name)}</span>
              {m.power != null && (
                <span className="text-2xs font-bold text-muted-foreground/50">{m.power} pw</span>
              )}
              {m.accuracy != null && (
                <span className="text-2xs text-muted-foreground/30">{m.accuracy}%</span>
              )}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export default function MoveStrip({ moves, onUpdate }: Props) {
  const slots = [moves[0] ?? null, moves[1] ?? null, moves[2] ?? null, moves[3] ?? null];
  const [moveDataMap, setMoveDataMap] = useState<Record<string, any>>({});

  // Look up type/category for all current moves
  useEffect(() => {
    const names = slots.filter(Boolean) as string[];
    if (names.length === 0) return;
    const missing = names.filter(n => !moveDataMap[n]);
    if (missing.length === 0) return;
    api.moves.lookup(missing).then(data => {
      const map: Record<string, any> = {};
      for (const m of data) map[m.name] = m;
      setMoveDataMap(prev => ({ ...prev, ...map }));
    });
  }, [moves[0], moves[1], moves[2], moves[3]]);

  return (
    <div className="grid grid-cols-2 gap-1.5 mb-3">
      {slots.map((move, i) => (
        <MoveSlot
          key={i}
          move={move}
          moveData={move ? moveDataMap[move] : null}
          onSelect={v => onUpdate(i, v)}
        />
      ))}
    </div>
  );
}
