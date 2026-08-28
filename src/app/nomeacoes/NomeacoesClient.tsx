"use client";
import { useState, useTransition } from "react";
import { validateCommunication } from "../dashboard/actions";
import { Ico } from "../AppShell";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean }

const FILTERS = [["all", "Todas"], ["pend", "A validar"], ["ok", "Validadas"]];
function ago(iso: string) { const d = (Date.now() - new Date(iso).getTime()) / 3600_000; if (d < 1) return "agora"; if (d < 24) return `há ${Math.round(d)}h`; if (d < 48) return "ontem"; return `${Math.round(d / 24)} dias`; }

export default function NomeacoesClient({ nomeacoes }: { nomeacoes: Comm[] }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function validar(id: string) { setDone((d) => new Set(d).add(id)); startTransition(() => { validateCommunication(id); }); }
  const isValid = (c: Comm) => c.validated || done.has(c.id);

  const shown = nomeacoes.filter((c) => {
    const okF = filter === "all" || (filter === "ok" ? isValid(c) : !isValid(c));
    const okQ = !q || (c.subject + " " + (c.sender ?? "") + " " + (c.process_ref ?? "")).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });
  const pend = nomeacoes.filter((c) => !isValid(c)).length;

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Nomeações</h1>
          <p className="sum"><Ico p="shield" s={15} />{nomeacoes.length} nomeação(ões){pend > 0 && <> · <b>{pend}</b> aguardando validação</>}</p>
        </div>
        <div className="greet-actions">
          <button className="btn btn-primary"><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" /></svg>Nova nomeação</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Suas nomeações</h3>
          <div className="search" style={{ maxWidth: 320, margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar por vara, tribunal, processo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filters">
          {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
        </div>
        <div className="inbox">
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhuma nomeação nesta visão.</div>}
          {shown.map((c) => {
            const v = isValid(c);
            return (
              <div className={"item" + (v ? " done" : "")} key={c.id}>
                <span className="cat-ic t-nom"><Ico p="nomeacao" s={18} /></span>
                <div className="body">
                  <div className="r1">
                    <span className="tag t-nom">Nomeação</span>
                    <span className="from">{c.sender}</span>
                    {c.process_ref && <span className="from">· Proc. {c.process_ref}</span>}
                    <span className={"st " + (v ? "st-ok" : "st-val")}>{v ? "Validada" : "A validar"}</span>
                  </div>
                  <div className="subj">{c.subject}</div>
                  {c.snippet && <div className="meta">{c.snippet}</div>}
                </div>
                <div className="act">
                  <span className="time">{ago(c.received_at)}</span>
                  <button className="btn-act solid" onClick={() => !v && validar(c.id)}>{v ? "Validado ✓" : "Validar"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
