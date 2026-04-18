// client/src/components/hunt/HuntGearSection.tsx
import { useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import PillToggle from '@/components/PillToggle';
import { cn } from '@/lib/utils';
import SavePicker from '@/components/SavePicker';
import ItemPicker from '@/components/ItemPicker';
import type { HuntFormControl } from './types';
import { checksForSection, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';
import { Section, Row } from './SectionLayout';

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
  const [romPickerOpen, setRomPickerOpen] = useState(false);

  const romItems = useMemo(() =>
    huntFiles.roms.map(r => ({ path: r.path, name: r.name })),
  [huntFiles.roms]);

  const saveChecks = checksForSection(report, 'save');

  const advancedDisclosure = (
    <button
      type="button"
      onClick={() => setShowAdvanced(!showAdvanced)}
      className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
    >
      <span className={cn('transition-transform inline-block', showAdvanced && 'rotate-90')}>▸</span>
      Advanced
    </button>
  );

  return (
    <Section title="Gear" hint={advancedDisclosure}>
      <Row label="Save" sub={watchedSavPath?.split('/').slice(-2).join('/') ?? 'Pick a save to continue'}>
        <SavePicker value={watchedSavPath} onChange={v => setValue('sav_path', v)} game={watchedGame} />
      </Row>

      <Row label="ROM" sub={watchedRomPath?.split('/').pop() ?? 'Auto-selected based on game'}>
        <ItemPicker value={watchedRomPath} onChange={v => setValue('rom_path', v)} items={romItems} placeholder="ROM" />
      </Row>

      <Row label="Instances" sub="Parallel emulators (1–128)">
        <Controller
          name="num_instances"
          control={control}
          render={({ field }) => (
            <Input
              type="number" min={1} max={128}
              value={field.value}
              onChange={e => field.onChange(Number(e.target.value))}
              className="w-20 h-8 text-center font-semibold font-mono"
            />
          )}
        />
      </Row>

      {showAdvanced && watchedMode === 'wild' && (
        <Row label="Walk direction" sub="Cycle axis for wild encounters">
          <Controller
            name="walk_dir"
            control={control}
            render={({ field }) => (
              <PillToggle
                options={[
                  { value: 'ns', label: 'N / S' },
                  { value: 'ew', label: 'E / W' },
                ]}
                value={field.value}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
        </Row>
      )}

      {showAdvanced && (
        <Row label="Override ROM" sub="Point to a different ROM file">
          <button
            type="button"
            onClick={() => setRomPickerOpen(o => !o)}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {romPickerOpen ? 'Close' : 'Pick…'}
          </button>
        </Row>
      )}

      {showAdvanced && romPickerOpen && (
        <div className="py-2">
          <ItemPicker value={watchedRomPath} onChange={v => setValue('rom_path', v)} items={romItems} placeholder="ROM file" />
        </div>
      )}

      {/* Save-related inline validation */}
      {saveChecks.length > 0 && (
        <div className="pt-2 space-y-1">
          {saveChecks.map(c => (
            <div key={c.id} className={cn('rounded-md px-3 py-2 text-xs', SEVERITY_PILL[c.severity as 'error' | 'warning'])}>
              <div>{c.message}</div>
              {c.detail && <div className="text-[10px] opacity-80 mt-0.5">{c.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
