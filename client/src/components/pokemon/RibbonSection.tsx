import ObtainmentPopover from './ObtainmentPopover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  ribbons: any[]; // all 93 reference ribbons from API (has id, name, category, how_to_obtain, games, sort_order)
  earned: number[]; // array of ribbon IDs earned by this entry
  onToggle: (ribbonId: number) => void;
}

const CATEGORY_ORDER = [
  { key: 'champion', label: 'Champion' },
  { key: 'contest-deprecated-gen3', label: 'Contest (Gen III)' },
  { key: 'contest-deprecated-gen4', label: 'Contest (Gen IV)' },
  { key: 'contest', label: 'Contest' },
  { key: 'battle-facility', label: 'Battle Facility' },
  { key: 'miscellaneous', label: 'Miscellaneous' },
  { key: 'colosseum-xd', label: 'Colosseum/XD' },
];

export default function RibbonSection({ ribbons, earned, onToggle }: Props) {
  const earnedSet = new Set(earned);

  const grouped = CATEGORY_ORDER.map(cat => ({
    ...cat,
    ribbons: ribbons.filter(r => r.category === cat.key),
  })).filter(g => g.ribbons.length > 0);

  return (
    <Collapsible defaultOpen={false} className="mb-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full mb-2">
        <h4 className="text-xs font-bold text-foreground/80">🎀 Ribbons</h4>
        <span className="text-xs font-bold text-muted-foreground/50">{earnedSet.size} / {ribbons.length}</span>
        <span className="flex-1 h-px bg-border/50" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        {grouped.map(group => (
          <div key={group.key} className="mb-2">
            <div className="text-2xs font-bold text-muted-foreground/30 uppercase tracking-wider mb-1">{group.label}</div>
            <div className="flex flex-wrap gap-1">
              {group.ribbons.map(ribbon => {
                const isEarned = earnedSet.has(ribbon.id);
                return (
                  <ObtainmentPopover
                    key={ribbon.id}
                    name={ribbon.name}
                    howToObtain={ribbon.how_to_obtain}
                    games={ribbon.games}
                  >
                    <button
                      onClick={() => onToggle(ribbon.id)}
                      className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition-all ${
                        isEarned
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-muted/30 text-muted-foreground/30 hover:bg-muted/50 hover:text-muted-foreground/50'
                      }`}
                    >
                      {ribbon.name.replace(' Ribbon', '')}
                    </button>
                  </ObtainmentPopover>
                );
              })}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
