import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';

interface PokemonSearchProps {
  game: string;
  onSelect: (speciesId: number, speciesName: string) => void;
  onClear: () => void;
  /** Bump this number from the parent to clear the input + selected pill. */
  clearSignal?: number;
}

export default function PokemonSearch({ game, onSelect, onClear, clearSignal }: PokemonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; name: string; sprite_url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.guide.speciesSearch(query, game).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, game]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear selection when game changes
  useEffect(() => {
    setSelected(null);
    setQuery('');
    onClear();
  }, [game]);

  // External clear trigger — bumping clearSignal from the parent resets state.
  // Skip the initial render (clearSignal undefined/unset).
  useEffect(() => {
    if (clearSignal == null) return;
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [clearSignal]);

  function handleSelect(species: any) {
    setSelected(species);
    setQuery('');
    setOpen(false);
    onSelect(species.id, species.name);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setResults([]);
    onClear();
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 text-sm">
          <img src={selected.sprite_url} alt="" className="w-5 h-5 pixelated" />
          <span className="capitalize font-medium">{selected.name.replace(/-/g, ' ')}</span>
          <button
            onClick={handleClear}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Find Pokemon..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="w-full pl-8"
          />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[1100]">
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <img src={s.sprite_url} alt="" className="w-6 h-6 pixelated" />
              <span className="text-sm font-medium capitalize">{s.name.replace(/-/g, ' ')}</span>
              <span className="text-xs text-muted-foreground ml-auto">#{s.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
