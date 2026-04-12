export const BALL_CATEGORIES: Record<number, string[]> = {
  0: ['Poke Ball', 'Great Ball', 'Ultra Ball', 'Net Ball', 'Dive Ball', 'Nest Ball', 'Repeat Ball', 'Timer Ball', 'Luxury Ball', 'Premier Ball'],
  1: ['Dusk Ball', 'Heal Ball', 'Quick Ball'],
  2: ['Safari Ball'],
  3: ['Fast Ball', 'Level Ball', 'Lure Ball', 'Heavy Ball', 'Love Ball', 'Friend Ball', 'Moon Ball'],
  4: ['Sport Ball'],
  5: ['Dream Ball'],
  6: ['Beast Ball'],
};

/** Decode a PKHeX ball_permit bitmask into an array of legal ball names. */
export function decodeBallPermit(permit: number): string[] {
  if (permit === 0) return [];
  const balls: string[] = [];
  for (let bit = 0; bit <= 6; bit++) {
    if (permit & (1 << bit)) {
      balls.push(...BALL_CATEGORIES[bit]);
    }
  }
  return balls;
}

/** Check if a specific ball is legal for a given permit. */
export function isBallLegal(permit: number, ballName: string): boolean {
  return decodeBallPermit(permit).includes(ballName);
}

/** Count how many distinct balls are legal for a permit. */
export function legalBallCount(permit: number): number {
  return decodeBallPermit(permit).length;
}
