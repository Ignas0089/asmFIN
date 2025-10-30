import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TransactionType = "income" | "expense";

type IncomingTransaction = {
  occurredOn: string;
  description: string;
  amount: number;
  type: TransactionType;
  category?: string | null;
  notes?: string | null;
  source?: string | null;
};

type TransactionInsert = {
  occurred_on: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  notes: string | null;
  source: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
};

type ImportSummary = {
  insertedCount: number;
  failedCount: number;
  createdCategories: number;
  categoryMappings: Record<string, string>;
  errors: string[];
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers({ "Content-Type": "application/json", ...corsHeaders });
  for (const [key, value] of Object.entries(init.headers ?? {})) {
    headers.set(key, value as string);
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function badRequest(message: string) {
  return jsonResponse({ error: message }, { status: 400 });
}

function unauthorized(message: string) {
  return jsonResponse({ error: message }, { status: 401 });
}

function serverError(message: string, errors?: string[]) {
  return jsonResponse({ error: message, details: errors }, { status: 500 });
}

function normalizeCategoryKey(name: string, type: TransactionType) {
  return `${type}:${name.trim().toLowerCase()}`;
}

function validateTransactions(
  payload: unknown
): IncomingTransaction[] | Response {
  if (!payload || typeof payload !== "object") {
    return badRequest("Request body must be an object.");
  }

  const { transactions } = payload as { transactions?: unknown };

  if (!Array.isArray(transactions)) {
    return badRequest("`transactions` must be an array of transaction objects.");
  }

  if (transactions.length === 0) {
    return badRequest("`transactions` array must contain at least one item.");
  }

  const parsed: IncomingTransaction[] = [];
  const errors: string[] = [];

  transactions.forEach((item, index) => {
    const row = item ?? {};

    if (typeof row !== "object" || row === null) {
      errors.push(`Row ${index + 1}: expected an object.`);
      return;
    }

    const occurredOn = (row as Record<string, unknown>)["occurredOn"];
    const description = (row as Record<string, unknown>)["description"];
    const amount = (row as Record<string, unknown>)["amount"];
    const type = (row as Record<string, unknown>)["type"];
    const category = (row as Record<string, unknown>)["category"];
    const notes = (row as Record<string, unknown>)["notes"];
    const source = (row as Record<string, unknown>)["source"];

    if (typeof occurredOn !== "string" || occurredOn.trim().length === 0) {
      errors.push(`Row ${index + 1}: occurredOn is required.`);
      return;
    }

    if (typeof description !== "string" || description.trim().length === 0) {
      errors.push(`Row ${index + 1}: description is required.`);
      return;
    }

    if (typeof amount !== "number" || Number.isNaN(amount)) {
      errors.push(`Row ${index + 1}: amount must be a number.`);
      return;
    }

    if (type !== "income" && type !== "expense") {
      errors.push(`Row ${index + 1}: type must be "income" or "expense".`);
      return;
    }

    const normalized: IncomingTransaction = {
      occurredOn,
      description,
      amount,
      type,
      category:
        typeof category === "string" && category.trim().length > 0
          ? category
          : null,
      notes:
        typeof notes === "string" && notes.trim().length > 0 ? notes : null,
      source:
        typeof source === "string" && source.trim().length > 0 ? source : null,
    };

    parsed.push(normalized);
  });

  if (parsed.length === 0) {
    return badRequest(
      `No valid transactions provided.${
        errors.length ? ` Errors: ${errors.join(" ")}` : ""
      }`
    );
  }

  if (errors.length) {
    return badRequest(errors.join(" "));
  }

  return parsed;
}

async function ensureCategories(
  supabase: ReturnType<typeof createClient>,
  transactions: IncomingTransaction[]
): Promise<{
  categories: Map<string, CategoryRow>;
  createdCount: number;
  error?: Response;
}> {
  const existing = new Map<string, CategoryRow>();
  const requested = new Map<string, { name: string; type: TransactionType }>();

  for (const txn of transactions) {
    if (!txn.category) continue;
    const key = normalizeCategoryKey(txn.category, txn.type);
    if (!requested.has(key)) {
      requested.set(key, { name: txn.category, type: txn.type });
    }
  }

  if (requested.size === 0) {
    return { categories: existing, createdCount: 0 };
  }

  const { data: allCategories, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, type, color");

  if (fetchError) {
    return {
      categories: existing,
      createdCount: 0,
      error: serverError(`Failed to load categories: ${fetchError.message}`),
    };
  }

  for (const row of allCategories ?? []) {
    const key = normalizeCategoryKey(row.name, row.type as TransactionType);
    existing.set(key, row as CategoryRow);
  }

  const toInsert: { name: string; type: TransactionType }[] = [];

  for (const [key, value] of requested.entries()) {
    if (!existing.has(key)) {
      toInsert.push(value);
    }
  }

  if (toInsert.length === 0) {
    return { categories: existing, createdCount: 0 };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("categories")
    .insert(
      toInsert.map((item) => ({
        name: item.name.trim(),
        type: item.type,
      }))
    )
    .select("id, name, type, color");

  if (insertError) {
    return {
      categories: existing,
      createdCount: 0,
      error: serverError(
        `Failed to create categories: ${insertError.message}`
      ),
    };
  }

  for (const row of inserted ?? []) {
    const key = normalizeCategoryKey(row.name, row.type as TransactionType);
    existing.set(key, row as CategoryRow);
  }

  return { categories: existing, createdCount: inserted?.length ?? 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Supabase environment variables are not configured.");
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return unauthorized("Authorization header is required.");
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    return badRequest("Request body must be valid JSON.");
  }

  const validated = validateTransactions(payload);

  if (validated instanceof Response) {
    return validated;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { categories, createdCount, error } = await ensureCategories(
    supabase,
    validated
  );

  if (error) {
    return error;
  }

  const inserts: TransactionInsert[] = validated.map((txn) => {
    const key = txn.category
      ? normalizeCategoryKey(txn.category, txn.type)
      : null;
    const category = key ? categories.get(key) ?? null : null;

    return {
      occurred_on: txn.occurredOn,
      description: txn.description,
      amount: txn.amount,
      type: txn.type,
      category_id: category ? category.id : null,
      notes: txn.notes ?? null,
      source: txn.source ?? "csv",
    };
  });

  const { data, error: insertError } = await supabase
    .from("transactions")
    .insert(inserts)
    .select("id");

  if (insertError) {
    return serverError(`Failed to insert transactions: ${insertError.message}`);
  }

  const summary: ImportSummary = {
    insertedCount: data?.length ?? 0,
    failedCount: validated.length - (data?.length ?? 0),
    createdCategories: createdCount,
    categoryMappings: Object.fromEntries(
      Array.from(categories.entries()).map(([key, value]) => [key, value.id])
    ),
    errors: [],
  };

  return jsonResponse(summary, { status: 200 });
});
