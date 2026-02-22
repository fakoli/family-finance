import { formatCents } from '@/utils/format'
import type { SubscriptionList } from '@/api/types'

interface SubscriptionsSectionProps {
  data: SubscriptionList | undefined
}

const frequencyColors: Record<string, string> = {
  monthly: 'bg-brand-100 text-brand-700',
  yearly: 'bg-indigo-100 text-indigo-700',
  annual: 'bg-indigo-100 text-indigo-700',
  quarterly: 'bg-amber-100 text-amber-700',
  weekly: 'bg-purple-100 text-purple-700',
}

function getFrequencyStyle(frequency: string): string {
  const lower = frequency.toLowerCase()
  return frequencyColors[lower] ?? 'bg-slate-100 text-slate-600'
}

export function SubscriptionsSection({ data }: SubscriptionsSectionProps) {
  if (!data) return null

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-slate-900">
        {data.category_name} Subscriptions
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
        {data.subscriptions.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">No subscriptions found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Service</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Annual</th>
                <th className="hidden px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                  Monthly Avg
                </th>
                <th className="hidden px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                  Charges
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                  Frequency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {data.subscriptions.map((sub) => (
                <tr key={sub.merchant_name} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{sub.merchant_name}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {formatCents(sub.annual_cents)}
                  </td>
                  <td className="hidden px-5 py-3 text-right tabular-nums text-slate-500 sm:table-cell">
                    {formatCents(sub.monthly_average_cents)}
                  </td>
                  <td className="hidden px-5 py-3 text-right tabular-nums text-slate-400 sm:table-cell">
                    {sub.charge_count}
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    {sub.frequency ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getFrequencyStyle(sub.frequency)}`}>
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
              <tr className="border-t border-slate-200 bg-slate-50/80">
                <td className="px-5 py-3 font-bold text-slate-900">TOTAL</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">
                  {formatCents(data.total_annual_cents)}
                </td>
                <td className="hidden px-5 py-3 sm:table-cell" />
                <td className="hidden px-5 py-3 sm:table-cell" />
                <td className="hidden px-5 py-3 md:table-cell" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
