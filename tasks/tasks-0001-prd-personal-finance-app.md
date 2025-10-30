## Relevant Files

- `docs/0001-data-model-review.md` - Notes confirming entities derived from the PRD.
- `supabase/migrations/*` - SQL migration scripts defining database schema changes for finance entities.
- `supabase/seed.sql` - Development fixture inserts for categories and transactions.
- `.env.example` - Documented Supabase environment variables required by the web app.
- `package.json` - Workspace root scripts delegating to the web application.
- `apps/web/package.json` - Next.js app package definition and scripts.
- `supabase/functions/sync_transactions.ts` - Edge function to validate and insert imported transactions.
- `apps/web/lib/env.ts` - Centralized environment variable validation shared by client and server utilities.
- `apps/web/lib/types.ts` - Shared Supabase-generated types for strongly typed queries.
- `apps/web/lib/supabase/client.ts` - Supabase client setup used across the dashboard.
- `apps/web/lib/supabase/server.ts` - Supabase server-side client for trusted data fetching.
- `apps/web/lib/data/finance.ts` - Typed data-access helpers for dashboard metrics and tables.
- `apps/web/lib/data/queryHelpers.ts` - Shared helpers for retryable Supabase queries and async states.
- `apps/web/app/dashboard/page.tsx` - Main dashboard route composing widgets and data providers.
- `apps/web/components/BalanceOverview.tsx` - Summary card component displaying key financial metrics.
- `apps/web/components/SpendingChart.tsx` - Chart component rendering categorized spending using charting library.
- `apps/web/components/IncomeVsExpenseChart.tsx` - Chart visualizing income versus expenses over time.
- `apps/web/components/TransactionsTable.tsx` - Tabular view of transactions with pagination and filters.
- `apps/web/lib/csv/importTransactions.ts` - Utility for parsing and normalizing uploaded CSV transaction data.
- `apps/web/tests/dashboard.spec.tsx` - Integration tests covering dashboard interactions and data flow.
- `apps/web/tests/import.spec.ts` - Tests validating CSV import and Supabase persistence logic.

### Notes

- Coordinate schema names and column types between SQL migrations and TypeScript models.
- Use environment variables for Supabase keys; never commit secrets.
- Prefer colocated `*.test.tsx` files for component-level tests when adding new components.

## Tasks

- [ ] 1.0 Define and migrate the personal finance database schema
  - [x] 1.1 Review PRD data requirements to confirm necessary entities (categories, transactions, supporting metadata).
  - [x] 1.2 Create Supabase SQL migrations for tables, relationships, constraints, and enum types.
  - [x] 1.3 Seed development fixtures (sample categories, transactions) for testing the dashboard.

- [ ] 2.0 Integrate Supabase client and server-side data access
  - [x] 2.1 Configure Supabase client initialization with secure environment variable handling.
  - [x] 2.2 Implement server-side data fetching utilities for transactions, category summaries, and balances.
  - [x] 2.3 Add optimistic error handling, loading states, and retry logic for Supabase requests.

- [ ] 3.0 Build dashboard layout and data wiring
  - [ ] 3.1 Implement dashboard route structure with authenticated access guard and layout shell.
  - [ ] 3.2 Compose summary widgets (balances, cash flow, upcoming bills) driven by Supabase queries.
  - [ ] 3.3 Connect real-time updates or polling to refresh dashboard metrics when data changes.

- [ ] 4.0 Implement financial charts and visualizations
  - [ ] 4.1 Develop spending by category chart using reusable chart component and responsive design.
  - [ ] 4.2 Create income versus expenses trend chart with time range selector.
  - [ ] 4.3 Ensure charts share consistent color palette, legends, accessibility labels, and loading states.

- [ ] 5.0 Support CSV transaction import workflow
  - [ ] 5.1 Build client-side CSV upload UI with validation messaging and parsing status indicators.
  - [ ] 5.2 Implement CSV parsing utility to normalize transaction fields and detect duplicates.
  - [ ] 5.3 Create Supabase edge function or RPC to insert parsed transactions and return import summary.
  - [ ] 5.4 Wire import results into dashboard tables and trigger refresh on completion.

- [ ] 6.0 Implement automated testing and quality gates
  - [ ] 6.1 Add unit tests for data utilities, CSV parsing, and Supabase integration helpers.
  - [ ] 6.2 Create component tests for dashboard widgets, charts, and import flow using testing library.
  - [ ] 6.3 Define end-to-end smoke test covering login, dashboard view, and CSV upload success scenario.
  - [ ] 6.4 Configure CI workflow (if absent) to run linting, type checking, and test suites on pull requests.
