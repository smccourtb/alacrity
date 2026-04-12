// client/src/components/pokemon/BoxGrid.tsx

import * as React from "react"
import { cn } from "@/lib/utils"
import { PokemonSlot, type SlotPokemon, type SlotSize } from "./PokemonSlot"
import { useMoveTypes } from "./useMoveTypes"

/** Structured box data (pre-grouped) */
interface BoxData {
  name: string
  pokemon: (SlotPokemon | null)[]
}

/** Flat box member with `.box` index (from snapshot API) */
interface BoxMember extends SlotPokemon {
  box: number
}

interface BoxGridProps {
  /** Pre-grouped boxes */
  boxes?: BoxData[]
  /** Flat array — auto-grouped by `.box` field */
  pokemon?: BoxMember[]
  slotSize?: SlotSize
  tooltip?: "none" | "name" | "summary" | "full"
  columns?: number
  maxBoxes?: number
  className?: string
}

function BoxGrid({
  boxes: boxesProp,
  pokemon: pokemonProp,
  slotSize = "sm",
  tooltip = "full",
  columns = 5,
  maxBoxes,
  className,
}: BoxGridProps) {
  // Normalize: convert flat BoxMember[] to BoxData[]
  const boxes: BoxData[] = React.useMemo(() => {
    if (boxesProp) return boxesProp;
    if (!pokemonProp || pokemonProp.length === 0) return [];

    const map = new Map<number, BoxMember[]>();
    for (const p of pokemonProp) {
      if (!map.has(p.box)) map.set(p.box, []);
      map.get(p.box)!.push(p);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([num, mons]) => ({ name: `Box ${num + 1}`, pokemon: mons }));
  }, [boxesProp, pokemonProp]);

  const allMoves = (pokemonProp ?? boxes.flatMap(b => b.pokemon))
    .flatMap((p: any) => p?.moves ?? [])
    .filter(Boolean);
  const moveTypeMap = useMoveTypes(allMoves);

  const nonEmpty = boxes.filter((b) => b.pokemon.some(Boolean))
  const visible = maxBoxes ? nonEmpty.slice(0, maxBoxes) : nonEmpty
  const overflow = maxBoxes ? Math.max(0, nonEmpty.length - maxBoxes) : 0

  // Count totals
  const allPokemon = visible.flatMap(b => b.pokemon).filter(Boolean)
  const totalCount = allPokemon.length
  const shinyCount = allPokemon.filter((p: any) => p?.is_shiny).length

  if (totalCount === 0) return null

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Box Pokemon
        </span>
        <span className="text-xs text-muted-foreground/60">
          {totalCount} total{shinyCount > 0 ? `, ${shinyCount} shiny` : ''}
        </span>
      </div>
      {visible.map((box, i) => (
        <div key={i}>
          <div className="mb-0.5 text-2xs font-medium text-muted-foreground/50">{box.name}</div>
          <div
            className="flex flex-wrap gap-1"
          >
            {box.pokemon.map((p, j) => (
              <PokemonSlot
                key={j}
                pokemon={p}
                size={slotSize}
                tooltip={p ? tooltip : "none"}
                showLevel={false}
                moveTypeMap={moveTypeMap}
              />
            ))}
          </div>
        </div>
      ))}
      {overflow > 0 && (
        <div className="text-2xs text-muted-foreground/50 font-medium">
          +{overflow} more {overflow === 1 ? "box" : "boxes"}
        </div>
      )}
    </div>
  )
}

export { BoxGrid }
export type { BoxGridProps, BoxData, BoxMember }
