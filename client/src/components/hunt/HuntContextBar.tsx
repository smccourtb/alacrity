// client/src/components/hunt/HuntContextBar.tsx
import { Controller } from 'react-hook-form';
import FilterDropdown from '@/components/FilterDropdown';
import GamePicker from '@/components/guide/GamePicker';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { HuntFormControl } from './types';
import { MiniPills } from './SectionLayout';
import { HUNT_MODE_DESCRIPTIONS } from './constants';

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

  const modeDescription = watchedHuntMode && HUNT_MODE_DESCRIPTIONS[watchedHuntMode as keyof typeof HUNT_MODE_DESCRIPTIONS];

  return (
    <div className="bg-card rounded-[14px] shadow-soft border-l-[3px] border-l-primary overflow-hidden mb-3">
      <div className="px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
      {/* Game — shared GamePicker (Gen-grouped, colored dots, searchable).
          GamePicker uses lowercase keys; hunts API uses capitalized keys.
          Normalize at the boundary so downstream code is unchanged. */}
      <div className="flex flex-col">
        <ContextLabel>Game</ContextLabel>
        <Controller
          name="game"
          control={control}
          render={({ field }) => {
            const lowerToConfig: Record<string, string> = Object.fromEntries(
              gameConfigs.map((g: any) => [String(g.game).toLowerCase(), g.game])
            );
            return (
              <GamePicker
                value={field.value ? String(field.value).toLowerCase() : ''}
                onChange={(g) => onGameChange(lowerToConfig[g] ?? g)}
              />
            );
          }}
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
                  <MiniPills
                    value={field.value}
                    onChange={(v) => onModeChange(v as string)}
                    options={[
                      { value: 'wild', label: 'Wild', disabled: !isSupported('wild') },
                      { value: 'egg', label: 'Egg', disabled: !isSupported('egg') },
                      { value: 'stationary', label: 'Stationary', disabled: !isSupported('stationary') },
                      { value: 'gift', label: 'Gift', disabled: !isSupported('gift') },
                      { value: 'fishing', label: 'Fishing' },
                    ]}
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
                        options={(gameConfig?.targets ?? [])
                          .filter((t: any) => {
                            if (!watchedHuntMode) return true;
                            if (Array.isArray(t.supportedModes)) return t.supportedModes.includes(watchedHuntMode);
                            return t.defaultMode === watchedHuntMode;
                          })
                          .map((t: any) => ({
                            value: t.name,
                            label: t.name,
                            icon: t.sprite_url
                              ? <img src={t.sprite_url} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
                              : null,
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

      {modeDescription && (
        <div className="px-3.5 py-2 border-t border-border/60 bg-muted/40">
          <div className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold mb-0.5">
            {watchedHuntMode === 'wild' ? 'Wild script' :
             watchedHuntMode === 'stationary' ? 'Stationary script' :
             watchedHuntMode === 'gift' ? 'Gift script' :
             watchedHuntMode === 'fishing' ? 'Fishing script' :
             'Egg script'}
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">{modeDescription}</div>
        </div>
      )}
    </div>
  );
}
