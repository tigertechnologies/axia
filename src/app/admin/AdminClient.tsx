"use client";
import { useState, useTransition } from "react";
import { PLANS, formatBRL, planCode } from "@/lib/plans";
import { adminSetSubscriptionStatus, type Assinante } from "../actions/admin";
import Toast from "../Toast";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa", trialing: "Teste", past_due: "Pgto pendente", unpaid: "Não paga",
  canceled: "Cancelada", suspended: "Suspensa", expired: "Expirada", pending_subscription: "Sem assinatura",
};
const STATUS_OPCOES = ["active", "trialing", "past_due", "canceled", "suspended", "expired", "pending_subscription"];
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function quando(iso: string | null) { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }
function planoNome(planId: string | null) { const c = planCode(planId); return c === "office" ? "Master" : c[0].toUpperCase() + c.slice(1); }
function mensal(planId: string | null): number {
  const p = PLANS[planId ?? ""]; if (!p) return 0;
  return p.interval === "year" ? Math.round(p.amount / 12) : p.amount;
}

export default function AdminClient({ assinantes, webhooksPendentes, erro }:
  { assinantes: Assinante[]; webhooksPendentes: number; erro?: string }) {
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

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #E6EBF2", borderRadius: 16, padding: 18 };

  return (
    <>
      <div className="greet" style={{ marginBottom: 20 }}>
        <div><h1>Administração</h1><p className="sum">Gestão de assinantes e suporte. Sem acesso ao conteúdo das comunicações.</p></div>
      </div>

      {erro && <div className="err">{erro}</div>}

      {/* métricas */}
      <div className="kpis" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kn">{assinantes.length}</div><div className="kl">Assinantes</div><div className="kt up">{ativos.length} ativos</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 24 }}>{formatBRL(receita)}</div><div className="kl">Receita mensal estimada</div><div className="kt up">assinaturas ativas</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 22 }}>{porPlano.essential} · {porPlano.pro} · {porPlano.office}</div><div className="kl">Essential · Pro · Master</div></div>
        <div className="kpi"><div className="kn">{webhooksPendentes}</div><div className="kl">Webhooks pendentes</div><div className={"kt " + (webhooksPendentes > 0 ? "warn" : "up")}>{webhooksPendentes > 0 ? "verificar" : "ok"}</div></div>
      </div>

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
      </section>

      <p style={{ marginTop: 14, fontSize: 12.5, color: "#6B7C93" }}>
        Este painel mostra apenas metadados (contagens e datas). O conteúdo das comunicações dos assinantes não é acessível por aqui, em conformidade com a LGPD.
      </p>

      <Toast msg={toast} />
    </>
  );
}
