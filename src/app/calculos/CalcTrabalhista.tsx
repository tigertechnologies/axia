"use client";
import { useState } from "react";
import { calcularRescisao, calcularRevisional, calcularAbonoPasep } from "@/modules/calculos/domain/trabalhista";

function paraCents(s: string): number {
  const limpo = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const v = parseFloat(limpo);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}
function fmt(c: number) { return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function CalcRescisao() {
  const [f, setF] = useState({ salario: "", admissao: "", demissao: "", fgts: "", ferias: false, aviso: true });
  const [r, setR] = useState<ReturnType<typeof calcularRescisao> | null>(null);
  function calc() {
    if (!f.salario || !f.admissao || !f.demissao) return;
    setR(calcularRescisao({
      salario_cents: paraCents(f.salario), admissao: f.admissao, demissao: f.demissao,
      ferias_vencidas: f.ferias, saldo_fgts_cents: paraCents(f.fgts), aviso_indenizado: f.aviso,
    }));
  }
  return (
    <div>
      <div className="calc-form">
        <div className="calc-field"><label>Último salário (R$)</label><input value={f.salario} onChange={(e) => setF({ ...f, salario: e.target.value })} placeholder="3.000,00" inputMode="decimal" /></div>
        <div className="calc-field"><label>Admissão</label><input type="date" value={f.admissao} onChange={(e) => setF({ ...f, admissao: e.target.value })} /></div>
        <div className="calc-field"><label>Demissão</label><input type="date" value={f.demissao} onChange={(e) => setF({ ...f, demissao: e.target.value })} /></div>
        <div className="calc-field"><label>Saldo FGTS (R$)</label><input value={f.fgts} onChange={(e) => setF({ ...f, fgts: e.target.value })} placeholder="10.000,00" inputMode="decimal" /></div>
      </div>
      <div style={{ display: "flex", gap: 16, margin: "12px 0", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}><input type="checkbox" checked={f.aviso} onChange={(e) => setF({ ...f, aviso: e.target.checked })} /> Aviso prévio indenizado</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}><input type="checkbox" checked={f.ferias} onChange={(e) => setF({ ...f, ferias: e.target.checked })} /> Tem férias vencidas</label>
        <button className="calc-btn" onClick={calc}>Calcular</button>
      </div>
      {r && (
        <div className="calc-resultado">
          <div style={{ overflowX: "auto" }}>
            <table className="calc-table">
              <thead><tr><th style={{ textAlign: "left" }}>Verba</th><th style={{ textAlign: "left" }}>Base</th><th>Valor</th></tr></thead>
              <tbody>
                {r.verbas.map((v, i) => <tr key={i}><td style={{ textAlign: "left" }}>{v.rubrica}</td><td style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>{v.base}</td><td>{fmt(v.valor_cents)}</td></tr>)}
                <tr style={{ fontWeight: 700 }}><td style={{ textAlign: "left" }} colSpan={2}>TOTAL</td><td>{fmt(r.total_cents)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="calc-mem"><b>Observação:</b> cálculo estimativo de apoio (regras gerais da CLT para dispensa sem justa causa). Confira sempre conforme o caso concreto e a convenção coletiva aplicável.</div>
        </div>
      )}
    </div>
  );
}

export function CalcRevisional() {
  const [f, setF] = useState({ valor: "", contratada: "", revisada: "", n: "" });
  const [r, setR] = useState<ReturnType<typeof calcularRevisional> | null>(null);
  function calc() {
    const p = paraCents(f.valor), tc = parseFloat(f.contratada.replace(",", ".")) / 100, tr = parseFloat(f.revisada.replace(",", ".")) / 100, n = parseInt(f.n, 10);
    if (!p || !Number.isFinite(tc) || !Number.isFinite(tr) || !n) return;
    setR(calcularRevisional(p, tc, tr, n));
  }
  return (
    <div>
      <div className="calc-form">
        <div className="calc-field"><label>Valor financiado (R$)</label><input value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="10.000,00" inputMode="decimal" /></div>
        <div className="calc-field"><label>Taxa contratada (% mês)</label><input value={f.contratada} onChange={(e) => setF({ ...f, contratada: e.target.value })} placeholder="4" inputMode="decimal" /></div>
        <div className="calc-field"><label>Taxa revisada (% mês)</label><input value={f.revisada} onChange={(e) => setF({ ...f, revisada: e.target.value })} placeholder="2" inputMode="decimal" /></div>
        <div className="calc-field"><label>Parcelas</label><input value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} placeholder="24" inputMode="numeric" /></div>
        <button className="calc-btn" onClick={calc}>Calcular</button>
      </div>
      {r && (
        <div className="calc-resultado">
          <div className="calc-cards">
            <div className="calc-card"><div className="cc-n" style={{ fontSize: 18 }}>{fmt(r.parcela_contratada_cents)}</div><div className="cc-l">Parcela contratada</div></div>
            <div className="calc-card"><div className="cc-n" style={{ fontSize: 18 }}>{fmt(r.parcela_revisada_cents)}</div><div className="cc-l">Parcela revisada</div></div>
            <div className="calc-card"><div className="cc-n" style={{ fontSize: 18, color: "#0F7A70" }}>{fmt(r.diferenca_cents)}</div><div className="cc-l">Diferença total</div></div>
          </div>
          <div className="calc-mem"><b>Total contratado:</b> {fmt(r.total_contratado_cents)} · <b>Total revisado:</b> {fmt(r.total_revisado_cents)}<br/>Comparativo de contrato pela Tabela Price com as duas taxas. Diferença = economia ao aplicar a taxa revisada.</div>
        </div>
      )}
    </div>
  );
}

export function CalcPasep() {
  const [f, setF] = useState({ minimo: "", meses: "" });
  const [r, setR] = useState<ReturnType<typeof calcularAbonoPasep> | null>(null);
  function calc() {
    const m = paraCents(f.minimo), meses = parseInt(f.meses, 10);
    if (!m || !Number.isFinite(meses)) return;
    setR(calcularAbonoPasep(m, meses));
  }
  return (
    <div>
      <div className="calc-form">
        <div className="calc-field"><label>Salário mínimo vigente (R$)</label><input value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} placeholder="1.412,00" inputMode="decimal" /></div>
        <div className="calc-field"><label>Meses trabalhados no ano-base</label><input value={f.meses} onChange={(e) => setF({ ...f, meses: e.target.value })} placeholder="12" inputMode="numeric" /></div>
        <button className="calc-btn" onClick={calc}>Calcular</button>
      </div>
      {r && (
        <div className="calc-resultado">
          <div className="calc-cards"><div className="calc-card"><div className="cc-n">{fmt(r.abono_cents)}</div><div className="cc-l">Abono PIS/PASEP</div></div></div>
          <div className="calc-mem"><b>Base:</b> {r.base}. O abono é proporcional aos meses trabalhados (fração ≥ 15 dias conta como mês).</div>
        </div>
      )}
    </div>
  );
}
