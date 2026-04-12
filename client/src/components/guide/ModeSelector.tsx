import FilterDropdown from '@/components/FilterDropdown';

const GAMES = [
  { value: 'red', label: 'Red', map: 'kanto' },
  { value: 'blue', label: 'Blue', map: 'kanto' },
  { value: 'yellow', label: 'Yellow', map: 'kanto' },
  { value: 'gold', label: 'Gold', map: 'johto' },
  { value: 'silver', label: 'Silver', map: 'johto' },
  { value: 'crystal', label: 'Crystal', map: 'johto' },
];

export const CAMPAIGN_MODE = '__campaign__';

interface ModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const options = [
    { value: CAMPAIGN_MODE, label: 'GB Origin Campaign', group: 'Campaign' },
    ...GAMES.map(g => ({ value: g.value, label: g.label, group: 'Game Guide' })),
  ];

  return (
    <FilterDropdown
      label="Select mode..."
      options={options}
      selected={value ? [value] : []}
      onChange={(sel) => {
        const v = sel[0];
        if (v != null) onChange(v);
      }}
      multiSelect={false}
    />
  );
}

export function getMapKeyForMode(mode: string): string {
  if (mode === CAMPAIGN_MODE) return 'kanto';
  const entry = GAMES.find(g => g.value === mode);
  return entry?.map ?? 'kanto';
}
