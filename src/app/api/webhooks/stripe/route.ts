import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mapeia status do Stripe para o enum da AXIA.
function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "canceled": return "canceled";
    case "incomplete_expired": return "expired";
    default: return "pending_subscription"; // incomplete, paused…
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // A13: idempotência correta. Só código de violação de unicidade (23505) é
  // duplicata legítima. Qualquer outro erro de banco NÃO pode virar "sucesso":
  // devolve 500 para o Stripe reenviar o evento.
  const { error: insErr } = await admin.from("webhook_events").insert({ id: event.id, type: event.type });
  if (insErr) {
    if ((insErr as any).code === "23505") return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: "db_error_registering_event" }, { status: 500 });
  }

  async function applySubscription(orgId: string, planId: string, sub: Stripe.Subscription) {
    const status = mapStatus(sub.status);
    await admin.from("subscriptions").upsert(
      {
        org_id: orgId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer as string,
        plan_id: planId,
        status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
    await admin.from("organizations").update({ subscription_status: status, plan_id: planId }).eq("id", orgId);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orgId = s.metadata?.org_id;
        const planId = s.metadata?.plan_id;
        if (orgId && planId && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(s.subscription as string);
          await applySubscription(orgId, planId, sub);
          // TODO(activation): e-mail de boas-vindas, auditoria, disparo da 1ª análise.
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        const planId = sub.metadata?.plan_id;
        if (orgId && planId) await applySubscription(orgId, planId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          await admin.from("organizations").update({ subscription_status: "canceled" }).eq("id", orgId);
          await admin.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", sub.id);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = inv.subscription as string | null;
        if (subId) {
          const { data } = await admin.from("subscriptions").select("org_id").eq("stripe_subscription_id", subId).maybeSingle();
          if (data?.org_id) {
            await admin.from("organizations").update({ subscription_status: "past_due" }).eq("id", data.org_id);
            await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Não marca como processado com sucesso; deixa o Stripe reenviar.
    await admin.from("webhook_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
