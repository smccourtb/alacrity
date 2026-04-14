import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';

interface ReconcileResult {
  tipsFlaggedOn: number;
  staleFlaggedOff: number;
  scanned: number;
  totalIdentities: number;
  totalSightings: number;
  errors: { checkpointId: number; reason: string }[];
}

export function CollectionSection() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReconcile = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.collection.scanAll() as ReconcileResult;
      setResult(r);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Collection</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alacrity keeps your Pokedex collection in sync automatically — toggling a checkpoint,
            importing saves, and advancing a playthrough all reconcile the collection on the spot.
            Run this manually only if something looks out of date.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          {result && !error && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Tips flagged on: {result.tipsFlaggedOn}</div>
              <div>Stale checkpoints flagged off: {result.staleFlaggedOff}</div>
              <div>Checkpoints scanned: {result.scanned}</div>
              <div>Identities added: {result.totalIdentities}</div>
              <div>Sightings added: {result.totalSightings}</div>
              {result.errors.length > 0 && (
                <div className="pt-1 text-red-600">
                  <div>{result.errors.length} error{result.errors.length === 1 ? '' : 's'}:</div>
                  <ul className="list-disc pl-4 max-h-24 overflow-y-auto font-mono">
                    {result.errors.map((e, i) => (
                      <li key={i} title={`checkpoint ${e.checkpointId}: ${e.reason}`}>
                        checkpoint {e.checkpointId}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={handleReconcile}>
            {busy ? 'Reconciling…' : 'Reconcile collection'}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
