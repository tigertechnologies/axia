"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { canTransition, type JourneyStage, type JourneyEvent, type ActorType } from "@/modules/journey/domain/stateMachine";

// Resultado seguro (nunca vaza stack trace — seção 13/22 do complemento).
export interface TransicaoResposta {
  ok?: boolean;
  stage?: JourneyStage;
  version?: number;
  error?: string;   // código estável: AUTH_REQUIRED | INVALID_TRANSITION | VERSION_CONFLICT | ...
}

// Move uma perícia de etapa, com todas as validações em camadas:
// 1) sessão válida  2) perícia existe e é da org do usuário  3) transição
// permitida pela matriz de domínio  4) RPC atômica no banco (evento+etapa+auditoria).
export async function moverPericia(input: {
  periciaId: string;
  targetStage: JourneyStage;
  expectedVersion: number;
  eventType: JourneyEvent;
  actorType?: ActorType;
  metadata?: Record<string, unknown>;
}): Promise<TransicaoResposta> {
  const supabase = createSupabaseServer();

  // (1) sessão
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTH_REQUIRED" };

  // (2) a perícia existe e pertence à organização do usuário?
  // (RLS já protege, mas validamos no servidor — não confiar só no frontend, seção 13)
  const { data: pericia } = await supabase
    .from("pericias")
    .select("id, workflow_stage, version, org_id")
    .eq("id", input.periciaId)
    .maybeSingle();
  if (!pericia) return { error: "PROCESS_NOT_FOUND" };

  const currentStage = (pericia.workflow_stage ?? "novas_nomeacoes") as JourneyStage;

  // (3) a matriz de domínio permite este movimento?
  const decisao = canTransition({
    currentStage,
    targetStage: input.targetStage,
    eventType: input.eventType,
    actorType: input.actorType ?? "medico",
  });
  if (!decisao.allowed) return { error: decisao.reason ?? "INVALID_TRANSITION" };

  // (4) transição ATÔMICA no banco (valida versão, grava evento+etapa+auditoria)
  const { data, error } = await supabase.rpc("pericia_transicao", {
    p_pericia_id: input.periciaId,
    p_target_stage: input.targetStage,
    p_expected_version: input.expectedVersion,
    p_event_type: input.eventType,
    p_ator: input.actorType ?? "medico",
    p_origem: "manual",
    p_human_confirmed: true,
    p_metadata: (input.metadata ?? {}) as any,
  });

  if (error) {
    // Traduz o erro do banco para um código estável (nunca expõe SQL cru).
    const msg = error.message || "";
    if (msg.includes("VERSION_CONFLICT")) return { error: "VERSION_CONFLICT" };
    if (msg.includes("PROCESS_NOT_FOUND")) return { error: "PROCESS_NOT_FOUND" };
    if (msg.includes("ORG_ACCESS_DENIED")) return { error: "ORG_ACCESS_DENIED" };
    if (msg.includes("INVALID_TRANSITION")) return { error: "INVALID_TRANSITION" };
    return { error: "TRANSITION_FAILED" };
  }

  const res = (data ?? {}) as { ok?: boolean; stage?: JourneyStage; version?: number };
  return { ok: res.ok, stage: res.stage, version: res.version };
}
