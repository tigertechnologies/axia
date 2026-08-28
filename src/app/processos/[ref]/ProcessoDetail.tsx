"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/plans";
import { validateCommunication } from "../../dashboard/actions";
import { Ico } from "../../AppShell";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean }
interface Pericia { id: string; titulo: string; local: string | null; process_ref: string | null; scheduled_at: string }
interface Prazo { id: string; titulo: string; process_ref: string | null; due_date: string; status: string }
interface Honorario { id: string; process_ref: string | null; amount_cents: number; status: string }

const CAT: Record<string, { label: string; tag: string }> = {
  nomeacao: { label: "Nova nomeação", tag: "t-nom" }, prazo: { label: "Prazo", tag: "t-prz" },
  intimacao: { label: "Intimação", tag: "t-int" }, honorarios: { label: "Honorários", tag: "t-hon" },
  pericia: { label: "Perícia", tag: "t-per" }, esclarecimento: { label: "Esclarecimento", tag: "t-esc" },
};
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function ago(iso: string) { const d = (Date.now() - new Date(iso).getTime()) / 3600_000; if (d < 1) return "agora"; if (d < 24) return `há ${Math.round(d)}h`; if (d < 48) return "ontem"; return `${Math.round(d / 24)} dias`; }
function dm(iso: string) { const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso); return { d: String(d.getDate()).padStart(2, "0"), m: MES[d.getMonth()] }; }

export default function ProcessoDetail({ refNum, vara, comms, prazos, pericias, honorarios }:
  { refNum: string; vara: string | null; comms: Comm[]; prazos: Prazo[]; pericias: Pericia[]; honorarios: Honorario[] }) {

  const [done, setDone] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  function validar(id: string) { setDone((d) => new Set(d).add(id)); startTransition(() => { validateCommunication(id); }); }

  const totalHon = honorarios.reduce((s, h) => s + h.amount_cents, 0);

  return (
    <>
      <Link href="/processos" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#4A6FA5", fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13.5, marginBottom: 14 }}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 3l-5 5 5 5M4 8h9" strokeLinecap="round" strokeLinejoin="round" /></svg>Processos
      </Link>

      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Processo {refNum}</h1>
          <p className="sum"><Ico p="doc" s={15} />{vara ?? "Origem não identificada"}</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-ghost">Exportar</button>
          <button className="btn btn-primary">Abrir no tribunal</button>
        </div>
      </div>

      {/* resumo */}
      <div className="kpis" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="ki ki-navy"><Ico p="inbox" s={20} /></div><div className="kn">{comms.length}</div><div className="kl">Comunicações</div></div>
        <div className="kpi"><div className="ki ki-teal"><Ico p="clock" s={20} /></div><div className="kn">{prazos.length}</div><div className="kl">Prazos</div></div>
        <div className="kpi"><div className="ki ki-blue"><Ico p="cal" s={20} /></div><div className="kn">{pericias.length}</div><div className="kl">Perícias</div></div>
        <div className="kpi"><div className="ki ki-gold"><Ico p="wallet" s={20} /></div><div className="kn" style={{ fontSize: 24 }}>{formatBRL(totalHon)}</div><div className="kl">Honorários</div></div>
      </div>

      <div className="split">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {comms.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h3>Comunicações</h3></div>
              <div className="inbox">
                {comms.map((c) => {
                  const meta = CAT[c.category] ?? { label: c.category, tag: "t-esc" };
                  const isDone = c.validated || done.has(c.id);
                  return (
                    <div className={"item" + (isDone ? " done" : "")} key={c.id}>
                      <span className={"cat-ic " + meta.tag}><Ico p={c.category} s={18} /></span>
                      <div className="body">
                        <div className="r1"><span className={"tag " + meta.tag}>{meta.label}</span><span className="from">{c.sender}</span></div>
                        <div className="subj">{c.subject}</div>
                        {c.snippet && <div className="meta">{c.snippet}</div>}
                      </div>
                      <div className="act">
                        <span className="time">{ago(c.received_at)}</span>
                        {c.category === "nomeacao" && <button className="btn-act solid" onClick={() => validar(c.id)}>{isDone ? "Validado ✓" : "Validar"}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {pericias.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h3>Perícias</h3></div>
              <div className="mini">
                {pericias.map((p) => { const b = dm(p.scheduled_at); return (
                  <div className="row" key={p.id}><div className="date-badge"><span className="d">{b.d}</span><span className="m">{b.m}</span></div><div className="info"><div className="t">{p.titulo}</div><div className="s">{p.local}</div></div></div>
                ); })}
              </div>
            </section>
          )}
        </div>

        <div className="rail">
          {prazos.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h3>Prazos</h3></div>
              <div className="mini">
                {prazos.map((p) => { const b = dm(p.due_date);
                  const st = p.status === "urgente" ? ["st-urg", "Urgente"] : p.status === "confirmado" ? ["st-ok", "Confirmado"] : ["st-val", "A validar"];
                  return (<div className="row" key={p.id}><div className="date-badge"><span className="d">{b.d}</span><span className="m">{b.m}</span></div><div className="info"><div className="t">{p.titulo}</div></div><span className={"st " + st[0]}>{st[1]}</span></div>); })}
              </div>
            </section>
          )}

          {honorarios.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h3>Honorários</h3></div>
              <div className="hon-list">
                {honorarios.map((h) => (
                  <div className="hrow" key={h.id}><span className="pc">{h.status}</span><span className="am">{formatBRL(h.amount_cents)}</span></div>
                ))}
                <div className="hrow" style={{ borderTop: "1px solid #E6EBF2", marginTop: 4 }}><span className="pc" style={{ fontWeight: 600 }}>Total</span><span className="am">{formatBRL(totalHon)}</span></div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
