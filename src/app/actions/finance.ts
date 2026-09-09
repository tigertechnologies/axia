"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
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

// Busca o stripe_subscription_id do assinante; erro claro se não houver.
async function getSubId(orgId: string): Promise<{ subId?: string; erro?: string }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("subscriptions").select("stripe_subscription_id").eq("org_id", orgId).maybeSingle();
  const subId = data?.stripe_subscription_id ?? null;
  if (!subId) return { erro: "Este assinante não tem assinatura no Stripe (provável conta de teste criada manualmente). Ação indisponível." };
  return { subId };
}

// Cancela ao FIM do período (reversível). Não corta acesso imediatamente.
export async function adminCancelarAssinatura(orgId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };

  try {
    await stripe().subscriptions.update(subId!, { cancel_at_period_end: true });
  } catch {
    return { error: "Falha ao falar com o Stripe. Verifique as chaves em Sistema › Configuração." as const };
  }

  const admin = createSupabaseAdmin();
  await admin.from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("org_id", orgId);
  try {
    const supabase = createSupabaseServer();
    await supabase.rpc("admin_log_action", { p_action: "assinatura_cancelar_fim_periodo", p_target_org: orgId, p_target_email: null, p_detail: { sub: subId } });
  } catch { /* best-effort */ }
  revalidatePath("/admin");
  return { ok: true as const };
}

// Reativa (desfaz o cancelamento agendado). Reversível.
export async function adminReativarAssinatura(orgId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const { subId, erro } = await getSubId(orgId);
  if (erro) return { error: erro };

  try {
    await stripe().subscriptions.update(subId!, { cancel_at_period_end: false });
  } catch {
    return { error: "Falha ao falar com o Stripe. Verifique as chaves em Sistema › Configuração." as const };
  }

  const admin = createSupabaseAdmin();
  await admin.from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("org_id", orgId);
  try {
    const supabase = createSupabaseServer();
    await supabase.rpc("admin_log_action", { p_action: "assinatura_reativar", p_target_org: orgId, p_target_email: null, p_detail: { sub: subId } });
  } catch { /* best-effort */ }
  revalidatePath("/admin");
  return { ok: true as const };
}
