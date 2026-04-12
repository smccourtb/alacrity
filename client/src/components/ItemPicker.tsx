import { useMemo } from 'react';
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown';

interface Item {
  path: string;
  name: string;
  detail?: string;
}

interface ItemPickerProps {
  value: string;
  onChange: (path: string) => void;
  items: Item[];
  placeholder?: string;
  icon?: string;
}

export default function ItemPicker({ value, onChange, items, placeholder = 'Select...', icon }: ItemPickerProps) {
  const options: FilterOption[] = useMemo(() =>
    items.map(i => ({
      value: i.path,
      label: i.name,
      icon: icon ? <span className="text-xs">{icon}</span> : undefined,
    })),
  [items, icon]);

  return (
    <FilterDropdown
      label={placeholder}
      options={options}
      selected={value ? [value] : []}
      onChange={(sel) => onChange(sel[0] ?? '')}
      multiSelect={false}
      searchable={items.length > 5}
    />
  );
}
