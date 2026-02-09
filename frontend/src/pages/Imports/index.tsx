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
        className={clsx('h-full rounded-full transition-all duration-300', color)}
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
        <ProgressBar value={job.processed_rows} max={job.total_rows} color="bg-amber-500" />
      </div>
    )
  }
  if (job.status === 'categorizing' && job.uncategorized_rows > 0) {
    return (
      <div className="mt-1 text-xs text-slate-500">
        Categorizing: {job.categorized_rows.toLocaleString()} / {job.uncategorized_rows.toLocaleString()}
        <ProgressBar value={job.categorized_rows} max={job.uncategorized_rows} color="bg-blue-500" />
      </div>
    )
  }
  return null
}

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

export default function ImportsPage() {
  const { data, isLoading } = useImportHistory()
  const upload = useUploadImport()
  const [dragOver, setDragOver] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: activeJob } = useImportJobProgress(activeJobId)

  // Track the most recently uploaded job for progress
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
            <FileText size={16} className="text-slate-400" />
            <span className="font-medium text-slate-900">{row.filename}</span>
            {row.source === 'watch' && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
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
      key: 'duplicates',
      header: 'Duplicates',
      render: (row: ImportRecord) => (
        <span className="text-slate-500">{row.duplicate_rows.toLocaleString()}</span>
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

  // Merge active job progress into history data for live updates
  const jobs = data?.data ?? []
  const displayJobs = activeJob?.data
    ? jobs.some((j) => j.id === activeJob.data.id)
      ? jobs.map((j) => (j.id === activeJob.data.id ? activeJob.data : j))
      : [activeJob.data, ...jobs]
    : jobs

  return (
    <div>
      <PageHeader title="Import" description="Upload bank statements to import transactions" />

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={clsx(
          'mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors',
          dragOver ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white',
        )}
      >
        <Upload size={32} className="mb-3 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          Drag & drop a file here, or{' '}
          <label className="cursor-pointer text-slate-900 underline">
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
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            Uploading...
          </div>
        )}

        {upload.isSuccess && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle size={14} />
            Import queued — processing in background
          </div>
        )}

        {upload.isError && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {upload.error instanceof Error ? upload.error.message : 'Upload failed'}
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium text-slate-900">Import History</h2>
      <DataTable
        columns={columns}
        data={displayJobs}
        total={data?.total ?? 0}
        isLoading={isLoading}
        emptyTitle="No imports yet"
        emptyDescription="Upload your first bank statement to get started"
      />
    </div>
  )
}
