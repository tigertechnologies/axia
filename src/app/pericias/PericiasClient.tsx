"use client";
import { useState } from "react";
import Link from "next/link";
import { Ico } from "../AppShell";

interface Pericia { id: string; titulo: string; local: string | null; process_ref: string | null; scheduled_at: string }

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const FILTERS = [["prox", "Próximas"], ["all", "Todas"], ["pass", "Realizadas"]];

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    d: String(d.getDate()).padStart(2, "0"),
    m: MES[d.getMonth()],
    dia: DIAS[d.getDay()],
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function PericiasClient({ pericias }: { pericias: Pericia[] }) {
  const [filter, setFilter] = useState("prox");
  const [q, setQ] = useState("");
  const now = Date.now();

  const shown = pericias.filter((p) => {
    const future = new Date(p.scheduled_at).getTime() >= now;
    const okF = filter === "all" || (filter === "prox" ? future : !future);
    const okQ = !q || (p.titulo + " " + (p.local ?? "") + " " + (p.process_ref ?? "")).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });
  const proximas = pericias.filter((p) => new Date(p.scheduled_at).getTime() >= now).length;

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Perícias</h1>
          <p className="sum"><Ico p="cal" s={15} />{pericias.length} perícia(s){proximas > 0 && <> · <b>{proximas}</b> agendada(s)</>}</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary"><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Nova perícia</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Agenda de perícias</h3>
          <div className="search" style={{ maxWidth: 320, margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar por vara, local ou processo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filters">
          {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
        </div>
        <div className="mini" style={{ padding: "6px 0" }}>
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhuma perícia nesta visão.</div>}
          {shown.map((p) => {
            const f = fmt(p.scheduled_at);
            return (
              <div className="row" key={p.id} style={{ padding: "15px 22px" }}>
                <div className="date-badge"><span className="d">{f.d}</span><span className="m">{f.m}</span></div>
                <div className="info">
                  <div className="t">{p.titulo}</div>
                  <div className="s">{f.dia} · {f.hora} · {p.local} · Proc. {p.process_ref}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link className="btn-act" href={`/processos/${encodeURIComponent(p.process_ref ?? "")}`}>Ver processo</Link>
                  <button className="btn-act solid">Adicionar à agenda</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
