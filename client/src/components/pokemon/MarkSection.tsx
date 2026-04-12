import ObtainmentPopover from './ObtainmentPopover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  marks: any[]; // all 54 reference marks
  earned: number[]; // array of mark IDs earned by this entry
  onToggle: (markId: number) => void;
}

const CATEGORY_ORDER = [
  { key: 'time', label: 'Time' },
  { key: 'weather', label: 'Weather' },
  { key: 'event', label: 'Event' },
  { key: 'special', label: 'Special' },
  { key: 'personality', label: 'Personality' },
  { key: 'size', label: 'Size' },
];

export default function MarkSection({ marks, earned, onToggle }: Props) {
  const earnedSet = new Set(earned);

  const grouped = CATEGORY_ORDER.map(cat => ({
    ...cat,
    marks: marks.filter(m => m.category === cat.key),
  })).filter(g => g.marks.length > 0);

  return (
    <Collapsible defaultOpen={false} className="mb-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full mb-2">
        <h4 className="text-xs font-bold text-foreground/80">🔖 Marks</h4>
        <span className="text-xs font-bold text-muted-foreground/50">{earnedSet.size} / {marks.length}</span>
        <span className="flex-1 h-px bg-border/50" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        {grouped.map(group => (
          <div key={group.key} className="mb-2">
            <div className="text-2xs font-bold text-muted-foreground/30 uppercase tracking-wider mb-1">{group.label}</div>
            <div className="flex flex-wrap gap-1">
              {group.marks.map(mark => {
                const isEarned = earnedSet.has(mark.id);
                return (
                  <ObtainmentPopover
                    key={mark.id}
                    name={mark.name}
                    howToObtain={mark.how_to_obtain}
                    games={mark.games}
                    titleSuffix={mark.title_suffix}
                  >
                    <button
                      onClick={() => onToggle(mark.id)}
                      className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition-all ${
                        isEarned
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-muted/30 text-muted-foreground/30 hover:bg-muted/50 hover:text-muted-foreground/50'
                      }`}
                    >
                      {mark.name}
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
