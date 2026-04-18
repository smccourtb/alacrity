import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  activeCount: number;
  preview: ReactNode;
  running: ReactNode;
}

export default function HuntSetupTabs({ activeCount, preview, running }: Props) {
  const [tab, setTab] = useState<'setup' | 'running'>('setup');

  const [sawActive, setSawActive] = useState(false);
  useEffect(() => {
    if (activeCount > 0 && !sawActive) {
      setTab('running');
      setSawActive(true);
    }
    if (activeCount === 0) setSawActive(false);
  }, [activeCount, sawActive]);

  return (
    <div className="space-y-3">
      <div className="inline-flex gap-1 bg-surface-raised rounded-full p-1">
        <TabButton active={tab === 'setup'} onClick={() => setTab('setup')}>Setup</TabButton>
        <TabButton active={tab === 'running'} onClick={() => setTab('running')}>
          Running{activeCount > 0 ? ` · ${activeCount}` : ''}
        </TabButton>
      </div>
      <div>{tab === 'setup' ? preview : running}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
        active ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
