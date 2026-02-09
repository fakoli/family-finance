import { useState, useCallback } from 'react'
import { Search, X, Sparkles } from 'lucide-react'
import { useTransactions, useAccounts, useCategories, useUpdateTransaction, useAICategorizeAll } from '@/api/hooks'
import { formatDate } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { DateRangePicker, getDefaultDateRange } from '@/components/DateRangePicker'
import { DataTable } from '@/components/DataTable'
import { AmountDisplay } from '@/components/AmountDisplay'
import type { Transaction, Category, TransactionFilters } from '@/api/types'

const defaultRange = getDefaultDateRange()

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
        <span className="text-slate-600">{formatDate(tx.date)}</span>
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
        <span className="text-slate-500">{tx.category?.name ?? '—'}</span>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (tx: Transaction) => {
        const acct = tx.account
        return (
          <span className="text-slate-500">
            {acct ? `${acct.institution?.name ?? ''} ···${acct.account_number_last4 ?? ''}` : '—'}
          </span>
        )
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (tx: Transaction) => <AmountDisplay cents={tx.amount_cents} />,
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
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {categorizeAll.isPending ? 'Categorizing...' : 'AI Categorize All'}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <select
          value={filters.account_id ?? ''}
          onChange={(e) => setFilter({ account_id: e.target.value || undefined })}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
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
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <DateRangePicker
          dateFrom={filters.date_from ?? defaultRange.from}
          dateTo={filters.date_to ?? defaultRange.to}
          onChange={(from, to) => setFilter({ date_from: from, date_to: to })}
        />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Transaction Details</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Merchant</dt>
            <dd className="font-medium text-slate-900">{transaction.merchant_name ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Date</dt>
            <dd>{formatDate(transaction.date)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Amount</dt>
            <dd>
              <AmountDisplay cents={transaction.amount_cents} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Description</dt>
            <dd className="text-right text-slate-700">{transaction.original_description ?? transaction.description}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
          <div className="flex gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
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
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
