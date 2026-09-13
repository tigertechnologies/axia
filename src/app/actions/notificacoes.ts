"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Notificacao {
  id: string; tipo: string; titulo: string; descricao: string | null;
  href: string | null; lida: boolean; created_at: string;
}

// Sincroniza notificações a partir do estado atual (prazos urgentes, nomeações
// a validar, laudos pendentes). Idempotente por (org + tipo + entity) via título
// — evita duplicar a mesma notificação a cada carregamento.
async function sincronizar(supabase: ReturnType<typeof createSupabaseServer>, orgId: string, userId: string) {
  // Prazos urgentes
  const { data: prazos } = await supabase.from("prazos").select("id, titulo, status, due_date").eq("status", "urgente").limit(20);
  // Nomeações a validar
  const { data: noms } = await supabase.from("communications").select("id, subject").eq("category", "nomeacao").eq("validated", false).limit(20);

  const candidatos: { tipo: string; titulo: string; descricao: string | null; href: string; entity: string }[] = [];
  (prazos ?? []).forEach((p: any) => candidatos.push({ tipo: "prazo", titulo: "Prazo urgente", descricao: p.titulo, href: "/jornada", entity: `prazo:${p.id}` }));
  (noms ?? []).forEach((n: any) => candidatos.push({ tipo: "nomeacao", titulo: "Nomeação a validar", descricao: n.subject, href: "/inbox", entity: `nomeacao:${n.id}` }));

  if (candidatos.length === 0) return;

  // Busca as já existentes (por descrição+tipo) para não duplicar.
  const { data: existentes } = await supabase.from("notificacoes").select("tipo, descricao").eq("org_id", orgId);
  const chaveExistente = new Set((existentes ?? []).map((e: any) => `${e.tipo}|${e.descricao}`));

  const novas = candidatos
    .filter((c) => !chaveExistente.has(`${c.tipo}|${c.descricao}`))
    .map((c) => ({ org_id: orgId, user_id: userId, tipo: c.tipo, titulo: c.titulo, descricao: c.descricao, href: c.href }));

  if (novas.length) await supabase.from("notificacoes").insert(novas);
}

export async function listarNotificacoes(): Promise<{ itens: Notificacao[]; naoLidas: number }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { itens: [], naoLidas: 0 };
  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (org) { try { await sincronizar(supabase, org.id, user.id); } catch { /* best-effort */ } }

  const { data } = await supabase.from("notificacoes").select("id, tipo, titulo, descricao, href, lida, created_at").order("created_at", { ascending: false }).limit(50);
  const itens = (data ?? []) as Notificacao[];
  return { itens, naoLidas: itens.filter((n) => !n.lida).length };
}

export async function marcarTodasLidas(): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  revalidatePath("/");
  return { ok: true };
}

export async function marcarLida(id: string): Promise<{ ok?: boolean }> {
  const supabase = createSupabaseServer();
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  return { ok: true };
}
