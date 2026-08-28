"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlan } from "@/lib/plans";

interface QuickProfile { crm?: string; uf?: string; especialidade?: string }

export async function createCheckoutSession(planId: string, profile: QuickProfile) {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plano inválido");

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: org } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id")
    .eq("owner_id", user.id)
    .single();
  if (!org) return { error: "no_org" as const };

  // grava perfil rápido (ETAPA 2) — não é o onboarding completo
  if (profile.crm || profile.uf || profile.especialidade) {
    await supabase.from("profiles").update({
      crm: profile.crm, uf: profile.uf, especialidade: profile.especialidade,
    }).eq("id", user.id);
  }

  // garante customer no Stripe
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;
    await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", org.id);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          product_data: { name: plan.name },
          unit_amount: plan.amount,           // PREÇO OFICIAL, resolvido no backend
          recurring: { interval: plan.interval },
        },
      },
    ],
    subscription_data: { metadata: { org_id: org.id, plan_id: planId } },
    metadata: { org_id: org.id, plan_id: planId },
    success_url: `${site}/checkout/sucesso`,
    cancel_url: `${site}/checkout?plan=${planId}`,
    allow_promotion_codes: true,
  });

  return { url: session.url! };
}
