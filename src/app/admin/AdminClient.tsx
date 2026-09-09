"use client";
import { useState, useTransition } from "react";
import { PLANS, formatBRL, planCode } from "@/lib/plans";
import {
  adminSetSubscriptionStatus,
  type Assinante, type Metricas, type AuditEvent, type Snapshot,
} from "../actions/admin";
import Toast from "../Toast";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa", trialing: "Teste", past_due: "Pgto pendente", unpaid: "Não paga",
  canceled: "Cancelada", suspended: "Suspensa", expired: "Expirada", pending_subscription: "Sem assinatura",
};
const STATUS_OPCOES = ["active", "trialing", "past_due", "canceled", "suspended", "expired", "pending_subscription"];
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function quando(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }
function quandoHora(iso: string) { const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function planoNome(planId: string | null) { const c = planCode(planId); return c === "office" ? "Master" : c[0].toUpperCase() + c.slice(1); }
function mensal(planId: string | null): number {
  const p = PLANS[planId ?? ""]; if (!p) return 0;
  return p.interval === "year" ? Math.round(p.amount / 12) : p.amount;
}

// Rótulo legível para cada tipo de ação de auditoria.
function descreveAcao(e: AuditEvent): string {
  if (e.action === "set_subscription_status") {
    const de = (e.detail?.de as string) ?? null;
    const para = (e.detail?.para as string) ?? null;
    const lde = de ? (STATUS_LABEL[de] ?? de) : "—";
    const lpara = para ? (STATUS_LABEL[para] ?? para) : "—";
    return `Alterou status: ${lde} → ${lpara}`;
  }
  return e.action;
}

type Aba = "visao" | "assinantes" | "auditoria";

export default function AdminClient({
  assinantes, webhooksPendentes, erro, metricas, auditoria, historico,
}: {
  assinantes: Assinante[]; webhooksPendentes: number; erro?: string;
  metricas: Metricas | null; auditoria: AuditEvent[]; historico: Snapshot[];
}) {
  const [aba, setAba] = useState<Aba>("visao");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [, startT] = useTransition();
  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 3500); }

  const eff = (a: Assinante) => over[a.org_id] ?? a.subscription_status ?? "pending_subscription";
  const ativos = assinantes.filter((a) => ["active", "trialing", "past_due"].includes(eff(a)));
  const porPlano = { essential: 0, pro: 0, office: 0 } as Record<string, number>;
  ativos.forEach((a) => { porPlano[planCode(a.plan_id)]++; });
  const receita = ativos.reduce((s, a) => s + mensal(a.plan_id), 0);

  const shown = assinantes.filter((a) => !q || (a.nome + " " + a.email + " " + (a.plan_id ?? "")).toLowerCase().includes(q.toLowerCase()));

  async function mudarStatus(a: Assinante, status: string) {
    const anterior = eff(a);
    setOver((o) => ({ ...o, [a.org_id]: status }));
    const r = await adminSetSubscriptionStatus(a.org_id, status);
    if (r && "error" in r) { setOver((o) => ({ ...o, [a.org_id]: anterior })); flash("Não foi possível alterar. Tente novamente."); }
    else flash("Status atualizado.");
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 18 }}>
        <div><h1>Administração</h1><p className="sum">Centro de controle da AXIA. Sem acesso ao conteúdo das comunicações.</p></div>
      </div>

      {erro && <div className="err">{erro}</div>}

      {/* Abas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid #E6EBF2" }}>
        <Tab id="visao" atual={aba} set={setAba}>Visão geral</Tab>
        <Tab id="assinantes" atual={aba} set={setAba}>Assinantes</Tab>
        <Tab id="auditoria" atual={aba} set={setAba}>Auditoria</Tab>
      </div>

      {aba === "visao" && (
        <Visao
          total={assinantes.length} ativosLen={ativos.length} receita={receita}
          porPlano={porPlano} webhooksPendentes={webhooksPendentes} metricas={metricas} historico={historico}
        />
      )}

      {aba === "assinantes" && (
        <section className="panel">
          <div className="panel-h" style={{ gap: 12, flexWrap: "wrap" }}>
            <h3>Assinantes</h3>
            <div className="search" style={{ maxWidth: 320, margin: 0 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="7" cy="7" r="5" /><path d="M14 14l-3.5-3.5" strokeLinecap="round" /></svg>
              <input placeholder="Buscar por nome, e-mail ou plano…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
                  <th style={{ padding: "12px 16px" }}>Assinante</th>
                  <th style={{ padding: "12px 16px" }}>Plano</th>
                  <th style={{ padding: "12px 16px" }}>Situação</th>
                  <th style={{ padding: "12px 16px" }}>Atividade</th>
                  <th style={{ padding: "12px 16px" }}>Suporte</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", color: "#6B7C93" }}>Nenhum assinante.</td></tr>}
                {shown.map((a) => (
                  <tr key={a.org_id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "12px 16px" }}><div style={{ fontWeight: 600, color: "#10233F" }}>{a.nome.trim() || "—"}</div><div style={{ color: "#6B7C93" }}>{a.email}</div></td>
                    <td style={{ padding: "12px 16px" }}>{planoNome(a.plan_id)}</td>
                    <td style={{ padding: "12px 16px" }}><span className={"st " + (["active","trialing"].includes(eff(a)) ? "st-ok" : eff(a) === "past_due" ? "st-val" : "st-urg")}>{STATUS_LABEL[eff(a)] ?? eff(a)}</span></td>
                    <td style={{ padding: "12px 16px" }}><div>{a.total_comunicacoes} com.</div><div style={{ color: "#6B7C93" }}>últ. {quando(a.ultima_atividade)}</div></td>
                    <td style={{ padding: "12px 16px" }}>
                      <select value={eff(a)} onChange={(e) => startT(() => mudarStatus(a, e.target.value))}
                        style={{ padding: "6px 8px", border: "1px solid #E4E9F0", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 12.5 }}>
                        {STATUS_OPCOES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
            Este painel mostra apenas metadados (contagens e datas). O conteúdo das comunicações dos assinantes não é acessível por aqui, em conformidade com a LGPD.
          </p>
        </section>
      )}

      {aba === "auditoria" && (
        <section className="panel">
          <div className="panel-h"><h3>Auditoria</h3></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6B7C93", borderBottom: "1px solid #E6EBF2" }}>
                  <th style={{ padding: "12px 16px" }}>Quando</th>
                  <th style={{ padding: "12px 16px" }}>Admin</th>
                  <th style={{ padding: "12px 16px" }}>Ação</th>
                  <th style={{ padding: "12px 16px" }}>Alvo</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.length === 0 && <tr><td colSpan={4} style={{ padding: "28px 16px", textAlign: "center", color: "#6B7C93" }}>Nenhuma ação registrada ainda.</td></tr>}
                {auditoria.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}>
                    <td style={{ padding: "12px 16px", color: "#6B7C93", whiteSpace: "nowrap" }}>{quandoHora(e.created_at)}</td>
                    <td style={{ padding: "12px 16px" }}>{e.actor_email ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#10233F" }}>{descreveAcao(e)}</td>
                    <td style={{ padding: "12px 16px", color: "#6B7C93" }}>{e.target_email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
            Registro de ações administrativas (quem, o quê, quando). Ajuda no suporte e na conformidade com a LGPD.
          </p>
        </section>
      )}

      <Toast msg={toast} />
    </>
  );
}

function Tab({ id, atual, set, children }: { id: Aba; atual: Aba; set: (a: Aba) => void; children: React.ReactNode }) {
  const on = atual === id;
  return (
    <button onClick={() => set(id)} style={{
      padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
      fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: on ? 700 : 500,
      color: on ? "#16305B" : "#6B7C93", borderBottom: on ? "2px solid #1FA89E" : "2px solid transparent",
      marginBottom: -1,
    }}>{children}</button>
  );
}

function Visao({
  total, ativosLen, receita, porPlano, webhooksPendentes, metricas, historico,
}: {
  total: number; ativosLen: number; receita: number; porPlano: Record<string, number>;
  webhooksPendentes: number; metricas: Metricas | null; historico: Snapshot[];
}) {
  return (
    <>
      {/* KPIs principais */}
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kn">{total}</div><div className="kl">Assinantes</div><div className="kt up">{ativosLen} ativos</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 24 }}>{formatBRL(receita)}</div><div className="kl">MRR estimado</div><div className="kt up">assinaturas ativas</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 22 }}>{porPlano.essential} · {porPlano.pro} · {porPlano.office}</div><div className="kl">Essential · Pro · Master</div></div>
        <div className="kpi"><div className="kn">{webhooksPendentes}</div><div className="kl">Webhooks pendentes</div><div className={"kt " + (webhooksPendentes > 0 ? "warn" : "up")}>{webhooksPendentes > 0 ? "verificar" : "ok"}</div></div>
      </div>

      {/* Faixa de status */}
      {metricas && (
        <div className="kpis" style={{ marginBottom: 22 }}>
          <Mini n={metricas.novos_mes} l="Novos no mês" />
          <Mini n={metricas.ativos} l="Ativas" />
          <Mini n={metricas.trial} l="Em teste" />
          <Mini n={metricas.past_due} l="Pgto pendente" />
          <Mini n={metricas.cancelados + metricas.suspensos + metricas.expirados} l="Inativas" />
        </div>
      )}

      {/* Evolução do MRR */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Evolução do MRR</h3></div>
        <MrrChart historico={historico} />
      </section>

      {/* Distribuição por plano */}
      <section className="panel">
        <div className="panel-h"><h3>Distribuição por plano (ativos)</h3></div>
        <BarPlanos porPlano={porPlano} totalAtivos={ativosLen} />
      </section>
    </>
  );
}

function Mini({ n, l }: { n: number; l: string }) {
  return <div className="kpi"><div className="kn" style={{ fontSize: 26 }}>{n}</div><div className="kl">{l}</div></div>;
}

function MrrChart({ historico }: { historico: Snapshot[] }) {
  if (historico.length < 2) {
    return <p style={{ padding: "8px 4px", color: "#6B7C93", fontSize: 13.5 }}>Coletando histórico — o gráfico de evolução aparece a partir de amanhã, conforme os retratos diários vão sendo registrados.</p>;
  }
  const W = 640, H = 160, pad = 28;
  const vals = historico.map((s) => s.mrr_cents);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = Math.max(max - min, 1);
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(historico.length - 1, 1);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);
  const pts = historico.map((s, i) => `${x(i)},${y(s.mrr_cents)}`).join(" ");
  const MESn = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const rotulo = (dia: string) => { const d = new Date(dia + "T00:00:00"); return `${d.getDate()}/${MESn[d.getMonth()]}`; };
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 480, height: "auto" }}>
        <polyline points={pts} fill="none" stroke="#1FA89E" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {historico.map((s, i) => <circle key={s.dia} cx={x(i)} cy={y(s.mrr_cents)} r={3} fill="#16305B" />)}
        <text x={pad} y={H - 6} fontSize={11} fill="#6B7C93">{rotulo(historico[0].dia)}</text>
        <text x={W - pad} y={H - 6} fontSize={11} fill="#6B7C93" textAnchor="end">{rotulo(historico[historico.length - 1].dia)}</text>
        <text x={pad} y={16} fontSize={11} fill="#6B7C93">{formatBRL(max)}</text>
      </svg>
    </div>
  );
}

function BarPlanos({ porPlano, totalAtivos }: { porPlano: Record<string, number>; totalAtivos: number }) {
  const linhas = [
    { k: "essential", label: "Essential", cor: "#A8C4E0" },
    { k: "pro", label: "Pro", cor: "#1FA89E" },
    { k: "office", label: "Master", cor: "#16305B" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 2px" }}>
      {linhas.map((l) => {
        const v = porPlano[l.k] ?? 0;
        const pct = totalAtivos > 0 ? Math.round((v / totalAtivos) * 100) : 0;
        return (
          <div key={l.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 90, fontSize: 13.5, color: "#10233F" }}>{l.label}</div>
            <div style={{ flex: 1, height: 12, background: "#F0F3F7", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: l.cor, borderRadius: 8 }} />
            </div>
            <div style={{ width: 64, textAlign: "right", fontSize: 13, color: "#6B7C93" }}>{v} · {pct}%</div>
          </div>
        );
      })}
    </div>
  );
}
