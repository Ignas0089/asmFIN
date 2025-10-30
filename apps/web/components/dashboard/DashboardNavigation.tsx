"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardNavItem } from "./navigationConfig";

interface DashboardNavigationProps {
  items: DashboardNavItem[];
  variant?: "sidebar" | "bottom";
}

export function DashboardNavigation({
  items,
  variant = "sidebar"
}: DashboardNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard navigation">
      <ul
        className={
          variant === "sidebar"
            ? "flex flex-col gap-2"
            : "grid h-full grid-cols-4 items-center"
        }
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const baseClasses =
            variant === "sidebar"
              ? "rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              : "flex h-full flex-col items-center justify-center gap-1 text-xs";

          const activeClasses =
            variant === "sidebar"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-900";

          const inactiveClasses =
            variant === "sidebar"
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "text-slate-500";

          return (
            <li key={item.href} className={variant === "bottom" ? "h-full" : undefined}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                <span>{item.label}</span>
                {variant === "bottom" && item.description ? (
                  <span className="text-[10px] text-slate-400">{item.description}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
