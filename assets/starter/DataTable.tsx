import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

/** Sortable, searchable, paged grid. Rows are keyboard-reachable and open on Enter. */
export function DataTable<T>({
  data,
  columns,
  search = '',
  onOpen,
  rowLabel,
  pageSize = 20,
  initialSort = [],
  empty,
}: {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  search?: string
  onOpen: (row: T) => void
  rowLabel: (row: T) => string
  pageSize?: number
  initialSort?: SortingState
  /** Shown in place of rows when nothing matches. */
  empty?: ReactNode
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort)
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })
  const total = table.getFilteredRowModel().rows.length
  const { pageIndex } = table.getState().pagination
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pageSize)

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted()
                  return (
                    <th key={h.id} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}>
                      {h.column.getCanSort() ? (
                        <button className="th-sort" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' && <ArrowUp size={13} aria-hidden="true" />}
                          {dir === 'desc' && <ArrowDown size={13} aria-hidden="true" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                aria-label={rowLabel(row.original)}
                onClick={() => onOpen(row.original)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(row.original)
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total === 0 && empty}
      {total > 0 && (
        <div className="pager">
          <span>
            {from} to {to} of {total}
          </span>
          {table.getPageCount() > 1 && (
            <span className="pager-btns">
              <button className="icon-btn" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
                <ChevronLeft size={18} />
              </button>
              <button className="icon-btn" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
                <ChevronRight size={18} />
              </button>
            </span>
          )}
        </div>
      )}
    </>
  )
}
