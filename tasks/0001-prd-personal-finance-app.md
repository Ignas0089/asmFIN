# Personal Finance Web App PRD

## Context
- Individual consumers seeking to track personal finances without shared accounts.
- Delivered as a browser-based web application; mobile-responsive behavior assumed but native apps are out of scope.
- Users operate exclusively with EUR; multi-currency support is deferred.

## Goals
1. Enable individuals to visualize their income and spending trends in EUR.
2. Provide clear snapshots of category distributions to inform budgeting decisions.
3. Support quick onboarding through CSV transaction imports from external banking tools.

## Requirements
1. Users can upload CSV files containing transaction history (date, description, amount, category).
2. The system parses EUR-denominated CSVs and stores transactions for visualization.
3. Provide a line chart showing income vs. expenses over time with adjustable time ranges.
4. Provide a pie chart summarizing spending by category for a selected period.
5. Allow manual editing of transaction categories and basic transaction metadata (description, category, type).
6. Offer filtering by date range and category to refine displayed data.
7. Maintain a pastel-themed UI palette while leaving exact color choices to design.

## UX
- Web interface with dashboard landing screen displaying both the line chart (trends) and pie chart (distribution).
- CSV import flow includes file selection, parsing feedback, and error messaging for invalid formats or non-EUR data.
- Users can switch between predefined time ranges (e.g., last 30 days, last quarter, custom range) to refresh charts.
- Inline editing or modal dialogs for updating transaction metadata, with immediate chart refresh on save.
- Responsive layout ensures charts and tables remain readable on desktop and tablet viewports; mobile optimization is desirable but secondary.

## Data
- CSV schema: `date`, `description`, `amount` (EUR), `category`, with optional `type` (income/expense).
- Stored transactions include parsed fields plus normalized category identifiers and timestamps.
- Derived aggregates for charting (time-series totals per period, spending totals per category) cached for performance.
- No authentication or user account storage yet; assume single-user session scoped data persistence (e.g., local storage or simple backend stub).

## Open Questions
1. Should recurring imports deduplicate transactions or allow duplicates?
2. Are there preferred CSV header variations that must be supported beyond the base schema?
3. What level of accessibility compliance (WCAG) is required for charts and visualizations?
4. Is there a need for data export (e.g., CSV download) in this initial scope?
