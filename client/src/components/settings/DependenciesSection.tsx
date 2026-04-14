import { useEffect, useState, useCallback } from 'react';
import { DependencyCard } from './DependencyCard';
import { api } from '@/api/client';
import type { DependencyDescriptor } from '@/api/dependencies';

export function DependenciesSection() {
  const [emulators, setEmulators] = useState<DependencyDescriptor[] | null>(null);
  const [wineDetected, setWineDetected] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { emulators } = await api.dependencies.list();
      setEmulators(emulators);
    } catch (err) {
      console.error('Failed to load dependencies', err);
      setEmulators([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.dependencies.wineDetected()
      .then((r) => setWineDetected(r.detected))
      .catch(() => setWineDetected(null));
  }, [refresh]);

  if (emulators === null) {
    return <div className="text-sm text-muted-foreground">Loading emulators…</div>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Emulators</h2>
        <p className="text-sm text-muted-foreground">
          These power the Play and Hunt features. Alacrity works fine without them
          if you just want to browse your collection or read walkthroughs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emulators.map((e) => (
          <DependencyCard
            key={e.id}
            descriptor={e}
            wineDetected={wineDetected}
            onRefresh={refresh}
          />
        ))}
      </div>
    </section>
  );
}
