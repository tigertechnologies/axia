import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "canceled": return "canceled";
    case "incomplete_expired": return "expired";
    default: return "pending_subscription";
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // ── Idempotência robusta (A13) ────────────────────────────
  const { error: insErr } = await admin.from("webhook_events").insert({ id: event.id, type: event.type, processed: false });
  if (insErr) {
    if ((insErr as any).code === "23505") {
      const { data: existing } = await admin.from("webhook_events").select("processed").eq("id", event.id).maybeSingle();
      if (existing?.processed) return NextResponse.json({ received: true, duplicate: true });
      // não processado ainda → reprocessa (escritas idempotentes)
    } else {
      return NextResponse.json({ error: "db_error_registering_event" }, { status: 500 });
    }
  }

  async function write(promise: PromiseLike<{ error: any }>) {
    const { error } = await promise;
    if (error) throw new Error("db_write_failed: " + (error.message ?? "unknown"));
  }

  async function applySubscription(orgId: string, planId: string, sub: Stripe.Subscription) {
    const status = mapStatus(sub.status);
    await write(admin.from("subscriptions").upsert({
      org_id: orgId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
      plan_id: planId,
      status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" }));
    await write(admin.from("organizations").update({ subscription_status: status, plan_id: planId }).eq("id", orgId));
  }

  // Reconciliação: estado canônico no Stripe (neutraliza eventos fora de ordem).
  async function reconcile(subId: string, orgIdHint?: string | null, planIdHint?: string | null) {
    const sub = await stripe().subscriptions.retrieve(subId);
    const orgId = orgIdHint || sub.metadata?.org_id;
    const planId = planIdHint || sub.metadata?.plan_id;
    if (orgId && planId) await applySubscription(orgId, planId, sub);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.subscription) await reconcile(s.subscription as string, s.metadata?.org_id, s.metadata?.plan_id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await reconcile(sub.id, sub.metadata?.org_id, sub.metadata?.plan_id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          await write(admin.from("organizations").update({ subscription_status: "canceled" }).eq("id", orgId));
          await write(admin.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", sub.id));
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = inv.subscription as string | null;
        if (subId) await reconcile(subId);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = inv.subscription as string | null;
        if (subId) await reconcile(subId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  await admin.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
  return NextResponse.json({ received: true });
}
