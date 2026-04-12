import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface SyncCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

export default function SyncCollectionDialog({ open, onOpenChange, onSyncComplete }: SyncCollectionDialogProps) {
  const [syncPreview, setSyncPreview] = useState<{
    auto_imported_count: number;
    manually_edited: any[];
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ cleared: number; imported: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [keepIds, setKeepIds] = useState<Set<number>>(new Set());

  const resetState = useCallback(() => {
    setSyncResult(null);
    setSyncError(null);
    setSyncing(false);
    setKeepIds(new Set());
    setSyncPreview(null);
  }, []);

  const loadPreview = useCallback(async () => {
    resetState();
    try {
      const preview = await api.pokemon.syncPreview();
      setSyncPreview(preview);
      // Default: keep all edited pokemon
      setKeepIds(new Set(preview.manually_edited.map((p: any) => p.id)));
    } catch {
      setSyncPreview({ auto_imported_count: 0, manually_edited: [] });
    }
  }, [resetState]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      loadPreview();
    }
    onOpenChange(nextOpen);
  }, [loadPreview, onOpenChange]);

  const toggleKeep = useCallback((id: number) => {
    setKeepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await api.pokemon.sync(keepIds.size > 0 ? [...keepIds] : undefined);
      setSyncResult({ cleared: result.cleared, imported: result.imported });
      onSyncComplete();
    } catch (e: any) {
      setSyncError(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [keepIds, onSyncComplete]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Collection</DialogTitle>
          <DialogDescription>
            Re-import pokemon from <code className="text-xs bg-muted px-1 py-0.5 rounded">saves/collection/</code>. This will clear all save-imported pokemon and re-parse the directory.
          </DialogDescription>
        </DialogHeader>

        {syncError ? (
          <div className="py-4 text-center">
            <div className="text-lg font-bold text-red-600 mb-1">Sync Failed</div>
            <p className="text-sm text-muted-foreground">{syncError}</p>
          </div>
        ) : syncResult ? (
          <div className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">Sync Complete</div>
            <p className="text-sm text-muted-foreground">
              Cleared {syncResult.cleared} old entries, imported {syncResult.imported} pokemon
            </p>
          </div>
        ) : syncing ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Syncing...</div>
        ) : syncPreview && syncPreview.manually_edited.length > 0 ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              {syncPreview.manually_edited.length} synced pokemon have been manually edited.
              Checked pokemon will be kept as manual entries and won't be overwritten by future syncs.
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {syncPreview.manually_edited.map((p: any) => {
                const fields = JSON.parse(p.manual_fields || '[]');
                return (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={keepIds.has(p.id)}
                      onChange={() => toggleKeep(p.id)}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.species_name}</span>
                      {p.nickname && <span className="text-muted-foreground"> "{p.nickname}"</span>}
                      <div className="text-sm text-muted-foreground/70 mt-0.5">
                        Edited: {fields.join(', ')}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${keepIds.has(p.id) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {keepIds.has(p.id) ? 'keep' : 'discard'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {syncPreview ? `${syncPreview.auto_imported_count} save-imported pokemon will be refreshed.` : 'Loading...'}
          </div>
        )}

        <DialogFooter>
          {syncResult || syncError ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>Cancel</Button>
              <Button onClick={runSync} disabled={syncing || !syncPreview}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
