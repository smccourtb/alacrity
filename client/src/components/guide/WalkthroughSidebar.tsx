import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ModeSelector from './ModeSelector';
import StepFilters from './StepFilters';
import WalkthroughStep from './WalkthroughStep';
import BreedingCollapse from './BreedingCollapse';
import SavePin from './SavePin';
import { Progress } from '@/components/ui/progress';
import SyncButton from './SyncButton';
import type { SaveWorldState, PlaythroughGoal } from './types';

interface WalkthroughSidebarProps {
  game: string;
  onGameChange: (game: string) => void;
  walkthroughData: any[];
  progress: Map<number, boolean>;
  onToggleStep: (stepId: number, completed: boolean) => void;
  onLocationClick: (locationKey: string) => void;
  selectedLocationKey: string | null;
  onSync: () => void;
  goals?: PlaythroughGoal[];
  worldState?: SaveWorldState | null;
}

export default function WalkthroughSidebar({
  game, onGameChange, walkthroughData, progress, onToggleStep,
  onLocationClick, selectedLocationKey, onSync, goals, worldState,
}: WalkthroughSidebarProps) {
  const [showMilestones, setShowMilestones] = useState(true);
  const [showSpecimens, setShowSpecimens] = useState(true);
  const [showTMs, setShowTMs] = useState(true);

  const handleFilterToggle = (filter: 'milestones' | 'specimens' | 'tms') => {
    if (filter === 'milestones') setShowMilestones(v => !v);
    if (filter === 'specimens') setShowSpecimens(v => !v);
    if (filter === 'tms') setShowTMs(v => !v);
  };

  const filteredWalkthroughData = walkthroughData.map((locationGroup: any) => ({
    ...locationGroup,
    steps: locationGroup.steps.filter((step: any) => {
      const isMilestone = step.specimen_task_id === null;
      const isTM = step.specimen_role === 'tm-specimen';
      const isSpecimen = step.specimen_task_id !== null && !isTM;
      if (isMilestone && !showMilestones) return false;
      if (isSpecimen && !showSpecimens) return false;
      if (isTM && !showTMs) return false;
      return true;
    }),
  })).filter((lg: any) => lg.steps.length > 0);

  const locationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected location when map marker is clicked
  useEffect(() => {
    if (selectedLocationKey) {
      const el = locationRefs.current.get(selectedLocationKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedLocationKey]);

  const totalSteps = filteredWalkthroughData.reduce((acc: number, loc: any) => acc + loc.steps.length, 0);
  const completedSteps = filteredWalkthroughData.reduce(
    (acc: number, loc: any) => acc + loc.steps.filter((s: any) => progress.get(s.id)).length, 0
  );
  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModeSelector value={game} onChange={onGameChange} />
            <SyncButton onSyncComplete={onSync} />
          </div>
          <Link
            to="/collection"
            className="text-xs text-primary hover:underline font-medium"
          >
            ← Collection
          </Link>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completedSteps}/{totalSteps}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        <StepFilters
          showMilestones={showMilestones}
          showSpecimens={showSpecimens}
          showTMs={showTMs}
          onToggle={handleFilterToggle}
        />
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredWalkthroughData.map((locationGroup: any) => (
          <div
            key={locationGroup.location.key}
            ref={el => { if (el) locationRefs.current.set(locationGroup.location.key, el); }}
          >
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
              {(() => {
                const filteredSteps = locationGroup.steps;
                const breedSteps = filteredSteps.filter(
                  (s: any) => s.action_tag === 'CATCH-NOW' && s.description?.toLowerCase().includes('breed')
                );
                const nonBreedSteps = filteredSteps.filter(
                  (s: any) => !(s.action_tag === 'CATCH-NOW' && s.description?.toLowerCase().includes('breed'))
                );

                const renderStep = (step: any) => {
                  const matchingGoal = goals?.find(g => g.species_id === step.species_id) ?? null;
                  const isCollectionTarget = step.is_collection_target
                    && step.collection_status !== 'completed'
                    && step.collection_status !== 'obtained'
                    && step.collection_status !== 'journey_complete';

                  return (
                    <div key={step.id}>
                      {step.save_label && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/5 border-b border-border">
                          <span className="text-sm">💾</span>
                          <span className="text-xs text-blue-600 font-medium">{step.save_label}</span>
                          {step.save_notes && (
                            <span className="text-xs text-muted-foreground">— {step.save_notes}</span>
                          )}
                        </div>
                      )}
                      <div className={`relative flex items-start gap-2 px-4 py-1.5 text-sm ${
                        isCollectionTarget ? 'border-l-3 border-l-primary bg-primary/5 pl-[calc(1rem-3px)]' : ''
                      }`}>
                        <WalkthroughStep
                          step={step}
                          completed={progress.get(step.id) || false}
                          currentGame={game}
                          onToggle={onToggleStep}
                          goal={matchingGoal}
                          worldState={worldState}
                        />
                        {isCollectionTarget && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold shrink-0 mt-1.5">
                            COLLECT
                          </span>
                        )}
                        <SavePin
                          stepId={step.id}
                          currentSaveId={step.save_file_id ?? null}
                          currentSaveLabel={step.save_label ?? null}
                          game={game}
                          onLinked={() => onSync?.()}
                        />
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {nonBreedSteps.map(renderStep)}
                    {breedSteps.length > 0 && (
                      <BreedingCollapse
                        steps={breedSteps}
                        locationName={locationGroup.location.name}
                        renderStep={renderStep}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
