import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

import { DashboardHeader } from "../../../components/dashboard/DashboardHeader";
import { DashboardNavigation } from "../../../components/dashboard/DashboardNavigation";
import {
  dashboardNavItems,
  type DashboardNavItem,
} from "../../../components/dashboard/navigationConfig";
import type { Database } from "../../../lib/types";

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-6 py-8 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
            💸
          </span>
          asmFIN
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Track your spending habits and keep an eye on your personal cash flow.
        </p>
        <div className="mt-8 flex-1">
          <DashboardNavigation items={dashboardNavItems} />
        </div>
        <p className="mt-auto text-xs text-slate-400">
          Need help? Visit the reports page to review monthly spending trends.
        </p>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardHeader user={session.user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <div className="border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
          <DashboardNavigation
            items={dashboardNavItems.map((item): DashboardNavItem => ({
              ...item,
              description:
                item.label === "Overview"
                  ? "Home"
                  : item.label === "Transactions"
                  ? "Ledger"
                  : item.label === "Reports"
                  ? "Charts"
                  : "Preferences",
            }))}
            variant="bottom"
          />
        </div>
      </div>
    </div>
  );
}
