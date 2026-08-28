"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setPrazoStatus } from "../actions/state";
import { Ico } from "../AppShell";

interface Prazo { id: string; titulo: string; process_ref: string | null; due_date: string; status: string }

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const FILTERS = [["all", "Todos"], ["urgente", "Urgentes"], ["a_validar", "A validar"], ["confirmado", "Confirmados"]];
function dm(iso: string) { const d = new Date(iso); return { d: String(d.getDate()).padStart(2, "0"), m: MES[d.getMonth()] }; }
function diasRestantes(due: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  return Math.round((d.getTime() - hoje.getTime()) / 86400_000);
}
function venc(due: string) {
  const n = diasRestantes(due);
  if (n < 0) return `vencido há ${Math.abs(n)} dia(s)`;
  if (n === 0) return "vence hoje";
  if (n === 1) return "vence amanhã";
  return `vence em ${n} dias`;
}
const ST: Record<string, [string, string]> = {
  urgente: ["st-urg", "Urgente"], confirmado: ["st-ok", "Confirmado"], a_validar: ["st-val", "A validar"],
};

export default function PrazosClient({ prazos }: { prazos: Prazo[] }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<Record<string,string>>({});
  const [, startTransition] = useTransition();
  const eff = (p: Prazo) => over[p.id] ?? p.status;
  function confirmar(id: string){ setOver(o=>({...o,[id]:"confirmado"})); startTransition(()=>{ setPrazoStatus(id,"confirmado"); }); }

  const shown = prazos.filter((p) => {
    const okF = filter === "all" || eff(p) === filter;
    const okQ = !q || (p.titulo + " " + (p.process_ref ?? "")).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });
  const urgentes = prazos.filter((p) => p.status === "urgente").length;

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Prazos</h1>
          <p className="sum"><Ico p="clock" s={15} />{prazos.length} prazo(s) monitorado(s){urgentes > 0 && <> · <b>{urgentes}</b> urgente(s)</>}</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary"><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Novo prazo</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Prazos monitorados</h3>
          <div className="search" style={{ maxWidth: 320, margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar por tipo ou processo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filters">
          {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
        </div>
        <div className="mini" style={{ padding: "6px 0" }}>
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhum prazo nesta visão.</div>}
          {shown.map((p) => {
            const b = dm(p.due_date + "T00:00:00");
            const status = eff(p); const st = ST[status] ?? ST.a_validar;
            const n = diasRestantes(p.due_date);
            const urgente = n <= 1;
            return (
              <div className="row" key={p.id} style={{ padding: "15px 22px" }}>
                <div className="date-badge" style={urgente ? { borderColor: "#F3D9CE", background: "#FBE7E2" } : undefined}>
                  <span className="d" style={urgente ? { color: "#C0492E" } : undefined}>{b.d}</span><span className="m">{b.m}</span>
                </div>
                <div className="info">
                  <div className="t">{p.titulo}</div>
                  <div className="s">Proc. {p.process_ref} · <span style={urgente ? { color: "#C0492E", fontWeight: 600 } : undefined}>{venc(p.due_date)}</span></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={"st " + st[0]}>{st[1]}</span>
                  {status !== "confirmado" && <button className="btn-act solid" onClick={() => confirmar(p.id)}>Confirmar</button>}
                  <Link className="btn-act" href={`/processos/${encodeURIComponent(p.process_ref ?? "")}`}>Ver processo</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        As datas são sugestões identificadas pela AXIA. Confirme sempre nos sistemas oficiais dos tribunais.
      </p>
    </>
  );
}
