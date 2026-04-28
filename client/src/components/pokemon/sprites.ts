// client/src/components/pokemon/sprites.ts

export function spriteUrl(speciesId: number, shiny = false): string {
  // Shiny is not available for box icons; callers that need shiny should
  // switch to the <Sprite> component instead.
  void shiny;
  return `/sprites/pokemon/box/${speciesId}.png`;
}

export function safeSpeciesName(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  if (/^\?+$/.test(name)) return 'Unknown';
  return name;
}
