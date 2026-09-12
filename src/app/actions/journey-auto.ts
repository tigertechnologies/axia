"use server";

import { createSupabaseAdmin } from "@/lib/supabase/server";

// Normaliza um número de processo (só dígitos) — igual ao backfill do banco.
function normalizaProcesso(p: string | null): string | null {
  if (!p) return null;
  const d = p.replace(/[^0-9]/g, "");
  return d.length ? d : null;
}

// Resolve (ou cria) o judicial_process para um process_ref, dentro de uma org.
async function resolveProcesso(admin: ReturnType<typeof createSupabaseAdmin>, orgId: string, processRef: string | null): Promise<string | null> {
  const norm = normalizaProcesso(processRef);
  if (!norm) return null;
  const { data: existente } = await admin
    .from("judicial_processes").select("id").eq("org_id", orgId).eq("numero_normalizado", norm).maybeSingle();
  if (existente?.id) return existente.id;
  const { data: criado } = await admin
    .from("judicial_processes")
    .insert({ org_id: orgId, numero_original: processRef, numero_normalizado: norm, cnj_valido: norm.length === 20 })
    .select("id").maybeSingle();
  return criado?.id ?? null;
}

/**
 * Automação da jornada: ao chegar uma NOMEAÇÃO, cria o card na coluna
 * "novas_nomeacoes" — a menos que já exista perícia para o mesmo processo
 * (idempotência, seção 6: uma nova comunicação do mesmo processo NÃO cria
 * outra perícia automaticamente).
 *
 * Usa o cliente ADMIN (service role) porque roda na ingestão (sem sessão),
 * mas SEMPRE escopado por orgId (nunca confia em dado externo).
 * Retorna o id da perícia (nova ou existente), ou null se não aplicável.
 */
export async function autoCriarCardNomeacao(input: {
  orgId: string;
  processRef: string | null;
  assunto: string | null;
  communicationId?: string | null;
}): Promise<{ periciaId: string | null; criada: boolean }> {
  const admin = createSupabaseAdmin();
  const processoId = await resolveProcesso(admin, input.orgId, input.processRef);

  // Já existe perícia para este processo? (evita duplicar — seção 6)
  if (processoId) {
    const { data: jaExiste } = await admin
      .from("pericias").select("id").eq("org_id", input.orgId).eq("processo_id", processoId).limit(1).maybeSingle();
    if (jaExiste?.id) {
      // Registra o evento (comunicação recebida) mas NÃO cria nova perícia.
      await admin.from("pericia_events").insert({
        org_id: input.orgId, processo_id: processoId, pericia_id: jaExiste.id,
        event_type: "COMMUNICATION_RECEIVED", origem: "email", ator: "ia", human_confirmed: false,
        communication_id: input.communicationId ?? null,
        idempotency_key: input.communicationId ? `comm:${input.communicationId}` : null,
      }).then(() => {}, () => {}); // best-effort; dedup por idempotency_key
      return { periciaId: jaExiste.id, criada: false };
    }
  }

  // Cria a perícia nova, já posicionada em "novas_nomeacoes".
  const { data: novaPericia, error } = await admin.from("pericias").insert({
    org_id: input.orgId,
    titulo: input.assunto?.slice(0, 200) || "Nova nomeação",
    process_ref: input.processRef,
    processo_id: processoId,
    scheduled_at: new Date().toISOString(),   // sem data ainda; será definida no agendamento
    workflow_stage: "novas_nomeacoes",
    workflow_status: "auto_criada",
    version: 1,
    updated_at: new Date().toISOString(),
  }).select("id").maybeSingle();

  if (error || !novaPericia) return { periciaId: null, criada: false };

  // Evento inicial da jornada.
  await admin.from("pericia_events").insert({
    org_id: input.orgId, processo_id: processoId, pericia_id: novaPericia.id,
    event_type: "COMMUNICATION_RECEIVED", origem: "email", ator: "ia", human_confirmed: false,
    communication_id: input.communicationId ?? null,
    idempotency_key: input.communicationId ? `comm:${input.communicationId}` : null,
    metadata: { auto: true, para: "novas_nomeacoes" },
  }).then(() => {}, () => {});

  return { periciaId: novaPericia.id, criada: true };
}
