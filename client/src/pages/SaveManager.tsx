import { useState, useEffect, useCallback, useRef } from 'react';
import { api, invalidateCache } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SaveManager() {
  const [saves, setSaves] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [dsIp, setDsIp] = useState('');
  const [dsPort, setDsPort] = useState('5000');
  const [syncState, setSyncState] = useState<any>({ state: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => api.saves.list().then(setSaves);
  useEffect(() => { load(); }, []);

  // Poll sync status
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const status = await api.threeDS.status();
      setSyncState(status);
      if (status.state === 'done' || status.state === 'error' || status.state === 'idle') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        if (status.state === 'done') {
          invalidateCache('/pokemon');
          load();
        }
      }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const discover3DS = async () => {
    setSyncState({ state: 'discovering', message: 'Scanning network...' });
    try {
      const result = await api.threeDS.discover();
      if (result.found && result.ip) {
        setDsIp(result.ip);
        if (result.port) setDsPort(String(result.port));
        setSyncState({ state: 'idle', message: `Found at ${result.ip}:${result.port}` });
      } else {
        setSyncState({ state: 'error', message: '3DS not found. Is ftpd running?' });
      }
    } catch {
      setSyncState({ state: 'error', message: 'Discovery failed.' });
    }
  };

  const syncFrom3DS = async () => {
    if (!dsIp) return;
    setSyncState({ state: 'syncing', message: 'Connecting to 3DS...' });
    try {
      await api.threeDS.sync(dsIp, Number(dsPort));
      startPolling();
    } catch {
      setSyncState({ state: 'error', message: 'Failed to start sync.' });
    }
  };

  const parseOnly = async () => {
    setSyncState({ state: 'parsing', message: 'Parsing save files...' });
    try {
      const result = await api.threeDS.parse();
      invalidateCache('/pokemon');
      setSyncState({
        state: 'done',
        message: `Imported ${result.imported} pokemon, ${result.skipped} duplicates skipped.`,
        imported: result.imported,
        skipped: result.skipped,
      });
      load();
    } catch (e: any) {
      setSyncState({ state: 'error', message: 'Parse failed: ' + e.message });
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      await api.saves.upload(file);
    }
    load();
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(e.target.files || [])) {
      await api.saves.upload(file);
    }
    load();
  };

  const isLoading = ['discovering', 'syncing', 'parsing'].includes(syncState.state);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Save Manager</h2>

      {/* 3DS Sync */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            3DS Sync
            <Badge variant="outline" className="text-xs font-normal">ftpd + PKSM</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Start ftpd on your 3DS, then sync saves and import Pokemon into your collection.
          </p>
          <div className="flex gap-2 items-center mb-3 flex-wrap">
            <Input
              placeholder="3DS IP (e.g. 192.168.40.36)"
              value={dsIp}
              onChange={e => setDsIp(e.target.value)}
              className="w-48"
              disabled={isLoading}
            />
            <Input
              placeholder="Port"
              value={dsPort}
              onChange={e => setDsPort(e.target.value)}
              className="w-20"
              disabled={isLoading}
            />
            <Button variant="outline" size="sm" onClick={discover3DS} disabled={isLoading}>
              {syncState.state === 'discovering' ? 'Scanning...' : 'Discover'}
            </Button>
            <Button onClick={syncFrom3DS} disabled={!dsIp || isLoading}>
              {syncState.state === 'syncing' ? 'Syncing...' : 'Sync & Import'}
            </Button>
            <Button variant="outline" size="sm" onClick={parseOnly} disabled={isLoading}>
              {syncState.state === 'parsing' ? 'Parsing...' : 'Re-Parse'}
            </Button>
          </div>

          {/* Status indicator */}
          {syncState.state !== 'idle' && (
            <div className={`rounded-md p-3 text-sm mt-2 ${
              syncState.state === 'done' ? 'bg-green-500/10 border border-green-500/20' :
              syncState.state === 'error' ? 'bg-destructive/10 border border-destructive/20' :
              'bg-primary/10 border border-primary/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                <span className="font-medium">{syncState.message}</span>
              </div>

              {syncState.imported !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {syncState.imported} imported · {syncState.skipped} duplicates skipped
                </div>
              )}

              {syncState.files?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground">{syncState.files.length} files downloaded</summary>
                  <div className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground font-mono">
                    {syncState.files.map((f: string, i: number) => <div key={i}>{f}</div>)}
                  </div>
                </details>
              )}

              {syncState.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-destructive">{syncState.errors.length} errors</summary>
                  <div className="mt-1 text-xs text-destructive font-mono">
                    {syncState.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Manual Upload */}
      <h3 className="text-lg font-semibold mb-3">Manual Upload</h3>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center mb-6 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <p className="text-muted-foreground mb-3">Drag & drop .sav files here</p>
        <label className="cursor-pointer">
          <Button variant="outline" type="button">Browse</Button>
          <input type="file" accept=".sav,.ss1,.srm" multiple onChange={handleFileInput} className="hidden" />
        </label>
      </div>

      {/* File List */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Saved Files</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await api.saves.rescan();
            load();
          }}
        >
          Rescan
        </Button>
      </div>
      {saves.length === 0 && <p className="text-muted-foreground text-sm">No save files yet.</p>}

      <div className="space-y-2">
        {saves.map(s => (
          <Card key={s.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{s.label || s.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {s.game || 'Unknown'} · {(s.file_size / 1024).toFixed(1)} KB · {s.discovered_at?.split('T')[0]}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/api/saves/${s.id}/download`}>
                  <Button variant="outline" size="sm">Download</Button>
                </a>
                <Button variant="outline" size="sm" onClick={async () => { await api.saves.backup(s.id); load(); }}>Backup</Button>
                <Button variant="destructive" size="sm" onClick={async () => { await api.saves.delete(s.id); load(); }}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
