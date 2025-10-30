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
type TrendRow = {
  occurred_on: TransactionRow["occurred_on"];
  type: TransactionRow["type"];
  amount: string | number | null;
};

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

export interface UpcomingBillsOptions extends DateRange {
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

export interface IncomeExpenseTrendPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface IncomeExpenseTrendOptions extends DateRange {
  months?: number;
  optimisticData?: IncomeExpenseTrendPoint[];
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface DataLoadResult<T> {
  loading: DataResult<T>;
  result: DataResult<T>;
}

function getIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (
    Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day)
  ) {
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date(Date.UTC(1970, 0, 1))
    : parsed;
}

function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function addMonths(value: Date, amount: number): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1)
  );
}

function clampMonths(months?: number): number {
  if (!months || months < 1) {
    return 6;
  }

  return Math.min(months, 24);
}

function createMonthlyBuckets(
  start: Date,
  end: Date
): Map<string, IncomeExpenseTrendPoint> {
  const buckets = new Map<string, IncomeExpenseTrendPoint>();
  let current = startOfMonth(start);
  const last = startOfMonth(end);

  while (current.getTime() <= last.getTime()) {
    const key = getIsoDate(current);
    buckets.set(key, { date: key, income: 0, expense: 0, net: 0 });
    current = addMonths(current, 1);
  }

  return buckets;
}

export function resolveTrendRange(
  options: IncomeExpenseTrendOptions = {}
): { startDate: string; endDate: string; start: Date; end: Date } {
  const months = clampMonths(options.months);

  const rawEnd = options.endDate
    ? parseDateOnly(options.endDate)
    : new Date();
  const bucketEnd = startOfMonth(rawEnd);

  const computedStart = addMonths(bucketEnd, -(months - 1));
  const rawStart = options.startDate
    ? parseDateOnly(options.startDate)
    : computedStart;
  const bucketStartCandidate = startOfMonth(rawStart);

  const bucketStart =
    bucketStartCandidate.getTime() > bucketEnd.getTime()
      ? bucketEnd
      : bucketStartCandidate;

  let queryStart = options.startDate ? rawStart : bucketStart;
  if (queryStart.getTime() > rawEnd.getTime()) {
    queryStart = rawEnd;
  }

  const queryStartDate = getIsoDate(queryStart);
  const queryEndDate = getIsoDate(rawEnd);

  return {
    startDate: queryStartDate,
    endDate: queryEndDate,
    start: bucketStart,
    end: bucketEnd,
  };
}

export function buildIncomeExpenseTrend(
  rows: TrendRow[],
  range: { start: Date; end: Date }
): IncomeExpenseTrendPoint[] {
  const buckets = createMonthlyBuckets(range.start, range.end);

  for (const row of rows) {
    const occurredOn = startOfMonth(parseDateOnly(row.occurred_on));

    if (
      occurredOn.getTime() < range.start.getTime() ||
      occurredOn.getTime() > range.end.getTime()
    ) {
      continue;
    }

    const key = getIsoDate(occurredOn);
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    const amount = Number(row.amount) || 0;

    if (row.type === "income") {
      bucket.income += amount;
    } else {
      bucket.expense += amount;
    }

    bucket.net = bucket.income - bucket.expense;
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
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

export async function fetchUpcomingBills(
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
        .eq("type", "expense")
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true });

      const today = getIsoDate(new Date());
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
        throw new Error(`Failed to load upcoming bills: ${error.message}`);
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
        // Grouping is supported by PostgREST but not typed in supabase-js
        .select("type, total:amount.sum()", { group: "type" } as any);

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
        // Grouping is supported by PostgREST but not typed in supabase-js
        .select("category_id, type, total:amount.sum()", {
          group: "category_id, type",
        } as any);

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

export async function fetchIncomeExpenseTrend(
  options: IncomeExpenseTrendOptions = {}
): Promise<IncomeExpenseTrendPoint[]> {
  const { retryAttempts, retryDelayMs } = options;
  const range = resolveTrendRange(options);

  return executeWithRetry(
    async () => {
      const supabase = getSupabaseServerClient();

      const { data, error } = await supabase
        .from("transactions")
        .select("occurred_on, amount, type")
        .gte("occurred_on", range.startDate)
        .lte("occurred_on", range.endDate)
        .order("occurred_on", { ascending: true })
        .returns<Pick<TransactionRow, "occurred_on" | "amount" | "type">[]>();

      if (error) {
        throw new Error(`Failed to load trend data: ${error.message}`);
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

export async function loadIncomeExpenseTrend(
  options: IncomeExpenseTrendOptions = {}
): Promise<DataLoadResult<IncomeExpenseTrendPoint[]>> {
  const optimisticData = options.optimisticData ?? [];
  const loading = createLoadingResult(optimisticData);

  try {
    const data = await fetchIncomeExpenseTrend(options);
    return { loading, result: createSuccessResult(data) };
  } catch (error) {
    return { loading, result: createErrorResult(optimisticData, error) };
  }
}

export async function loadUpcomingBills(
  options: UpcomingBillsOptions = {}
): Promise<DataLoadResult<TransactionWithCategory[]>> {
  const optimisticData = options.optimisticData ?? [];
  const loading = createLoadingResult(optimisticData);

  try {
    const data = await fetchUpcomingBills(options);
    return { loading, result: createSuccessResult(data) };
  } catch (error) {
    return { loading, result: createErrorResult(optimisticData, error) };
  }
}
