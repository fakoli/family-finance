import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Building2 } from 'lucide-react'
import { useAccounts } from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import type { Account } from '@/api/types'

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    if (!accounts) return new Map<string, Account[]>()
    const map = new Map<string, Account[]>()
    for (const acct of accounts) {
      const instName = acct.institution?.name ?? 'Unknown'
      const existing = map.get(instName)
      if (existing) {
        existing.push(acct)
      } else {
        map.set(instName, [acct])
      }
    }
    return map
  }, [accounts])

  if (isLoading) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div>
      <PageHeader title="Accounts" description="Your financial accounts by institution" />

      {grouped.size === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Import a statement to get started"
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([institution, accts]) => (
            <div key={institution}>
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <h2 className="text-sm font-medium text-slate-700">{institution}</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accts.map((acct) => (
                  <button
                    key={acct.id}
                    onClick={() => navigate(`/transactions?account_id=${acct.id}`)}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
                        <CreditCard size={16} className="text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {acct.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {acct.account_type} {acct.account_number_last4 ? `· ···${acct.account_number_last4}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-lg font-semibold tabular-nums text-slate-900">
                      {formatCents(acct.balance_cents)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
