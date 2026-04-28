import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown';
import { GAME_ACCENTS, normalizeGameName } from '@/lib/game-constants';

function GameDot({ game }: { game: string }) {
  const color = GAME_ACCENTS[normalizeGameName(game)] ?? '#888';
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

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
    icon: <GameDot game={game.label} />,
  }))
);

interface GamePickerProps {
  value: string;
  onChange: (game: string) => void;
}

export default function GamePicker({ value, onChange }: GamePickerProps) {
  return (
    <FilterDropdown
      label="Game"
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
