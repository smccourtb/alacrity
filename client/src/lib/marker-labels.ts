// Display labels for raw DB values on sub-markers (location_items.method,
// location_events.event_type, etc). Keep the DB values snake_case for
// programmatic matching and convert here at the render boundary.

const LABELS: Record<string, string> = {
  // item methods
  gift: 'Gift',
  field: 'Field',
  hidden: 'Hidden',
  purchase: 'Purchase',
  choice: 'Choice',
  reward: 'Reward',
  visible: 'Visible',
  // event types
  gift_pokemon: 'Gift Pokémon',
  static_pokemon: 'Static Pokémon',
  side_quest: 'Side Quest',
  elite_four: 'Elite Four',
  gym: 'Gym',
  story: 'Story',
  rival: 'Rival',
  trade: 'Trade',
  legendary: 'Legendary',
};

export function prettifyMarkerDetail(value: string | null | undefined): string {
  if (!value) return '';
  if (LABELS[value]) return LABELS[value];
  return value
    .split('_')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
