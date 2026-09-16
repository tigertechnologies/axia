"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarLancamento, excluirLancamento, type Lancamento, type ResumoFinanceiro } from "@/app/actions/financeiro";

function fmt(c: number) { return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function paraCents(s: string) { const v = parseFloat(s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "")); return Number.isFinite(v) ? Math.round(v * 100) : 0; }
const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function dataBR(iso: string) { const d = new Date(iso + "T00:00:00"); return `${String(d.getDate()).padStart(2,"0")} ${MES[d.getMonth()]}`; }

const CATEGORIAS = ["honorarios", "material", "transporte", "escritorio", "impostos", "outro"];
const CAT_LABEL: Record<string, string> = { honorarios: "Honorários", material: "Material", transporte: "Transporte", escritorio: "Escritório", impostos: "Impostos", outro: "Outro" };

export default function LancamentosClient({ itens, resumo, periodo }: { itens: Lancamento[]; resumo: ResumoFinanceiro; periodo: string }) {
  const router = useRouter();
  const [form, setForm] = useState<{ tipo: string; descricao: string; categoria: string; valor: string; metodo: string; status: string; data: string } | null>(null);
  const [, startT] = useTransition();

  function novo(tipo: string) {
    setForm({ tipo, descricao: "", categoria: tipo === "despesa" ? "material" : "honorarios", valor: "", metodo: "pix", status: "pago", data: new Date().toISOString().slice(0,10) });
  }
  async function salvar() {
    if (!form) return;
    const r = await salvarLancamento({ tipo: form.tipo, descricao: form.descricao, categoria: form.categoria, valor: paraCents(form.valor), metodo: form.metodo, status: form.status, data: form.data });
    if (r && "error" in r) return;
    setForm(null); router.refresh();
  }
  async function remover(id: string) { if (!confirm("Excluir este lançamento?")) return; await excluirLancamento(id); router.refresh(); }

  function irPeriodo(p: string) { router.push(`/financeiro?periodo=${p}`); }

  return (
    <>
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Financeiro</h1><p className="sum">Receitas, despesas e fluxo de caixa. Descubra quanto cada processo te rende.</p></div>
        <div className="greet-actions">
          <button className="btn btn-ghost" onClick={() => novo("despesa")}>+ Despesa</button>
          <button className="btn btn-primary" onClick={() => novo("receita")}>+ Receita</button>
        </div>
      </div>

      {/* Filtro de período */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["hoje","Hoje"],["semana","Semana"],["mes","Mês"],["ano","Ano"],["todos","Todos"]].map(([p,l]) => (
          <button key={p} className={"tsk-tab" + (periodo === p ? " on" : "")} onClick={() => irPeriodo(p)}>{l}</button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><div className="kn" style={{ fontSize: 20, color: "#0F7A70" }}>{fmt(resumo.receitas_cents)}</div><div className="kl">Receitas</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 20, color: "#C0492E" }}>{fmt(resumo.despesas_cents)}</div><div className="kl">Despesas</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 20 }}>{fmt(resumo.saldo_cents)}</div><div className="kl">Saldo (líquido)</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 20, color: "#8A5A18" }}>{fmt(resumo.pendente_cents)}</div><div className="kl">A receber</div></div>
        <div className="kpi"><div className="kn" style={{ fontSize: 20, color: "#0F7A70" }}>{fmt(resumo.recebido_cents)}</div><div className="kl">Recebido</div></div>
      </div>

      {/* Formulário */}
      {form && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>{form.tipo === "despesa" ? "Nova despesa" : "Nova receita"}</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><L label="Descrição"><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={inp} placeholder={form.tipo === "despesa" ? "Ex.: Material para vistoria" : "Ex.: Honorários processo X"} /></L></div>
            <L label="Valor (R$)"><input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={inp} placeholder="0,00" inputMode="decimal" /></L>
            <L label="Categoria"><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={inp}>{CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select></L>
            <L label="Método"><select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} style={inp}><option value="pix">Pix</option><option value="transferencia">Transferência</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="boleto">Boleto</option></select></L>
            <L label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inp}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="previsto">Previsto</option></select></L>
            <L label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inp} /></L>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => startT(salvar)}>Salvar</button>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </section>
      )}

      {/* Lista */}
      <section className="panel">
        <div className="panel-h"><h3>Lançamentos ({itens.length})</h3></div>
        {itens.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum lançamento no período.</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "10px 12px" }}>Descrição</th><th style={{ padding: "10px 12px" }}>Data</th><th style={{ padding: "10px 12px" }}>Categoria</th><th style={{ padding: "10px 12px", textAlign: "right" }}>Valor</th><th style={{ padding: "10px 12px" }}>Status</th><th></th>
            </tr></thead>
            <tbody>
              {itens.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{l.descricao}</td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{dataBR(l.data)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{l.categoria ? CAT_LABEL[l.categoria] ?? l.categoria : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: l.tipo === "despesa" ? "#C0492E" : "#0F7A70" }}>{l.tipo === "despesa" ? "− " : "+ "}{fmt(l.valor_cents)}</td>
                  <td style={{ padding: "10px 12px" }}><span className={"st " + (l.status === "pago" ? "st-ok" : "st-val")}>{l.status}</span></td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}><button onClick={() => startT(() => remover(l.id))} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 13.5, background: "var(--panel)", color: "var(--ink)", boxSizing: "border-box" };
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
