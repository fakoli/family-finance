import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Landmark,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useDashboardSummary } from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { DateRangePicker, getDefaultDateRange } from '@/components/DateRangePicker'
import { KPICard } from '@/components/KPICard'
import { PageSkeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/stores/auth'
import { chartTooltipStyle } from '@/utils/chartTheme'
import type { DashboardSummary } from '@/api/types'

const defaultRange = getDefaultDateRange()

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)
  const { data: summary, isLoading } = useDashboardSummary(dateFrom, dateTo)
  const user = useAuthStore((s) => s.user)

  if (isLoading || !summary) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-8">
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

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800 p-6 text-white shadow-lg lg:p-8">
        <div className="absolute right-0 top-0 hidden opacity-20 lg:block">
          <img
            src="/images/dashboard-welcome.png"
            alt=""
            className="h-40 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
        <div className="relative">
          <h2 className="text-lg font-bold lg:text-xl">
            Welcome back{user?.username ? `, ${user.username}` : ''}
          </h2>
          <p className="mt-1 text-sm text-brand-100">
            Here&apos;s how your finances look this period.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Income"
          value={formatCents(Math.abs(summary.income_cents))}
          icon={TrendingUp}
          variant="income"
          className="animate-fade-in-up stagger-1"
        />
        <KPICard
          label="Expenses"
          value={formatCents(Math.abs(summary.expense_cents))}
          icon={TrendingDown}
          variant="expense"
          className="animate-fade-in-up stagger-2"
        />
        <KPICard
          label="Net"
          value={formatCents(Math.abs(summary.net_cents))}
          icon={Activity}
          variant={summary.net_cents >= 0 ? 'income' : 'expense'}
          subtitle={summary.net_cents >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
          className="animate-fade-in-up stagger-3"
        />
        <KPICard
          label="Transactions"
          value={summary.transaction_count.toLocaleString()}
          icon={Wallet}
          variant="neutral"
          className="animate-fade-in-up stagger-4"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpendingByCategory data={summary.spending_by_category} />
        <AccountBalances balances={summary.account_balances} />
      </div>
    </div>
  )
}

const DONUT_COLORS = [
  '#0d9488', '#f43f5e', '#6366f1', '#f59e0b', '#8b5cf6',
  '#ec4899', '#0ea5e9', '#f97316',
]

function SpendingByCategory({ data }: { data: DashboardSummary['spending_by_category'] }) {
  const chartData = data
    .slice()
    .sort((a, b) => b.total_cents - a.total_cents)
    .slice(0, 8)
    .map((d) => ({
      name: d.category_name || 'Uncategorized',
      value: d.total_cents / 100,
    }))

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Spending by Category</h3>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              contentStyle={chartTooltipStyle}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs text-slate-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function AccountBalances({ balances }: { balances: DashboardSummary['account_balances'] }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Account Balances</h3>
      {balances.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No accounts</p>
      ) : (
        <div className="space-y-3">
          {balances.map((b) => (
            <div
              key={b.account_id}
              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Landmark size={16} className="text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{b.account_name}</p>
                <p className="text-xs text-slate-500">
                  {b.institution_name} &middot; {b.account_type}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {formatCents(b.balance_cents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
