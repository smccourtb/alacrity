import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { GenderIcon } from '@/components/icons';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import PillToggle from '@/components/PillToggle';
import SavePicker from '@/components/SavePicker';
import type { HuntFormControl } from './types';
import {
  is3DSGame, NATURES, IV_STATS, SHINY_ATK_VALUES,
  RNG_PRESETS, CONDITION_OPTIONS,
} from './constants';

interface HuntTargetFormProps extends HuntFormControl {
  odds: { combos: number; total: number; odds: string };
  hasGenderChoice: boolean;
  isGenderless: boolean;
  isAlwaysMale: boolean;
  isAlwaysFemale: boolean;
  daycareInfo: any;
}

export default function HuntTargetForm({
  control, watch, setValue,
  odds, hasGenderChoice, isGenderless, isAlwaysMale, isAlwaysFemale,
  daycareInfo,
}: HuntTargetFormProps) {
  const watchedGame = watch('game');
  const watchedHuntMode = watch('hunt_mode');
  const watchedSavPath = watch('sav_path');
  const watchedTargetShiny = watch('target_shiny');
  const watchedTargetPerfect = watch('target_perfect');
  const watchedEncounterType = watch('encounter_type');
  const watchedTargetIvs = watch('target_ivs');

  const isThisA3DSGame = is3DSGame(watchedGame);

  // ── RNG preset state ──────────────────────────────────────────────────────
  const [rngPreset, setRngPreset] = useState<string>('quick_shiny');

  function applyPreset(preset: string) {
    setRngPreset(preset);
    switch (preset) {
      case "quick_shiny":
        setValue("target_shiny", 1);
        setValue("target_nature", undefined);
        setValue("target_ability", undefined);
        setValue("target_ivs", undefined);
        break;
      case "competitive_shiny":
        setValue("target_shiny", 1);
        break;
      case "perfect_shiny":
        setValue("target_shiny", 1);
        setValue("target_ivs", { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
        break;
      case "competitive":
        setValue("target_shiny", 0);
        break;
      case "custom":
        break;
    }
  }

  const currentIvs = watchedTargetIvs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  // ── Gen 1/2 DV logic ──────────────────────────────────────────────────────
  const isShiny = watchedTargetShiny === 1;
  const isPerfect = watchedTargetPerfect === 1;

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

  // ── Gen 1/2 section ───────────────────────────────────────────────────────
  if (!isThisA3DSGame) {
    return (
      <>
        {/* Save File (always visible for egg mode) */}
        {watchedHuntMode === 'egg' && (
          <SavePicker value={watchedSavPath} onChange={v => setValue('sav_path', v)} game={watchedGame} />
        )}

        {/* Daycare Info (egg mode) */}
        {watchedHuntMode === 'egg' && daycareInfo && (
          <div className="rounded-xl bg-surface-raised p-3 space-y-2">
            {daycareInfo.active && daycareInfo.mon1 && daycareInfo.mon2 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {daycareInfo.mon1.sprite && <img src={daycareInfo.mon1.sprite} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />}
                    <div>
                      <span className="text-sm font-semibold capitalize">{daycareInfo.mon1.name}</span>
                      {daycareInfo.mon1.is_shiny && <span className="text-2xs text-amber-500 ml-1">Shiny</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground/50">+</span>
                  <div className="flex items-center gap-1.5">
                    {daycareInfo.mon2.sprite && <img src={daycareInfo.mon2.sprite} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />}
                    <div>
                      <span className="text-sm font-semibold capitalize">{daycareInfo.mon2.name}</span>
                      {daycareInfo.mon2.is_shiny && <span className="text-2xs text-amber-500 ml-1">Shiny</span>}
                    </div>
                  </div>
                  {daycareInfo.offspringName && (
                    <>
                      <span className="text-xs text-muted-foreground/50">=</span>
                      <div className="flex items-center gap-1.5">
                        {daycareInfo.offspringSprite && <img src={daycareInfo.offspringSprite} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />}
                        <span className="text-sm font-semibold capitalize">{daycareInfo.offspringName}</span>
                      </div>
                    </>
                  )}
                </div>
                {daycareInfo.shinyOdds && (
                  <div className="text-xs text-muted-foreground/60">
                    Shiny odds: <span className="font-mono font-semibold text-foreground/80">{daycareInfo.shinyOdds}</span>
                    {(daycareInfo.mon1.is_shiny || daycareInfo.mon2.is_shiny) && ' (shiny parent)'}
                  </div>
                )}
                {daycareInfo.eggReady && (
                  <div className="text-xs text-amber-600 font-medium">Egg waiting to be picked up</div>
                )}
              </>
            ) : (
              <div className="text-sm text-destructive font-medium">No compatible pair in daycare. Deposit two Pokemon before starting.</div>
            )}
          </div>
        )}

        {/* Conditions */}
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
          <div className="text-xs text-muted-foreground/30 flex items-center gap-1">
            {isGenderless ? (
              <><GenderIcon gender="genderless" size="sm" /> Genderless species</>
            ) : isAlwaysMale ? (
              <><GenderIcon gender="male" size="sm" /> Always male</>
            ) : (
              <><GenderIcon gender="female" size="sm" /> Always female</>
            )}
          </div>
        )}

        {/* Min DVs */}
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

        {/* Odds preview */}
        <div className={cn('rounded-2xl px-4 py-3 flex items-center justify-between', odds.combos === 0 ? 'bg-red-50 border border-red-200' : 'bg-surface-raised')}>
          <div>
            <div className="text-xs text-muted-foreground/50 uppercase tracking-wider">Odds per attempt</div>
            <div className="text-xs text-muted-foreground/30 mt-0.5">{odds.combos.toLocaleString()} / {odds.total.toLocaleString()} matching combos</div>
          </div>
          <div className={cn('text-xl font-black font-mono', odds.combos === 0 ? 'text-red-500' : 'text-foreground')}>
            {odds.odds}
          </div>
        </div>
      </>
    );
  }

  // ── Gen 6/7 RNG section ─────────────────────────────────────────────────────
  return (
    <>
      {/* Preset pills */}
      <PillToggle
        options={RNG_PRESETS}
        value={rngPreset}
        onChange={(v) => applyPreset(v as string)}
      />

      {/* Shiny toggle */}
      <div className="flex items-center justify-between bg-surface-raised rounded-xl px-3 py-2.5">
        <div>
          <div className="text-xs font-semibold">Shiny</div>
          <div className="text-xs text-muted-foreground/40">Target a shiny Pokemon</div>
        </div>
        <Controller
          name="target_shiny"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === 1}
              onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
            />
          )}
        />
      </div>

      {/* Nature dropdown (hidden on quick_shiny) */}
      {rngPreset !== 'quick_shiny' && (
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
              onChange={(sel) => {
                const v = sel[0];
                field.onChange(v === '__any__' ? undefined : v);
              }}
              multiSelect={false}
              searchable
            />
          )}
        />
      )}

      {/* IV per-stat minimums (custom preset only) */}
      {rngPreset === 'custom' && (
        <FormField label="Min IVs">
          <div className="grid grid-cols-6 gap-1.5">
            {IV_STATS.map(({ key, label }) => (
              <div key={key} className="text-center">
                <div className="text-2xs text-muted-foreground/40 mb-1">{label}</div>
                <Input
                  type="number"
                  min={0}
                  max={31}
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

      {/* Ability selector */}
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

      {/* Shiny Charm toggle */}
      <div className="flex items-center justify-between bg-surface-raised rounded-xl px-3 py-2.5">
        <div>
          <div className="text-xs font-semibold">Shiny Charm</div>
          <div className="text-xs text-muted-foreground/40">Triples shiny probability</div>
        </div>
        <Controller
          name="shiny_charm"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === 1}
              onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
            />
          )}
        />
      </div>

      {/* Guaranteed Perfect IVs */}
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
          {watchedEncounterType === 'friend_safari' ? 'Friend Safari guarantees 2 perfect IVs' :
           watchedEncounterType === 'horde' ? 'Horde encounters have no guaranteed IVs' :
           watchedEncounterType === 'breeding' ? 'Destiny Knot passes 5 IVs from parents' :
           '0 = no guarantee, 3 = legendary (Gen 6), 3 = SOS chain (Gen 7)'}
        </div>
      </FormField>
    </>
  );
}
