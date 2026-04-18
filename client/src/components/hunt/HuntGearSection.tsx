import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import PillToggle from '@/components/PillToggle';
import { cn } from '@/lib/utils';
import SavePicker from '@/components/SavePicker';
import ItemPicker from '@/components/ItemPicker';
import type { HuntFormControl } from './types';
import { checksForSection, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props extends HuntFormControl {
  huntFiles: { roms: any[] };
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  report: ValidationReport | null;
}

export default function HuntGearSection({
  control, watch, setValue,
  huntFiles, showAdvanced, setShowAdvanced,
  report,
}: Props) {
  const watchedGame = watch('game');
  const watchedMode = watch('hunt_mode');
  const watchedRomPath = watch('rom_path');
  const watchedSavPath = watch('sav_path');

  const romItems = useMemo(() =>
    huntFiles.roms.map(r => ({ path: r.path, name: r.name })),
  [huntFiles.roms]);

  const saveChecks = checksForSection(report, 'save');

  return (
    <div className="bg-card rounded-lg shadow-soft p-3 space-y-3">
      <div className="text-2xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Gear</div>

      {/* Save picker — always visible */}
      <SavePicker value={watchedSavPath} onChange={v => setValue('sav_path', v)} game={watchedGame} />

      {/* Inline save-related warnings */}
      {saveChecks.map(c => (
        <div key={c.id} className={cn('rounded px-2 py-1 text-xs', SEVERITY_PILL[c.severity as 'error' | 'warning'])}>
          <div>{c.message}</div>
          {c.detail && <div className="text-2xs opacity-80 mt-0.5">{c.detail}</div>}
        </div>
      ))}

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

      {/* Instances */}
      <FormField label="Instances">
        <Controller
          name="num_instances"
          control={control}
          render={({ field }) => (
            <Input
              type="number" min={1} max={128}
              value={field.value}
              onChange={e => field.onChange(Number(e.target.value))}
              className="font-semibold"
            />
          )}
        />
      </FormField>

      {/* Advanced drawer */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {watchedMode === 'wild' && (
            <Controller
              name="walk_dir"
              control={control}
              render={({ field }) => (
                <PillToggle
                  options={[
                    { value: 'ns', label: 'North / South' },
                    { value: 'ew', label: 'East / West' },
                  ]}
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                />
              )}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <ItemPicker value={watchedRomPath} onChange={v => setValue('rom_path', v)} items={romItems} placeholder="ROM" />
            <SavePicker value={watchedSavPath} onChange={v => setValue('sav_path', v)} game={watchedGame} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
