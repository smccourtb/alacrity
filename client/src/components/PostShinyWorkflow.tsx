import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface HitInfo {
  instance: string;
  attempts: number;
  details: string;
  stateFile: string;
  isShiny: boolean;
  dvs: { atk: number; def: number; spd: number; spc: number } | null;
  paths: {
    instanceDir: string;
    openDir: string | null;
    savePath: string;
    catchDir: string | null;
    catchSavePath: string | null;
  };
  workflow: {
    opened: boolean;
    saveModified: boolean;
    archived: boolean;
    savedToCatches: boolean;
  };
}

interface HitInfoResponse {
  huntId: number;
  target: string;
  game: string;
  huntMode: string;
  engine: string;
  totalAttempts: number;
  hits: HitInfo[];
}

type StageState = 'done' | 'active' | 'pending';
type CatchMode = 'catch' | 'receive';

function deriveCatchMode(huntMode: string): CatchMode {
  // wild + stationary require the user to catch in mGBA.
  // egg + gift (and future receive-style modes like sos/horde) drop the shiny
  // directly into the party/box.
  if (huntMode === 'wild' || huntMode === 'stationary') return 'catch';
  return 'receive';
}

function StageCard({
  state,
  title,
  description,
  children,
}: {
  state: StageState;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-opacity',
        state === 'done' && 'bg-green-500/5 border-green-500/30',
        state === 'active' && 'bg-amber-500/5 border-amber-500/40',
        state === 'pending' && 'bg-muted/30 border-muted-foreground/10 opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            state === 'done' && 'bg-green-500 text-white',
            state === 'active' && 'bg-amber-500 text-white',
            state === 'pending' && 'border-[1.5px] border-muted-foreground/30 text-muted-foreground/40'
          )}
        >
          {state === 'done' ? '\u2713' : state === 'active' ? '\u25CF' : ''}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div
            className={cn(
              'text-sm font-semibold',
              state === 'done' && 'text-green-600',
              state === 'active' && 'text-amber-700',
              state === 'pending' && 'text-muted-foreground/60'
            )}
          >
            {title}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
          {children && <div className="pt-1">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function HitWorkflow({
  hit,
  huntId,
  target,
  catchMode,
  onUpdate,
}: {
  hit: HitInfo;
  huntId: number;
  target: string;
  catchMode: CatchMode;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [libraryName, setLibraryName] = useState('');
  const [librarySavePath, setLibrarySavePath] = useState<string | null>(null);

  const instNum = parseInt(hit.instance.replace('#', ''));
  const { opened, saveModified, archived, savedToCatches } = hit.workflow;

  // Default library save name — `<Target>_<DVs>_caught`, matching the folder
  // convention the archive bundle uses. Users can edit before submitting.
  const dvStr = hit.dvs
    ? `A${hit.dvs.atk}_D${hit.dvs.def}_Sp${hit.dvs.spd}_Sc${hit.dvs.spc}`
    : '';
  const defaultLibraryName = [target, dvStr, 'caught'].filter(Boolean).join('_');

  // Pre-fill the input the first time we see a completed in-game save.
  useEffect(() => {
    if (saveModified && !libraryName) {
      setLibraryName(defaultLibraryName);
    }
  }, [saveModified, libraryName, defaultLibraryName]);

  const handleOpen = async () => {
    setLoading('open');
    setError(null);
    try {
      await api.hunts.open(huntId, instNum);
      onUpdate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveToLibrary = async () => {
    setLoading('library');
    setError(null);
    try {
      const result = await api.hunts.saveToLibrary(huntId, instNum, libraryName || defaultLibraryName);
      if (result.status === 'success') {
        setSavedToLibrary(true);
        setLibrarySavePath(result.name);
      } else {
        setError(result.message || 'Save failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  // Stage 1 — user completes the manual work in mGBA (catch for wild/stationary,
  // deposit / continue for egg/gift). Done when the user actually saved in-game
  // (saveModified is now a real signal thanks to the /open mtime fix).
  const stage1Done = saveModified;
  const stage1Title =
    catchMode === 'catch'
      ? stage1Done
        ? 'Caught'
        : 'Catch your shiny'
      : stage1Done
      ? 'Received'
      : 'Continue in mGBA';

  const stage1Description =
    catchMode === 'catch'
      ? 'Open in mGBA — the save state drops you right into the encounter. Catch the shiny Pokémon, save in-game, then close mGBA.'
      : 'Open in mGBA — the shiny is already in your party. Deposit it in your PC box (and set up new parents in daycare if this is an egg hunt), save in-game, then close mGBA.';

  const stage1State: StageState = stage1Done ? 'done' : 'active';
  // Stage 2 (Archived) is always done once the server has written the bundle —
  // which happens automatically at hit detection, not gated on any user action.
  const stage2State: StageState = archived ? 'done' : 'active';
  // Stage 3 (Save to Library) is optional. It only becomes actionable once the
  // user has actually saved in-game, because a library save before that would
  // just duplicate the hunt's starting checkpoint. No Skip button — if the user
  // doesn't click, the stage stays "active" and nothing is lost (the archive is
  // already the permanent record).
  const stage3State: StageState = savedToLibrary ? 'done' : stage1Done ? 'active' : 'pending';

  return (
    <div className="space-y-4">
      {/* Hit header with DVs */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="bg-yellow-500 text-black rounded-full px-3 py-0.5 text-xs font-semibold">{hit.instance}</span>
        <span className="text-xs text-muted-foreground">{hit.attempts.toLocaleString()} encounters</span>
      </div>

      {/* DV badges */}
      {hit.dvs && (
        <div className="flex gap-2">
          {(['atk', 'def', 'spd', 'spc'] as const).map(stat => (
            <div
              key={stat}
              className="bg-yellow-500/[0.06] border border-yellow-500/15 rounded-xl px-3 py-1.5 text-center"
            >
              <div className="text-2xs text-muted-foreground uppercase">{stat}</div>
              <div className="text-lg font-extrabold font-mono text-amber-600">{hit.dvs![stat]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stage 1: Continue in mGBA (catch / receive) */}
      <StageCard state={stage1State} title={stage1Title} description={stage1Description}>
        {!stage1Done && (
          <div className="flex items-center gap-2 flex-wrap">
            {!opened ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full px-5 shadow-md shadow-yellow-500/20"
                onClick={handleOpen}
                disabled={loading === 'open'}
              >
                {loading === 'open' ? 'Opening...' : 'Open in mGBA'}
              </Button>
            ) : (
              <>
                <span className="text-xs text-muted-foreground italic">
                  Save in-game and close mGBA, then come back here.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={handleOpen}
                  disabled={loading === 'open'}
                >
                  {loading === 'open' ? 'Opening...' : 'Reopen'}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={onUpdate}>
                  Refresh
                </Button>
              </>
            )}
          </div>
        )}
      </StageCard>

      {/* Stage 2: Archived (automatic, written server-side at hit detection) */}
      <StageCard
        state={stage2State}
        title={stage2State === 'done' ? 'Archived' : 'Archiving...'}
        description="The moment your shiny was found, Alacrity automatically copied your game files into a folder in the archive: your save from just before the encounter, the save state at the exact moment of detection, and a small info file describing the catch. After you catch and save in mGBA, your new save is copied into the same folder. The archive is a complete record of this catch — keep it as a backup, hold onto it as a trophy, or share the folder with a friend so they can load up the shiny themselves."
      >
        {archived && hit.paths.catchDir && (
          <div className="text-2xs text-muted-foreground/80 font-mono truncate" title={hit.paths.catchDir}>
            {hit.paths.catchDir}
          </div>
        )}
      </StageCard>

      {/* Stage 3: Save to Library (optional, user action, no Skip) */}
      <StageCard
        state={stage3State}
        title={
          stage3State === 'done'
            ? 'Saved to Library'
            : stage3State === 'active'
            ? 'Save to Library'
            : 'Save to Library (waiting)'
        }
        description={
          stage3State === 'pending'
            ? 'After you catch and save in mGBA, you\'ll be able to copy that save to your library. The library is where your active playthroughs live — the saves you pick up and keep playing. This step is optional: you can skip it if you just wanted the shiny for the archive and don\'t plan to keep playing from this point.'
            : 'Copy your caught save to your library so your next hunt (or your next play session) can start from here, with the shiny already in your box. The name is pre-filled based on the catch — edit it if you want, then click Save.'
        }
      >
        {stage3State === 'active' && (
          <div className="space-y-2">
            <Input
              value={libraryName}
              onChange={e => setLibraryName(e.target.value)}
              placeholder={defaultLibraryName}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full px-5 shadow-md shadow-violet-500/20"
                onClick={handleSaveToLibrary}
                disabled={loading === 'library'}
              >
                {loading === 'library' ? 'Saving...' : 'Save to Library'}
              </Button>
            </div>
          </div>
        )}
        {stage3State === 'done' && librarySavePath && (
          <div className="text-2xs text-muted-foreground/80 font-mono truncate" title={librarySavePath}>
            {librarySavePath}
          </div>
        )}
      </StageCard>

      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}

export default function PostShinyWorkflow({ huntId }: { huntId: number }) {
  const [hitInfo, setHitInfo] = useState<HitInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHitInfo = useCallback(async () => {
    try {
      const info = await api.hunts.hitInfo(huntId);
      setHitInfo(info);
    } catch {
      // Hunt may not have hits yet
    } finally {
      setLoading(false);
    }
  }, [huntId]);

  useEffect(() => {
    fetchHitInfo();
  }, [fetchHitInfo]);

  if (loading || !hitInfo || hitInfo.hits.length === 0) return null;

  const catchMode = deriveCatchMode(hitInfo.huntMode);

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(234,179,8,0.12)] overflow-hidden">
      {/* Gold header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center border-2 border-white/35">
          <span className="text-base">&#9733;</span>
        </div>
        <span className="font-extrabold text-white text-lg">Shiny {hitInfo.target}!</span>
      </div>
      {/* Content */}
      <div className="p-5 space-y-5">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Found after</div>
          <div className="text-4xl font-black font-mono text-foreground tracking-tight">
            {hitInfo.totalAttempts.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">encounters</div>
        </div>
        {hitInfo.hits.map((hit, i) => (
          <HitWorkflow
            key={i}
            hit={hit}
            huntId={huntId}
            target={hitInfo.target}
            catchMode={catchMode}
            onUpdate={fetchHitInfo}
          />
        ))}
      </div>
    </div>
  );
}
