'use client';

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '../lib/cn';
import { Pagination } from './pagination';

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageCount: number;
  pagination: PaginationState;
  sorting?: SortingState;
  className?: string;
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
}

export function DataTable<TData>({
  className,
  columns,
  data,
  onPaginationChange,
  onSortingChange,
  pageCount,
  pagination,
  sorting = [],
}: DataTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange?.(next);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
  });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className="h-10 px-3 text-left align-middle font-medium text-muted-foreground"
                    key={header.id}
                  >
                    {header.isPlaceholder
                      ? undefined
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr className="border-t" key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td className="p-3 align-middle" key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pagination.pageIndex + 1}
        pageCount={pageCount}
        onPageChange={(page) =>
          onPaginationChange?.({ ...pagination, pageIndex: page - 1 })
        }
      />
    </div>
  );
}
