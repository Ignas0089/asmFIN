export const TREND_RANGE_OPTIONS = [
  { value: "3m", label: "3M", description: "Last 3 months", months: 3 },
  { value: "6m", label: "6M", description: "Last 6 months", months: 6 },
  { value: "12m", label: "1Y", description: "Last 12 months", months: 12 },
] as const;

export type TrendRangeOption = (typeof TREND_RANGE_OPTIONS)[number];
export type TrendRangeValue = TrendRangeOption["value"];

export function getTrendRangeMonths(value: TrendRangeValue): number {
  const option = TREND_RANGE_OPTIONS.find((item) => item.value === value);
  return option?.months ?? 6;
}
