// client/src/components/PokemonTable.tsx
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TypePill, BallIcon, ShinyIcon, GamePill, ItemIcon } from '@/components/icons';
import { Sprite, type PokemonStyle } from '@/components/Sprite';
import { useSpritePrefs } from '@/hooks/useSpritePrefs';

interface Props {
  species: any[];
  collection: any[];
  caughtIds: Set<number>;
  shinyCaughtIds: Set<number>;
  shinyMode: boolean;
  onSelect: (species: any) => void;
  lens?: string;
}

function IvCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || (value as unknown) === '') return <span className="text-muted-foreground/20">—</span>;
  const num = Number(value);
  return (
    <span className={`font-mono text-xs font-semibold ${
      num === 31 ? 'text-green-500' : num === 0 ? 'text-red-400' : 'text-foreground/60'
    }`}>
      {num}
    </span>
  );
}


export default function PokemonTable({ species, collection, caughtIds, shinyCaughtIds, shinyMode, onSelect }: Props) {
  const { style, boxEverywhere } = useSpritePrefs();
  const listStyle: PokemonStyle = boxEverywhere ? 'box' : style;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    nature: false,
    ability: false,
    origin_game: false,
    ot_name: false,
    level: false,
    held_item: false,
    source_save: false,
  });

  const collectionMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of collection) {
      if (shinyMode ? p.is_shiny : !p.is_shiny) {
        if (!map.has(p.species_id)) map.set(p.species_id, p);
      }
    }
    return map;
  }, [collection, shinyMode]);

  const data = useMemo(() => {
    return species.map(s => {
      const entry = collectionMap.get(s.id);
      const activeIds = shinyMode ? shinyCaughtIds : caughtIds;
      const isCaught = activeIds.has(s.id);
      const isShiny = shinyCaughtIds.has(s.id);
      return {
        ...s,
        isCaught,
        isShiny,
        entry,
        iv_hp: entry?.iv_hp,
        iv_attack: entry?.iv_attack,
        iv_defense: entry?.iv_defense,
        iv_sp_attack: entry?.iv_sp_attack,
        iv_sp_defense: entry?.iv_sp_defense,
        iv_speed: entry?.iv_speed,
        nature: entry?.nature,
        ability: entry?.ability,
        ball: entry?.ball,
        origin_game: entry?.origin_game,
        ot_name: entry?.ot_name,
        level: entry?.level,
        held_item: entry?.held_item,
        source_save: entry?.source_save,
      };
    });
  }, [species, collectionMap, caughtIds, shinyCaughtIds, shinyMode]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'sprite',
      header: '',
      size: 44,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="w-8 h-8 flex items-center justify-center">
            <Sprite
              kind="pokemon"
              id={s.id}
              shiny={shinyMode}
              style={listStyle}
              size={32}
              alt={s.name}
              className={`w-8 h-8${!s.isCaught ? ' [filter:brightness(0)] opacity-30' : ''}`}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'id',
      header: '#',
      size: 60,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground/50">
          #{String(getValue()).padStart(3, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-bold capitalize text-sm">{s.name}</span>
            {s.isShiny && <ShinyIcon size="sm" />}
            {s.isCaught && s.entry && (() => {
              const allMax = [s.iv_hp, s.iv_attack, s.iv_defense, s.iv_speed, s.iv_sp_attack, s.iv_sp_defense]
                .every((iv: number) => iv === 31);
              return allMax ? <span className="text-2xs font-extrabold text-green-500">★</span> : null;
            })()}
          </div>
        );
      },
    },
    {
      id: 'type',
      header: 'Type',
      size: 80,
      accessorFn: (row: any) => row.type1,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <TypePill type={row.original.type1} variant="icon-only" size="sm" />
          {row.original.type2 && <TypePill type={row.original.type2} variant="icon-only" size="sm" />}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 70,
      accessorFn: (row: any) => row.isCaught ? (row.isShiny ? 2 : 1) : 0,
      cell: ({ row }) => {
        const s = row.original;
        if (!s.isCaught) return <span className="text-2xs text-muted-foreground/30">—</span>;
        if (s.isShiny) {
          return <span className="bg-[rgba(234,179,8,0.1)] text-amber-600 text-2xs font-semibold px-2 py-0.5 rounded-full">Shiny</span>;
        }
        return <span className="bg-[rgba(239,68,68,0.08)] text-red-600 text-2xs font-semibold px-2 py-0.5 rounded-full">Caught</span>;
      },
    },
    { accessorKey: 'iv_hp', header: 'HP', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    { accessorKey: 'iv_attack', header: 'Atk', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    { accessorKey: 'iv_defense', header: 'Def', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    { accessorKey: 'iv_sp_attack', header: 'SpA', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    { accessorKey: 'iv_sp_defense', header: 'SpD', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    { accessorKey: 'iv_speed', header: 'Spe', size: 48, cell: ({ getValue }) => <IvCell value={getValue() as any} /> },
    {
      accessorKey: 'ball',
      header: 'Ball',
      size: 50,
      cell: ({ getValue }) => {
        const ball = getValue() as string;
        if (!ball) return <span className="text-muted-foreground/20">—</span>;
        return <BallIcon name={ball} size="sm" tooltip />;
      },
    },
    { accessorKey: 'nature', header: 'Nature', size: 80, cell: ({ getValue }) => <span className="text-sm capitalize">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'ability', header: 'Ability', size: 100, cell: ({ getValue }) => <span className="text-sm capitalize">{((getValue() as string) || '—').replace(/-/g, ' ')}</span> },
    { accessorKey: 'origin_game', header: 'Game', size: 80, cell: ({ getValue }) => { const g = getValue() as string; return g ? <GamePill game={g} size="sm" /> : <span className="text-muted-foreground/20">—</span>; } },
    { accessorKey: 'ot_name', header: 'OT', size: 70, cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'level', header: 'Lv', size: 40, cell: ({ getValue }) => <span className="text-sm font-mono">{(getValue() as any) || '—'}</span> },
    { accessorKey: 'held_item', header: 'Item', size: 80, cell: ({ getValue }) => { const item = getValue() as string; return item ? <ItemIcon name={item} size="sm" showLabel /> : <span className="text-muted-foreground/20">—</span>; } },
    { accessorKey: 'source_save', header: 'Source', size: 100, cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-[90px] block">{(getValue() as string) || '—'}</span> },
  ], [shinyMode, listStyle]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div>
      {/* Column visibility toggle */}
      <div className="flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center text-xs text-muted-foreground/50 hover:text-muted-foreground rounded-xl px-3 h-8 font-medium transition-colors hover:bg-accent">
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            {table.getAllColumns()
              .filter(col => col.getCanHide())
              .map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  className="text-xs capitalize"
                >
                  {col.columnDef.header as string || col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-card shadow-soft-sm rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="border-surface-sunken bg-surface hover:bg-surface">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold cursor-pointer select-none h-8"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <span className="text-primary">↑</span>}
                      {header.column.getIsSorted() === 'desc' && <span className="text-primary">↓</span>}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => {
              const s = row.original;
              return (
                <TableRow
                  key={row.id}
                  className={`border-surface-raised cursor-pointer ${
                    !s.isCaught ? 'opacity-30' :
                    s.isShiny ? 'bg-[rgba(234,179,8,0.03)]' : ''
                  }`}
                  onClick={() => onSelect(s)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-1.5 px-2" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ←
          </Button>
          {Array.from({ length: table.getPageCount() }, (_, i) => (
            <Button
              key={i}
              variant={table.getState().pagination.pageIndex === i ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-xl text-xs min-w-[32px] ${
                table.getState().pagination.pageIndex === i ? '' : 'text-muted-foreground'
              }`}
              onClick={() => table.setPageIndex(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}
