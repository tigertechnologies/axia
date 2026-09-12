"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function isYMD(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }

// Cria um prazo vinculado a uma perícia (aparece no card da Jornada) e
// registra o evento na timeline auditável. Protegido por RLS (org do usuário).
export async function criarPrazoNaPericia(input: { periciaId: string; titulo: string; due_date: string }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" as const };
  if (!input.titulo?.trim()) return { error: "Informe o tipo do prazo." as const };
  if (!isYMD(input.due_date)) return { error: "Data de vencimento inválida." as const };

  // Busca a perícia (RLS garante que é da org do usuário) para pegar org/processo.
  const { data: pericia } = await supabase
    .from("pericias").select("id, org_id, processo_id, process_ref").eq("id", input.periciaId).maybeSingle();
  if (!pericia) return { error: "PROCESS_NOT_FOUND" as const };

  const { error } = await supabase.from("prazos").insert({
    org_id: pericia.org_id,
    pericia_id: pericia.id,
    process_ref: pericia.process_ref,
    titulo: input.titulo.slice(0, 200),
    due_date: input.due_date,
    status: "a_validar",
  });
  if (error) return { error: error.message };

  // Evento na timeline (best-effort).
  try {
    await supabase.from("pericia_events").insert({
      org_id: pericia.org_id, processo_id: pericia.processo_id, pericia_id: pericia.id,
      event_type: "DEADLINE_EXTRACTED", origem: "manual", ator: "medico", human_confirmed: true,
      metadata: { titulo: input.titulo, due_date: input.due_date },
    });
  } catch { /* best-effort */ }

  revalidatePath("/jornada");
  return { ok: true as const };
}

// Confirma um prazo (a_validar → confirmado), com evento na timeline.
export async function confirmarPrazoNaPericia(prazoId: string) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" as const };

  const { data: prazo } = await supabase
    .from("prazos").select("id, org_id, pericia_id").eq("id", prazoId).maybeSingle();
  if (!prazo) return { error: "NOT_FOUND" as const };

  const { error } = await supabase.from("prazos").update({ status: "confirmado" }).eq("id", prazoId);
  if (error) return { error: error.message };

  try {
    await supabase.from("pericia_events").insert({
      org_id: prazo.org_id, pericia_id: prazo.pericia_id,
      event_type: "DEADLINE_CONFIRMED", origem: "manual", ator: "medico", human_confirmed: true,
    });
  } catch { /* best-effort */ }

  revalidatePath("/jornada");
  return { ok: true as const };
}
