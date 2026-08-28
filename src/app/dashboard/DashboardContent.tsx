"use client";
import { useState, useTransition } from "react";
import { formatBRL } from "@/lib/plans";
import { validateCommunication } from "./actions";
import { Ico } from "../AppShell";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean }
interface Pericia { id: string; titulo: string; local: string | null; process_ref: string | null; scheduled_at: string }
interface Prazo { id: string; titulo: string; process_ref: string | null; due_date: string; status: string }
interface Honorario { id: string; process_ref: string | null; amount_cents: number; status: string }

const CAT: Record<string, { label: string; tag: string; f: string }> = {
  nomeacao: { label: "Nova nomeação", tag: "t-nom", f: "nom" },
  prazo: { label: "Prazo", tag: "t-prz", f: "prz" },
  intimacao: { label: "Intimação", tag: "t-int", f: "int" },
  honorarios: { label: "Honorários", tag: "t-hon", f: "hon" },
  pericia: { label: "Perícia", tag: "t-per", f: "per" },
  esclarecimento: { label: "Esclarecimento", tag: "t-esc", f: "esc" },
};
const FILTERS = [["all", "Tudo"], ["nom", "Nomeações"], ["prz", "Prazos"], ["per", "Perícias"], ["hon", "Honorários"], ["int", "Intimações"]];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function ago(iso: string) { const d = (Date.now() - new Date(iso).getTime()) / 3600_000; if (d < 1) return "agora"; if (d < 24) return `há ${Math.round(d)}h`; if (d < 48) return "ontem"; return `${Math.round(d / 24)} dias`; }
function dm(iso: string) { const d = new Date(iso); return { d: String(d.getDate()).padStart(2, "0"), m: MES[d.getMonth()] }; }

export default function DashboardContent({ nome, pastDue, comms, pericias, prazos, honorarios }:
  { nome: string; pastDue: boolean; comms: Comm[]; pericias: Pericia[]; prazos: Prazo[]; honorarios: Honorario[] }) {

  const [filter, setFilter] = useState("all");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const nomeacoes = comms.filter((c) => c.category === "nomeacao");
  const aguardando = nomeacoes.filter((c) => !c.validated && !done.has(c.id)).length;
  const urgentes = prazos.filter((p) => p.status === "urgente");
  const receber = honorarios.filter((h) => h.status !== "recebido").reduce((s, h) => s + h.amount_cents, 0);
  const somaStatus = (st: string) => honorarios.filter((h) => h.status === st).reduce((s, h) => s + h.amount_cents, 0);

  function validar(id: string) { setDone((d) => new Set(d).add(id)); startTransition(() => { validateCommunication(id); }); }
  const shown = comms.filter((c) => filter === "all" || CAT[c.category]?.f === filter);

  return (
    <>
      {pastDue && <div className="attn" style={{ marginBottom: 20 }}><span className="at-ic"><Ico p="alert" /></span><div className="at-txt"><h4>Precisamos atualizar sua assinatura</h4><p>Seu pagamento está pendente. Atualize para manter o acesso.</p></div><div className="at-items"><span className="at-pill">Assinatura vencida <button className="btn-mini">Atualizar pagamento</button></span></div></div>}

      <div className="greet">
        <div>
          <h1>Bom dia, Dr. {nome}.</h1>
          <p className="sum"><svg width="15" height="15" fill="none" stroke="#1FA89E" strokeWidth={2}><path d="M2 7.5l3.5 3.5L13 3" strokeLinecap="round" strokeLinejoin="round" /></svg>A AXIA analisou <b>{comms.length} comunicações</b> — <b>{aguardando + urgentes.length}</b> exigem sua atenção.</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-ghost">Ver análise completa</button>
          <button className="btn btn-primary"><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Nova perícia</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="ki ki-navy"><Ico p="shield" s={20} /></div><div className="kn">{nomeacoes.length}</div><div className="kl">Novas nomeações</div><div className="kt up">{aguardando} aguardando validação</div></div>
        <div className="kpi"><div className="ki ki-teal"><Ico p="clock" s={20} /></div><div className="kn">{prazos.length}</div><div className="kl">Prazos monitorados</div><div className="kt warn">{urgentes.length} urgente(s)</div></div>
        <div className="kpi"><div className="ki ki-blue"><Ico p="cal" s={20} /></div><div className="kn">{pericias.length}</div><div className="kl">Perícias agendadas</div><div className="kt up">{pericias.length ? "próxima em " + dm(pericias[0].scheduled_at).d + "/" + dm(pericias[0].scheduled_at).m : "—"}</div></div>
        <div className="kpi"><div className="ki ki-gold"><Ico p="wallet" s={20} /></div><div className="kn">{formatBRL(receber)}</div><div className="kl">Honorários a receber</div><div className="kt warn">{honorarios.filter(h => h.status !== "recebido").length} pendente(s)</div></div>
      </div>

      {(urgentes.length > 0 || aguardando > 0) && (
        <div className="attn">
          <span className="at-ic"><Ico p="alert" /></span>
          <div className="at-txt"><h4>Precisa da sua atenção</h4><p>Itens críticos identificados pela AXIA que dependem de você.</p></div>
          <div className="at-items">
            {urgentes.length > 0 && <span className="at-pill">Prazo vence amanhã <button className="btn-mini">Ver prazo</button></span>}
            {aguardando > 0 && <span className="at-pill">{aguardando} nomeação(ões) para validar <button className="btn-mini" onClick={() => setFilter("nom")}>Validar</button></span>}
          </div>
        </div>
      )}

      <div className="split">
        <section className="panel">
          <div className="panel-h"><h3>Inbox inteligente</h3><a href="/inbox">Ver tudo</a></div>
          <div className="filters">
            {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
          </div>
          <div className="inbox">
            {shown.length === 0 && <div style={{ padding: "28px 22px", color: "#6B7C93", fontSize: 14 }}>Nenhuma comunicação nesta categoria.</div>}
            {shown.slice(0, 6).map((c) => {
              const meta = CAT[c.category] ?? { label: c.category, tag: "t-esc", f: "esc" };
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
                    {c.category === "nomeacao"
                      ? <button className="btn-act solid" onClick={() => validar(c.id)}>{isDone ? "Validado ✓" : "Validar"}</button>
                      : <button className="btn-act">Ver</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="rail">
          <section className="panel">
            <div className="panel-h"><h3>Próximas perícias</h3><a href="#">Agenda</a></div>
            <div className="mini">
              {pericias.length === 0 && <div style={{ padding: "18px 22px", color: "#6B7C93", fontSize: 13.5 }}>Sem perícias agendadas.</div>}
              {pericias.map((p) => { const b = dm(p.scheduled_at); return (
                <div className="row" key={p.id}><div className="date-badge"><span className="d">{b.d}</span><span className="m">{b.m}</span></div><div className="info"><div className="t">{p.titulo}</div><div className="s">{p.local} · Proc. {p.process_ref}</div></div></div>
              ); })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h3>Prazos monitorados</h3><a href="#">Ver todos</a></div>
            <div className="mini">
              {prazos.map((p) => { const b = dm(p.due_date + "T00:00:00");
                const st = p.status === "urgente" ? ["st-urg", "Urgente"] : p.status === "confirmado" ? ["st-ok", "Confirmado"] : ["st-val", "A validar"];
                return (
                  <div className="row" key={p.id}><div className="date-badge"><span className="d">{b.d}</span><span className="m">{b.m}</span></div><div className="info"><div className="t">{p.titulo}</div><div className="s">Proc. {p.process_ref}</div></div><span className={"st " + st[0]}>{st[1]}</span></div>
                ); })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h3>Honorários</h3><a href="#">Detalhar</a></div>
            <div className="hon-total"><div><div className="lbl">A receber</div></div><div className="v">{formatBRL(receber)}</div></div>
            <div className="flow-mini">
              {[["Proposto", "proposto"], ["Aprovado", "aprovado"], ["Depositado", "depositado"], ["Recebido", "recebido"]].map(([l, k]) => {
                const v = somaStatus(k);
                return <div className={"fstep" + (v > 0 ? " on" : "")} key={k}><div className="dotf" /><div className="fl">{l}</div><div className="fv">{formatBRL(v)}</div></div>;
              })}
            </div>
            <div className="hon-list">
              {honorarios.map((h) => (
                <div className="hrow" key={h.id}><span className="pc">Proc. {h.process_ref} · {h.status}</span><span className="am">{formatBRL(h.amount_cents)}</span></div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
