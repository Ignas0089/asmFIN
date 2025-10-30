declare module "@supabase/auth-ui-react" {
  import type { ComponentType } from "react";
  export const Auth: ComponentType<Record<string, unknown>>;
}

declare module "@supabase/auth-ui-shared" {
  export const ThemeSupa: Record<string, unknown>;
}

declare module "recharts" {
  import type { ComponentType } from "react";
  export const ResponsiveContainer: ComponentType<Record<string, unknown>>;
  export const LineChart: ComponentType<Record<string, unknown>>;
  export const Line: ComponentType<Record<string, unknown>>;
  export const CartesianGrid: ComponentType<Record<string, unknown>>;
  export const XAxis: ComponentType<Record<string, unknown>>;
  export const YAxis: ComponentType<Record<string, unknown>>;
  export const Tooltip: ComponentType<Record<string, unknown>>;
  export const Legend: ComponentType<Record<string, unknown>>;
  export const PieChart: ComponentType<Record<string, unknown>>;
  export const Pie: ComponentType<Record<string, unknown>>;
  export const Cell: ComponentType<Record<string, unknown>>;
  export interface TooltipProps<TValue = unknown, TName = unknown> {
    active?: boolean;
    payload?: Array<{ payload: unknown }> | null;
    label?: string;
  }
}

declare module "@playwright/test" {
  export const defineConfig: (...args: any[]) => any;
  export const devices: Record<string, Record<string, any>>;
}

declare module "vitest/config" {
  export const defineConfig: (...args: any[]) => any;
}
