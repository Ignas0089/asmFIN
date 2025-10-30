import {
  loadBalanceSummary,
  loadCategorySummaries,
  loadRecentTransactions,
  loadUpcomingBills,
} from "../../../../lib/data/finance";
import { DashboardOverviewClient } from "../../../../components/dashboard/DashboardOverviewClient";

export default async function DashboardOverviewPage() {
  const [balanceResult, transactionsResult, upcomingBillsResult, categoryResult] =
    await Promise.all([
      loadBalanceSummary(),
      loadRecentTransactions({ limit: 5 }),
      loadUpcomingBills({ limit: 5 }),
      loadCategorySummaries({ limit: 8 }),
    ]);

  return (
    <DashboardOverviewClient
      initialBalance={balanceResult.result}
      initialRecentTransactions={transactionsResult.result}
      initialUpcomingBills={upcomingBillsResult.result}
      initialCategorySummaries={categoryResult.result}
    />
  );
}
