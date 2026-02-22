import { useState, useCallback } from 'react'
import { Search, X, Sparkles, Tag } from 'lucide-react'
import { clsx } from 'clsx'
import { useTransactions, useAccounts, useCategories, useUpdateTransaction, useAICategorizeAll } from '@/api/hooks'
import { formatDate } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { DateRangePicker, getDefaultDateRange } from '@/components/DateRangePicker'
import { DataTable } from '@/components/DataTable'
import { AmountDisplay } from '@/components/AmountDisplay'
import type { Transaction, Category, TransactionFilters } from '@/api/types'

const defaultRange = getDefaultDateRange()

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-amber-400',
  'Shopping': 'bg-violet-400',
  'Transportation': 'bg-blue-400',
  'Entertainment': 'bg-pink-400',
  'Bills & Utilities': 'bg-slate-400',
  'Health & Fitness': 'bg-rose-400',
  'Travel': 'bg-cyan-400',
  'Income': 'bg-emerald-400',
  'Transfer': 'bg-indigo-400',
  'Education': 'bg-teal-400',
  'Groceries': 'bg-lime-400',
  'Subscriptions': 'bg-purple-400',
}

function getCategoryColor(name: string | undefined): string {
  if (!name) return 'bg-slate-300'
  return CATEGORY_COLORS[name] ?? 'bg-slate-400'
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    per_page: 50,
    date_from: defaultRange.from,
    date_to: defaultRange.to,
  })
  const [search, setSearch] = useState('')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const { data, isLoading } = useTransactions({
    ...filters,
    search: search || undefined,
  })
  const updateTx = useUpdateTransaction()
  const categorizeAll = useAICategorizeAll()

  const accounts = accountsData ?? []
  const categories = categoriesData ?? []

  const setFilter = useCallback(
    (patch: Partial<TransactionFilters>) =>
      setFilters((prev) => ({ ...prev, page: 1, ...patch })),
    [],
  )

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (tx: Transaction) => (
        <span className="text-sm text-slate-600">{formatDate(tx.date)}</span>
      ),
      className: 'w-28',
    },
    {
      key: 'merchant',
      header: 'Merchant',
      render: (tx: Transaction) => (
        <span className="font-medium text-slate-900">{tx.merchant_name ?? tx.description}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (tx: Transaction) => (
        <div className="flex items-center gap-2">
          <span className={clsx('h-2 w-2 rounded-full', getCategoryColor(tx.category?.name))} />
          <span className="text-sm text-slate-600">{tx.category?.name ?? 'Uncategorized'}</span>
        </div>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (tx: Transaction) => {
        const acct = tx.account
        return (
          <span className="text-sm text-slate-500">
            {acct ? `${acct.institution?.name ?? ''} ···${acct.account_number_last4 ?? ''}` : '—'}
          </span>
        )
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (tx: Transaction) => (
        <div className="text-right">
          <span
            className={clsx(
              'inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
              tx.amount_cents >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700',
            )}
          >
            <AmountDisplay cents={tx.amount_cents} />
          </span>
        </div>
      ),
      className: 'text-right',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All your transactions in one place"
        actions={
          <button
            onClick={() => categorizeAll.mutate()}
            disabled={categorizeAll.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {categorizeAll.isPending ? 'Categorizing...' : 'AI Categorize All'}
          </button>
        }
      />

      {/* Filter bar in card */}
      <div className="mb-5 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <div className="relative sm:col-span-2 lg:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:w-auto"
            />
          </div>

          <select
            value={filters.account_id ?? ''}
            onChange={(e) => setFilter({ account_id: e.target.value || undefined })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:w-auto"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.institution?.name ?? ''} ···{a.account_number_last4}
              </option>
            ))}
          </select>

          <select
            value={filters.category_id ?? ''}
            onChange={(e) => setFilter({ category_id: e.target.value || undefined })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="sm:col-span-2 lg:w-auto">
            <DateRangePicker
              dateFrom={filters.date_from ?? defaultRange.from}
              dateTo={filters.date_to ?? defaultRange.to}
              onChange={(from, to) => setFilter({ date_from: from, date_to: to })}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={filters.page ?? 1}
        perPage={filters.per_page ?? 50}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onRowClick={(tx) => setEditingTx(tx)}
        isLoading={isLoading}
        emptyTitle="No transactions found"
        emptyDescription="Try adjusting your filters or import some data"
        emptyIllustration="/images/empty-transactions.png"
      />

      {editingTx && (
        <TransactionDetail
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onUpdateCategory={(categoryId) => {
            updateTx.mutate(
              { id: editingTx.id, category_id: categoryId || null },
              { onSuccess: () => setEditingTx(null) },
            )
          }}
        />
      )}
    </div>
  )
}

function TransactionDetail({
  transaction,
  categories,
  onClose,
  onUpdateCategory,
}: {
  transaction: Transaction
  categories: Category[]
  onClose: () => void
  onUpdateCategory: (categoryId: string) => void
}) {
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200/60 bg-white shadow-xl md:max-w-md md:rounded-2xl">
        {/* Colored top strip */}
        <div
          className={clsx(
            'h-1.5',
            transaction.amount_cents >= 0
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : 'bg-gradient-to-r from-rose-400 to-pink-500',
          )}
        />

        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  transaction.amount_cents >= 0 ? 'bg-emerald-100' : 'bg-rose-100',
                )}
              >
                <Tag
                  size={18}
                  className={
                    transaction.amount_cents >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }
                />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Transaction Details</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <dl className="space-y-3.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Merchant</dt>
              <dd className="font-medium text-slate-900">{transaction.merchant_name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Date</dt>
              <dd className="text-slate-700">{formatDate(transaction.date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount</dt>
              <dd>
                <span
                  className={clsx(
                    'inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
                    transaction.amount_cents >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700',
                  )}
                >
                  <AmountDisplay cents={transaction.amount_cents} />
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Description</dt>
              <dd className="max-w-[60%] text-right text-slate-700">
                {transaction.original_description ?? transaction.description}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
            <div className="flex gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onUpdateCategory(categoryId)}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
