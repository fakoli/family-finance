import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useDashboardSummary } from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { DateRangePicker, getDefaultDateRange } from '@/components/DateRangePicker'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { DashboardSummary } from '@/api/types'

const defaultRange = getDefaultDateRange()

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)
  const { data: summary, isLoading } = useDashboardSummary(dateFrom, dateTo)

  if (isLoading || !summary) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your financial overview"
        actions={
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from)
              setDateTo(to)
            }}
          />
        }
      />

      <SummaryCards summary={summary} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpendingByCategory data={summary.spending_by_category} />
        <AccountBalances balances={summary.account_balances} />
      </div>
    </div>
  )
}

function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    {
      label: 'Income',
      value: summary.income_cents,
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      label: 'Expenses',
      value: summary.expense_cents,
      icon: TrendingDown,
      color: 'text-rose-600',
    },
    {
      label: 'Net',
      value: summary.net_cents,
      icon: Activity,
      color: summary.net_cents >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    {
      label: 'Transactions',
      value: null,
      count: summary.transaction_count,
      icon: Wallet,
      color: 'text-slate-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <card.icon size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className="mt-2 text-xl font-semibold">
            {card.value !== null ? (
              <span className={card.color}>{formatCents(Math.abs(card.value))}</span>
            ) : (
              <span className="text-slate-900">{card.count?.toLocaleString()}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SpendingByCategory({ data }: { data: DashboardSummary['spending_by_category'] }) {
  const chartData = data
    .slice()
    .sort((a, b) => b.total_cents - a.total_cents)
    .slice(0, 8)
    .map((d) => ({
      category: d.category_name || 'Uncategorized',
      amount: d.total_cents / 100,
    }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Spending by Category</h3>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => `$${v}`} fontSize={12} />
            <YAxis type="category" dataKey="category" fontSize={12} width={75} />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#f43f5e' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function AccountBalances({ balances }: { balances: DashboardSummary['account_balances'] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Account Balances</h3>
      {balances.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No accounts</p>
      ) : (
        <div className="space-y-3">
          {balances.map((b) => (
            <div key={b.account_id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{b.account_name}</p>
                <p className="text-xs text-slate-500">{b.institution_name} &middot; {b.account_type}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCents(b.balance_cents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
