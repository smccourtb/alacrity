import { BallIcon, ShinyIcon, GamePill, MovePill, PokerusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

type PokemonEntry = {
  id: number;
  level: number | null;
  nature: string | null;
  ability: string | null;
  ball: string | null;
  origin_game: string | null;
  ot_name: string | null;
  ot_tid: string | null;
  is_shiny: boolean;
  has_pokerus: boolean;
  nickname: string | null;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  save_file_id: number | null;
  save_filename: string | null;
  save_notes: string | null;
  [key: string]: any;
};

export default function HaveColumn({
  entries,
  onEdit,
  onDelete,
}: {
  entries: PokemonEntry[];
  speciesName?: string;
  onEdit: (entry: PokemonEntry) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Have <span className="font-normal">({entries.length})</span>
      </div>

      {entries.length === 0 && (
        <div className="text-xs text-muted-foreground py-3">Not in collection yet.</div>
      )}

      <div className="space-y-2">
        {entries.map((e) => {
          const moves = [e.move1, e.move2, e.move3, e.move4].filter(Boolean);
          return (
            <div
              key={e.id}
              className={`rounded-xl p-3 shadow-soft-sm ${
                e.is_shiny ? 'border-l-3 border-l-yellow-400' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {e.is_shiny && <ShinyIcon size="sm" />}
                  {e.has_pokerus && <PokerusIcon size="sm" />}
                  <span>Lv {e.level || '?'}</span>
                  <BallIcon name={e.ball || 'Poke Ball'} size="sm" />
                  {e.origin_game && <GamePill game={e.origin_game} size="sm" />}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => onEdit(e)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-destructive" onClick={() => onDelete(e.id)}>Del</Button>
                </div>
              </div>

              <div className="flex gap-3 text-xs text-muted-foreground">
                {e.nature && <span>{e.nature}</span>}
                {e.ot_name && <span>OT: {e.ot_name}</span>}
              </div>

              {moves.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {moves.map((m, i) => (
                    <MovePill key={i} name={m!} size="sm" />
                  ))}
                </div>
              )}

              {e.save_filename && (
                <div className="mt-1.5">
                  <span className="text-xs text-blue-500">
                    💾 {e.save_notes || e.save_filename}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
