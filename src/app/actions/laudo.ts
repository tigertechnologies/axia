"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { laudoEmBranco, prePreencher, normalizaConteudo, type ConteudoLaudo, type DadosCaso } from "@/modules/laudo/domain/laudoModel";

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null | undefined) { if (!iso) return null; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${d.getFullYear()}`; }

export interface ModeloItem { id: string; escopo: string; nome: string; especialidade: string | null }
export interface LaudoItem { id: string; titulo: string; status: string; updated_at: string; pericia_id: string | null }

// Monta os dados do caso a partir da perícia (pré-preenchimento — item 6).
async function dadosDoCaso(supabase: ReturnType<typeof createSupabaseServer>, periciaId: string): Promise<{ dados: DadosCaso; orgId: string | null; processoId: string | null }> {
  const { data: pe } = await supabase.from("pericias").select("id, org_id, processo_id, process_ref, titulo, scheduled_at").eq("id", periciaId).maybeSingle();
  if (!pe) return { dados: {}, orgId: null, processoId: null };
  const [{ data: proc }, { data: prof }, { data: qs }] = await Promise.all([
    pe.processo_id ? supabase.from("judicial_processes").select("numero_original, tribunal, vara, comarca").eq("id", pe.processo_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("nome, sobrenome, crm, especialidade").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle(),
    supabase.from("pericia_quesitos").select("origem, numero, texto").eq("pericia_id", periciaId).order("numero", { ascending: true }),
  ]);
  const dados: DadosCaso = {
    nome_periciado: pe.titulo,
    numero_processo: proc?.numero_original ?? pe.process_ref ?? null,
    tribunal: proc?.tribunal ?? null,
    vara: proc?.vara ?? null,
    comarca: proc?.comarca ?? null,
    data_pericia: dataBR(pe.scheduled_at),
    especialidade: prof?.especialidade ?? null,
    crm: prof?.crm ?? null,
    medico: prof ? `${prof.nome ?? ""} ${prof.sobrenome ?? ""}`.trim() : null,
    quesitos: (qs ?? []).map((q: any) => ({ origem: q.origem, numero: q.numero, texto: q.texto })),
  };
  return { dados, orgId: pe.org_id, processoId: pe.processo_id };
}

// Lista modelos visíveis (globais + pessoais) — RLS já filtra.
export async function listarModelos(): Promise<ModeloItem[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("laudo_templates").select("id, escopo, nome, especialidade").order("escopo", { ascending: true }).order("nome", { ascending: true });
  return (data ?? []) as ModeloItem[];
}

// Lista laudos anteriores do médico (para reutilização — item 4).
export async function listarLaudosAnteriores(): Promise<LaudoItem[]> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("laudos").select("id, titulo, status, updated_at, pericia_id").order("updated_at", { ascending: false }).limit(50);
  return (data ?? []) as LaudoItem[];
}

// Cria um laudo para a perícia, a partir de uma das 5 origens.
export async function criarLaudo(input: {
  periciaId: string;
  origem: "modelo_axia" | "laudo_anterior" | "ia" | "branco";
  templateId?: string | null;
  baseLaudoId?: string | null;
}): Promise<{ error?: string; laudoId?: string }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  const { dados, orgId, processoId } = await dadosDoCaso(supabase, input.periciaId);
  if (!orgId) return { error: "PROCESS_NOT_FOUND" };

  // Monta o conteúdo base conforme a origem.
  let base: ConteudoLaudo = laudoEmBranco();
  if (input.origem === "modelo_axia" && input.templateId) {
    const { data: tpl } = await supabase.from("laudo_templates").select("conteudo").eq("id", input.templateId).maybeSingle();
    if (tpl) base = normalizaConteudo(tpl.conteudo);
  } else if (input.origem === "laudo_anterior" && input.baseLaudoId) {
    const { data: ant } = await supabase.from("laudos").select("conteudo").eq("id", input.baseLaudoId).maybeSingle();
    if (ant) base = normalizaConteudo(ant.conteudo);
  }
  // origem "ia" começa em branco por ora; a geração real virá quando a chave de IA existir.

  const conteudo = prePreencher(base, dados);

  const { data: novo, error } = await supabase.from("laudos").insert({
    org_id: orgId, pericia_id: input.periciaId, processo_id: processoId,
    titulo: "Laudo — " + (dados.nome_periciado ?? "perícia"),
    status: "rascunho", origem: input.origem,
    template_id: input.templateId ?? null, base_laudo_id: input.baseLaudoId ?? null,
    conteudo, version: 1, created_by: user.id, updated_at: new Date().toISOString(),
  }).select("id").maybeSingle();
  if (error || !novo) return { error: error?.message ?? "Falha ao criar laudo." };

  revalidatePath("/jornada");
  return { laudoId: novo.id };
}

// Carrega um laudo para o editor.
export async function carregarLaudo(laudoId: string): Promise<{ error?: string; titulo?: string; status?: string; version?: number; conteudo?: ConteudoLaudo }> {
  const supabase = createSupabaseServer();
  const { data } = await supabase.from("laudos").select("titulo, status, version, conteudo").eq("id", laudoId).maybeSingle();
  if (!data) return { error: "NOT_FOUND" };
  return { titulo: data.titulo, status: data.status, version: data.version, conteudo: normalizaConteudo(data.conteudo) };
}

// Salva o laudo (autosave/rascunho) e registra uma versão imutável (item 9).
export async function salvarLaudo(input: { laudoId: string; titulo?: string; conteudo: ConteudoLaudo }): Promise<{ error?: string; version?: number }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  const { data: atual } = await supabase.from("laudos").select("org_id, version").eq("id", input.laudoId).maybeSingle();
  if (!atual) return { error: "NOT_FOUND" };
  const novaVersao = (atual.version ?? 1) + 1;

  const { error } = await supabase.from("laudos").update({
    conteudo: input.conteudo, ...(input.titulo ? { titulo: input.titulo } : {}),
    version: novaVersao, updated_at: new Date().toISOString(),
  }).eq("id", input.laudoId);
  if (error) return { error: error.message };

  // Snapshot imutável da versão (best-effort).
  try {
    await supabase.from("laudo_versions").insert({
      org_id: atual.org_id, laudo_id: input.laudoId, version: novaVersao,
      conteudo: input.conteudo, created_by: user.id,
    });
  } catch { /* best-effort */ }

  return { version: novaVersao };
}
