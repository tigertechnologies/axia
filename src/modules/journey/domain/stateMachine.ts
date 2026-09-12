// ============================================================
// AXIA — Domínio da Jornada Pericial (Fase 3, parte 2)
// Máquina de estados FORMAL (seção 2 do complemento técnico).
// Funções puras, sem dependência de React/DB — testáveis isoladamente.
// A UI apenas consome; a regra de negócio vive aqui.
// ============================================================

// As 10 colunas visuais do Kanban (tipo fechado — seção 2).
export type JourneyStage =
  | "novas_nomeacoes"
  | "acao_necessaria"
  | "aguardando_judiciario"
  | "agendar_pericia"
  | "pericias_agendadas"
  | "laudo_pendente"
  | "laudo_em_elaboracao"
  | "protocolar_laudo"
  | "pos_laudo"
  | "finalizadas";

export const JOURNEY_STAGES: JourneyStage[] = [
  "novas_nomeacoes", "acao_necessaria", "aguardando_judiciario", "agendar_pericia",
  "pericias_agendadas", "laudo_pendente", "laudo_em_elaboracao", "protocolar_laudo",
  "pos_laudo", "finalizadas",
];

// Rótulos legíveis (a UI usa; o domínio define para não espalhar strings).
export const STAGE_LABEL: Record<JourneyStage, string> = {
  novas_nomeacoes: "Novas nomeações",
  acao_necessaria: "Ação necessária",
  aguardando_judiciario: "Aguardando judiciário",
  agendar_pericia: "Agendar perícia",
  pericias_agendadas: "Perícias agendadas",
  laudo_pendente: "Laudo pendente",
  laudo_em_elaboracao: "Elaboração do Laudo",
  protocolar_laudo: "Protocolar laudo",
  pos_laudo: "Pós-laudo",
  finalizadas: "Finalizadas",
};

// Quem originou uma transição (seção 4: ator).
export type ActorType = "medico" | "ia" | "tribunal" | "sistema";

// MATRIZ DE TRANSIÇÕES VÁLIDAS (seção 2: "matriz central de transições").
// Para cada etapa, as etapas de destino permitidas no fluxo normal (avanço).
// Retrocessos e saltos livres NÃO são permitidos por padrão — só via exceção
// justificada (ver ADMIN_OVERRIDE abaixo).
const FORWARD: Record<JourneyStage, JourneyStage[]> = {
  novas_nomeacoes:       ["acao_necessaria"],
  acao_necessaria:       ["aguardando_judiciario", "agendar_pericia"],
  aguardando_judiciario: ["agendar_pericia", "acao_necessaria"],
  agendar_pericia:       ["pericias_agendadas"],
  pericias_agendadas:    ["laudo_pendente", "agendar_pericia"], // redesignação volta a agendar
  laudo_pendente:        ["laudo_em_elaboracao"],
  laudo_em_elaboracao:   ["protocolar_laudo"],
  protocolar_laudo:      ["pos_laudo"],
  pos_laudo:             ["finalizadas", "laudo_em_elaboracao"], // esclarecimentos reabrem elaboração
  finalizadas:           ["pos_laudo"], // reabertura por esclarecimentos (seção 5 do comando)
};

// Eventos que legitimam cada transição (seção 4: event log).
// Uma transição pode exigir um tipo de evento específico.
export type JourneyEvent =
  | "COMMUNICATION_RECEIVED" | "NOMINATION_CONFIRMED" | "ENGAGEMENT_ACCEPTED"
  | "DEADLINE_CONFIRMED" | "APPOINTMENT_SCHEDULED" | "EXAM_COMPLETED"
  | "REPORT_STARTED" | "REPORT_VALIDATED" | "PROTOCOL_CONFIRMED"
  | "CLARIFICATION_REQUESTED" | "CASE_FINISHED" | "CASE_REOPENED"
  | "ADMIN_OVERRIDE";

export interface TransitionRequest {
  currentStage: JourneyStage;
  targetStage: JourneyStage;
  eventType: JourneyEvent;
  actorType: ActorType;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;   // código estável quando negado (seção 22 do complemento)
}

// Atos que a IA NUNCA pode praticar sozinha (seção 5 do comando + complemento).
// Estas transições exigem ator humano (médico), independentemente de confiança.
const HUMAN_ONLY_TARGETS: JourneyStage[] = [
  "protocolar_laudo", // protocolar é ato humano
  "pos_laudo",        // confirmar protocolo é ato humano
  "finalizadas",      // encerrar é ato humano
];

// A decisão central: esta transição é permitida?
export function canTransition(req: TransitionRequest): TransitionResult {
  const { currentStage, targetStage, eventType, actorType } = req;

  // Override administrativo explícito (seção 2: estados laterais / exceção justificada).
  if (eventType === "ADMIN_OVERRIDE") {
    if (actorType !== "medico") return { allowed: false, reason: "OVERRIDE_REQUIRES_HUMAN" };
    return { allowed: true };
  }

  // A etapa de destino consta como avanço válido da etapa atual?
  const permitidas = FORWARD[currentStage] ?? [];
  if (!permitidas.includes(targetStage)) {
    return { allowed: false, reason: "INVALID_TRANSITION" };
  }

  // Atos de responsabilidade humana não podem ser feitos pela IA.
  if (HUMAN_ONLY_TARGETS.includes(targetStage) && actorType === "ia") {
    return { allowed: false, reason: "REQUIRES_HUMAN_CONFIRMATION" };
  }

  return { allowed: true };
}

// Sugestão da "próxima ação" para exibir no card (seção 21 do comando).
export function proximaEtapaSugerida(stage: JourneyStage): JourneyStage | null {
  const ops = FORWARD[stage] ?? [];
  return ops[0] ?? null;
}
