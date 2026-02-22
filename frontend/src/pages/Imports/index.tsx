import { useState, useCallback } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useImportHistory, useUploadImport, useImportJobProgress } from '@/api/hooks'
import { formatDate } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/DataTable'
import type { ImportRecord } from '@/api/types'

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={clsx('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ImportProgress({ job }: { job: ImportRecord }) {
  if (job.status === 'processing' && job.total_rows > 0) {
    return (
      <div className="mt-1 text-xs text-slate-500">
        {job.processed_rows.toLocaleString()} / {job.total_rows.toLocaleString()} rows
        <ProgressBar value={job.processed_rows} max={job.total_rows} color="bg-gradient-to-r from-amber-400 to-amber-500" />
      </div>
    )
  }
  if (job.status === 'categorizing' && job.uncategorized_rows > 0) {
    return (
      <div className="mt-1 text-xs text-slate-500">
        Categorizing: {job.categorized_rows.toLocaleString()} / {job.uncategorized_rows.toLocaleString()}
        <ProgressBar value={job.categorized_rows} max={job.uncategorized_rows} color="bg-gradient-to-r from-brand-400 to-brand-600" />
      </div>
    )
  }
  return null
}

const statusConfig: Record<
  ImportRecord['status'],
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  completed: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Completed' },
  processing: { icon: Loader2, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Processing' },
  pending: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', label: 'Failed' },
  categorizing: { icon: Loader2, color: 'text-brand-700', bg: 'bg-brand-50', label: 'Categorizing' },
  partially_failed: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Partial' },
}

export default function ImportsPage() {
  const { data, isLoading } = useImportHistory()
  const upload = useUploadImport()
  const [dragOver, setDragOver] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: activeJob } = useImportJobProgress(activeJobId)

  const handleUploadSuccess = useCallback((jobData: ImportRecord) => {
    setActiveJobId(jobData.id)
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      if (file) {
        upload.mutate(file, {
          onSuccess: (response) => {
            handleUploadSuccess(response.data)
          },
        })
      }
    },
    [upload, handleUploadSuccess],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const columns = [
    {
      key: 'filename',
      header: 'File',
      render: (row: ImportRecord) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <FileText size={14} className="text-slate-500" />
            </div>
            <span className="font-medium text-slate-900">{row.filename}</span>
            {row.source === 'watch' && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                AUTO
              </span>
            )}
          </div>
          <ImportProgress job={row} />
        </div>
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
          <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cfg.color, cfg.bg)}>
            <Icon size={12} className={isSpinning ? 'animate-spin' : ''} />
            {cfg.label}
          </span>
        )
      },
    },
    {
      key: 'rows',
      header: 'Imported',
      render: (row: ImportRecord) => (
        <span className="text-sm font-medium tabular-nums text-slate-700">{row.imported_rows.toLocaleString()}</span>
      ),
    },
    {
      key: 'duplicates',
      header: 'Duplicates',
      render: (row: ImportRecord) => (
        <span className="text-sm tabular-nums text-slate-500">{row.duplicate_rows.toLocaleString()}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: ImportRecord) => (
        <span className="text-sm text-slate-500">{formatDate(row.created_at)}</span>
      ),
    },
  ]

  const jobs = data?.data ?? []
  const displayJobs = activeJob?.data
    ? jobs.some((j) => j.id === activeJob.data.id)
      ? jobs.map((j) => (j.id === activeJob.data.id ? activeJob.data : j))
      : [activeJob.data, ...jobs]
    : jobs

  return (
    <div>
      <PageHeader title="Import" description="Upload bank statements to import transactions" />

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={clsx(
          'mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 md:p-10',
          dragOver
            ? 'border-brand-400 bg-brand-50/50 shadow-inner'
            : 'border-slate-200 bg-white hover:border-slate-300',
        )}
      >
        {/* Illustration */}
        <img
          src="/images/empty-imports.png"
          alt=""
          className="mb-4 h-24 w-auto opacity-80"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />

        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <Upload size={22} className="text-brand-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          Drag & drop a file here, or{' '}
          <label className="cursor-pointer font-semibold text-brand-600 hover:text-brand-700">
            browse
            <input
              type="file"
              accept=".csv,.ofx,.qfx,.pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-slate-400">CSV, OFX, QFX, or PDF files</p>

        {upload.isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            Uploading...
          </div>
        )}

        {upload.isSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle size={14} />
            Import queued — processing in background
          </div>
        )}

        {upload.isError && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            <AlertCircle size={14} />
            {upload.error instanceof Error ? upload.error.message : 'Upload failed'}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-slate-900">Import History</h2>
      </div>
      <DataTable
        columns={columns}
        data={displayJobs}
        total={data?.total ?? 0}
        isLoading={isLoading}
        emptyTitle="No imports yet"
        emptyDescription="Upload your first bank statement to get started"
        emptyIllustration="/images/empty-imports.png"
      />
    </div>
  )
}
