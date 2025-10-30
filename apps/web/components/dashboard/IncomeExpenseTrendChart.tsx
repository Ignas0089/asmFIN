"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
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

const INCOME_COLOR = "#34D399";
const EXPENSE_COLOR = "#60A5FA";

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

  const latestNet = chartData.at(-1)?.net ?? 0;

  return (
    <section
      aria-label="Income versus expenses trend"
      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
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
        <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : isLoading ? (
        <div className="mt-10 flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading trend…
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-10 flex flex-1 items-center justify-center text-sm text-slate-500">
          Add transactions to visualize your income and spending trends.
        </div>
      ) : (
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
              <XAxis dataKey="label" stroke="#94A3B8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94A3B8"
                tickFormatter={(value) => formatCurrency(Number(value))}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#CBD5F5", strokeWidth: 1 }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={INCOME_COLOR}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expenses"
                stroke={EXPENSE_COLOR}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
