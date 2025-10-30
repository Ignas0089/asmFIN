import {
  loadBalanceSummary,
  loadCategorySummaries,
  loadIncomeExpenseTrend,
  loadRecentTransactions,
  loadUpcomingBills,
} from "../../../lib/data/finance";
import { DashboardOverviewClient } from "../../../components/dashboard/DashboardOverviewClient";
import {
  getTrendRangeMonths,
  type TrendRangeValue,
} from "../../../lib/dashboard/trendRanges";

export default async function DashboardOverviewPage() {
  const defaultTrendRange: TrendRangeValue = "6m";
  const trendMonths = getTrendRangeMonths(defaultTrendRange);

  const [
    balanceResult,
    transactionsResult,
    upcomingBillsResult,
    categoryResult,
    trendResult,
  ] = await Promise.all([
      loadBalanceSummary(),
      loadRecentTransactions({ limit: 5 }),
      loadUpcomingBills({ limit: 5 }),
      loadCategorySummaries({ limit: 8 }),
      loadIncomeExpenseTrend({ months: trendMonths }),
    ]);

  return (
    <DashboardOverviewClient
      initialBalance={balanceResult.result}
      initialRecentTransactions={transactionsResult.result}
      initialUpcomingBills={upcomingBillsResult.result}
      initialCategorySummaries={categoryResult.result}
      initialTrend={trendResult.result}
      initialTrendRange={defaultTrendRange}
    />
  );
}
