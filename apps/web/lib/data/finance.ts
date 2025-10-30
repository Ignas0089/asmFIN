import { getSupabaseServerClient } from "../supabase/server";
import type { Database } from "../types";
import {
  createErrorResult,
  createLoadingResult,
  createSuccessResult,
  DataResult,
  executeWithRetry,
} from "./queryHelpers";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

type DateRange = {
  startDate?: string;
  endDate?: string;
};

export type TransactionWithCategory = TransactionRow & {
  category: CategoryRow | null;
};

export interface FetchRecentTransactionsOptions extends DateRange {
  limit?: number;
  optimisticData?: TransactionWithCategory[];
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
}

const DEFAULT_BALANCE_SUMMARY: BalanceSummary = {
  totalIncome: 0,
  totalExpense: 0,
  net: 0,
};

export interface CategorySummary {
  categoryId: string | null;
  name: string;
  type: TransactionRow["type"];
  color: string | null;
  total: number;
}

export interface CategorySummaryOptions extends DateRange {
  limit?: number;
  optimisticData?: CategorySummary[];
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface BalanceSummaryOptions extends DateRange {
  optimisticData?: BalanceSummary;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface DataLoadResult<T> {
  loading: DataResult<T>;
  result: DataResult<T>;
}

export async function fetchRecentTransactions(
  options: FetchRecentTransactionsOptions = {}
): Promise<TransactionWithCategory[]> {
  const { limit = 10, startDate, endDate, retryAttempts, retryDelayMs } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseServerClient();

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
        throw new Error(`Failed to load recent transactions: ${error.message}`);
      }

      return data ?? [];
    },
    {
      retries: retryAttempts ?? 2,
      retryDelayMs,
    }
  );
}

export async function fetchBalanceSummary(
  range: BalanceSummaryOptions = {}
): Promise<BalanceSummary> {
  const { retryAttempts, retryDelayMs } = range;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseServerClient();

      let query = supabase
        .from("transactions")
        .select("type, total:amount.sum()", { group: "type" });

      if (range.startDate) {
        query = query.gte("occurred_on", range.startDate);
      }

      if (range.endDate) {
        query = query.lte("occurred_on", range.endDate);
      }

      const { data, error } = await query.returns<
        { type: TransactionRow["type"]; total: number | null }[]
      >();

      if (error) {
        throw new Error(`Failed to load balance summary: ${error.message}`);
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

export async function fetchCategorySummaries(
  options: CategorySummaryOptions = {}
): Promise<CategorySummary[]> {
  const { startDate, endDate, limit, retryAttempts, retryDelayMs } = options;

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseServerClient();

      let query = supabase
        .from("transactions")
        .select("category_id, type, total:amount.sum()", {
          group: "category_id, type",
        });

      if (startDate) {
        query = query.gte("occurred_on", startDate);
      }

      if (endDate) {
        query = query.lte("occurred_on", endDate);
      }

      const { data, error } = await query.returns<
        { category_id: string | null; type: TransactionRow["type"]; total: number | null }[]
      >();

      if (error) {
        throw new Error(`Failed to load category summaries: ${error.message}`);
      }

      const aggregate = data ?? [];
      const categoryIds = Array.from(
        new Set(
          aggregate
            .map((row) => row.category_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let categories: CategoryRow[] = [];
      if (categoryIds.length > 0) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("*")
          .in("id", categoryIds);

        if (categoryError) {
          throw new Error(
            `Failed to load categories for summaries: ${categoryError.message}`
          );
        }

        categories = categoryData ?? [];
      }

      const byId = new Map(categories.map((category) => [category.id, category]));

      const summaries = aggregate
        .map<CategorySummary>((row) => {
          const category = row.category_id
            ? byId.get(row.category_id) ?? null
            : null;
          const fallbackName = row.category_id ? "Unknown" : "Uncategorized";

          return {
            categoryId: row.category_id,
            name: category?.name ?? fallbackName,
            type: category?.type ?? row.type,
            color: category?.color ?? null,
            total: Number(row.total) || 0,
          };
        })
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

export async function loadRecentTransactions(
  options: FetchRecentTransactionsOptions = {}
): Promise<DataLoadResult<TransactionWithCategory[]>> {
  const optimisticData = options.optimisticData ?? [];
  const loading = createLoadingResult(optimisticData);

  try {
    const data = await fetchRecentTransactions(options);
    return { loading, result: createSuccessResult(data) };
  } catch (error) {
    return { loading, result: createErrorResult(optimisticData, error) };
  }
}

export async function loadBalanceSummary(
  options: BalanceSummaryOptions = {}
): Promise<DataLoadResult<BalanceSummary>> {
  const optimisticData = options.optimisticData ?? DEFAULT_BALANCE_SUMMARY;
  const loading = createLoadingResult(optimisticData);

  try {
    const data = await fetchBalanceSummary(options);
    return { loading, result: createSuccessResult(data) };
  } catch (error) {
    return { loading, result: createErrorResult(optimisticData, error) };
  }
}

export async function loadCategorySummaries(
  options: CategorySummaryOptions = {}
): Promise<DataLoadResult<CategorySummary[]>> {
  const optimisticData = options.optimisticData ?? [];
  const loading = createLoadingResult(optimisticData);

  try {
    const data = await fetchCategorySummaries(options);
    return { loading, result: createSuccessResult(data) };
  } catch (error) {
    return { loading, result: createErrorResult(optimisticData, error) };
  }
}
