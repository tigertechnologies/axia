"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { TIPOS_CONTATO, type Contato } from "./contatos-const";
import { revalidatePath } from "next/cache";

export async function listarContatos(): Promise<Contato[]> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("contatos").select("id, tipo, nome, organizacao, email, telefone, oab, cidade, uf, observacoes, processo_id").order("nome", { ascending: true }).limit(500);
  return (data ?? []) as Contato[];
}

export async function salvarContato(input: Partial<Contato> & { nome: string }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.nome?.trim()) return { error: "Informe o nome." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  const payload = {
    tipo: TIPOS_CONTATO.includes(input.tipo ?? "") ? input.tipo : "profissional",
    nome: input.nome.slice(0, 200), organizacao: input.organizacao || null,
    email: input.email || null, telefone: input.telefone || null, oab: input.oab || null,
    cidade: input.cidade || null, uf: input.uf || null, observacoes: input.observacoes || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("contatos").update(payload).eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("contatos").insert({ ...payload, org_id: org.id, created_by: user.id });
    if (error) return { error: error.message };
  }
  revalidatePath("/contatos");
  return { ok: true };
}

export async function excluirContato(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("contatos").delete().eq("id", id);
  revalidatePath("/contatos");
  return { ok: true };
}
