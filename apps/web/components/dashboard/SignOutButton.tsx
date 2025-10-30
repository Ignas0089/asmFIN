"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "../../lib/supabase/client";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/signin");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="rounded-full border border-slate-200 px-4 py-1 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
