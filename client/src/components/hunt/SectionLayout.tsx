// client/src/components/hunt/SectionLayout.tsx
// Shared layout primitives matching the Start Hunt mockup rhythm.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, hint, children, className }: SectionProps) {
  return (
    <div className={cn('bg-card rounded-lg shadow-soft px-4 py-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.6px] text-muted-foreground/70 font-bold">
          {title}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground/50">{hint}</span>}
      </div>
      <div className="divide-y divide-border/60">
        {children}
      </div>
    </div>
  );
}

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
        'flex gap-3 py-2.5',
        alignTop ? 'items-start' : 'items-center',
        'justify-between',
      )}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
