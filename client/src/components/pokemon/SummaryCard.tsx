import { BallIcon, OriginMark, GamePill, TypePill } from '@/components/icons';
import { TYPE_COLORS } from '@/lib/pokemon-constants';
import InlineEdit from './InlineEdit';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { MoreVertical } from 'lucide-react';
import { Sprite, type PokemonStyle } from '@/components/Sprite';
import { useSpritePrefs } from '@/hooks/useSpritePrefs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

const GAME_SPRITE_STYLE: Record<string, PokemonStyle> = {
  'Red': 'gen1-red-blue',
  'Blue': 'gen1-red-blue',
  'Yellow': 'gen1-yellow',
  'Gold': 'gen2-gold',
  'Silver': 'gen2-silver',
  'Crystal': 'gen2-crystal',
  'Ruby': 'gen3-ruby-sapphire',
  'Sapphire': 'gen3-ruby-sapphire',
  'Emerald': 'gen3-emerald',
  'FireRed': 'gen3-firered-leafgreen',
  'LeafGreen': 'gen3-firered-leafgreen',
  'Diamond': 'gen4-diamond-pearl',
  'Pearl': 'gen4-diamond-pearl',
  'Platinum': 'gen4-platinum',
  'HeartGold': 'gen4-heartgold-soulsilver',
  'SoulSilver': 'gen4-heartgold-soulsilver',
  'Black': 'gen5-black-white',
  'White': 'gen5-black-white',
};

// Nature stat modifiers
const NATURE_STATS: Record<string, { plus: string; minus: string }> = {
  Adamant: { plus: 'Atk', minus: 'SpA' },
  Bold: { plus: 'Def', minus: 'Atk' },
  Brave: { plus: 'Atk', minus: 'Spe' },
  Calm: { plus: 'SpD', minus: 'Atk' },
  Careful: { plus: 'SpD', minus: 'SpA' },
  Gentle: { plus: 'SpD', minus: 'Def' },
  Hasty: { plus: 'Spe', minus: 'Def' },
  Impish: { plus: 'Def', minus: 'SpA' },
  Jolly: { plus: 'Spe', minus: 'SpA' },
  Lax: { plus: 'Def', minus: 'SpD' },
  Lonely: { plus: 'Atk', minus: 'Def' },
  Mild: { plus: 'SpA', minus: 'Def' },
  Modest: { plus: 'SpA', minus: 'Atk' },
  Naive: { plus: 'Spe', minus: 'SpD' },
  Naughty: { plus: 'Atk', minus: 'SpD' },
  Quiet: { plus: 'SpA', minus: 'Spe' },
  Rash: { plus: 'SpA', minus: 'SpD' },
  Relaxed: { plus: 'Def', minus: 'Spe' },
  Sassy: { plus: 'SpD', minus: 'Spe' },
  Timid: { plus: 'Spe', minus: 'Atk' },
};

// Hidden Power type calculation from IVs
function getHiddenPowerType(ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }): string {
  const types = ['Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark'];
  const a = ivs.hp % 2, b = ivs.atk % 2, c = ivs.def % 2, d = ivs.spe % 2, e = ivs.spa % 2, f = ivs.spd % 2;
  const index = Math.floor((a + 2*b + 4*c + 8*d + 16*e + 32*f) * 15 / 63);
  return types[index] || 'Dark';
}

interface Props {
  entry: any;
  species: any;
  onUpdate: (data: any) => void;
  onBallClick: () => void;
}

export default function SummaryCard({ entry, species, onUpdate, onBallClick }: Props) {
  const navigate = useNavigate();
  const { style: prefStyle } = useSpritePrefs();
  const natureMod = NATURE_STATS[entry.nature];
  const type1Color = TYPE_COLORS[(species?.type1 ?? '').toLowerCase()] ?? '#a8a878';

  // IVs for hidden power
  const ivs = {
    hp: entry.iv_hp ?? 0, atk: entry.iv_attack ?? 0, def: entry.iv_defense ?? 0,
    spa: entry.iv_sp_attack ?? 0, spd: entry.iv_sp_defense ?? 0, spe: entry.iv_speed ?? 0,
  };
  const hasIVs = Object.values(ivs).some(v => v > 0);
  const hiddenPower = hasIVs ? getHiddenPowerType(ivs) : null;

  // EVs
  const evs = {
    hp: entry.ev_hp ?? 0, atk: entry.ev_attack ?? 0, def: entry.ev_defense ?? 0,
    spa: entry.ev_sp_attack ?? 0, spd: entry.ev_sp_defense ?? 0, spe: entry.ev_speed ?? 0,
  };
  const totalEvs = Object.values(evs).reduce((a, b) => a + b, 0);

  // Use game-specific sprite if available, otherwise fall back to user pref
  const gameStyle = entry.origin_game ? GAME_SPRITE_STYLE[entry.origin_game] : undefined;
  const spriteStyle: PokemonStyle = gameStyle ?? prefStyle;

  const handleShowOnPlayPage = () => {
    if (entry.save_file_id == null) return;
    const params = new URLSearchParams();
    params.set('save', String(entry.save_file_id));
    if (entry.game) params.set('game', String(entry.game));
    if (entry.playthrough_id != null) params.set('pt', String(entry.playthrough_id));
    navigate(`/play?${params.toString()}`);
  };

  const handleCopySaveFile = async () => {
    if (!entry.save_file_path) return;
    try {
      await invoke('copy_file_to_clipboard', { path: entry.save_file_path });
    } catch (err: any) {
      window.alert(`Failed to copy save file: ${err?.toString?.() ?? 'unknown error'}`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg p-4 border border-border/50 mb-3">
      <div className="flex gap-3 mb-3">
        {/* Sprite with ball badge */}
        <div className="relative flex-shrink-0">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${type1Color}18, ${type1Color}08)` }}
          >
            {species?.id != null && (
              <Sprite
                kind="pokemon"
                id={species.id}
                shiny={!!entry.is_shiny}
                style={spriteStyle}
                size={72}
                className="w-[72px] h-[72px]"
              />
            )}
          </div>
          <button
            onClick={onBallClick}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center hover:scale-110 transition-transform"
            title="Change ball"
          >
            <BallIcon name={entry.ball || 'Poke Ball'} size="sm" />
          </button>
        </div>

        {/* Name, level, pills */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1.5">
            <InlineEdit
              value={entry.nickname || ''}
              placeholder={capitalize(species?.name || '—')}
              onSave={v => onUpdate({ nickname: v })}
              className="text-base font-extrabold capitalize"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Lv.<InlineEdit
                value={String(entry.level || '')}
                type="number"
                onSave={v => onUpdate({ level: parseInt(v) || null })}
                className="text-xs font-bold"
              />
            </span>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {entry.origin_game && (
              <GamePill game={entry.origin_game} size="sm" />
            )}
            {entry.nature && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold">
                {entry.nature}
                {natureMod && (
                  <span className="text-2xs opacity-60">+{natureMod.plus} −{natureMod.minus}</span>
                )}
              </span>
            )}
            {entry.ability && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${
                entry.ability === species?.hidden_ability
                  ? 'bg-pink-50 text-pink-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {entry.ability}{entry.ability === species?.hidden_ability ? ' (HA)' : ''}
              </span>
            )}
            {entry.held_item && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-semibold capitalize">
                {entry.held_item}
              </span>
            )}
            {hiddenPower && (
              <TypePill type={hiddenPower} size="sm" tooltip={`Hidden Power: ${hiddenPower}`} />
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate({ is_shiny: entry.is_shiny ? 0 : 1 })}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-all ${
                entry.is_shiny
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-white text-muted-foreground/40 border-muted-foreground/10'
              }`}
            >
              ✦ Shiny
            </button>
            <button
              onClick={() => onUpdate({ has_pokerus: entry.has_pokerus ? 0 : 1 })}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-all ${
                entry.has_pokerus
                  ? 'bg-purple-50 text-purple-600 border-purple-200'
                  : 'bg-white text-muted-foreground/40 border-muted-foreground/10'
              }`}
            >
              ☣ Pokérus
            </button>
          </div>
        </div>
      </div>

      {/* Trainer row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border/30">
        <span>
          <span className="font-bold text-muted-foreground/40">OT</span>{' '}
          <InlineEdit
            value={entry.ot_name || ''}
            placeholder="—"
            onSave={v => onUpdate({ ot_name: v })}
            className="text-xs"
          />
        </span>
        <span>
          <span className="font-bold text-muted-foreground/40">TID</span>{' '}
          <InlineEdit
            value={entry.ot_tid || ''}
            placeholder="—"
            onSave={v => onUpdate({ ot_tid: v })}
            className="text-xs"
          />
        </span>
        <span>
          <span className="font-bold text-muted-foreground/40">SID</span>{' '}
          <InlineEdit
            value={entry.ot_sid || ''}
            placeholder="—"
            onSave={v => onUpdate({ ot_sid: v })}
            className="text-xs"
          />
        </span>
      </div>

      {/* IV spread */}
      {hasIVs && (
        <div className="flex flex-wrap gap-1.5 text-2xs mt-2 pt-2 border-t border-border/30">
          <span className="font-bold text-muted-foreground/40">IVs</span>
          {[
            { label: 'HP', val: ivs.hp },
            { label: 'Atk', val: ivs.atk },
            { label: 'Def', val: ivs.def },
            { label: 'SpA', val: ivs.spa },
            { label: 'SpD', val: ivs.spd },
            { label: 'Spe', val: ivs.spe },
          ].map(s => (
            <span key={s.label} className={`px-1.5 py-0.5 rounded ${s.val === 31 ? 'bg-green-50 text-green-600 font-bold' : s.val === 0 ? 'bg-red-50 text-red-500 font-bold' : 'text-muted-foreground/60'}`}>
              {s.val} {s.label}
            </span>
          ))}
        </div>
      )}

      {/* EV spread */}
      {totalEvs > 0 && (
        <div className="flex flex-wrap gap-1.5 text-2xs mt-1.5">
          <span className="font-bold text-muted-foreground/40">EVs</span>
          {evs.hp > 0 && <span className="text-muted-foreground/60">{evs.hp} HP</span>}
          {evs.atk > 0 && <span className="text-muted-foreground/60">{evs.atk} Atk</span>}
          {evs.def > 0 && <span className="text-muted-foreground/60">{evs.def} Def</span>}
          {evs.spa > 0 && <span className="text-muted-foreground/60">{evs.spa} SpA</span>}
          {evs.spd > 0 && <span className="text-muted-foreground/60">{evs.spd} SpD</span>}
          {evs.spe > 0 && <span className="text-muted-foreground/60">{evs.spe} Spe</span>}
          <span className="text-muted-foreground/20">({totalEvs}/510)</span>
        </div>
      )}

      {/* Save file link */}
      <div className="mt-2 pt-2 border-t border-border/30">
        {entry.save_filename || entry.source_save ? (
          (() => {
            const rawPath: string | null = entry.save_file_path ?? null;
            const fileName: string | null = entry.save_filename ?? entry.source_save ?? null;
            // Pretty label: the parent directory name (e.g. "Red" from
            // ".../saves/library/Red/pokemon_red.sav"). Fall back to the
            // filename if the path doesn't split usefully.
            const parts = rawPath ? rawPath.split(/[\\/]/).filter(Boolean) : [];
            const parentDir = parts.length >= 2 ? parts[parts.length - 2] : null;
            const title = parentDir ?? fileName ?? 'Save file';
            return (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 text-xs">
            <span>💾</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground/80 truncate">{title}</span>
                {entry.unique_key ? (
                  <span className="shrink-0 text-2xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">synced</span>
                ) : entry.source_save ? (
                  <span className="shrink-0 text-2xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">kept</span>
                ) : null}
              </div>
              {fileName && <div className="text-muted-foreground/40 truncate">{fileName}</div>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded"
                aria-label="Save file actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={handleShowOnPlayPage}
                  disabled={entry.save_file_id == null}
                >
                  Show on Play page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopySaveFile}
                  disabled={!entry.save_file_path}
                >
                  Copy save file
                </DropdownMenuItem>
                {entry.source === 'manual' && (
                  <DropdownMenuItem
                    onClick={() => onUpdate({ source_save: null, checkpoint_id: null })}
                    className="text-red-600 focus:text-red-600"
                  >
                    Unlink
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
            );
          })()
        ) : (
          <div
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-muted/20 text-xs text-muted-foreground/50"
            title={
              entry.source === 'manual'
                ? 'Manual entries are not backed by a save file'
                : 'No save file linked to this entry'
            }
          >
            <span className="opacity-60">💾</span>
            <span className="font-semibold">
              {entry.source === 'manual' ? 'Manual entry — no save file' : 'No save file linked'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
