import FilterDropdown from '@/components/FilterDropdown';

const GAMES = [
  { value: 'red', label: 'VC Red', map: 'kanto' },
  { value: 'blue', label: 'VC Blue', map: 'kanto' },
  { value: 'yellow', label: 'VC Yellow', map: 'kanto' },
  { value: 'gold', label: 'VC Gold', map: 'johto' },
  { value: 'silver', label: 'VC Silver', map: 'johto' },
  { value: 'crystal', label: 'VC Crystal', map: 'johto' },
];

interface GameSelectorProps {
  value: string;
  onChange: (game: string) => void;
}

export default function GameSelector({ value, onChange }: GameSelectorProps) {
  return (
    <FilterDropdown
      label="Select game"
      options={GAMES.map(g => ({ value: g.value, label: g.label }))}
      selected={value ? [value] : []}
      onChange={(sel) => {
        const v = sel[0];
        if (v != null) onChange(v);
      }}
      multiSelect={false}
    />
  );
}

export function getMapKeyForGame(game: string): string {
  const entry = GAMES.find(g => g.value === game);
  return entry?.map ?? 'kanto';
}
