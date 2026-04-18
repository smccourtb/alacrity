// client/src/components/hunt/HuntValidationPanel.tsx
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props {
  report: ValidationReport | null;
  loading: boolean;
  override: boolean;
  onOverrideChange: (next: boolean) => void;
}

const SEVERITY_STYLE: Record<'error' | 'warning' | 'skipped', string> = {
  error: 'text-red-700 bg-red-50 border-red-200',
  warning: 'text-amber-800 bg-amber-50 border-amber-200',
  skipped: 'text-zinc-600 bg-zinc-50 border-zinc-200',
};

export function HuntValidationPanel({ report, loading, override, onOverrideChange }: Props) {
  const surfaced = (report?.checks ?? []).filter(c => c.severity !== 'skipped');
  const hasErrors = surfaced.some(c => c.severity === 'error');

  if (override) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between">
        <span>Validation overridden — start at your own risk.</span>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked onChange={() => onOverrideChange(false)} /> Override
        </label>
      </div>
    );
  }

  if (!report) {
    return loading ? <div className="text-xs text-zinc-500">Validating…</div> : null;
  }

  if (surfaced.length === 0) {
    return <div className="text-xs text-emerald-700">Setup looks valid.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-700">
          {hasErrors ? 'Fix these before starting:' : 'Heads up:'}
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={false}
            onChange={e => onOverrideChange(e.target.checked)}
          />
          Override validation
        </label>
      </div>
      <ul className="space-y-1">
        {surfaced.map(c => (
          <li key={c.id} className={`rounded border px-2 py-1 text-sm ${SEVERITY_STYLE[c.severity]}`}>
            <div>{c.message}</div>
            {c.detail && <div className="text-xs opacity-80 mt-0.5">{c.detail}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
