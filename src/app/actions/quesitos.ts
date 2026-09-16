"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Quesito {
  id: string; origem: string; numero: number | null; texto: string; respondido: boolean; resposta: string | null;
}

export async function listarQuesitos(periciaId: string): Promise<Quesito[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("pericia_quesitos")
    .select("id, origem, numero, texto, respondido, resposta").eq("pericia_id", periciaId)
    .order("origem", { ascending: true }).order("numero", { ascending: true });
  return (data ?? []) as Quesito[];
}

export async function adicionarQuesito(input: { periciaId: string; origem: string; texto: string }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.texto?.trim()) return { error: "Informe o quesito." };
  if (!["juizo", "autor", "reu", "complementar"].includes(input.origem)) return { error: "Origem inválida." };

  const { data: pe } = await supabase.from("pericias").select("org_id, processo_id").eq("id", input.periciaId).maybeSingle();
  if (!pe) return { error: "PROCESS_NOT_FOUND" };

  // Próximo número dentro da mesma origem.
  const { data: existentes } = await supabase.from("pericia_quesitos").select("numero").eq("pericia_id", input.periciaId).eq("origem", input.origem);
  const prox = ((existentes ?? []).reduce((m: number, q: any) => Math.max(m, q.numero ?? 0), 0)) + 1;

  const { error } = await supabase.from("pericia_quesitos").insert({
    org_id: pe.org_id, pericia_id: input.periciaId, origem: input.origem, numero: prox, texto: input.texto.slice(0, 2000),
  });
  if (error) return { error: error.message };
  revalidatePath("/jornada");
  return { ok: true };
}

export async function responderQuesito(id: string, resposta: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("pericia_quesitos").update({
    resposta, respondido: !!resposta.trim(), updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/jornada");
  return { ok: true };
}

export async function excluirQuesito(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("pericia_quesitos").delete().eq("id", id);
  revalidatePath("/jornada");
  return { ok: true };
}
