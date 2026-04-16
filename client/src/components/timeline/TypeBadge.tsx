import type { CheckpointType } from './types';

const TYPE_LABELS: Record<CheckpointType, string> = {
  root: 'Root',
  progression: 'Progression',
  catch: 'Catch',
  snapshot: 'Snapshot',
  hunt_base: 'Snapshot',     // legacy — treated as snapshot
  daycare_swap: 'Snapshot',  // legacy — treated as snapshot
};

// Hex values match category colors in GroupedView
const TYPE_COLORS: Record<CheckpointType, { hex: string }> = {
  root: { hex: '#f59e0b' },
  progression: { hex: '#f59e0b' },
  catch: { hex: '#10b981' },
  snapshot: { hex: '#64748b' },
  hunt_base: { hex: '#64748b' },     // legacy
  daycare_swap: { hex: '#64748b' },  // legacy
};

function TypeIcon({ type, size = 11 }: { type: CheckpointType; size?: number }) {
  const s = size;
  const sw = 1.4;
  const props = { width: s, height: s, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  // Legacy types render as snapshot
  const effectiveType = (type === 'hunt_base' || type === 'daycare_swap') ? 'snapshot' : type;

  switch (effectiveType) {
    case 'root':
    case 'progression':
      return <svg {...props}><path d="M2 10 L6 3 L10 10" /><line x1="3.5" y1="7" x2="8.5" y2="7" /></svg>;
    case 'catch':
      return <svg {...props}><path d="M3 6.5 L5 8.5 L9.5 3.5" /></svg>;
    case 'snapshot':
      return <svg {...props}><rect x="2" y="3" width="8" height="6" rx="1" /><circle cx="6" cy="6" r="1.5" /><path d="M4 3 L5 1.5 H7 L8 3" /></svg>;
  }
}

interface TypeBadgeProps {
  type: CheckpointType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const { hex } = TYPE_COLORS[type];
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 rounded-md font-medium leading-none ${isSm ? 'px-1 py-0.5 text-2xs' : 'px-1.5 py-0.5 text-xs'}`}
      style={{ color: hex, backgroundColor: `${hex}12` }}
    >
      <TypeIcon type={type} size={isSm ? 9 : 11} />
      {TYPE_LABELS[type]}
    </span>
  );
}

export function ActiveBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span className={`
      inline-flex items-center gap-0.5 shrink-0 rounded-md font-semibold leading-none
      bg-amber-50 text-amber-600 border border-amber-200
      ${isSm ? 'px-1 py-0.5 text-2xs' : 'px-1.5 py-0.5 text-xs'}
    `}>
      <svg width={isSm ? 8 : 10} height={isSm ? 8 : 10} viewBox="0 0 10 10" fill="currentColor">
        <circle cx="5" cy="5" r="2.5" />
      </svg>
      Active
    </span>
  );
}

export function MissingBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span className={`
      inline-flex items-center gap-0.5 shrink-0 rounded-md font-semibold leading-none
      bg-red-50 text-red-500
      ${isSm ? 'px-1 py-0.5 text-2xs' : 'px-1.5 py-0.5 text-xs'}
    `}>
      <svg width={isSm ? 8 : 10} height={isSm ? 8 : 10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="5" cy="5" r="3.5" /><path d="M3.5 3.5 L6.5 6.5 M6.5 3.5 L3.5 6.5" />
      </svg>
      missing
    </span>
  );
}
