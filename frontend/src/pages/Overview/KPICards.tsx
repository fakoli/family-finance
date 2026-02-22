import { DollarSign, TrendingDown, CalendarClock, Hash } from 'lucide-react'
import { formatCents } from '@/utils/format'
import { formatCentsCompact } from '@/utils/formatOverview'
import type { OverviewKPIs } from '@/api/types'

interface KPICardsProps {
  data: OverviewKPIs | undefined
}

export function KPICards({ data }: KPICardsProps) {
  if (!data) return null

  const cards = [
    {
      label: 'Total Income',
      value: formatCentsCompact(data.total_income_cents),
      sub: `${formatCents(data.total_income_cents)} total`,
      icon: DollarSign,
      color: 'text-emerald-600',
      borderColor: 'border-l-emerald-500',
    },
    {
      label: 'Monthly Fixed',
      value: formatCents(data.monthly_fixed_obligations_cents),
      sub: 'Recurring obligations',
      icon: CalendarClock,
      color: 'text-amber-600',
      borderColor: 'border-l-amber-500',
    },
    {
      label: 'Total Spending',
      value: formatCentsCompact(data.total_spending_cents),
      sub: `${formatCents(data.monthly_spending_average_cents)}/mo avg`,
      icon: TrendingDown,
      color: 'text-amber-600',
      borderColor: 'border-l-amber-500',
    },
    {
      label: 'Transactions',
      value: data.transaction_count.toLocaleString(),
      sub: `${data.date_range_start} \u2013 ${data.date_range_end}`,
      icon: Hash,
      color: 'text-slate-600',
      borderColor: 'border-l-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border border-slate-200 border-l-4 ${card.borderColor} bg-white p-4`}
        >
          <div className="flex items-center gap-2 text-slate-500">
            <card.icon size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className={`mt-2 text-xl font-semibold ${card.color}`}>{card.value}</div>
          <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
