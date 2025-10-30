export const CATEGORY_PALETTE = [
  "#A5D8FF",
  "#B5E48C",
  "#FFC8DD",
  "#FFD6A5",
  "#CDB4DB",
  "#FFADAD",
  "#BDE0FE",
  "#FBC3BC",
] as const;

export const LINE_PALETTE = {
  income: "#34D399",
  expense: "#60A5FA",
} as const;

export const CHART_THEME = {
  grid: "#E2E8F0",
  axis: "#94A3B8",
  cursor: "#CBD5F5",
};

export type CategoryColor = (typeof CATEGORY_PALETTE)[number];
export type LineColorKey = keyof typeof LINE_PALETTE;
