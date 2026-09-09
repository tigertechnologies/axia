"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { processStripeEvent } from "@/lib/webhook-process";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface WebhookEvent { id: string; type: string; processed: boolean; processed_at: string | null }
export interface WebhooksResumo { total: number; pendentes: number; ultimo: string | null }
export interface IngestaoResumo { ultimo_email: string | null; total_mes: number }
export interface IngestionError { id: string; org_id: string | null; stage: string; message: string | null; created_at: string }

export async function adminListWebhooks(limite = 50): Promise<WebhookEvent[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_list_webhooks", { p_limit: limite });
  return (data ?? []) as WebhookEvent[];
}

export async function adminWebhooksResumo(): Promise<WebhooksResumo> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_webhooks_resumo");
  const r = Array.isArray(data) && data[0] ? data[0] : null;
  return { total: r?.total ?? 0, pendentes: r?.pendentes ?? 0, ultimo: r?.ultimo ?? null };
}

export async function adminIngestaoResumo(): Promise<IngestaoResumo> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_ingestao_resumo");
  const r = Array.isArray(data) && data[0] ? data[0] : null;
  return { ultimo_email: r?.ultimo_email ?? null, total_mes: r?.total_mes ?? 0 };
}

export async function adminListIngestionErrors(limite = 50): Promise<IngestionError[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_list_ingestion_errors", { p_limit: limite });
  return (data ?? []) as IngestionError[];
}

// Reprocessa UM webhook: re-busca o evento no Stripe e aplica o estado canônico.
export async function adminReprocessWebhook(eventId: string) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const admin = createSupabaseAdmin();
  try {
    const event = await stripe().events.retrieve(eventId);
    await processStripeEvent(event, admin);
    await admin.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventId);
  } catch {
    return { error: "falha ao reprocessar" as const };
  }
  try {
    const supabase = createSupabaseServer();
    await supabase.rpc("admin_log_action", { p_action: "webhook_reprocess", p_target_org: null, p_target_email: null, p_detail: { event_id: eventId } });
  } catch { /* best-effort */ }
  revalidatePath("/admin");
  return { ok: true as const };
}

// Reprocessa TODOS os pendentes (limitado por segurança).
export async function adminReprocessarPendentes() {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const supabase = createSupabaseServer();
  const { data } = await supabase.rpc("admin_list_webhooks", { p_limit: 200 });
  const pendentes = ((data ?? []) as WebhookEvent[]).filter((w) => !w.processed).slice(0, 50);
  const admin = createSupabaseAdmin();
  let ok = 0, falhas = 0;
  for (const w of pendentes) {
    try {
      const event = await stripe().events.retrieve(w.id);
      await processStripeEvent(event, admin);
      await admin.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", w.id);
      ok++;
    } catch { falhas++; }
  }
  try {
    await supabase.rpc("admin_log_action", { p_action: "webhook_reprocess_all", p_target_org: null, p_target_email: null, p_detail: { ok, falhas } });
  } catch { /* best-effort */ }
  revalidatePath("/admin");
  return { ok: true as const, reprocessados: ok, falhas };
}
