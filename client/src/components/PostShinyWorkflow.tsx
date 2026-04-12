import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    catchSavePath: string | null;
  };
  workflow: {
    opened: boolean;
    saveModified: boolean;
    savedToCatches: boolean;
  };
}

interface HitInfoResponse {
  huntId: number;
  target: string;
  game: string;
  totalAttempts: number;
  hits: HitInfo[];
}

function WorkflowStep({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
        done ? 'bg-green-500 text-white' :
        active ? 'bg-yellow-500 text-white' :
        'border-[1.5px] border-muted-foreground/20 text-muted-foreground/40'
      )}>
        {done ? '\u2713' : number}
      </div>
      <span className={cn(
        'text-xs font-medium',
        done ? 'text-green-500' :
        active ? 'text-amber-600' :
        'text-muted-foreground/40'
      )}>{label}</span>
    </div>
  );
}

function HitWorkflow({ hit, huntId, target, game, onUpdate }: { hit: HitInfo; huntId: number; target: string; game: string; onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [libraryName, setLibraryName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [librarySavePath, setLibrarySavePath] = useState<string | null>(null);
  const instNum = parseInt(hit.instance.replace('#', ''));

  const { opened, saveModified, savedToCatches } = hit.workflow;

  // Determine current step (0-indexed): Open(0) → Catch(1) → Archive(2) → Save Copy(3) → 3DS(4)
  const currentStep = savedToLibrary ? 4 : savedToCatches ? 3 : saveModified ? 2 : opened ? 1 : 0;

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

  const handleSaveCatch = async () => {
    setLoading('save');
    setError(null);
    try {
      const result = await api.hunts.saveCatch(huntId, instNum);
      if (result.status === 'success') onUpdate();
      else setError(result.message || 'Save failed');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!showNameInput) {
      setShowNameInput(true);
      return;
    }
    setLoading('library');
    setError(null);
    try {
      const result = await api.hunts.saveToLibrary(huntId, instNum, libraryName || undefined);
      if (result.status === 'success') {
        setSavedToLibrary(true);
        setLibrarySavePath(result.name);
        setShowNameInput(false);
      } else {
        setError(result.message || 'Save failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handlePush = async () => {
    setLoading('push');
    setError(null);
    try {
      const result = await api.hunts.pushTo3DS(huntId, instNum);
      if (result.status === 'success') {
        alert(`Pushed to 3DS: ${result.backupName}`);
      } else {
        setError(result.message || 'Push failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const defaultLibraryName = `egg-hunt-${target.toLowerCase()}`;

  return (
    <div className="space-y-4">
      {/* Hit header with DVs */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className="bg-yellow-500 text-black rounded-full px-3">{hit.instance}</Badge>
        <span className="text-xs text-muted-foreground">{hit.attempts.toLocaleString()} encounters</span>
      </div>

      {/* DV badges */}
      {hit.dvs && (
        <div className="flex gap-2">
          {(['atk', 'def', 'spd', 'spc'] as const).map(stat => (
            <div key={stat} className="bg-yellow-500/[0.06] border border-yellow-500/15 rounded-xl px-3 py-1.5 text-center">
              <div className="text-2xs text-muted-foreground uppercase">{stat}</div>
              <div className="text-lg font-extrabold font-mono text-amber-600">{hit.dvs![stat]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Workflow steps */}
      <div className="flex gap-3 items-center flex-wrap">
        <WorkflowStep number={1} label="Open" active={currentStep === 0} done={currentStep > 0} />
        <div className="h-px w-5 bg-muted-foreground/15" />
        <WorkflowStep number={2} label="Catch & Save" active={currentStep === 1} done={currentStep > 1} />
        <div className="h-px w-5 bg-muted-foreground/15" />
        <WorkflowStep number={3} label="Archive" active={currentStep === 2} done={currentStep > 2} />
        <div className="h-px w-5 bg-muted-foreground/15" />
        <WorkflowStep number={4} label="Save Copy" active={currentStep === 3} done={currentStep > 3} />
        <div className="h-px w-5 bg-muted-foreground/15" />
        <WorkflowStep number={5} label="3DS" active={currentStep === 4} done={false} />
      </div>

      {/* Action area */}
      <div className="space-y-3">
        {currentStep === 0 && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full px-5 shadow-md shadow-yellow-500/20 hover:shadow-yellow-500/30"
            onClick={handleOpen}
            disabled={loading === 'open'}
          >
            {loading === 'open' ? 'Opening...' : 'Open in mGBA'}
          </Button>
        )}
        {currentStep === 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Catch the shiny, save in-game, then close mGBA.</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={onUpdate}>Refresh</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={handleOpen} disabled={loading === 'open'}>Reopen</Button>
          </div>
        )}
        {currentStep === 2 && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-5 shadow-md shadow-green-500/20"
            onClick={handleSaveCatch}
            disabled={loading === 'save'}
          >
            {loading === 'save' ? 'Saving...' : 'Archive Catch'}
          </Button>
        )}
        {currentStep === 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-500 border-green-500 rounded-full">Catch Archived</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Save a copy to the library for your next hunt? (Reopen mGBA first to deposit the shiny and set up new parents.)
            </div>
            {showNameInput && (
              <Input
                value={libraryName}
                onChange={e => setLibraryName(e.target.value)}
                placeholder={defaultLibraryName}
                autoFocus
              />
            )}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full px-5 shadow-md shadow-violet-500/20"
                onClick={handleSaveToLibrary}
                disabled={loading === 'library'}
              >
                {loading === 'library' ? 'Saving...' : showNameInput ? 'Confirm' : 'Save to Library'}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={handleOpen} disabled={loading === 'open'}>
                {loading === 'open' ? 'Opening...' : 'Reopen mGBA'}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setSavedToLibrary(true)}>
                Skip
              </Button>
            </div>
          </div>
        )}
        {currentStep === 4 && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-500 border-green-500 rounded-full">Saved</Badge>
            {librarySavePath && (
              <span className="text-xs text-muted-foreground font-mono">{librarySavePath}</span>
            )}
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-5 shadow-md shadow-blue-500/20"
              onClick={handlePush}
              disabled={loading === 'push'}
            >
              {loading === 'push' ? 'Pushing...' : 'Push to 3DS'}
            </Button>
          </div>
        )}
      </div>

      {hit.paths.catchSavePath && (
        <div className="text-xs text-muted-foreground font-mono truncate">{hit.paths.catchSavePath}</div>
      )}
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

  useEffect(() => { fetchHitInfo(); }, [fetchHitInfo]);

  if (loading || !hitInfo || hitInfo.hits.length === 0) return null;

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
          <div className="text-4xl font-black font-mono text-foreground tracking-tight">{hitInfo.totalAttempts.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">encounters</div>
        </div>
        {hitInfo.hits.map((hit, i) => (
          <HitWorkflow key={i} hit={hit} huntId={huntId} target={hitInfo.target} game={hitInfo.game} onUpdate={fetchHitInfo} />
        ))}
      </div>
    </div>
  );
}
