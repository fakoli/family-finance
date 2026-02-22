import { DollarSign, TrendingDown, CalendarClock, Hash } from 'lucide-react'
import { formatCents } from '@/utils/format'
import { formatCentsCompact } from '@/utils/formatOverview'
import { KPICard } from '@/components/KPICard'
import type { OverviewKPIs } from '@/api/types'

interface KPICardsProps {
  data: OverviewKPIs | undefined
}

export function KPICards({ data }: KPICardsProps) {
  if (!data) return null

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        label="Total Income"
        value={formatCentsCompact(data.total_income_cents)}
        subtitle={`${formatCents(data.total_income_cents)} total`}
        icon={DollarSign}
        variant="income"
        className="animate-fade-in-up"
      />
      <KPICard
        label="Total Spending"
        value={formatCentsCompact(data.total_spending_cents)}
        subtitle={`${formatCents(data.monthly_spending_average_cents)}/mo avg`}
        icon={TrendingDown}
        variant="expense"
        className="animate-fade-in-up stagger-1"
      />
      <KPICard
        label="Monthly Fixed"
        value={formatCents(data.monthly_fixed_obligations_cents)}
        subtitle="Recurring obligations"
        icon={CalendarClock}
        variant="neutral"
        className="animate-fade-in-up stagger-2"
      />
      <KPICard
        label="Transactions"
        value={data.transaction_count.toLocaleString()}
        subtitle={`${data.date_range_start} \u2013 ${data.date_range_end}`}
        icon={Hash}
        variant="info"
        className="animate-fade-in-up stagger-3"
      />
    </div>
  )
}
