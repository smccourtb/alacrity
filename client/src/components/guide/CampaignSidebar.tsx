import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ProgressBar } from '@/components/ui/progress-bar';
import WalkthroughStep from './WalkthroughStep';
import ModeSelector, { CAMPAIGN_MODE } from './ModeSelector';

const GAME_COLORS: Record<string, string> = {
  red: 'bg-red-700 text-white',
  blue: 'bg-blue-700 text-white',
  yellow: 'bg-amber-500 text-black',
  gold: 'bg-yellow-600 text-white',
  silver: 'bg-gray-400 text-black',
  crystal: 'bg-purple-700 text-white',
};

interface CampaignPhase {
  phase: number;
  game: string;
  label: string;
  description: string;
  locations: Array<{
    location: { id: number; key: string; name: string; x: number; y: number };
    steps: any[];
  }>;
  progress: { total: number; completed: number };
}

interface CampaignSidebarProps {
  campaignData: { phases: CampaignPhase[]; overall: { total: number; completed: number } } | null;
  onModeChange: (mode: string) => void;
  onLocationClick: (locationKey: string) => void;
  selectedLocationKey: string | null;
  onPhaseExpand: (game: string) => void;
  onToggleMilestone: (stepId: number, completed: boolean) => void;
}

export default function CampaignSidebar({
  campaignData, onModeChange, onLocationClick, selectedLocationKey, onPhaseExpand, onToggleMilestone,
}: CampaignSidebarProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  if (!campaignData) return <div className="p-4 text-muted-foreground text-sm">Loading campaign...</div>;

  const overall = campaignData.overall;
  const overallPct = overall.total > 0 ? (overall.completed / overall.total) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <ModeSelector value={CAMPAIGN_MODE} onChange={onModeChange} />
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Campaign Progress</span>
            <span>{overall.completed}/{overall.total}</span>
          </div>
          <Progress value={overallPct} className="h-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {campaignData.phases.map(phase => {
          const pct = phase.progress.total > 0 ? (phase.progress.completed / phase.progress.total) * 100 : 0;

          return (
            <Collapsible
              key={phase.phase}
              open={expandedPhase === phase.phase}
              onOpenChange={(open) => {
                setExpandedPhase(open ? phase.phase : null);
                if (open) onPhaseExpand(phase.game);
              }}
              className="border-b border-border"
            >
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${GAME_COLORS[phase.game] || 'bg-muted'}`}>
                  {phase.game.charAt(0).toUpperCase() + phase.game.slice(1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{phase.label}</div>
                  <div className="text-xs text-muted-foreground">{phase.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{phase.progress.completed}/{phase.progress.total}</span>
                  <ProgressBar value={pct / 100} color="bg-primary" size="sm" className="w-14" />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-3 space-y-3">
                {phase.locations.map(locationGroup => (
                  <div key={locationGroup.location.key}>
                    <button
                      onClick={() => onLocationClick(locationGroup.location.key)}
                      className={`w-full text-left text-xs font-bold uppercase tracking-wide py-1 px-2 rounded transition-colors ${
                        selectedLocationKey === locationGroup.location.key
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {locationGroup.location.name}
                    </button>
                    <div className="space-y-0.5 mt-1">
                      {locationGroup.steps.map((step: any) => (
                        <WalkthroughStep
                          key={step.id}
                          step={step}
                          completed={step.completed || false}
                          currentGame={phase.game}
                          onToggle={onToggleMilestone}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
