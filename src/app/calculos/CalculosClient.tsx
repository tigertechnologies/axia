"use client";
import { useState, useMemo } from "react";
import { tabelaPrice, tabelaSAC, jurosSimples, jurosCompostos, fmtCents, type ResultadoTabela } from "@/modules/calculos/domain/financeiro";

type Metodo = "price" | "sac" | "simples" | "compostos";

// Converte "10.000,00" ou "10000" em centavos.
function paraCents(s: string): number {
  const limpo = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const v = parseFloat(limpo);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

export default function CalculosClient() {
  const [metodo, setMetodo] = useState<Metodo>("price");
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("");   // % ao mês
  const [n, setN] = useState("");
  const [calc, setCalc] = useState<{ metodo: Metodo; principal: number; taxa: number; n: number } | null>(null);

  function calcular() {
    const principal = paraCents(valor);
    const t = parseFloat(taxa.replace(",", ".")) / 100;
    const periodos = parseInt(n, 10);
    if (!principal || !Number.isFinite(t) || !periodos || periodos < 1) return;
    setCalc({ metodo, principal, taxa: t, n: periodos });
  }

  const resultado = useMemo(() => {
    if (!calc) return null;
    if (calc.metodo === "price") return { tabela: tabelaPrice(calc.principal, calc.taxa, calc.n) };
    if (calc.metodo === "sac") return { tabela: tabelaSAC(calc.principal, calc.taxa, calc.n) };
    if (calc.metodo === "simples") return { juros: jurosSimples(calc.principal, calc.taxa, calc.n) };
    return { juros: jurosCompostos(calc.principal, calc.taxa, calc.n) };
  }, [calc]);

  function baixarPDF() {
    if (!calc || !resultado) return;
    const metodoLabel = { price: "Tabela Price", sac: "Tabela SAC", simples: "Juros simples", compostos: "Juros compostos" }[calc.metodo];
    let corpo = "";
    if ("tabela" in resultado && resultado.tabela) {
      const t = resultado.tabela;
      corpo = `<table><thead><tr><th>#</th><th>Prestação</th><th>Juros</th><th>Amortização</th><th>Saldo</th></tr></thead><tbody>` +
        t.parcelas.map((p) => `<tr><td>${p.numero}</td><td>${fmtCents(p.prestacao_cents)}</td><td>${fmtCents(p.juros_cents)}</td><td>${fmtCents(p.amortizacao_cents)}</td><td>${fmtCents(p.saldo_cents)}</td></tr>`).join("") +
        `</tbody></table><p><b>Total pago:</b> ${fmtCents(t.total_pago_cents)} · <b>Total de juros:</b> ${fmtCents(t.total_juros_cents)}</p>`;
    } else if ("juros" in resultado && resultado.juros) {
      corpo = `<p><b>Montante:</b> ${fmtCents(resultado.juros.montante_cents)}</p><p><b>Juros:</b> ${fmtCents(resultado.juros.juros_cents)}</p>`;
    }
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cálculo — ${metodoLabel}</title>
      <style>*{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#10233F}body{margin:36px;line-height:1.5}
      h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #E4E9F0;padding:6px 8px;text-align:right}th{background:#F4F6FA}
      .mem{background:#F4F6FA;border:1px solid #E4E9F0;border-radius:8px;padding:12px;margin:14px 0;font-size:12.5px}
      .foot{margin-top:24px;color:#9AA7B8;font-size:11px}</style></head><body>
      <h1>${metodoLabel}</h1>
      <div class="mem"><b>Dados de entrada</b><br/>Valor: ${fmtCents(calc.principal)}<br/>Taxa: ${(calc.taxa*100).toLocaleString("pt-BR",{maximumFractionDigits:4})}% ao período<br/>Períodos: ${calc.n}</div>
      ${corpo}
      <p class="foot">Cálculo determinístico gerado pela AXIA em ${new Date().toLocaleString("pt-BR")}. Confira os parâmetros antes de usar.</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Permita pop-ups para gerar o PDF."); return; }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  const ehTabela = metodo === "price" || metodo === "sac";

  return (
    <div className="calc-wrap">
      <div className="greet" style={{ marginBottom: 16 }}>
        <div><h1>Cálculos</h1><p className="sum">Calculadoras financeiras determinísticas — Price, SAC e juros. Sem IA: matemática exata e conferível.</p></div>
      </div>

      {/* Método */}
      <div className="calc-tabs">
        {([["price","Tabela Price"],["sac","Tabela SAC"],["simples","Juros simples"],["compostos","Juros compostos"]] as [Metodo,string][]).map(([m,l]) => (
          <button key={m} className={"calc-tab" + (metodo === m ? " on" : "")} onClick={() => { setMetodo(m); setCalc(null); }}>{l}</button>
        ))}
      </div>

      {/* Entrada */}
      <div className="calc-form">
        <div className="calc-field"><label>Valor (R$)</label><input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="10.000,00" inputMode="decimal" /></div>
        <div className="calc-field"><label>Taxa (% ao período)</label><input value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="2" inputMode="decimal" /></div>
        <div className="calc-field"><label>{ehTabela ? "Nº de parcelas" : "Nº de períodos"}</label><input value={n} onChange={(e) => setN(e.target.value)} placeholder="12" inputMode="numeric" /></div>
        <button className="calc-btn" onClick={calcular}>Calcular</button>
      </div>

      {/* Resultado */}
      {resultado && calc && (
        <div className="calc-resultado">
          {"juros" in resultado && resultado.juros && (
            <div className="calc-cards">
              <div className="calc-card"><div className="cc-n">{fmtCents(resultado.juros.montante_cents)}</div><div className="cc-l">Montante</div></div>
              <div className="calc-card"><div className="cc-n">{fmtCents(resultado.juros.juros_cents)}</div><div className="cc-l">Juros</div></div>
            </div>
          )}
          {"tabela" in resultado && resultado.tabela && (
            <>
              <div className="calc-cards">
                <div className="calc-card"><div className="cc-n">{fmtCents(resultado.tabela.parcelas[0]?.prestacao_cents ?? 0)}</div><div className="cc-l">{metodo === "price" ? "Prestação fixa" : "1ª prestação"}</div></div>
                <div className="calc-card"><div className="cc-n">{fmtCents(resultado.tabela.total_pago_cents)}</div><div className="cc-l">Total pago</div></div>
                <div className="calc-card"><div className="cc-n">{fmtCents(resultado.tabela.total_juros_cents)}</div><div className="cc-l">Total de juros</div></div>
              </div>
              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table className="calc-table">
                  <thead><tr><th>#</th><th>Prestação</th><th>Juros</th><th>Amortização</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {resultado.tabela.parcelas.map((p) => (
                      <tr key={p.numero}><td>{p.numero}</td><td>{fmtCents(p.prestacao_cents)}</td><td>{fmtCents(p.juros_cents)}</td><td>{fmtCents(p.amortizacao_cents)}</td><td>{fmtCents(p.saldo_cents)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="calc-mem">
            <b>Memória de cálculo</b><br/>
            Método: {{ price: "Tabela Price (parcelas fixas)", sac: "Tabela SAC (amortização constante)", simples: "Juros simples (M = C·(1+i·n))", compostos: "Juros compostos (M = C·(1+i)ⁿ)" }[calc.metodo]}<br/>
            Valor: {fmtCents(calc.principal)} · Taxa: {(calc.taxa*100).toLocaleString("pt-BR",{maximumFractionDigits:4})}%/período · Períodos: {calc.n}
          </div>
          <button className="calc-btn ghost" onClick={baixarPDF}>Baixar PDF</button>
        </div>
      )}
    </div>
  );
}
