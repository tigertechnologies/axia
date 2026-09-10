"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

// Preço efetivo (centavos) de um plano: override do banco, senão o padrão do código.
export async function getEffectivePriceCents(planId: string): Promise<number> {
  const padrao = PLANS[planId]?.amount ?? 0;
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from("plan_prices").select("amount_cents").eq("plan_id", planId).maybeSingle();
    return data?.amount_cents ?? padrao;
  } catch {
    return padrao;
  }
}

// Mapa de todos os preços efetivos (plan_id -> centavos).
export async function getAllEffectivePrices(): Promise<Record<string, number>> {
  const base: Record<string, number> = {};
  Object.keys(PLANS).forEach((id) => { base[id] = PLANS[id].amount; });
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from("plan_prices").select("plan_id, amount_cents");
    (data ?? []).forEach((r: { plan_id: string; amount_cents: number }) => { if (r.plan_id in base) base[r.plan_id] = r.amount_cents; });
  } catch { /* usa padrões */ }
  return base;
}

// Salva overrides de preço. Valores em centavos. Só admin.
export async function adminSavePrecos(valores: Record<string, number>) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const validos = new Set(Object.keys(PLANS));
  const rows = Object.entries(valores)
    .filter(([id, cents]) => validos.has(id) && Number.isFinite(cents) && cents > 0)
    .map(([plan_id, amount_cents]) => ({ plan_id, amount_cents: Math.round(amount_cents), updated_at: new Date().toISOString() }));

  if (rows.length === 0) return { error: "nenhum preço válido" as const };
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("plan_prices").upsert(rows, { onConflict: "plan_id" });
  if (error) return { error: error.message };

  try {
    await supabase.rpc("admin_log_action", { p_action: "precos_salvar", p_target_org: null, p_target_email: null, p_detail: { planos: rows.length } });
  } catch { /* best-effort */ }

  revalidatePath("/", "layout"); // atualiza a landing
  return { ok: true as const };
}
