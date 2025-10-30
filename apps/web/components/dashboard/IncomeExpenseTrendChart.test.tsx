import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, vi } from "vitest";

import type { IncomeExpenseTrendPoint } from "../../lib/data/finance";
import { IncomeExpenseTrendChart } from "./IncomeExpenseTrendChart";

vi.mock("recharts", () => {
  const MockComponent = ({ children }: { children?: ReactNode }) => (
    <div data-mock="recharts">{children}</div>
  );

  return {
    ResponsiveContainer: MockComponent,
    LineChart: MockComponent,
    Line: MockComponent,
    CartesianGrid: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    Tooltip: MockComponent,
  };
});

const points: IncomeExpenseTrendPoint[] = [
  { date: "2024-04-01", income: 1500, expense: 900, net: 600 },
  { date: "2024-05-01", income: 1600, expense: 950, net: 650 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IncomeExpenseTrendChart", () => {
  it("renders loading state", () => {
    render(
      <IncomeExpenseTrendChart
        points={[]}
        isLoading
        error={null}
        selectedRange="6m"
        onRangeChange={vi.fn()}
      />
    );

    expect(screen.getByText("Loading trend…")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(
      <IncomeExpenseTrendChart
        points={[]}
        isLoading={false}
        error="Failed to load"
        selectedRange="6m"
        onRangeChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("alert", { name: "We couldn't load this chart" })
    ).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders empty state when no points exist", () => {
    render(
      <IncomeExpenseTrendChart
        points={[]}
        isLoading={false}
        error={null}
        selectedRange="6m"
        onRangeChange={vi.fn()}
      />
    );

    expect(screen.getByText("No trend data yet")).toBeInTheDocument();
  });

  it("renders chart content and triggers range changes", async () => {
    const onRangeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <IncomeExpenseTrendChart
        points={points}
        isLoading={false}
        error={null}
        selectedRange="6m"
        onRangeChange={onRangeChange}
      />
    );

    expect(screen.getByText("Income vs. expenses")).toBeInTheDocument();
    expect(screen.getByText(/Latest net balance:/)).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3M" }));
    expect(onRangeChange).toHaveBeenCalledWith("3m");
  });
});
