import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, vi } from "vitest";

import type { CategorySummary } from "../../lib/data/finance";
import { SpendingByCategoryChart } from "./SpendingByCategoryChart";

vi.mock("recharts", () => {
  const MockComponent = ({ children }: { children?: ReactNode }) => (
    <div data-mock="recharts">{children}</div>
  );

  return {
    ResponsiveContainer: MockComponent,
    PieChart: MockComponent,
    Pie: MockComponent,
    Cell: ({ children }: { children?: ReactNode }) => (
      <div data-mock="cell">{children}</div>
    ),
    Tooltip: MockComponent,
  };
});

const baseSummaries: CategorySummary[] = [
  {
    categoryId: "1",
    name: "Food",
    type: "expense",
    color: null,
    total: 120.25,
  },
  {
    categoryId: "2",
    name: "Transport",
    type: "expense",
    color: "#abcdef",
    total: 80,
  },
  {
    categoryId: "3",
    name: "Salary",
    type: "income",
    color: null,
    total: 2500,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpendingByCategoryChart", () => {
  it("renders loading state", () => {
    render(
      <SpendingByCategoryChart summaries={[]} isLoading error={null} />
    );

    expect(
      screen.getByText("Loading spending data…", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders error state when provided", () => {
    render(
      <SpendingByCategoryChart
        summaries={[]}
        isLoading={false}
        error="Unable to load categories"
      />
    );

    expect(
      screen.getByRole("alert", {
        name: "We couldn't load this chart",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Unable to load categories")).toBeInTheDocument();
  });

  it("renders empty state when no expense summaries exist", () => {
    render(
      <SpendingByCategoryChart
        summaries={[]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText("No category spending yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add expenses with categories to see your spending breakdown."
      )
    ).toBeInTheDocument();
  });

  it("renders chart total and legend when data is available", () => {
    render(
      <SpendingByCategoryChart
        summaries={baseSummaries}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText("Spending by category")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("200,25"))
    ).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });
});
