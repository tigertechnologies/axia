"use client";
import { useState, useMemo } from "react";
import { JOURNEY_STAGES, STAGE_LABEL, type JourneyStage } from "@/modules/journey/domain/stateMachine";

export interface JornadaCard {
  id: string;
  titulo: string;
  stage: string;
  version: number;
  local: string | null;
  scheduled_at: string;
  process_ref: string | null;
  tribunal: string | null;
  comarca: string | null;
  vara: string | null;
  segredo: boolean;
  prazo: { titulo: string; due_date: string; status: string } | null;
}

const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string | null) { if (!iso) return null; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }
function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const alvo = new Date(iso); alvo.setHours(0,0,0,0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

// Badge de urgência: cor + texto + ícone (seção 29: nunca só cor).
function urgencia(card: JornadaCard): { label: string; cls: string; icon: string } {
  const dueDias = card.prazo ? diasAte(card.prazo.due_date) : null;
  if (dueDias !== null && dueDias < 0) return { label: "VENCIDO", cls: "b-venc", icon: "⚠" };
  if (dueDias !== null && dueDias <= 1) return { label: "URGENTE", cls: "b-urg", icon: "⏰" };
  if (dueDias !== null && dueDias <= 3) return { label: "ATENÇÃO", cls: "b-at", icon: "!" };
  if (card.stage === "aguardando_judiciario") return { label: "AGUARDANDO JUÍZO", cls: "b-wait", icon: "⏸" };
  return { label: "NO PRAZO", cls: "b-ok", icon: "✓" };
}

function Card({ card, onClick }: { card: JornadaCard; onClick: () => void }) {
  const u = urgencia(card);
  const dataPericia = dataBR(card.scheduled_at);
  const dueDias = card.prazo ? diasAte(card.prazo.due_date) : null;
  return (
    <button className="jk-card" onClick={onClick}>
      <div className="jk-card-top">
        <span className={"jk-badge " + u.cls}><span aria-hidden>{u.icon}</span> {u.label}</span>
        {card.segredo && <span className="jk-badge b-seg" title="Segredo de justiça">🔒 SIGILO</span>}
      </div>
      <div className="jk-card-title">{card.titulo}</div>
      {card.process_ref && <div className="jk-card-proc">{card.process_ref}</div>}
      <div className="jk-card-meta">
        {card.tribunal && <span>{card.tribunal}</span>}
        {card.vara && <span>{card.vara}</span>}
        {card.comarca && <span>{card.comarca}</span>}
      </div>
      <div className="jk-card-foot">
        {dataPericia && <span className="jk-chip">📅 {dataPericia}</span>}
        {card.prazo && dueDias !== null && (
          <span className={"jk-chip " + (dueDias < 0 ? "chip-venc" : dueDias <= 3 ? "chip-urg" : "")}>
            ⏳ {dueDias < 0 ? `${Math.abs(dueDias)}d atrás` : dueDias === 0 ? "hoje" : `${dueDias}d`}
          </span>
        )}
      </div>
      <div className="jk-card-axia">Atualizado pela AXIA</div>
    </button>
  );
}

export default function JornadaClient({ cards }: { cards: JornadaCard[] }) {
  const [sel, setSel] = useState<JornadaCard | null>(null);
  const [q, setQ] = useState("");
  const [mobileStage, setMobileStage] = useState<JourneyStage>("novas_nomeacoes");

  const filtrados = useMemo(
    () => cards.filter((c) => !q || (`${c.titulo} ${c.process_ref ?? ""} ${c.tribunal ?? ""}`).toLowerCase().includes(q.toLowerCase())),
    [cards, q]
  );

  const porEtapa = useMemo(() => {
    const m: Record<string, JornadaCard[]> = {};
    JOURNEY_STAGES.forEach((s) => (m[s] = []));
    filtrados.forEach((c) => { (m[c.stage] ?? (m[c.stage] = [])).push(c); });
    return m;
  }, [filtrados]);

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div>
          <h1>Jornada pericial</h1>
          <p className="sum">Acompanhe cada perícia da nomeação à entrega. A AXIA move os cards automaticamente conforme os eventos chegam.</p>
        </div>
        <div className="search" style={{ maxWidth: 300, margin: 0 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
          <input placeholder="Buscar processo, periciando…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* DESKTOP: board horizontal de 10 colunas */}
      <div className="jk-board">
        {JOURNEY_STAGES.map((s) => (
          <div key={s} className="jk-col">
            <div className="jk-col-head">
              <span>{STAGE_LABEL[s]}</span>
              <span className="jk-col-count">{porEtapa[s]?.length ?? 0}</span>
            </div>
            <div className="jk-col-body">
              {(porEtapa[s] ?? []).map((c) => <Card key={c.id} card={c} onClick={() => setSel(c)} />)}
              {(porEtapa[s] ?? []).length === 0 && <div className="jk-empty">—</div>}
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE: seletor de etapa + lista (seção 29) */}
      <div className="jk-mobile">
        <div className="jk-mobile-tabs">
          {JOURNEY_STAGES.map((s) => (
            <button key={s} className={"jk-mtab" + (mobileStage === s ? " on" : "")} onClick={() => setMobileStage(s)}>
              {STAGE_LABEL[s]} <span className="jk-col-count">{porEtapa[s]?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="jk-mobile-list">
          {(porEtapa[mobileStage] ?? []).map((c) => <Card key={c.id} card={c} onClick={() => setSel(c)} />)}
          {(porEtapa[mobileStage] ?? []).length === 0 && <div className="jk-empty">Nenhuma perícia nesta etapa.</div>}
        </div>
      </div>

      {/* Painel lateral (esqueleto — a Fase 4 parte 2 traz o conteúdo completo) */}
      {sel && (
        <div className="jk-drawer-overlay" onClick={() => setSel(null)}>
          <div className="jk-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="jk-drawer-head">
              <strong>{sel.titulo}</strong>
              <button onClick={() => setSel(null)} aria-label="Fechar" className="jk-x">×</button>
            </div>
            <div className="jk-drawer-body">
              <div className="jk-d-row"><span>Etapa</span><b>{STAGE_LABEL[sel.stage as JourneyStage] ?? sel.stage}</b></div>
              {sel.process_ref && <div className="jk-d-row"><span>Processo</span><b>{sel.process_ref}</b></div>}
              {sel.tribunal && <div className="jk-d-row"><span>Tribunal</span><b>{sel.tribunal}</b></div>}
              {sel.vara && <div className="jk-d-row"><span>Vara</span><b>{sel.vara}</b></div>}
              {sel.scheduled_at && <div className="jk-d-row"><span>Data da perícia</span><b>{dataBR(sel.scheduled_at)}</b></div>}
              {sel.prazo && <div className="jk-d-row"><span>Prazo</span><b>{sel.prazo.titulo} · {dataBR(sel.prazo.due_date)}</b></div>}
              {sel.segredo && <div className="jk-d-row"><span>Sigilo</span><b>🔒 Segredo de justiça</b></div>}
              <p className="jk-d-note">A linha do tempo auditável, os quesitos, documentos e as ações da jornada chegam no próximo lote (Fase 4, parte 2).</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
