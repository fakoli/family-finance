import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

type KPIVariant = 'income' | 'expense' | 'neutral' | 'info'

interface KPICardProps {
  label: string
  value: string
  subtitle?: string
  icon: LucideIcon
  variant?: KPIVariant
  trend?: { value: number; label: string }
  className?: string
}

const variantStyles: Record<KPIVariant, { card: string; iconBg: string; iconColor: string }> = {
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

export function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'neutral',
  trend,
  className,
}: KPICardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={clsx(
        'rounded-xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
        styles.card,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={clsx(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            styles.iconBg,
          )}
        >
          <Icon size={18} className={styles.iconColor} />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums lg:text-3xl">
          {value}
        </span>
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                trend.value >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700',
              )}
            >
              {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
