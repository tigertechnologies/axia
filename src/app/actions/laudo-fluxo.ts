"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Valida o laudo (ato do médico). Só muda o status; a conferência determinística
// roda no cliente antes (Auditor). Registra na auditoria (seção 23.3).
export async function validarLaudo(laudoId: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  const { data: laudo } = await supabase.from("laudos").select("org_id, status").eq("id", laudoId).maybeSingle();
  if (!laudo) return { error: "NOT_FOUND" };

  const { error } = await supabase.from("laudos").update({ status: "validado", updated_at: new Date().toISOString() }).eq("id", laudoId);
  if (error) return { error: error.message };

  try {
    await supabase.from("audit_logs").insert({
      org_id: laudo.org_id, actor_id: user.id, action: "laudo.validar", entity_type: "laudo", entity_id: laudoId,
    });
  } catch { /* best-effort */ }

  revalidatePath("/jornada");
  return { ok: true };
}

// Volta o laudo para rascunho (desfazer validação, se precisar reeditar).
export async function reabrirLaudo(laudoId: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  const { data: laudo } = await supabase.from("laudos").select("org_id").eq("id", laudoId).maybeSingle();
  if (!laudo) return { error: "NOT_FOUND" };
  const { error } = await supabase.from("laudos").update({ status: "rascunho", updated_at: new Date().toISOString() }).eq("id", laudoId);
  if (error) return { error: error.message };
  try { await supabase.from("audit_logs").insert({ org_id: laudo.org_id, actor_id: user.id, action: "laudo.reabrir", entity_type: "laudo", entity_id: laudoId }); } catch {}
  revalidatePath("/jornada");
  return { ok: true };
}
