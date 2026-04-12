// client/src/components/pokemon/DaycareCard.tsx

import { safeSpeciesName } from './sprites';

interface DaycareCardProps {
  parent1: string | null;
  parent2: string | null;
  offspring: string | null;
  shinyOdds: string | null;
}

export function DaycareCard({ parent1, parent2, offspring, shinyOdds }: DaycareCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-2">
        Daycare
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-foreground font-medium">{safeSpeciesName(parent1)}</span>
        <span className="text-muted-foreground">+</span>
        <span className="text-foreground font-medium">{safeSpeciesName(parent2)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="text-emerald-600 font-medium">{safeSpeciesName(offspring)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">
        Shiny odds: <span className="text-purple-600">{shinyOdds || 'Unknown'}</span>
      </div>
    </div>
  );
}
