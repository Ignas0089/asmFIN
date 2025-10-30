import { getSupabaseBrowserClient } from "../supabase/client";
import type {
  BalanceSummary,
  BalanceSummaryOptions,
  CategorySummary,
  CategorySummaryOptions,
  IncomeExpenseTrendOptions,
  IncomeExpenseTrendPoint,
  FetchRecentTransactionsOptions,
  TransactionWithCategory,
  UpcomingBillsOptions,
} from "./finance";
import {
  buildIncomeExpenseTrend,
  resolveTrendRange,
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

export async function fetchCategorySummariesClient(
  options: CategorySummaryOptions = {}
): Promise<CategorySummary[]> {
  const { startDate, endDate, limit, retryAttempts, retryDelayMs } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from("transactions")
        .select("category_id, total:amount.sum()", { group: "category_id" })
        .eq("type", "expense");

      if (startDate) {
        query = query.gte("occurred_on", startDate);
      }

      if (endDate) {
        query = query.lte("occurred_on", endDate);
      }

      const { data, error } = await query.returns<
        { category_id: string | null; total: number | null }[]
      >();

      if (error) {
        throw toError(`Failed to load category summaries: ${error.message}`);
      }

      const aggregate = data ?? [];
      const categoryIds = Array.from(
        new Set(
          aggregate
            .map((row) => row.category_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let categories: { id: string; name: string; color: string | null }[] = [];

      if (categoryIds.length > 0) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name, color")
          .in("id", categoryIds);

        if (categoryError) {
          throw toError(
            `Failed to load categories for summaries: ${categoryError.message}`
          );
        }

        categories = categoryData ?? [];
      }

      const categoriesById = new Map(categories.map((item) => [item.id, item]));

      const summaries = aggregate
        .map<CategorySummary>((row) => {
          const category = row.category_id
            ? categoriesById.get(row.category_id) ?? null
            : null;

          const fallbackName = row.category_id ? "Other" : "Uncategorized";

          return {
            categoryId: row.category_id,
            name: category?.name ?? fallbackName,
            type: "expense",
            color: category?.color ?? null,
            total: Number(row.total) || 0,
          };
        })
        .filter((summary) => summary.total > 0)
        .sort((a, b) => b.total - a.total);

      if (limit && limit > 0) {
        return summaries.slice(0, limit);
      }

      return summaries;
    },
    {
      retries: retryAttempts ?? 2,
      retryDelayMs,
    }
  );
}

export async function fetchIncomeExpenseTrendClient(
  options: IncomeExpenseTrendOptions = {}
): Promise<IncomeExpenseTrendPoint[]> {
  const { retryAttempts, retryDelayMs } = options;
  const range = resolveTrendRange(options);

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from("transactions")
        .select("occurred_on, amount, type")
        .gte("occurred_on", range.startDate)
        .lte("occurred_on", range.endDate)
        .order("occurred_on", { ascending: true })
        .returns<Pick<TransactionWithCategory, "occurred_on" | "amount" | "type">[]>();

      if (error) {
        throw toError(`Failed to load trend data: ${error.message}`);
      }

      const rows = data ?? [];
      return buildIncomeExpenseTrend(rows, { start: range.start, end: range.end });
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
  trend: DataResult<IncomeExpenseTrendPoint[]>;
}

export async function loadDashboardDataClient(): Promise<DashboardDataResults> {
  const loadingBalance = createLoadingResult<BalanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  });
  const loadingTransactions = createLoadingResult<TransactionWithCategory[]>([]);
  const loadingUpcoming = createLoadingResult<TransactionWithCategory[]>([]);
  const loadingTrend = createLoadingResult<IncomeExpenseTrendPoint[]>([]);

  try {
    const [balance, transactions, upcoming, trend] = await Promise.all([
      fetchBalanceSummaryClient(),
      fetchRecentTransactionsClient({ limit: 5 }),
      fetchUpcomingBillsClient({ limit: 5 }),
      fetchIncomeExpenseTrendClient(),
    ]);

    return {
      balance: createSuccessResult(balance),
      transactions: createSuccessResult(transactions),
      upcoming: createSuccessResult(upcoming),
      trend: createSuccessResult(trend),
    };
  } catch (error) {
    return {
      balance: createErrorResult(loadingBalance.data, error),
      transactions: createErrorResult(loadingTransactions.data, error),
      upcoming: createErrorResult(loadingUpcoming.data, error),
      trend: createErrorResult(loadingTrend.data, error),
    };
  }
}
