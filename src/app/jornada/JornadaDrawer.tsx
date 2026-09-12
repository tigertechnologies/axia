"use client";
import { useState, useEffect, useTransition } from "react";
import { JOURNEY_STAGES, STAGE_LABEL, canTransition, type JourneyStage, type JourneyEvent } from "@/modules/journey/domain/stateMachine";
import { moverPericia } from "@/app/actions/journey";
import { carregarDetalhePericia, type PericiaDetalhe, type TimelineEvento } from "@/app/actions/journey-detail";
import { criarPrazoNaPericia, confirmarPrazoNaPericia } from "@/app/actions/journey-prazos";
import { formatBRL } from "@/lib/plans";
import type { JornadaCard } from "./JornadaClient";

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataHora(iso: string) { const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function dataBR(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }

// Rótulo humano para o botão de avançar, conforme a etapa de destino.
const ACAO_LABEL: Record<string, string> = {
  acao_necessaria: "Confirmar dados extraídos",
  aguardando_judiciario: "Aguardar judiciário",
  agendar_pericia: "Ir para agendamento",
  pericias_agendadas: "Confirmar agendamento",
  laudo_pendente: "Registrar perícia realizada",
  laudo_em_elaboracao: "Iniciar laudo",
  protocolar_laudo: "Laudo pronto para protocolo",
  pos_laudo: "Confirmar protocolo",
  finalizadas: "Encerrar perícia",
};
// Evento associado a cada avanço (para a timeline).
const ACAO_EVENTO: Record<string, JourneyEvent> = {
  acao_necessaria: "NOMINATION_CONFIRMED",
  aguardando_judiciario: "DEADLINE_CONFIRMED",
  agendar_pericia: "ENGAGEMENT_ACCEPTED",
  pericias_agendadas: "APPOINTMENT_SCHEDULED",
  laudo_pendente: "EXAM_COMPLETED",
  laudo_em_elaboracao: "REPORT_STARTED",
  protocolar_laudo: "REPORT_VALIDATED",
  pos_laudo: "PROTOCOL_CONFIRMED",
  finalizadas: "CASE_FINISHED",
};

const EVENTO_LABEL: Record<string, string> = {
  COMMUNICATION_RECEIVED: "Comunicação recebida", NOMINATION_CONFIRMED: "Dados confirmados",
  ENGAGEMENT_ACCEPTED: "Encargo aceito", DEADLINE_CONFIRMED: "Prazo confirmado",
  APPOINTMENT_SCHEDULED: "Perícia agendada", EXAM_COMPLETED: "Perícia realizada",
  REPORT_STARTED: "Laudo iniciado", REPORT_VALIDATED: "Laudo validado",
  PROTOCOL_CONFIRMED: "Protocolo confirmado", CLARIFICATION_REQUESTED: "Esclarecimentos solicitados",
  CASE_FINISHED: "Perícia encerrada", CASE_REOPENED: "Caso reaberto",
};
const ORIGEM_LABEL: Record<string, string> = { email: "por e-mail", api: "por API", tribunal: "do tribunal", manual: "manualmente", ia: "pela AXIA" };

function JornadaBar({ stage }: { stage: JourneyStage }) {
  const idx = JOURNEY_STAGES.indexOf(stage);
  return (
    <div className="jd-bar">
      {JOURNEY_STAGES.map((s, i) => (
        <div key={s} className={"jd-bar-seg" + (i <= idx ? " done" : "") + (i === idx ? " atual" : "")} title={STAGE_LABEL[s]} />
      ))}
    </div>
  );
}

export default function JornadaDrawer({ card, onClose, onMoved }: { card: JornadaCard; onClose: () => void; onMoved: () => void }) {
  const [det, setDet] = useState<PericiaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [stage, setStage] = useState<JourneyStage>(card.stage as JourneyStage);
  const [version, setVersion] = useState<number>(card.version);
  const [msg, setMsg] = useState("");
  const [novoPrazo, setNovoPrazo] = useState({ titulo: "", due_date: "" });
  const [, startT] = useTransition();

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    carregarDetalhePericia(card.id).then((d) => { if (vivo) { setDet(d); setCarregando(false); } });
    return () => { vivo = false; };
  }, [card.id]);

  // Avanços possíveis a partir da etapa atual (só os que a matriz permite pro médico).
  const proximos = JOURNEY_STAGES.filter((alvo) =>
    canTransition({ currentStage: stage, targetStage: alvo, eventType: ACAO_EVENTO[alvo] ?? "NOMINATION_CONFIRMED", actorType: "medico" }).allowed
  );

  async function recarregar() {
    const d = await carregarDetalhePericia(card.id); setDet(d);
  }

  async function addPrazo() {
    if (!novoPrazo.titulo || !novoPrazo.due_date) { setMsg("Preencha o tipo e a data do prazo."); return; }
    const r = await criarPrazoNaPericia({ periciaId: card.id, titulo: novoPrazo.titulo, due_date: novoPrazo.due_date });
    if (r && "error" in r) { setMsg("Não foi possível criar o prazo."); return; }
    setNovoPrazo({ titulo: "", due_date: "" }); setMsg(""); recarregar();
  }

  async function confirmarPrazo(id: string) {
    const r = await confirmarPrazoNaPericia(id);
    if (!(r && "error" in r)) recarregar();
  }

  async function avancar(alvo: JourneyStage) {
    setMsg("");
    const r = await moverPericia({
      periciaId: card.id, targetStage: alvo, expectedVersion: version,
      eventType: ACAO_EVENTO[alvo] ?? "NOMINATION_CONFIRMED", actorType: "medico",
    });
    if (r.error) {
      if (r.error === "VERSION_CONFLICT") setMsg("O card mudou em outra tela. Recarregue a página.");
      else setMsg("Não foi possível avançar: " + r.error);
      return;
    }
    setStage(r.stage as JourneyStage);
    setVersion(r.version ?? version + 1);
    // recarrega a timeline
    const d = await carregarDetalhePericia(card.id); setDet(d);
    onMoved();
  }

  return (
    <div className="jk-drawer-overlay" onClick={onClose}>
      <div className="jk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={"Perícia: " + card.titulo}>
        <div className="jk-drawer-head">
          <strong>{card.titulo}</strong>
          <button onClick={onClose} aria-label="Fechar" className="jk-x">×</button>
        </div>
        <div className="jk-drawer-body">
          {/* Barra visual da jornada */}
          <div className="jd-stage-atual">{STAGE_LABEL[stage]}</div>
          <JornadaBar stage={stage} />

          {/* Dados */}
          <div className="jd-section">
            {card.process_ref && <div className="jk-d-row"><span>Processo</span><b>{card.process_ref}</b></div>}
            {card.tribunal && <div className="jk-d-row"><span>Tribunal</span><b>{card.tribunal}</b></div>}
            {card.vara && <div className="jk-d-row"><span>Vara</span><b>{card.vara}</b></div>}
            {card.comarca && <div className="jk-d-row"><span>Comarca</span><b>{card.comarca}</b></div>}
            <div className="jk-d-row"><span>Data da perícia</span><b>{dataBR(card.scheduled_at)}</b></div>
            {card.segredo && <div className="jk-d-row"><span>Sigilo</span><b>🔒 Segredo de justiça</b></div>}
          </div>

          {/* Próxima ação — botões que movem o card (ato do médico) */}
          <div className="jd-section">
            <div className="jd-h">Próxima ação</div>
            {proximos.length === 0 && <p className="jk-d-note">Nenhuma ação disponível nesta etapa.</p>}
            <div className="jd-acoes">
              {proximos.map((alvo) => (
                <button key={alvo} className="jd-btn" onClick={() => startT(() => avancar(alvo))}>
                  {ACAO_LABEL[alvo] ?? STAGE_LABEL[alvo]} →
                </button>
              ))}
            </div>
            {msg && <div className="jd-msg">{msg}</div>}
            <p className="jk-d-note" style={{ marginTop: 8 }}>Atos com responsabilidade (aceitar, protocolar, encerrar) são confirmados por você. A AXIA registra cada passo.</p>
          </div>

          {carregando ? <p className="jk-d-note">Carregando detalhes…</p> : (
            <>
              {/* Prazos — ver, confirmar e adicionar */}
              <div className="jd-section">
                <div className="jd-h">Prazos</div>
                {det && det.prazos.length === 0 && <p className="jk-d-note" style={{ marginTop: 0 }}>Nenhum prazo registrado.</p>}
                {det?.prazos.map((p) => (
                  <div key={p.id} className="jd-prazo-row">
                    <div>
                      <div className="jd-prazo-tit">{p.titulo}</div>
                      <div className="jd-prazo-sub">{dataBR(p.due_date)} · {p.status === "confirmado" ? "confirmado" : p.status === "urgente" ? "urgente" : "a validar"}</div>
                    </div>
                    {p.status !== "confirmado" && (
                      <button className="jd-mini-btn" onClick={() => startT(() => confirmarPrazo(p.id))}>Confirmar</button>
                    )}
                  </div>
                ))}
                {/* Adicionar prazo */}
                <div className="jd-add-prazo">
                  <input placeholder="Tipo do prazo (ex.: laudo)" value={novoPrazo.titulo} onChange={(e) => setNovoPrazo({ ...novoPrazo, titulo: e.target.value })} />
                  <input type="date" value={novoPrazo.due_date} onChange={(e) => setNovoPrazo({ ...novoPrazo, due_date: e.target.value })} />
                  <button className="jd-mini-btn solid" onClick={() => startT(addPrazo)}>+ Prazo</button>
                </div>
              </div>

              {/* Quesitos */}
              {det && det.quesitos.length > 0 && (
                <div className="jd-section">
                  <div className="jd-h">Quesitos ({det.quesitos.filter(q=>q.respondido).length}/{det.quesitos.length} respondidos)</div>
                  {det.quesitos.map((q) => <div key={q.id} className="jd-quesito"><span className={q.respondido?"q-ok":"q-pend"}>{q.respondido?"✓":"○"}</span> <span>{q.origem} {q.numero ?? ""}: {q.texto.slice(0,80)}</span></div>)}
                </div>
              )}
              {/* Documentos */}
              {det && det.documentos.length > 0 && (
                <div className="jd-section">
                  <div className="jd-h">Documentos</div>
                  {det.documentos.map((d) => <div key={d.id} className="jk-d-row"><span>{d.tipo ?? "documento"} {d.segredo_justica ? "🔒" : ""}</span><b>{dataBR(d.created_at)}</b></div>)}
                </div>
              )}

              {/* Este processo — outras perícias e honorários (item 4: visão de processo) */}
              {det && (det.irmas.length > 0 || det.honorarios.length > 0) && (
                <div className="jd-section">
                  <div className="jd-h">Este processo</div>
                  {det.irmas.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Outras perícias deste processo</div>
                      {det.irmas.map((ir) => (
                        <div key={ir.id} className="jk-d-row"><span>{ir.titulo}</span><b>{STAGE_LABEL[ir.workflow_stage as JourneyStage] ?? "—"}</b></div>
                      ))}
                    </>
                  )}
                  {det.honorarios.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 6px" }}>Honorários</div>
                      {det.honorarios.map((h) => (
                        <div key={h.id} className="jk-d-row"><span>{h.status}</span><b>{formatBRL(h.amount_cents)}</b></div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Timeline auditável */}
              <div className="jd-section">
                <div className="jd-h">Linha do tempo</div>
                {det && det.timeline.length === 0 && <p className="jk-d-note">Ainda sem eventos registrados.</p>}
                <div className="jd-timeline">
                  {det?.timeline.map((e: TimelineEvento) => (
                    <div key={e.id} className="jd-tl-item">
                      <div className="jd-tl-dot" />
                      <div>
                        <div className="jd-tl-tit">{EVENTO_LABEL[e.event_type] ?? e.event_type}</div>
                        <div className="jd-tl-sub">
                          {dataHora(e.event_at)} · {ORIGEM_LABEL[e.origem ?? "manual"] ?? e.origem}
                          {e.human_confirmed ? " · confirmado por você" : " · pela AXIA"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
