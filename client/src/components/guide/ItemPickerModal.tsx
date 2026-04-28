import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';

function prettifyName(raw: string): string {
  return raw
    .split('-')
    .map(w => (w === 'hm' || w === 'tm' || w === 'tr' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export interface PickedIcon {
  sprite_kind: 'item' | 'pokemon';
  /** Path relative to /sprites/<kind>/ (e.g. "poke-ball.png" or "versions/generation-ii/crystal/201-a.png") */
  sprite_ref: string;
  /** Pretty name for tooltip/alt text. */
  label: string;
}

interface Item {
  id: number;
  name: string;
  display_name: string;
  category: string;
  generation: number | null;
  sprite_path: string | null;
}

interface Species {
  id: number;
  name: string;
}

interface Props {
  /** New unified callback — receives sprite_kind + sprite_ref. */
  onPick?: (picked: PickedIcon) => void;
  /** Legacy callback — item tab only. */
  onSelect?: (item: Item) => void;
  onClose: () => void;
  /** Default tab when opened. */
  initialKind?: 'item' | 'pokemon';
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'standard-balls', label: 'Balls' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'key-items', label: 'Key Items' },
  { value: 'machines', label: 'TMs/HMs' },
  { value: 'berries', label: 'Berries' },
  { value: 'battle-items', label: 'Battle' },
  { value: 'other', label: 'Other' },
];

const POKE_GROUPS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unown', label: 'Unown' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'gen1', label: 'Gen 1' },
  { value: 'gen2', label: 'Gen 2' },
  { value: 'gen3', label: 'Gen 3' },
];

// Hand-rolled list of Gen 1-3 legendary/mythical species ids (what people will
// actually want to pin on a map).
const LEGENDARY_IDS = new Set<number>([
  144, 145, 146, 150, 151,              // Gen 1
  243, 244, 245, 249, 250, 251,          // Gen 2
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Gen 3
]);

const UNOWN_FORMS = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m',
  'n','o','p','q','r','s','t','u','v','w','x','y','z',
  'exclamation','question',
];

function boxSprite(id: number): string {
  return `/sprites/pokemon/box/${id}.png`;
}
function crystalUnownSprite(form: string): string {
  return `/sprites/pokemon/versions/generation-ii/crystal/201-${form}.png`;
}

export default function ItemPickerModal({ onSelect, onPick, onClose, initialKind = 'item' }: Props) {
  const [kind, setKind] = useState<'item' | 'pokemon'>(initialKind);
  const [items, setItems] = useState<Item[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [category, setCategory] = useState('all');
  const [pokeGroup, setPokeGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [hoveredLabel, setHoveredLabel] = useState<{ text: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, [kind]);

  function showLabelFor(text: string, btn: HTMLButtonElement) {
    const r = btn.getBoundingClientRect();
    setHoveredLabel({ text, x: r.left + r.width / 2, y: r.top });
  }
  function startLongPress(text: string, btn: HTMLButtonElement) {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => showLabelFor(text, btn), 450);
  }
  function cancelLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  useEffect(() => {
    if (kind !== 'item') return;
    api.items.list({
      category: category === 'all' ? undefined : category,
      search: search || undefined,
    }).then(rows => setItems((rows as Item[]).filter(r => r.sprite_path)));
  }, [kind, category, search]);

  useEffect(() => {
    if (kind !== 'pokemon' || species.length > 0) return;
    api.species.list().then(rows => {
      setSpecies((rows as Species[]).map(r => ({ id: r.id, name: r.name })));
    });
  }, [kind, species.length]);

  // Pokémon entries: virtual Unown letters + regular species filtered by group + search.
  const pokeEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchQ = (name: string) => !q || name.toLowerCase().includes(q);

    type Entry = { key: string; label: string; spriteUrl: string; spriteRef: string };
    const out: Entry[] = [];

    // Unown letters — virtual entries, no species id of their own.
    if (pokeGroup === 'all' || pokeGroup === 'unown') {
      for (const f of UNOWN_FORMS) {
        const label = `Unown ${f === 'exclamation' ? '!' : f === 'question' ? '?' : f.toUpperCase()}`;
        if (!matchQ(label) && !matchQ(`unown-${f}`)) continue;
        out.push({
          key: `unown-${f}`,
          label,
          spriteUrl: crystalUnownSprite(f),
          spriteRef: `versions/generation-ii/crystal/201-${f}.png`,
        });
      }
      if (pokeGroup === 'unown') return out;
    }

    for (const sp of species) {
      const gen =
        sp.id <= 151 ? 'gen1' :
        sp.id <= 251 ? 'gen2' :
        sp.id <= 386 ? 'gen3' : 'other';
      const isLegendary = LEGENDARY_IDS.has(sp.id);

      if (pokeGroup === 'legendary' && !isLegendary) continue;
      if (pokeGroup === 'gen1' && gen !== 'gen1') continue;
      if (pokeGroup === 'gen2' && gen !== 'gen2') continue;
      if (pokeGroup === 'gen3' && gen !== 'gen3') continue;

      if (!matchQ(sp.name)) continue;
      if (sp.id === 201) continue; // Unown handled via per-form entries above
      out.push({
        key: `p-${sp.id}`,
        label: prettifyName(sp.name),
        spriteUrl: boxSprite(sp.id),
        spriteRef: `box/${sp.id}.png`,
      });
    }

    return out;
  }, [species, pokeGroup, search]);

  function handleItemPick(item: Item) {
    // Legacy onSelect path.
    if (onSelect) onSelect(item);
    if (onPick) {
      const ref = item.sprite_path
        ? item.sprite_path.replace(/^\/sprites\/items\//, '')
        : item.name;
      onPick({ sprite_kind: 'item', sprite_ref: ref, label: prettifyName(item.display_name ?? item.name) });
    }
  }
  function handlePokePick(entry: { label: string; spriteRef: string }) {
    if (onPick) onPick({ sprite_kind: 'pokemon', sprite_ref: entry.spriteRef, label: entry.label });
  }

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(
    <div data-rt-modal className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg w-[640px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-border flex items-center gap-2">
          <h3 className="font-semibold text-sm flex-1">Choose icon</h3>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div className="px-3 pt-2 flex gap-1">
          {(['item','pokemon'] as const).map(k => (
            <button
              key={k}
              onClick={() => { setKind(k); setSearch(''); }}
              className={`text-xs px-2.5 py-1 rounded ${kind === k ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
            >
              {k === 'item' ? 'Items' : 'Pokémon'}
            </button>
          ))}
        </div>
        <div className="p-3 space-y-2 border-b border-border">
          <Input
            ref={searchRef}
            placeholder={kind === 'item' ? 'Search items...' : 'Search Pokémon...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {(kind === 'item' ? CATEGORIES : POKE_GROUPS).map(c => {
              const active = kind === 'item' ? category === c.value : pokeGroup === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => kind === 'item' ? setCategory(c.value) : setPokeGroup(c.value)}
                  className={`text-xs px-2 py-1 rounded ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {kind === 'item' ? (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1">
                {items.map(item => {
                  const label = prettifyName(item.display_name ?? item.name);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemPick(item)}
                      onMouseEnter={(e) => showLabelFor(label, e.currentTarget)}
                      onMouseLeave={() => setHoveredLabel(null)}
                      onTouchStart={(e) => startLongPress(label, e.currentTarget)}
                      onTouchEnd={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      className="aspect-square flex items-center justify-center bg-muted hover:bg-muted/70 rounded"
                    >
                      <img
                        src={item.sprite_path!}
                        alt={label}
                        style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </button>
                  );
                })}
              </div>
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No items match</div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1">
                {pokeEntries.map(entry => (
                  <button
                    key={entry.key}
                    onClick={() => handlePokePick(entry)}
                    onMouseEnter={(e) => showLabelFor(entry.label, e.currentTarget)}
                    onMouseLeave={() => setHoveredLabel(null)}
                    onTouchStart={(e) => startLongPress(entry.label, e.currentTarget)}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    className="aspect-square flex items-center justify-center bg-muted hover:bg-muted/70 rounded p-0.5"
                  >
                    <img
                      src={entry.spriteUrl}
                      alt={entry.label}
                      style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </button>
                ))}
              </div>
              {pokeEntries.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No Pokémon match</div>
              )}
            </>
          )}
        </div>
      </div>
      {hoveredLabel && (
        <div
          className="fixed pointer-events-none z-[10000] rounded bg-popover text-popover-foreground border border-border px-1.5 py-0.5 text-[11px] shadow whitespace-nowrap -translate-x-1/2 -translate-y-full"
          style={{ left: hoveredLabel.x, top: hoveredLabel.y - 4 }}
        >
          {hoveredLabel.text}
        </div>
      )}
    </div>,
    document.body
  );
}
