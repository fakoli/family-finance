import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { MonthlyTrend } from '@/api/types'

interface IncomeExpenseTrendChartProps {
  data: MonthlyTrend[] | undefined
}

export function IncomeExpenseTrendChart({ data }: IncomeExpenseTrendChartProps) {
  if (!data) return null

  const chartData = data.map((m) => ({
    name: m.month_name,
    income: m.income_cents / 100,
    expenses: m.expense_cents / 100,
  }))

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Monthly Income vs Expenses
      </h3>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                }
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === 'income' ? 'Income' : 'Expenses',
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                formatter={(value: string) => (value === 'income' ? 'Income' : 'Expenses')}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
