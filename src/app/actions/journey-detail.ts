"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export interface TimelineEvento {
  id: string; event_type: string; origem: string | null; ator: string | null;
  event_at: string; human_confirmed: boolean; metadata: Record<string, unknown> | null;
}
export interface DetalhePrazo { id: string; titulo: string; due_date: string | null; status: string; fonte?: string | null }
export interface DetalheQuesito { id: string; origem: string; numero: number | null; texto: string; respondido: boolean }
export interface DetalheDocumento { id: string; tipo: string | null; nome_original: string | null; created_at: string; segredo_justica: boolean }

export interface PericiaDetalhe {
  timeline: TimelineEvento[];
  prazos: DetalhePrazo[];
  quesitos: DetalheQuesito[];
  documentos: DetalheDocumento[];
}

// Carrega os dados do painel lateral. Tudo protegido por RLS (org do usuário).
export async function carregarDetalhePericia(periciaId: string): Promise<PericiaDetalhe> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { timeline: [], prazos: [], quesitos: [], documentos: [] };

  const [ev, pz, qs, dc] = await Promise.all([
    supabase.from("pericia_events").select("id, event_type, origem, ator, event_at, human_confirmed, metadata").eq("pericia_id", periciaId).order("event_at", { ascending: false }).limit(50),
    supabase.from("prazos").select("id, titulo, due_date, status").eq("pericia_id", periciaId),
    supabase.from("pericia_quesitos").select("id, origem, numero, texto, respondido").eq("pericia_id", periciaId).order("numero", { ascending: true }),
    supabase.from("pericia_documents").select("id, tipo, nome_original, created_at, segredo_justica").eq("pericia_id", periciaId).order("created_at", { ascending: false }),
  ]);

  return {
    timeline: (ev.data ?? []) as TimelineEvento[],
    prazos: (pz.data ?? []) as DetalhePrazo[],
    quesitos: (qs.data ?? []) as DetalheQuesito[],
    documentos: (dc.data ?? []) as DetalheDocumento[],
  };
}
