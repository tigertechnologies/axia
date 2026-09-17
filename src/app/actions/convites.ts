"use server";

import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ConvitePendente {
  id: string; org_id: string; papel: string; org_nome: string | null;
}

// Lista convites pendentes para o e-mail do usuário logado.
// Usa admin (service role) porque precisa ler convites de OUTRAS orgs
// (o convidado ainda não pertence a elas) — mas SEMPRE filtrado pelo
// e-mail do próprio usuário logado (nunca confia em input).
export async function meusConvites(): Promise<ConvitePendente[]> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("organization_members")
    .select("id, org_id, papel")
    .eq("convidado_email", user.email.toLowerCase())
    .eq("status", "convidado");
  if (!data || data.length === 0) return [];

  // Enriquece com o nome da organização.
  const orgIds = data.map((c: any) => c.org_id);
  const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
  const nomeMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));

  return data.map((c: any) => ({ id: c.id, org_id: c.org_id, papel: c.papel, org_nome: nomeMap.get(c.org_id) ?? null }));
}

// Aceita um convite: vincula o user_id do usuário logado e ativa o membro.
export async function aceitarConvite(conviteId: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "AUTH_REQUIRED" };

  const admin = createSupabaseAdmin();
  // Confirma que o convite é para o e-mail deste usuário (defesa).
  const { data: convite } = await admin.from("organization_members")
    .select("id, org_id, convidado_email, status")
    .eq("id", conviteId).maybeSingle();
  if (!convite) return { error: "NOT_FOUND" };
  if (convite.convidado_email?.toLowerCase() !== user.email.toLowerCase()) return { error: "NOT_YOURS" };
  if (convite.status !== "convidado") return { error: "JA_PROCESSADO" };

  // Já é membro dessa org? (evita duplicar)
  const { data: jaMembro } = await admin.from("organization_members")
    .select("id").eq("org_id", convite.org_id).eq("user_id", user.id).maybeSingle();
  if (jaMembro) {
    // remove o convite pendente duplicado
    await admin.from("organization_members").delete().eq("id", conviteId);
    return { ok: true };
  }

  // Vincula e ativa.
  const { error } = await admin.from("organization_members")
    .update({ user_id: user.id, status: "ativo", updated_at: new Date().toISOString() })
    .eq("id", conviteId);
  if (error) return { error: error.message };

  try {
    await admin.from("audit_logs").insert({
      org_id: convite.org_id, actor_id: user.id, action: "equipe.convite_aceito", entity_type: "membro", entity_id: conviteId,
    });
  } catch { /* best-effort */ }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function recusarConvite(conviteId: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return {};
  const admin = createSupabaseAdmin();
  const { data: convite } = await admin.from("organization_members").select("convidado_email, status").eq("id", conviteId).maybeSingle();
  if (convite && convite.convidado_email?.toLowerCase() === user.email.toLowerCase() && convite.status === "convidado") {
    await admin.from("organization_members").delete().eq("id", conviteId);
  }
  return { ok: true };
}
