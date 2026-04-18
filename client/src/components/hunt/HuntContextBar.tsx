// client/src/components/hunt/HuntContextBar.tsx
import { Controller } from 'react-hook-form';
import FilterDropdown from '@/components/FilterDropdown';
import PillToggle from '@/components/PillToggle';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { HuntFormControl } from './types';

interface Props extends HuntFormControl {
  gameConfigs: any[];
  gameConfig: any;
  onGameChange: (game: string) => void;
  onTargetChange: (target: string) => void;
  onModeChange: (mode: string) => void;
  customTarget: boolean;
  setCustomTarget: (v: boolean) => void;
  daycareInfo: any;
}

export default function HuntContextBar({
  control, watch,
  gameConfigs, gameConfig, onGameChange, onTargetChange, onModeChange,
  customTarget, setCustomTarget, daycareInfo,
}: Props) {
  const watchedGame = watch('game');
  const watchedHuntMode = watch('hunt_mode');

  return (
    <div className="bg-card rounded-lg shadow-soft border-l-2 border-l-primary p-3 space-y-3">
      <Controller
        name="game"
        control={control}
        render={({ field }) => (
          <FilterDropdown
            label="Select a game"
            options={gameConfigs.map((g: any) => ({ value: g.game, label: g.game }))}
            selected={field.value ? [field.value] : []}
            onChange={(sel) => onGameChange(sel[0] ?? '')}
            multiSelect={false}
            searchable
          />
        )}
      />

      {watchedGame && (
        <Controller
          name="hunt_mode"
          control={control}
          render={({ field }) => {
            const modes: string[] = gameConfig?.supportedModes ?? [];
            const isSupported = (m: string) => modes.length === 0 || modes.includes(m);
            return (
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
            );
          }}
        />
      )}

      {watchedGame && watchedHuntMode !== 'egg' && (
        <div className="flex items-center gap-2">
          <Controller
            name="target_name"
            control={control}
            render={({ field }) => (
              customTarget ? (
                <Input
                  value={field.value ?? ''}
                  onChange={e => onTargetChange(e.target.value)}
                  placeholder="Custom target name"
                  className="flex-1"
                />
              ) : (
                <FilterDropdown
                  label="Select a target"
                  options={(gameConfig?.targets ?? []).map((t: any) => ({
                    value: t.name,
                    label: `${t.name} (${t.method})`,
                  }))}
                  selected={field.value ? [field.value] : []}
                  onChange={(sel) => onTargetChange(sel[0] ?? '')}
                  multiSelect={false}
                  searchable
                />
              )
            )}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <Switch checked={customTarget} onCheckedChange={setCustomTarget} />
            Custom
          </label>
        </div>
      )}

      {watchedHuntMode === 'egg' && daycareInfo?.offspringName && (
        <div className="text-xs text-muted-foreground">
          Target: <span className="font-semibold capitalize text-foreground">{daycareInfo.offspringName}</span>
          <span className="text-muted-foreground/60"> (from daycare)</span>
        </div>
      )}
    </div>
  );
}
