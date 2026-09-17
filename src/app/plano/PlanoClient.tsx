"use client";
import { useState } from "react";
import { openBillingPortal } from "../configuracoes/actions";

const PLANOS: Record<string, { nome: string; preco: string; limite: string; recursos: string[] }> = {
  essential: { nome: "Essential", preco: "R$ 69,90/mês", limite: "50 análises de IA/mês", recursos: ["Jornada pericial completa", "Laudos e Auditor", "Documentos e Cálculos", "50 análises de IA/mês"] },
  pro: { nome: "Pro", preco: "R$ 119,90/mês", limite: "300 análises de IA/mês", recursos: ["Tudo do Essential", "300 análises de IA/mês", "Relatórios avançados", "Prioridade no suporte"] },
  office: { nome: "Master", preco: "R$ 249,90/mês", limite: "2.000 análises de IA/mês", recursos: ["Tudo do Pro", "2.000 análises de IA/mês", "Equipe e permissões", "Marketplace destacado"] },
};

const STATUS_LABEL: Record<string, { txt: string; cls: string }> = {
  active: { txt: "Ativa", cls: "st-ok" }, trialing: { txt: "Em teste", cls: "st-ok" },
  past_due: { txt: "Pagamento pendente", cls: "st-val" }, canceled: { txt: "Cancelada", cls: "st-val" },
  unpaid: { txt: "Não paga", cls: "st-val" }, pending_subscription: { txt: "Sem assinatura", cls: "st-val" },
};

export default function PlanoClient({ planId, status }: { planId: string | null; status: string | null }) {
  const [loading, setLoading] = useState(false);
  const code = (planId ?? "").split("_")[0] || "essential";
  const plano = PLANOS[code] ?? PLANOS.essential;
  const st = STATUS_LABEL[status ?? ""] ?? { txt: status ?? "—", cls: "st-val" };

  async function gerenciar() {
    setLoading(true);
    try { const r = await openBillingPortal(); if (r && "url" in r && r.url) window.location.href = r.url; } catch {}
    setLoading(false);
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Plano e Assinatura</h1><p className="sum">Seu plano atual, o que ele inclui e como gerenciar a assinatura.</p></div>
      </div>

      {/* Plano atual */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h" style={{ justifyContent: "space-between" }}>
          <h3>Plano {plano.nome}</h3>
          <span className={"st " + st.cls}>{st.txt}</span>
        </div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: "var(--ink)" }}>{plano.preco}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{plano.limite}</div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
          {plano.recursos.map((r) => (
            <div key={r} style={{ fontSize: 13, color: "var(--ink)", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#0F7A70" }}>✓</span> {r}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" onClick={gerenciar} disabled={loading}>{loading ? "Abrindo…" : "Gerenciar assinatura"}</button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>Trocar de plano, atualizar cartão e cancelar são feitos no portal seguro do Stripe.</p>
      </section>

      {/* Comparativo dos planos */}
      <section className="panel">
        <div className="panel-h"><h3>Todos os planos</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {Object.entries(PLANOS).map(([k, p]) => (
            <div key={k} className="panel" style={{ margin: 0, border: k === code ? "2px solid #1FA89E" : "1px solid var(--line)" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{p.nome} {k === code && <span style={{ fontSize: 11, color: "#0F7A70" }}>· atual</span>}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>{p.preco}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.limite}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
