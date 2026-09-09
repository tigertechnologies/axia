"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlan } from "@/lib/plans";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface FinanceiroRow {
  org_id: string; email: string; nome: string; plan_id: string | null;
  subscription_status: string | null; current_period_end: string | null; cancel_at_period_end: boolean;
  stripe_customer_id: string | null; stripe_subscription_id: string | null;
}

export async function adminListFinanceiro(): Promise<{ error?: string; data?: FinanceiroRow[] }> {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" };
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_list_financeiro");
  if (error) return { error: error.message };
  return { data: (data ?? []) as FinanceiroRow[] };
}

async function getSubId(orgId: string): Promise<{ subId?: string; erro?: string }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("subscriptions").select("stripe_subscription_id").eq("org_id", orgId).maybeSingle();
  const subId = data?.stripe_subscription_id ?? null;
  if (!subId) return { erro: "Este assinante não tem assinatura no Stripe (provável conta de teste criada manualmente). Ação indisponível." };
  return { subId };
}

async function log(action: string, orgId: string | null, detail: Record<string, unknown>) {
  try {
    const supabase = createSupabaseServer();
    await supabase.rpc("admin_log_action", { p_action: action, p_target_org: orgId, p_target_email: null, p_detail: detail });
  } catch { /* best-effort */ }
}

// ── Cancelar / Reativar (fim do período) ────────────────────
export async function adminCancelarAssinatura(orgId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };
  try { await stripe().subscriptions.update(subId!, { cancel_at_period_end: true }); }
  catch { return { error: "Falha ao falar com o Stripe. Verifique as chaves em Sistema › Configuração." as const }; }
  await createSupabaseAdmin().from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("org_id", orgId);
  await log("assinatura_cancelar_fim_periodo", orgId, { sub: subId });
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminReativarAssinatura(orgId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };
  try { await stripe().subscriptions.update(subId!, { cancel_at_period_end: false }); }
  catch { return { error: "Falha ao falar com o Stripe. Verifique as chaves em Sistema › Configuração." as const }; }
  await createSupabaseAdmin().from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("org_id", orgId);
  await log("assinatura_reativar", orgId, { sub: subId });
  revalidatePath("/admin");
  return { ok: true as const };
}

// ── Troca de plano (proração imediata) ──────────────────────
function precoInline(planId: string) {
  const plan = getPlan(planId)!;
  return {
    currency: "brl",
    product_data: { name: plan.name },
    unit_amount: plan.amount,
    recurring: { interval: plan.interval },
  };
}

// Prévia: quanto será cobrado/creditado agora ao trocar de plano.
export async function adminPreverTrocaPlano(orgId: string, novoPlanId: string): Promise<{ prorationCents?: number; erro?: string }> {
  if (!(await isCurrentUserAdmin())) return { erro: "acesso negado" };
  if (!getPlan(novoPlanId)) return { erro: "plano inválido" };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { erro };
  try {
    const sub = await stripe().subscriptions.retrieve(subId!);
    const itemId = sub.items.data[0].id;
    const customerId = sub.customer as string;
    const upcoming: any = await (stripe().invoices as any).retrieveUpcoming({
      customer: customerId,
      subscription: subId,
      subscription_items: [{ id: itemId, price_data: precoInline(novoPlanId) }],
      subscription_proration_behavior: "always_invoice",
    });
    const proration = (upcoming.lines?.data ?? []).filter((l: any) => l.proration).reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
    return { prorationCents: proration };
  } catch {
    return { erro: "Não foi possível prever o valor no Stripe." };
  }
}

export async function adminTrocarPlano(orgId: string, novoPlanId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (!getPlan(novoPlanId)) return { error: "plano inválido" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };
  try {
    const sub = await stripe().subscriptions.retrieve(subId!);
    const itemId = sub.items.data[0].id;
    await (stripe().subscriptions as any).update(subId!, {
      items: [{ id: itemId, price_data: precoInline(novoPlanId) }],
      proration_behavior: "always_invoice",
      metadata: { ...sub.metadata, plan_id: novoPlanId },
    });
  } catch {
    return { error: "Falha ao trocar o plano no Stripe." as const };
  }
  const admin = createSupabaseAdmin();
  await admin.from("organizations").update({ plan_id: novoPlanId }).eq("id", orgId);
  await admin.from("subscriptions").update({ plan_id: novoPlanId, updated_at: new Date().toISOString() }).eq("org_id", orgId);
  await log("plano_trocar", orgId, { sub: subId, novo: novoPlanId });
  revalidatePath("/admin");
  return { ok: true as const };
}

// ── Reembolso (total ou parcial) ────────────────────────────
export async function adminReembolsar(orgId: string, valorCents: number | null) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (valorCents !== null && (!Number.isFinite(valorCents) || valorCents <= 0)) return { error: "valor inválido" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };
  try {
    const invs = await stripe().invoices.list({ subscription: subId, status: "paid", limit: 1 });
    const inv = invs.data[0];
    const charge = (inv as any)?.charge as string | null;
    if (!inv || !charge) return { error: "Não há cobrança paga para reembolsar." as const };
    await stripe().refunds.create({ charge, ...(valorCents !== null ? { amount: valorCents } : {}) } as any);
    await log("reembolso", orgId, { sub: subId, charge, valor_cents: valorCents ?? "total", invoice: inv.id });
  } catch {
    return { error: "Falha ao processar o reembolso no Stripe." as const };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

// ── Aplicar cupom a um assinante (cortesia) ─────────────────
export async function adminAplicarCupom(orgId: string, couponId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (!couponId) return { error: "cupom inválido" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };
  try {
    await (stripe().subscriptions as any).update(subId!, { discounts: [{ coupon: couponId }] });
    await log("cupom_aplicar", orgId, { sub: subId, coupon: couponId });
  } catch {
    return { error: "Falha ao aplicar o cupom no Stripe." as const };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}
