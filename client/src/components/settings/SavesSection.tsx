import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';

interface ImportError {
  path: string;
  reason: string;
}

interface ImportResult {
  copied: number;
  skippedDuplicate: number;
  errors: ImportError[];
}

interface SourceRowState {
  path: string;
  result: ImportResult | null;
  busy: boolean;
  showErrors: boolean;
}

const TAURI_KEY = '__TAURI_INTERNALS__';

async function pickDirectory(): Promise<string | null> {
  if (typeof window === 'undefined' || !(TAURI_KEY in window)) {
    const path = window.prompt('Enter the absolute path of the source directory:');
    return path?.trim() || null;
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const picked = await open({ directory: true, multiple: false });
  return typeof picked === 'string' ? picked : null;
}

export function SavesSection() {
  const [rows, setRows] = useState<SourceRowState[]>([]);
  const [adding, setAdding] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    api.config.get().then(c => {
      setRows(c.importSources.map(p => ({ path: p, result: null, busy: false, showErrors: false })));
    });
  }, []);

  const handleAdd = async () => {
    setTopError(null);
    const path = await pickDirectory();
    if (!path) return;
    setAdding(true);
    try {
      const { index, result } = await api.saves.importSources.add(path);
      setRows(prev => {
        const next = [...prev];
        next[index] = { path, result, busy: false, showErrors: false };
        return next;
      });
    } catch (err: any) {
      setTopError(err?.message || String(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRescan = async (index: number) => {
    setTopError(null);
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, busy: true } : r)));
    try {
      const { result } = await api.saves.importSources.rescan(index);
      setRows(prev => prev.map((r, i) => (i === index ? { ...r, result, busy: false } : r)));
    } catch (err: any) {
      setTopError(err?.message || String(err));
      setRows(prev => prev.map((r, i) => (i === index ? { ...r, busy: false } : r)));
    }
  };

  const handleRemove = async (index: number) => {
    setTopError(null);
    try {
      await api.saves.importSources.remove(index);
      setRows(prev => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      setTopError(err?.message || String(err));
    }
  };

  const toggleErrors = (index: number) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, showErrors: !r.showErrors } : r)));
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saves</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alacrity manages its own save library — hunts, archived shinies, and imported copies all live
            under Alacrity's data directory. To bring in saves from a 3DS Checkpoint backup, a PKSM bank,
            a USB stick, or any other external folder, add the directory below. Alacrity will copy save
            files into its library; the originals are never modified or moved.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {topError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {topError}
            </div>
          )}

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Add a directory to import save files from your 3DS, USB stick, or backup folder.
            </p>
          )}

          {rows.map((row, i) => (
            <div key={`${row.path}-${i}`} className="border border-border rounded p-3 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-sm truncate flex-1" title={row.path}>{row.path}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" disabled={row.busy} onClick={() => handleRescan(i)}>
                    {row.busy ? 'Scanning…' : 'Rescan'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(i)} aria-label="Remove source">
                    ×
                  </Button>
                </div>
              </div>

              {row.result && (
                <div className="text-xs text-muted-foreground">
                  Last imported: {row.result.copied} {row.result.copied === 1 ? 'file' : 'files'},{' '}
                  {row.result.skippedDuplicate} {row.result.skippedDuplicate === 1 ? 'duplicate' : 'duplicates'}
                  {row.result.errors.length > 0 && (
                    <>
                      {', '}
                      <button
                        type="button"
                        className="underline text-red-600 hover:text-red-700"
                        onClick={() => toggleErrors(i)}
                      >
                        {row.result.errors.length} {row.result.errors.length === 1 ? 'error' : 'errors'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {row.result && row.showErrors && row.result.errors.length > 0 && (
                <ul className="text-xs text-red-600 mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {row.result.errors.map((e, j) => (
                    <li key={j} className="font-mono truncate" title={`${e.path}: ${e.reason}`}>
                      {e.path}: {e.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <Button size="sm" variant="outline" disabled={adding} onClick={handleAdd}>
            {adding ? 'Importing…' : '+ Add source directory'}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
