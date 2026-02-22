import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './EmptyState'

interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  onRowClick?: (item: T) => void
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIllustration?: string
}

export function DataTable<T>({
  columns,
  data,
  total = 0,
  page = 1,
  perPage = 50,
  onPageChange,
  onRowClick,
  isLoading,
  emptyTitle = 'No data',
  emptyDescription,
  emptyIllustration,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / perPage)

  if (isLoading) {
    return <LoadingSpinner className="py-16" />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} illustration={emptyIllustration} />
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-500 uppercase',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-teal-50/30',
                  !onRowClick && i % 2 === 1 && 'bg-slate-50/30',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3', col.className)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
