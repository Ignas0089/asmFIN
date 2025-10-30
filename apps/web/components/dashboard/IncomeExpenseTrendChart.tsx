"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import type { IncomeExpenseTrendPoint } from "../../lib/data/finance";
import {
  TREND_RANGE_OPTIONS,
  type TrendRangeValue,
} from "../../lib/dashboard/trendRanges";
import { formatCurrency, formatMonthYear } from "../../lib/format";
import { CHART_THEME, LINE_PALETTE } from "../../lib/dashboard/chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartState } from "./ChartState";

interface IncomeExpenseTrendChartProps {
  points: IncomeExpenseTrendPoint[];
  isLoading: boolean;
  error: string | null;
  selectedRange: TrendRangeValue;
  onRangeChange: (value: TrendRangeValue) => void;
}

interface TrendDatum {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

function TrendTooltip({ active, payload, label }: TooltipProps<string, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ payload: datum }] = payload as Array<{ payload: TrendDatum }>;
  if (!datum) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-slate-600">
        Income: <span className="font-medium text-slate-900">{formatCurrency(datum.income)}</span>
      </p>
      <p className="text-slate-600">
        Expenses: <span className="font-medium text-slate-900">{formatCurrency(datum.expense)}</span>
      </p>
      <p className="text-slate-600">
        Net: <span className="font-medium text-slate-900">{formatCurrency(datum.net)}</span>
      </p>
    </div>
  );
}

const SECTION_ID = "income-expense-trend-heading";

export function IncomeExpenseTrendChart({
  points,
  isLoading,
  error,
  selectedRange,
  onRangeChange,
}: IncomeExpenseTrendChartProps) {
  const chartData = useMemo<TrendDatum[]>(
    () =>
      points.map((point) => ({
        date: point.date,
        label: formatMonthYear(point.date),
        income: Number(point.income) || 0,
        expense: Number(point.expense) || 0,
        net: Number(point.net) || 0,
      })),
    [points]
  );

  const latest = chartData.at(-1);
  const latestNet = latest?.net ?? 0;

  return (
    <section
      aria-labelledby={SECTION_ID}
      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id={SECTION_ID} className="text-base font-semibold text-slate-900">
            Income vs. expenses
          </h2>
          <p className="text-sm text-slate-500">
            Track how your cash flow changes over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {TREND_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === selectedRange;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRangeChange(option.value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <p className="mt-2 text-sm text-slate-500">
        Latest net balance: <span className="font-medium text-slate-900">{formatCurrency(latestNet)}</span>
      </p>

      {error ? (
        <ChartState variant="error" message={error} />
      ) : isLoading ? (
        <ChartState
          variant="loading"
          message="Loading trend…"
          description="We’re refreshing income and expense totals for the selected range."
        />
      ) : chartData.length === 0 ? (
        <ChartState
          variant="empty"
          message="No trend data yet"
          description="Add transactions to visualize your income and spending trends."
        />
      ) : (
        <>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke={CHART_THEME.grid} />
                <XAxis dataKey="label" stroke={CHART_THEME.axis} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={CHART_THEME.axis}
                  tickFormatter={(value: number | string) =>
                    formatCurrency(Number(value))
                  }
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={LINE_PALETTE.income}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke={LINE_PALETTE.expense}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            className="mt-6"
            items={[
              {
                label: "Income",
                color: LINE_PALETTE.income,
                value: latest ? formatCurrency(latest.income) : undefined,
                ariaLabel: "Income line chart legend item",
              },
              {
                label: "Expenses",
                color: LINE_PALETTE.expense,
                value: latest ? formatCurrency(latest.expense) : undefined,
                ariaLabel: "Expenses line chart legend item",
              },
            ]}
          />
        </>
      )}
    </section>
  );
}
