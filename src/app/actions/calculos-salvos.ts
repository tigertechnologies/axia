"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CalculoSalvo {
  id: string; tipo: string; titulo: string; process_ref: string | null;
  entrada: Record<string, unknown>; resultado: Record<string, unknown>; resumo_texto: string | null; created_at: string;
}

export async function salvarCalculoNoProcesso(input: {
  processRef: string; tipo: string; titulo: string;
  entrada: Record<string, unknown>; resultado: Record<string, unknown>; resumoTexto?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.processRef?.trim()) return { error: "Informe o processo." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  // tenta achar o processo_id pelo ref (opcional)
  const { data: proc } = await supabase.from("judicial_processes").select("id").eq("org_id", org.id).eq("numero_original", input.processRef).maybeSingle();

  const { error } = await supabase.from("calculos_salvos").insert({
    org_id: org.id, process_ref: input.processRef.slice(0, 100), processo_id: proc?.id ?? null,
    tipo: input.tipo, titulo: input.titulo.slice(0, 200),
    entrada: input.entrada, resultado: input.resultado, resumo_texto: input.resumoTexto ?? null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/calculos");
  return { ok: true };
}

export async function listarCalculosDoProcesso(processRef: string): Promise<CalculoSalvo[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("calculos_salvos")
    .select("id, tipo, titulo, process_ref, entrada, resultado, resumo_texto, created_at")
    .eq("process_ref", processRef).order("created_at", { ascending: false });
  return (data ?? []) as CalculoSalvo[];
}

export async function excluirCalculoSalvo(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("calculos_salvos").delete().eq("id", id);
  revalidatePath("/calculos");
  return { ok: true };
}
