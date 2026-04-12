import { Gamepad2Icon } from 'lucide-react';
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown';

const GAME_GROUPS = [
  { label: 'Gen 1', games: [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'yellow', label: 'Yellow' },
  ]},
  { label: 'Gen 2', games: [
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
    { value: 'crystal', label: 'Crystal' },
  ]},
  { label: 'Gen 3', games: [
    { value: 'ruby', label: 'Ruby' },
    { value: 'sapphire', label: 'Sapphire' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'firered', label: 'FireRed' },
    { value: 'leafgreen', label: 'LeafGreen' },
  ]},
  { label: 'Gen 4', games: [
    { value: 'diamond', label: 'Diamond' },
    { value: 'pearl', label: 'Pearl' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'heartgold', label: 'HeartGold' },
    { value: 'soulsilver', label: 'SoulSilver' },
  ]},
  { label: 'Gen 5', games: [
    { value: 'black', label: 'Black' },
    { value: 'white', label: 'White' },
    { value: 'black2', label: 'Black 2' },
    { value: 'white2', label: 'White 2' },
  ]},
  { label: 'Gen 6', games: [
    { value: 'x', label: 'X' },
    { value: 'y', label: 'Y' },
    { value: 'omegaruby', label: 'Omega Ruby' },
    { value: 'alphasapphire', label: 'Alpha Sapphire' },
  ]},
  { label: 'Gen 7', games: [
    { value: 'ultrasun', label: 'Ultra Sun' },
    { value: 'ultramoon', label: 'Ultra Moon' },
  ]},
];

const ALL_OPTIONS: FilterOption[] = GAME_GROUPS.flatMap(g =>
  g.games.map(game => ({
    value: game.value,
    label: game.label,
    group: g.label,
    icon: <Gamepad2Icon className="w-3.5 h-3.5 text-muted-foreground" />,
  }))
);

interface GamePickerProps {
  value: string;
  onChange: (game: string) => void;
}

export default function GamePicker({ value, onChange }: GamePickerProps) {
  return (
    <FilterDropdown
      label="Select a game"
      options={ALL_OPTIONS}
      selected={value ? [value] : []}
      onChange={(sel) => {
        const v = sel[0];
        if (v != null) onChange(v);
      }}
      multiSelect={false}
      searchable
    />
  );
}
