import { useState, useEffect } from 'react';
import { SaveIcon } from 'lucide-react';
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown';
import { api } from '@/api/client';

interface SaveFile {
  id: number;
  file_path: string;
  filename: string;
  label: string | null;
  game: string | null;
  notes: string | null;
}

interface SaveOverlaySelectorProps {
  game: string;
  value: number | null;
  onChange: (saveId: number | null) => void;
}

export default function SaveOverlaySelector({ game, value, onChange }: SaveOverlaySelectorProps) {
  const [saves, setSaves] = useState<SaveFile[]>([]);

  useEffect(() => {
    api.saves.list().then((all: SaveFile[]) => {
      const SAVE_NAMES = ['main', 'sav.dat'];
      const SAVE_EXTS = ['.sav', '.dat'];
      const filtered = all.filter((s) => {
        // Only legit save files — no save states, rtc files, etc.
        const name = (s.filename || '').toLowerCase();
        const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
        const isLegitSave = SAVE_NAMES.includes(name) || SAVE_EXTS.includes(ext);
        if (!isLegitSave) return false;
        if (s.game) {
          return s.game.toLowerCase() === game.toLowerCase();
        }
        return s.file_path.toLowerCase().includes(game.toLowerCase());
      });
      // Deduplicate: keep one save per unique parent directory
      const seen = new Map<string, typeof filtered[0]>();
      for (const s of filtered) {
        const parts = s.file_path.split('/');
        const dirKey = parts.slice(0, -1).join('/');
        if (!seen.has(dirKey)) seen.set(dirKey, s);
      }
      setSaves(Array.from(seen.values()));
    }).catch(() => setSaves([]));
  }, [game]);

  const selectValue = value != null ? String(value) : '__none__';

  // Show parent directory as label (e.g. "Starter" from ".../Red/Starter/sav.dat")
  function saveLabel(s: SaveFile): string {
    if (s.notes) return s.notes;
    const parts = s.file_path.split('/');
    const parentDir = parts[parts.length - 2];
    if (parentDir && parentDir !== s.filename) return parentDir;
    return s.label || s.filename;
  }

  function saveOrigin(s: SaveFile): { label: string; style: React.CSSProperties } {
    const idx = s.file_path.indexOf('/saves/');
    if (idx < 0) return { label: 'Local', style: { background: '#e5e7eb', color: '#374151' } };
    const rel = s.file_path.substring(idx + 7);
    const firstDir = rel.split('/')[0];
    const config: Record<string, { label: string; style: React.CSSProperties }> = {
      checkpoint: { label: 'Checkpoint', style: { background: '#374151', color: '#fff' } },
      library: { label: 'Library', style: { background: 'linear-gradient(to right, #fbbf24, #f97316)', color: '#0f172a' } },
      hunts: { label: 'Hunt', style: { background: '#059669', color: '#fff' } },
    };
    const match = config[firstDir];
    if (match) return match;
    return { label: firstDir.charAt(0).toUpperCase() + firstDir.slice(1), style: { background: '#e5e7eb', color: '#374151' } };
  }

  const options: FilterOption[] = [
    { value: '__none__', label: 'No save overlay' },
    ...saves.map((s) => {
      const origin = saveOrigin(s);
      return {
        value: String(s.id),
        label: `${saveLabel(s)} [${origin.label}]`,
        icon: <SaveIcon className="w-3.5 h-3.5 text-muted-foreground" />,
      };
    }),
  ];

  return (
    <FilterDropdown
      label="No save overlay"
      options={options}
      selected={selectValue !== '__none__' ? [selectValue] : []}
      onChange={(sel) => {
        const v = sel[0];
        if (v == null || v === '__none__') {
          onChange(null);
        } else {
          onChange(Number(v));
        }
      }}
      multiSelect={false}
    />
  );
}
