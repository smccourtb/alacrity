import { useMemo } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import SavePicker from '@/components/SavePicker';
import ItemPicker from '@/components/ItemPicker';
import type { HuntFormControl } from './types';

interface HuntAdvancedOptionsProps extends HuntFormControl {
  huntFiles: { roms: any[]; scripts: any[] };
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
}

export default function HuntAdvancedOptions({
  watch, setValue,
  huntFiles, showAdvanced, setShowAdvanced,
}: HuntAdvancedOptionsProps) {
  const watchedGame = watch('game');
  const watchedRomPath = watch('rom_path');
  const watchedSavPath = watch('sav_path');

  const romItems = useMemo(() =>
    huntFiles.roms.map(r => ({ path: r.path, name: r.name })),
  [huntFiles.roms]);

  return (
    <>
      {/* File status pills */}
      {watchedGame && (
        <div className="flex gap-1.5 flex-wrap">
          <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', watchedRomPath ? 'bg-green-500/[0.06]' : 'bg-red-500/[0.06]')}>
            <div className={cn('w-[5px] h-[5px] rounded-full', watchedRomPath ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-xs text-muted-foreground font-mono">{watchedRomPath ? watchedRomPath.split('/').pop() : 'No ROM'}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', watchedSavPath ? 'bg-green-500/[0.06]' : 'bg-red-500/[0.06]')}>
            <div className={cn('w-[5px] h-[5px] rounded-full', watchedSavPath ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-xs text-muted-foreground font-mono">{watchedSavPath ? watchedSavPath.split('/').pop() : 'No save'}</span>
          </div>
        </div>
      )}

      {/* Override paths */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          Override paths
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-wrap gap-2 pt-2">
          <ItemPicker value={watchedRomPath} onChange={v => setValue('rom_path', v)} items={romItems} placeholder="ROM" />
          <SavePicker value={watchedSavPath} onChange={v => setValue('sav_path', v)} game={watchedGame} />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
