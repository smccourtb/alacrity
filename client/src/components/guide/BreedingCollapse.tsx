import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

type Step = {
  id: number;
  description: string;
  species_id: number | null;
  species_name: string | null;
  action_tag: string;
  collection_status: string | null;
  is_collection_target: boolean;
  [key: string]: any;
};

export default function BreedingCollapse({
  steps,
  locationName,
  renderStep,
}: {
  steps: Step[];
  locationName: string;
  renderStep: (step: Step) => React.ReactNode;
}) {
  if (steps.length <= 5) {
    return <>{steps.map(renderStep)}</>;
  }

  const preview = steps.slice(0, 3);
  const rest = steps.slice(3);

  return (
    <Collapsible defaultOpen={false}>
      {preview.map(renderStep)}
      <CollapsibleTrigger
        showChevron={false}
        className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-left"
        style={{ paddingLeft: '2.25rem' }}
      >
        + {rest.length} more breeding tasks at {locationName}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rest.map(renderStep)}
      </CollapsibleContent>
    </Collapsible>
  );
}
