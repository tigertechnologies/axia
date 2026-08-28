"use client";
import { useState, useTransition } from "react";
import { formatBRL } from "@/lib/plans";
import { validateCommunication, signOut } from "./actions";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean }
interface Pericia { id: string; titulo: string; local: string | null; process_ref: string | null; scheduled_at: string }
interface Prazo { id: string; titulo: string; process_ref: string | null; due_date: string; status: string }
interface Honorario { id: string; process_ref: string | null; amount_cents: number; status: string }

const CAT: Record<string, { label: string; tag: string; f: string }> = {
  nomeacao:       { label: "Nova nomeação", tag: "t-nom", f: "nom" },
  prazo:          { label: "Prazo", tag: "t-prz", f: "prz" },
  intimacao:      { label: "Intimação", tag: "t-int", f: "int" },
  honorarios:     { label: "Honorários", tag: "t-hon", f: "hon" },
  pericia:        { label: "Perícia", tag: "t-per", f: "per" },
  esclarecimento: { label: "Esclarecimento", tag: "t-esc", f: "esc" },
};

const FILTERS = [["all", "Tudo"], ["nom", "Nomeações"], ["prz", "Prazos"], ["per", "Perícias"], ["hon", "Honorários"], ["int", "Intimações"]];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function ago(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (diff < 1) return "agora";
  if (diff < 24) return `há ${Math.round(diff)}h`;
  if (diff < 48) return "ontem";
  return `${Math.round(diff / 24)} dias`;
}
function dm(iso: string) { const d = new Date(iso); return { d: String(d.getDate()).padStart(2, "0"), m: MES[d.getMonth()] }; }

export default function DashboardShell({ nome, planId, pastDue, comms, pericias, prazos, honorarios }:
  { nome: string; planId: string | null; pastDue: boolean; comms: Comm[]; pericias: Pericia[]; prazos: Prazo[]; honorarios: Honorario[] }) {

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const nomeacoes = comms.filter((c) => c.category === "nomeacao");
  const aguardando = nomeacoes.filter((c) => !c.validated && !done.has(c.id)).length;
  const urgentes = prazos.filter((p) => p.status === "urgente");
  const receber = honorarios.filter((h) => h.status !== "recebido").reduce((s, h) => s + h.amount_cents, 0);
  const somaStatus = (st: string) => honorarios.filter((h) => h.status === st).reduce((s, h) => s + h.amount_cents, 0);
  const planLabel = planId ? "Plano " + (planId.split("_")[0][0].toUpperCase() + planId.split("_")[0].slice(1)) : "AXIA";

  function validar(id: string) {
    setDone((d) => new Set(d).add(id));
    startTransition(() => { validateCommunication(id); });
  }

  const shown = comms.filter((c) => filter === "all" || CAT[c.category]?.f === filter);

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div className="sb-brand">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none"><path d="M8 33 L20 8 L28 24" stroke="#A8C4E0" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /><path d="M20 22 L31 33" stroke="#1FA89E" strokeWidth={2.6} strokeLinecap="round" /><circle cx="20" cy="22" r="4" fill="#10233F" stroke="#A8C4E0" strokeWidth={2.4} /></svg>
          <span className="word">AXIA</span>
        </div>
        <nav className="sb-nav">
          <div className="sb-item active"><Ico p="dash" />Dashboard</div>
          <div className="sb-item"><Ico p="inbox" />Inbox{comms.length > 0 && <span className="count">{comms.length}</span>}</div>
          <div className="sb-sec">Perícias</div>
          <div className="sb-item"><Ico p="shield" />Nomeações{nomeacoes.length > 0 && <span className="count">{nomeacoes.length}</span>}</div>
          <div className="sb-item"><Ico p="clock" />Prazos{prazos.length > 0 && <span className="count gray">{prazos.length}</span>}</div>
          <div className="sb-item"><Ico p="cal" />Perícias{pericias.length > 0 && <span className="count gray">{pericias.length}</span>}</div>
          <div className="sb-item"><Ico p="doc" />Processos</div>
          <div className="sb-item"><Ico p="wallet" />Honorários</div>
          <div className="sb-item"><Ico p="agenda" />Agenda</div>
          <div className="sb-sec">Conta</div>
          <div className="sb-item" onClick={() => startTransition(() => { signOut(); })} style={{ cursor: "pointer" }}><Ico p="gear" />Sair</div>
        </nav>
        <div className="sb-user">
          <div className="avatar">{nome.slice(0, 2).toUpperCase()}</div>
          <div><div className="nm">Dr. {nome}</div><div className="rl">{planLabel}</div></div>
        </div>
      </aside>
      <div className={"overlay" + (open ? " show" : "")} onClick={() => setOpen(false)} />

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <button className="hamb" onClick={() => setOpen(true)} aria-label="Menu"><svg width="24" height="24" fill="none" stroke="#16305B" strokeWidth={2}><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" /></svg></button>
          <div className="search">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7.5" cy="7.5" r="5.5" /><path d="M15 15l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar processo, parte, comunicação…" />
          </div>
          <div className="top-right">
            <span className="mbox"><span className="lv" />Gmail conectado</span>
            <button className="ico-btn" aria-label="Alertas"><svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M9.5 2.5c-2.6 0-4.3 1.9-4.3 4.4 0 3.6-1.2 4.7-1.2 4.7h11s-1.2-1.1-1.2-4.7c0-2.5-1.7-4.4-4.3-4.4z" strokeLinejoin="round" /><path d="M8 15a1.6 1.6 0 003 0" strokeLinecap="round" /></svg>{(aguardando + urgentes.length) > 0 && <span className="badge">{aguardando + urgentes.length}</span>}</button>
          </div>
        </div>

        <div className="content">
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

          {/* KPIs */}
          <div className="kpis">
            <div className="kpi"><div className="ki ki-navy"><Ico p="shield" s={20} /></div><div className="kn">{nomeacoes.length}</div><div className="kl">Novas nomeações</div><div className="kt up">{aguardando} aguardando validação</div></div>
            <div className="kpi"><div className="ki ki-teal"><Ico p="clock" s={20} /></div><div className="kn">{prazos.length}</div><div className="kl">Prazos monitorados</div><div className="kt warn">{urgentes.length} urgente(s)</div></div>
            <div className="kpi"><div className="ki ki-blue"><Ico p="cal" s={20} /></div><div className="kn">{pericias.length}</div><div className="kl">Perícias agendadas</div><div className="kt up">{pericias.length ? "próxima em " + dm(pericias[0].scheduled_at).d + "/" + dm(pericias[0].scheduled_at).m : "—"}</div></div>
            <div className="kpi"><div className="ki ki-gold"><Ico p="wallet" s={20} /></div><div className="kn">{formatBRL(receber)}</div><div className="kl">Honorários a receber</div><div className="kt warn">{honorarios.filter(h => h.status !== "recebido").length} pendente(s)</div></div>
          </div>

          {/* ATTENTION */}
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

          {/* SPLIT */}
          <div className="split">
            {/* INBOX */}
            <section className="panel">
              <div className="panel-h"><h3>Inbox inteligente</h3><a href="#">Ver tudo</a></div>
              <div className="filters">
                {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
              </div>
              <div className="inbox">
                {shown.length === 0 && <div style={{ padding: "28px 22px", color: "#6B7C93", fontSize: 14 }}>Nenhuma comunicação nesta categoria.</div>}
                {shown.map((c) => {
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

            {/* RAIL */}
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
        </div>
      </div>
    </div>
  );
}

// ── ícones ──────────────────────────────────────────────────
function Ico({ p, s = 19 }: { p: string; s?: number }) {
  const c: Record<string, React.ReactNode> = {
    dash: <><rect x="2" y="2" width="6.5" height="6.5" rx="1.5" /><rect x="10.5" y="2" width="6.5" height="6.5" rx="1.5" /><rect x="2" y="10.5" width="6.5" height="6.5" rx="1.5" /><rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" /></>,
    inbox: <><path d="M2.5 5.5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-10a2 2 0 01-2-2z" /><path d="M3 5.5l6.5 5 6.5-5" strokeLinecap="round" /></>,
    nomeacao: <path d="M9 1.5l6.5 3v4c0 3.6-2.6 5.8-6.5 7-3.9-1.2-6.5-3.4-6.5-7v-4l6.5-3z" strokeLinejoin="round" />,
    shield: <path d="M9.5 2l6.5 3.2v4.3c0 3.8-2.7 6.2-6.5 7.5C5.7 15.7 3 13.3 3 9.5V5.2L9.5 2z" strokeLinejoin="round" />,
    prazo: <><circle cx="9" cy="9.5" r="7" /><path d="M9 5.5v4.2l2.8 1.7" strokeLinecap="round" /></>,
    clock: <><circle cx="9.5" cy="9.7" r="7" /><path d="M9.5 5.5v4.4l3 1.8" strokeLinecap="round" /></>,
    pericia: <><rect x="2" y="4" width="14" height="12" rx="2" /><path d="M2 8h14M6 2v3M12 2v3" strokeLinecap="round" /></>,
    cal: <><rect x="2.5" y="4" width="14" height="12.5" rx="2" /><path d="M2.5 8h14M6.5 2v3M12.5 2v3" strokeLinecap="round" /></>,
    doc: <><path d="M4 2.5h8l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1v-13a1 1 0 011-1z" strokeLinejoin="round" /><path d="M6 9h7M6 12h7M6 6h3" strokeLinecap="round" /></>,
    honorarios: <><rect x="2" y="4.5" width="14" height="9" rx="2" /><path d="M2 8h14M12.5 11h1.3" strokeLinecap="round" /></>,
    wallet: <><rect x="2" y="5" width="16" height="10" rx="2" /><path d="M2 9h16M14 12h1.5" strokeLinecap="round" /></>,
    agenda: <><rect x="2.5" y="3.5" width="14" height="13" rx="2" /><path d="M2.5 7.5h14M6 1.8v3M13 1.8v3" strokeLinecap="round" /></>,
    intimacao: <><path d="M2.5 5a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2h-9a2 2 0 01-2-2z" /><path d="M3 5l6 4.5L15 5" strokeLinecap="round" /></>,
    esclarecimento: <path d="M2.5 4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115.5 4v6A1.5 1.5 0 0114 11.5H6l-3.5 3V4z" strokeLinejoin="round" />,
    gear: <><circle cx="9.5" cy="9.5" r="2.6" /><path d="M9.5 1.5v2M9.5 15.5v2M1.5 9.5h2M15.5 9.5h2" strokeLinecap="round" /></>,
    alert: <><path d="M11 2l9 16H2L11 2z" strokeLinejoin="round" /><path d="M11 8v4M11 15h.01" strokeLinecap="round" /></>,
  };
  return <svg width={s} height={s} viewBox={`0 0 ${p === "alert" ? 22 : 19} ${p === "alert" ? 20 : 19}`} fill="none" stroke="currentColor" strokeWidth={1.7}>{c[p] ?? c.esclarecimento}</svg>;
}
