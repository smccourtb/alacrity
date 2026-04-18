import { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/client';
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown';

interface Save {
  id: number;
  file_path: string;
  game: string;
  generation: number | null;
  label: string;
  source: 'checkpoint' | 'catch' | 'library' | 'hunt';
  format: string;
  file_size: number;
  file_mtime: string;
}

interface SavePickerProps {
  value: string;
  onChange: (path: string) => void;
  game?: string;
}

const SOURCE_ORDER: Save['source'][] = ['library', 'catch', 'checkpoint', 'hunt'];
const SOURCE_LABELS: Record<Save['source'], string> = {
  library: 'Library',
  catch: 'Catches',
  checkpoint: 'Checkpoints',
  hunt: 'Hunts',
};

export default function SavePicker({ value, onChange, game }: SavePickerProps) {
  const [saves, setSaves] = useState<Save[]>([]);

  useEffect(() => {
    api.saves.list().then(setSaves).catch(() => setSaves([]));
  }, []);

  const normalizeGame = (g: string) => g.replace(/^Pokemon\s+/i, '').toLowerCase();

  const options: FilterOption[] = useMemo(() => {
    let list = saves.filter(s => s.format === '.sav' || s.format === '.dat');
    if (game) {
      const norm = normalizeGame(game);
      list = list.filter(s => normalizeGame(s.game) === norm);
    }

    // Sort by source order, then by mtime desc within each source
    list.sort((a, b) => {
      const si = SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source);
      if (si !== 0) return si;
      return new Date(b.file_mtime).getTime() - new Date(a.file_mtime).getTime();
    });

    return list.map(s => ({
      value: s.file_path,
      label: s.label || s.file_path.split('/').pop() || s.file_path,
      group: SOURCE_LABELS[s.source],
    }));
  }, [saves, game]);

  return (
    <FilterDropdown
      label="Select a save file"
      options={options}
      selected={value ? [value] : []}
      onChange={(sel) => onChange(sel[0] ?? '')}
      multiSelect={false}
      searchable
    />
  );
}
