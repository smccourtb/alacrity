import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { EncounterEntry } from './types';

interface EncounterTableProps {
  encounters: EncounterEntry[];
  speciesId: number;
}

export function EncounterTable({ encounters, speciesId }: EncounterTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const hasTimeCol = encounters.some(e => e.conditions.length > 0);

  const columns = useMemo<ColumnDef<EncounterEntry>[]>(() => {
    const cols: ColumnDef<EncounterEntry>[] = [
      {
        accessorKey: 'name',
        header: 'Pokemon',
        cell: ({ row }) => {
          const isCurrent = row.original.species_id === speciesId;
          return (
            <span className={`capitalize ${isCurrent ? 'font-bold text-amber-700' : 'text-foreground'}`}>
              {isCurrent && '\u2605 '}{row.original.name.replace(/-/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'method',
        header: 'Method',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground capitalize">{(getValue() as string).replace(/-/g, ' ')}</span>
        ),
      },
      {
        id: 'levels',
        header: 'Levels',
        accessorFn: (row) => row.min_level,
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.original.min_level}–{row.original.max_level}</span>
        ),
      },
      {
        accessorKey: 'chance',
        header: 'Rate',
        cell: ({ row }) => {
          const isCurrent = row.original.species_id === speciesId;
          return (
            <span className={`font-mono ${isCurrent ? 'text-primary font-semibold' : 'text-foreground'}`}>
              {row.original.chance}%
            </span>
          );
        },
      },
    ];

    if (hasTimeCol) {
      cols.push({
        id: 'time',
        header: 'Time',
        accessorFn: (row) => row.conditions.filter(c => c.startsWith('time-')).join(', '),
        cell: ({ row }) => {
          const timeConditions = row.original.conditions
            .filter(c => c.startsWith('time-'))
            .map(c => c.replace('time-', ''));
          return (
            <span className="text-2xs text-muted-foreground">
              {timeConditions.length > 0
                ? timeConditions.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
                : 'All day'}
            </span>
          );
        },
      });
    }

    return cols;
  }, [speciesId, hasTimeCol]);

  const table = useReactTable({
    data: encounters,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table className="mt-2">
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className="border-[#f0eeeb] hover:bg-transparent">
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                className="text-2xs text-muted-foreground uppercase tracking-wider font-normal cursor-pointer select-none h-6 px-2"
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
          const isCurrent = row.original.species_id === speciesId;
          return (
            <TableRow
              key={row.id}
              className={`text-xs ${isCurrent ? 'bg-amber-50 hover:bg-amber-50' : 'border-surface'}`}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="py-1 px-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
