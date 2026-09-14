"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { PAPEIS, type Membro } from "./equipe-const";
import { revalidatePath } from "next/cache";

// Lista os membros da organização do usuário (inclui o dono).
export async function listarEquipe(): Promise<{ membros: Membro[]; souDono: boolean; email?: string }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { membros: [], souDono: false };
  const { data: org } = await supabase.from("organizations").select("id, owner_id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { membros: [], souDono: false };

  const { data: membros } = await supabase.from("organization_members")
    .select("id, user_id, papel, status, convidado_email").eq("org_id", org.id);

  const lista: Membro[] = [
    { id: null, user_id: user.id, papel: "proprietario", status: "ativo", email: user.email ?? null, convidado_email: null, ehDono: true },
    ...((membros ?? []) as any[]).map((m) => ({
      id: m.id, user_id: m.user_id, papel: m.papel, status: m.status,
      email: null, convidado_email: m.convidado_email, ehDono: false,
    })),
  ];
  return { membros: lista, souDono: true, email: user.email ?? undefined };
}

// Convida um membro por e-mail. Cria um registro 'convidado'.
// (O aceite/vínculo definitivo do usuário chega num passo futuro — por ora,
// registra o convite; quem já tem conta pode ser vinculado manualmente.)
export async function convidarMembro(email: string, papel: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  const em = (email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { error: "E-mail inválido." };
  if (!PAPEIS.includes(papel)) return { error: "Papel inválido." };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "Apenas o proprietário pode convidar." };

  // Convite pendente: guarda o e-mail; o vínculo (user_id) acontece no aceite.
  const { error } = await supabase.from("organization_members").insert({
    org_id: org.id, papel, status: "convidado", convidado_email: em,
  });
  if (error) {
    if ((error as any).code === "23505") return { error: "Este e-mail já foi convidado." };
    return { error: "Não foi possível registrar o convite agora." };
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function mudarPapel(membroId: string, papel: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  if (!PAPEIS.includes(papel)) return { error: "Papel inválido." };
  const { error } = await supabase.from("organization_members").update({ papel, updated_at: new Date().toISOString() }).eq("id", membroId);
  if (error) return { error: error.message };
  revalidatePath("/equipe");
  return { ok: true };
}

export async function removerMembro(membroId: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("organization_members").delete().eq("id", membroId);
  revalidatePath("/equipe");
  return { ok: true };
}
