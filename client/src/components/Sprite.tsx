import { useEffect, useState } from 'react';

export type PokemonStyle =
  | 'home'
  | 'official-artwork'
  | 'dream-world'
  | 'box'
  // historical per-game styles
  | 'gen1-red-blue' | 'gen1-yellow'
  | 'gen2-gold' | 'gen2-silver' | 'gen2-crystal'
  | 'gen3-ruby-sapphire' | 'gen3-emerald' | 'gen3-firered-leafgreen'
  | 'gen4-diamond-pearl' | 'gen4-platinum' | 'gen4-heartgold-soulsilver'
  | 'gen5-black-white'
  | 'gen6-x-y' | 'gen6-omegaruby-alphasapphire'
  | 'gen7-ultra-sun-ultra-moon' | 'gen7-icons'
  | 'gen8-icons';

type Props = {
  kind: 'pokemon';
  id: number;
  shiny?: boolean;
  style?: PokemonStyle;
  size?: number;
  className?: string;
  alt?: string;
};

interface StyleDef {
  path: string;
  ext: 'png' | 'svg';
  pixelated: boolean;
}

const STYLE_DIR: Record<PokemonStyle, StyleDef> = {
  'home': { path: 'home', ext: 'png', pixelated: false },
  'official-artwork': { path: 'official-artwork', ext: 'png', pixelated: false },
  'dream-world': { path: 'dream-world', ext: 'svg', pixelated: false },
  'box': { path: 'box', ext: 'png', pixelated: true },
  'gen1-red-blue': { path: 'versions/generation-i/red-blue', ext: 'png', pixelated: true },
  'gen1-yellow': { path: 'versions/generation-i/yellow', ext: 'png', pixelated: true },
  'gen2-gold': { path: 'versions/generation-ii/gold', ext: 'png', pixelated: true },
  'gen2-silver': { path: 'versions/generation-ii/silver', ext: 'png', pixelated: true },
  'gen2-crystal': { path: 'versions/generation-ii/crystal', ext: 'png', pixelated: true },
  'gen3-ruby-sapphire': { path: 'versions/generation-iii/ruby-sapphire', ext: 'png', pixelated: true },
  'gen3-emerald': { path: 'versions/generation-iii/emerald', ext: 'png', pixelated: true },
  'gen3-firered-leafgreen': { path: 'versions/generation-iii/firered-leafgreen', ext: 'png', pixelated: true },
  'gen4-diamond-pearl': { path: 'versions/generation-iv/diamond-pearl', ext: 'png', pixelated: true },
  'gen4-platinum': { path: 'versions/generation-iv/platinum', ext: 'png', pixelated: true },
  'gen4-heartgold-soulsilver': { path: 'versions/generation-iv/heartgold-soulsilver', ext: 'png', pixelated: true },
  'gen5-black-white': { path: 'versions/generation-v/black-white', ext: 'png', pixelated: true },
  'gen6-x-y': { path: 'versions/generation-vi/x-y', ext: 'png', pixelated: false },
  'gen6-omegaruby-alphasapphire': { path: 'versions/generation-vi/omegaruby-alphasapphire', ext: 'png', pixelated: false },
  'gen7-ultra-sun-ultra-moon': { path: 'versions/generation-vii/ultra-sun-ultra-moon', ext: 'png', pixelated: false },
  'gen7-icons': { path: 'versions/generation-vii/icons', ext: 'png', pixelated: true },
  'gen8-icons': { path: 'versions/generation-viii/icons', ext: 'png', pixelated: true },
};

const HAS_SHINY: Record<PokemonStyle, boolean> = {
  'home': true,
  'box': true,
  'gen1-red-blue': false, 'gen1-yellow': false,
  'gen2-gold': true, 'gen2-silver': true, 'gen2-crystal': true,
  'gen3-ruby-sapphire': true, 'gen3-emerald': true, 'gen3-firered-leafgreen': true,
  'gen4-diamond-pearl': true, 'gen4-platinum': true, 'gen4-heartgold-soulsilver': true,
  'gen5-black-white': true,
  'gen6-x-y': true, 'gen6-omegaruby-alphasapphire': true,
  'gen7-ultra-sun-ultra-moon': true, 'gen7-icons': false,
  'gen8-icons': false,
  'official-artwork': false,
  'dream-world': false,
};

export function pokemonSrc(id: number, shiny: boolean, style: PokemonStyle): string {
  const s = STYLE_DIR[style];
  if (shiny && HAS_SHINY[style]) {
    return `/sprites/pokemon/${s.path}/shiny/${id}.${s.ext}`;
  }
  return `/sprites/pokemon/${s.path}/${id}.${s.ext}`;
}

export function Sprite(props: Props) {
  const [errored, setErrored] = useState(false);
  const size = props.size ?? 64;

  const style = props.style ?? 'home';
  useEffect(() => { setErrored(false); }, [props.id, style, props.shiny]);
  const effectiveStyle: PokemonStyle = errored && style !== 'home' ? 'home' : style;
  const src = pokemonSrc(props.id, !!props.shiny, effectiveStyle);
  const pixelated = STYLE_DIR[effectiveStyle].pixelated;

  return (
    <img
      src={src}
      alt={props.alt ?? ''}
      width={size}
      height={size}
      style={{ imageRendering: pixelated ? 'pixelated' : 'auto' }}
      className={props.className}
      onError={() => setErrored(true)}
    />
  );
}
