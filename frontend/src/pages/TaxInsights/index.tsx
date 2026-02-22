import { useState } from 'react'
import {
  DollarSign,
  Receipt,
  Percent,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react'
import {
  useTaxSummary,
  useTaxDocuments,
  useIncomeBreakdown,
  useTaxDeductibleTransactions,
} from '@/api/hooks'
import { formatCents, formatDate } from '@/utils/format'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { TaxSummary, TaxDocument, IncomeBreakdownItem, Transaction } from '@/api/types'

export default function TaxInsightsPage() {
  const [year, setYear] = useState(2025)
  const { data: summary, isLoading: loadingSummary } = useTaxSummary(year)
  const { data: documents, isLoading: loadingDocuments } = useTaxDocuments(year)
  const { data: incomeBreakdown, isLoading: loadingIncome } = useIncomeBreakdown(year)
  const { data: deductible, isLoading: loadingDeductible } = useTaxDeductibleTransactions(year)

  if (loadingSummary) {
    return <LoadingSpinner className="py-24" />
  }

  return (
    <div>
      <PageHeader
        title="Tax Insights"
        description="Tax documents and analysis"
        actions={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        }
      />

      {summary && <KPICards summary={summary} />}

      <div className="mt-6">
        <DocumentChecklist documents={documents ?? []} loading={loadingDocuments} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeBreakdownTable items={incomeBreakdown ?? []} loading={loadingIncome} />
        <DeductibleTransactions transactions={deductible ?? []} loading={loadingDeductible} />
      </div>

      {summary && (
        <div className="mt-6">
          <InsightsSection
            summary={summary}
            incomeSourceCount={incomeBreakdown?.length ?? 0}
          />
        </div>
      )}
    </div>
  )
}

function KPICards({ summary }: { summary: TaxSummary }) {
  const cards = [
    {
      label: 'Gross Income',
      value: formatCents(summary.gross_income_cents),
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      label: 'Total Tax Paid',
      value: formatCents(summary.total_tax_cents),
      icon: Receipt,
      color: 'text-rose-600',
    },
    {
      label: 'Effective Tax Rate',
      value: `${summary.effective_rate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-amber-600',
    },
    {
      label: 'Total Deductions',
      value: formatCents(summary.total_deductions_cents),
      icon: FileText,
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <card.icon size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className="mt-2 text-xl font-semibold">
            <span className={card.color}>{card.value}</span>
          </div>
        </div>
      ))}
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Document Checklist</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : documents.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No tax documents imported</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 pr-4 font-medium text-slate-500">Form Type</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Issuer</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Tax Year</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-900">{doc.form_type}</td>
                  <td className="py-2 pr-4 text-slate-700">{doc.issuer}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{doc.tax_year}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      ON HAND
                    </span>
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Income Breakdown</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : sorted.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No income data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 pr-4 font-medium text-slate-500">Source</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Description</th>
                <th className="pb-2 text-right font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-900">{item.source}</td>
                  <td className="py-2 pr-4 text-slate-700">{item.description}</td>
                  <td className="py-2 text-right tabular-nums text-slate-900">
                    {formatCents(item.amount_cents)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-300">
                <td className="py-2 pr-4 font-semibold text-slate-900" colSpan={2}>
                  Total
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Tax-Deductible Transactions</h3>
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : transactions.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No tax-deductible transactions found
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 pr-4 font-medium text-slate-500">Date</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Description</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Account</th>
                <th className="pb-2 text-right font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{formatDate(tx.date)}</td>
                  <td className="py-2 pr-4 text-slate-900">
                    {tx.custom_name ?? tx.merchant_name ?? tx.description}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{tx.account?.name ?? '--'}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-emerald-600">
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-900">Insights</h3>
      <div className="space-y-3">
        {/* Effective Tax Rate insight */}
        <div
          className={`flex items-start gap-3 rounded-md p-3 ${
            highRate ? 'bg-amber-50' : 'bg-emerald-50'
          }`}
        >
          {highRate ? (
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${highRate ? 'text-amber-800' : 'text-emerald-800'}`}
            >
              Effective Tax Rate: {summary.effective_rate.toFixed(1)}%
            </p>
            <p className={`text-xs ${highRate ? 'text-amber-700' : 'text-emerald-700'}`}>
              {highRate
                ? 'Your effective rate is above 25%. Consider consulting a tax professional for optimization strategies.'
                : 'Your effective tax rate is within a healthy range.'}
            </p>
          </div>
        </div>

        {/* Deductions insight */}
        <div className="flex items-start gap-3 rounded-md bg-indigo-50 p-3">
          <Info size={18} className="mt-0.5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-800">
              Total Deductions: {formatCents(summary.total_deductions_cents)}
            </p>
            <p className="text-xs text-indigo-700">
              Track all deductible expenses throughout the year to maximize your tax savings.
            </p>
          </div>
        </div>

        {/* Income sources insight */}
        <div className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
          <Info size={18} className="mt-0.5 shrink-0 text-slate-600" />
          <div>
            <p className="text-sm font-medium text-slate-800">
              {incomeSourceCount} Income Source{incomeSourceCount !== 1 ? 's' : ''} Detected
            </p>
            <p className="text-xs text-slate-600">
              {incomeSourceCount > 1
                ? 'Multiple income sources may have different tax implications. Ensure each source is properly documented.'
                : 'One income source identified. Ensure all W-2 or 1099 documents are accounted for.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
