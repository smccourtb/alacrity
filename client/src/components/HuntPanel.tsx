// client/src/components/HuntPanel.tsx
import { Button } from '@/components/ui/button';
import PostShinyWorkflow from '@/components/PostShinyWorkflow';
import HuntLog from '@/components/HuntLog';
import { GamePill } from '@/components/icons';
import { ProgressBar } from '@/components/ui/progress-bar';

interface RngProgress {
  phase: string;
  currentFrame: number;
  targetFrame: number;
  message: string;
}

interface HuntPanelProps {
  hunt: any;
  status: any;
  logs: string[];
  onStop: (id: number) => void;
  rngProgress?: RngProgress;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatBar({ label, value, color, percent }: { label: string; value: string; color: string; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-muted-foreground/60 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%`, background: color }}
        />
      </div>
      <span className="w-16 text-right text-xs font-bold font-mono text-foreground/70">{value}</span>
    </div>
  );
}

export default function HuntPanel({ hunt, status, logs, onStop, rngProgress }: HuntPanelProps) {
  const totalAttempts = status?.totalAttempts || hunt.total_attempts || 0;
  const probability = totalAttempts > 0 ? (1 - Math.pow(8191 / 8192, totalAttempts)) * 100 : 0;
  const isHit = status?.hits?.length > 0 || hunt.status === 'hit';

  return (
    <div className="space-y-3 mb-6">
      {/* Main card */}
      <div className="bg-card shadow-soft rounded-lg overflow-hidden">
        {/* Red gradient header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pokeball indicator */}
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">{hunt.target_name}</div>
              <div className="flex gap-1.5 mt-0.5">
                <GamePill game={hunt.game} size="sm" />
                <span className="bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{hunt.hunt_mode}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hunt.status === 'running' && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)] animate-pulse" />
                  <span className="text-white/60 text-xs font-medium tracking-wide">HUNTING</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/15 text-white border border-white/20 rounded-full text-xs font-semibold hover:bg-black/25 hover:text-white"
                  onClick={() => onStop(hunt.id)}
                >
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Hero encounter count */}
        <div className="py-5 text-center border-b border-surface-raised">
          <div className="text-xs text-muted-foreground/50 uppercase tracking-[3px]">Encounters</div>
          <div className="text-5xl font-black font-mono text-foreground tracking-tighter leading-none mt-1">
            {totalAttempts.toLocaleString()}
          </div>
        </div>

        {/* Probability bar */}
        <div className="px-5 py-4 border-b border-surface-raised">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground/60">Probability</span>
            <span className="text-sm font-extrabold font-mono text-foreground">{probability.toFixed(1)}%</span>
          </div>
          <ProgressBar
            value={probability / 100}
            gradient="bg-gradient-to-r from-red-500 to-orange-500"
            size="md"
          />
        </div>

        {/* Stat bars */}
        <div className="px-5 py-4 space-y-2.5">
          <StatBar
            label="Elapsed"
            value={formatDuration(status?.elapsedSeconds || 0)}
            color="linear-gradient(90deg, #818cf8, #6366f1)"
            percent={Math.min(((status?.elapsedSeconds || 0) / ((status?.elapsedSeconds || 0) + (status?.estimatedRemainingSeconds || 1))) * 100, 100)}
          />
          <StatBar
            label="Speed"
            value={status?.secondsPerAttempt > 0 ? `${status.secondsPerAttempt.toFixed(1)}s` : '\u2014'}
            color="linear-gradient(90deg, #34d399, #10b981)"
            percent={status?.secondsPerAttempt > 0 ? Math.max(100 - (status.secondsPerAttempt / 5) * 100, 10) : 0}
          />
          <StatBar
            label="ETA"
            value={
              status?.estimatedRemainingSeconds != null && totalAttempts < 8192
                ? formatDuration(status.estimatedRemainingSeconds)
                : totalAttempts >= 8192
                  ? 'Overdue'
                  : '\u2014'
            }
            color="linear-gradient(90deg, #fbbf24, #f59e0b)"
            percent={
              status?.estimatedRemainingSeconds != null
                ? Math.min(((status.elapsedSeconds || 0) / ((status.elapsedSeconds || 0) + status.estimatedRemainingSeconds)) * 100, 100)
                : 50
            }
          />
        </div>
      </div>

      {/* RNG frame progress */}
      {hunt.engine === "rng" && rngProgress && (
        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {rngProgress.phase.replace("_", " ")}
            </span>
            {rngProgress.phase === "advancing" && (
              <span className="animate-pulse text-yellow-500">●</span>
            )}
            {rngProgress.phase === "hit" && (
              <span className="text-green-500 font-bold">★ HIT!</span>
            )}
          </div>

          {rngProgress.targetFrame > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Frame {rngProgress.currentFrame.toLocaleString()}</span>
                <span>{rngProgress.targetFrame.toLocaleString()}</span>
              </div>
              <ProgressBar
                value={Math.min(1, rngProgress.currentFrame / rngProgress.targetFrame)}
                color="bg-primary"
                size="md"
              />
            </div>
          )}

          <p className="text-sm font-mono">{rngProgress.message}</p>
        </div>
      )}

      {/* Instances pill */}
      <div className="flex justify-center">
        <div className="bg-white rounded-full px-4 py-1.5 shadow-soft-sm flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Running on</span>
          <span className="font-extrabold text-foreground">{hunt.num_instances}</span>
          <span className="text-muted-foreground">instances</span>
        </div>
      </div>

      {/* Shiny workflow if hit */}
      {isHit && <PostShinyWorkflow huntId={hunt.id} />}

      {/* Log feed */}
      <HuntLog logs={logs} />
    </div>
  );
}
