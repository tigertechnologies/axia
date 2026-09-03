"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Abre o Portal de Cobrança do Stripe (cancelar, trocar cartão, ver faturas).
export async function openBillingPortal() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!org?.stripe_customer_id) return { error: "no_customer" as const };

  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${site}/configuracoes`,
  });
  return { url: session.url };
}

// Salva os dados de perfil editados.
export async function saveProfile(data: { crm?: string; uf?: string; especialidade?: string; telefone?: string }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };
  await supabase.from("profiles").update(data).eq("id", user.id);
  return { ok: true as const };
}
