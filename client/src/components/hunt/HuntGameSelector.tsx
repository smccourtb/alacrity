import { Controller } from 'react-hook-form';
import FilterDropdown from '@/components/FilterDropdown';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import PillToggle from '@/components/PillToggle';
import type { HuntFormControl } from './types';
import { is3DSGame, ENCOUNTER_TYPES } from './constants';

interface HuntGameSelectorProps extends HuntFormControl {
  gameConfigs: any[];
  gameConfig: any;
  onGameChange: (game: string) => void;
  onTargetChange: (target: string) => void;
  onModeChange: (mode: string) => void;
  customTarget: boolean;
  setCustomTarget: (v: boolean) => void;
  daycareInfo: any;
}

export default function HuntGameSelector({
  control, watch, setValue,
  gameConfigs, gameConfig, onGameChange, onTargetChange, onModeChange,
  customTarget, setCustomTarget, daycareInfo,
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
              label="Select game..."
              options={gameConfigs.map((g: any) => ({
                value: g.game,
                label: `${g.game}${g.gen === 1 ? ' (Gen 1)' : g.gen === 2 ? ' (Gen 2)' : ''}${!g.rom ? ' \u2014 no ROM' : ''}`,
              }))}
              selected={field.value ? [field.value] : []}
              onChange={(sel) => {
                const v = sel[0] ?? '';
                if (v) onGameChange(v);
              }}
              multiSelect={false}
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
            render={({ field }) => (
              <FilterDropdown
                label="Select target..."
                options={[
                  ...(gameConfig?.targets ?? []).map((t: any) => ({
                    value: t.name,
                    label: `${t.name} (${t.method})`,
                  })),
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
            )}
          />
        )}
      </div>

      {/* Gen 1/2: Engine + Instances + Hunt Mode */}
      {!isThisA3DSGame && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Controller
              name="engine"
              control={control}
              render={({ field }) => (
                <PillToggle
                  options={[
                    { value: 'core', label: 'Core' },
                    { value: 'qt', label: 'Qt/Lua' },
                  ]}
                  value={field.value}
                  onChange={(v) => {
                    const engine = v as 'core' | 'qt';
                    setValue('engine', engine);
                    setValue('num_instances', engine === 'core' ? 16 : 30);
                  }}
                />
              )}
            />
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
            render={({ field }) => (
              <PillToggle
                options={[
                  { value: 'gift', label: 'Gift' },
                  { value: 'battle', label: 'Battle' },
                  { value: 'wild', label: 'Wild' },
                  { value: 'egg', label: 'Egg' },
                ]}
                value={field.value}
                onChange={(v) => onModeChange(v as string)}
              />
            )}
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
