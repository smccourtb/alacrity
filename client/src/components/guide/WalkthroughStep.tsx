import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { SaveWorldState } from './types';

interface WalkthroughStepProps {
  step: {
    id: number;
    description: string;
    action_tag: string | null;
    species_name: string | null;
    species_id: number | null;
    sprite_url: string | null;
    specimen_role: string | null;
    is_version_exclusive: number;
    exclusive_to: string | null;
    auto_trackable: number;
    notes: string | null;
    specimen_task_id: number | null;
    completed?: boolean;
    completed_from_save?: boolean;
  };
  completed: boolean;
  currentGame: string;
  onToggle: (stepId: number, completed: boolean) => void;
  goal?: {
    id: number;
    status: string;
    completed_from_save: number;
    requirement_description: string | null;
  } | null;
  worldState?: SaveWorldState | null;
}

const TAG_LABELS: Record<string, string> = {
  'CATCH-NOW': 'Catch Now',
  'SAVE-BEFORE': 'Save Before',
  'DELAY-UNTIL-BALLS': 'Delay Until Balls',
  'DO-NOT-TRANSFER-YET': 'Don\u2019t Transfer Yet',
  'POINT-OF-NO-RETURN': 'Point of No Return',
};

const TAG_COLORS: Record<string, string> = {
  'CATCH-NOW': 'bg-green-600 text-white',
  'SAVE-BEFORE': 'bg-blue-500 text-white',
  'DELAY-UNTIL-BALLS': 'bg-sky-500 text-white',
  'DO-NOT-TRANSFER-YET': 'bg-red-600 text-white',
  'POINT-OF-NO-RETURN': 'bg-red-800 text-white',
};

const ROLE_LABELS: Record<string, string> = {
  'origin-trophy': 'Origin',
  'tm-specimen': 'TM',
};

export default function WalkthroughStep({ step, completed, currentGame, onToggle, goal }: WalkthroughStepProps) {
  if (step.is_version_exclusive && step.exclusive_to && step.exclusive_to !== currentGame) {
    return null;
  }

  const isMilestone = step.specimen_task_id === null;
  const isTM = step.specimen_role === 'tm-specimen';
  const isCompleted = step.completed ?? completed;
  const isFromSave = step.completed_from_save ?? false;

  return (
    <div className={`flex items-start gap-2 py-1.5 px-2 rounded-md text-sm transition-colors ${
      isCompleted ? 'opacity-60' : ''
    }`}>
      {isMilestone ? (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onToggle(step.id, checked === true)}
          className="mt-0.5"
        />
      ) : isFromSave ? (
        <span className="mt-0.5 text-green-400 text-sm" title="Found in save library">&#10003;</span>
      ) : (
        <span className="mt-0.5 text-muted-foreground text-sm">&#9675;</span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isTM && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">
              TM
            </span>
          )}
          {step.action_tag && !isTM && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${TAG_COLORS[step.action_tag] || 'bg-muted text-muted-foreground'}`}>
              {TAG_LABELS[step.action_tag] || step.action_tag.replace(/-/g, ' ')}
            </span>
          )}
          {step.action_tag === 'SAVE-BEFORE' && isTM && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">
              Save Before
            </span>
          )}
          {goal && <span className="text-amber-500 font-semibold">&#9733;</span>}
          {step.sprite_url && (
            <img src={step.sprite_url} alt="" className="w-5 h-5 pixelated" />
          )}
          <span className={isCompleted ? 'line-through' : ''}>
            {step.description}
          </span>
        </div>
        {isFromSave && (
          <div className="ml-5 mt-0.5">
            <span className="text-xs text-green-400">&#10003; Found in save library</span>
          </div>
        )}
        {goal && !isFromSave && (
          <div className="ml-5 mt-0.5">
            {goal.completed_from_save ? (
              <span className="text-xs text-green-400">&#10003; Found in save</span>
            ) : goal.status === 'pending' ? (
              <span className="text-xs text-amber-400">
                {goal.requirement_description ?? 'Origin goal \u2014 not yet completed'}
              </span>
            ) : null}
          </div>
        )}
        {step.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>
        )}
        {step.specimen_task_id && (
          <div className="flex items-center gap-2 mt-0.5">
            {step.specimen_role && !isTM && (
              <Badge variant="outline" className="text-xs">
                {ROLE_LABELS[step.specimen_role] || step.specimen_role.replace(/-/g, ' ')}
              </Badge>
            )}
            <a
              href={`/collection?species=${step.species_id}`}
              className="text-xs text-blue-400 hover:text-blue-300 ml-auto"
              title="View in collection planner"
            >
              View journey &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
