"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/plans";
import { STAGE_LABEL, type JourneyStage } from "@/modules/journey/domain/stateMachine";

export interface Processo {
  ref: string;
  comunicacoes: number;
  prazos: number;
  pericias: number;
  honorarios_cents: number;
  vara: string | null;
  lastActivity: string | null;
  stage?: string | null;
  periciado?: string | null;
  prazoUrgente?: boolean;
}

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function quando(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MES[d.getMonth()]}`;
}

// Badge de status derivado da etapa da jornada.
function statusBadge(p: Processo): { label: string; cls: string } {
  if (p.prazoUrgente) return { label: "Urgente", cls: "b-urg" };
  if (p.stage === "finalizadas") return { label: "Finalizado", cls: "b-fim" };
  if (p.stage === "aguardando_judiciario") return { label: "Aguardando", cls: "b-wait" };
  if (p.stage) return { label: "Em andamento", cls: "b-and" };
  return { label: "—", cls: "b-neu" };
}

type Ord = "atividade" | "prazos" | "honorarios";

export default function ProcessosClient({ processos }: { processos: Processo[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "andamento" | "aguardando" | "finalizado" | "urgente">("todos");
  const [ord, setOrd] = useState<Ord>("atividade");

  const lista = useMemo(() => {
    let l = processos.filter((p) => {
      if (q && !`${p.ref} ${p.vara ?? ""} ${p.periciado ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filtro === "urgente") return p.prazoUrgente;
      if (filtro === "finalizado") return p.stage === "finalizadas";
      if (filtro === "aguardando") return p.stage === "aguardando_judiciario";
      if (filtro === "andamento") return p.stage && p.stage !== "finalizadas" && p.stage !== "aguardando_judiciario";
      return true;
    });
    l = [...l].sort((a, b) => {
      if (ord === "prazos") return b.prazos - a.prazos;
      if (ord === "honorarios") return b.honorarios_cents - a.honorarios_cents;
      return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
    });
    return l;
  }, [processos, q, filtro, ord]);

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Processos</h1><p className="sum">{processos.length} processo(s). Abra um processo para ver perícias, documentos, quesitos e financeiro.</p></div>
      </div>

      {/* Filtros + busca + ordenação */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {([["todos","Todos"],["andamento","Em andamento"],["aguardando","Aguardando"],["urgente","Urgentes"],["finalizado","Finalizados"]] as [typeof filtro,string][]).map(([id,l]) => (
          <button key={id} className={"tsk-tab" + (filtro === id ? " on" : "")} onClick={() => setFiltro(id)}>{l}</button>
        ))}
        <select value={ord} onChange={(e) => setOrd(e.target.value as Ord)} style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 20, fontSize: 13, background: "var(--panel)", color: "var(--ink)", fontFamily: "'Inter',sans-serif" }}>
          <option value="atividade">Mais recentes</option>
          <option value="prazos">Mais prazos</option>
          <option value="honorarios">Maior honorário</option>
        </select>
        <div className="search" style={{ maxWidth: 240, margin: 0, marginLeft: "auto" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
          <input placeholder="Buscar processo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      <div className="proc-lista">
        {lista.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum processo encontrado.</p>}
        {lista.map((p) => {
          const b = statusBadge(p);
          return (
            <Link key={p.ref} href={`/processos/${encodeURIComponent(p.ref)}`} className="proc-card">
              <div className="proc-main">
                <div className="proc-ref">{p.ref}</div>
                <div className="proc-meta">
                  {p.vara && <span>{p.vara}</span>}
                  {p.stage && <span>{STAGE_LABEL[p.stage as JourneyStage] ?? p.stage}</span>}
                  <span>{p.pericias} perícia(s)</span>
                </div>
              </div>
              <div className="proc-side">
                <span className={"proc-badge " + b.cls}>{b.label}</span>
                {p.honorarios_cents > 0 && <span className="proc-hon">{formatBRL(p.honorarios_cents)}</span>}
                <span className="proc-when">{quando(p.lastActivity)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
