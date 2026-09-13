"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export interface ResultadoBusca {
  tipo: "pericia" | "processo" | "laudo";
  id: string;          // id para o link
  titulo: string;
  subtitulo: string;
  href: string;
}

// Busca global: perícias (por título/processo), processos (por número) e laudos.
// Tudo protegido por RLS — só retorna dados da organização do usuário.
export async function buscaGlobal(termo: string): Promise<ResultadoBusca[]> {
  const q = (termo ?? "").trim();
  if (q.length < 2) return [];

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const like = `%${q}%`;
  const [per, proc, lau] = await Promise.all([
    supabase.from("pericias").select("id, titulo, process_ref, workflow_stage, scheduled_at").or(`titulo.ilike.${like},process_ref.ilike.${like}`).limit(8),
    supabase.from("judicial_processes").select("id, numero_original, tribunal, vara").or(`numero_original.ilike.${like},tribunal.ilike.${like}`).limit(6),
    supabase.from("laudos").select("id, titulo, status, pericia_id").ilike("titulo", like).limit(6),
  ]);

  const out: ResultadoBusca[] = [];

  (per.data ?? []).forEach((p: any) => out.push({
    tipo: "pericia", id: p.id, titulo: p.titulo || "Perícia",
    subtitulo: [p.process_ref, p.workflow_stage].filter(Boolean).join(" · ") || "perícia",
    href: `/jornada`,
  }));

  (proc.data ?? []).forEach((p: any) => out.push({
    tipo: "processo", id: p.id, titulo: p.numero_original || "Processo",
    subtitulo: [p.tribunal, p.vara].filter(Boolean).join(" · ") || "processo",
    href: p.numero_original ? `/processos/${encodeURIComponent(p.numero_original)}` : "/jornada",
  }));

  (lau.data ?? []).forEach((l: any) => out.push({
    tipo: "laudo", id: l.id, titulo: l.titulo || "Laudo",
    subtitulo: `laudo · ${l.status}`,
    href: l.pericia_id ? `/laudos/${l.pericia_id}` : "/jornada",
  }));

  return out;
}
