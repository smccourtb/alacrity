// client/src/components/pokemon/PokemonSlot.tsx

import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoveTag } from "./MoveTag"
import { BallIcon } from "@/components/icons"
import { spriteUrl } from "./sprites"

const SIZES = {
  "2xs": { px: 16, className: "size-4", imgClass: "size-3" },
  xs: { px: 20, className: "size-5", imgClass: "size-4" },
  sm: { px: 28, className: "size-7", imgClass: "size-6" },
  md: { px: 40, className: "size-10", imgClass: "size-8" },
  lg: { px: 80, className: "size-20", imgClass: "size-16" },
  xl: { px: 96, className: "size-24", imgClass: "size-20" },
} as const

export type SlotSize = keyof typeof SIZES

export interface StatSpread {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
}

export interface SlotPokemon {
  species_id: number
  name: string
  level?: number
  is_shiny?: boolean
  is_egg?: boolean
  moves?: string[]
  sprite_url?: string | null
  nature?: string
  ability?: string
  ball?: string
  has_pokerus?: boolean
  ivs?: StatSpread
  evs?: StatSpread
}

interface PokemonSlotProps {
  pokemon: SlotPokemon | null
  size?: SlotSize
  tooltip?: "none" | "name" | "summary" | "full"
  showLevel?: boolean
  showShiny?: boolean
  onClick?: () => void
  className?: string
  moveTypeMap?: Map<string, string>
}

// Nature stat modifiers (same as SummaryCard)
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
}

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const

function PokemonSlot({
  pokemon,
  size = "sm",
  tooltip = "name",
  showLevel = false,
  showShiny = true,
  onClick,
  className,
  moveTypeMap,
}: PokemonSlotProps) {
  const sizeConfig = SIZES[size]
  const isSmall = size === "2xs" || size === "xs"

  if (!pokemon) {
    return (
      <div
        className={cn(
          "rounded-md bg-surface-sunken/50",
          sizeConfig.className,
          className
        )}
      />
    )
  }

  const isShiny = pokemon.is_shiny ?? false
  const isEgg = pokemon.is_egg ?? false
  const hasSprite = pokemon.species_id > 0 && !isEgg
  const src = pokemon.sprite_url || spriteUrl(pokemon.species_id, isShiny)

  const slot = (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-md bg-surface-sunken",
        sizeConfig.className,
        isShiny && "ring-1 ring-amber-400/60 bg-amber-50/60",
        (onClick || tooltip === "full") && "cursor-pointer hover:bg-surface-sunken/80 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {hasSprite ? (
        <img
          src={src}
          alt={pokemon.name}
          className={cn(sizeConfig.imgClass, "object-contain", !isShiny && "[image-rendering:pixelated]")}
          loading="lazy"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = "none"
          }}
        />
      ) : (
        <span className="text-2xs font-medium text-muted-foreground">
          {isEgg ? 'Egg' : pokemon.name.slice(0, 3)}
        </span>
      )}
      {showLevel && pokemon.level && !isSmall && !isEgg && (
        <span className="absolute -bottom-0.5 -right-0.5 flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-card text-2xs font-bold font-mono text-muted-foreground/70 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] px-[2px]">
          {pokemon.level}
        </span>
      )}
      {showShiny && isShiny && !isSmall && (
        <span className="absolute -top-0.5 -left-0.5 text-2xs text-amber-500 leading-none">&#10022;</span>
      )}
    </div>
  )

  if (tooltip === "none") return slot

  // Use a popover for "full" — hover on desktop, click on mobile
  if (tooltip === "full") {
    return (
      <Popover>
        <PopoverTrigger openOnHover delay={200} closeDelay={300} render={slot} />
        <PopoverContent side="top" sideOffset={6} className="w-auto max-w-72 p-0">
          <SlotPopoverContent pokemon={pokemon} moveTypeMap={moveTypeMap} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger render={slot} />
      <TooltipContent className="text-sm">
        <SlotTooltip pokemon={pokemon} level={tooltip} />
      </TooltipContent>
    </Tooltip>
  )
}

function SlotTooltip({
  pokemon,
  level,
}: {
  pokemon: SlotPokemon
  level: "name" | "summary"
}) {
  if (pokemon.is_egg) {
    return <span>Egg</span>
  }

  if (level === "name") {
    return (
      <span className="capitalize">
        {pokemon.name}
        {pokemon.level ? ` Lv.${pokemon.level}` : ""}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold capitalize">{pokemon.name}</span>
      <span className="text-xs text-muted-foreground">
        Lv. {pokemon.level}
        {pokemon.is_shiny && <span className="text-amber-500 ml-1">★ Shiny</span>}
      </span>
    </div>
  )
}

/** Compact Pokemon detail popover — shows nature, ability, IVs, EVs, ball, pokerus, moves */
function SlotPopoverContent({
  pokemon,
  moveTypeMap,
}: {
  pokemon: SlotPokemon
  moveTypeMap?: Map<string, string>
}) {
  if (pokemon.is_egg) {
    return <div className="px-3 py-2 text-sm">Egg</div>
  }

  const natureMod = pokemon.nature ? NATURE_STATS[pokemon.nature] : undefined
  const hasExtras = pokemon.nature || pokemon.ability || pokemon.ball || pokemon.ivs

  return (
    <div className="flex flex-col gap-0 text-xs">
      {/* Header: name + level + ball */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {pokemon.ball && (
            <BallIcon name={pokemon.ball} size="sm" />
          )}
          <span className="font-bold text-sm capitalize truncate">{pokemon.name}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {pokemon.level != null && (
            <span className="text-muted-foreground">Lv.{pokemon.level}</span>
          )}
          {pokemon.is_shiny && (
            <span className="text-amber-500">★</span>
          )}
          {pokemon.has_pokerus && (
            <span className="text-fuchsia-500 font-bold" title="Pokérus">☣</span>
          )}
        </div>
      </div>

      {/* Nature + Ability row */}
      {(pokemon.nature || pokemon.ability) && (
        <div className="flex items-center gap-1.5 px-3 pb-1.5 flex-wrap">
          {pokemon.nature && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              {pokemon.nature}
              {natureMod && (
                <span className="opacity-60 text-2xs">+{natureMod.plus} −{natureMod.minus}</span>
              )}
            </span>
          )}
          {pokemon.ability && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
              {pokemon.ability.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          )}
        </div>
      )}

      {/* IVs */}
      {pokemon.ivs && (
        <div className="px-3 pb-1">
          <div className="grid grid-cols-6 gap-px text-center">
            {STAT_LABELS.map((label) => (
              <span key={label} className="text-2xs text-muted-foreground/60 font-medium">{label}</span>
            ))}
            {STAT_KEYS.map((key) => {
              const v = pokemon.ivs![key]
              return (
                <span
                  key={key}
                  className={cn(
                    "font-mono font-bold text-2xs",
                    v === 31 && "text-green-600",
                    v === 0 && "text-red-400",
                    v > 0 && v < 31 && "text-foreground/70"
                  )}
                >
                  {v}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* EVs — only if nonzero */}
      {pokemon.evs && (pokemon.evs.hp + pokemon.evs.atk + pokemon.evs.def + pokemon.evs.spa + pokemon.evs.spd + pokemon.evs.spe) > 0 && (
        <div className="px-3 pb-1">
          <div className="grid grid-cols-6 gap-px text-center">
            {STAT_KEYS.map((key) => {
              const v = pokemon.evs![key]
              return (
                <span
                  key={key}
                  className={cn(
                    "font-mono text-2xs",
                    v >= 252 ? "text-purple-600 font-bold" : v > 0 ? "text-foreground/50" : "text-foreground/20"
                  )}
                >
                  {v}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Moves */}
      {pokemon.moves && pokemon.moves.length > 0 && (
        <div className="flex flex-wrap gap-0.5 px-3 pt-0.5 pb-2.5">
          {pokemon.moves.map((move, i) => (
            <MoveTag key={i} name={move} type={moveTypeMap?.get(move)} size="xs" />
          ))}
        </div>
      )}

      {/* Fallback if no extras at all — just show name line */}
      {!hasExtras && !pokemon.moves?.length && (
        <div className="pb-1.5" />
      )}
    </div>
  )
}

export { PokemonSlot }
export type { PokemonSlotProps }
