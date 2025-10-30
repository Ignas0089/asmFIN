"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BalanceSummary,
  TransactionWithCategory,
} from "../../lib/data/finance";
import type { DataResult } from "../../lib/data/queryHelpers";
import {
  createErrorResult,
  createLoadingResult,
  createSuccessResult,
} from "../../lib/data/queryHelpers";
import {
  fetchBalanceSummaryClient,
  fetchRecentTransactionsClient,
  fetchUpcomingBillsClient,
} from "../../lib/data/finance-client";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { SummaryCard } from "./SummaryCard";
import { RecentTransactionsList } from "./RecentTransactionsList";
import { UpcomingBillsList } from "./UpcomingBillsList";

const REFRESH_INTERVAL_MS = 30_000;

export interface DashboardOverviewClientProps {
  initialBalance: DataResult<BalanceSummary>;
  initialRecentTransactions: DataResult<TransactionWithCategory[]>;
  initialUpcomingBills: DataResult<TransactionWithCategory[]>;
}

export function DashboardOverviewClient({
  initialBalance,
  initialRecentTransactions,
  initialUpcomingBills,
}: DashboardOverviewClientProps) {
  const [balanceResult, setBalanceResult] = useState(initialBalance);
  const [recentTransactionsResult, setRecentTransactionsResult] = useState(
    initialRecentTransactions
  );
  const [upcomingBillsResult, setUpcomingBillsResult] = useState(
    initialUpcomingBills
  );

  const isMountedRef = useRef(true);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;

    setBalanceResult((previous) => createLoadingResult(previous.data));
    setRecentTransactionsResult((previous) =>
      createLoadingResult(previous.data)
    );
    setUpcomingBillsResult((previous) => createLoadingResult(previous.data));

    try {
      const [balance, transactions, upcoming] = await Promise.all([
        fetchBalanceSummaryClient(),
        fetchRecentTransactionsClient({ limit: 5 }),
        fetchUpcomingBillsClient({ limit: 5 }),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      setBalanceResult(createSuccessResult(balance));
      setRecentTransactionsResult(createSuccessResult(transactions));
      setUpcomingBillsResult(createSuccessResult(upcoming));
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setBalanceResult((previous) => createErrorResult(previous.data, error));
      setRecentTransactionsResult((previous) =>
        createErrorResult(previous.data, error)
      );
      setUpcomingBillsResult((previous) =>
        createErrorResult(previous.data, error)
      );
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("dashboard-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          void refreshData();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void refreshData();
    }, REFRESH_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(intervalId);
    };
  }, [refreshData]);

  const incomeCount = useMemo(
    () =>
      recentTransactionsResult.data.filter((item) => item.type === "income")
        .length,
    [recentTransactionsResult.data]
  );
  const expenseCount = useMemo(
    () =>
      recentTransactionsResult.data.filter((item) => item.type === "expense")
        .length,
    [recentTransactionsResult.data]
  );

  const totalUpcomingAmount = useMemo(
    () =>
      upcomingBillsResult.data.reduce(
        (total, bill) => total + Number(bill.amount ?? 0),
        0
      ),
    [upcomingBillsResult.data]
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Net balance"
          amount={balanceResult.data.net}
          description="Income minus expenses across all recorded transactions."
          variant={balanceResult.data.net >= 0 ? "positive" : "negative"}
          accentLabel={balanceResult.data.net >= 0 ? "surplus" : "deficit"}
        />
        <SummaryCard
          title="Total income"
          amount={balanceResult.data.totalIncome}
          description="Payments and deposits captured this month."
          variant="informative"
          accentLabel={`${incomeCount} entries`}
        />
        <SummaryCard
          title="Total expenses"
          amount={balanceResult.data.totalExpense}
          description="Spending captured this month across all categories."
          variant="negative"
          accentLabel={`${expenseCount} entries`}
        />
        <SummaryCard
          title="Upcoming bills"
          amount={Math.abs(totalUpcomingAmount)}
          description="Scheduled expenses due soon."
          variant={upcomingBillsResult.data.length > 0 ? "negative" : "neutral"}
          accentLabel={`${upcomingBillsResult.data.length} due`}
        />
      </div>

      {balanceResult.status === "error" && balanceResult.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {balanceResult.error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactionsList
          transactions={recentTransactionsResult.data.slice(0, 5)}
          isLoading={recentTransactionsResult.status === "loading"}
          error={recentTransactionsResult.error}
        />
        <UpcomingBillsList
          bills={upcomingBillsResult.data}
          isLoading={upcomingBillsResult.status === "loading"}
          error={upcomingBillsResult.error}
        />
      </div>
    </section>
  );
}
