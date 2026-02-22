import { formatCents } from '@/utils/format'
import type { SpendingBreakdown } from '@/api/types'

interface SpendingBreakdownTableProps {
  data: SpendingBreakdown | undefined
}

export function SpendingBreakdownTable({ data }: SpendingBreakdownTableProps) {
  if (!data) return null

  const HIGH_SPEND_THRESHOLD = 2000_00 // $2,000/month average triggers amber
  const VERY_HIGH_SPEND_THRESHOLD = 3000_00 // $3,000/month triggers red

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {data.year} Spending Breakdown
      </h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Annual</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Monthly Avg</th>
              <th className="hidden px-4 py-2.5 text-right font-semibold text-slate-700 sm:table-cell">
                Txns
              </th>
              <th className="hidden px-4 py-2.5 text-left font-semibold text-slate-700 md:table-cell">
                Top Merchant
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.categories.map((cat) => {
              const isHighSpend = cat.monthly_average_cents >= HIGH_SPEND_THRESHOLD
              const isVeryHighSpend = cat.monthly_average_cents >= VERY_HIGH_SPEND_THRESHOLD
              const topMerchant = cat.top_merchants[0]

              return (
                <tr
                  key={cat.category_name}
                  className={
                    isVeryHighSpend
                      ? 'bg-rose-50/50'
                      : isHighSpend
                        ? 'bg-amber-50/50'
                        : ''
                  }
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {cat.category_name}
                    {isVeryHighSpend && (
                      <span className="ml-2 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                        HIGH
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatCents(cat.annual_cents)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                    {formatCents(cat.monthly_average_cents)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-slate-400 sm:table-cell">
                    {cat.transaction_count.toLocaleString()}
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-400 md:table-cell">
                    {topMerchant
                      ? `${topMerchant.merchant_name} (${formatCents(topMerchant.total_cents)})`
                      : '\u2014'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-2.5 font-bold text-slate-900">TOTAL</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                {formatCents(data.total_spending_cents)}
              </td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-700">
                {formatCents(data.monthly_average_cents)}
              </td>
              <td className="hidden px-4 py-2.5 sm:table-cell" />
              <td className="hidden px-4 py-2.5 md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
