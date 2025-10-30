"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import type { AuthChangeEvent } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const mode = searchParams?.get("mode");
  const view = mode === "signup" ? "sign_up" : "sign_in";
  const toggleHref = view === "sign_up" ? "/signin" : "/signin?mode=signup";
  const toggleLabel =
    view === "sign_up"
      ? "Already have an account? Sign in"
      : "Need an account? Sign up with email";

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_IN") {
        router.replace("/dashboard");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-2xl text-white">
            💸
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            {view === "sign_up" ? "Create your asmFIN account" : "Sign in to asmFIN"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your email address to access your personal finance dashboard.
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#1f2937",
                  brandAccent: "#111827"
                }
              }
            }
          }}
          theme="default"
          view={view}
        />
        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing you agree to the asmFIN privacy policy.
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          <Link href={toggleHref} className="font-medium text-slate-700 underline">
            {toggleLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
