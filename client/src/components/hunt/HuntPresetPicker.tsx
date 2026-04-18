import { useEffect, useRef } from 'react';
import PillToggle from '@/components/PillToggle';
import { is3DSGame } from './constants';
import type { HuntFormControl } from './types';
import { Section } from './SectionLayout';

export type HuntPreset = 'shiny' | 'perfect' | 'competitive' | 'custom';

interface Props extends HuntFormControl {
  preset: HuntPreset;
  onPresetChange: (p: HuntPreset) => void;
}

const OPTIONS = [
  { value: 'shiny', label: '✨ Shiny' },
  { value: 'perfect', label: '★ Perfect' },
  { value: 'competitive', label: 'Competitive', disabled: true },
  { value: 'custom', label: 'Custom' },
];

export default function HuntPresetPicker({ watch, setValue, preset, onPresetChange }: Props) {
  const game = watch('game');
  const is3DS = is3DSGame(game);

  const prevIs3DSRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevIs3DSRef.current !== null && prevIs3DSRef.current !== is3DS) {
      applyPreset(preset, is3DS, setValue);
    }
    prevIs3DSRef.current = is3DS;
  }, [is3DS, preset, setValue]);

  function onChange(v: string | string[]) {
    const next = (Array.isArray(v) ? v[0] : v) as HuntPreset;
    if (next === 'competitive') return;
    onPresetChange(next);
    applyPreset(next, is3DS, setValue);
  }

  return (
    <Section title="Preset" hint="Quick setups for common hunts">
      <div className="py-2">
        <PillToggle options={OPTIONS} value={preset} onChange={onChange} />
        <div className="text-[10px] text-muted-foreground/60 mt-1.5">
          {preset === 'shiny' && 'Shiny-only: Gen 1/2 locks Def/Spd/Spc = 10, Atk open. Gen 6/7 ignores IVs.'}
          {preset === 'perfect' && 'Best shiny: Gen 1/2 Atk 15 · Def/Spd/Spc 10. Gen 6/7 all IVs 31.'}
          {preset === 'custom' && 'Every field editable. Edit anything elsewhere and this preset activates.'}
        </div>
      </div>
    </Section>
  );
}

function applyPreset(preset: HuntPreset, is3DS: boolean, setValue: HuntFormControl['setValue']) {
  switch (preset) {
    case 'shiny':
      setValue('target_shiny', 1);
      setValue('target_perfect', 0);
      setValue('target_nature', undefined);
      setValue('target_ability', undefined);
      setValue('target_ivs', undefined);
      if (!is3DS) {
        setValue('min_atk', 0);
        setValue('min_def', 10);
        setValue('min_spd', 10);
        setValue('min_spc', 10);
      }
      break;
    case 'perfect':
      setValue('target_shiny', 1);
      setValue('target_perfect', 1);
      if (is3DS) {
        setValue('target_ivs', { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
      } else {
        setValue('min_atk', 15);
        setValue('min_def', 15);
        setValue('min_spd', 15);
        setValue('min_spc', 15);
      }
      break;
    case 'custom':
      break;
  }
}
