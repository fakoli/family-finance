import { Users, ArrowLeftRight, Upload, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useAdminStats } from '@/api/hooks'
import { KPICardSkeleton } from '@/components/Skeleton'
import type { LucideIcon } from 'lucide-react'

interface StatConfig {
  label: string
  key: keyof NonNullable<ReturnType<typeof useAdminStats>['data']>
  icon: LucideIcon
  variant: Variant
}

const stats: StatConfig[] = [
  { label: 'Total Users', key: 'total_users', icon: Users, variant: 'info' },
  { label: 'Active Users', key: 'active_users', icon: Users, variant: 'income' },
  { label: 'Transactions', key: 'total_transactions', icon: ArrowLeftRight, variant: 'neutral' },
  { label: 'Import Jobs', key: 'total_import_jobs', icon: Upload, variant: 'neutral' },
  { label: 'Completed', key: 'completed_import_jobs', icon: CheckCircle, variant: 'income' },
  { label: 'Failed', key: 'failed_import_jobs', icon: XCircle, variant: 'expense' },
]

type Variant = 'income' | 'expense' | 'neutral' | 'info'

const variantStyles: Record<Variant, { card: string; iconBg: string; iconColor: string }> = {
  income: {
    card: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  expense: {
    card: 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200/60',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  neutral: {
    card: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/60',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  info: {
    card: 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200/60',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
}

export function SystemTab() {
  const { data: statsData, isLoading } = useAdminStats()

  if (isLoading || !statsData) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const styles = variantStyles[stat.variant]
        const Icon = stat.icon
        const value = statsData[stat.key]
        return (
          <div
            key={stat.key}
            className={clsx(
              'rounded-xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
              styles.card,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </span>
              <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', styles.iconBg)}>
                <Icon size={18} className={styles.iconColor} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums lg:text-3xl">
                {value.toLocaleString()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
