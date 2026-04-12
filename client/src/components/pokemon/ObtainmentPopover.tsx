import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  name: string;
  howToObtain: string;
  games?: string[] | string;
  titleSuffix?: string;
  children: React.ReactNode;
}

function parseGames(games?: string[] | string): string[] {
  if (!games) return [];
  if (Array.isArray(games)) return games;
  try { return JSON.parse(games); } catch { return []; }
}

export default function ObtainmentPopover({ name, howToObtain, games, titleSuffix, children }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const parsedGames = parseGames(games);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popWidth = 224; // w-56 = 14rem = 224px
    let left = rect.left + rect.width / 2 - popWidth / 2;
    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - popWidth - 8));
    setPos({
      top: rect.top - 4, // above the trigger
      left,
    });
  }, [open]);

  return (
    <div className="inline-block" ref={triggerRef}>
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
      >
        {children}
      </div>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] w-56 bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="font-bold text-foreground mb-1">{name}</div>
          {titleSuffix && <div className="text-muted-foreground/60 italic mb-1">"{titleSuffix}"</div>}
          <div className="text-muted-foreground mb-1.5">{howToObtain}</div>
          {parsedGames.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {parsedGames.slice(0, 6).map((g, i) => (
                <span key={i} className="px-1.5 py-0 rounded bg-muted text-2xs font-semibold text-muted-foreground">{g}</span>
              ))}
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
        </div>,
        document.body
      )}
    </div>
  );
}
