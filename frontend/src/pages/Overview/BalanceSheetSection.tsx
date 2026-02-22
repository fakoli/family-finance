import { formatCents } from '@/utils/format'
import type { BalanceSheet, BalanceSheetEntry } from '@/api/types'

interface BalanceSheetSectionProps {
  data: BalanceSheet | undefined
}

function AccountTable({ title, entries, totalLabel, totalCents }: {
  title: string
  entries: BalanceSheetEntry[]
  totalLabel: string
  totalCents: number
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">No accounts</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {entries.map((entry) => (
            <div key={entry.account_id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-800">{entry.account_name}</p>
                <p className="text-xs text-slate-400">
                  {entry.institution_name}
                  {entry.account_number_last4 && ` \u00b7\u00b7\u00b7${entry.account_number_last4}`}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCents(entry.balance_cents)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-700">{totalLabel}</span>
        <span className="text-sm font-bold tabular-nums text-slate-900">
          {formatCents(totalCents)}
        </span>
      </div>
    </div>
  )
}

export function BalanceSheetSection({ data }: BalanceSheetSectionProps) {
  if (!data) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Balance Sheet
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AccountTable
          title="Assets"
          entries={data.assets}
          totalLabel="Total Assets"
          totalCents={data.total_assets_cents}
        />
        <AccountTable
          title="Liabilities"
          entries={data.liabilities}
          totalLabel="Total Liabilities"
          totalCents={data.total_liabilities_cents}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">Net Worth</span>
        <span
          className={`text-lg font-bold tabular-nums ${data.net_worth_cents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {formatCents(data.net_worth_cents)}
        </span>
      </div>
    </div>
  )
}
