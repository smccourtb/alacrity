// client/src/components/HuntForm.tsx
import { useState, useEffect } from 'react';
import type { Control, UseFormWatch, UseFormSetValue, UseFormHandleSubmit } from 'react-hook-form';
import { api } from '@/api/client';
import HuntContextBar from '@/components/hunt/HuntContextBar';
import HuntPresetPicker, { type HuntPreset } from '@/components/hunt/HuntPresetPicker';
import HuntConditionsSection from '@/components/hunt/HuntConditionsSection';
import HuntGearSection from '@/components/hunt/HuntGearSection';
import type { HuntFormValues } from '@/components/hunt/types';
import type { ValidationReport } from '@/hooks/useHuntValidation';

export type { HuntFormValues } from '@/components/hunt/types';

interface HuntFormProps {
  control: Control<HuntFormValues>;
  watch: UseFormWatch<HuntFormValues>;
  setValue: UseFormSetValue<HuntFormValues>;
  handleSubmit: UseFormHandleSubmit<HuntFormValues>;
  onSubmit: (data: HuntFormValues) => void;
  gameConfigs: any[];
  gameConfig: any;
  onGameChange: (game: string) => void;
  onTargetChange: (target: string) => void;
  onModeChange: (mode: string) => void;
  customTarget: boolean;
  setCustomTarget: (v: boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  odds: { combos: number; total: number; odds: string };
  hasGenderChoice: boolean;
  isGenderless: boolean;
  isAlwaysMale: boolean;
  isAlwaysFemale: boolean;
  validationReport?: ValidationReport | null;
  onDaycareInfo?: (info: any) => void;

  // Legacy pass-through props — Task 9 will remove these from HuntDashboard and from here.
  validationLoading?: boolean;
  override?: boolean;
  onOverrideChange?: (next: boolean) => void;
  startDisabled?: boolean;
}

export default function HuntForm({
  control, watch, setValue, handleSubmit, onSubmit,
  gameConfigs, gameConfig, onGameChange, onTargetChange, onModeChange,
  customTarget, setCustomTarget, showAdvanced, setShowAdvanced,
  odds, hasGenderChoice, isGenderless, isAlwaysMale, isAlwaysFemale,
  validationReport, onDaycareInfo,
  // legacy — intentionally unused in this task; Task 9 will remove these
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validationLoading: _validationLoading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override: _override,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onOverrideChange: _onOverrideChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startDisabled: _startDisabled,
}: HuntFormProps) {
  const watchedGame = watch('game');
  const watchedHuntMode = watch('hunt_mode');
  const watchedSavPath = watch('sav_path');

  const [huntFiles, setHuntFiles] = useState<{ roms: any[] }>({ roms: [] });
  useEffect(() => {
    api.hunts.files().then(f => setHuntFiles({ roms: f.roms })).catch(() => {});
  }, []);

  const [daycareInfo, setDaycareInfo] = useState<any>(null);
  useEffect(() => {
    if (watchedHuntMode !== 'egg' || !watchedSavPath || !watchedGame) {
      setDaycareInfo(null);
      onDaycareInfo?.(null);
      return;
    }
    api.hunts.daycareInfo(watchedSavPath, watchedGame)
      .then(info => { setDaycareInfo(info); onDaycareInfo?.(info); })
      .catch(() => { setDaycareInfo(null); onDaycareInfo?.(null); });
  }, [watchedHuntMode, watchedSavPath, watchedGame, onDaycareInfo]);

  useEffect(() => {
    if (watchedHuntMode === 'egg' && daycareInfo?.offspringName) {
      const name = daycareInfo.offspringName.charAt(0).toUpperCase() + daycareInfo.offspringName.slice(1);
      setValue('target_name', name);
      if (daycareInfo.offspringSpeciesId) {
        setValue('target_species_id', daycareInfo.offspringSpeciesId);
      }
    }
  }, [daycareInfo, watchedHuntMode, setValue]);

  const [preset, setPreset] = useState<HuntPreset>('shiny');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <HuntContextBar
        control={control}
        watch={watch}
        setValue={setValue}
        gameConfigs={gameConfigs}
        gameConfig={gameConfig}
        onGameChange={onGameChange}
        onTargetChange={onTargetChange}
        onModeChange={onModeChange}
        customTarget={customTarget}
        setCustomTarget={setCustomTarget}
        daycareInfo={daycareInfo}
      />

      <HuntPresetPicker
        control={control}
        watch={watch}
        setValue={setValue}
        preset={preset}
        onPresetChange={setPreset}
      />

      <HuntConditionsSection
        control={control}
        watch={watch}
        setValue={setValue}
        preset={preset}
        odds={odds}
        hasGenderChoice={hasGenderChoice}
        isGenderless={isGenderless}
        isAlwaysMale={isAlwaysMale}
        isAlwaysFemale={isAlwaysFemale}
        report={validationReport ?? null}
      />

      <HuntGearSection
        control={control}
        watch={watch}
        setValue={setValue}
        huntFiles={huntFiles}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        report={validationReport ?? null}
      />
    </form>
  );
}
