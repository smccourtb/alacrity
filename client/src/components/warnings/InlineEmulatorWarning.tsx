import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { AlertTriangle, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import type { DependencyDescriptor } from '@/api/dependencies';

interface InlineEmulatorWarningProps {
  emulatorId: string;
  /** Optional firmer copy for coreAbiLock scenarios */
  coreAbiLockMessage?: string;
}

export function InlineEmulatorWarning({ emulatorId, coreAbiLockMessage }: InlineEmulatorWarningProps) {
  const [descriptor, setDescriptor] = useState<DependencyDescriptor | null>(null);

  useEffect(() => {
    api.dependencies.list().then(({ emulators }) => {
      setDescriptor(emulators.find((e) => e.id === emulatorId) ?? null);
    }).catch(() => setDescriptor(null));
  }, [emulatorId]);

  if (!descriptor) return null;
  const { state } = descriptor;

  if (state.kind === 'ok' || state.kind === 'custom' || state.kind === 'unavailable') {
    return null;
  }

  const message = (() => {
    if (state.kind === 'not-installed') {
      const size = descriptor.platform?.sizeBytes;
      const sizeMb = size ? ` (${Math.round(size / (1024 * 1024))} MB)` : '';
      return `This feature uses ${descriptor.displayName}, which isn't installed yet.${sizeMb}`;
    }
    if (state.kind === 'out-of-date') {
      if (descriptor.coreAbiLock && coreAbiLockMessage) {
        return coreAbiLockMessage;
      }
      return `${descriptor.displayName} needs to be updated for this version of Alacrity.`;
    }
    return `${descriptor.displayName} needs attention.`;
  })();

  const buttonText = state.kind === 'not-installed' ? `Install ${descriptor.displayName}` : `Update ${descriptor.displayName}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 mb-4">
      <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-yellow-900 dark:text-yellow-100">{message}</div>
      <Link
        to={`/settings?action=install&id=${emulatorId}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        <Download className="w-3 h-3 mr-1" />
        {buttonText}
      </Link>
    </div>
  );
}
