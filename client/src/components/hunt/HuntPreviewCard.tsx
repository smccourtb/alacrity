// client/src/components/hunt/HuntPreviewCard.tsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/api/client';
import { surfacedChecks, hasErrors } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props {
  targetName: string | null;
  targetSpeciesId: number | null;
  targetLocation?: string | null;
  isShiny: boolean;
  isPerfect: boolean;
  odds: { combos: number; total: number; odds: string };
  saveLabel?: string | null;
  romLabel?: string | null;
  mode: string;
  instances: number;
  report: ValidationReport | null;
  loading: boolean;
  override: boolean;
  onOverrideChange: (next: boolean) => void;
  onStart: () => void;
  startDisabled: boolean;
}

const MODE_LABEL: Record<string, string> = {
  wild: 'Wild',
  stationary: 'Stationary',
  gift: 'Gift',
  egg: 'Egg',
  fishing: 'Fishing',
};

function prettyMode(mode: string) {
  return MODE_LABEL[mode] ?? (mode.charAt(0).toUpperCase() + mode.slice(1));
}

function prettyEta(combos: number, total: number, instances: number): string | null {
  if (combos === 0 || total === 0) return null;
  // Heuristic: one attempt ≈ 30 seconds per instance.
  const expectedAttempts = total / combos;
  const secPerAttempt = 30;
  const totalSeconds = (expectedAttempts * secPerAttempt) / Math.max(1, instances);
  const hours = totalSeconds / 3600;
  if (hours < 1) return `~${Math.round(totalSeconds / 60)}m @ ${instances} instances`;
  if (hours < 100) return `~${hours.toFixed(1)}h @ ${instances} instances`;
  return `~${Math.round(hours)}h @ ${instances} instances`;
}

function SpriteFrame({ url }: { url: string | null }) {
  return (
    <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-100 to-amber-200 border border-border flex items-center justify-center overflow-hidden">
      {url
        ? <img src={url} alt="" className="w-full h-full object-contain p-2" style={{ imageRendering: 'pixelated' }} />
        : <span className="text-3xl">✨</span>}
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[11px] py-1 border-b border-dashed border-border/60 last:border-0">
      <span className="text-muted-foreground/70">{k}</span>
      <span className="font-semibold text-right truncate max-w-[62%]" title={v}>{v}</span>
    </div>
  );
}

export default function HuntPreviewCard({
  targetName, targetSpeciesId, targetLocation,
  isShiny, isPerfect, odds,
  saveLabel, romLabel, mode, instances,
  report, loading,
  override, onOverrideChange,
  onStart, startDisabled,
}: Props) {
  const checks = surfacedChecks(report);
  const errored = hasErrors(report);

  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!targetSpeciesId) { setSpriteUrl(null); return; }
    let cancelled = false;
    api.species.get(targetSpeciesId)
      .then((s: any) => { if (!cancelled) setSpriteUrl(s?.sprite_url ?? s?.sprite_default ?? null); })
      .catch(() => { if (!cancelled) setSpriteUrl(null); });
    return () => { cancelled = true; };
  }, [targetSpeciesId]);

  const adjectives = [isShiny && 'Shiny', isPerfect && 'Perfect'].filter(Boolean).join(' ');
  const title = targetName ? `${adjectives} ${targetName}`.trim() : 'Pick a target';
  const eta = prettyEta(odds.combos, odds.total, instances);

  return (
    <div className="bg-card rounded-xl shadow-soft-lg p-4 lg:sticky lg:top-6 border-t-[3px] border-t-primary">
      <SpriteFrame url={spriteUrl} />

      <div className="text-center">
        <div className="text-base font-extrabold capitalize">{title}</div>
        {targetLocation && <div className="text-[11px] text-muted-foreground mt-0.5">{targetLocation}</div>}
      </div>

      {/* Odds block */}
      <div className="text-center my-3 py-2 bg-surface-raised rounded-xl">
        <div className={cn('font-mono font-black text-xl', odds.combos === 0 ? 'text-red-500' : 'text-emerald-600')}>
          {odds.odds}
        </div>
        <div className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold mt-0.5">
          Odds per attempt
        </div>
        {eta && <div className="text-[10px] text-muted-foreground/60 mt-1">{eta}</div>}
      </div>

      {/* Summary rows */}
      <div className="my-3">
        <SummaryRow k="Mode" v={prettyMode(mode)} />
        {saveLabel && <SummaryRow k="Save" v={saveLabel} />}
        {romLabel && <SummaryRow k="ROM" v={romLabel} />}
        <SummaryRow k="Matching" v={`${odds.combos.toLocaleString()} / ${odds.total.toLocaleString()}`} />
      </div>

      {/* Validation rollup */}
      {loading && <div className="text-[11px] text-muted-foreground">Validating…</div>}
      {!loading && report && checks.length === 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <span>✓</span> All checks pass
        </div>
      )}
      {!loading && checks.length > 0 && (
        <div className="space-y-1">
          {checks.map(c => (
            <div
              key={c.id}
              className={cn(
                'flex items-start gap-1.5 text-[11px] leading-snug',
                c.severity === 'error' ? 'text-red-700' : 'text-amber-700',
              )}
            >
              <span className="flex-shrink-0">{c.severity === 'error' ? '✕' : '⚠'}</span>
              <span>{c.message}</span>
            </div>
          ))}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={override}
              onChange={e => onOverrideChange(e.target.checked)}
              className="cursor-pointer"
            />
            Override — start anyway
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled || (errored && !override)}
        className={cn(
          'w-full h-11 mt-3 rounded-full font-bold text-sm text-white',
          'bg-gradient-to-r from-red-500 to-red-600',
          'shadow-[0_4px_12px_rgba(220,38,38,0.25)]',
          'hover:shadow-[0_6px_16px_rgba(220,38,38,0.35)] transition-shadow',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        )}
      >
        Start Hunt
      </button>
    </div>
  );
}
