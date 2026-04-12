// client/src/components/pokemon/sprites.ts

export function spriteUrl(speciesId: number, shiny = false): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${speciesId}.png`;
}

export function safeSpeciesName(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  if (/^\?+$/.test(name)) return 'Unknown';
  return name;
}
