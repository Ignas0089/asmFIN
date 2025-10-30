import { getSupabaseServerClient } from "../supabase/server";
import type { Database } from "../types";

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
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export interface CategorySummary {
  categoryId: string | null;
  name: string;
  type: TransactionRow["type"];
  color: string | null;
  total: number;
}

export interface CategorySummaryOptions extends DateRange {
  limit?: number;
}

export async function fetchRecentTransactions(
  options: FetchRecentTransactionsOptions = {}
): Promise<TransactionWithCategory[]> {
  const { limit = 10, startDate, endDate } = options;
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
}

export async function fetchBalanceSummary(
  range: DateRange = {}
): Promise<BalanceSummary> {
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
}

export async function fetchCategorySummaries(
  options: CategorySummaryOptions = {}
): Promise<CategorySummary[]> {
  const { startDate, endDate, limit } = options;
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
      const category = row.category_id ? byId.get(row.category_id) ?? null : null;
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
}
