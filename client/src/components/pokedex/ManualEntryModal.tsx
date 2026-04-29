import { useEffect, useMemo, useState } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { Sprite } from '@/components/Sprite';
import { useSpritePrefs } from '@/hooks/useSpritePrefs';
import EntryEditor from '@/components/pokemon/EntryEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ribbons: any[];
  marks: any[];
  balls: any[];
}

const MAX_RENDERED = 50;

export default function ManualEntryModal({ open, onClose, onSaved, ribbons, marks, balls }: Props) {
  const [allSpecies, setAllSpecies] = useState<any[]>([]);
  const [pickedValue, setPickedValue] = useState<string>('');
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState<any | null>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [entry, setEntry] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { style } = useSpritePrefs();

  // Load species list on open
  useEffect(() => {
    if (!open) return;
    api.species.list().then(setAllSpecies).catch(() => setAllSpecies([]));
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setPickedValue('');
      setSearch('');
      setSpecies(null);
      setForms([]);
      setEntry(null);
      setError(null);
    }
  }, [open]);

  const { visible, total } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matched = q
      ? allSpecies.filter(s =>
          s.name.toLowerCase().includes(q) || String(s.id).startsWith(q),
        )
      : allSpecies;
    return { visible: matched.slice(0, MAX_RENDERED), total: matched.length };
  }, [allSpecies, search]);

  const handlePickSpecies = async (val: string | null) => {
    setPickedValue(val ?? '');
    if (!val) return;
    const sp = allSpecies.find(s => String(s.id) === val);
    if (!sp) return;
    setBusy(true);
    setError(null);
    try {
      const [newEntry, formsList] = await Promise.all([
        api.pokemon.create({ species_id: sp.id, source: 'manual' }),
        api.species.forms(sp.id).catch(() => []),
      ]);
      setSpecies(sp);
      setForms(formsList);
      setEntry(newEntry);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create entry');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!entry) return;
    try {
      const updated = await api.pokemon.update(entry.id, data);
      // Merge optimistically
      setEntry((cur: any) => ({ ...cur, ...data, ...(updated || {}) }));
      onSaved();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update');
    }
  };

  const handleCancel = async () => {
    // If user picked species + created an entry but wants to bail, delete it.
    if (entry) {
      try { await api.pokemon.delete(entry.id); } catch { /* ignore */ }
      onSaved();
    }
    onClose();
  };

  const handleDone = () => {
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>Add Pokémon manually</DialogTitle>

        {!entry && (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground font-semibold">
              Species
            </label>
            <Combobox value={pickedValue} onValueChange={handlePickSpecies}>
              <ComboboxInput
                placeholder="Search species name or #..."
                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                disabled={busy}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No species found.</ComboboxEmpty>
                  {visible.map(s => (
                    <ComboboxItem key={s.id} value={String(s.id)}>
                      <Sprite kind="pokemon" id={s.id} style={style} size={24} className="w-6 h-6" />
                      <span className="text-xs text-muted-foreground/60 w-10">#{s.id}</span>
                      <span className="flex-1 capitalize">{s.name}</span>
                    </ComboboxItem>
                  ))}
                  {total > MAX_RENDERED && (
                    <div className="px-2 py-1.5 text-xs text-center text-muted-foreground">
                      Showing {MAX_RENDERED} of {total} — type to narrow
                    </div>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {error && <div className="text-xs text-red-500">{error}</div>}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {entry && species && (
          <div className="space-y-3">
            <EntryEditor
              entry={entry}
              species={species}
              ribbons={ribbons}
              marks={marks}
              balls={balls}
              forms={forms}
              onUpdate={handleUpdate}
            />
            {error && <div className="text-xs text-red-500">{error}</div>}
            <div className="flex justify-between gap-2 pt-2 border-t border-border/30">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Discard
              </Button>
              <Button size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
