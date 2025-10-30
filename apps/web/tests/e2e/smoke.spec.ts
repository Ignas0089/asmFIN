import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://your-project-ref.supabase.co";
const FUNCTIONS_URL = SUPABASE_URL.replace(
  ".supabase.co",
  ".functions.supabase.co"
);

const AUTH_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@asmfin.test",
  role: "authenticated",
  aud: "authenticated",
  user_metadata: {
    full_name: "Demo User",
  },
  app_metadata: {
    provider: "email",
    providers: ["email"],
  },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const BALANCE_ROWS = [
  { type: "income", total: 2150.0 },
  { type: "expense", total: 780.0 },
];

const RECENT_TRANSACTIONS = [
  {
    id: "tx-1",
    occurred_on: "2024-05-28",
    description: "Salary",
    amount: 2150.0,
    type: "income",
    notes: "",
    source: "csv",
    created_at: "2024-05-28T08:00:00Z",
    updated_at: "2024-05-28T08:00:00Z",
    category_id: "cat-salary",
    categories: {
      id: "cat-salary",
      name: "Salary",
      type: "income",
      color: "#7dd3fc",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
  {
    id: "tx-2",
    occurred_on: "2024-05-30",
    description: "Groceries",
    amount: 120.0,
    type: "expense",
    notes: "Weekly shop",
    source: "csv",
    created_at: "2024-05-30T08:00:00Z",
    updated_at: "2024-05-30T08:00:00Z",
    category_id: "cat-groceries",
    categories: {
      id: "cat-groceries",
      name: "Groceries",
      type: "expense",
      color: "#fca5a5",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
];

const UPCOMING_TRANSACTIONS = [
  {
    id: "tx-3",
    occurred_on: "2024-06-15",
    description: "Electric bill",
    amount: 85.0,
    type: "expense",
    notes: "Monthly utility",
    source: "manual",
    created_at: "2024-05-20T08:00:00Z",
    updated_at: "2024-05-20T08:00:00Z",
    category_id: "cat-utilities",
    categories: {
      id: "cat-utilities",
      name: "Utilities",
      type: "expense",
      color: "#bfdbfe",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
];

const CATEGORY_TOTALS = [
  { category_id: "cat-groceries", total: 320.0 },
  { category_id: "cat-utilities", total: 180.0 },
];

const CATEGORY_LOOKUP = [
  { id: "cat-groceries", name: "Groceries", color: "#fca5a5" },
  { id: "cat-utilities", name: "Utilities", color: "#bfdbfe" },
];

const TREND_ROWS = [
  { occurred_on: "2024-05-01", amount: 2150.0, type: "income" },
  { occurred_on: "2024-05-03", amount: 320.0, type: "expense" },
  { occurred_on: "2024-05-10", amount: 180.0, type: "expense" },
  { occurred_on: "2024-05-24", amount: 120.0, type: "expense" },
];

const IMPORT_SUMMARY = {
  insertedCount: 2,
  failedCount: 0,
  createdCategories: 1,
  errors: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ supabaseUrl, functionsUrl, fixtures }) => {
      const realFetch = window.fetch.bind(window);

      const respond = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(body == null ? null : JSON.stringify(body), {
            status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          })
        );

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method || "GET").toUpperCase();
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (method === "OPTIONS") {
          return respond(null, 204);
        }

        if (url.startsWith(`${supabaseUrl}/auth/v1/token`)) {
          return respond(fixtures.authResponse);
        }

        if (url.startsWith(`${supabaseUrl}/auth/v1/user`)) {
          return respond({ user: fixtures.authResponse.user });
        }

        if (url.startsWith(`${supabaseUrl}/rest/v1/transactions`)) {
          const search = url.split("?")[1] ?? "";

          if (search.includes("group=type")) {
            return respond(fixtures.balanceRows);
          }

          if (search.includes("group=category_id")) {
            return respond(fixtures.categoryTotals);
          }

          if (search.includes("occurred_on,amount,type")) {
            return respond(fixtures.trendRows);
          }

          if (
            search.includes("eq=type.eq.expense") ||
            search.includes("eq=type=expense") ||
            search.includes("eq=type.expense") ||
            search.includes("type=eq.expense")
          ) {
            return respond(fixtures.upcomingTransactions);
          }

          return respond(fixtures.recentTransactions);
        }

        if (url.startsWith(`${supabaseUrl}/rest/v1/categories`)) {
          return respond(fixtures.categories);
        }

        if (url.startsWith(`${functionsUrl}/functions/v1/sync_transactions`)) {
          return respond(fixtures.importSummary);
        }

        if (url.startsWith(`${supabaseUrl}/storage/v1`)) {
          return respond({ data: [] });
        }

        return realFetch(input, init);
      };

      const MockWebSocket = class {
        readyState = 3;
        url: string;
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;

        constructor(url: string) {
          this.url = url;
          setTimeout(() => {
            this.onclose?.(new CloseEvent("close", { code: 1000, reason: "Mock websocket closed" }));
          }, 0);
        }

        send() {}
        close() {}
        addEventListener() {}
        removeEventListener() {}
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).WebSocket = MockWebSocket;
    },
    {
      supabaseUrl: SUPABASE_URL,
      functionsUrl: FUNCTIONS_URL,
      fixtures: {
        authResponse: {
          access_token: "test-access-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "test-refresh-token",
          user: AUTH_USER,
        },
        balanceRows: BALANCE_ROWS,
        recentTransactions: RECENT_TRANSACTIONS,
        upcomingTransactions: UPCOMING_TRANSACTIONS,
        categoryTotals: CATEGORY_TOTALS,
        categories: CATEGORY_LOOKUP,
        trendRows: TREND_ROWS,
        importSummary: IMPORT_SUMMARY,
      },
    }
  );
});

test("user can sign in, view dashboard metrics, and import CSV transactions", async ({ page }) => {
  await page.goto("/signin");

  await page.getByRole("textbox", { name: /email/i }).fill("demo@asmfin.test");
  await page.getByRole("textbox", { name: /password/i }).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/dashboard", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Personal finance dashboard" })
  ).toBeVisible();
  await expect(page.getByText("Net balance")).toBeVisible();
  await expect(page.getByText("Import from CSV")).toBeVisible();

  const filePath = path.resolve(__dirname, "fixtures", "sample-transactions.csv");
  await page.setInputFiles("#transaction-import-input", filePath);

  await expect(
    page.getByText("File validated. Continue to prepare the import.")
  ).toBeVisible();

  await page.getByRole("button", { name: /prepare import/i }).click();

  await expect(
    page.getByText(
      "File parsed successfully. Review the summary below and import when ready."
    )
  ).toBeVisible();

  await expect(page.getByRole("button", { name: /Import 2 transactions/i })).toBeEnabled();
  await page.getByRole("button", { name: /Import 2 transactions/i }).click();

  await expect(
    page.getByText("2 transactions added. 1 new category created.")
  ).toBeVisible();
});
