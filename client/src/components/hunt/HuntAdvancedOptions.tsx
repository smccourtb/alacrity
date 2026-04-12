import { useMemo } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import SavePicker from '@/components/SavePicker';
import ItemPicker from '@/components/ItemPicker';
import type { HuntFormControl } from './types';
import { is3DSGame } from './constants';

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
  const watchedEngine = watch('engine');
  const watchedRomPath = watch('rom_path');
  const watchedSavPath = watch('sav_path');
  const watchedLuaScript = watch('lua_script');
  const isThisA3DSGame = is3DSGame(watchedGame);

  const romItems = useMemo(() =>
    huntFiles.roms.map(r => ({ path: r.path, name: r.name })),
  [huntFiles.roms]);

  const scriptItems = useMemo(() =>
    huntFiles.scripts.map((s: any) => ({ path: s.path, name: s.name, detail: s.gen })),
  [huntFiles.scripts]);

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
          {!isThisA3DSGame && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-surface-raised">
              <div className={cn('w-[5px] h-[5px] rounded-full', watchedLuaScript ? 'bg-green-500' : 'bg-muted-foreground/30')} />
              <span className="text-xs text-muted-foreground font-mono">
                {watchedLuaScript ? watchedLuaScript.split('/').pop() : (watchedEngine === 'core' ? 'N/A (core)' : 'No script')}
              </span>
            </div>
          )}
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
          {!isThisA3DSGame && (
            <ItemPicker value={watchedLuaScript} onChange={v => setValue('lua_script', v)} items={scriptItems} placeholder="Lua Script" />
          )}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
