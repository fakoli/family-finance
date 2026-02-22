import { useState } from 'react'
import {
  DollarSign,
  Receipt,
  Percent,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  CircleCheck,
} from 'lucide-react'
import {
  useTaxSummary,
  useTaxDocuments,
  useIncomeBreakdown,
  useTaxDeductibleTransactions,
} from '@/api/hooks'
import { formatCents, formatDate } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { KPICard } from '@/components/KPICard'
import { PageSkeleton } from '@/components/Skeleton'
import type { TaxSummary, TaxDocument, IncomeBreakdownItem, Transaction } from '@/api/types'

export default function TaxInsightsPage() {
  const [year, setYear] = useState(2025)
  const { data: summary, isLoading: loadingSummary } = useTaxSummary(year)
  const { data: documents, isLoading: loadingDocuments } = useTaxDocuments(year)
  const { data: incomeBreakdown, isLoading: loadingIncome } = useIncomeBreakdown(year)
  const { data: deductible, isLoading: loadingDeductible } = useTaxDeductibleTransactions(year)

  if (loadingSummary) {
    return <PageSkeleton />
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Tax Insights"
        description="Tax documents and analysis"
        actions={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200/60 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        }
      />

      <div className="space-y-8">
        {summary && <KPICards summary={summary} />}

        <DocumentChecklist documents={documents ?? []} loading={loadingDocuments} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IncomeBreakdownTable items={incomeBreakdown ?? []} loading={loadingIncome} />
          <DeductibleTransactions transactions={deductible ?? []} loading={loadingDeductible} />
        </div>

        {summary && (
          <InsightsSection
            summary={summary}
            incomeSourceCount={incomeBreakdown?.length ?? 0}
          />
        )}
      </div>
    </div>
  )
}

function KPICards({ summary }: { summary: TaxSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        label="Gross Income"
        value={formatCents(summary.gross_income_cents)}
        icon={DollarSign}
        variant="income"
      />
      <KPICard
        label="Total Tax Paid"
        value={formatCents(summary.total_tax_cents)}
        icon={Receipt}
        variant="expense"
      />
      <KPICard
        label="Effective Tax Rate"
        value={`${summary.effective_rate.toFixed(1)}%`}
        icon={Percent}
        variant="neutral"
      />
      <KPICard
        label="Total Deductions"
        value={formatCents(summary.total_deductions_cents)}
        icon={FileText}
        variant="info"
      />
    </div>
  )
}

function DocumentChecklist({
  documents,
  loading,
}: {
  documents: TaxDocument[]
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 px-5 py-4 lg:px-6">
        <h3 className="text-base font-semibold text-slate-900">Document Checklist</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : documents.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No tax documents imported</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-slate-50/50 lg:px-6"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <CircleCheck size={18} className="text-emerald-500" />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{doc.form_type}</p>
                  <p className="truncate text-xs text-slate-500">{doc.issuer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">{doc.tax_year}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle2 size={12} />
                    On Hand
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IncomeBreakdownTable({
  items,
  loading,
}: {
  items: IncomeBreakdownItem[]
  loading: boolean
}) {
  const sorted = [...items].sort((a, b) => b.amount_cents - a.amount_cents)
  const total = sorted.reduce((sum, item) => sum + item.amount_cents, 0)

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 px-5 py-4 lg:px-6">
        <h3 className="text-base font-semibold text-slate-900">Income Breakdown</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No income data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 text-left">
                <th className="px-5 py-3 font-medium text-slate-500 lg:px-6">Source</th>
                <th className="px-3 py-3 font-medium text-slate-500">Description</th>
                <th className="px-5 py-3 text-right font-medium text-slate-500 lg:px-6">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((item, i) => (
                <tr
                  key={i}
                  className="transition-colors duration-150 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-3 font-medium text-slate-900 lg:px-6">{item.source}</td>
                  <td className="px-3 py-3 text-slate-600">{item.description}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-900 lg:px-6">
                    {formatCents(item.amount_cents)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                <td className="px-5 py-3 font-semibold text-slate-900 lg:px-6" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 lg:px-6">
                  {formatCents(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DeductibleTransactions({
  transactions,
  loading,
}: {
  transactions: Transaction[]
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 px-5 py-4 lg:px-6">
        <h3 className="text-base font-semibold text-slate-900">Tax-Deductible Transactions</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No tax-deductible transactions found
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 text-left">
                <th className="px-5 py-3 font-medium text-slate-500 lg:px-6">Date</th>
                <th className="px-3 py-3 font-medium text-slate-500">Description</th>
                <th className="px-3 py-3 font-medium text-slate-500">Account</th>
                <th className="px-5 py-3 text-right font-medium text-slate-500 lg:px-6">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="transition-colors duration-150 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-3 tabular-nums text-slate-600 lg:px-6">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {tx.custom_name ?? tx.merchant_name ?? tx.description}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{tx.account?.name ?? '--'}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-emerald-600 lg:px-6">
                    {formatCents(Math.abs(tx.amount_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function InsightsSection({
  summary,
  incomeSourceCount,
}: {
  summary: TaxSummary
  incomeSourceCount: number
}) {
  const highRate = summary.effective_rate > 25

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Insights</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Effective Tax Rate insight */}
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            highRate
              ? 'border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50'
              : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {highRate ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
            )}
            <span
              className={`text-sm font-semibold ${highRate ? 'text-amber-800' : 'text-emerald-800'}`}
            >
              Effective Tax Rate
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-bold tracking-tight ${
              highRate ? 'text-amber-900' : 'text-emerald-900'
            }`}
          >
            {summary.effective_rate.toFixed(1)}%
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${highRate ? 'text-amber-700' : 'text-emerald-700'}`}>
            {highRate
              ? 'Above 25% -- consider consulting a tax professional for optimization strategies.'
              : 'Within a healthy range for your income level.'}
          </p>
        </div>

        {/* Deductions insight */}
        <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <Info size={16} className="text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-indigo-800">Total Deductions</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-900">
            {formatCents(summary.total_deductions_cents)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-700">
            Track all deductible expenses throughout the year to maximize your tax savings.
          </p>
        </div>

        {/* Income sources insight */}
        <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-gray-50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Info size={16} className="text-slate-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Income Sources</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {incomeSourceCount}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {incomeSourceCount > 1
              ? 'Multiple income sources may have different tax implications. Ensure proper documentation.'
              : 'One income source identified. Ensure all W-2 or 1099 documents are accounted for.'}
          </p>
        </div>
      </div>
    </div>
  )
}
