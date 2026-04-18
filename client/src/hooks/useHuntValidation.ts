import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';

export type HuntMode = 'wild' | 'stationary' | 'gift' | 'egg' | 'fishing';
export type CheckId = 'mode_species' | 'game_species' | 'wild_location' | 'wild_encounter' | 'egg_daycare' | 'stationary_location' | 'stationary_party';
export type CheckSeverity = 'error' | 'warning' | 'skipped';

export interface ValidationCheck {
  id: CheckId;
  severity: CheckSeverity;
  message: string;
  detail?: string;
}
export interface ValidationReport {
  ok: boolean;
  checks: ValidationCheck[];
}

export interface UseHuntValidationInput {
  game: string | null;
  sav_path: string | null;
  hunt_mode: HuntMode;
  target_species_id: number | null;
}

export function useHuntValidation(input: UseHuntValidationInput) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!input.game) { setReport(null); return; }
    const game = input.game;
    const myReq = ++seq.current;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await api.hunts.validate({
          game,
          sav_path: input.sav_path,
          hunt_mode: input.hunt_mode,
          target_species_id: input.target_species_id,
        });
        if (seq.current === myReq) setReport(r);
      } catch {
        if (seq.current === myReq) setReport({ ok: true, checks: [] });
      } finally {
        if (seq.current === myReq) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [input.game, input.sav_path, input.hunt_mode, input.target_species_id]);

  return { report, loading };
}
