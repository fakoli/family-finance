import { useState } from 'react'
import {
  useOverviewKPIs,
  useSpendingBreakdown,
  useBalanceSheet,
  useIncomeExpenseTrend,
  useSubscriptions,
} from '@/api/hooks'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { YearSelector } from './YearSelector'
import { KPICards } from './KPICards'
import { BalanceSheetSection } from './BalanceSheetSection'
import { SpendingBreakdownTable } from './SpendingBreakdownTable'
import { MerchantSpotlight } from './MerchantSpotlight'
import { SubscriptionsSection } from './SubscriptionsSection'
import { IncomeExpenseTrendChart } from './IncomeExpenseTrendChart'
import { InsightsSection } from './InsightsSection'

export default function OverviewPage() {
  const [year, setYear] = useState(2025)

  const { data: kpis, isLoading: kpisLoading } = useOverviewKPIs(year)
  const { data: spending, isLoading: spendingLoading } = useSpendingBreakdown(year)
  const { data: balanceSheet } = useBalanceSheet()
  const { data: trend } = useIncomeExpenseTrend(year)
  const { data: subscriptions } = useSubscriptions(year)

  const isLoading = kpisLoading || spendingLoading

  return (
    <div>
      <PageHeader
        title="Financial Overview"
        description={`${year} Annual Report`}
        actions={<YearSelector year={year} onChange={setYear} />}
      />

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : (
        <div className="space-y-8">
          <KPICards data={kpis} />
          <BalanceSheetSection data={balanceSheet} />
          <SpendingBreakdownTable data={spending} />
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <MerchantSpotlight year={year} />
            <SubscriptionsSection data={subscriptions} />
          </div>
          <IncomeExpenseTrendChart data={trend} />
          <InsightsSection spending={spending} balanceSheet={balanceSheet} />
        </div>
      )}
    </div>
  )
}
