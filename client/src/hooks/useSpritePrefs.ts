import { useEffect, useState } from 'react';
import { configApi } from '@/api/config';
import type { PokemonStyle } from '@/components/Sprite';

export interface SpritePrefs {
  style: PokemonStyle;
  boxEverywhere: boolean;
  loaded: boolean;
}

export function useSpritePrefs(): SpritePrefs {
  const [prefs, setPrefs] = useState<SpritePrefs>({ style: 'home', boxEverywhere: true, loaded: false });

  useEffect(() => {
    let cancelled = false;
    configApi.get().then(c => {
      if (cancelled) return;
      setPrefs({
        style: (c.pokedexSpriteStyle as PokemonStyle) ?? 'home',
        boxEverywhere: c.boxIconEverywhere ?? true,
        loaded: true,
      });
    }).catch(() => {
      if (cancelled) return;
      setPrefs(p => ({ ...p, loaded: true }));
    });
    return () => { cancelled = true; };
  }, []);

  return prefs;
}
