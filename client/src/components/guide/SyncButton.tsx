import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';

interface SyncButtonProps {
  onSyncComplete: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setStatus('Discovering 3DS...');
    try {
      const discovery = await api.threeDS.discover();
      if (!discovery.found || !discovery.ip) {
        setStatus('3DS not found on network');
        return;
      }

      setStatus('Syncing save files...');
      await api.threeDS.sync(discovery.ip, discovery.port || 5000);

      setStatus('Parsing saves...');
      await api.threeDS.parse();

      setStatus('Done!');
      onSyncComplete();
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? 'Syncing...' : 'Sync Save'}
      </Button>
      {status && (
        <span className="text-xs text-muted-foreground">{status}</span>
      )}
    </div>
  );
}
