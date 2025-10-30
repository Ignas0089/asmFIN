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
import { CATEGORY_PALETTE } from "../../lib/dashboard/chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartState } from "./ChartState";

const SECTION_ID = "spending-by-category-heading";

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
          : CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
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
      aria-labelledby={SECTION_ID}
      className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={SECTION_ID} className="text-base font-semibold text-slate-900">
          Spending by category
        </h2>
        <p className="text-sm text-slate-500">
          {total > 0 ? formatCurrency(total) : "No spending recorded"}
        </p>
      </header>

      {error ? (
        <ChartState variant="error" message={error} />
      ) : isLoading ? (
        <ChartState
          variant="loading"
          message="Loading spending data…"
          description="We’re syncing your latest category totals."
        />
      ) : data.length === 0 ? (
        <ChartState
          variant="empty"
          message="No category spending yet"
          description="Add expenses with categories to see your spending breakdown."
        />
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

          <ChartLegend
            className="mt-6"
            items={data.map((entry) => ({
              label: entry.name,
              color: entry.color,
              value: formatCurrency(entry.value),
            }))}
          />
        </>
      )}
    </section>
  );
}
