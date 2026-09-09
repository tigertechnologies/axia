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

// Suporte: ajustar o status de assinatura de um assinante.
// Verifica que o chamador é admin e grava via service role (o guard de cobrança
// bloqueia usuários comuns; o admin age pelo servidor privilegiado, com auditoria simples).
const STATUS_VALIDOS = ["active", "trialing", "past_due", "unpaid", "canceled", "suspended", "expired", "pending_subscription"];
export async function adminSetSubscriptionStatus(orgId: string, status: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  if (!STATUS_VALIDOS.includes(status)) return { error: "status inválido" as const };
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("organizations").update({ subscription_status: status }).eq("id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}
