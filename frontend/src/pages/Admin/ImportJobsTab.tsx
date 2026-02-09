import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAdminImportJobs } from '@/api/hooks'
import { formatDate } from '@/utils/format'
import { DataTable } from '@/components/DataTable'
import type { ImportRecord } from '@/api/types'

const statusConfig: Record<
  ImportRecord['status'],
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  completed: { icon: CheckCircle, color: 'text-emerald-600', label: 'Completed' },
  processing: { icon: Loader2, color: 'text-amber-600', label: 'Processing' },
  pending: { icon: Clock, color: 'text-slate-500', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-600', label: 'Failed' },
  categorizing: { icon: Loader2, color: 'text-blue-600', label: 'Categorizing' },
  partially_failed: { icon: AlertTriangle, color: 'text-amber-600', label: 'Partially Failed' },
}

export function ImportJobsTab() {
  const { data, isLoading } = useAdminImportJobs()

  const columns = [
    {
      key: 'filename',
      header: 'File',
      render: (row: ImportRecord) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <span className="font-medium text-slate-900">{row.filename}</span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User ID',
      render: (row: ImportRecord) => (
        <span className="font-mono text-xs text-slate-500">{row.user_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ImportRecord) => {
        const cfg = statusConfig[row.status]
        const Icon = cfg.icon
        const isSpinning = row.status === 'processing' || row.status === 'categorizing'
        return (
          <div className={clsx('flex items-center gap-1.5 text-sm', cfg.color)}>
            <Icon size={14} className={isSpinning ? 'animate-spin' : ''} />
            {cfg.label}
          </div>
        )
      },
    },
    {
      key: 'rows',
      header: 'Imported',
      render: (row: ImportRecord) => (
        <span className="text-slate-600">{row.imported_rows.toLocaleString()}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: ImportRecord) => (
        <span className="text-slate-500">{formatDate(row.created_at)}</span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      total={data?.total ?? 0}
      isLoading={isLoading}
      emptyTitle="No import jobs"
      emptyDescription="No imports have been run yet"
    />
  )
}
