"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { revalidatePath } from "next/cache";

export interface WhatsAppConfig {
  numero: string | null;
  ativo: boolean;
  mensagem: string | null;      // mensagem inicial personalizável
  botStatus: string;            // desativado | sandbox | producao (informativo)
}

// Lê a configuração do botão de WhatsApp (acessível a qualquer usuário logado).
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("site_content").select("chave, valor").in("chave", ["wa_numero", "wa_ativo", "wa_mensagem", "wa_bot_status"]);
  const m = Object.fromEntries((data ?? []).map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  return {
    numero: m["wa_numero"] || null,
    ativo: m["wa_ativo"] === "1",
    mensagem: m["wa_mensagem"] || null,
    botStatus: m["wa_bot_status"] || "desativado",
  };
}

// Admin salva número, mensagem e liga/desliga o botão.
export async function salvarWhatsAppConfig(numero: string, ativo: boolean, mensagem?: string): Promise<{ error?: string; ok?: boolean }> {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" };
  const supabase = createSupabaseServer();
  const rows = [
    { chave: "wa_numero", valor: (numero ?? "").replace(/\D/g, "").slice(0, 20), updated_at: new Date().toISOString() },
    { chave: "wa_ativo", valor: ativo ? "1" : "0", updated_at: new Date().toISOString() },
    { chave: "wa_mensagem", valor: (mensagem ?? "").slice(0, 300), updated_at: new Date().toISOString() },
  ];
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "chave" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
