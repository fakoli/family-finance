import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Wallet, TrendingUp, PiggyBank } from 'lucide-react'
import { clsx } from 'clsx'
import { useAccounts } from '@/api/hooks'
import { formatCents } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import type { Account } from '@/api/types'

const accountTypeConfig: Record<string, { gradient: string; icon: typeof CreditCard; iconBg: string; iconColor: string }> = {
  checking: {
    gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    icon: Wallet,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  savings: {
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    icon: PiggyBank,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  credit: {
    gradient: 'bg-gradient-to-r from-orange-500 to-amber-600',
    icon: CreditCard,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  investment: {
    gradient: 'bg-gradient-to-r from-violet-500 to-purple-600',
    icon: TrendingUp,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
}

function getAccountConfig(type: string) {
  return (
    accountTypeConfig[type.toLowerCase()] ?? {
      gradient: 'bg-gradient-to-r from-slate-500 to-slate-600',
      icon: CreditCard,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    }
  )
}

function AccountCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <Skeleton className="h-1.5 rounded-none" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mt-4 h-7 w-24" />
      </div>
    </div>
  )
}

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
    return (
      <div>
        <PageHeader title="Accounts" description="Your financial accounts by institution" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <AccountCardSkeleton key={j} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Accounts" description="Your financial accounts by institution" />

      {grouped.size === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Import a statement to get started"
          illustration="/images/empty-accounts.png"
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([institution, accts]) => (
            <div key={institution}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {institution.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-sm font-semibold text-slate-800">{institution}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {accts.length} account{accts.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accts.map((acct) => {
                  const config = getAccountConfig(acct.account_type)
                  const Icon = config.icon
                  return (
                    <button
                      key={acct.id}
                      onClick={() => navigate(`/transactions?account_id=${acct.id}`)}
                      className="group overflow-hidden rounded-xl border border-slate-200/60 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Colored top strip */}
                      <div className={clsx('h-1.5', config.gradient)} />

                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={clsx(
                              'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                              config.iconBg,
                            )}
                          >
                            <Icon size={18} className={config.iconColor} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {acct.name}
                            </p>
                            <p className="text-xs capitalize text-slate-500">
                              {acct.account_type}
                              {acct.account_number_last4
                                ? ` · ···${acct.account_number_last4}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 text-xl font-bold tabular-nums tracking-tight text-slate-900">
                          {formatCents(acct.balance_cents)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
