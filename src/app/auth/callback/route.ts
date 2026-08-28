import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Callback para confirmação de e-mail / OAuth (PKCE).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
