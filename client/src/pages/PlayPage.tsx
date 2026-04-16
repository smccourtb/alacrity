import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { computeLayout } from '@/components/timeline/GitGraph';
import { NodeDetail } from '@/components/timeline/NodeDetail';
import { GroupedView } from '@/components/timeline/GroupedView';
// TreeView intentionally NOT imported — the tree view is hidden as of
// Phase 1 of the save-visibility rework. The code still exists at
// components/timeline/TreeViewLayouts.tsx as dead code for possible
// later revival.
import { OrphanSidebar } from '@/components/timeline/OrphanSidebar';
import { TreeControls } from '@/components/timeline/TreeControls';
import type { CheckpointNode, Playthrough } from '@/components/timeline/types';
import { useTimelineFilters } from '@/hooks/useTimelineFilters';
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
import { StreamPlayer } from '@/components/launcher/StreamPlayer';
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

export default function PlayPage() {
  // --- Timeline state ---
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([]);
  const [selectedPlaythrough, setSelectedPlaythrough] = useState<Playthrough | null>(null);
  const [treeRoots, setTreeRoots] = useState<CheckpointNode[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightSaveId, setHighlightSaveId] = useState<number | null>(null);
  const [pendingSaveFileId, setPendingSaveFileId] = useState<number | null>(null);
  const [orphans, setOrphans] = useState<Array<Record<string, unknown>>>([]);
  const [orphanTotal, setOrphanTotal] = useState(0);
  const [scanning, setScanning] = useState(false);
  // Tree view removed in Phase 1 rework. Grouped is the only view now.
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [desktopLayout] = useState<'A' | 'B' | 'C' | 'D'>('D');

  // --- Game selector state ---
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // --- Launch state (from GameLauncher) ---
  const [saves, setSaves] = useState<DiscoveredSave[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [availableGames, setAvailableGames] = useState<{ game: string; system: string }[]>([]);
  const [isLocal, setIsLocal] = useState(false);

  // --- Dialog state ---
  const [tradeSave, setTradeSave] = useState<DiscoveredSave | null>(null);
  const [webPlaySave, setWebPlaySave] = useState<{ saveId: number; game: string; label: string } | null>(null);
  const [streamSave, setStreamSave] = useState<{ file_path: string; game: string } | null>(null);
  const [streamGame, setStreamGame] = useState<string | null>(null);
  const [streamResult, setStreamResult] = useState<{ saveChanged: boolean; sessionId: string } | null>(null);
  const [streamSaveNewName, setStreamSaveNewName] = useState('');
  const [streamSaveShowName, setStreamSaveShowName] = useState(false);
  const [webSaveData, setWebSaveData] = useState<{ saveId: number; game: string; label: string; data: ArrayBuffer } | null>(null);
  const [webSaveNewName, setWebSaveNewName] = useState('');
  const [webSaveShowName, setWebSaveShowName] = useState(false);
  const [webSaveResolving, setWebSaveResolving] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    allNodes,
    filteredNodes,
  } = useTimelineFilters(treeRoots);

  // --- Responsive ---
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // --- Derive all games from playthroughs + available ROMs + orphans ---
  const allGames = [...new Set([
    ...playthroughs.map(p => normalizeGameName(p.game)),
    ...availableGames.map(g => normalizeGameName(g.game)),
    ...(orphans as any[]).map((o: any) => normalizeGameName(o.game ?? '')).filter(Boolean),
  ])];

  // Filter playthroughs by selected game (normalize for case-insensitive match)
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

  // --- Initial load: playthroughs + orphans + launcher data ---
  useEffect(() => {
    Promise.all([
      api.timeline.playthroughs(),
      api.timeline.orphans(),
      loadLauncherData(),
    ]).then(([data, orph]) => {
      setPlaythroughs(data);
      if (orph && !Array.isArray(orph) && orph.saves) {
        setOrphans(orph.saves);
        setOrphanTotal(orph.total);
      } else {
        setOrphans(Array.isArray(orph) ? orph : []);
      }
    })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadLauncherData]);

  // --- Auto-select game when playthroughs/games load (prefers stored selection) ---
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

  // --- Auto-select playthrough when game changes (prefers stored id, then first match) ---
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

  // --- Fetch tree + orphans when playthrough changes ---
  useEffect(() => {
    if (!selectedPlaythrough) return;
    const game = selectedPlaythrough.game;

    Promise.all([
      api.timeline.tree(selectedPlaythrough.id),
      api.timeline.orphans(game),
    ]).then(([tree, orph]) => {
      const roots: CheckpointNode[] = Array.isArray(tree) ? tree : (tree?.roots ?? []);
      setTreeRoots(roots);
      if (orph && !Array.isArray(orph) && orph.saves) {
        setOrphans(orph.saves);
        setOrphanTotal(orph.total);
      } else {
        setOrphans(Array.isArray(orph) ? orph : []);
        setOrphanTotal(0);
      }
      setSelectedNodeId(null);
    }).catch(console.error);
  }, [selectedPlaythrough]);

  // Phase 1: read deep-link params, set game/playthrough, remember pending save id, clear URL.
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
    // deps: only the param side. We intentionally don't depend on `playthroughs`
    // because we want the effect to run once per URL change — if playthroughs
    // load after this, Phase 2 will still match by scanning allNodes.
  }, [searchParams, setSearchParams]);

  // Phase 2: once tree data for the matching playthrough is loaded, find the
  // node and fire the highlight. Clears the pending id to prevent re-runs.
  useEffect(() => {
    if (pendingSaveFileId == null) return;
    if (treeRoots.length === 0) return;
    const match = allNodes.find((n) => n.save_file_id === pendingSaveFileId);
    if (!match) return; // tree may still be loading wrong playthrough; wait
    setSelectedNodeId(match.id);
    setDetailNodeId(match.id);
    setHighlightSaveId(pendingSaveFileId);
    setPendingSaveFileId(null);
  }, [pendingSaveFileId, treeRoots, allNodes]);

  // --- Clear highlight after pulse animation duration ---
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
      const [data, orph] = await Promise.all([
        api.timeline.playthroughs(),
        api.timeline.orphans(selectedPlaythrough?.game),
      ]);
      setPlaythroughs(data);
      if (data.length > 0 && !selectedPlaythrough) setSelectedPlaythrough(data[0]);
      if (orph && !Array.isArray(orph) && orph.saves) {
        setOrphans(orph.saves);
        setOrphanTotal(orph.total);
      }
      if (selectedPlaythrough) {
        const tree = await api.timeline.tree(selectedPlaythrough.id);
        setTreeRoots(Array.isArray(tree) ? tree : (tree?.roots ?? []));
      }
    } catch (e) { console.error(e); }
  }

  // --- Launch handlers ---

  const handleDesktopPlay = async (node: CheckpointNode) => {
    if (node.file_path.endsWith('.ss1')) {
      await api.launcher.playEncounter(node.save_file_id);
      const updated = await api.launcher.sessions();
      setSessions(updated);
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

  const handleStreamPlay = (node: CheckpointNode) => {
    setStreamSave({
      file_path: node.file_path,
      game: node.snapshot?.game ?? '',
    });
  };

  const handleWebPlay = (node: CheckpointNode) => {
    setWebPlaySave({
      saveId: node.save_file_id,
      game: node.snapshot?.game ?? '',
      label: node.label,
    });
  };

  const handleTrade = (node: CheckpointNode) => {
    // Build a DiscoveredSave-compatible object for TradeSetup
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
        allNodes={allNodes}
        isLocal={isLocal}
        onSetActive={!node.is_active ? () => handleSetActive(node) : undefined}
        onReparent={async (nodeId, newParentId) => {
          try {
            await api.timeline.updateCheckpoint(nodeId, { parent_checkpoint_id: newParentId });
            await refreshData();
          } catch (e) { console.error(e); }
        }}
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
    setScanning(true);
    try {
      await api.timeline.scan(game);
      const [data, orph] = await Promise.all([
        api.timeline.playthroughs(),
        api.timeline.orphans(game),
      ]);
      setPlaythroughs(data);
      if (data.length > 0) {
        if (!selectedPlaythrough) setSelectedPlaythrough(data[0]);
      }
      if (selectedPlaythrough) {
        const tree = await api.timeline.tree(selectedPlaythrough.id);
        setTreeRoots(Array.isArray(tree) ? tree : (tree?.roots ?? []));
      }
      if (orph && !Array.isArray(orph) && orph.saves) {
        setOrphans(orph.saves);
        setOrphanTotal(orph.total);
      }
    } catch (e) { console.error(e); }
    setScanning(false);
  }

  // Layout for tree view
  const effectiveRowHeight = isMobile ? 40 : undefined;
  const layout = treeRoots.length > 0 ? computeLayout(treeRoots, effectiveRowHeight) : null;
  const hasOrphans = orphans.length > 0;

  // --- Loading state ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  // --- Derive emulator for the selected playthrough (or default to mgba) ---
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

      {/* Controls bar (search + orphan sidebar toggle) */}
      {selectedPlaythrough && (
        <TreeControls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isMobile={isMobile}
          hasOrphans={hasOrphans}
          orphanCount={orphanTotal || orphans.length}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Empty state: no playthroughs for selected game */}
      {selectedGame && gamePlaythroughs.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="3" x2="12" y2="8" />
                  <line x1="12" y1="16" x2="12" y2="21" />
                  <circle cx="12" cy="3" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="21" r="1.5" fill="currentColor" />
                </svg>
              }
              title={`No playthroughs for ${selectedGame}`}
              description="Scan your save library to discover saves, or start a new game to begin tracking."
            />
          </CardContent>
        </Card>
      )}

      {/* Main content area with optional sidebar */}
      {selectedPlaythrough && (
        <div className="flex gap-5">
          {/* Left: tree/grouped + detail panel */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Empty tree state */}
            {treeRoots.length === 0 && (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                        <circle cx="12" cy="12" r="3" />
                        <line x1="12" y1="3" x2="12" y2="8" />
                        <line x1="12" y1="16" x2="12" y2="21" />
                      </svg>
                    }
                    title="No checkpoints yet for this playthrough"
                    description="Play with checkpoint tracking enabled to build the tree"
                  />
                </CardContent>
              </Card>
            )}

            {/* Grouped view (only view mode as of Phase 1 rework) */}
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

          {/* Right: collapsible orphan sidebar (desktop only) */}
          {hasOrphans && sidebarOpen && !isMobile && (
            <OrphanSidebar
              orphans={orphans as Parameters<typeof OrphanSidebar>[0]['orphans']}
              orphanTotal={orphanTotal}
              scanning={scanning}
              open={sidebarOpen}
              onToggle={() => setSidebarOpen(false)}
              onScan={() => handleScan(selectedPlaythrough?.game)}
              onLinked={refreshData}
            />
          )}

          {/* Collapsed sidebar toggle (desktop only) */}
          {hasOrphans && !sidebarOpen && !isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 w-8 self-start sticky top-4 bg-card shadow-soft rounded-lg py-3 flex flex-col items-center gap-1.5 hover:bg-surface transition-colors"
              title="Show unlinked saves"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-2xs font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
                Unlinked ({orphanTotal || orphans.length})
              </span>
            </button>
          )}
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

      {/* Stream player — from a save node */}
      {streamSave && (
        <StreamPlayer
          savePath={streamSave.file_path}
          game={streamSave.game}
          system={getSystemForGame(streamSave.game)}
          onClose={(result) => {
            if (result.saveChanged) setStreamResult(result);
            setStreamSave(null);
          }}
        />
      )}

      {/* Stream player — from a game (no save) */}
      {streamGame && (
        <StreamPlayer
          game={streamGame}
          system={getSystemForGame(streamGame)}
          onClose={(result) => {
            if (result.saveChanged) setStreamResult(result);
            setStreamGame(null);
          }}
        />
      )}

      {/* Stream save-changed dialog */}
      {streamResult && (
        <Dialog open onOpenChange={() => { setStreamResult(null); setStreamSaveNewName(''); setStreamSaveShowName(false); loadLauncherData(); refreshData(); }}>
          <DialogContent className="rounded-lg">
            <DialogHeader>
              <DialogTitle>Save Changed</DialogTitle>
              <DialogDescription>
                Your save was modified during the stream session.
              </DialogDescription>
            </DialogHeader>
            {streamSaveShowName && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Name for copy:</label>
                <Input
                  value={streamSaveNewName}
                  onChange={e => setStreamSaveNewName(e.target.value)}
                  placeholder={`Streamed ${new Date().toISOString().slice(0, 10)}`}
                  autoFocus
                />
              </div>
            )}
            <DialogFooter className="flex gap-2 pt-1">
              <Button variant="ghost" className="rounded-xl"
                onClick={async () => {
                  await api.stream.resolve(streamResult.sessionId, 'discard');
                  setStreamResult(null); setStreamSaveNewName(''); setStreamSaveShowName(false);
                  loadLauncherData(); refreshData();
                }}>
                Discard
              </Button>
              <Button variant="outline" className="rounded-xl"
                onClick={async () => {
                  if (!streamSaveShowName) { setStreamSaveShowName(true); return; }
                  await api.stream.resolve(streamResult.sessionId, 'save_as_new', streamSaveNewName || undefined);
                  setStreamResult(null); setStreamSaveNewName(''); setStreamSaveShowName(false);
                  loadLauncherData(); refreshData();
                }}>
                {streamSaveShowName ? 'Confirm' : 'Save Copy'}
              </Button>
              <Button className="rounded-xl"
                onClick={async () => {
                  await api.stream.resolve(streamResult.sessionId, 'save_back');
                  setStreamResult(null); setStreamSaveNewName(''); setStreamSaveShowName(false);
                  loadLauncherData(); refreshData();
                }}>
                Overwrite Original
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
