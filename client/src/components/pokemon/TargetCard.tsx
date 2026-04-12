import { api } from '@/api/client';

type Target = {
  id: number;
  description: string;
  source_game: string | null;
  category: string;
  target_type: string;
  notes: string | null;
  is_manual: number;
  dismissed: number;
  manual_override: number;
  status: string | null;
  constraints: any;
};

const BADGE_MAP: Record<string, { label: string; className: string; icon: string }> = {
  tm_move: { label: 'Legacy Move', className: 'bg-purple-500/10 text-purple-600', icon: '⚡' },
  origin: { label: 'Origin', className: 'bg-amber-500/10 text-amber-600', icon: '🏆' },
  custom: { label: 'Custom', className: 'bg-blue-500/10 text-blue-600', icon: '📌' },
};

export default function TargetCard({
  target,
  onDismiss,
}: {
  target: Target;
  onDismiss: (id: number) => void;
  onUpdate?: () => void;
}) {
  const isObtained = target.status === 'completed' || target.status === 'obtained' || target.status === 'journey_complete';
  const badge = BADGE_MAP[target.target_type];

  const guideLink = target.source_game
    ? `/guide?game=${target.source_game.toLowerCase()}`
    : null;

  const handleDismiss = async () => {
    await api.specimens.updateTarget(target.id, { dismissed: true });
    onDismiss(target.id);
  };

  return (
    <div
      className={`rounded-xl p-3 text-sm ${
        isObtained
          ? 'bg-green-500/5 border border-green-500/10 opacity-60'
          : badge && target.target_type !== 'origin'
          ? 'bg-gradient-to-br from-purple-500/5 to-amber-500/5 border border-purple-500/10'
          : 'bg-muted'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {badge && (
            <span className={`text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1 ${badge.className}`}>
              {badge.icon} {badge.label}
            </span>
          )}
          <div className="font-semibold text-xs">{target.description}</div>
          {target.notes && (
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{target.notes}</div>
          )}
          {target.source_game && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{target.source_game}</span>
              {guideLink && (
                <a href={guideLink} className="text-xs text-primary font-medium hover:underline">
                  Open in Guide →
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
            isObtained ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
          }`}>
            {isObtained ? '✓ owned' : 'needed'}
          </span>
          {!isObtained && (
            <button
              onClick={handleDismiss}
              className="text-2xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Dismiss this target"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
