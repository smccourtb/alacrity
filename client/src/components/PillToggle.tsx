// client/src/components/PillToggle.tsx
import { cn } from '@/lib/utils';

interface PillToggleOption {
  value: string;
  label: string;
  activeClassName?: string;
}

interface PillToggleProps {
  options: PillToggleOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  className?: string;
}

export default function PillToggle({ options, value, onChange, multiple = false, className }: PillToggleProps) {
  const selected = multiple ? (Array.isArray(value) ? value : [value]) : [value];

  const handleClick = (optValue: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [value];
      const next = current.includes(optValue)
        ? current.filter(v => v !== optValue)
        : [...current, optValue];
      onChange(next);
    } else {
      onChange(optValue);
    }
  };

  return (
    <div className={cn('flex gap-1.5', className)}>
      {options.map(opt => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap',
              isActive
                ? opt.activeClassName || 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface-raised text-muted-foreground hover:bg-surface-sunken'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
