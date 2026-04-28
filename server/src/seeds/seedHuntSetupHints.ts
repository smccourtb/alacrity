// Seed helper for `hunt_setup_hints`. Fans a single image asset out across
// multiple games so one PNG (e.g. "Gen 2 daycare entrance") covers Gold/
// Silver/Crystal without duplicating the file. Resolution at lookup time is
// most-specific-wins: (game, mode, species) → (game, mode, NULL) → nothing.

import db from '../db.js';

export type HuntMode = 'wild' | 'fishing' | 'egg' | 'gift' | 'stationary';

export interface HuntSetupHintSpec {
  /** One or more game keys this hint applies to. Lowercase, matches `save_files.game`. */
  games: string[];
  mode: HuntMode;
  /** NULL = generic for this (game, mode); a value targets one species and overrides the generic. */
  species_id?: number | null;
  /** Path served from `client/public/`, e.g. `/hunt-setup/gen2-daycare.png`. */
  image_path: string;
  caption?: string;
}

const upsert = db.prepare(`
  INSERT INTO hunt_setup_hints (game, mode, species_id, image_path, caption)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(game, mode, COALESCE(species_id, 0)) DO UPDATE SET
    image_path = excluded.image_path,
    caption    = excluded.caption
`);

export function addHint(spec: HuntSetupHintSpec): number {
  let written = 0;
  for (const raw of spec.games) {
    const game = raw.toLowerCase();
    upsert.run(game, spec.mode, spec.species_id ?? null, spec.image_path, spec.caption ?? null);
    written++;
  }
  return written;
}

/**
 * Curated initial seed. Add entries here as screenshots land in
 * `client/public/hunt-setup/`. Anything missing simply won't render.
 */
export function seedHuntSetupHints(): void {
  // Examples (commented until images exist):
  //
  // addHint({
  //   games: ['gold', 'silver', 'crystal'],
  //   mode: 'egg',
  //   image_path: '/hunt-setup/gen2-daycare.png',
  //   caption: "Stand next to the daycare man on Route 34, facing him.",
  // });
  //
  // addHint({
  //   games: ['crystal'],
  //   mode: 'gift',
  //   species_id: 236, // Tyrogue
  //   image_path: '/hunt-setup/crystal-tyrogue.png',
  //   caption: 'Talk to Kiyo on Mt. Mortar 1F with one open party slot.',
  // });
}
