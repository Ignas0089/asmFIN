export interface DashboardNavItem {
  href: string;
  label: string;
  description?: string;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" }
];
