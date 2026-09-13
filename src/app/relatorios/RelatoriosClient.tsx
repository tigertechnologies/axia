"use client";
import { formatBRL } from "@/lib/plans";
import { STAGE_LABEL, type JourneyStage } from "@/modules/journey/domain/stateMachine";
import type { Relatorios } from "@/app/actions/relatorios";

export default function RelatoriosClient({ rel }: { rel: Relatorios }) {
  const maxEvol = Math.max(1, ...rel.evolucao.map((e) => Math.max(e.pericias, e.laudos)));
  const maxEtapa = Math.max(1, ...rel.porEtapa.map((e) => e.total));
  const totalEtapas = rel.porEtapa.reduce((s, e) => s + e.total, 0);

  function exportarCSV() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = ["Relatório AXIA", "", "Indicador,Valor",
      `Total de perícias,${rel.totalPericias}`,
      `Laudos concluídos,${rel.laudosConcluidos}`,
      `Tempo médio (dias),${rel.tempoMedioDias ?? "—"}`,
      `Honorários total,${formatBRL(rel.financeiro.total_cents)}`,
      `Recebido,${formatBRL(rel.financeiro.recebido_cents)}`,
      `A receber,${formatBRL(rel.financeiro.a_receber_cents)}`,
      "", "Etapa,Perícias",
      ...rel.porEtapa.map((e) => `${esc(STAGE_LABEL[e.stage as JourneyStage] ?? e.stage)},${e.total}`),
      "", "Mês,Perícias,Laudos concluídos",
      ...rel.evolucao.map((e) => `${e.mes},${e.pericias},${e.laudos}`),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `relatorio-axia-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Relatórios</h1><p className="sum">Visão gerencial da sua operação pericial — produtividade e financeiro.</p></div>
        <div className="greet-actions"><button className="btn btn-ghost" onClick={exportarCSV}>Exportar CSV</button></div>
      </div>

      {/* KPIs */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kn">{rel.totalPericias}</div><div className="kl">Perícias no total</div></div>
        <div className="kpi"><div className="kn">{rel.laudosConcluidos}</div><div className="kl">Laudos concluídos</div></div>
        <div className="kpi"><div className="kn">{rel.tempoMedioDias ?? "—"}{rel.tempoMedioDias !== null ? " d" : ""}</div><div className="kl">Tempo médio até laudo</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(rel.financeiro.a_receber_cents)}</div><div className="kl">A receber</div></div>
      </div>

      {/* Evolução (6 meses) */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Evolução — perícias e laudos (6 meses)</h3></div>
        <div className="rel-bars">
          {rel.evolucao.map((e) => (
            <div key={e.mes} className="rel-bar-col">
              <div className="rel-bar-group">
                <div className="rel-bar rel-bar-per" style={{ height: `${(e.pericias / maxEvol) * 100}%` }} title={`${e.pericias} perícias`} />
                <div className="rel-bar rel-bar-lau" style={{ height: `${(e.laudos / maxEvol) * 100}%` }} title={`${e.laudos} laudos`} />
              </div>
              <div className="rel-bar-label">{e.mes}</div>
            </div>
          ))}
        </div>
        <div className="rel-legenda">
          <span><span className="rel-dot per" /> Perícias</span>
          <span><span className="rel-dot lau" /> Laudos concluídos</span>
        </div>
      </section>

      {/* Distribuição por etapa */}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Perícias por etapa da jornada</h3></div>
        {rel.porEtapa.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Sem perícias ainda.</p>}
        {rel.porEtapa.sort((a,b) => b.total - a.total).map((e) => {
          const pct = totalEtapas > 0 ? Math.round((e.total / totalEtapas) * 100) : 0;
          return (
            <div key={e.stage} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 150, fontSize: 12.5, color: "var(--ink)" }}>{STAGE_LABEL[e.stage as JourneyStage] ?? e.stage}</div>
              <div style={{ flex: 1, height: 12, background: "var(--line)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${(e.total / maxEtapa) * 100}%`, height: "100%", background: "#16305B", borderRadius: 6 }} />
              </div>
              <div style={{ width: 56, textAlign: "right", fontSize: 12.5, color: "var(--muted)" }}>{e.total} · {pct}%</div>
            </div>
          );
        })}
      </section>

      {/* Financeiro */}
      <section className="panel">
        <div className="panel-h"><h3>Financeiro</h3></div>
        <div className="kpis" style={{ marginBottom: 12 }}>
          <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(rel.financeiro.total_cents)}</div><div className="kl">Total</div></div>
          <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(rel.financeiro.recebido_cents)}</div><div className="kl">Recebido</div></div>
          <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{formatBRL(rel.financeiro.a_receber_cents)}</div><div className="kl">A receber</div></div>
        </div>
        {rel.financeiro.por_status.map((s) => (
          <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
            <span style={{ color: "var(--muted)" }}>{s.status}</span><b style={{ color: "var(--ink)" }}>{formatBRL(s.total_cents)}</b>
          </div>
        ))}
      </section>
    </>
  );
}
