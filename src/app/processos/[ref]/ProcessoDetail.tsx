"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/plans";
import { validateCommunication } from "../../dashboard/actions";
import { Ico } from "../../AppShell";
import Toast from "../../Toast";
import { STAGE_LABEL, type JourneyStage } from "@/modules/journey/domain/stateMachine";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean }
interface Pericia { id: string; titulo: string; local: string | null; process_ref: string | null; scheduled_at: string; workflow_stage?: string | null }
interface Prazo { id: string; titulo: string; process_ref: string | null; due_date: string; status: string }
interface Honorario { id: string; process_ref: string | null; amount_cents: number; status: string }
interface Documento { id: string; tipo: string | null; nome_original: string | null; created_at: string; segredo_justica: boolean; pericia_id: string }
interface Quesito { id: string; origem: string; numero: number | null; texto: string; respondido: boolean; pericia_id: string }
interface Evento { id: string; event_type: string; origem: string | null; ator: string | null; event_at: string; human_confirmed: boolean; pericia_id: string }
interface CalculoS { id: string; tipo: string; titulo: string; resumo_texto: string | null; created_at: string }

const CAT: Record<string, { label: string; tag: string }> = {
  nomeacao: { label: "Nomeação", tag: "t-nom" }, prazo: { label: "Prazo", tag: "t-prz" },
  pericia: { label: "Perícia", tag: "t-per" }, honorarios: { label: "Honorários", tag: "t-hon" },
  intimacao: { label: "Intimação", tag: "t-int" }, esclarecimento: { label: "Esclarecimento", tag: "t-esc" },
};
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }
function dataHora(iso: string) { const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

type Aba = "visao" | "timeline" | "documentos" | "quesitos" | "pericias" | "laudo" | "financeiro" | "atividades";

const EVENTO_LABEL: Record<string, string> = {
  COMMUNICATION_RECEIVED: "Comunicação recebida", NOMINATION_CONFIRMED: "Dados confirmados",
  ENGAGEMENT_ACCEPTED: "Encargo aceito", DEADLINE_CONFIRMED: "Prazo confirmado", DEADLINE_EXTRACTED: "Prazo detectado",
  APPOINTMENT_SCHEDULED: "Perícia agendada", EXAM_COMPLETED: "Perícia realizada",
  REPORT_STARTED: "Laudo iniciado", REPORT_VALIDATED: "Laudo validado",
  PROTOCOL_CONFIRMED: "Protocolo confirmado", CLARIFICATION_REQUESTED: "Esclarecimentos",
  CASE_FINISHED: "Encerrada", CASE_REOPENED: "Reaberta",
};
const QUES_ORIGEM: Record<string, string> = { juizo: "Juízo", autor: "Autor", reu: "Réu", complementar: "Complementar" };

export default function ProcessoDetail({ refNum, vara, comms, prazos, pericias, honorarios, documentos, quesitos, eventos, calculos }:
  { refNum: string; vara: string | null; comms: Comm[]; prazos: Prazo[]; pericias: Pericia[]; honorarios: Honorario[]; documentos: Documento[]; quesitos: Quesito[]; eventos: Evento[]; calculos: CalculoS[] }) {
  const [aba, setAba] = useState<Aba>("visao");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();
  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 3500); }
  async function validar(id: string) { setDone((d) => new Set(d).add(id)); const r = await validateCommunication(id); if (r && "error" in r) { setDone((d) => { const n = new Set(d); n.delete(id); return n; }); flash("Não foi possível validar."); } }

  const totalHon = honorarios.reduce((s, h) => s + h.amount_cents, 0);
  const recebido = honorarios.filter((h) => h.status === "pago" || h.status === "recebido").reduce((s, h) => s + h.amount_cents, 0);

  function exportarCSV() {
    const linhas: string[] = []; const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    linhas.push(`Processo,${esc(refNum)}`); if (vara) linhas.push(`Vara,${esc(vara)}`); linhas.push("");
    linhas.push("Tipo,Descrição,Data,Status");
    comms.forEach((c) => linhas.push(["Comunicação", esc(c.subject), esc(c.received_at), esc(c.validated ? "Validada" : "Pendente")].join(",")));
    pericias.forEach((p) => linhas.push(["Perícia", esc(p.titulo), esc(p.scheduled_at), esc(p.workflow_stage ?? "")].join(",")));
    prazos.forEach((p) => linhas.push(["Prazo", esc(p.titulo), esc(p.due_date), esc(p.status)].join(",")));
    honorarios.forEach((h) => linhas.push(["Honorário", esc(formatBRL(h.amount_cents)), "", esc(h.status)].join(",")));
    const blob = new Blob(["\uFEFF" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `processo-${refNum.replace(/[^\w.-]/g, "_")}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 12 }}>
        <div>
          <Link href="/jornada" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>← Jornada</Link>
          <h1 style={{ marginTop: 4 }}>Processo {refNum}</h1>
          <p className="sum">{vara ?? "Processo judicial"} · {pericias.length} perícia(s) · {comms.length} comunicação(ões)</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-ghost" onClick={exportarCSV}>Exportar CSV</button>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
        {([["visao","Visão geral"],["timeline","Timeline"],["documentos","Documentos"],["quesitos","Quesitos"],["pericias","Perícia"],["laudo","Laudo"],["financeiro","Financeiro"],["atividades","Atividades"]] as [Aba,string][]).map(([id,l]) => (
          <button key={id} onClick={() => setAba(id)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: aba === id ? 700 : 500, color: aba === id ? "var(--ink)" : "var(--muted)", borderBottom: aba === id ? "2px solid #1FA89E" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
        ))}
      </div>

      {aba === "visao" && (
        <div className="kpis" style={{ marginBottom: 8 }}>
          <div className="kpi"><div className="kn">{pericias.length}</div><div className="kl">Perícias</div></div>
          <div className="kpi"><div className="kn">{prazos.length}</div><div className="kl">Prazos</div></div>
          <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(totalHon)}</div><div className="kl">Honorários</div></div>
          <div className="kpi"><div className="kn">{comms.filter((c) => !c.validated).length}</div><div className="kl">A validar</div></div>
        </div>
      )}


      {aba === "timeline" && (
        <section className="panel">
          <div className="panel-h"><h3>Linha do tempo do processo</h3></div>
          {eventos.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum evento registrado ainda.</p>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eventos.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "#1FA89E", marginTop: 4, flex: "0 0 auto" }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{EVENTO_LABEL[e.event_type] ?? e.event_type}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{dataHora(e.event_at)} · {e.origem ?? "manual"}{e.human_confirmed ? " · confirmado" : " · pela AXIA"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {aba === "documentos" && (
        <section className="panel">
          <div className="panel-h"><h3>Documentos do processo</h3></div>
          {documentos.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum documento anexado. Anexe no painel da perícia (na Jornada).</p>}
          {documentos.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
              <span style={{ color: "var(--ink)" }}>📎 {d.nome_original ?? d.tipo ?? "documento"} {d.segredo_justica ? "🔒" : ""}</span>
              <span style={{ color: "var(--muted)" }}>{dataBR(d.created_at)}</span>
            </div>
          ))}
        </section>
      )}

      {aba === "quesitos" && (
        <section className="panel">
          <div className="panel-h"><h3>Quesitos ({quesitos.filter(q=>q.respondido).length}/{quesitos.length} respondidos)</h3></div>
          {quesitos.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum quesito cadastrado. Cadastre no painel da perícia (na Jornada).</p>}
          {quesitos.map((q) => (
            <div key={q.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span style={{ color: q.respondido ? "#0F7A70" : "var(--muted)", fontWeight: 700 }}>{q.respondido ? "✓" : "○"}</span>
              <span style={{ color: "var(--ink)" }}><b>{QUES_ORIGEM[q.origem] ?? q.origem} {q.numero ?? ""}</b>: {q.texto}</span>
            </div>
          ))}
        </section>
      )}

      {aba === "pericias" && (
        <section className="panel">
          <div className="panel-h"><h3>Perícias deste processo</h3></div>
          {pericias.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhuma perícia.</p>}
          {pericias.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.titulo}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{dataBR(p.scheduled_at)}{p.local ? " · " + p.local : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.workflow_stage && <span className="st st-val">{STAGE_LABEL[p.workflow_stage as JourneyStage] ?? p.workflow_stage}</span>}
                <Link className="btn-act" href={`/laudos/${p.id}`}>Laudo</Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {aba === "laudo" && (
        <section className="panel">
          <div className="panel-h"><h3>Laudos</h3></div>
          {pericias.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Sem perícias para elaborar laudo.</p>}
          {pericias.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.titulo}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.workflow_stage ? (STAGE_LABEL[p.workflow_stage as JourneyStage] ?? p.workflow_stage) : "—"}</div>
              </div>
              <Link className="btn-act solid" href={`/laudos/${p.id}`}>Abrir laudo</Link>
            </div>
          ))}
        </section>
      )}

      {aba === "financeiro" && (
        <section className="panel">
          <div className="panel-h"><h3>Financeiro do processo</h3></div>
          <div className="kpis" style={{ marginBottom: 12 }}>
            <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(totalHon)}</div><div className="kl">Total</div></div>
            <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(recebido)}</div><div className="kl">Recebido</div></div>
            <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(totalHon - recebido)}</div><div className="kl">A receber</div></div>
          </div>
          {honorarios.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
              <span style={{ color: "var(--muted)" }}>{h.status}</span><b style={{ color: "var(--ink)" }}>{formatBRL(h.amount_cents)}</b>
            </div>
          ))}
          {honorarios.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum honorário registrado.</p>}

          <div className="panel-h" style={{ marginTop: 18 }}><h3>Cálculos salvos</h3></div>
          {calculos.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum cálculo salvo. Faça um cálculo em Cálculos e clique em "Salvar no processo".</p>}
          {calculos.map((c) => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>🧮 {c.titulo}</div>
              {c.resumo_texto && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{c.resumo_texto}</div>}
            </div>
          ))}
        </section>
      )}

      {aba === "atividades" && (
        <section className="panel">
          <div className="panel-h"><h3>Comunicações e prazos</h3></div>
          {comms.map((c) => {
            const cat = CAT[c.category] ?? { label: c.category, tag: "t-int" };
            const isDone = done.has(c.id) || c.validated;
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                <div>
                  <span className={"tag " + cat.tag} style={{ fontSize: 11 }}>{cat.label}</span>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{c.subject}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{dataHora(c.received_at)}</div>
                </div>
                {c.category === "nomeacao" && <button className="btn-act solid" onClick={() => startTransition(() => validar(c.id))}>{isDone ? "Validado ✓" : "Validar"}</button>}
              </div>
            );
          })}
          {prazos.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
              <span style={{ color: "var(--ink)" }}>⏳ {p.titulo}</span><b style={{ color: "var(--muted)" }}>{dataBR(p.due_date)} · {p.status}</b>
            </div>
          ))}
          {comms.length === 0 && prazos.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Sem atividades.</p>}
        </section>
      )}

      <Toast msg={toast} />
    </>
  );
}
