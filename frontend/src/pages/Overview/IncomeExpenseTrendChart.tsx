import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { chartTooltipStyle, chartGrid, chartAxis, formatChartCurrency } from '@/utils/chartTheme'
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
    <div className="animate-fade-in-up">
      <h3 className="mb-3 text-base font-semibold text-slate-900">
        Monthly Income vs Expenses
      </h3>
      <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGrid.stroke} strokeDasharray={chartGrid.strokeDasharray} vertical={false} />
              <XAxis dataKey="name" {...chartAxis} />
              <YAxis
                tickFormatter={formatChartCurrency}
                {...chartAxis}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === 'income' ? 'Income' : 'Expenses',
                ]}
                contentStyle={chartTooltipStyle}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-sm text-slate-600">
                    {value === 'income' ? 'Income' : 'Expenses'}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                fill="url(#incomeGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f43f5e"
                fill="url(#expenseGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
