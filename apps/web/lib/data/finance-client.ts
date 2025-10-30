import { getSupabaseBrowserClient } from "../supabase/client";
import type {
  BalanceSummary,
  BalanceSummaryOptions,
  FetchRecentTransactionsOptions,
  TransactionWithCategory,
  UpcomingBillsOptions,
} from "./finance";
import {
  createErrorResult,
  createLoadingResult,
  createSuccessResult,
  executeWithRetry,
  type DataResult,
} from "./queryHelpers";

function toError(message: string) {
  return new Error(message);
}

export async function fetchRecentTransactionsClient(
  options: FetchRecentTransactionsOptions = {}
): Promise<TransactionWithCategory[]> {
  const { limit = 10, startDate, endDate, retryAttempts, retryDelayMs } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from("transactions")
        .select(
          `
            id,
            occurred_on,
            description,
            amount,
            type,
            notes,
            source,
            created_at,
            updated_at,
            category:categories (
              id,
              name,
              type,
              color,
              created_at,
              updated_at
            )
          `
        )
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("occurred_on", startDate);
      }

      if (endDate) {
        query = query.lte("occurred_on", endDate);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query.returns<TransactionWithCategory[]>();

      if (error) {
        throw toError(`Failed to load recent transactions: ${error.message}`);
      }

      return data ?? [];
    },
    {
      retries: retryAttempts ?? 2,
      retryDelayMs,
    }
  );
}

export async function fetchUpcomingBillsClient(
  options: UpcomingBillsOptions = {}
): Promise<TransactionWithCategory[]> {
  const {
    limit = 5,
    startDate,
    endDate,
    retryAttempts,
    retryDelayMs,
  } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from("transactions")
        .select(
          `
            id,
            occurred_on,
            description,
            amount,
            type,
            notes,
            source,
            created_at,
            updated_at,
            category:categories (
              id,
              name,
              type,
              color,
              created_at,
              updated_at
            )
          `
        )
        .eq("type", "expense")
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true });

      const today = new Date().toISOString().slice(0, 10);
      const normalizedStart = startDate ?? today;
      query = query.gte("occurred_on", normalizedStart);

      if (endDate) {
        query = query.lte("occurred_on", endDate);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query.returns<TransactionWithCategory[]>();

      if (error) {
        throw toError(`Failed to load upcoming bills: ${error.message}`);
      }

      return data ?? [];
    },
    {
      retries: retryAttempts ?? 2,
      retryDelayMs,
    }
  );
}

export async function fetchBalanceSummaryClient(
  options: BalanceSummaryOptions = {}
): Promise<BalanceSummary> {
  const { startDate, endDate, retryAttempts, retryDelayMs } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from("transactions")
        .select("type, total:amount.sum()", { group: "type" });

      if (startDate) {
        query = query.gte("occurred_on", startDate);
      }

      if (endDate) {
        query = query.lte("occurred_on", endDate);
      }

      const { data, error } = await query.returns<
        { type: "income" | "expense"; total: number | null }[]
      >();

      if (error) {
        throw toError(`Failed to load balance summary: ${error.message}`);
      }

      const totals = data ?? [];
      const totalIncome = totals.find((row) => row.type === "income")?.total ?? 0;
      const totalExpense = totals.find((row) => row.type === "expense")?.total ?? 0;

      const incomeValue = Number(totalIncome) || 0;
      const expenseValue = Number(totalExpense) || 0;

      return {
        totalIncome: incomeValue,
        totalExpense: expenseValue,
        net: incomeValue - expenseValue,
      };
    },
    {
      retries: retryAttempts ?? 2,
      retryDelayMs,
    }
  );
}

export interface DashboardDataResults {
  balance: DataResult<BalanceSummary>;
  transactions: DataResult<TransactionWithCategory[]>;
  upcoming: DataResult<TransactionWithCategory[]>;
}

export async function loadDashboardDataClient(): Promise<DashboardDataResults> {
  const loadingBalance = createLoadingResult<BalanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  });
  const loadingTransactions = createLoadingResult<TransactionWithCategory[]>([]);
  const loadingUpcoming = createLoadingResult<TransactionWithCategory[]>([]);

  try {
    const [balance, transactions, upcoming] = await Promise.all([
      fetchBalanceSummaryClient(),
      fetchRecentTransactionsClient({ limit: 5 }),
      fetchUpcomingBillsClient({ limit: 5 }),
    ]);

    return {
      balance: createSuccessResult(balance),
      transactions: createSuccessResult(transactions),
      upcoming: createSuccessResult(upcoming),
    };
  } catch (error) {
    return {
      balance: createErrorResult(loadingBalance.data, error),
      transactions: createErrorResult(loadingTransactions.data, error),
      upcoming: createErrorResult(loadingUpcoming.data, error),
    };
  }
}
