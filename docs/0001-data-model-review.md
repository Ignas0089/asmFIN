# Data Model Review – Personal Finance App

## Summary
This document summarizes the confirmed data entities derived from the PRD for the personal finance dashboard and outlines items that are intentionally deferred for later iterations.

## Core Entities
- **categories**
  - Represents spending or income groupings that transactions map to.
  - Fields: `id`, `name`, `type` (`income` | `expense`), `color`, `created_at`, `updated_at`.
  - Unique per `name` + `type` to allow reuse of labels across types without conflict.
- **transactions**
  - Stores the normalized record of a financial event imported via CSV or entered manually.
  - Fields: `id`, `occurred_on`, `description`, `amount` (EUR), `type`, `category_id`, `notes`, `source`, `created_at`, `updated_at`.
  - `type` mirrors category type when assigned; `source` captures origin metadata (e.g., `manual`, `csv`).

## Deferred / Out of Scope
- **User accounts**: Authentication is explicitly deferred in the initial release; all data is scoped to a single workspace.
- **Budgets / goals**: Not required for the first milestone; to be re-evaluated after dashboard foundation is complete.
- **Audit history**: Full change-tracking tables are unnecessary until collaborative workflows are introduced.
- **Import batch tracking**: CSV imports can be replayed freely in development, so persistent batch metadata is omitted for now.

## Notes
- Keep timestamps in UTC (`timezone('utc', now())`) to align with Supabase defaults.
- Derived aggregates for charts will be computed in application code initially; consider materialized views once performance dictates.
