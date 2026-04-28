import { PokemonSlot, type SlotPokemon } from '@/components/pokemon/PokemonSlot';

interface DaycareMon {
  species_id: number;
  name: string;
  is_shiny: boolean;
  level?: number;
  moves?: string[];
  dvs?: { atk: number; def: number; spd: number; spc: number };
}

interface Props {
  info: {
    active?: boolean;
    eggReady?: boolean;
    mon1?: DaycareMon | null;
    mon2?: DaycareMon | null;
    offspringSpeciesId?: number | null;
    offspringName?: string | null;
    shinyOdds?: string | null;
  } | null;
}

function toSlot(mon: DaycareMon | null | undefined): SlotPokemon | null {
  if (!mon) return null;
  return {
    species_id: mon.species_id,
    name: mon.name,
    is_shiny: mon.is_shiny,
    level: mon.level,
    moves: mon.moves ?? [],
  };
}

export default function DaycarePreview({ info }: Props) {
  if (!info?.active) return null;

  const offspring: SlotPokemon | null = info.offspringSpeciesId
    ? {
        species_id: info.offspringSpeciesId,
        name: info.offspringName ?? `#${info.offspringSpeciesId}`,
      }
    : null;

  return (
    <div className="px-2 py-1.5 bg-muted/50 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] uppercase tracking-[0.5px] text-muted-foreground/70 font-bold">
          Daycare
        </div>
        {info.shinyOdds && (
          <div className="text-[10px] text-muted-foreground/70">
            Shiny <span className="text-foreground font-medium">{info.shinyOdds}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <PokemonSlot pokemon={toSlot(info.mon1 ?? null)} size="lg" tooltip="full" />
        <span className="text-muted-foreground/60 text-xs">+</span>
        <PokemonSlot pokemon={toSlot(info.mon2 ?? null)} size="lg" tooltip="full" />
        <span className="text-muted-foreground/60 text-xs ml-0.5">→</span>
        <PokemonSlot pokemon={offspring} size="lg" tooltip="full" />
      </div>
    </div>
  );
}
