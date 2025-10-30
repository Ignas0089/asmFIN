import {
  loadBalanceSummary,
  loadRecentTransactions,
  loadUpcomingBills,
} from "../../../../lib/data/finance";
import { SummaryCard } from "../../../../components/dashboard/SummaryCard";
import { RecentTransactionsList } from "../../../../components/dashboard/RecentTransactionsList";
import { UpcomingBillsList } from "../../../../components/dashboard/UpcomingBillsList";

export default async function DashboardOverviewPage() {
  const [balanceResult, transactionsResult, upcomingBillsResult] =
    await Promise.all([
      loadBalanceSummary(),
      loadRecentTransactions({ limit: 5 }),
      loadUpcomingBills({ limit: 5 }),
    ]);

  const balanceSummary = balanceResult.result.data;
  const balanceError = balanceResult.result.status === "error" ? balanceResult.result.error : null;

  const recentTransactions = transactionsResult.result.data;
  const recentTransactionsError =
    transactionsResult.result.status === "error" ? transactionsResult.result.error : null;
  const recentTransactionsLoading = transactionsResult.result.status === "loading";
  const incomeCount = recentTransactions.filter((item) => item.type === "income").length;
  const expenseCount = recentTransactions.filter((item) => item.type === "expense").length;

  const upcomingBills = upcomingBillsResult.result.data;
  const upcomingBillsError =
    upcomingBillsResult.result.status === "error" ? upcomingBillsResult.result.error : null;
  const upcomingBillsLoading = upcomingBillsResult.result.status === "loading";

  const totalUpcomingAmount = upcomingBills.reduce(
    (total, bill) => total + Number(bill.amount ?? 0),
    0
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Net balance"
          amount={balanceSummary.net}
          description="Income minus expenses across all recorded transactions."
          variant={balanceSummary.net >= 0 ? "positive" : "negative"}
          accentLabel={balanceSummary.net >= 0 ? "surplus" : "deficit"}
        />
        <SummaryCard
          title="Total income"
          amount={balanceSummary.totalIncome}
          description="Payments and deposits captured this month."
          variant="informative"
          accentLabel={`${incomeCount} entries`}
        />
        <SummaryCard
          title="Total expenses"
          amount={balanceSummary.totalExpense}
          description="Spending captured this month across all categories."
          variant="negative"
          accentLabel={`${expenseCount} entries`}
        />
        <SummaryCard
          title="Upcoming bills"
          amount={Math.abs(totalUpcomingAmount)}
          description="Scheduled expenses due soon."
          variant={upcomingBills.length > 0 ? "negative" : "neutral"}
          accentLabel={`${upcomingBills.length} due`}
        />
      </div>

      {balanceError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {balanceError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactionsList
          transactions={recentTransactions.slice(0, 5)}
          isLoading={recentTransactionsLoading}
          error={recentTransactionsError}
        />
        <UpcomingBillsList
          bills={upcomingBills}
          isLoading={upcomingBillsLoading}
          error={upcomingBillsError}
        />
      </div>
    </section>
  );
}
