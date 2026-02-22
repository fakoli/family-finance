import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useMerchantDeepDive, useSpendingBreakdown } from '@/api/hooks'
import { formatCents } from '@/utils/format'

interface MerchantSpotlightProps {
  year: number
}

export function MerchantSpotlight({ year }: MerchantSpotlightProps) {
  const { data: spending } = useSpendingBreakdown(year)
  const [selectedMerchant, setSelectedMerchant] = useState('')

  // Build a list of top merchants from spending data
  const topMerchants = (spending?.categories ?? [])
    .flatMap((c) => c.top_merchants)
    .sort((a, b) => b.total_cents - a.total_cents)
    .filter((m, i, arr) => arr.findIndex((x) => x.merchant_name === m.merchant_name) === i)
    .slice(0, 20)

  useEffect(() => {
    const first = topMerchants[0]
    if (!selectedMerchant && first) {
      setSelectedMerchant(first.merchant_name)
    }
  }, [topMerchants, selectedMerchant])

  const { data: dive } = useMerchantDeepDive(selectedMerchant, year)

  const chartData = (dive?.monthly ?? []).map((m) => ({
    name: m.month_name,
    amount: m.total_cents / 100,
    orders: m.order_count,
  }))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Merchant Spotlight
        </h3>
        <select
          value={selectedMerchant}
          onChange={(e) => setSelectedMerchant(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
        >
          {topMerchants.map((m) => (
            <option key={m.merchant_name} value={m.merchant_name}>
              {m.merchant_name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        {dive ? (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <div>
                <span className="text-xs text-slate-400">Total</span>
                <p className="text-lg font-bold text-slate-900">{formatCents(dive.total_cents)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Orders</span>
                <p className="text-lg font-bold text-slate-900">
                  {dive.order_count.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Avg Order</span>
                <p className="text-lg font-bold text-slate-900">
                  {formatCents(dive.average_order_cents)}
                </p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'amount' ? `$${value.toFixed(2)}` : value,
                      name === 'amount' ? 'Amount' : 'Orders',
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                No data for this merchant in {year}
              </p>
            )}

            {dive.total_cents > 1000_00 && (
              <div className="mt-4 rounded-md border-l-4 border-l-amber-400 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">
                  Cutting {dive.merchant_name} spending in half would save ~
                  {formatCents(Math.round(dive.total_cents / 2))}/year
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Select a merchant above</p>
        )}
      </div>
    </div>
  )
}
