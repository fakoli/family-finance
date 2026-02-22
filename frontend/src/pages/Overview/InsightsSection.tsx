import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatCents } from '@/utils/format'
import type { SpendingBreakdown, BalanceSheet } from '@/api/types'

interface InsightsSectionProps {
  spending: SpendingBreakdown | undefined
  balanceSheet: BalanceSheet | undefined
}

interface Insight {
  text: string
  type: 'positive' | 'warning'
}

function deriveInsights(
  spending: SpendingBreakdown | undefined,
  balanceSheet: BalanceSheet | undefined,
): Insight[] {
  const insights: Insight[] = []

  if (balanceSheet) {
    const ccDebt = balanceSheet.liabilities.filter((l) => l.account_type === 'credit_card')
    const hasDebt = ccDebt.some((c) => c.balance_cents > 0)
    if (!hasDebt) {
      insights.push({ text: 'No credit card debt — strong discipline', type: 'positive' })
    }

    if (balanceSheet.net_worth_cents > 0) {
      insights.push({
        text: `Positive net worth: ${formatCents(balanceSheet.net_worth_cents)}`,
        type: 'positive',
      })
    }
  }

  if (spending) {
    const dining = spending.categories.find((c) =>
      c.category_name.toLowerCase().includes('dining'),
    )
    if (dining && dining.annual_cents > 2000_000) {
      insights.push({
        text: `Dining spending is ${formatCents(dining.annual_cents)}/year — consider meal planning`,
        type: 'warning',
      })
    }

    const software = spending.categories.find((c) =>
      c.category_name.toLowerCase().includes('software'),
    )
    if (software && software.annual_cents > 1500_000) {
      insights.push({
        text: `Software & Tech at ${formatCents(software.annual_cents)}/year — review for overlapping subscriptions`,
        type: 'warning',
      })
    }

    if (spending.monthly_average_cents > 3000_000) {
      insights.push({
        text: `Monthly spending averages ${formatCents(spending.monthly_average_cents)} — look for optimization opportunities`,
        type: 'warning',
      })
    }

    const groceries = spending.categories.find((c) =>
      c.category_name.toLowerCase().includes('grocer'),
    )
    if (groceries && dining && dining.annual_cents > groceries.annual_cents * 2) {
      insights.push({
        text: 'Dining out significantly exceeds groceries — shifting meals home could save thousands',
        type: 'warning',
      })
    }
  }

  if (insights.length === 0) {
    insights.push({ text: 'Import transactions to see insights', type: 'positive' })
  }

  return insights
}

export function InsightsSection({ spending, balanceSheet }: InsightsSectionProps) {
  const insights = deriveInsights(spending, balanceSheet)
  const positives = insights.filter((i) => i.type === 'positive')
  const warnings = insights.filter((i) => i.type === 'warning')

  return (
    <div className="animate-fade-in-up">
      <h3 className="mb-3 text-base font-semibold text-slate-900">
        Insights
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-emerald-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            What's Working Well
          </h4>
          {positives.length === 0 ? (
            <p className="text-sm text-emerald-600">Import data to see positive trends</p>
          ) : (
            <ul className="space-y-2">
              {positives.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            Areas to Watch
          </h4>
          {warnings.length === 0 ? (
            <p className="text-sm text-amber-600">No warnings — looking good!</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
