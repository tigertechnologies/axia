"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return !!data?.is_admin;
}

export interface Assinante {
  org_id: string; email: string; nome: string; plan_id: string | null;
  subscription_status: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null;
  total_comunicacoes: number; ultima_atividade: string | null; total_prazos: number; total_honorarios: number;
}

export async function adminListAssinantes(): Promise<{ error?: string; data?: Assinante[] }> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_list_assinantes");
  if (error) return { error: error.message };
  return { data: (data ?? []) as Assinante[] };
}

export async function adminWebhooksPendentes(): Promise<number> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_webhooks_pendentes");
  return typeof data === "number" ? data : 0;
}

// ── Métricas reais (contagens do banco) ─────────────────────
export interface Metricas {
  total: number; ativos: number; trial: number; past_due: number;
  cancelados: number; suspensos: number; expirados: number; pending: number;
  novos_mes: number;
}
export async function adminMetricas(): Promise<Metricas | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_metricas");
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Metricas;
}

// ── Auditoria ───────────────────────────────────────────────
export interface AuditEvent {
  id: string; actor_email: string | null; action: string;
  target_email: string | null; detail: Record<string, unknown> | null; created_at: string;
}
export async function adminListAudit(limite = 100): Promise<AuditEvent[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_list_audit", { p_limit: limite });
  return (data ?? []) as AuditEvent[];
}

// ── Histórico (snapshots) ───────────────────────────────────
export interface Snapshot { dia: string; total: number; ativos: number; mrr_cents: number; por_plano: Record<string, number> }

export async function adminListSnapshots(dias = 30): Promise<Snapshot[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_list_snapshots", { p_dias: dias });
  return (data ?? []) as Snapshot[];
}

// Grava/atualiza o retrato de hoje (chamado ao abrir o painel).
export async function adminRegistrarSnapshot(total: number, ativos: number, mrrCents: number, porPlano: Record<string, number>) {
  if (!(await isCurrentUserAdmin())) return;
  const supabase = createSupabaseServer();
  await supabase.rpc("admin_snapshot_hoje", { p_total: total, p_ativos: ativos, p_mrr: mrrCents, p_por_plano: porPlano });
}

// ── Suporte: ajustar o status de assinatura de um assinante ──
// Verifica que o chamador é admin, grava via service role e registra auditoria.
const STATUS_VALIDOS = ["active", "trialing", "past_due", "unpaid", "canceled", "suspended", "expired", "pending_subscription"];
export async function adminSetSubscriptionStatus(orgId: string, status: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (!STATUS_VALIDOS.includes(status)) return { error: "status inválido" as const };

  const supabase = createSupabaseServer();

  // Estado anterior + e-mail do alvo, para a auditoria.
  const { data: antes } = await supabase
    .from("organizations")
    .select("subscription_status, owner_id")
    .eq("id", orgId)
    .maybeSingle();
  let targetEmail: string | null = null;
  if (antes?.owner_id) {
    const { data: alvo } = await supabase.rpc("admin_list_assinantes");
    const found = (alvo ?? []).find((a: Assinante) => a.org_id === orgId);
    targetEmail = found?.email ?? null;
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("organizations").update({ subscription_status: status }).eq("id", orgId);
  if (error) return { error: error.message };

  // Auditoria (não bloqueia o resultado se falhar o log).
  try {
    await supabase.rpc("admin_log_action", {
      p_action: "set_subscription_status",
      p_target_org: orgId,
      p_target_email: targetEmail,
      p_detail: { de: antes?.subscription_status ?? null, para: status },
    });
  } catch { /* log é best-effort */ }

  revalidatePath("/admin");
  return { ok: true as const };
}
