import { formatCents } from '@/utils/format'
import type { BalanceSheet, BalanceSheetEntry } from '@/api/types'

interface BalanceSheetSectionProps {
  data: BalanceSheet | undefined
}

function AccountTable({ title, entries, totalLabel, totalCents, dotColor }: {
  title: string
  entries: BalanceSheetEntry[]
  totalLabel: string
  totalCents: number
  dotColor: string
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
          {title}
        </h4>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-slate-400">No accounts</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {entries.map((entry) => (
            <div key={entry.account_id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/50">
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
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3 rounded-b-xl">
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
    <div className="animate-fade-in-up">
      <h3 className="mb-3 text-base font-semibold text-slate-900">
        Balance Sheet
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AccountTable
          title="Assets"
          entries={data.assets}
          totalLabel="Total Assets"
          totalCents={data.total_assets_cents}
          dotColor="bg-emerald-500"
        />
        <AccountTable
          title="Liabilities"
          entries={data.liabilities}
          totalLabel="Total Liabilities"
          totalCents={data.total_liabilities_cents}
          dotColor="bg-rose-500"
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 rounded-xl border border-slate-200/60 bg-white px-5 py-3.5 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">Net Worth</span>
        <span
          className={`text-xl font-bold tabular-nums tracking-tight ${data.net_worth_cents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {formatCents(data.net_worth_cents)}
        </span>
      </div>
    </div>
  )
}
