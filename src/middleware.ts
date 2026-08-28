import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Rotas do app protegidas por login + assinatura.
const PROTECTED = ["/dashboard", "/onboarding", "/configuracoes"];

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path.startsWith(p));

  if (!isProtected) return response;

  // sem login → /login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // checa status da assinatura da organização
  const { data: org } = await supabase
    .from("organizations")
    .select("subscription_status")
    .eq("owner_id", user.id)
    .maybeSingle();

  const status = org?.subscription_status ?? "pending_subscription";

  // sem assinatura ativa → manda escolher plano (exceto onboarding)
  const blocked = ["pending_subscription", "unpaid", "canceled", "suspended", "expired"];
  if (blocked.includes(status) && !path.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/checkout";
    return NextResponse.redirect(url);
  }

  return response; // active / trialing / past_due passam (past_due com aviso na UI)
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/configuracoes/:path*"],
};
