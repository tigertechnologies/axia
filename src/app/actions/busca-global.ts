"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export interface ResultadoBusca {
  tipo: "pericia" | "processo" | "laudo" | "documento" | "tarefa" | "contato" | "comunicacao" | "honorario";
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

function fmtBRL(cents: number) { return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

// Busca global completa (item 28): perícias, processos, laudos, documentos,
// tarefas, contatos, comunicações e honorários. Tudo com RLS.
export async function buscaGlobal(termo: string): Promise<ResultadoBusca[]> {
  const q = (termo ?? "").trim();
  if (q.length < 2) return [];

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const like = `%${q}%`;
  const [per, proc, lau, doc, tar, con, com, hon] = await Promise.all([
    supabase.from("pericias").select("id, titulo, process_ref, workflow_stage").or(`titulo.ilike.${like},process_ref.ilike.${like}`).limit(6),
    supabase.from("judicial_processes").select("id, numero_original, tribunal, vara").or(`numero_original.ilike.${like},tribunal.ilike.${like}`).limit(5),
    supabase.from("laudos").select("id, titulo, status, pericia_id").ilike("titulo", like).limit(5),
    supabase.from("pericia_documents").select("id, nome_original, tipo, pericia_id").or(`nome_original.ilike.${like},tipo.ilike.${like}`).limit(5),
    supabase.from("pericia_tasks").select("id, titulo, status").ilike("titulo", like).limit(5),
    supabase.from("contatos").select("id, nome, tipo, organizacao").or(`nome.ilike.${like},organizacao.ilike.${like},oab.ilike.${like}`).limit(5),
    supabase.from("communications").select("id, subject, category, process_ref").ilike("subject", like).limit(5),
    supabase.from("honorarios").select("id, process_ref, amount_cents, status").ilike("process_ref", like).limit(5),
  ]);

  const out: ResultadoBusca[] = [];

  (per.data ?? []).forEach((p: any) => out.push({ tipo: "pericia", id: p.id, titulo: p.titulo || "Perícia", subtitulo: [p.process_ref, p.workflow_stage].filter(Boolean).join(" · ") || "perícia", href: "/jornada" }));
  (proc.data ?? []).forEach((p: any) => out.push({ tipo: "processo", id: p.id, titulo: p.numero_original || "Processo", subtitulo: [p.tribunal, p.vara].filter(Boolean).join(" · ") || "processo", href: p.numero_original ? `/processos/${encodeURIComponent(p.numero_original)}` : "/jornada" }));
  (lau.data ?? []).forEach((l: any) => out.push({ tipo: "laudo", id: l.id, titulo: l.titulo || "Laudo", subtitulo: `laudo · ${l.status}`, href: l.pericia_id ? `/laudos/${l.pericia_id}` : "/jornada" }));
  (doc.data ?? []).forEach((d: any) => out.push({ tipo: "documento", id: d.id, titulo: d.nome_original || d.tipo || "Documento", subtitulo: "documento", href: "/jornada" }));
  (tar.data ?? []).forEach((t: any) => out.push({ tipo: "tarefa", id: t.id, titulo: t.titulo || "Tarefa", subtitulo: `tarefa · ${t.status}`, href: "/tarefas" }));
  (con.data ?? []).forEach((c: any) => out.push({ tipo: "contato", id: c.id, titulo: c.nome || "Contato", subtitulo: [c.tipo, c.organizacao].filter(Boolean).join(" · ") || "contato", href: "/contatos" }));
  (com.data ?? []).forEach((c: any) => out.push({ tipo: "comunicacao", id: c.id, titulo: c.subject || "Comunicação", subtitulo: [c.category, c.process_ref].filter(Boolean).join(" · ") || "comunicação", href: "/inbox" }));
  (hon.data ?? []).forEach((h: any) => out.push({ tipo: "honorario", id: h.id, titulo: `Honorário · ${h.process_ref ?? ""}`, subtitulo: `${fmtBRL(h.amount_cents)} · ${h.status}`, href: "/honorarios" }));

  return out;
}
