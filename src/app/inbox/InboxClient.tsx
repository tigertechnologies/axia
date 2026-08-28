"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { validateCommunication } from "../dashboard/actions";
import { setArchived } from "../actions/state";
import { Ico } from "../AppShell";

interface Comm { id: string; category: string; sender: string | null; subject: string; snippet: string | null; process_ref: string | null; received_at: string; validated: boolean; archived?: boolean }

const CAT: Record<string, { label: string; tag: string; f: string }> = {
  nomeacao: { label: "Nova nomeação", tag: "t-nom", f: "nom" },
  prazo: { label: "Prazo", tag: "t-prz", f: "prz" },
  intimacao: { label: "Intimação", tag: "t-int", f: "int" },
  honorarios: { label: "Honorários", tag: "t-hon", f: "hon" },
  pericia: { label: "Perícia", tag: "t-per", f: "per" },
  esclarecimento: { label: "Esclarecimento", tag: "t-esc", f: "esc" },
};
const FILTERS = [["all", "Tudo"], ["nom", "Nomeações"], ["prz", "Prazos"], ["per", "Perícias"], ["hon", "Honorários"], ["int", "Intimações"], ["esc", "Esclarecimentos"]];
function ago(iso: string) { const d = (Date.now() - new Date(iso).getTime()) / 3600_000; if (d < 1) return "agora"; if (d < 24) return `há ${Math.round(d)}h`; if (d < 48) return "ontem"; return `${Math.round(d / 24)} dias`; }

export default function InboxClient({ comms }: { comms: Comm[] }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [arch, setArch] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  function arquivar(id: string){ setArch(a=>new Set(a).add(id)); startTransition(()=>{ setArchived(id, true); }); }

  function validar(id: string) { setDone((d) => new Set(d).add(id)); startTransition(() => { validateCommunication(id); }); }

  const shown = comms.filter((c) => {
    const okCat = filter === "all" || CAT[c.category]?.f === filter;
    const okQ = !q || (c.subject + " " + (c.sender ?? "") + " " + (c.process_ref ?? "")).toLowerCase().includes(q.toLowerCase());
    const notArch = !c.archived && !arch.has(c.id);
    return okCat && okQ && notArch;
  });
  const naoValidadas = comms.filter((c) => c.category === "nomeacao" && !c.validated && !done.has(c.id)).length;

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div>
          <h1>Inbox inteligente</h1>
          <p className="sum"><Ico p="inbox" s={15} />{comms.length} comunicações analisadas{naoValidadas > 0 && <> · <b>{naoValidadas}</b> nomeação(ões) para validar</>}</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
          <h3>Todas as comunicações</h3>
          <div className="search" style={{ maxWidth: 320, margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
            <input placeholder="Buscar por assunto, remetente, processo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filters">
          {FILTERS.map(([f, l]) => <span key={f} className={"fchip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{l}</span>)}
        </div>
        <div className="inbox">
          {shown.length === 0 && <div style={{ padding: "34px 22px", color: "#6B7C93", fontSize: 14, textAlign: "center" }}>Nenhuma comunicação encontrada.</div>}
          {shown.map((c) => {
            const meta = CAT[c.category] ?? { label: c.category, tag: "t-esc", f: "esc" };
            const isDone = c.validated || done.has(c.id);
            return (
              <div className={"item" + (isDone ? " done" : "")} key={c.id}>
                <span className={"cat-ic " + meta.tag}><Ico p={c.category} s={18} /></span>
                <div className="body">
                  <div className="r1"><span className={"tag " + meta.tag}>{meta.label}</span><span className="from">{c.sender}</span>{c.process_ref && <span className="from">· Proc. {c.process_ref}</span>}</div>
                  <div className="subj">{c.subject}</div>
                  {c.snippet && <div className="meta">{c.snippet}</div>}
                </div>
                <div className="act">
                  <span className="time">{ago(c.received_at)}</span>
                  {c.category === "nomeacao"
                    ? <button className="btn-act solid" onClick={() => validar(c.id)}>{isDone ? "Validado ✓" : "Validar"}</button>
                    : (c.process_ref ? <Link className="btn-act" href={`/processos/${encodeURIComponent(c.process_ref)}`}>Ver</Link> : <button className="btn-act">Ver</button>)}
                  <button className="btn-act" onClick={() => arquivar(c.id)} title="Arquivar">Arquivar</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
