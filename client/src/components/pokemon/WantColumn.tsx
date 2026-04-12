import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import TargetCard from './TargetCard';
import AddTargetForm from './AddTargetForm';

type Target = {
  id: number;
  description: string;
  source_game: string | null;
  category: string;
  target_type: string;
  notes: string | null;
  is_manual: number;
  dismissed: number;
  manual_override: number;
  status: string | null;
  constraints: any;
};

export default function WantColumn({ speciesId }: { speciesId: number }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadTargets = () => {
    setLoading(true);
    api.specimens
      .targets({ species_id: speciesId })
      .then(setTargets)
      .finally(() => setLoading(false));
  };

  useEffect(loadTargets, [speciesId]);

  const handleDismiss = (id: number) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  const obtained = targets.filter(
    (t) => t.status === 'completed' || t.status === 'obtained' || t.status === 'journey_complete'
  );
  const remaining = targets.filter(
    (t) => t.status !== 'completed' && t.status !== 'obtained' && t.status !== 'journey_complete'
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Notable Targets <span className="font-normal">{targets.length > 0 ? `(${targets.length})` : ''}</span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-primary font-semibold hover:underline"
        >
          + Add
        </button>
      </div>

      {showForm && (
        <AddTargetForm
          speciesId={speciesId}
          onCreated={() => {
            setShowForm(false);
            loadTargets();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && <div className="text-xs text-muted-foreground py-3">Loading targets...</div>}

      {!loading && targets.length === 0 && !showForm && (
        <div className="text-xs text-muted-foreground py-3">
          No targets yet. Click + Add to create one.
        </div>
      )}

      <div className="space-y-2">
        {remaining.map((t) => (
          <TargetCard key={t.id} target={t} onDismiss={handleDismiss} onUpdate={loadTargets} />
        ))}
        {obtained.map((t) => (
          <TargetCard key={t.id} target={t} onDismiss={handleDismiss} onUpdate={loadTargets} />
        ))}
      </div>
    </div>
  );
}
