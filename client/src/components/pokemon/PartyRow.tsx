// client/src/components/pokemon/PartyRow.tsx

import * as React from "react"
import { cn } from "@/lib/utils"
import { PokemonSlot, type SlotPokemon, type SlotSize } from "./PokemonSlot"
import { useMoveTypes } from "./useMoveTypes"

interface PartyRowProps {
  party: (SlotPokemon | null)[]
  size?: SlotSize
  tooltip?: "none" | "name" | "summary" | "full"
  showEmpty?: boolean
  showLevel?: boolean
  className?: string
}

function PartyRow({
  party,
  size = "md",
  tooltip = "full",
  showEmpty = true,
  showLevel = true,
  className,
}: PartyRowProps) {
  const allMoves = party.flatMap(p => p?.moves ?? []).filter(Boolean);
  const moveTypeMap = useMoveTypes(allMoves);

  const slots: (SlotPokemon | null)[] = showEmpty
    ? [...party, ...Array(Math.max(0, 6 - party.length)).fill(null)]
    : party

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {slots.map((p, i) => (
        <PokemonSlot
          key={i}
          pokemon={p}
          size={size}
          tooltip={p ? tooltip : "none"}
          showLevel={showLevel}
          moveTypeMap={moveTypeMap}
        />
      ))}
    </div>
  )
}

export { PartyRow }
export type { PartyRowProps }
