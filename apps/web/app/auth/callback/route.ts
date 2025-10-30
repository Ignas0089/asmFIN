import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "../../../lib/types";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectTo = searchParams.get("redirect_to");
  const resolvedRedirect = redirectTo
    ? redirectTo.startsWith("http")
      ? redirectTo
      : `${origin}${redirectTo}`
    : `${origin}/dashboard`;

  return NextResponse.redirect(resolvedRedirect, { status: 303 });
}
