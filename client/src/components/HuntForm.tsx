// client/src/components/HuntForm.tsx
import { useState, useEffect } from 'react';
import type { Control, UseFormWatch, UseFormSetValue, UseFormHandleSubmit } from 'react-hook-form';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import HuntGameSelector from '@/components/hunt/HuntGameSelector';
import HuntTargetForm from '@/components/hunt/HuntTargetForm';
import HuntAdvancedOptions from '@/components/hunt/HuntAdvancedOptions';
import { HuntValidationPanel } from '@/components/hunt/HuntValidationPanel';
import type { HuntFormValues } from '@/components/hunt/types';
import type { ValidationReport } from '@/hooks/useHuntValidation';

// Re-export for consumers that import from HuntForm
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
  validationReport, validationLoading, override, onOverrideChange, startDisabled,
}: HuntFormProps) {
  const watchedGame = watch('game');
  const watchedHuntMode = watch('hunt_mode');
  const watchedTargetName = watch('target_name');
  const watchedRomPath = watch('rom_path');
  const watchedSavPath = watch('sav_path');

  // Fetch available ROMs for pickers
  const [huntFiles, setHuntFiles] = useState<{ roms: any[] }>({ roms: [] });
  useEffect(() => {
    api.hunts.files().then(f => setHuntFiles({ roms: f.roms })).catch(() => {});
  }, []);

  // Daycare info for egg mode
  const [daycareInfo, setDaycareInfo] = useState<any>(null);
  useEffect(() => {
    if (watchedHuntMode !== 'egg' || !watchedSavPath || !watchedGame) {
      setDaycareInfo(null);
      return;
    }
    api.hunts.daycareInfo(watchedSavPath, watchedGame)
      .then(setDaycareInfo)
      .catch(() => setDaycareInfo(null));
  }, [watchedHuntMode, watchedSavPath, watchedGame]);

  // Auto-set target name from daycare offspring
  useEffect(() => {
    if (watchedHuntMode === 'egg' && daycareInfo?.offspringName) {
      const name = daycareInfo.offspringName.charAt(0).toUpperCase() + daycareInfo.offspringName.slice(1);
      setValue('target_name', name);
      if (daycareInfo.offspringSpeciesId) {
        setValue('target_species_id', daycareInfo.offspringSpeciesId);
      }
    }
  }, [daycareInfo, watchedHuntMode, setValue]);

  return (
    <div className="bg-card shadow-soft rounded-lg mb-6">
      {/* Red accent top */}
      <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-t-[20px]" />

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <HuntGameSelector
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
          validation={validationReport}
          overrideEnabled={override}
        />

        <HuntTargetForm
          control={control}
          watch={watch}
          setValue={setValue}
          odds={odds}
          hasGenderChoice={hasGenderChoice}
          isGenderless={isGenderless}
          isAlwaysMale={isAlwaysMale}
          isAlwaysFemale={isAlwaysFemale}
          daycareInfo={daycareInfo}
          validation={validationReport}
          overrideEnabled={override}
        />

        <HuntAdvancedOptions
          control={control}
          watch={watch}
          setValue={setValue}
          huntFiles={huntFiles}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
        />

        {/* Validation panel */}
        <HuntValidationPanel
          report={validationReport ?? null}
          loading={validationLoading ?? false}
          override={override ?? false}
          onOverrideChange={onOverrideChange ?? (() => {})}
        />

        {/* Start button */}
        <Button
          type="submit"
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-bold shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:shadow-[0_6px_16px_rgba(220,38,38,0.3)] transition-shadow"
          disabled={!watchedGame || !watchedTargetName || !watchedRomPath || (watchedHuntMode === 'egg' && (!daycareInfo?.active || !daycareInfo?.mon1 || !daycareInfo?.mon2)) || !!startDisabled}
        >
          Start Hunt
        </Button>
      </form>
    </div>
  );
}
