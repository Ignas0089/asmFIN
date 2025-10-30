import type { User } from "@supabase/supabase-js";

import { SignOutButton } from "./SignOutButton";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const displayName = user.user_metadata?.full_name || user.email || "Account";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Overview</p>
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Personal finance dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col text-right">
          <span className="text-sm font-medium text-slate-700">{displayName}</span>
          <span className="text-xs text-slate-400">Signed in</span>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
