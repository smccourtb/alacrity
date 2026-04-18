import { Controller } from 'react-hook-form';
import { GenderIcon } from '@/components/icons';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import PillToggle from '@/components/PillToggle';
import type { HuntFormControl } from './types';
import { is3DSGame, NATURES, IV_STATS, SHINY_ATK_VALUES, CONDITION_OPTIONS } from './constants';
import type { HuntPreset } from './HuntPresetPicker';
import { checksForSection, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';

interface Props extends HuntFormControl {
  preset: HuntPreset;
  odds: { combos: number; total: number; odds: string };
  hasGenderChoice: boolean;
  isGenderless: boolean;
  isAlwaysMale: boolean;
  isAlwaysFemale: boolean;
  report: ValidationReport | null;
}

export default function HuntConditionsSection({
  control, watch, setValue,
  preset, odds,
  hasGenderChoice, isGenderless, isAlwaysMale, isAlwaysFemale,
  report,
}: Props) {
  const game = watch('game');
  const is3DS = is3DSGame(game);
  const showCustom = preset === 'custom';
  const targetChecks = checksForSection(report, 'target');

  const watchedShiny = watch('target_shiny');
  const watchedPerfect = watch('target_perfect');
  const watchedEncounter = watch('encounter_type');
  const watchedIvs = watch('target_ivs');
  const currentIvs = watchedIvs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  // Gen 1/2 DV locking
  const isShiny = watchedShiny === 1;
  const isPerfect = watchedPerfect === 1;
  const atkLocked = isPerfect;
  const defLocked = isShiny || isPerfect;
  const spdLocked = isShiny || isPerfect;
  const spcLocked = isShiny || isPerfect;

  const conditions: string[] = [];
  if (isShiny) conditions.push('shiny');
  if (isPerfect) conditions.push('perfect');

  const handleConditionsChange = (values: string | string[]) => {
    const arr = Array.isArray(values) ? values : [values];
    const newShiny = arr.includes('shiny') ? 1 : 0;
    const newPerfect = arr.includes('perfect') ? 1 : 0;
    setValue('target_shiny', newShiny);
    setValue('target_perfect', newPerfect);

    if (newShiny && newPerfect) {
      setValue('min_atk', 15);
      setValue('min_def', 10);
      setValue('min_spd', 10);
      setValue('min_spc', 10);
    } else if (newShiny) {
      setValue('min_def', 10);
      setValue('min_spd', 10);
      setValue('min_spc', 10);
      if (!isShiny) setValue('min_atk', 0);
    } else if (newPerfect) {
      setValue('min_atk', 15);
      setValue('min_def', 15);
      setValue('min_spd', 15);
      setValue('min_spc', 15);
    } else {
      setValue('min_atk', 0);
      setValue('min_def', 0);
      setValue('min_spd', 0);
      setValue('min_spc', 0);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-soft p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-2xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Target Conditions</div>
      </div>

      {/* Gen 1/2: Shiny / Perfect condition pills */}
      {!is3DS && (
        <div>
          <PillToggle
            options={CONDITION_OPTIONS}
            value={conditions}
            onChange={handleConditionsChange}
            multiple
          />
          {isShiny && isPerfect && (
            <div className="text-2xs text-muted-foreground/40 mt-1">Best shiny (Atk:15 Def:10 Spd:10 Spc:10)</div>
          )}
          {isShiny && !isPerfect && (
            <div className="text-2xs text-muted-foreground/40 mt-1">Shiny DVs: Def/Spd/Spc locked to 10, Atk from {'{'}2,3,6,7,10,11,14,15{'}'}</div>
          )}
          {!isShiny && isPerfect && (
            <div className="text-2xs text-muted-foreground/40 mt-1">Perfect: all DVs locked to 15</div>
          )}
        </div>
      )}

      {/* Gender */}
      {hasGenderChoice && (
        <Controller
          name="target_gender"
          control={control}
          render={({ field }) => (
            <PillToggle
              options={[
                { value: 'any', label: 'Any' },
                { value: 'male', label: 'Male', activeClassName: 'bg-sky-500/10 text-sky-600 border border-sky-500/25 shadow-sm' },
                { value: 'female', label: 'Female', activeClassName: 'bg-pink-500/10 text-pink-600 border border-pink-500/25 shadow-sm' },
              ]}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
      )}
      {(isGenderless || isAlwaysMale || isAlwaysFemale) && (
        <div className="text-xs text-muted-foreground/40 flex items-center gap-1">
          {isGenderless ? (
            <><GenderIcon gender="genderless" size="sm" /> Genderless species</>
          ) : isAlwaysMale ? (
            <><GenderIcon gender="male" size="sm" /> Always male</>
          ) : (
            <><GenderIcon gender="female" size="sm" /> Always female</>
          )}
        </div>
      )}

      {/* Gen 6/7: nature / ability / guaranteed IVs / shiny charm */}
      {is3DS && (
        <>
          <Controller
            name="target_nature"
            control={control}
            render={({ field }) => (
              <FilterDropdown
                label="Any nature"
                options={[
                  { value: '__any__', label: 'Any nature' },
                  ...NATURES.map(n => ({ value: n, label: n })),
                ]}
                selected={field.value ? [field.value] : ['__any__']}
                onChange={(sel) => field.onChange(sel[0] === '__any__' ? undefined : sel[0])}
                multiSelect={false}
                searchable
              />
            )}
          />
          <Controller
            name="target_ability"
            control={control}
            render={({ field }) => (
              <PillToggle
                options={[
                  { value: '__any__', label: 'No preference' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'hidden', label: 'Hidden', activeClassName: 'bg-purple-500/10 text-purple-600 border border-purple-500/25 shadow-sm' },
                ]}
                value={field.value || '__any__'}
                onChange={(v) => field.onChange(v === '__any__' ? undefined : v)}
              />
            )}
          />
          <FormField label="Guaranteed Perfect IVs">
            <Controller
              name="guaranteed_ivs"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={field.value ?? 0}
                  onChange={e => field.onChange(Math.min(6, Math.max(0, Number(e.target.value))))}
                  className="font-semibold"
                />
              )}
            />
            <div className="text-xs text-muted-foreground/40 mt-1">
              {watchedEncounter === 'friend_safari' ? 'Friend Safari guarantees 2 perfect IVs' :
               watchedEncounter === 'horde' ? 'Horde encounters have no guaranteed IVs' :
               watchedEncounter === 'breeding' ? 'Destiny Knot passes 5 IVs from parents' :
               '0 = no guarantee, 3 = legendary (Gen 6), 3 = SOS chain (Gen 7)'}
            </div>
          </FormField>
        </>
      )}

      {/* Gen 1/2: 4-stat DV grid */}
      {!is3DS && showCustom && (
        <FormField label={isShiny || isPerfect ? 'DVs' : 'Min DVs'}>
          <div className="grid grid-cols-4 gap-2">
            {/* ATK */}
            <div className="text-center">
              <div className="text-2xs text-muted-foreground/40 mb-1">ATK</div>
              {atkLocked ? (
                <div className="bg-surface-raised rounded-xl h-10 flex items-center justify-center font-bold font-mono text-amber-600 text-sm">15</div>
              ) : isShiny ? (
                <Controller
                  name="min_atk"
                  control={control}
                  render={({ field: f }) => (
                    <FilterDropdown
                      label="Any"
                      options={[
                        { value: '0', label: 'Any' },
                        ...SHINY_ATK_VALUES.map(v => ({ value: String(v), label: String(v) })),
                      ]}
                      selected={f.value ? [String(f.value)] : ['0']}
                      onChange={(sel) => f.onChange(Number(sel[0] ?? 0))}
                      multiSelect={false}
                    />
                  )}
                />
              ) : (
                <Controller
                  name="min_atk"
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={f.value}
                      onChange={e => f.onChange(Math.min(15, Math.max(0, Number(e.target.value))))}
                      className="text-center font-bold font-mono"
                    />
                  )}
                />
              )}
            </div>
            {/* DEF */}
            <div className="text-center">
              <div className="text-2xs text-muted-foreground/40 mb-1">DEF</div>
              {defLocked ? (
                <div className="bg-surface-raised rounded-xl h-10 flex items-center justify-center font-bold font-mono text-amber-600 text-sm">{isShiny ? 10 : 15}</div>
              ) : (
                <Controller
                  name="min_def"
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={f.value}
                      onChange={e => f.onChange(Math.min(15, Math.max(0, Number(e.target.value))))}
                      className="text-center font-bold font-mono"
                    />
                  )}
                />
              )}
            </div>
            {/* SPD */}
            <div className="text-center">
              <div className="text-2xs text-muted-foreground/40 mb-1">SPD</div>
              {spdLocked ? (
                <div className="bg-surface-raised rounded-xl h-10 flex items-center justify-center font-bold font-mono text-amber-600 text-sm">{isShiny ? 10 : 15}</div>
              ) : (
                <Controller
                  name="min_spd"
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={f.value}
                      onChange={e => f.onChange(Math.min(15, Math.max(0, Number(e.target.value))))}
                      className="text-center font-bold font-mono"
                    />
                  )}
                />
              )}
            </div>
            {/* SPC */}
            <div className="text-center">
              <div className="text-2xs text-muted-foreground/40 mb-1">SPC</div>
              {spcLocked ? (
                <div className="bg-surface-raised rounded-xl h-10 flex items-center justify-center font-bold font-mono text-amber-600 text-sm">{isShiny ? 10 : 15}</div>
              ) : (
                <Controller
                  name="min_spc"
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={f.value}
                      onChange={e => f.onChange(Math.min(15, Math.max(0, Number(e.target.value))))}
                      className="text-center font-bold font-mono"
                    />
                  )}
                />
              )}
            </div>
          </div>
        </FormField>
      )}
      {!is3DS && !showCustom && (
        <div className="text-2xs text-muted-foreground/40">
          DVs locked by preset
          {isShiny && isPerfect ? ' (Shiny + Perfect: Atk 15 · Def 10 · Spd 10 · Spc 10)' :
           isShiny ? ' (Shiny: Def 10 · Spd 10 · Spc 10, Atk ∈ {2,3,6,7,10,11,14,15})' :
           isPerfect ? ' (Perfect: all 15)' : ''}
        </div>
      )}

      {/* Gen 6/7: 6-stat IV grid (Custom only) */}
      {is3DS && showCustom && (
        <FormField label="Min IVs">
          <div className="grid grid-cols-6 gap-1.5">
            {IV_STATS.map(({ key, label }) => (
              <div key={key} className="text-center">
                <div className="text-2xs text-muted-foreground/40 mb-1">{label}</div>
                <Input
                  type="number" min={0} max={31}
                  value={currentIvs[key] ?? 0}
                  onChange={e => {
                    const val = Math.min(31, Math.max(0, Number(e.target.value)));
                    setValue('target_ivs', { ...currentIvs, [key]: val });
                  }}
                  className="text-center font-bold font-mono p-1"
                />
              </div>
            ))}
          </div>
        </FormField>
      )}

      {/* Shiny Charm (3DS only) */}
      {is3DS && (
        <div className="flex items-center justify-between bg-surface-raised rounded-xl px-3 py-2.5">
          <div>
            <div className="text-xs font-semibold">Shiny Charm</div>
            <div className="text-xs text-muted-foreground/40">Triples shiny probability</div>
          </div>
          <Controller
            name="shiny_charm"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value === 1} onCheckedChange={(c) => field.onChange(c ? 1 : 0)} />
            )}
          />
        </div>
      )}

      {/* Odds preview */}
      <div className={cn('rounded-2xl px-3 py-2.5 flex items-center justify-between', odds.combos === 0 ? 'bg-red-50 border border-red-200' : 'bg-surface-raised')}>
        <div>
          <div className="text-2xs text-muted-foreground/50 uppercase tracking-wider">Odds per attempt</div>
          <div className="text-2xs text-muted-foreground/30 mt-0.5">{odds.combos.toLocaleString()} / {odds.total.toLocaleString()}</div>
        </div>
        <div className={cn('text-base font-black font-mono', odds.combos === 0 ? 'text-red-500' : 'text-foreground')}>{odds.odds}</div>
      </div>

      {/* Inline validation pills for target checks */}
      {targetChecks.map(c => (
        <div key={c.id} className={cn('rounded px-2 py-1 text-xs', SEVERITY_PILL[c.severity as 'error' | 'warning'])}>
          <div>{c.message}</div>
          {c.detail && <div className="text-2xs opacity-80 mt-0.5">{c.detail}</div>}
        </div>
      ))}
    </div>
  );
}
