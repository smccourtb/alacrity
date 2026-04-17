import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
}

interface Props {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  renderLabel?: (selected: string[], options: FilterOption[]) => string;
  align?: 'start' | 'end';
}

export default function FilterDropdown({ label, options, selected, onChange, multiSelect = true, searchable, renderLabel, align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = selected.length > 0;

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) setSearch('');
  }, [open, searchable]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Group options if any have a group property
  const groups = new Map<string, FilterOption[]>();
  for (const opt of filtered) {
    const g = opt.group || '';
    const list = groups.get(g) || [];
    list.push(opt);
    groups.set(g, list);
  }

  const toggle = (value: string) => {
    if (!multiSelect) {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Button label + icon
  let buttonLabel = label;
  let buttonIcon: React.ReactNode = null;
  if (isActive) {
    const first = options.find(o => o.value === selected[0]);
    if (renderLabel) {
      buttonLabel = renderLabel(selected, options);
    } else if (selected.length === 1) {
      buttonLabel = first?.label || selected[0];
    } else {
      buttonLabel = `${first?.label || selected[0]} +${selected.length - 1}`;
    }
    if (first?.icon) buttonIcon = first.icon;
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <PopoverTrigger
        type="button"
        className={cn(
          'inline-flex h-8 items-center gap-1.5 max-w-full px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
          'bg-surface-sunken text-muted-foreground hover:bg-surface-pressed',
          isActive && 'text-foreground'
        )}
      >
        {buttonIcon && <span className="flex-shrink-0">{buttonIcon}</span>}
        <span className="truncate">{buttonLabel}</span>
        <ChevronDownIcon className="size-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={4}
        className="w-56 p-2 bg-popover rounded-lg shadow-md ring-1 ring-foreground/10 z-50"
      >
        {(searchable ?? options.length > 8) && (
          <Input
            ref={inputRef}
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2 h-7"
          />
        )}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {[...groups.entries()].map(([group, opts]) => (
            <div key={group} className="space-y-0.5">
              {group && (
                <div className="text-2xs font-bold text-muted-foreground/50 uppercase tracking-wider px-2 pt-2 pb-1">
                  {group}
                </div>
              )}
              {opts.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => { if (!opt.disabled) toggle(opt.value); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors text-left',
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                        : isSelected
                          ? 'bg-surface-raised text-foreground'
                          : 'hover:bg-surface-raised text-foreground'
                    )}
                  >
                    {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0 text-foreground/50">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground/50 text-center py-3">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
