// client/src/components/hunt/HuntConditionsSection.tsx
// Matches mockup at .superpowers/brainstorm/.../full-options.html
// Uses SectionLayout primitives (Section / Row / MiniPills / IvBox / IvLabel).
import { Controller } from 'react-hook-form';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { HuntFormControl } from './types';
import { is3DSGame, NATURES, IV_STATS, SHINY_ATK_VALUES, ENCOUNTER_TYPES } from './constants';
import type { HuntPreset } from './HuntPresetPicker';
import { checksForSection, SEVERITY_PILL } from './validationMapping';
import type { ValidationReport } from '@/hooks/useHuntValidation';
import { Section, Row, MiniPills, IvBox, IvInput, IvLabel } from './SectionLayout';

interface Props extends HuntFormControl {
  preset: HuntPreset;
  onPresetChange: (p: HuntPreset) => void;
  hasGenderChoice: boolean;
  isGenderless: boolean;
  isAlwaysMale: boolean;
  isAlwaysFemale: boolean;
  report: ValidationReport | null;
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

  // Shiny / Perfect pill state for Gen 1/2 mapping
  const shinyPerfectValue: string[] = [];
  if (isShiny) shinyPerfectValue.push('shiny');
  if (isPerfect) shinyPerfectValue.push('perfect');

  const handleShinyPerfectChange = (v: string | string[]) => {
    demoteToCustom();
    const arr = Array.isArray(v) ? v : [v];
    const newShiny = arr.includes('shiny') ? 1 : 0;
    const newPerfect = arr.includes('perfect') ? 1 : 0;
    setValue('target_shiny', newShiny);
    setValue('target_perfect', newPerfect);
    if (newShiny && newPerfect) {
      setValue('min_atk', 15); setValue('min_def', 10); setValue('min_spd', 10); setValue('min_spc', 10);
    } else if (newShiny) {
      setValue('min_def', 10); setValue('min_spd', 10); setValue('min_spc', 10);
    } else if (newPerfect) {
      setValue('min_atk', 15); setValue('min_def', 15); setValue('min_spd', 15); setValue('min_spc', 15);
    } else {
      setValue('min_atk', 0); setValue('min_def', 0); setValue('min_spd', 0); setValue('min_spc', 0);
    }
  };

  const genderSub = isGenderless
    ? 'Genderless species — locked'
    : isAlwaysMale ? 'Always male' : isAlwaysFemale ? 'Always female' : undefined;

  const encounterMeta = ENCOUNTER_TYPES.find(e => e.value === watchedEncounter);
  const encounterHint = encounterMeta?.blurb ?? 'Legendary = 3, SOS = 3, Friend Safari = 2';

  const sectionTitle = `Target Conditions${is3DS ? ' · Gen 6/7' : ' · Gen 1/2'}`;

  return (
    <>
      <Section title={sectionTitle} hint="What makes a catch count">
        {/* Gen 1/2: Shiny / Perfect pills as the leading row */}
        {!is3DS && (
          <Row label="Shiny / Perfect" sub="Apply DV locks automatically">
            <MiniPills
              multiple
              value={shinyPerfectValue}
              onChange={handleShinyPerfectChange}
              options={[
                { value: 'shiny', label: '✨ Shiny', variant: 'primary' },
                { value: 'perfect', label: '★ Perfect', variant: 'amber' },
              ]}
            />
          </Row>
        )}

        {/* Gender */}
        {hasGenderChoice && (
          <Row label="Gender">
            <Controller
              name="target_gender"
              control={control}
              render={({ field }) => (
                <MiniPills
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  options={[
                    { value: 'any', label: '⚲ Any' },
                    { value: 'male', label: '♂ Male', variant: 'blue' },
                    { value: 'female', label: '♀ Female', variant: 'pink' },
                  ]}
                />
              )}
            />
          </Row>
        )}
        {!hasGenderChoice && genderSub && (
          <Row label="Gender" sub={genderSub}>
            <span className="text-xs text-muted-foreground/60">—</span>
          </Row>
        )}

        {/* Gen 6/7 specifics */}
        {is3DS && (
          <>
            <Row label="Encounter method" sub={encounterMeta?.blurb}>
              <Controller
                name="encounter_type"
                control={control}
                render={({ field }) => (
                  <FilterDropdown
                    label="Method"
                    options={ENCOUNTER_TYPES.map(e => ({ value: e.value, label: e.label }))}
                    selected={field.value ? [field.value] : []}
                    onChange={(sel) => {
                      const next = sel[0];
                      if (!next) return;
                      field.onChange(next);
                      // Auto-suggest guaranteed IVs for the new method unless user already set one.
                      const meta = ENCOUNTER_TYPES.find(e => e.value === next);
                      if (meta) setValue('guaranteed_ivs', meta.guaranteedIvs);
                    }}
                    multiSelect={false}
                  />
                )}
              />
            </Row>

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
                  <MiniPills
                    value={field.value || '__any__'}
                    onChange={(v) => { demoteToCustom(); field.onChange(v === '__any__' ? undefined : v); }}
                    options={[
                      { value: '__any__', label: 'Any' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'hidden', label: 'Hidden', variant: 'purple' },
                    ]}
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
                    className="w-16 h-8 text-center font-semibold font-mono text-xs"
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

        {/* IV / DV grid — aligned to top */}
        {is3DS ? (
          <Row
            label={showCustom ? 'Min IVs' : 'IVs'}
            sub={showCustom ? 'Per-stat lower bound (0–31)' : preset === 'perfect' ? 'All 31 (preset: Perfect)' : 'No IV filter (preset: Shiny)'}
            alignTop
          >
            <div className="grid grid-cols-6 gap-1.5 w-[360px]">
              {IV_STATS.map(({ key, label }) => {
                const locked = !showCustom;
                const value = currentIvs[key] ?? 0;
                const state: 'editable' | 'locked' | 'perfect' =
                  !locked ? 'editable' : preset === 'perfect' ? 'perfect' : 'locked';
                const displayValue = locked && preset === 'perfect' ? 31 : locked ? '—' : value;
                return (
                  <div key={key}>
                    <IvLabel>{label}</IvLabel>
                    {locked ? (
                      <IvBox value={displayValue} state={state} />
                    ) : (
                      <IvInput
                        value={value}
                        max={31}
                        onChange={(v) => {
                          demoteToCustom();
                          setValue('target_ivs', { ...currentIvs, [key]: v });
                        }}
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
              isShiny && isPerfect ? 'Shiny + Perfect: all locked' :
              isShiny ? 'Shiny: Def/Spd/Spc locked to 10' :
              isPerfect ? 'Perfect: all locked to 15' : 'No DV filter'
            }
            alignTop
          >
            <div className="grid grid-cols-4 gap-1.5 w-[280px]">
              {(['atk', 'def', 'spd', 'spc'] as const).map(stat => {
                const atkLocked = isPerfect;
                const nonAtkLocked = isShiny || isPerfect;
                const locked = stat === 'atk' ? atkLocked : nonAtkLocked;
                const lockedValue = stat === 'atk' ? 15 : isShiny ? 10 : 15;
                const state: 'editable' | 'locked' | 'perfect' =
                  !showCustom && isPerfect ? 'perfect' : locked ? 'locked' : 'editable';
                const shinyAtkMode = stat === 'atk' && isShiny && !isPerfect && showCustom;

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
                          <IvInput
                            value={(f.value as number) ?? 0}
                            max={15}
                            onChange={(v) => { demoteToCustom(); f.onChange(v); }}
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

      {targetChecks.length > 0 && (
        <div className="space-y-1 mb-3">
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
