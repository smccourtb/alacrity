import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '../api/client';
import { Switch } from '@/components/ui/switch';
import HuntPanel from '@/components/HuntPanel';
import HuntForm from '@/components/HuntForm';
import HuntHistoryList from '@/components/HuntHistoryList';
import HuntSetupTabs from '@/components/hunt/HuntSetupTabs';
import HuntPreviewCard from '@/components/hunt/HuntPreviewCard';
import { hasErrors } from '@/components/hunt/validationMapping';
import { InlineEmulatorWarning } from '@/components/warnings/InlineEmulatorWarning';
import { useHuntValidation } from '@/hooks/useHuntValidation';

interface HuntFormValues {
  target_name: string;
  target_species_id: number | null;
  game: string;
  rom_path: string;
  sav_path: string;
  hunt_mode: string;
  walk_dir: string;
  num_instances: number;
  engine: 'core' | 'rng';
  target_shiny: number;
  target_perfect: number;
  target_gender: string;
  min_atk: number;
  min_def: number;
  min_spd: number;
  min_spc: number;
  // RNG / Gen 6-7 fields
  encounter_type: string;
  target_nature: string | undefined;
  target_ability: string | undefined;
  target_ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } | undefined;
  shiny_charm: number;
  guaranteed_ivs: number;
}

const SHINY_ATK_VALUES = [2, 3, 6, 7, 10, 11, 14, 15];
const ALL_DV = Array.from({ length: 16 }, (_, i) => i); // 0-15

// Gender DV threshold from PokeAPI gender_rate
// If Atk DV <= threshold, Pokemon is female
function genderDvThreshold(genderRate: number | undefined): number {
  if (genderRate === undefined) return -2;
  const thresholds: Record<number, number> = {
    [-1]: -2, 0: -1, 1: 1, 2: 3, 4: 7, 6: 11, 7: 13, 8: 16,
  };
  return thresholds[genderRate] ?? -2;
}

function calculateOdds(opts: {
  shiny: boolean;
  perfect: boolean;
  gender: string;
  genderRate: number | undefined;
  huntMode: string;
  minAtk: number;
  minDef: number;
  minSpd: number;
  minSpc: number;
}): { combos: number; total: number; odds: string } {
  // Egg hunts with shiny Ditto: Def locked to 10, Spc = 2 or 10 (3 bits inherited)
  // Only Atk (16 values) and Spd (16 values) and Spc top bit (2 values) are random
  const isEgg = opts.huntMode === 'egg';
  const total = isEgg ? (16 * 1 * 16 * 2) : 65536; // egg: Atk(16) × Def(1) × Spd(16) × Spc(2)
  let validAtk = [...ALL_DV];
  let validDef = isEgg ? [10] : [...ALL_DV];  // Ditto's Def inherited
  let validSpd = [...ALL_DV];
  let validSpc = isEgg ? [2, 10] : [...ALL_DV];  // Only top bit is random, bottom 3 from Ditto

  // Shiny: Atk in {2,3,6,7,10,11,14,15}, Def=10, Spd=10, Spc=10
  if (opts.shiny) {
    validAtk = validAtk.filter(v => SHINY_ATK_VALUES.includes(v));
    validDef = [10];
    validSpd = [10];
    validSpc = [10];
  }

  // Perfect: context-dependent on shiny
  // With shiny: best shiny = Atk 15 (Def/Spd/Spc already locked to 10)
  // Without shiny: true perfect = all 15
  if (opts.perfect) {
    validAtk = validAtk.filter(v => v === 15);
    if (!opts.shiny) {
      validDef = validDef.filter(v => v === 15);
      validSpd = validSpd.filter(v => v === 15);
      validSpc = validSpc.filter(v => v === 15);
    }
  }

  // Gender filter on Atk DV
  const threshold = genderDvThreshold(opts.genderRate);
  if (opts.gender === 'male' && threshold >= 0) {
    validAtk = validAtk.filter(v => v > threshold);
  } else if (opts.gender === 'female') {
    if (threshold < 0) {
      validAtk = []; // impossible
    } else if (threshold <= 15) {
      validAtk = validAtk.filter(v => v <= threshold);
    }
  }

  // Min DVs
  if (opts.minAtk > 0) validAtk = validAtk.filter(v => v >= opts.minAtk);
  if (opts.minDef > 0) validDef = validDef.filter(v => v >= opts.minDef);
  if (opts.minSpd > 0) validSpd = validSpd.filter(v => v >= opts.minSpd);
  if (opts.minSpc > 0) validSpc = validSpc.filter(v => v >= opts.minSpc);

  const combos = validAtk.length * validDef.length * validSpd.length * validSpc.length;

  let odds: string;
  if (combos === 0) odds = 'Impossible';
  else if (combos === total) odds = '1/1';
  else {
    const ratio = total / combos;
    odds = ratio === Math.floor(ratio) ? `1/${ratio.toLocaleString()}` : `1/${ratio.toFixed(1).toLocaleString()}`;
  }

  return { combos, total, odds };
}


export default function HuntDashboard() {
  const [hunts, setHunts] = useState<any[]>([]);
  const [gameConfigs, setGameConfigs] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Multi-hunt state
  const [activeTab, setActiveTab] = useState<'new' | number>('new');
  const [huntStatuses, setHuntStatuses] = useState<Record<number, any>>({});
  const [huntLogs, setHuntLogs] = useState<Record<number, string[]>>({});
  const [rngProgress, setRngProgress] = useState<
    Record<number, { phase: string; currentFrame: number; targetFrame: number; message: string }>
  >({});
  const connectionsRef = useRef<Record<number, { es: EventSource; poll: ReturnType<typeof setInterval> }>>({});

  // Form state (react-hook-form)
  const [customTarget, setCustomTarget] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { control, handleSubmit, setValue, watch, getValues } = useForm<HuntFormValues>({
    defaultValues: {
      target_name: '',
      target_species_id: null,
      game: '',
      rom_path: '',
      sav_path: '',
      hunt_mode: 'gift',
      walk_dir: 'ns',
      num_instances: 16,
      engine: 'core',
      target_shiny: 1,
      target_perfect: 0,
      target_gender: 'any',
      min_atk: 0,
      min_def: 0,
      min_spd: 0,
      min_spc: 0,
      encounter_type: 'stationary',
      target_nature: undefined,
      target_ability: undefined,
      target_ivs: undefined,
      shiny_charm: 0,
      guaranteed_ivs: 0,
    },
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const watchedGame = watch('game');
  const watchedTargetName = watch('target_name');
  const watchedHuntMode = watch('hunt_mode');
  const watchedTargetSpeciesId = watch('target_species_id');
  const watchedSavPath = watch('sav_path');
  const watchedTargetShiny = watch('target_shiny');
  const watchedTargetPerfect = watch('target_perfect');
  const watchedTargetGender = watch('target_gender');
  const watchedMinAtk = watch('min_atk');
  const watchedMinDef = watch('min_def');
  const watchedMinSpd = watch('min_spd');
  const watchedMinSpc = watch('min_spc');

  const gameConfig = gameConfigs.find((g: any) => g.game === watchedGame);
  const activeHunts = hunts.filter(h => h.status === 'running');

  // Gender info for the selected target
  const selectedTargetMeta = gameConfig?.targets.find((t: any) => t.name === watchedTargetName);
  const genderRate = selectedTargetMeta?.gender_rate;
  const isGenderless = genderRate === -1;
  const isAlwaysMale = genderRate === 0;
  const isAlwaysFemale = genderRate === 8;
  const hasGenderChoice = genderRate !== undefined && !isGenderless && !isAlwaysMale && !isAlwaysFemale;

  // Live odds calculation
  const odds = calculateOdds({
    shiny: watchedTargetShiny === 1,
    perfect: watchedTargetPerfect === 1,
    gender: watchedTargetGender,
    genderRate,
    huntMode: watchedHuntMode,
    minAtk: watchedMinAtk,
    minDef: watchedMinDef,
    minSpd: watchedMinSpd,
    minSpc: watchedMinSpc,
  });

  // --- Validation ---

  const [daycareInfo, setDaycareInfo] = useState<any>(null);
  const [override, setOverride] = useState(false);
  const { report, loading: validationLoading } = useHuntValidation({
    game: watchedGame || null,
    sav_path: watchedSavPath || null,
    hunt_mode: watchedHuntMode as 'wild' | 'stationary' | 'gift' | 'egg',
    target_species_id: watchedTargetSpeciesId ?? null,
  });
  const startDisabled = !override && hasErrors(report);

  // --- Form handlers ---

  const handleGameChange = useCallback((game: string, configs = gameConfigs) => {
    const config = configs.find((g: any) => g.game === game);
    if (!config) return;
    const firstTarget = config.targets[0];
    const mode = firstTarget?.defaultMode || 'gift';
    setValue('game', game);
    setValue('rom_path', config.rom?.path || '');
    setValue('sav_path', config.saves[0]?.path || '');
    setValue('target_name', firstTarget?.name || '');
    setValue('target_species_id', firstTarget?.species_id || null);
    setValue('hunt_mode', mode);
    setValue('target_gender', 'any');
    setCustomTarget(false);
  }, [gameConfigs, setValue]);

  const handleTargetChange = (target: string) => {
    if (target === '__custom__') {
      setCustomTarget(true);
      setValue('target_name', '');
      setValue('target_species_id', null);
      setValue('hunt_mode', 'wild');
      setValue('target_gender', 'any');
      return;
    }
    setCustomTarget(false);
    const targetMeta = gameConfig?.targets.find((t: any) => t.name === target);
    const mode = targetMeta?.defaultMode || getValues('hunt_mode');
    setValue('target_name', target);
    setValue('target_species_id', targetMeta?.species_id || null);
    setValue('hunt_mode', mode);
    setValue('target_gender', 'any');
  };

  const handleModeChange = (mode: string) => {
    setValue('hunt_mode', mode);
  };

  // --- Data fetching ---

  useEffect(() => {
    api.hunts.list({ archived: showArchived }).then(setHunts);
  }, [showArchived]);

  useEffect(() => {
    api.hunts.gameConfigs().then(configs => {
      setGameConfigs(configs);

      // Check for pre-fill params from "Start Hunt" CTA
      const paramGame = searchParams.get('game');
      const paramTarget = searchParams.get('target');
      const paramMode = searchParams.get('mode');

      if (paramGame && paramTarget) {
        // Find the game config matching the PokeAPI version name (e.g., "yellow")
        const config = configs.find((c: any) => c.game.toLowerCase() === paramGame);
        if (config) {
          handleGameChange(config.game, configs);
          // After game change sets defaults, override target and mode
          const targetId = parseInt(paramTarget, 10);
          const targetMeta = config.targets.find((t: any) => t.species_id === targetId);
          if (targetMeta) {
            setValue('target_name', targetMeta.name);
            setValue('target_species_id', targetId);
          }
          if (paramMode) {
            setValue('hunt_mode', paramMode);
          }
        }
        // Clear params so they don't re-apply on refresh
        setSearchParams({}, { replace: true });
        // Switch to new hunt tab
        setActiveTab('new');
      } else {
        const first = configs.find((c: any) => c.rom) || configs[0];
        if (first) handleGameChange(first.game, configs);
      }
    });
  }, []);

  // --- Multi-hunt SSE + polling management ---

  useEffect(() => {
    const runningHunts = hunts.filter(h => h.status === 'running');
    const runningIds = new Set(runningHunts.map(h => h.id));

    // Connect new running hunts
    for (const hunt of runningHunts) {
      if (connectionsRef.current[hunt.id]) continue;

      // Status polling
      const fetchStatus = () => {
        api.hunts.status(hunt.id).then(s => {
          setHuntStatuses(prev => ({ ...prev, [hunt.id]: s }));
          setHunts(prev => prev.map(h => {
            if (h.id !== hunt.id) return h;
            const next = { ...h, total_attempts: s.totalAttempts };
            if (s.hits?.length > 0) {
              next.status = 'hit';
              next.hit_details = JSON.stringify(s.hits);
            }
            return next;
          }));
        });
      };
      fetchStatus();
      const poll = setInterval(fetchStatus, 2000);

      // SSE log stream
      const es = api.hunts.stream(hunt.id);
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.type === "rng_progress") {
          setRngProgress((prev) => ({
            ...prev,
            [hunt.id]: {
              phase: data.phase,
              currentFrame: data.currentFrame,
              targetFrame: data.targetFrame,
              message: data.message,
            },
          }));
          // Also add to log stream
          setHuntLogs((prev) => ({
            ...prev,
            [hunt.id]: [...(prev[hunt.id] || []).slice(-499), data.message],
          }));
          return;
        }

        setHuntLogs(prev => ({
          ...prev,
          [hunt.id]: [...(prev[hunt.id] || []), data.message].slice(-500),
        }));
      };

      connectionsRef.current[hunt.id] = { es, poll };
    }

    // Disconnect hunts that are no longer running
    for (const idStr of Object.keys(connectionsRef.current)) {
      const id = Number(idStr);
      if (!runningIds.has(id)) {
        connectionsRef.current[id].es.close();
        clearInterval(connectionsRef.current[id].poll);
        delete connectionsRef.current[id];
      }
    }
  }, [hunts]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      for (const conn of Object.values(connectionsRef.current)) {
        conn.es.close();
        clearInterval(conn.poll);
      }
      connectionsRef.current = {};
    };
  }, []);


  // --- Actions ---

  const startHunt = async (data: HuntFormValues) => {
    const hunt = await api.hunts.create(data);
    setHunts(prev => [hunt, ...prev]);
    setActiveTab(hunt.id);
  };

  const stopHunt = async (id: number) => {
    const updated = await api.hunts.stop(id);
    setHunts(prev => prev.map(h => h.id === id ? updated : h));
  };

  const resumeHunt = async (id: number) => {
    const updated = await api.hunts.resume(id);
    setHunts(prev => prev.map(h => h.id === id ? updated : h));
    setActiveTab(id);
  };

  const archiveHunt = async (id: number) => {
    await api.hunts.archive(id);
    setHunts(prev => prev.filter(h => h.id !== id));
  };

  const unarchiveHunt = async (id: number) => {
    await api.hunts.unarchive(id);
    setHunts(prev => prev.map(h => h.id === id ? { ...h, is_archived: 0 } : h));
  };

  // --- Return ---

  return (
    <div className="-m-6 min-h-screen bg-surface-raised p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-extrabold mb-4 text-foreground">Shiny Hunt</h2>

        {/* Two-column layout: form left, content right */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Left: Form (sticky on desktop) */}
          <div className="lg:self-start lg:sticky lg:top-6">
            <InlineEmulatorWarning
              emulatorId="mgba"
              coreAbiLockMessage="This version of Alacrity's hunt engine requires a specific version of mGBA. The currently installed version may produce incorrect results."
            />
            <HuntForm
              control={control}
              watch={watch}
              setValue={setValue}
              handleSubmit={handleSubmit}
              onSubmit={startHunt}
              gameConfigs={gameConfigs}
              gameConfig={gameConfig}
              onGameChange={handleGameChange}
              onTargetChange={handleTargetChange}
              onModeChange={handleModeChange}
              customTarget={customTarget}
              setCustomTarget={setCustomTarget}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              odds={odds}
              hasGenderChoice={hasGenderChoice}
              isGenderless={isGenderless}
              isAlwaysMale={isAlwaysMale}
              isAlwaysFemale={isAlwaysFemale}
              validationReport={report}
              onDaycareInfo={setDaycareInfo}
            />
          </div>

          {/* Right: Setup preview + active hunts via tabs */}
          <div>
            <HuntSetupTabs
              activeCount={activeHunts.length}
              preview={
                <HuntPreviewCard
                  targetName={watch('target_name') ?? null}
                  targetSpeciesId={watchedTargetSpeciesId ?? null}
                  targetLocation={null}
                  isShiny={watch('target_shiny') === 1}
                  isPerfect={watch('target_perfect') === 1}
                  odds={odds}
                  saveLabel={watch('sav_path')?.split('/').pop() ?? null}
                  romLabel={watch('rom_path')?.split('/').pop() ?? null}
                  mode={watch('hunt_mode')}
                  instances={watch('num_instances') ?? 16}
                  report={report}
                  loading={validationLoading}
                  override={override}
                  onOverrideChange={setOverride}
                  onStart={handleSubmit(startHunt)}
                  startDisabled={startDisabled}
                />
              }
              running={
                <>
                  {activeHunts.length === 0 && (
                    <div className="bg-card shadow-soft rounded-xl p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-raised flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                      </div>
                      <div className="text-sm font-semibold text-muted-foreground">No active hunts</div>
                      <div className="text-[11px] text-muted-foreground/60 mt-1">Configure a hunt in the Setup tab and press Start.</div>
                    </div>
                  )}

                  {/* Active hunt section */}
                  {activeHunts.length > 0 && (
                    <>
                      {/* Pill tabs when multiple hunts */}
                      {activeHunts.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                          {activeHunts.map(h => {
                            const status = huntStatuses[h.id];
                            const isHit = status?.hits?.length > 0;
                            const isActive = activeTab === h.id;
                            return (
                              <button
                                key={h.id}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-white text-muted-foreground hover:bg-surface-sunken shadow-soft-sm'
                                }`}
                                onClick={() => setActiveTab(h.id)}
                              >
                                {isHit ? (
                                  <span className="text-yellow-400">&#9733;</span>
                                ) : (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)] animate-pulse" />
                                )}
                                {h.target_name}
                                <span className="text-xs opacity-60">({h.game})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Hunt panel(s) */}
                      {activeHunts.map(h => (activeHunts.length === 1 || activeTab === h.id) ? (
                        <HuntPanel
                          key={h.id}
                          hunt={h}
                          status={huntStatuses[h.id]}
                          logs={huntLogs[h.id] || []}
                          onStop={stopHunt}
                          rngProgress={rngProgress[h.id]}
                        />
                      ) : null)}
                    </>
                  )}
                </>
              }
            />
          </div>
        </div>

        {/* Hunt History — full width below the grid */}
        <div className="flex items-center justify-between mb-3 mt-6">
          <h4 className="font-extrabold text-lg">Hunt History</h4>
          <label className="flex items-center gap-2 text-xs text-muted-foreground/50 cursor-pointer">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
              size="sm"
            />
            Show archived
          </label>
        </div>
        <HuntHistoryList
          hunts={hunts.filter(h => h.status !== 'running')}
          onResume={resumeHunt}
          onArchive={archiveHunt}
          onUnarchive={unarchiveHunt}
        />
      </div>
    </div>
  );
}
