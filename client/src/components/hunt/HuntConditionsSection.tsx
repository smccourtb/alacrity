// client/src/components/hunt/HuntConditionsSection.tsx
import { Controller } from 'react-hook-form';
import { GenderIcon } from '@/components/icons';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import PillToggle from '@/components/PillToggle';
import type { HuntFormControl } from './types';
import { is3DSGame, NATURES, IV_STATS, SHINY_ATK_VALUES } from './constants';
import type { HuntPreset } from './HuntPresetPicker';
import { checksForSection, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';
import { Section, Row } from './SectionLayout';

interface Props extends HuntFormControl {
  preset: HuntPreset;
  onPresetChange: (p: HuntPreset) => void;
  hasGenderChoice: boolean;
  isGenderless: boolean;
  isAlwaysMale: boolean;
  isAlwaysFemale: boolean;
  report: ValidationReport | null;
}

function IvBox({ value, state }: { value: number | string; state: 'editable' | 'locked' | 'perfect' }) {
  return (
    <div
      className={cn(
        'rounded-lg border h-9 flex items-center justify-center font-mono font-bold text-sm',
        state === 'editable' && 'bg-muted border-border text-foreground',
        state === 'locked' && 'bg-amber-500/10 border-amber-500/30 text-amber-700',
        state === 'perfect' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
      )}
    >
      {value}
    </div>
  );
}

function IvLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold mb-1 text-center">{children}</div>;
}

export default function HuntConditionsSection({
  control, watch, setValue,
  preset, onPresetChange,
  hasGenderChoice, isGenderless, isAlwaysMale, isAlwaysFemale,
  report,
}: Props) {
  const demoteToCustom = () => { if (preset !== 'custom') onPresetChange('custom'); };
  const game = watch('game');
  const is3DS = is3DSGame(game);
  const showCustom = preset === 'custom';
  const targetChecks = checksForSection(report, 'target');

  const watchedShiny = watch('target_shiny');
  const watchedPerfect = watch('target_perfect');
  const watchedEncounter = watch('encounter_type');
  const watchedIvs = watch('target_ivs');
  const currentIvs = watchedIvs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  const isShiny = watchedShiny === 1;
  const isPerfect = watchedPerfect === 1;
  const atkLocked = isPerfect;
  const defLocked = isShiny || isPerfect;
  const spdLocked = isShiny || isPerfect;
  const spcLocked = isShiny || isPerfect;

  const genderSub = isGenderless
    ? 'Genderless species — locked'
    : isAlwaysMale ? 'Always male' : isAlwaysFemale ? 'Always female' : undefined;

  const encounterHint =
    watchedEncounter === 'friend_safari' ? 'Friend Safari guarantees 2 perfect IVs' :
    watchedEncounter === 'horde' ? 'Horde encounters have no guaranteed IVs' :
    watchedEncounter === 'breeding' ? 'Destiny Knot passes 5 IVs from parents' :
    '0 = none · 3 = legendary / SOS chain';

  const sectionTitle = `Target Conditions${is3DS ? ' · Gen 6/7' : ' · Gen 1/2'}`;

  return (
    <>
      <Section title={sectionTitle} hint="What makes a catch count">
        {/* Gender */}
        {hasGenderChoice ? (
          <Row label="Gender">
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
          </Row>
        ) : genderSub && (
          <Row label="Gender" sub={genderSub}>
            <GenderIcon
              gender={isGenderless ? 'genderless' : isAlwaysMale ? 'male' : 'female'}
              size="sm"
            />
          </Row>
        )}

        {/* Gen 6/7 extras */}
        {is3DS && (
          <>
            <Row label="Nature">
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
                    onChange={(sel) => { demoteToCustom(); field.onChange(sel[0] === '__any__' ? undefined : sel[0]); }}
                    multiSelect={false}
                    searchable
                  />
                )}
              />
            </Row>

            <Row label="Ability">
              <Controller
                name="target_ability"
                control={control}
                render={({ field }) => (
                  <PillToggle
                    options={[
                      { value: '__any__', label: 'Any' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'hidden', label: 'Hidden', activeClassName: 'bg-purple-500/10 text-purple-600 border border-purple-500/25 shadow-sm' },
                    ]}
                    value={field.value || '__any__'}
                    onChange={(v) => { demoteToCustom(); field.onChange(v === '__any__' ? undefined : v); }}
                  />
                )}
              />
            </Row>

            <Row label="Guaranteed Perfect IVs" sub={encounterHint}>
              <Controller
                name="guaranteed_ivs"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number" min={0} max={6}
                    value={field.value ?? 0}
                    onChange={e => { demoteToCustom(); field.onChange(Math.min(6, Math.max(0, Number(e.target.value)))); }}
                    className="w-16 h-8 text-center font-semibold font-mono"
                  />
                )}
              />
            </Row>

            <Row label="Shiny Charm" sub="Triples shiny probability">
              <Controller
                name="shiny_charm"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value === 1} onCheckedChange={(c) => field.onChange(c ? 1 : 0)} />
                )}
              />
            </Row>
          </>
        )}

        {/* IV / DV grid */}
        {is3DS ? (
          <Row
            label={showCustom ? 'Min IVs' : 'IVs'}
            sub={showCustom ? 'Per-stat lower bound (0–31)' : preset === 'perfect' ? 'All 31 (preset: Perfect)' : 'No IV filter (preset: Shiny)'}
            alignTop
          >
            <div className="grid grid-cols-6 gap-1.5 w-[300px]">
              {IV_STATS.map(({ key, label }) => {
                const locked = !showCustom;
                const value = currentIvs[key] ?? 0;
                const displayValue = locked && preset === 'perfect' ? 31 : locked && preset === 'shiny' ? '—' : value;
                const state: 'editable' | 'locked' | 'perfect' =
                  !locked ? 'editable' : preset === 'perfect' ? 'perfect' : 'locked';
                return (
                  <div key={key}>
                    <IvLabel>{label}</IvLabel>
                    {locked ? (
                      <IvBox value={displayValue} state={state} />
                    ) : (
                      <Input
                        type="number" min={0} max={31}
                        value={value}
                        onChange={e => {
                          const val = Math.min(31, Math.max(0, Number(e.target.value)));
                          demoteToCustom();
                          setValue('target_ivs', { ...currentIvs, [key]: val });
                        }}
                        className="h-9 text-center font-bold font-mono p-1 text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Row>
        ) : (
          <Row
            label={showCustom ? 'Min DVs' : 'DVs'}
            sub={
              showCustom ? 'Per-stat lower bound (0–15)' :
              isShiny && isPerfect ? 'Shiny + Perfect: Atk 15 · Def/Spd/Spc 10' :
              isShiny ? `Shiny: Def/Spd/Spc = 10, Atk ∈ {${SHINY_ATK_VALUES.join(',')}}` :
              isPerfect ? 'Perfect: all 15' : 'No DV filter'
            }
            alignTop
          >
            <div className="grid grid-cols-4 gap-1.5 w-[220px]">
              {(['atk', 'def', 'spd', 'spc'] as const).map(stat => {
                const locked = stat === 'atk' ? atkLocked : stat === 'def' ? defLocked : stat === 'spd' ? spdLocked : spcLocked;
                const shinyAtkMode = stat === 'atk' && isShiny && !isPerfect && showCustom;
                const lockedValue = stat === 'atk' ? 15 : isShiny ? 10 : 15;
                const state: 'editable' | 'locked' | 'perfect' =
                  !showCustom && isPerfect ? 'perfect' : locked ? 'locked' : 'editable';

                return (
                  <div key={stat}>
                    <IvLabel>{stat.toUpperCase()}</IvLabel>
                    {locked && !showCustom ? (
                      <IvBox value={lockedValue} state={state} />
                    ) : locked && showCustom ? (
                      <IvBox value={lockedValue} state="locked" />
                    ) : shinyAtkMode ? (
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
                            onChange={(sel) => { demoteToCustom(); f.onChange(Number(sel[0] ?? 0)); }}
                            multiSelect={false}
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        name={`min_${stat}` as 'min_atk' | 'min_def' | 'min_spd' | 'min_spc'}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number" min={0} max={15}
                            value={(f.value as number) ?? 0}
                            onChange={e => { demoteToCustom(); f.onChange(Math.min(15, Math.max(0, Number(e.target.value)))); }}
                            className="h-9 text-center font-bold font-mono p-1 text-sm"
                          />
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Row>
        )}
      </Section>

      {/* Inline target warnings — render only if any */}
      {targetChecks.length > 0 && (
        <div className="space-y-1">
          {targetChecks.map(c => (
            <div key={c.id} className={cn('rounded-md px-3 py-2 text-xs', SEVERITY_PILL[c.severity as 'error' | 'warning'])}>
              <div>{c.message}</div>
              {c.detail && <div className="text-[10px] opacity-80 mt-0.5">{c.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
