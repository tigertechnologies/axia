"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PerfilPerito {
  id?: string; nome: string; crm: string | null; uf_crm: string | null; rqe: string | null;
  especialidade: string | null; areas_periciais: string[]; cidade: string | null; uf: string | null;
  regioes: string[]; mini_curriculo: string | null; disponivel: boolean;
  contato_autorizado: boolean; email_contato: string | null; telefone_contato: string | null;
  publicado: boolean; verificado: string;
}
export interface PeritoDiretorio {
  id: string; nome: string; crm: string | null; uf_crm: string | null; rqe: string | null;
  especialidade: string | null; areas_periciais: string[] | null; cidade: string | null; uf: string | null;
  regioes: string[] | null; mini_curriculo: string | null; disponivel: boolean; verificado: string;
  contato_autorizado: boolean; email_contato: string | null; telefone_contato: string | null;
}

// Carrega o perfil do perito logado (ou null se não tem).
export async function meuPerfil(): Promise<PerfilPerito | null> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("perito_perfil").select("*").maybeSingle();
  if (!data) return null;
  return {
    ...data,
    areas_periciais: data.areas_periciais ?? [],
    regioes: data.regioes ?? [],
  } as PerfilPerito;
}

export async function salvarPerfil(input: Partial<PerfilPerito> & { nome: string }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.nome?.trim()) return { error: "Informe seu nome." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  const payload = {
    org_id: org.id, user_id: user.id, nome: input.nome.slice(0, 200),
    crm: input.crm || null, uf_crm: input.uf_crm || null, rqe: input.rqe || null,
    especialidade: input.especialidade || null,
    areas_periciais: input.areas_periciais ?? [], cidade: input.cidade || null, uf: input.uf || null,
    regioes: input.regioes ?? [], mini_curriculo: input.mini_curriculo || null,
    disponivel: input.disponivel ?? true, contato_autorizado: input.contato_autorizado ?? false,
    email_contato: input.email_contato || null, telefone_contato: input.telefone_contato || null,
    publicado: input.publicado ?? false, updated_at: new Date().toISOString(),
  };

  // upsert por org (índice único uix_perito_org)
  const { error } = await supabase.from("perito_perfil").upsert(payload, { onConflict: "org_id" });
  if (error) return { error: error.message };
  revalidatePath("/marketplace");
  return { ok: true };
}

// Busca no diretório público (via view perito_diretorio — só publicados).
export async function buscarDiretorio(filtros: { termo?: string; especialidade?: string; uf?: string }): Promise<PeritoDiretorio[]> {
  const supabase = createSupabaseServer();
  let q = supabase.from("perito_diretorio").select("*").limit(60);
  if (filtros.uf) q = q.eq("uf", filtros.uf);
  if (filtros.especialidade) q = q.ilike("especialidade", `%${filtros.especialidade}%`);
  if (filtros.termo) q = q.or(`nome.ilike.%${filtros.termo}%,mini_curriculo.ilike.%${filtros.termo}%`);
  const { data } = await q;
  return (data ?? []) as PeritoDiretorio[];
}
