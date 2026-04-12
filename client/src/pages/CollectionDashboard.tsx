import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { ProgressBar } from '@/components/ui/progress-bar';

type DashboardData = {
  overall: { total: number; obtained: number; in_progress: number; remaining: number };
  games: Array<{
    game: string;
    total: number;
    obtained: number;
    in_progress: number;
    remaining: number;
    pinned_saves: Array<{ save_file_id: number; filename: string; notes: string | null }>;
    next_up: { target_id: number; description: string; species_name: string; sprite_url: string | null; location_key: string | null; task_type: string | null } | null;
  }>;
  gaps: Array<{
    target_id: number;
    species_id: number;
    source_game: string;
    description: string;
    priority: number;
    category: string;
    species_name: string;
    dex_number: number;
    sprite_url: string | null;
    location_key: string | null;
    task_type: string | null;
    save_file_id: number | null;
    save_filename: string | null;
  }>;
};

const ERA_TABS = [
  { key: '', label: 'All Eras' },
  { key: 'gameboy', label: 'Game Boy' },
  { key: 'no-mark', label: 'No Mark' },
  { key: 'pentagon', label: 'Pentagon' },
  { key: 'clover', label: 'Clover' },
  { key: 'lets-go', label: "Let's Go" },
  { key: 'galar', label: 'Galar' },
  { key: 'hisui', label: 'Hisui' },
  { key: 'paldea', label: 'Paldea' },
];

function GameCard({
  game,
  onOpenGuide,
}: {
  game: DashboardData['games'][0];
  onOpenGuide: (game: string) => void;
}) {
  const pct = game.total > 0 ? ((game.obtained / game.total) * 100).toFixed(0) : '0';
  const isActive = game.obtained > 0 || game.in_progress > 0;

  return (
    <button
      onClick={() => onOpenGuide(game.game)}
      className={`w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all ${
        !isActive && game.obtained === 0 ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm capitalize">{game.game}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive
              ? 'bg-green-500/10 text-green-600'
              : game.total > 0
              ? 'bg-muted text-muted-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isActive ? 'active' : game.total > 0 ? `${game.total} targets` : 'not started'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <ProgressBar value={Number(pct) / 100} color="bg-primary" className="flex-1" />
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>

      {game.pinned_saves.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {game.pinned_saves.map((s) => (
            <span
              key={s.save_file_id}
              className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white"
            >
              {s.notes || s.filename}
            </span>
          ))}
        </div>
      )}

      {game.next_up && (
        <div className="text-xs text-muted-foreground mt-1">
          Next: <span className="text-foreground font-medium">{game.next_up.description}</span>
          {game.next_up.location_key && (
            <span className="text-muted-foreground">
              {' '}at {game.next_up.location_key.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function GapRow({
  gap,
  onNavigate,
}: {
  gap: DashboardData['gaps'][0];
  onNavigate: (game: string, species: number) => void;
}) {
  const spriteUrl =
    gap.sprite_url ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${gap.species_id}.png`;

  return (
    <button
      onClick={() => onNavigate(gap.source_game, gap.species_id)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left border-b border-border last:border-0"
    >
      <img
        src={spriteUrl}
        alt={gap.species_name}
        className="w-8 h-8 object-contain pixelated shrink-0"
        loading="lazy"
      />
      <span className="text-xs text-muted-foreground w-10 shrink-0">
        #{String(gap.dex_number).padStart(3, '0')}
      </span>
      <span className="font-medium text-sm flex-1 capitalize">{gap.species_name}</span>
      <div className="text-right shrink-0">
        <div className="text-xs text-primary font-medium capitalize">{gap.source_game}</div>
        <div className="text-xs text-muted-foreground capitalize">
          {gap.location_key?.replace(/-/g, ' ')} — {gap.task_type}
        </div>
      </div>
      {gap.save_filename && (
        <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white shrink-0">
          {gap.save_filename}
        </span>
      )}
    </button>
  );
}

export default function CollectionDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeg, setSelectedLeg] = useState(searchParams.get('leg') || '');

  useEffect(() => {
    setLoading(true);
    const params = selectedLeg ? { leg: selectedLeg } : undefined;
    api.collection
      .dashboard(params)
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedLeg]);

  const handleOpenGuide = (game: string) => {
    navigate(`/guide?game=${game}`);
  };

  const handleNavigateToSpecies = (game: string, speciesId: number) => {
    navigate(`/guide?game=${game}&species=${speciesId}`);
  };

  if (loading || !data) {
    return <div className="text-muted-foreground text-sm">Loading collection...</div>;
  }

  const overallPct =
    data.overall.total > 0 ? ((data.overall.obtained / data.overall.total) * 100).toFixed(1) : '0';

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Origin Collection</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {data.overall.obtained}/{data.overall.total} specimens obtained ({overallPct}%)
        </p>

        <div className="flex items-center gap-3 mb-4">
          <ProgressBar value={Number(overallPct) / 100} color="bg-primary" size="md" className="flex-1" />
        </div>

        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{data.overall.obtained}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Obtained</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{data.overall.in_progress}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{data.overall.remaining}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {ERA_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedLeg(tab.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedLeg === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Games
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.games.map((g) => (
            <GameCard key={g.game} game={g} onOpenGuide={handleOpenGuide} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Remaining Gaps
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          {data.gaps.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              All targets obtained!
            </div>
          ) : (
            data.gaps.map((gap) => (
              <GapRow
                key={gap.target_id}
                gap={gap}
                onNavigate={handleNavigateToSpecies}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
