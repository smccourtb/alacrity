export function spriteUrlFor(kind: string | null | undefined, ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (kind === 'pokemon') return `/sprites/pokemon/${ref}`;
  if (kind === 'item') return `/sprites/items/${ref}`;
  return null;
}

/**
 * Sprite URL specifically for map-marker rendering. Pokemon "box" sprites
 * (msikma's pokemon-gen8) are 68×56 canvases with the actual mon padded into
 * one corner — fine for box/party UI where the slot is square and roomy, but
 * inside a 32×32 map marker they get `object-fit: contain`-centered, which
 * pushes the visible mon off-center. The Crystal-version sprites are tightly
 * cropped and centered, so we swap to them for markers only. All other
 * consumers (Pokedex, party slots, daycare preview, etc.) keep the box
 * source unchanged.
 */
export function markerSpriteUrl(kind: string | null | undefined, ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (kind === 'pokemon' && ref.startsWith('box/')) {
    return `/sprites/pokemon/versions/generation-ii/crystal/${ref.slice(4)}`;
  }
  if (kind === 'pokemon') return `/sprites/pokemon/${ref}`;
  if (kind === 'item') return `/sprites/items/${ref}`;
  return null;
}
