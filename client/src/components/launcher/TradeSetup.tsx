import { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { DiscoveredSave } from '@/lib/game-constants';

interface TradeSetupProps {
  saves: DiscoveredSave[];
  firstSave: DiscoveredSave | null;
  onClose: () => void;
  onStarted: () => void;
}

const GAME_ACCENTS: Record<string, string> = {
  Red: '#ef4444', Blue: '#3b82f6', Yellow: '#eab308',
  Gold: '#f59e0b', Silver: '#94a3b8', Crystal: '#06b6d4',
};

export default function TradeSetup({ saves, firstSave, onClose, onStarted }: TradeSetupProps) {
  const [selected, setSelected] = useState<DiscoveredSave | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!firstSave) return null;

  const compatible = saves.filter(s => {
    if (s.id === firstSave.id) return false;
    if (!s.launchable) return false;
    const gen1 = firstSave.generation || 0;
    const gen2 = s.generation || 0;
    if (gen1 === 0 || gen2 === 0) return false;
    if (gen1 > 2 || gen2 > 2) return false;
    return true;
  });

  const handleTrade = async () => {
    if (!selected) return;
    setLaunching(true);
    setError(null);
    try {
      await api.launcher.trade(String(firstSave.id), String(selected.id));
      onStarted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>Set Up Trade</DialogTitle>
          <DialogDescription>
            Trading from <strong>{firstSave.game} — {firstSave.label}</strong>. Pick the other side.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
          {compatible.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No compatible saves found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Need another Gen 1-2 save to trade with</p>
            </div>
          )}
          {compatible.map(s => {
            const isSelected = selected?.id === s.id;
            const accent = GAME_ACCENTS[s.game] || '#6b7280';
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-surface-raised'
                    : 'hover:bg-surface'
                }`}
                style={isSelected ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                onClick={() => setSelected(s)}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="text-base font-medium">{s.game}</span>
                <span className="text-sm text-muted-foreground truncate">{s.label}</span>
                <span className="text-xs text-muted-foreground/50 ml-auto shrink-0">{s.source}</span>
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <DialogFooter className="pt-1">
          <Button variant="ghost" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" onClick={handleTrade} disabled={!selected || launching}>
            {launching ? 'Launching...' : 'Start Trade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
