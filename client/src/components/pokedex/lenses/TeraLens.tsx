import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface Props {
  speciesId: number;
  entries: Array<{ tera_type?: string | null }>;
}

export function TeraLens({ entries }: Props) {
  const [palette, setPalette] = useState<Record<string, string>>({});
  useEffect(() => {
    api.reference
      .teraTypes()
      .then(rows => {
        setPalette(Object.fromEntries(rows.map(t => [t.key, t.color])));
      })
      .catch(() => {});
  }, []);

  const teraType = entries.map(e => e.tera_type).find(Boolean) ?? null;
  const color = teraType ? palette[teraType] ?? '#444' : 'transparent';

  return (
    <div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{ boxShadow: teraType ? `inset 0 0 0 3px ${color}` : 'none' }}
      title={teraType ? `Tera ${teraType}` : 'No Tera entry'}
    />
  );
}
