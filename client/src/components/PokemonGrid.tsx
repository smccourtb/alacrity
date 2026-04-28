import { useRef, useMemo, useState, useEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import PokemonCard from './PokemonCard';
import { useSpritePrefs } from '@/hooks/useSpritePrefs';
import type { PokemonStyle } from '@/components/Sprite';
import { api } from '@/api/client';

// Map game name → origin mark. Multiple games share the same mark.
const GAME_TO_MARK: Record<string, string> = {
  Red: 'GB', Blue: 'GB', Yellow: 'GB', Gold: 'GB', Silver: 'GB', Crystal: 'GB',
  Ruby: 'None', Sapphire: 'None', Emerald: 'None', FireRed: 'None', LeafGreen: 'None',
  Colosseum: 'None', XD: 'None',
  Diamond: 'None', Pearl: 'None', Platinum: 'None', HeartGold: 'None', SoulSilver: 'None',
  Black: 'None', White: 'None', 'Black 2': 'None', 'White 2': 'None',
  X: 'Pentagon', Y: 'Pentagon', 'Omega Ruby': 'Pentagon', 'Alpha Sapphire': 'Pentagon',
  Sun: 'Clover', Moon: 'Clover', 'Ultra Sun': 'Clover', 'Ultra Moon': 'Clover',
  "Let's Go Pikachu": 'LetsGo', "Let's Go Eevee": 'LetsGo',
  Sword: 'Galar', Shield: 'Galar',
  'Brilliant Diamond': 'BDSP', 'Shining Pearl': 'BDSP',
  'Legends Arceus': 'Hisui',
  Scarlet: 'Paldea', Violet: 'Paldea',
};

function getBestNatures(species: any): string[] {
  const stats = [
    { name: 'attack', val: species.base_attack },
    { name: 'defense', val: species.base_defense },
    { name: 'sp_attack', val: species.base_sp_attack },
    { name: 'sp_defense', val: species.base_sp_defense },
    { name: 'speed', val: species.base_speed },
  ];
  const highest = stats.reduce((a, b) => a.val >= b.val ? a : b);
  const natureMap: Record<string, Record<string, string>> = {
    attack: { sp_attack: 'Adamant', speed: 'Brave', defense: 'Lonely', sp_defense: 'Naughty' },
    defense: { attack: 'Bold', sp_attack: 'Impish', speed: 'Relaxed', sp_defense: 'Lax' },
    sp_attack: { attack: 'Modest', defense: 'Mild', speed: 'Quiet', sp_defense: 'Rash' },
    sp_defense: { attack: 'Calm', defense: 'Gentle', sp_attack: 'Careful', speed: 'Sassy' },
    speed: { attack: 'Timid', defense: 'Hasty', sp_attack: 'Jolly', sp_defense: 'Naive' },
  };
  if (!natureMap[highest.name]) return [];
  return Object.values(natureMap[highest.name]);
}

interface Props {
  species: any[];
  collection: any[];
  itemCaughtMap: Map<string, { caught: boolean; shinyCaught: boolean }>;
  shinyMode: boolean;
  onSelect: (species: any) => void;
  lens?: string;
}

export default function PokemonGrid({ species, collection, itemCaughtMap, shinyMode, onSelect, lens }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  const { style, boxEverywhere } = useSpritePrefs();
  const listStyle: PokemonStyle = boxEverywhere ? 'box' : style;

  const [teraPalette, setTeraPalette] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    api.reference.teraTypes().then(types => {
      if (cancelled) return;
      const palette: Record<string, string> = {};
      for (const t of types) {
        palette[t.key] = t.color;
        palette[t.key.toLowerCase()] = t.color;
        palette[t.name] = t.color;
        palette[t.name.toLowerCase()] = t.color;
      }
      setTeraPalette(palette);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function updateCols() {
      if (!parentRef.current) return;
      const width = parentRef.current.clientWidth;
      setCols(Math.max(4, Math.floor(width / 110)));
    }
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const rows = useMemo(() => {
    const result: any[][] = [];
    for (let i = 0; i < species.length; i += cols) {
      result.push(species.slice(i, i + cols));
    }
    return result;
  }, [species, cols]);

  const collectionMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const p of collection) {
      const list = map.get(p.species_id) || [];
      list.push(p);
      map.set(p.species_id, list);
    }
    return map;
  }, [collection]);

  const formCollectionMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const p of collection) {
      if (!p.form_id) continue;
      const list = map.get(p.form_id) || [];
      list.push(p);
      map.set(p.form_id, list);
    }
    return map;
  }, [collection]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 168,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  return (
    <div ref={parentRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            <div
              className="gap-2.5 p-0.5"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {rows[virtualRow.index].map(s => {
                const isFormItem = s._isFormItem;
                const formId = s._formId;

                const itemKey = isFormItem ? `form-${formId}` : String(s.id);
                const caughtStatus = itemCaughtMap.get(itemKey);

                const entries = isFormItem
                  ? (formCollectionMap.get(formId) || []).filter(p => shinyMode ? p.is_shiny : !p.is_shiny)
                  : (collectionMap.get(s.id) || []).filter(p => shinyMode ? p.is_shiny : !p.is_shiny);
                const balls = [...new Set(entries.map((e: any) => e.ball).filter(Boolean))];
                const bestNatures = getBestNatures(s);
                const isPerfect = entries.some((e: any) => {
                  const allMaxIVs = [e.iv_hp, e.iv_attack, e.iv_defense, e.iv_speed, e.iv_sp_attack, e.iv_sp_defense]
                    .every((iv: number) => iv === 31);
                  return allMaxIVs && bestNatures.includes(e.nature);
                });

                // Compute lens data for this species
                const allEntries = collectionMap.get(s.id) || [];
                const ribbonSet = new Set<number>();
                const markSet = new Set<number>();
                for (const e of allEntries) {
                  try { for (const r of JSON.parse(e.ribbons || '[]')) ribbonSet.add(r); } catch {}
                  try { for (const m of JSON.parse(e.marks || '[]')) markSet.add(m); } catch {}
                }
                const allBalls = new Set(allEntries.map((e: any) => e.ball).filter(Boolean));
                const allAbilities = new Set(allEntries.map((e: any) => e.ability).filter(Boolean));
                const totalAbilities = [s.ability1, s.ability2, s.hidden_ability].filter(Boolean).length;
                const hasPerfect = allEntries.some((e: any) =>
                  e.iv_hp === 31 && e.iv_attack === 31 && e.iv_defense === 31 &&
                  e.iv_sp_attack === 31 && e.iv_sp_defense === 31 && e.iv_speed === 31
                );
                const genders = new Set(allEntries.map((e: any) => e.gender).filter(Boolean));
                const teraType = (allEntries.find((e: any) => e.tera_type)?.tera_type as string | undefined) ?? null;
                const teraColor = teraType ? (teraPalette[teraType] ?? teraPalette[teraType.toLowerCase()] ?? null) : null;
                const hasAlpha = allEntries.some((e: any) =>
                  (e.is_alpha === 1 || e.is_alpha === true) && e.origin_game === 'legends-arceus'
                );
                const lensData = {
                  ribbonCount: ribbonSet.size,
                  markCount: markSet.size,
                  ballCount: allBalls.size,
                  originMarks: (() => {
                    // Deduplicate by mark, keep one representative game per mark
                    const markToGame = new Map<string, string>();
                    for (const e of allEntries) {
                      if (!e.origin_game) continue;
                      const mark = GAME_TO_MARK[e.origin_game] || 'None';
                      if (!markToGame.has(mark)) markToGame.set(mark, e.origin_game);
                    }
                    return [...markToGame.entries()].map(([mark, game]) => ({ mark, game }));
                  })(),
                  abilityCount: allAbilities.size,
                  totalAbilities,
                  hasPerfect,
                  entries: allEntries,
                  teraType,
                  teraColor,
                  hasAlpha,
                };

                return (
                  <PokemonCard
                    key={isFormItem ? `form-${formId}` : s.id}
                    species={s}
                    caught={!shinyMode && (caughtStatus?.caught ?? false)}
                    shinyCaught={caughtStatus?.shinyCaught ?? false}
                    shinyMode={shinyMode}
                    balls={balls}
                    isPerfect={isPerfect}
                    originGame={entries[0]?.origin_game}
                    sourceSave={entries[0]?.source_save}
                    genderRate={s.gender_rate}
                    genders={genders}
                    lens={lens}
                    lensData={lensData}
                    formName={isFormItem ? s._formName : undefined}
                    formCategory={isFormItem ? s._formCategory : undefined}
                    spriteStyle={listStyle}
                    onClick={() => onSelect(s)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
