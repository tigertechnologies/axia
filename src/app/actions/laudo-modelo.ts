"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { converterParaModelo } from "@/modules/laudo/domain/reuso";
import { normalizaConteudo, type DadosCaso } from "@/modules/laudo/domain/laudoModel";
import { revalidatePath } from "next/cache";

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null | undefined) { if (!iso) return null; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${d.getFullYear()}`; }

export async function salvarComoModelo(input: { laudoId: string; nome: string }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!input.nome?.trim()) return { error: "Dê um nome ao modelo." };

  const { data: laudo } = await supabase.from("laudos").select("org_id, conteudo, pericia_id").eq("id", input.laudoId).maybeSingle();
  if (!laudo) return { error: "NOT_FOUND" };

  let dados: DadosCaso = {};
  if (laudo.pericia_id) {
    const { data: pe } = await supabase.from("pericias").select("titulo, process_ref, processo_id, scheduled_at").eq("id", laudo.pericia_id).maybeSingle();
    let proc: any = null;
    if (pe?.processo_id) {
      const r = await supabase.from("judicial_processes").select("numero_original, tribunal, vara, comarca").eq("id", pe.processo_id).maybeSingle();
      proc = r.data;
    }
    const { data: prof } = await supabase.from("profiles").select("nome, sobrenome, crm").eq("id", user.id).maybeSingle();
    dados = {
      nome_periciado: pe?.titulo ?? null,
      numero_processo: proc?.numero_original ?? pe?.process_ref ?? null,
      tribunal: proc?.tribunal ?? null,
      vara: proc?.vara ?? null,
      comarca: proc?.comarca ?? null,
      data_pericia: dataBR(pe?.scheduled_at),
      crm: prof?.crm ?? null,
      medico: prof ? `${prof.nome ?? ""} ${prof.sobrenome ?? ""}`.trim() : null,
    };
  }

  const conteudoModelo = converterParaModelo(normalizaConteudo(laudo.conteudo), dados);
  const { error } = await supabase.from("laudo_templates").insert({
    escopo: "pessoal", org_id: laudo.org_id, nome: input.nome.slice(0, 120),
    conteudo: conteudoModelo, created_by: user.id,
  });
  if (error) return { error: error.message };
  try { await supabase.from("audit_logs").insert({ org_id: laudo.org_id, actor_id: user.id, action: "laudo.salvar_modelo", entity_type: "laudo", entity_id: input.laudoId }); } catch {}
  revalidatePath("/jornada");
  return { ok: true };
}
