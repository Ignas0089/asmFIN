import type { TransactionWithCategory } from "../../lib/data/finance";
import { formatCurrency, formatFullDate } from "../../lib/format";

export interface UpcomingBillsListProps {
  title?: string;
  bills: TransactionWithCategory[];
  isLoading?: boolean;
  error?: string | null;
}

export function UpcomingBillsList({
  title = "Upcoming bills",
  bills,
  isLoading = false,
  error,
}: UpcomingBillsListProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {isLoading ? (
          <span className="text-xs font-medium text-slate-400">Loading…</span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {bills.length === 0 && !isLoading && !error ? (
          <li className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
            You&apos;re all caught up on bills.
          </li>
        ) : null}
        {bills.map((bill) => (
          <li
            key={bill.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/70 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {bill.description || bill.category?.name || "Upcoming expense"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Due {formatFullDate(bill.occurred_on)}
              </p>
            </div>
            <p className="text-sm font-semibold text-rose-600">
              -{formatCurrency(Math.abs(bill.amount))}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
