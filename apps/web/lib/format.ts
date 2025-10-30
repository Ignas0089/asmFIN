const CURRENCY_FORMATTER = new Intl.NumberFormat("lt-LT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("lt-LT", {
  month: "short",
  day: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("lt-LT", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value);
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_FORMATTER.format(date);
}

export function formatFullDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_TIME_FORMATTER.format(date);
}
