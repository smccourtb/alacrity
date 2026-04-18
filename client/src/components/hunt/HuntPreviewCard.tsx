// client/src/components/hunt/HuntPreviewCard.tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { surfacedChecks, hasErrors, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props {
  targetName: string | null;
  targetSpriteUrl?: string | null;
  targetLocation?: string | null;
  isShiny: boolean;
  isPerfect: boolean;
  odds: { combos: number; total: number; odds: string };
  saveLabel?: string | null;
  romLabel?: string | null;
  mode: string;
  report: ValidationReport | null;
  loading: boolean;
  override: boolean;
  onOverrideChange: (next: boolean) => void;
  onStart: () => void;
  startDisabled: boolean;
}

export default function HuntPreviewCard({
  targetName, targetSpriteUrl, targetLocation,
  isShiny, isPerfect, odds,
  saveLabel, romLabel, mode,
  report, loading,
  override, onOverrideChange,
  onStart, startDisabled,
}: Props) {
  const checks = surfacedChecks(report);
  const errored = hasErrors(report);

  const adjectives = [isShiny && 'Shiny', isPerfect && 'Perfect'].filter(Boolean).join(' ');
  const title = targetName ? `${adjectives} ${targetName}`.trim() : 'Pick a target';

  return (
    <div className="bg-card rounded-lg shadow-soft-lg p-4 lg:sticky lg:top-6 border-t-2 border-t-primary">
      <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-100 to-amber-200 border border-border flex items-center justify-center overflow-hidden">
        {targetSpriteUrl
          ? <img src={targetSpriteUrl} style={{ imageRendering: 'pixelated' }} className="w-full h-full object-contain" />
          : <span className="text-3xl">✨</span>}
      </div>

      <div className="text-center">
        <div className="text-base font-extrabold">{title}</div>
        {targetLocation && <div className="text-xs text-muted-foreground mt-0.5">{targetLocation}</div>}
      </div>

      <div className="text-center my-3">
        <div className={cn('font-mono font-black text-xl', odds.combos === 0 ? 'text-red-500' : 'text-emerald-600')}>
          {odds.odds}
        </div>
        <div className="text-2xs uppercase tracking-wider text-muted-foreground/60">Odds per attempt</div>
      </div>

      <div className="text-xs space-y-1 border-y border-border py-2 my-3">
        <Row k="Mode" v={mode} />
        {saveLabel && <Row k="Save" v={saveLabel} />}
        {romLabel && <Row k="ROM" v={romLabel} />}
      </div>

      {loading && <div className="text-2xs text-muted-foreground">Validating…</div>}
      {!loading && checks.length === 0 && report && <div className="text-xs text-emerald-700">✓ All checks pass</div>}
      {!loading && checks.length > 0 && (
        <div className="space-y-1">
          {checks.map(c => (
            <div key={c.id} className={cn('rounded px-2 py-1 text-xs', SEVERITY_PILL[c.severity as 'error' | 'warning'])}>
              {c.message}
            </div>
          ))}
          <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <input type="checkbox" checked={override} onChange={e => onOverrideChange(e.target.checked)} />
            Override validation — start anyway
          </label>
        </div>
      )}

      <Button
        onClick={onStart}
        type="button"
        disabled={startDisabled || (errored && !override)}
        className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white text-base font-bold shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:shadow-[0_6px_16px_rgba(220,38,38,0.3)] transition-shadow mt-3"
      >
        Start Hunt
      </Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold text-right truncate max-w-[60%]" title={v}>{v}</span>
    </div>
  );
}
