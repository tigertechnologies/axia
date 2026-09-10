"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface Banner {
  ativo: boolean; mensagem: string; variante: string;
  link_url: string | null; link_label: string | null;
}

export async function adminGetBanner(): Promise<Banner> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("site_banner").select("*").eq("id", 1).maybeSingle();
  return {
    ativo: data?.ativo ?? false,
    mensagem: data?.mensagem ?? "",
    variante: data?.variante ?? "info",
    link_url: data?.link_url ?? null,
    link_label: data?.link_label ?? null,
  };
}

export async function adminSaveBanner(b: Banner) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("site_banner").update({
    ativo: b.ativo,
    mensagem: (b.mensagem ?? "").slice(0, 300),
    variante: ["info", "promo", "alerta"].includes(b.variante) ? b.variante : "info",
    link_url: (b.link_url ?? "").trim() || null,
    link_label: (b.link_label ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { error: error.message };
  try {
    await supabase.rpc("admin_log_action", { p_action: "banner_salvar", p_target_org: null, p_target_email: null, p_detail: { ativo: b.ativo, variante: b.variante } });
  } catch { /* best-effort */ }
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ── Métricas de marketing ───────────────────────────────────
export interface MktOrigem { source: string; total: number; convertidos: number }
export interface MktFunil { status: string; total: number }
export interface MktResumo { total: number; convertidos: number; novos_mes: number }
export interface MarketingMetricas { origem: MktOrigem[]; funil: MktFunil[]; resumo: MktResumo }

export async function adminMarketingMetricas(): Promise<MarketingMetricas> {
  const supabase = createSupabaseServer();
  const [o, f, r] = await Promise.all([
    supabase.rpc("admin_mkt_por_origem"),
    supabase.rpc("admin_mkt_funil"),
    supabase.rpc("admin_mkt_resumo"),
  ]);
  const resumoRow = Array.isArray(r.data) && r.data[0] ? r.data[0] : { total: 0, convertidos: 0, novos_mes: 0 };
  return {
    origem: (o.data ?? []) as MktOrigem[],
    funil: (f.data ?? []) as MktFunil[],
    resumo: resumoRow as MktResumo,
  };
}
