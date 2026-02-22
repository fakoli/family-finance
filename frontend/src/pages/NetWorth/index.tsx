import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  useNetWorthSummary,
  useBrokerageHoldings,
  useNetWorthHistory,
  useAssetAllocation,
} from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { KPICard } from '@/components/KPICard'
import { PageSkeleton } from '@/components/Skeleton'
import { chartTooltipStyle, chartGrid, chartColors, formatChartCurrency } from '@/utils/chartTheme'
import type {
  NetWorthSummary,
  NetWorthBreakdownItem,
  BrokerageHolding,
  NetWorthHistoryPoint,
  AssetAllocationItem,
} from '@/api/types'

const CHART_COLORS = chartColors.palette

export default function NetWorthPage() {
  const { data: summary, isLoading: loadingSummary } = useNetWorthSummary()
  const { data: holdings, isLoading: loadingHoldings } = useBrokerageHoldings()
  const { data: history, isLoading: loadingHistory } = useNetWorthHistory()
  const { data: allocation, isLoading: loadingAllocation } = useAssetAllocation()

  if (loadingSummary) {
    return <PageSkeleton />
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Net Worth" description="Investment tracking and balance sheet" />

      <div className="space-y-8">
        {summary && <KPICards summary={summary} holdingsCount={holdings?.length ?? 0} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NetWorthChart history={history ?? []} loading={loadingHistory} />
          <AllocationChart allocation={allocation ?? []} loading={loadingAllocation} />
        </div>

        {summary && <BalanceSheetSection breakdown={summary.breakdown} summary={summary} />}

        <HoldingsTable holdings={holdings ?? []} loading={loadingHoldings} />
      </div>
    </div>
  )
}

function KPICards({
  summary,
  holdingsCount,
}: {
  summary: NetWorthSummary
  holdingsCount: number
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        label="Net Worth"
        value={formatCents(Math.abs(summary.net_worth_cents))}
        icon={DollarSign}
        variant={summary.net_worth_cents >= 0 ? 'income' : 'expense'}
      />
      <KPICard
        label="Total Assets"
        value={formatCents(summary.total_assets_cents)}
        icon={TrendingUp}
        variant="income"
      />
      <KPICard
        label="Total Liabilities"
        value={formatCents(Math.abs(summary.total_liabilities_cents))}
        icon={TrendingDown}
        variant="expense"
      />
      <KPICard
        label="Holdings"
        value={holdingsCount.toLocaleString()}
        icon={BarChart3}
        variant="info"
        subtitle="Active positions"
      />
    </div>
  )
}

function NetWorthChart({
  history,
  loading,
}: {
  history: NetWorthHistoryPoint[]
  loading: boolean
}) {
  const chartData = history.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    net_worth: point.net_worth_cents / 100,
  }))

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Net Worth Over Time</h3>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="flex h-[300px] items-center justify-center text-sm text-slate-400">
          No history data
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGrid.stroke} strokeDasharray={chartGrid.strokeDasharray} />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(v: number) => formatChartCurrency(v)}
            />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                'Net Worth',
              ]}
              contentStyle={chartTooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="net_worth"
              stroke="#10b981"
              fill="url(#netWorthGrad)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function AllocationChart({
  allocation,
  loading,
}: {
  allocation: AssetAllocationItem[]
  loading: boolean
}) {
  const chartData = allocation.map((item) => ({
    name: item.category,
    value: item.amount_cents / 100,
    percentage: item.percentage,
  }))

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Asset Allocation</h3>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="flex h-[300px] items-center justify-center text-sm text-slate-400">
          No allocation data
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const match = chartData.find((d) => d.name === name)
                return [
                  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${match?.percentage.toFixed(1) ?? 0}%)`,
                  name,
                ]
              }}
              contentStyle={chartTooltipStyle}
            />
            <Legend
              verticalAlign="bottom"
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

function BalanceSheetSection({
  breakdown,
  summary,
}: {
  breakdown: NetWorthBreakdownItem[]
  summary: NetWorthSummary
}) {
  const assets = breakdown.filter((item) => item.type === 'asset')
  const liabilities = breakdown.filter((item) => item.type === 'liability')

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-5 text-base font-semibold text-slate-900">Balance Sheet</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Assets Column */}
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Assets
          </h4>
          {assets.length === 0 ? (
            <p className="text-sm text-slate-400">No assets</p>
          ) : (
            <div className="space-y-2.5">
              {assets.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <span className="text-sm font-medium tabular-nums text-emerald-600">
                    {formatCents(item.amount_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-3">
            <span className="text-sm font-semibold text-slate-900">Total Assets</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-600">
              {formatCents(summary.total_assets_cents)}
            </span>
          </div>
        </div>

        {/* Liabilities Column */}
        <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-pink-50/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-600">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Liabilities
          </h4>
          {liabilities.length === 0 ? (
            <p className="text-sm text-slate-400">No liabilities</p>
          ) : (
            <div className="space-y-2.5">
              {liabilities.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <span className="text-sm font-medium tabular-nums text-rose-600">
                    {formatCents(Math.abs(item.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-rose-200/60 pt-3">
            <span className="text-sm font-semibold text-slate-900">Total Liabilities</span>
            <span className="text-sm font-semibold tabular-nums text-rose-600">
              {formatCents(Math.abs(summary.total_liabilities_cents))}
            </span>
          </div>
        </div>
      </div>

      {/* Net Worth total */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-base font-bold text-slate-900">Net Worth</span>
        <span
          className={`text-base font-bold tabular-nums ${
            summary.net_worth_cents >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {formatCents(summary.net_worth_cents)}
        </span>
      </div>
    </div>
  )
}

function HoldingsTable({
  holdings,
  loading,
}: {
  holdings: BrokerageHolding[]
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 px-5 py-4 lg:px-6">
        <h3 className="text-base font-semibold text-slate-900">Holdings</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : holdings.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No holdings data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 text-left">
                <th className="px-5 py-3 font-medium text-slate-500 lg:px-6">Symbol</th>
                <th className="px-3 py-3 font-medium text-slate-500">Name</th>
                <th className="px-3 py-3 text-right font-medium text-slate-500">Shares</th>
                <th className="px-3 py-3 text-right font-medium text-slate-500">Market Value</th>
                <th className="px-3 py-3 text-right font-medium text-slate-500">Cost Basis</th>
                <th className="px-5 py-3 text-right font-medium text-slate-500 lg:px-6">
                  Gain/Loss
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holdings.map((holding) => {
                const gainLoss = holding.unrealized_gain_cents
                const isPositive = gainLoss !== null && gainLoss >= 0

                return (
                  <tr
                    key={holding.id}
                    className="transition-colors duration-150 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5 lg:px-6">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        {holding.symbol}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{holding.name}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-700">
                      {holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-medium text-slate-900">
                      {formatCents(holding.market_value_cents)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-700">
                      {holding.cost_basis_cents !== null
                        ? formatCents(holding.cost_basis_cents)
                        : '--'}
                    </td>
                    <td className="px-5 py-3.5 text-right lg:px-6">
                      {gainLoss !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 tabular-nums font-medium ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight size={14} className="shrink-0" />
                          ) : (
                            <ArrowDownRight size={14} className="shrink-0" />
                          )}
                          {isPositive ? '+' : ''}
                          {formatCents(gainLoss)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
