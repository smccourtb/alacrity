import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DependencyDescriptor, InstallProgressEvent } from '@/api/dependencies';
import { api } from '@/api/client';

interface DependencyCardProps {
  descriptor: DependencyDescriptor;
  wineDetected: boolean | null;
  onRefresh: () => void;
}

interface ActiveProgress {
  stage: string;
  percent: number | null;
}

export function DependencyCard({ descriptor, wineDetected, onRefresh }: DependencyCardProps) {
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customPath, setCustomPath] = useState(
    descriptor.state.kind === 'custom' ? (descriptor.state.path ?? '') : ''
  );
  const [progress, setProgress] = useState<ActiveProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { state } = descriptor;

  const statusLabel = (() => {
    if (progress) {
      return `${progress.stage}${progress.percent != null ? ` ${Math.round(progress.percent)}%` : ''}`;
    }
    switch (state.kind) {
      case 'ok': return `Installed v${state.installedVersion}`;
      case 'not-installed': return 'Not installed';
      case 'out-of-date': return `Update to v${state.pinned}`;
      case 'custom': return 'Custom';
      case 'unavailable': return 'Not available';
    }
  })();

  const statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = (() => {
    if (progress) return 'default';
    switch (state.kind) {
      case 'ok': return 'default';
      case 'not-installed': return 'secondary';
      case 'out-of-date': return 'destructive';
      case 'custom': return 'outline';
      case 'unavailable': return 'secondary';
    }
  })();

  const triggerInstall = async () => {
    setError(null);
    setProgress({ stage: 'starting', percent: 0 });
    try {
      await api.dependencies.install(descriptor.id);
      const unsubscribe = api.dependencies.subscribeProgress(descriptor.id, {
        onProgress: (p: InstallProgressEvent) => setProgress({ stage: p.stage, percent: p.percent ?? null }),
        onDone: () => {
          setProgress(null);
          onRefresh();
        },
        onError: (e) => {
          setError(e.message);
          setProgress(null);
        },
      });
      // Safety net — auto-unsubscribe after 10 minutes
      setTimeout(unsubscribe, 10 * 60 * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
      setProgress(null);
    }
  };

  const triggerUninstall = async () => {
    try {
      await api.dependencies.uninstall(descriptor.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstall failed');
    }
  };

  const saveCustom = async () => {
    try {
      await api.dependencies.useCustom(descriptor.id, customPath);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const switchToManaged = async () => {
    try {
      await api.dependencies.useManaged(descriptor.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
    }
  };

  const needsWine = descriptor.platform?.requiresWine ?? false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{descriptor.displayName}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              v{descriptor.version} · {descriptor.license}
            </div>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{descriptor.description}</p>

        {state.kind === 'not-installed' && !progress && (
          <Button size="sm" onClick={triggerInstall}>Install</Button>
        )}
        {state.kind === 'out-of-date' && !progress && (
          <div className="flex gap-2">
            <Button size="sm" onClick={triggerInstall}>Update</Button>
            <Button size="sm" variant="outline" onClick={triggerUninstall}>Uninstall</Button>
          </div>
        )}
        {state.kind === 'ok' && !progress && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={triggerInstall}>Reinstall</Button>
            <Button size="sm" variant="outline" onClick={triggerUninstall}>Uninstall</Button>
          </div>
        )}
        {state.kind === 'custom' && (
          <Button size="sm" variant="outline" onClick={switchToManaged}>
            Switch to managed install
          </Button>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</div>
        )}

        {needsWine && (
          <div className={`text-xs p-2 rounded ${wineDetected === false ? 'bg-yellow-500/10 text-yellow-600' : 'text-muted-foreground'}`}>
            {wineDetected === false
              ? '⚠ Requires Wine (not detected). Install Wine to run this emulator.'
              : wineDetected === true
              ? '✓ Requires Wine (detected on system)'
              : '⚠ Requires Wine'}
          </div>
        )}

        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setCustomExpanded(!customExpanded)}
        >
          {customExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Use custom path
        </button>

        {customExpanded && (
          <div className="flex gap-2">
            <Input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/path/to/your/emulator/binary"
              className="text-xs"
            />
            <Button size="sm" onClick={saveCustom}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
