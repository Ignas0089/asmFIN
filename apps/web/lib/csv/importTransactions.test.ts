import { parseTransactionCsvText } from "./importTransactions";

describe("parseTransactionCsvText", () => {
  it("parses transactions and reports duplicates", () => {
    const csv = `Date,Description,Amount,Category\n` +
      `2024-06-01,Coffee,-3.50,Cafe\n` +
      `2024-06-01,Coffee,-3.50,Cafe\n` +
      `2024-06-05,Salary,1500,Income`;

    const result = parseTransactionCsvText(csv);

    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0]).toMatchObject({
      rowNumber: 2,
      occurredOn: "2024-06-01",
      description: "Coffee",
      amount: 3.5,
      type: "expense",
      category: "Cafe",
      duplicateOfRow: undefined,
    });
    expect(result.transactions[1]).toMatchObject({
      rowNumber: 3,
      duplicateOfRow: 2,
    });
    expect(result.transactions[2]).toMatchObject({
      rowNumber: 4,
      type: "income",
      amount: 1500,
    });

    expect(result.duplicates).toEqual([
      {
        key: "2024-06-01|coffee|3.50",
        firstRow: 2,
        duplicateRow: 3,
      },
    ]);
    expect(result.errors).toHaveLength(0);
    expect(result.metadata).toMatchObject({
      totalRows: 3,
      processedRows: 3,
      skippedRows: 0,
      duplicateCount: 1,
    });
  });

  it("collects row errors for invalid data", () => {
    const csv = `Date,Description,Amount\n` +
      `invalid date,Coffee,-3.50\n` +
      `2024-06-02,,4.00`;

    const result = parseTransactionCsvText(csv);

    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatchObject({
      rowNumber: 2,
      message: "Missing or invalid date value.",
    });
    expect(result.errors[1]).toMatchObject({
      rowNumber: 3,
      message: "Missing transaction description.",
    });
    expect(result.metadata).toMatchObject({
      processedRows: 0,
      skippedRows: 2,
    });
  });

  it("supports custom delimiters and decimal separators", () => {
    const csv = `Date;Description;Amount\n` + `2024-06-01;Cappuccino;-3,50`;

    const result = parseTransactionCsvText(csv, {
      delimiter: ";",
      decimalSeparator: ",",
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      amount: 3.5,
      type: "expense",
    });
  });

  it("throws when required headers are missing", () => {
    const csv = `Description,Amount\nCoffee,-3.5`;

    expect(() => parseTransactionCsvText(csv)).toThrowError(
      /missing required columns/i,
    );
  });
});
