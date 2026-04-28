import { TYPE_COLORS } from '@/lib/pokemon-constants';
import { BallIcon, ShinyIcon, GenderIcon, OriginMark } from '@/components/icons';
import { Sprite, type PokemonStyle } from '@/components/Sprite';
import { TeraLens } from '@/components/pokedex/lenses/TeraLens';
import { AlphaLens } from '@/components/pokedex/lenses/AlphaLens';

interface Props {
  species: any;
  caught: boolean;
  shinyCaught: boolean;
  shinyMode: boolean;
  balls: string[];
  isPerfect: boolean;
  originGame?: string;
  sourceSave?: string;
  genderRate?: number;
  genders?: Set<string>;
  lens?: string;
  lensData?: {
    ribbonCount: number;
    markCount: number;
    ballCount: number;
    originMarks: { mark: string; game: string }[];
    abilityCount: number;
    totalAbilities: number;
    hasPerfect: boolean;
    entries?: any[];
  };
  formName?: string;
  formCategory?: string;
  spriteStyle?: PokemonStyle;
  onClick: () => void;
}

export default function PokemonCard({ species, caught, shinyCaught, shinyMode, balls, isPerfect, genderRate, genders, lens, lensData, formName, formCategory, spriteStyle, onClick }: Props) {
  const isCaught = shinyMode ? shinyCaught : caught;
  const hasShinyEntry = shinyCaught;

  const effectiveStyle: PokemonStyle = spriteStyle ?? 'box';

  // Type-tinted background gradient
  const type1Color = TYPE_COLORS[species.type1] || '#a8a878';
  const type2Color = species.type2 ? (TYPE_COLORS[species.type2] || type1Color) : type1Color;

  // Gender display
  const isGenderless = genderRate === -1;
  const isAlwaysMale = genderRate === 0;
  const isAlwaysFemale = genderRate === 8;

  // Ball overflow: show max 3, then +N
  const visibleBalls = balls.slice(0, 3);
  const extraBalls = balls.length - 3;

  // Card shadow — gold glow for shiny
  const cardShadow = isCaught && hasShinyEntry
    ? 'shadow-[0_2px_10px_rgba(234,179,8,0.15),_0_1px_4px_rgba(0,0,0,0.04)]'
    : 'shadow-soft-sm';

  return (
    <div
      className={`relative bg-white rounded-lg ${cardShadow} overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md`}
      onClick={onClick}
    >
      {lens === 'tera' && lensData?.entries && (
        <TeraLens speciesId={species.id} entries={lensData.entries} />
      )}
      {lens === 'alpha' && lensData?.entries && (
        <AlphaLens entries={lensData.entries} />
      )}

      {/* Form count badge for national mode */}
      {(() => {
        if (formName || !species.forms) return null;
        const count = species.forms.filter((f: any) => f.is_collectible).length;
        return count > 1 ? (
          <span className="absolute top-1.5 right-1.5 text-2xs font-bold text-muted-foreground/40 bg-muted/40 rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        ) : null;
      })()}

      {/* Gold top edge for shiny */}
      {isCaught && hasShinyEntry && (
        <div className="h-[2px] bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500" />
      )}
      {formName && formName !== 'Standard' && (
        <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-blue-400/30" />
      )}

      {/* Top half: sprite area */}
      <div className={!isCaught ? 'opacity-[0.22]' : undefined}>
        <div className="px-2 pt-2 pb-1">
          {/* Indicator row */}
          <div className="flex justify-between px-0.5 mb-1" style={{ minHeight: '13px' }}>
            {isCaught && isPerfect ? (
              <span className="text-2xs font-extrabold text-green-500" title="Perfect IVs + Nature">★</span>
            ) : <span className="text-2xs opacity-0">.</span>}
            {hasShinyEntry ? (
              <ShinyIcon size="sm" />
            ) : <span className="text-2xs opacity-0">.</span>}
          </div>

          {/* Sprite on type-tinted background */}
          <div
            className="w-[68px] h-[68px] mx-auto mb-1 rounded-lg flex items-center justify-center"
            style={{
              background: isCaught
                ? `linear-gradient(135deg, ${type1Color}18, ${type2Color}0d)`
                : 'rgba(0,0,0,0.04)',
            }}
          >
            <Sprite
              kind="pokemon"
              id={species.id}
              shiny={shinyMode}
              style={effectiveStyle}
              size={64}
              alt={species.name}
              className={`w-16 h-16${!isCaught ? ' [filter:brightness(0)] opacity-80' : ''}`}
            />
          </div>

          {/* Gender — show all possible, grey out missing */}
          <div className="text-center flex justify-center items-center" style={{ minHeight: '13px' }}>
            {isGenderless ? (
              <span className={!isCaught ? 'opacity-15' : ''}>
                <GenderIcon gender="genderless" size="sm" />
              </span>
            ) : isAlwaysMale ? (
              <span className={!isCaught ? 'opacity-15' : ''}>
                <GenderIcon gender="male" size="sm" />
              </span>
            ) : isAlwaysFemale ? (
              <span className={!isCaught ? 'opacity-15' : ''}>
                <GenderIcon gender="female" size="sm" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <span className={!genders?.has('male') ? 'opacity-15 grayscale' : ''}>
                  <GenderIcon gender="male" size="sm" />
                </span>
                <span className={!genders?.has('female') ? 'opacity-15 grayscale' : ''}>
                  <GenderIcon gender="female" size="sm" />
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pokeball divider */}
      <div className={`relative h-3 flex items-center ${!isCaught ? 'opacity-[0.22]' : ''}`}>
        <div className="flex-1 h-[1.5px] bg-surface-pressed" />
        <div className="w-[10px] h-[10px] rounded-full border-[1.5px] border-surface-pressed bg-white flex items-center justify-center relative z-[1]">
          <div className={`w-1 h-1 rounded-full ${
            isCaught && hasShinyEntry ? 'bg-yellow-500' : 'bg-muted-foreground/30'
          }`} />
        </div>
        <div className="flex-1 h-[1.5px] bg-surface-pressed" />
      </div>

      {/* Bottom half: info area */}
      <div className={`px-2 pb-2.5 pt-0.5 text-center ${!isCaught ? 'opacity-[0.22]' : ''}`}>
        <div className="text-2xs font-mono text-muted-foreground/50 tracking-wider">
          #{String(species.id).padStart(3, '0')}
        </div>
        <div className="text-sm font-extrabold capitalize truncate">{species.name}</div>
        {formName && formName !== 'Standard' && (
          <div className="text-2xs font-semibold text-muted-foreground/60 truncate -mt-0.5">
            {formName}
          </div>
        )}

        {/* Lens-specific data below name */}
        {isCaught && lens && lens !== 'national' && (
          <div className="text-center mt-1">
            {lens === 'ribbon' && (
              <span className="text-xs font-bold text-purple-600">{lensData?.ribbonCount || 0}/93</span>
            )}
            {lens === 'mark' && (
              <span className="text-xs font-bold text-orange-600">{lensData?.markCount || 0}/54</span>
            )}
            {lens === 'ball' && (
              <span className="text-xs font-bold text-sky-600">{lensData?.ballCount || 0}/28</span>
            )}
            {lens === 'origin' && lensData?.originMarks && lensData.originMarks.length > 0 && (
              <div className="flex justify-center gap-0.5">
                {lensData.originMarks.slice(0, 4).map((om, i) => (
                  <OriginMark key={i} game={om.game} size="sm" />
                ))}
                {lensData.originMarks.length > 4 && (
                  <span className="text-2xs text-muted-foreground/50 font-semibold">+{lensData.originMarks.length - 4}</span>
                )}
              </div>
            )}
            {lens === 'ability' && (
              <span className="text-xs font-bold text-pink-600">{lensData?.abilityCount || 0}/{lensData?.totalAbilities || '?'}</span>
            )}
            {lens === 'iv' && lensData?.hasPerfect && (
              <span className="text-xs font-bold text-green-600">★ Perfect</span>
            )}
          </div>
        )}

        {/* Original ball display for national lens */}
        {isCaught && (!lens || lens === 'national') && visibleBalls.length > 0 && (
          <div className="flex justify-center items-center gap-0.5 mt-1">
            {visibleBalls.map((ball, i) => (
              <BallIcon key={i} name={ball} size="sm" tooltip />
            ))}
            {extraBalls > 0 && (
              <span className="text-2xs text-muted-foreground/50 font-semibold">+{extraBalls}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
