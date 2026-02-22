import { clsx } from 'clsx'

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={clsx('animate-pulse rounded-lg bg-slate-200/60', className)} style={style} />
  )
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-3">
        <div className="flex gap-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-4 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}
