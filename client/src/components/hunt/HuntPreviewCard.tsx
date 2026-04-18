// client/src/components/hunt/HuntPreviewCard.tsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/api/client';
import { surfacedChecks, hasErrors } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props {
  targetName: string | null;
  targetSpeciesId: number | null;
  /** Save's current in-game location, when parseable. */
  targetLocation?: string | null;
  /** Where the target is found in this game (from map_encounters). */
  targetLocations?: Array<{ displayName: string; method: string }>;
  /** True if the user's party has a Flame Body holder (halves egg hatch steps). */
  flameBody?: boolean;
  /** Target species' hatch_counter (PokeAPI). Steps to hatch = (hc+1) × 256. */
  hatchCounter?: number | null;
  isShiny: boolean;
  isPerfect: boolean;
  odds: { combos: number; total: number; odds: string; caveats?: string[] };
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

// Rough bot step rate during egg cycling (emulator-paced circling).
const EGG_STEPS_PER_SECOND = 5;
// Baseline wall-clock per attempt for non-egg modes (walk+encounter or reset).
const NON_EGG_SEC_PER_ATTEMPT = 30;

function prettyEta(
  combos: number, total: number, instances: number,
  mode: string, flameBody: boolean, hatchCounter: number | null,
): string | null {
  if (combos === 0 || total === 0) return null;
  const expectedAttempts = total / combos;

  let secPerAttempt: number;
  if (mode === 'egg' && hatchCounter != null) {
    // Canonical formula: steps = (hatch_counter + 1) × 256.
    // Flame Body / Magma Armor halves the cycles.
    const stepsToHatch = (hatchCounter + 1) * 256 * (flameBody ? 0.5 : 1);
    secPerAttempt = stepsToHatch / EGG_STEPS_PER_SECOND;
  } else {
    secPerAttempt = NON_EGG_SEC_PER_ATTEMPT;
  }

  const totalSeconds = (expectedAttempts * secPerAttempt) / Math.max(1, instances);
  const hours = totalSeconds / 3600;
  const suffixParts: string[] = [];
  if (mode === 'egg' && hatchCounter != null) {
    suffixParts.push(`${hatchCounter + 1} cycles`);
    if (flameBody) suffixParts.push('Flame Body ×2');
  }
  const suffix = suffixParts.length ? ` · ${suffixParts.join(' · ')}` : '';
  if (hours < 1) return `~${Math.round(totalSeconds / 60)}m @ ${instances} instances${suffix}`;
  if (hours < 100) return `~${hours.toFixed(1)}h @ ${instances} instances${suffix}`;
  return `~${Math.round(hours)}h @ ${instances} instances${suffix}`;
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
  targetName, targetSpeciesId, targetLocation, targetLocations = [],
  flameBody = false, hatchCounter = null,
  isShiny, isPerfect, odds,
  saveLabel, romLabel, mode, instances,
  report, loading,
  override, onOverrideChange,
  onStart, startDisabled,
}: Props) {
  const checks = surfacedChecks(report);
  const errored = hasErrors(report);

  const [sprites, setSprites] = useState<{ normal: string | null; shiny: string | null }>({ normal: null, shiny: null });
  useEffect(() => {
    if (!targetSpeciesId) { setSprites({ normal: null, shiny: null }); return; }
    let cancelled = false;
    api.species.get(targetSpeciesId)
      .then((s: any) => {
        if (cancelled) return;
        setSprites({
          normal: s?.sprite_url ?? s?.sprite_default ?? null,
          shiny: s?.shiny_sprite_url ?? null,
        });
      })
      .catch(() => { if (!cancelled) setSprites({ normal: null, shiny: null }); });
    return () => { cancelled = true; };
  }, [targetSpeciesId]);

  const spriteUrl = isShiny && sprites.shiny ? sprites.shiny : sprites.normal;

  const adjectives = [isShiny && 'Shiny', isPerfect && 'Perfect'].filter(Boolean).join(' ');
  const title = targetName ? `${adjectives} ${targetName}`.trim() : 'Pick a target';
  const eta = prettyEta(odds.combos, odds.total, instances, mode, flameBody, hatchCounter);

  return (
    <div className="bg-card rounded-xl shadow-soft-lg p-4 lg:sticky lg:top-6 border-t-[3px] border-t-primary">
      <SpriteFrame url={spriteUrl} />

      <div className="text-center">
        <div className="text-base font-extrabold capitalize">{title}</div>
        {targetLocation && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Currently at: <span className="font-medium">{targetLocation}</span>
          </div>
        )}
      </div>

      {targetLocations.length > 0 && (
        <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded-md">
          <div className="text-[9px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold mb-1">
            Found at
          </div>
          <div className="text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
            {targetLocations.slice(0, 8).map((l, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{l.displayName}</span>
                <span className="text-muted-foreground/60 text-[10px] capitalize whitespace-nowrap">{l.method}</span>
              </div>
            ))}
            {targetLocations.length > 8 && (
              <div className="text-[10px] text-muted-foreground/60">+ {targetLocations.length - 8} more</div>
            )}
          </div>
        </div>
      )}

      {/* Odds block */}
      <div className="text-center my-3 py-2 bg-surface-raised rounded-xl">
        <div className="flex items-center justify-center gap-1.5">
          <div className={cn('font-mono font-black text-xl', odds.combos === 0 ? 'text-red-500' : 'text-emerald-600')}>
            {odds.odds}
          </div>
          {odds.caveats && odds.caveats.length > 0 && (
            <span
              className="text-[13px] text-amber-600 cursor-help"
              title={odds.caveats.join('\n')}
            >
              ~
            </span>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold mt-0.5">
          Odds per attempt{odds.caveats && odds.caveats.length > 0 ? ' · approximate' : ''}
        </div>
        {eta && <div className="text-[10px] text-muted-foreground/60 mt-1">{eta}</div>}
      </div>

      {odds.caveats && odds.caveats.length > 0 && (
        <div className="text-[10px] text-muted-foreground/70 bg-amber-500/5 border border-amber-500/20 rounded-md px-2 py-1.5 -mt-1 mb-3">
          {odds.caveats.map((c, i) => (
            <div key={i} className="flex gap-1.5 leading-snug">
              <span className="text-amber-600">~</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

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
