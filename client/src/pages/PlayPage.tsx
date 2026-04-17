import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { NodeDetail } from '@/components/timeline/NodeDetail';
import { GroupedView } from '@/components/timeline/GroupedView';
import type { CheckpointNode, Playthrough } from '@/components/timeline/types';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlayHeader } from '@/components/play/PlayHeader';
import { SessionBar, type ActiveSession } from '@/components/play/SessionBar';
import TradeSetup from '@/components/launcher/TradeSetup';
import WebEmulator from '@/components/launcher/WebEmulator';
import type { DiscoveredSave } from '@/lib/game-constants';
import { getSystemForGame, normalizeGameName } from '@/lib/game-constants';
import { InlineEmulatorWarning } from '@/components/warnings/InlineEmulatorWarning';

const LAST_GAME_KEY = 'alacrity.playPage.lastGame';
const LAST_PLAYTHROUGH_KEY = 'alacrity.playPage.lastPlaythroughId';

function getEmulatorIdForGeneration(gen: number): string | null {
  if (gen <= 3) return 'mgba';
  if (gen <= 5) return 'melonds';
  if (gen <= 7) return 'azahar';
  return null;
}

/** Flatten a checkpoint tree into a flat list */
function flattenTree(roots: CheckpointNode[]): CheckpointNode[] {
  const out: CheckpointNode[] = [];
  function walk(node: CheckpointNode) {
    out.push(node);
    for (const child of node.children) walk(child);
  }
  for (const root of roots) walk(root);
  return out;
}

export default function PlayPage() {
  // --- Save state ---
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([]);
  const [selectedPlaythrough, setSelectedPlaythrough] = useState<Playthrough | null>(null);
  const [treeRoots, setTreeRoots] = useState<CheckpointNode[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightSaveId, setHighlightSaveId] = useState<number | null>(null);
  const [pendingSaveFileId, setPendingSaveFileId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Game selector state ---
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // --- Launch state ---
  const [saves, setSaves] = useState<DiscoveredSave[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [availableGames, setAvailableGames] = useState<{ game: string; system: string }[]>([]);
  const [isLocal, setIsLocal] = useState(false);

  // --- Dialog state ---
  const [tradeSave, setTradeSave] = useState<DiscoveredSave | null>(null);
  const [webPlaySave, setWebPlaySave] = useState<{ saveId: number; game: string; label: string } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [webSaveData, setWebSaveData] = useState<{ saveId: number; game: string; label: string; data: ArrayBuffer } | null>(null);
  const [webSaveNewName, setWebSaveNewName] = useState('');
  const [webSaveShowName, setWebSaveShowName] = useState(false);
  const [webSaveResolving, setWebSaveResolving] = useState(false);

  const allNodes = useMemo(() => flattenTree(treeRoots), [treeRoots]);

  // --- Responsive ---
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // --- Derive all games from playthroughs + available ROMs ---
  const allGames = [...new Set([
    ...playthroughs.map(p => normalizeGameName(p.game)),
    ...availableGames.map(g => normalizeGameName(g.game)),
  ])];

  // Filter playthroughs by selected game
  const gamePlaythroughs = selectedGame
    ? playthroughs.filter(p => normalizeGameName(p.game) === selectedGame)
    : [];

  // --- Load launcher data ---
  const loadLauncherData = useCallback(async () => {
    try {
      const [savesData, sessionsData, gamesData] = await Promise.all([
        api.saves.list({ launchable: 'true' }),
        api.launcher.sessions(),
        api.stream.games(),
      ]);
      setSaves(savesData);
      setSessions(sessionsData);
      setAvailableGames(gamesData);
      try {
        const clientInfo = await api.clientInfo();
        setIsLocal(clientInfo.isLocal);
      } catch {
        // Fall back to stream mode if endpoint unavailable
      }
    } catch (err) {
      console.error('Failed to load launcher data:', err);
    }
  }, []);

  // --- Initial load ---
  useEffect(() => {
    Promise.all([
      api.timeline.playthroughs(),
      loadLauncherData(),
    ]).then(([data]) => {
      setPlaythroughs(data);
    })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadLauncherData]);

  // --- Auto-select game when playthroughs/games load ---
  useEffect(() => {
    if (selectedGame) return;
    if (allGames.length === 0) return;
    const stored = localStorage.getItem(LAST_GAME_KEY);
    if (stored && allGames.includes(stored)) {
      setSelectedGame(stored);
      return;
    }
    const firstPtGame = playthroughs.length > 0 ? playthroughs[0].game : null;
    setSelectedGame(firstPtGame ? normalizeGameName(firstPtGame) : allGames[0]);
  }, [playthroughs, allGames, selectedGame]);

  // --- Auto-select playthrough when game changes ---
  useEffect(() => {
    if (!selectedGame) return;
    const matching = playthroughs.filter(p => normalizeGameName(p.game) === selectedGame);
    if (matching.length === 0) {
      setSelectedPlaythrough(null);
      setTreeRoots([]);
      return;
    }
    if (selectedPlaythrough && normalizeGameName(selectedPlaythrough.game) === selectedGame) return;
    const storedId = Number(localStorage.getItem(LAST_PLAYTHROUGH_KEY));
    const storedMatch = storedId ? matching.find(p => p.id === storedId) : null;
    setSelectedPlaythrough(storedMatch ?? matching[0]);
  }, [selectedGame, playthroughs]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Persist selections ---
  useEffect(() => {
    if (selectedGame) localStorage.setItem(LAST_GAME_KEY, selectedGame);
  }, [selectedGame]);
  useEffect(() => {
    if (selectedPlaythrough) localStorage.setItem(LAST_PLAYTHROUGH_KEY, String(selectedPlaythrough.id));
  }, [selectedPlaythrough]);

  // --- Fetch saves when playthrough changes ---
  useEffect(() => {
    if (!selectedPlaythrough) return;
    api.timeline.tree(selectedPlaythrough.id).then((tree) => {
      const roots: CheckpointNode[] = Array.isArray(tree) ? tree : (tree?.roots ?? []);
      setTreeRoots(roots);
      setSelectedNodeId(null);
    }).catch(console.error);
  }, [selectedPlaythrough]);

  // Deep-link: read URL params and select the matching save
  useEffect(() => {
    const rawSave = searchParams.get('save');
    if (!rawSave) return;
    const saveFileId = Number(rawSave);
    if (!Number.isFinite(saveFileId) || saveFileId <= 0) {
      setSearchParams({}, { replace: true });
      return;
    }

    const rawGame = searchParams.get('game');
    if (rawGame) setSelectedGame(normalizeGameName(rawGame));

    const rawPt = searchParams.get('pt');
    if (rawPt) {
      const ptId = Number(rawPt);
      if (Number.isFinite(ptId) && ptId > 0) {
        const found = playthroughs.find((p) => p.id === ptId);
        if (found) setSelectedPlaythrough(found);
      }
    }

    setPendingSaveFileId(saveFileId);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Once saves load, find and highlight the deep-linked save
  useEffect(() => {
    if (pendingSaveFileId == null) return;
    if (treeRoots.length === 0) return;
    const match = allNodes.find((n) => n.save_file_id === pendingSaveFileId);
    if (!match) return;
    setSelectedNodeId(match.id);
    setDetailNodeId(match.id);
    setHighlightSaveId(pendingSaveFileId);
    setPendingSaveFileId(null);
  }, [pendingSaveFileId, treeRoots, allNodes]);

  // --- Clear highlight after pulse animation ---
  useEffect(() => {
    if (highlightSaveId == null) return;
    const timer = setTimeout(() => setHighlightSaveId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightSaveId]);

  // --- Poll sessions ---
  useEffect(() => {
    const poll = setInterval(() => {
      api.launcher.sessions().then(setSessions).catch(() => {});
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  // --- Derived ---
  const detailNode = allNodes.find((n) => n.id === detailNodeId) ?? null;

  // --- Handlers ---

  async function handleSetActive(node: CheckpointNode) {
    try {
      if (selectedPlaythrough) {
        await api.playthroughs.update(selectedPlaythrough.id, { active_checkpoint_id: node.id });
        const tree = await api.timeline.tree(selectedPlaythrough.id);
        const roots: CheckpointNode[] = Array.isArray(tree) ? tree : (tree?.roots ?? []);
        setTreeRoots(roots);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleNodeSelect(node: CheckpointNode) {
    setDetailNodeId(node.id === detailNodeId ? null : node.id);
    setSelectedNodeId(node.id);
  }

  async function refreshData() {
    try {
      const data = await api.timeline.playthroughs();
      setPlaythroughs(data);
      if (data.length > 0 && !selectedPlaythrough) setSelectedPlaythrough(data[0]);
      if (selectedPlaythrough) {
        const tree = await api.timeline.tree(selectedPlaythrough.id);
        setTreeRoots(Array.isArray(tree) ? tree : (tree?.roots ?? []));
      }
    } catch (e) { console.error(e); }
  }

  // --- Launch handlers ---

  const handleDesktopPlay = async (node: CheckpointNode) => {
    if (node.file_path.endsWith('.ss1')) {
      try {
        await api.launcher.playEncounter(node.save_file_id);
        const updated = await api.launcher.sessions();
        setSessions(updated);
      } catch (e) {
        console.error('Failed to play encounter:', e);
      }
      return;
    }
    const game = node.snapshot?.game ?? '';
    const system = getSystemForGame(game);
    if (system === 'nds' || system === '3ds' || system === 'gba') {
      const fullName = game.startsWith('Pokemon ') ? game : `Pokemon ${game}`;
      await api.stream.launch(fullName, node.file_path);
    } else {
      await api.launcher.play(String(node.save_file_id));
    }
    const updated = await api.launcher.sessions();
    setSessions(updated);
  };

  const handleStreamPlay = async (node: CheckpointNode) => {
    try {
      // Session is created server-side; phone picks it up via /stream SSE.
      // Desktop shows ActiveStreamToast (global) as the in-app indicator.
      // Normalize the game name — node.snapshot stores variants like "crystal"
      // while the server's ROM_MAP keys expect "Crystal" / "Pokemon Crystal".
      const game = normalizeGameName(node.snapshot?.game ?? '');
      await api.stream.start(node.file_path, game);
      setStreamError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Failed to start stream:', e);
      setStreamError(msg);
    }
  };

  const handleWebPlay = (node: CheckpointNode) => {
    setWebPlaySave({
      saveId: node.save_file_id,
      game: node.snapshot?.game ?? '',
      label: node.label,
    });
  };

  const handleTrade = (node: CheckpointNode) => {
    const fakeSave: DiscoveredSave = {
      id: node.save_file_id,
      file_path: node.file_path,
      game: node.snapshot?.game ?? '',
      generation: node.snapshot?.generation ?? null,
      label: node.label,
      source: 'checkpoint',
      format: '',
      file_size: 0,
      file_mtime: node.created_at,
      save_timestamp: null,
      launchable: node.file_exists,
      rom_path: null,
      notes: node.notes ?? '',
    };
    setTradeSave(fakeSave);
  };

  // --- Render helpers ---

  function renderNodeDetail(node: CheckpointNode, onClose: () => void) {
    return (
      <NodeDetail
        node={node}
        isLocal={isLocal}
        onSetActive={!node.is_active ? () => handleSetActive(node) : undefined}
        onUpdate={async (nodeId, data) => {
          await api.timeline.updateCheckpoint(nodeId, data);
          await refreshData();
        }}
        onPlay={() => handleDesktopPlay(node)}
        onStreamPlay={() => handleStreamPlay(node)}
        onWebPlay={() => handleWebPlay(node)}
        onTrade={() => handleTrade(node)}
        onToggle={refreshData}
        onClose={onClose}
      />
    );
  }

  async function handleScan(game?: string) {
    try {
      await api.timeline.scan(game);
      const data = await api.timeline.playthroughs();
      setPlaythroughs(data);
      if (data.length > 0) {
        if (!selectedPlaythrough) setSelectedPlaythrough(data[0]);
      }
      if (selectedPlaythrough) {
        const tree = await api.timeline.tree(selectedPlaythrough.id);
        setTreeRoots(Array.isArray(tree) ? tree : (tree?.roots ?? []));
      }
    } catch (e) { console.error(e); }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  // --- Derive emulator for the selected playthrough ---
  const playEmulatorId = (() => {
    const gen = selectedPlaythrough?.game
      ? saves.find(s => normalizeGameName(s.game) === normalizeGameName(selectedPlaythrough.game))?.generation ?? null
      : null;
    return (gen ? getEmulatorIdForGeneration(gen) : null) ?? 'mgba';
  })();

  // --- Main layout ---
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Session bar */}
      <SessionBar sessions={sessions} />

      {streamError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>Couldn't start stream: {streamError}</span>
          <button
            onClick={() => setStreamError(null)}
            className="ml-3 text-red-500 hover:text-red-600"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Emulator readiness warning */}
      <InlineEmulatorWarning emulatorId={playEmulatorId} />

      {/* Play header with game selector + playthrough tabs */}
      <PlayHeader
        allGames={allGames}
        selectedGame={selectedGame}
        onSelectGame={(game) => setSelectedGame(game)}
        playthroughs={gamePlaythroughs}
        selectedPlaythrough={selectedPlaythrough}
        onSelectPlaythrough={setSelectedPlaythrough}
        onNewGame={() => {
          // TODO: open new game dialog
        }}
      />

      {/* Search */}
      {selectedPlaythrough && allNodes.length > 0 && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search saves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
      )}

      {/* Empty state: no playthroughs for selected game */}
      {selectedGame && gamePlaythroughs.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              }
              title={`No playthroughs for ${selectedGame}`}
              description="Scan your save library to discover saves, or start a new game to begin tracking."
            />
          </CardContent>
        </Card>
      )}

      {/* Main content area */}
      {selectedPlaythrough && (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0 space-y-5">
            {/* Empty state */}
            {treeRoots.length === 0 && (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    }
                    title="No saves yet for this playthrough"
                    description="Play with save tracking enabled to populate this view"
                  />
                </CardContent>
              </Card>
            )}

            {/* Grouped save buckets */}
            {treeRoots.length > 0 && (
              <div className="flex gap-4 items-start">
                <Card className="flex-1 min-w-0 p-5 py-5 gap-0">
                  <GroupedView
                    roots={treeRoots}
                    selectedId={selectedNodeId}
                    onSelect={handleNodeSelect}
                    scrollToSaveFileId={highlightSaveId}
                    pulseSaveFileId={highlightSaveId}
                    searchQuery={searchQuery}
                  />
                </Card>

                {!isMobile && detailNode && (
                  <Card className="w-[300px] shrink-0 sticky top-4 max-h-[80vh] overflow-y-auto shadow-lg z-20 py-0 gap-0">
                    {renderNodeDetail(detailNode, () => setDetailNodeId(null))}
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile detail modal */}
      {isMobile && detailNode && (
        <Dialog
          open={!!detailNode}
          onOpenChange={(open) => { if (!open) setDetailNodeId(null); }}
        >
          <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col rounded-2xl overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>{detailNode.label}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 pb-2">
              {renderNodeDetail(detailNode, () => setDetailNodeId(null))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* === Launch Dialogs === */}

      {/* Trade dialog */}
      {tradeSave && (
        <TradeSetup
          saves={saves}
          firstSave={tradeSave}
          onClose={() => setTradeSave(null)}
          onStarted={() => { setTradeSave(null); api.launcher.sessions().then(setSessions); }}
        />
      )}

      {/* Web emulator dialog */}
      {webPlaySave && (
        <WebEmulator
          saveId={webPlaySave.saveId}
          game={webPlaySave.game}
          label={webPlaySave.label}
          onClose={(saveData) => {
            if (saveData) setWebSaveData({ ...webPlaySave, data: saveData });
            setWebPlaySave(null);
          }}
        />
      )}

      {/* Web save-changed dialog */}
      {webSaveData && (
        <Dialog open onOpenChange={() => {
          setWebSaveData(null); setWebSaveShowName(false); setWebSaveNewName('');
          loadLauncherData(); refreshData();
        }}>
          <DialogContent className="rounded-lg">
            <DialogHeader>
              <DialogTitle>Save Changed</DialogTitle>
              <DialogDescription>
                Your save for <strong>{webSaveData.game} — {webSaveData.label}</strong> was modified.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground px-1">
              Copies saved to <code className="text-sm bg-surface-raised px-1.5 py-0.5 rounded-md">saves/library/{webSaveData.game}/</code>
            </div>
            {webSaveShowName && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Name for copy:</label>
                <Input
                  value={webSaveNewName}
                  onChange={e => setWebSaveNewName(e.target.value)}
                  placeholder={`${webSaveData.label} (played ${new Date().toISOString().slice(0, 10)})`}
                  autoFocus
                />
              </div>
            )}
            <DialogFooter className="flex gap-2 pt-1">
              <Button variant="ghost" className="rounded-xl" disabled={webSaveResolving}
                onClick={() => { setWebSaveData(null); setWebSaveShowName(false); setWebSaveNewName(''); loadLauncherData(); refreshData(); }}>
                Discard
              </Button>
              <Button variant="outline" className="rounded-xl" disabled={webSaveResolving}
                onClick={async () => {
                  if (!webSaveShowName) { setWebSaveShowName(true); return; }
                  setWebSaveResolving(true);
                  await api.launcher.uploadSave(String(webSaveData.saveId), webSaveData.data, 'save_as_new', webSaveNewName || undefined);
                  setWebSaveResolving(false); setWebSaveData(null); setWebSaveShowName(false); setWebSaveNewName('');
                  loadLauncherData(); refreshData();
                }}>
                {webSaveShowName ? 'Confirm' : 'Save Copy'}
              </Button>
              <Button className="rounded-xl" disabled={webSaveResolving}
                onClick={async () => {
                  setWebSaveResolving(true);
                  await api.launcher.uploadSave(String(webSaveData.saveId), webSaveData.data, 'save_back');
                  setWebSaveResolving(false); setWebSaveData(null); setWebSaveShowName(false);
                  loadLauncherData(); refreshData();
                }}>
                Overwrite Original
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
