import { useState, useMemo } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { TYPE_COLORS, getSubMarkerLabel } from './SubMarker';
import type { SubMarker } from '@/api/client';

const MAX_RENDERED = 50;

interface CalibrationSearchProps {
  markers: SubMarker[];
  onSelect: (marker: SubMarker) => void;
}

export default function CalibrationSearch({ markers, onSelect }: CalibrationSearchProps) {
  const [value, setValue] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { visible, total } = useMemo(() => {
    const query = search.toLowerCase().trim();
    const matched = query
      ? markers.filter(m => m.name.toLowerCase().includes(query) || m.location_name.toLowerCase().includes(query))
      : markers;
    return { visible: matched.slice(0, MAX_RENDERED), total: matched.length };
  }, [markers, search]);

  return (
    <Combobox
      value={value}
      onValueChange={(newVal) => {
        setValue(newVal);
        const id = newVal[0];
        if (id) {
          const [type, idStr] = id.split(':');
          const marker = markers.find(m => m.type === type && m.id === Number(idStr));
          if (marker) onSelect(marker);
        }
      }}
    >
      <ComboboxInput
        placeholder="Search items, trainers..."
        className="h-8 text-xs"
        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No results found.</ComboboxEmpty>
          {visible.map(m => (
            <ComboboxItem
              key={`${m.type}:${m.id}`}
              value={`${m.type}:${m.id}`}
              textValue={m.name}
            >
              <span
                className="inline-block w-4 text-center text-xs"
                style={{ color: TYPE_COLORS[m.type] }}
              >
                {getSubMarkerLabel(m)}
              </span>
              <span className="flex-1 truncate">{m.name}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {m.location_name}
              </span>
              <span className="text-xs">
                {m.x != null ? '✓' : '○'}
              </span>
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
  );
}
