import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getServerBase } from '@/lib/tauri';

interface DataDirInfo {
  dataDir: string;
  portable: boolean;
}

async function fetchDataDirInfo(): Promise<DataDirInfo> {
  const base = getServerBase();
  const resp = await fetch(`${base || ''}/api/system/data-dir`);
  if (!resp.ok) return { dataDir: '<unknown>', portable: false };
  return resp.json();
}

export function PortableBadge() {
  const [info, setInfo] = useState<DataDirInfo | null>(null);

  useEffect(() => {
    fetchDataDirInfo().then(setInfo).catch(() => setInfo({ dataDir: '<unknown>', portable: false }));
  }, []);

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <code className="text-xs">{info.dataDir}</code>
      {info.portable && <Badge variant="secondary">Portable</Badge>}
    </div>
  );
}
