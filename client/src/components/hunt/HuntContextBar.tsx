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

function ContextLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold leading-none mb-1">
      {children}
    </span>
  );
}

function Sep() {
  return <span className="text-border/80 text-lg leading-none select-none">│</span>;
}

export default function HuntContextBar({
  control, watch,
  gameConfigs, gameConfig, onGameChange, onTargetChange, onModeChange,
  customTarget, setCustomTarget, daycareInfo,
}: Props) {
  const watchedGame = watch('game');
  const watchedHuntMode = watch('hunt_mode');

  return (
    <div className="bg-card rounded-lg shadow-soft border-l-[3px] border-l-primary px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
      {/* Game */}
      <div className="flex flex-col">
        <ContextLabel>Game</ContextLabel>
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
      </div>

      {watchedGame && (
        <>
          <Sep />

          {/* Mode */}
          <div className="flex flex-col">
            <ContextLabel>Mode</ContextLabel>
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
                      { value: 'stationary', label: 'Static', disabled: !isSupported('stationary') },
                      { value: 'wild', label: 'Wild', disabled: !isSupported('wild') },
                      { value: 'egg', label: 'Egg', disabled: !isSupported('egg') },
                    ]}
                    value={field.value}
                    onChange={(v) => onModeChange(v as string)}
                  />
                );
              }}
            />
          </div>

          <Sep />

          {/* Target */}
          <div className="flex flex-col min-w-0">
            <ContextLabel>Target</ContextLabel>
            {watchedHuntMode === 'egg' ? (
              <span className="text-sm font-semibold capitalize">
                {daycareInfo?.offspringName ?? '—'}
                {daycareInfo?.offspringName && (
                  <span className="text-2xs font-normal text-muted-foreground/60 ml-1">from daycare</span>
                )}
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <Controller
                  name="target_name"
                  control={control}
                  render={({ field }) => (
                    customTarget ? (
                      <Input
                        value={field.value ?? ''}
                        onChange={e => onTargetChange(e.target.value)}
                        placeholder="Custom target"
                        className="h-8 w-40 text-xs"
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
                <label className="flex items-center gap-1 text-2xs text-muted-foreground/70 whitespace-nowrap cursor-pointer">
                  <Switch checked={customTarget} onCheckedChange={setCustomTarget} />
                  Custom
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
