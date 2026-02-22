import { formatCents } from '@/utils/format'
import type { SubscriptionList } from '@/api/types'

interface SubscriptionsSectionProps {
  data: SubscriptionList | undefined
}

export function SubscriptionsSection({ data }: SubscriptionsSectionProps) {
  if (!data) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {data.category_name} Subscriptions
      </h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {data.subscriptions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No subscriptions found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Service</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Annual</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold text-slate-700 sm:table-cell">
                  Monthly Avg
                </th>
                <th className="hidden px-4 py-2.5 text-right font-semibold text-slate-700 sm:table-cell">
                  Charges
                </th>
                <th className="hidden px-4 py-2.5 text-left font-semibold text-slate-700 md:table-cell">
                  Frequency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.subscriptions.map((sub) => (
                <tr key={sub.merchant_name}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{sub.merchant_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatCents(sub.annual_cents)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">
                    {formatCents(sub.monthly_average_cents)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-slate-400 sm:table-cell">
                    {sub.charge_count}
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    {sub.frequency ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                        {sub.frequency}
                      </span>
                    ) : (
                      <span className="text-slate-300">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 font-bold text-slate-900">TOTAL</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                  {formatCents(data.total_annual_cents)}
                </td>
                <td className="hidden px-4 py-2.5 sm:table-cell" />
                <td className="hidden px-4 py-2.5 sm:table-cell" />
                <td className="hidden px-4 py-2.5 md:table-cell" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
