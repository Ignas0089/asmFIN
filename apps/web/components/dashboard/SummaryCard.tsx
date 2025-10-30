import { formatCurrency } from "../../lib/format";

type SummaryVariant = "neutral" | "positive" | "negative" | "informative";

const accentStyles: Record<SummaryVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-rose-100 text-rose-700",
  informative: "bg-sky-100 text-sky-700",
};

export interface SummaryCardProps {
  title: string;
  amount: number;
  description?: string;
  variant?: SummaryVariant;
  footer?: string;
  accentLabel?: string;
}

export function SummaryCard({
  title,
  amount,
  description,
  variant = "neutral",
  footer,
  accentLabel,
}: SummaryCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(amount)}
          </p>
        </div>
        <span
          className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm font-semibold ${accentStyles[variant]}`}
        >
          {accentLabel ?? `${amount >= 0 ? "+" : ""}${Math.round(amount)}`}
        </span>
      </div>
      {description ? (
        <p className="mt-3 text-sm text-slate-500">{description}</p>
      ) : null}
      {footer ? (
        <div className="mt-4 rounded-xl bg-slate-100/80 px-3 py-2 text-xs text-slate-500">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
