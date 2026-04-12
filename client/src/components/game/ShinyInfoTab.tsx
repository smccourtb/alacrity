import { Badge } from '@/components/ui/badge';

interface ShinyInfoTabProps {
  speciesId: number;
  shinyAvail: any[];
}

export function ShinyInfoTab({ speciesId, shinyAvail }: ShinyInfoTabProps) {
  if (shinyAvail.length > 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold mb-2">Earliest Shiny Availability</h4>
        <div className="space-y-1.5">
          {shinyAvail.map((sa: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">{sa.game}</Badge>
              <span className="text-muted-foreground">{sa.method}</span>
              {sa.source_url && (
                <a href={sa.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline ml-auto">source</a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (speciesId <= 151) {
    return (
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
        Cannot be shiny in Gen 1 (wild RNG bug). Hunt in Gen 2+ instead.
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">No shiny availability data recorded.</p>
  );
}
