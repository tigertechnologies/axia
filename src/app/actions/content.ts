"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./admin";
import { CAMPOS_CONTEUDO } from "./content-fields";
import { revalidatePath } from "next/cache";

export async function adminGetConteudo(): Promise<Record<string, string>> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("site_content").select("chave, valor");
  return Object.fromEntries((data ?? []).map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
}

export async function adminSaveConteudo(valores: Record<string, string>) {
  if (!(await isCurrentUserAdmin())) return { error: "acesso negado" as const };
  const supabase = createSupabaseServer();
  const chavesValidas = new Set(CAMPOS_CONTEUDO.map((c) => c.chave));
  const rows = Object.entries(valores)
    .filter(([k]) => chavesValidas.has(k))
    .map(([chave, valor]) => ({ chave, valor: (valor ?? "").slice(0, 2000), updated_at: new Date().toISOString() }));

  if (rows.length === 0) return { ok: true as const };
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "chave" });
  if (error) return { error: error.message };

  try {
    await supabase.rpc("admin_log_action", { p_action: "conteudo_salvar", p_target_org: null, p_target_email: null, p_detail: { campos: rows.length } });
  } catch { /* best-effort */ }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
