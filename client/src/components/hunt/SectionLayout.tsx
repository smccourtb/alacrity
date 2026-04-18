// client/src/components/hunt/SectionLayout.tsx
// Mockup-matching layout primitives for the Start Hunt form.
// Reference: .superpowers/brainstorm/42335-1776518095/content/full-options.html
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---- Section ---------------------------------------------------------------

interface SectionProps {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, hint, children, className }: SectionProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-[14px] shadow-soft mb-3',
        // 14px vertical / 16px horizontal padding — matches mockup .section
        'px-4 pt-3.5 pb-1',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] uppercase tracking-[0.6px] text-muted-foreground/70 font-bold">
          {title}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/70 font-medium">
            {hint}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ---- Row -------------------------------------------------------------------

interface RowProps {
  label: string;
  sub?: ReactNode;
  alignTop?: boolean;
  children: ReactNode;
}

export function Row({ label, sub, alignTop, children }: RowProps) {
  return (
    <div
      className={cn(
        'flex gap-3 py-2 justify-between',
        alignTop ? 'items-start' : 'items-center',
        // border-top on every row after the first — matches mockup .row + .row
        '[&+&]:border-t [&+&]:border-border',
      )}
    >
      <div className="min-w-0 flex-shrink">
        <div className="text-xs font-semibold text-foreground leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ---- MiniPills: mockup-style pill group ------------------------------------
// Track is muted, inner pills are compact. Unlike PillToggle which is full-width.

export type PillVariant = 'default' | 'primary' | 'amber' | 'blue' | 'pink' | 'purple';

export interface MiniPillOption {
  value: string;
  label: string;
  disabled?: boolean;
  variant?: PillVariant;
}

interface MiniPillsProps {
  options: MiniPillOption[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
  vertical?: boolean;
}

const VARIANT_ACTIVE: Record<PillVariant, string> = {
  default: 'bg-card text-foreground shadow-soft',
  primary: 'bg-primary text-primary-foreground shadow-soft',
  amber: 'bg-amber-500/10 text-amber-700 shadow-soft',
  blue: 'bg-sky-500/10 text-sky-700 shadow-soft',
  pink: 'bg-pink-500/10 text-pink-700 shadow-soft',
  purple: 'bg-purple-500/10 text-purple-700 shadow-soft',
};

export function MiniPills({ options, value, onChange, multiple = false, vertical = false }: MiniPillsProps) {
  const selected = multiple ? (Array.isArray(value) ? value : [value]) : [value];

  function onClick(v: string) {
    if (multiple) {
      const current = Array.isArray(value) ? value : [value];
      onChange(current.includes(v) ? current.filter(x => x !== v) : [...current, v]);
    } else {
      onChange(v);
    }
  }

  return (
    <div className={cn(
      'bg-muted p-[3px] w-fit gap-1',
      vertical ? 'inline-flex flex-col rounded-2xl' : 'inline-flex rounded-full',
    )}>
      {options.map(opt => {
        const active = selected.includes(opt.value);
        const variant = opt.variant ?? 'default';
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => { if (!opt.disabled) onClick(opt.value); }}
            className={cn(
              'text-[11px] font-semibold px-3 py-[5px] rounded-full transition-colors whitespace-nowrap',
              opt.disabled && 'opacity-40 cursor-not-allowed',
              !active && !opt.disabled && 'text-muted-foreground hover:text-foreground',
              active && VARIANT_ACTIVE[variant],
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- IvBox: amber locked / emerald perfect / editable ----------------------

interface IvBoxProps {
  value: number | string;
  state: 'editable' | 'locked' | 'perfect';
}

export function IvBox({ value, state }: IvBoxProps) {
  return (
    <div
      className={cn(
        'rounded-lg border h-9 flex items-center justify-center font-mono font-bold text-[13px]',
        state === 'editable' && 'bg-muted border-border text-foreground',
        state === 'locked' && 'bg-amber-500/10 border-amber-500/30 text-amber-700',
        state === 'perfect' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
      )}
    >
      {value}
    </div>
  );
}

export function IvLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold mb-1 text-center">
      {children}
    </div>
  );
}
