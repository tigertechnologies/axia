import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { processStripeEvent } from "@/lib/webhook-process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if ((insErr as { code?: string }).code === "23505") {
      const { data: existing } = await admin.from("webhook_events").select("processed").eq("id", event.id).maybeSingle();
      if (existing?.processed) return NextResponse.json({ received: true, duplicate: true });
      // não processado ainda → reprocessa (escritas idempotentes)
    } else {
      return NextResponse.json({ error: "db_error_registering_event" }, { status: 500 });
    }
  }

  try {
    await processStripeEvent(event, admin);
  } catch {
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  await admin.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
  return NextResponse.json({ received: true });
}
