"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Tarefa {
  id: string; titulo: string; descricao: string | null; status: string;
  prioridade: string; due_at: string | null; pericia_id: string | null; created_at: string;
  pericia_titulo?: string | null;
}

const PRIORIDADES = ["baixa", "normal", "alta", "urgente"];

export async function listarTarefas(): Promise<Tarefa[]> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("pericia_tasks")
    .select("id, titulo, descricao, status, prioridade, due_at, pericia_id, created_at")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);
  const tarefas = (data ?? []) as Tarefa[];

  // Enriquece com o título da perícia (para as vinculadas).
  const ids = [...new Set(tarefas.filter((t) => t.pericia_id).map((t) => t.pericia_id))];
  if (ids.length) {
    const { data: pers } = await supabase.from("pericias").select("id, titulo").in("id", ids as string[]);
    const mapa = new Map((pers ?? []).map((p: any) => [p.id, p.titulo]));
    tarefas.forEach((t) => { if (t.pericia_id) t.pericia_titulo = mapa.get(t.pericia_id) ?? null; });
  }
  return tarefas;
}

export async function criarTarefa(input: { titulo: string; prioridade?: string; due_at?: string | null; periciaId?: string | null }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.titulo?.trim()) return { error: "Informe a tarefa." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  const prioridade = PRIORIDADES.includes(input.prioridade ?? "") ? input.prioridade! : "normal";
  const { error } = await supabase.from("pericia_tasks").insert({
    org_id: org.id, titulo: input.titulo.slice(0, 200), prioridade,
    due_at: input.due_at || null, pericia_id: input.periciaId || null, status: "pendente",
  });
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { ok: true };
}

export async function concluirTarefa(id: string, concluida: boolean): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("pericia_tasks").update({
    status: concluida ? "concluida" : "pendente",
    concluida_em: concluida ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/tarefas");
  return { ok: true };
}

export async function excluirTarefa(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("pericia_tasks").delete().eq("id", id);
  revalidatePath("/tarefas");
  return { ok: true };
}

// Move a tarefa para uma coluna do Kanban (A Fazer / Em Andamento / Revisão / Concluída).
export async function moverTarefa(id: string, status: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  const validos = ["pendente", "em_andamento", "revisao", "concluida"];
  const st = validos.includes(status) ? status : "pendente";
  await supabase.from("pericia_tasks").update({
    status: st,
    concluida_em: st === "concluida" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/tarefas");
  return { ok: true };
}
