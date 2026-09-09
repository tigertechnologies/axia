import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export function mapStatus(s: Stripe.Subscription.Status): string {
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

// Processa um evento do Stripe aplicando o estado canônico (reconciliação).
// Lança em caso de falha de escrita — quem chama decide o retorno HTTP/UX.
// Usado tanto pela rota /api/webhooks/stripe quanto pelo "reprocessar" do admin.
export async function processStripeEvent(event: Stripe.Event, admin: SupabaseClient): Promise<void> {
  async function write(promise: PromiseLike<{ error: unknown }>) {
    const { error } = await promise;
    if (error) throw new Error("db_write_failed: " + ((error as { message?: string })?.message ?? "unknown"));
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

  async function reconcile(subId: string, orgIdHint?: string | null, planIdHint?: string | null) {
    const sub = await stripe().subscriptions.retrieve(subId);
    const orgId = orgIdHint || sub.metadata?.org_id;
    const planId = planIdHint || sub.metadata?.plan_id;
    if (orgId && planId) await applySubscription(orgId, planId, sub);
  }

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
}
