import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// --- Types -------------------------------------------------------------------

interface OrphanSave {
  id?: number;
  label?: string;
  filename?: string;
  file_name?: string;
  name?: string;
  game?: string;
  ot_name?: string;
  file_path?: string;
  path?: string;
  snapshot?: {
    game?: string;
    ot_name?: string;
    location?: string;
  };
}

export interface OrphanSidebarProps {
  orphans: OrphanSave[];
  orphanTotal: number;
  scanning: boolean;
  open: boolean;
  onToggle: () => void;
  onScan: () => void;
  onLinked: () => void;
}

// --- OrphanSidebar -----------------------------------------------------------

export function OrphanSidebar({ orphans, orphanTotal, scanning, onToggle, onScan, onLinked }: OrphanSidebarProps) {
  return (
    <div className="w-[280px] shrink-0 self-start sticky top-4">
      <Card>
        {/* Header */}
        <CardHeader className="flex-row items-center justify-between border-b border-[#f5f2ef] py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            <CardTitle className="truncate">Unlinked Saves</CardTitle>
            <Badge variant="warning" className="shrink-0">
              {orphanTotal || orphans.length}
            </Badge>
          </div>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground text-sm w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            &#10005;
          </button>
        </CardHeader>

        {/* Scan button */}
        <div className="px-4 py-2 border-b border-[#f5f2ef]">
          <Button
            className="w-full h-7"
            size="sm"
            disabled={scanning}
            onClick={onScan}
          >
            {scanning ? 'Scanning...' : 'Scan & Auto-Link'}
          </Button>
        </div>

        {/* Orphan list */}
        <CardContent className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {orphans.map((orphan, i) => (
              <OrphanCard key={orphan.id ?? i} orphan={orphan} onLinked={onLinked} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- OrphanCard --------------------------------------------------------------

function OrphanCard({ orphan, onLinked }: { orphan: OrphanSave; onLinked?: () => void }) {
  const game = orphan.game ?? orphan.snapshot?.game ?? null;
  const ot = orphan.ot_name ?? orphan.snapshot?.ot_name ?? null;
  const location = orphan.snapshot?.location ?? null;
  const filePath = orphan.file_path ?? orphan.path ?? null;

  // Build a meaningful label: prefer parent directory name over generic filenames
  const rawName = orphan.label ?? orphan.filename ?? orphan.file_name ?? orphan.name ?? '';
  const isGeneric = /^(main|sav\.dat|backup|save)$/i.test(rawName.replace(/\.\w+$/, ''));
  const name = (isGeneric && filePath)
    ? filePath.split('/').slice(-2, -1)[0] ?? rawName  // use parent dir name
    : rawName.replace(/\.(sav|dat|main)$/i, '') || 'Unknown save';

  const relPath = filePath ? (() => {
    const idx = filePath.indexOf('saves/');
    return idx >= 0 ? filePath.slice(idx) : filePath.split('/').pop();
  })() : null;

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-3 flex flex-col gap-1">
      <div className="text-sm font-medium text-foreground truncate">{name}</div>
      {(game || ot) && (
        <div className="text-xs text-muted-foreground truncate">
          {[game, ot ? `OT: ${ot}` : null].filter(Boolean).join(' \u00b7 ')}
        </div>
      )}
      {relPath && (
        <div className="text-xs text-muted-foreground/60 truncate font-mono" title={filePath ?? undefined}>
          {relPath}
        </div>
      )}
      {location && (
        <div className="text-xs text-muted-foreground/70 truncate">
          {location === '?????' || location === '???????' ? 'Unknown location' : location}
        </div>
      )}
      <button
        className="mt-0.5 text-xs text-primary hover:text-primary/80 text-left transition-colors font-medium"
        onClick={async () => {
          try {
            await api.timeline.scan(game ?? undefined, orphan.id);
            onLinked?.();
          } catch (e) { console.error(e); }
        }}
      >
        Link to timeline &rarr;
      </button>
    </div>
  );
}
