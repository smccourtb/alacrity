import { Controller } from 'react-hook-form';
import { Gamepad2Icon } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import PillToggle from '@/components/PillToggle';
import type { HuntFormControl } from './types';
import type { ValidationReport } from '@/hooks/useHuntValidation';
import { is3DSGame, ENCOUNTER_TYPES, HUNT_MODE_DESCRIPTIONS } from './constants';

interface HuntGameSelectorProps extends HuntFormControl {
  gameConfigs: any[];
  gameConfig: any;
  onGameChange: (game: string) => void;
  onTargetChange: (target: string) => void;
  onModeChange: (mode: string) => void;
  customTarget: boolean;
  setCustomTarget: (v: boolean) => void;
  daycareInfo: any;
  validation?: ValidationReport | null;
  overrideEnabled?: boolean;
}

export default function HuntGameSelector({
  control, watch, setValue,
  gameConfigs, gameConfig, onGameChange, onTargetChange, onModeChange,
  customTarget, setCustomTarget, daycareInfo,
  validation, overrideEnabled,
}: HuntGameSelectorProps) {
  const watchedGame = watch('game');
  const watchedEngine = watch('engine');
  const watchedHuntMode = watch('hunt_mode');
  const isThisA3DSGame = is3DSGame(watchedGame);

  return (
    <>
      {/* Game + Target */}
      <div className="flex flex-wrap gap-2">
        <Controller
          name="game"
          control={control}
          render={({ field }) => (
            <FilterDropdown
              label="Select a game"
              options={gameConfigs.map((g: any) => {
                const disabled = g.supported === false || !g.rom;
                // Strip the "Pokemon " prefix so labels match the Pokedex picker
                const displayLabel = g.game.replace(/^Pokemon\s+/, '');
                return {
                  value: g.game,
                  label: displayLabel,
                  group: `Gen ${g.gen}`,
                  icon: <Gamepad2Icon className="w-3.5 h-3.5 text-muted-foreground" />,
                  disabled,
                };
              })}
              selected={field.value ? [field.value] : []}
              onChange={(sel) => {
                const v = sel[0] ?? '';
                if (v) onGameChange(v);
              }}
              multiSelect={false}
              searchable
            />
          )}
        />
        {watchedHuntMode === 'egg' ? (
          <div className="flex-1 min-w-[140px]">
            <Controller
              name="target_name"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Select a save to detect..." disabled={!!daycareInfo?.offspringName} className="disabled:opacity-70" />
              )}
            />
            {!daycareInfo?.offspringName && (
              <div className="text-2xs text-muted-foreground/40 mt-1">Auto-detected from daycare parents</div>
            )}
          </div>
        ) : customTarget ? (
          <div className="flex gap-1.5 flex-1 min-w-[140px]">
            <Controller
              name="target_name"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Pokemon name..." autoFocus />
              )}
            />
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => {
              setCustomTarget(false);
              const first = gameConfig?.targets[0];
              if (first) onTargetChange(first.name);
            }}>Back</Button>
          </div>
        ) : (
          <Controller
            name="target_name"
            control={control}
            render={({ field }) => {
              // Per-option disabling: if validation has a game_species or mode_species
              // error and override is not active, disable the currently-selected target option.
              const speciesErrorCheck = !overrideEnabled && validation && !validation.ok
                ? validation.checks.find(c =>
                    (c.id === 'game_species' || c.id === 'mode_species') && c.severity === 'error'
                  )
                : null;

              return (
                <FilterDropdown
                  label="Select target..."
                  options={[
                    ...(gameConfig?.targets ?? []).map((t: any) => {
                      const isSelected = t.name === field.value;
                      const isDisabled = isSelected && !!speciesErrorCheck;
                      return {
                        value: t.name,
                        label: `${t.name} (${t.method})`,
                        disabled: isDisabled,
                        tooltip: isDisabled ? speciesErrorCheck!.message : undefined,
                      };
                    }),
                    { value: '__custom__', label: 'Custom target...' },
                  ]}
                  selected={field.value ? [field.value] : []}
                  onChange={(sel) => {
                    const v = sel[0] ?? '';
                    if (v) onTargetChange(v);
                  }}
                  multiSelect={false}
                  searchable
                />
              );
            }}
          />
        )}
      </div>

      {/* Gen 1/2: Instances + Hunt Mode. The engine was historically selectable
          between the core C binaries and a Qt/Lua path, but Qt/Lua was dropped
          during the Tauri migration — the C binaries cover every hunt mode
          (gift/stationary/wild/egg) and work headlessly across platforms. */}
      {!isThisA3DSGame && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FormField label="Instances" className="w-20">
              <Controller
                name="num_instances"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    max={128}
                    value={field.value}
                    onChange={e => field.onChange(Number(e.target.value))}
                    className="font-semibold"
                  />
                )}
              />
            </FormField>
          </div>

          <Controller
            name="hunt_mode"
            control={control}
            render={({ field }) => {
              const modes: string[] = gameConfig?.supportedModes ?? [];
              const isSupported = (m: string) => modes.length === 0 || modes.includes(m);
              return (
                <>
                  <PillToggle
                    options={[
                      { value: 'gift', label: 'Gift', disabled: !isSupported('gift') },
                      { value: 'stationary', label: 'Stationary', disabled: !isSupported('stationary') },
                      { value: 'wild', label: 'Wild', disabled: !isSupported('wild') },
                      { value: 'egg', label: 'Egg', disabled: !isSupported('egg') },
                    ]}
                    value={field.value}
                    onChange={(v) => onModeChange(v as string)}
                  />
                  {field.value in HUNT_MODE_DESCRIPTIONS && (
                    <div className="text-2xs text-muted-foreground/40 mt-1">
                      {HUNT_MODE_DESCRIPTIONS[field.value as keyof typeof HUNT_MODE_DESCRIPTIONS]}
                    </div>
                  )}
                </>
              );
            }}
          />

          {/* Walk Direction (wild mode only) */}
          {watchedHuntMode === 'wild' && (
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
        </>
      )}

      {/* Gen 6/7: Hidden engine field + encounter type */}
      {isThisA3DSGame && (
        <>
          <Controller
            name="engine"
            control={control}
            render={({ field }) => {
              if (field.value !== 'rng') field.onChange('rng');
              return <input type="hidden" value="rng" />;
            }}
          />

          <Controller
            name="encounter_type"
            control={control}
            render={({ field }) => (
              <FilterDropdown
                label="Encounter type..."
                options={(ENCOUNTER_TYPES[watchedGame] ?? []).map(opt => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                selected={field.value ? [field.value] : []}
                onChange={(sel) => field.onChange(sel[0] ?? '')}
                multiSelect={false}
              />
            )}
          />
        </>
      )}
    </>
  );
}
