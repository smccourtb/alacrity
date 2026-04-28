import { useEffect, useState } from 'react';
import { configApi } from '@/api/config';
import { Sprite, type PokemonStyle } from '@/components/Sprite';

const STYLES: { value: PokemonStyle; label: string }[] = [
  { value: 'home', label: 'HOME (default)' },
  { value: 'official-artwork', label: 'Official Artwork' },
  { value: 'dream-world', label: 'Dream World (2D art)' },
  { value: 'box', label: 'Box Icon' },
  { value: 'gen1-red-blue', label: 'Gen 1 — Red/Blue' },
  { value: 'gen1-yellow', label: 'Gen 1 — Yellow' },
  { value: 'gen2-gold', label: 'Gen 2 — Gold' },
  { value: 'gen2-silver', label: 'Gen 2 — Silver' },
  { value: 'gen2-crystal', label: 'Gen 2 — Crystal' },
  { value: 'gen3-emerald', label: 'Gen 3 — Emerald' },
  { value: 'gen3-firered-leafgreen', label: 'Gen 3 — FR/LG' },
  { value: 'gen4-heartgold-soulsilver', label: 'Gen 4 — HG/SS' },
  { value: 'gen4-platinum', label: 'Gen 4 — Platinum' },
  { value: 'gen5-black-white', label: 'Gen 5 — B/W' },
  { value: 'gen6-x-y', label: 'Gen 6 — X/Y' },
  { value: 'gen7-ultra-sun-ultra-moon', label: 'Gen 7 — USUM' },
];

export function SpriteStyleSection() {
  const [style, setStyle] = useState<PokemonStyle>('home');
  const [boxEverywhere, setBoxEverywhere] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    configApi.get().then(c => {
      setStyle((c.pokedexSpriteStyle as PokemonStyle) ?? 'home');
      setBoxEverywhere(c.boxIconEverywhere ?? true);
      setLoaded(true);
    });
  }, []);

  async function updateStyle(next: PokemonStyle) {
    setStyle(next);
    await configApi.update({ pokedexSpriteStyle: next });
  }

  async function toggleBox(v: boolean) {
    setBoxEverywhere(v);
    await configApi.update({ boxIconEverywhere: v });
  }

  if (!loaded) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Sprites</h2>
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="sprite-style-select">Pokédex sprite style</label>
          <div className="mt-2 flex items-center gap-3">
            <select
              id="sprite-style-select"
              value={style}
              onChange={e => updateStyle(e.target.value as PokemonStyle)}
              className="bg-background border border-border rounded px-2 py-1 text-sm"
            >
              {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="flex items-center justify-center w-16 h-16 bg-muted rounded">
              <Sprite kind="pokemon" id={25} style={style} size={56} alt="Pikachu preview" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={boxEverywhere}
            onChange={e => toggleBox(e.target.checked)}
          />
          Use box icons in lists, party, and map markers
        </label>
      </div>
    </section>
  );
}
