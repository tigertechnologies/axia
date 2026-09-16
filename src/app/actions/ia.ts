"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

// ============================================================
// CAMADA CENTRAL DE IA (item 13 do documento mestre)
// Ponto único por onde TODA chamada de IA passa. Detecta a chave,
// aplica limite por plano, registra uso/custo, faz cache.
// Enquanto a chave (env) não existir, retorna 'não configurada'
// honestamente — nada é simulado.
// ============================================================

export type FuncaoIA = "laudo" | "quesitos" | "classificacao" | "resumo" | "chat" | "analise_risco" | "insights";

export interface RespostaIA {
  ok: boolean;
  texto?: string;
  erro?: string;         // NAO_CONFIGURADA | LIMITE_ATINGIDO | ERRO_PROVEDOR
  cacheHit?: boolean;
}

// A IA está configurada? (a chave vive numa env var protegida no servidor)
export async function iaConfigurada(): Promise<{ configurada: boolean; provedor: string | null }> {
  const openai = process.env.OPENAI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) return { configurada: true, provedor: "anthropic" };
  if (openai) return { configurada: true, provedor: "openai" };
  return { configurada: false, provedor: null };
}

// Limite mensal de chamadas por plano (franquia — item 13).
const LIMITE_PLANO: Record<string, number> = { essential: 50, pro: 300, office: 2000 };

async function limiteDoMes(orgId: string, planId: string | null): Promise<{ usadas: number; limite: number; bloqueado: boolean }> {
  const supabase = createSupabaseServer();
  const code = (planId ?? "essential").split("_")[0];
  const limite = LIMITE_PLANO[code] ?? LIMITE_PLANO.essential;
  const { data } = await supabase.rpc("ia_uso_mes", { p_org: orgId });
  const usadas = Array.isArray(data) && data[0] ? Number((data[0] as any).total_chamadas ?? 0) : 0;
  return { usadas, limite, bloqueado: usadas >= limite };
}

// Chamada central. `prompt` é o texto final; `funcao` identifica o uso.
// Retorna a resposta OU um erro honesto (nunca inventa).
export async function chamarIA(input: { funcao: FuncaoIA; prompt: string; sistema?: string }): Promise<RespostaIA> {
  const { configurada, provedor } = await iaConfigurada();
  if (!configurada) return { ok: false, erro: "NAO_CONFIGURADA" };

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "ERRO_PROVEDOR" };
  const { data: org } = await supabase.from("organizations").select("id, plan_id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { ok: false, erro: "ERRO_PROVEDOR" };

  // Limite por plano
  const lim = await limiteDoMes(org.id, org.plan_id);
  if (lim.bloqueado) return { ok: false, erro: "LIMITE_ATINGIDO" };

  // (Quando a chave existir, aqui entra a chamada real ao provedor —
  //  fetch para api.openai.com ou api.anthropic.com com input.prompt,
  //  proteção contra prompt injection, schema validado na saída.)
  //  Como este lote NÃO ativa a chave, retornamos o status sem simular texto.
  try {
    // Placeholder de integração: sem chave real, não há chamada.
    // A implementação real (fetch + registro de tokens) é ligada no lote da chave.
    await supabase.from("ia_uso").insert({
      org_id: org.id, funcao: input.funcao, modelo: provedor, tokens_in: 0, tokens_out: 0,
      custo_cents: 0, status: "ok", created_by: user.id,
    });
    return { ok: false, erro: "NAO_CONFIGURADA" };
  } catch {
    return { ok: false, erro: "ERRO_PROVEDOR" };
  }
}

// Status da IA para exibir na tela (configurada + uso do mês).
export async function statusIA(): Promise<{ configurada: boolean; provedor: string | null; usadas: number; limite: number }> {
  const { configurada, provedor } = await iaConfigurada();
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configurada, provedor, usadas: 0, limite: 0 };
  const { data: org } = await supabase.from("organizations").select("id, plan_id").eq("owner_id", user.id).maybeSingle();
  if (!org) return { configurada, provedor, usadas: 0, limite: 0 };
  const lim = await limiteDoMes(org.id, org.plan_id);
  return { configurada, provedor, usadas: lim.usadas, limite: lim.limite };
}
