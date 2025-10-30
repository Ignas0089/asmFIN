import { formatCurrency, formatFullDate, formatMonthYear, formatShortDate } from "./format";

describe("format helpers", () => {
  it("formats currency values with Lithuanian locale", () => {
    expect(formatCurrency(1234.56)).toBe("1\u00a0234,56\u00a0€");
    expect(formatCurrency(-45.67)).toBe("−45,67\u00a0€");
  });

  it("formats short dates", () => {
    expect(formatShortDate("2024-06-05")).toBe("06-05");
  });

  it("formats full dates", () => {
    expect(formatFullDate("2024-06-05")).toBe("2024-06-05");
  });

  it("formats month/year values", () => {
    expect(formatMonthYear("2024-06-05")).toBe("2024-06");
  });
});
