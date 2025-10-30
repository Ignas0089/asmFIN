import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";

import { TransactionImportPanel } from "./TransactionImportPanel";

const mockParseTransactionCsv = vi.fn();
const mockGetSupabaseClient = vi.fn();

vi.mock("../../lib/csv/importTransactions", () => ({
  parseTransactionCsv: (...args: unknown[]) => mockParseTransactionCsv(...args),
}));

vi.mock("../../lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockGetSupabaseClient(),
}));

beforeEach(() => {
  mockParseTransactionCsv.mockReset();
  mockGetSupabaseClient.mockReset();
});

describe("TransactionImportPanel", () => {
  it("shows validation error for non-CSV files", () => {
    render(<TransactionImportPanel />);

    const input = screen.getByLabelText(/drop csv file here/i);
    const invalidFile = new File(["test"], "receipt.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(
      screen.getByText("Please choose a CSV file (.csv).")
    ).toBeInTheDocument();
  });

  it("parses a CSV file and displays the parsed summary", async () => {
    const user = userEvent.setup();
    const parseResult = {
      transactions: [
        {
          rowNumber: 2,
          occurredOn: "2024-06-01",
          description: "Coffee",
          amount: 3.5,
          type: "expense",
          category: "Cafe",
          notes: null,
          raw: {},
        },
      ],
      duplicates: [],
      errors: [],
      metadata: {
        totalRows: 1,
        processedRows: 1,
        skippedRows: 0,
        duplicateCount: 0,
        headers: ["Date", "Description", "Amount"],
        source: "import.csv",
      },
    };

    mockParseTransactionCsv.mockResolvedValue(parseResult);

    render(<TransactionImportPanel />);

    const input = screen.getByLabelText(/drop csv file here/i);
    const file = new File(["Date,Description,Amount\n"], "import.csv", {
      type: "text/csv",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("File validated. Continue to prepare the import.");

    await user.click(screen.getByRole("button", { name: "Prepare import" }));

    await screen.findByText(
      "File parsed successfully. Review the summary below and import when ready."
    );

    expect(mockParseTransactionCsv).toHaveBeenCalledWith(file, {
      sourceName: "import.csv",
    });
    expect(screen.getByText("Parsed summary")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("imports transactions via Supabase and calls completion callback", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const parseResult = {
      transactions: [
        {
          rowNumber: 2,
          occurredOn: "2024-06-01",
          description: "Coffee",
          amount: 3.5,
          type: "expense",
          category: "Cafe",
          notes: null,
          raw: {},
        },
      ],
      duplicates: [],
      errors: [],
      metadata: {
        totalRows: 1,
        processedRows: 1,
        skippedRows: 0,
        duplicateCount: 0,
        headers: ["Date", "Description", "Amount"],
        source: "import.csv",
      },
    };

    const summary = {
      insertedCount: 1,
      failedCount: 0,
      createdCategories: 0,
      errors: [],
    };

    const invoke = vi.fn().mockResolvedValue({ data: summary, error: null });
    mockParseTransactionCsv.mockResolvedValue(parseResult);
    mockGetSupabaseClient.mockReturnValue({ functions: { invoke } });

    render(<TransactionImportPanel onImportComplete={onComplete} />);

    const input = screen.getByLabelText(/drop csv file here/i);
    const file = new File(["Date,Description,Amount\n"], "import.csv", {
      type: "text/csv",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("File validated. Continue to prepare the import.");

    await user.click(screen.getByRole("button", { name: "Prepare import" }));

    await screen.findByText(
      "File parsed successfully. Review the summary below and import when ready."
    );

    await user.click(
      screen.getByRole("button", { name: "Import 1 transaction" })
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("sync_transactions", {
        body: {
          transactions: [
            {
              occurredOn: "2024-06-01",
              description: "Coffee",
              amount: 3.5,
              type: "expense",
              category: "Cafe",
              notes: null,
              source: "import.csv",
            },
          ],
        },
      });
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });

    expect(
      screen.getByText(
        "Import completed successfully. Dashboard will refresh."
      )
    ).toBeInTheDocument();
  });
});
