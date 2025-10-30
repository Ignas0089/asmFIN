"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";

import type { CategorySummary } from "../../lib/data/finance";
import { formatCurrency } from "../../lib/format";

const FALLBACK_COLORS = [
  "#A5D8FF",
  "#B5E48C",
  "#FFC8DD",
  "#FFD6A5",
  "#CDB4DB",
  "#FFADAD",
  "#BDE0FE",
  "#FBC3BC",
];

interface SpendingByCategoryChartProps {
  summaries: CategorySummary[];
  isLoading: boolean;
  error: string | null;
}

interface ChartDatum {
  name: string;
  value: number;
  color: string;
}

function buildChartData(summaries: CategorySummary[]): ChartDatum[] {
  return summaries
    .filter((summary) => summary.type === "expense" && summary.total > 0)
    .map<ChartDatum>((summary, index) => ({
      name: summary.name,
      value: summary.total,
      color:
        summary.color?.trim() && summary.color !== "#000000"
          ? summary.color
          : FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
}

function SpendingTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ name, value }] = payload;
  const formattedValue = typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-slate-600">{formattedValue}</p>
    </div>
  );
}

export function SpendingByCategoryChart({
  summaries,
  isLoading,
  error,
}: SpendingByCategoryChartProps) {
  const data = useMemo(() => buildChartData(summaries), [summaries]);
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  return (
    <section
      aria-label="Spending by category"
      className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">
          Spending by category
        </h2>
        <p className="text-sm text-slate-500">
          {total > 0 ? formatCurrency(total) : "No spending recorded"}
        </p>
      </header>

      {error ? (
        <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : isLoading ? (
        <div className="mt-8 flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading spending data…
        </div>
      ) : data.length === 0 ? (
        <div className="mt-8 flex flex-1 items-center justify-center text-sm text-slate-500">
          Add expenses with categories to see your spending breakdown.
        </div>
      ) : (
        <>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="white"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SpendingTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            {data.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(entry.value)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
