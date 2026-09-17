"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

// Exportação de dados (LGPD — direito de portabilidade, seção 27).
// Reúne todos os dados da organização do usuário num objeto para download.
// Só dados da própria org (RLS). Não inclui segredos nem dados de terceiros.
export async function exportarMeusDados(): Promise<{ error?: string; dados?: Record<string, unknown> }> {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  const { data: org } = await supabase.from("organizations").select("id, name, plan_id, subscription_status, created_at").eq("owner_id", user.id).maybeSingle();
  if (!org) return { error: "NO_ORG" };

  // Busca cada conjunto (RLS garante que é só da org). Best-effort por tabela.
  async function tab(nome: string, cols = "*") {
    try { const { data } = await supabase.from(nome).select(cols); return data ?? []; } catch { return []; }
  }

  const [profile, comms, pericias, processos, prazos, honorarios, laudos, documentos, quesitos, tarefas, contatos, financeiro, calculos] = await Promise.all([
    supabase.from("profiles").select("nome, crm, uf, especialidade, telefone, created_at").eq("id", user.id).maybeSingle().then((r) => r.data),
    tab("communications", "category, subject, process_ref, received_at, validated"),
    tab("pericias", "titulo, local, process_ref, scheduled_at, workflow_stage"),
    tab("judicial_processes", "numero_original, tribunal, vara, comarca"),
    tab("prazos", "titulo, process_ref, due_date, status"),
    tab("honorarios", "process_ref, amount_cents, status"),
    tab("laudos", "titulo, status, created_at"),
    tab("pericia_documents", "tipo, nome_original, created_at, segredo_justica"),
    tab("pericia_quesitos", "origem, numero, texto, respondido"),
    tab("pericia_tasks", "titulo, status, prioridade, due_at"),
    tab("contatos", "nome, tipo, organizacao, email, telefone, oab, cidade, uf"),
    tab("financeiro_lancamentos", "tipo, descricao, categoria, valor_cents, status, data"),
    tab("calculos_salvos", "tipo, titulo, resumo_texto, created_at"),
  ]);

  const dados = {
    _meta: {
      exportado_em: new Date().toISOString(),
      titular: user.email,
      aviso: "Exportação de dados da AXIA conforme LGPD (direito de portabilidade). Contém apenas dados da sua organização.",
    },
    conta: { email: user.email, ...profile },
    organizacao: org,
    comunicacoes: comms,
    pericias, processos, prazos, honorarios, laudos, documentos, quesitos, tarefas, contatos,
    financeiro, calculos_salvos: calculos,
  };

  return { dados };
}
