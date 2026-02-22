import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  useNetWorthSummary,
  useBrokerageHoldings,
  useNetWorthHistory,
  useAssetAllocation,
} from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type {
  NetWorthSummary,
  NetWorthBreakdownItem,
  BrokerageHolding,
  NetWorthHistoryPoint,
  AssetAllocationItem,
} from '@/api/types'

const CHART_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
]

export default function NetWorthPage() {
  const { data: summary, isLoading: loadingSummary } = useNetWorthSummary()
  const { data: holdings, isLoading: loadingHoldings } = useBrokerageHoldings()
  const { data: history, isLoading: loadingHistory } = useNetWorthHistory()
  const { data: allocation, isLoading: loadingAllocation } = useAssetAllocation()

  if (loadingSummary) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div>
      <PageHeader title="Net Worth" description="Investment tracking and balance sheet" />

      {summary && <KPICards summary={summary} holdingsCount={holdings?.length ?? 0} />}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NetWorthChart history={history ?? []} loading={loadingHistory} />
        <AllocationChart allocation={allocation ?? []} loading={loadingAllocation} />
      </div>

      {summary && (
        <div className="mt-6">
          <BalanceSheetSection breakdown={summary.breakdown} summary={summary} />
        </div>
      )}

      <div className="mt-6">
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
  const cards = [
    {
      label: 'Net Worth',
      value: summary.net_worth_cents,
      icon: DollarSign,
      color: summary.net_worth_cents >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    {
      label: 'Total Assets',
      value: summary.total_assets_cents,
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      label: 'Total Liabilities',
      value: summary.total_liabilities_cents,
      icon: TrendingDown,
      color: 'text-rose-600',
    },
    {
      label: 'Holdings',
      value: null,
      count: holdingsCount,
      icon: BarChart3,
      color: 'text-slate-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <card.icon size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className="mt-2 text-xl font-semibold">
            {card.value !== null && card.value !== undefined ? (
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

function NetWorthChart({
  history,
  loading,
}: {
  history: NetWorthHistoryPoint[]
  loading: boolean
}) {
  const chartData = history.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    netWorth: point.net_worth_cents / 100,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Net Worth Over Time</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : chartData.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No history data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Worth']}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
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
    category: item.category,
    amount: item.amount_cents / 100,
    percentage: item.percentage,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Asset Allocation</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : chartData.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No allocation data</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 90, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              fontSize={12}
            />
            <YAxis type="category" dataKey="category" fontSize={12} width={85} />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                'Amount',
              ]}
              labelFormatter={(label: string) => {
                const match = chartData.find((d) => d.category === label)
                return match ? `${label} (${match.percentage.toFixed(1)}%)` : label
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Balance Sheet</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Assets Column */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Assets
          </h4>
          {assets.length === 0 ? (
            <p className="text-sm text-slate-400">No assets</p>
          ) : (
            <div className="space-y-2">
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
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-900">Total Assets</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-600">
              {formatCents(summary.total_assets_cents)}
            </span>
          </div>
        </div>

        {/* Liabilities Column */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-600">
            Liabilities
          </h4>
          {liabilities.length === 0 ? (
            <p className="text-sm text-slate-400">No liabilities</p>
          ) : (
            <div className="space-y-2">
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
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-900">Total Liabilities</span>
            <span className="text-sm font-semibold tabular-nums text-rose-600">
              {formatCents(Math.abs(summary.total_liabilities_cents))}
            </span>
          </div>
        </div>
      </div>

      {/* Net Worth total */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-4">
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Holdings</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : holdings.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No holdings data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-4 font-medium text-slate-500">Symbol</th>
                <th className="pb-3 pr-4 font-medium text-slate-500">Name</th>
                <th className="pb-3 pr-4 text-right font-medium text-slate-500">Shares</th>
                <th className="pb-3 pr-4 text-right font-medium text-slate-500">Market Value</th>
                <th className="pb-3 pr-4 text-right font-medium text-slate-500">Cost Basis</th>
                <th className="pb-3 text-right font-medium text-slate-500">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => {
                const gainLoss = holding.unrealized_gain_cents
                const isPositive = gainLoss !== null && gainLoss >= 0

                return (
                  <tr key={holding.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{holding.symbol}</td>
                    <td className="py-3 pr-4 text-slate-600">{holding.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                      {holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-900">
                      {formatCents(holding.market_value_cents)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                      {holding.cost_basis_cents !== null
                        ? formatCents(holding.cost_basis_cents)
                        : '--'}
                    </td>
                    <td
                      className={`py-3 text-right tabular-nums font-medium ${
                        gainLoss === null
                          ? 'text-slate-400'
                          : isPositive
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {gainLoss !== null ? (
                        <>
                          {isPositive ? '+' : ''}
                          {formatCents(gainLoss)}
                        </>
                      ) : (
                        '--'
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
