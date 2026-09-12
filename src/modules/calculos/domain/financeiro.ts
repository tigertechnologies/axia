// ============================================================
// AXIA — Motor de Cálculos Financeiros (seção 16)
// Matemática DETERMINÍSTICA. Nenhuma calculadora depende de LLM.
// Valores em CENTAVOS (inteiros) para evitar erro de ponto flutuante
// na exibição; a taxa é decimal (ex.: 0.02 = 2% ao mês).
// ============================================================

export interface Parcela {
  numero: number;
  amortizacao_cents: number;
  juros_cents: number;
  prestacao_cents: number;
  saldo_cents: number;
}

export interface ResultadoTabela {
  metodo: "price" | "sac";
  parcelas: Parcela[];
  total_pago_cents: number;
  total_juros_cents: number;
  total_amortizado_cents: number;
}

const round = (x: number) => Math.round(x);

// ── TABELA PRICE (parcelas fixas) ──────────────────────────
// PMT = PV * i / (1 - (1+i)^-n)
export function tabelaPrice(principal_cents: number, taxaMensal: number, n: number): ResultadoTabela {
  if (n <= 0 || principal_cents <= 0) return vazio("price");
  const pv = principal_cents;
  let prestacao: number;
  if (taxaMensal === 0) {
    prestacao = pv / n;
  } else {
    prestacao = pv * taxaMensal / (1 - Math.pow(1 + taxaMensal, -n));
  }
  const prestacao_cents = round(prestacao);

  const parcelas: Parcela[] = [];
  let saldo = pv;
  let totalJuros = 0, totalAmort = 0, totalPago = 0;
  for (let k = 1; k <= n; k++) {
    const juros = round(saldo * taxaMensal);
    let amort = prestacao_cents - juros;
    let prest = prestacao_cents;
    // Última parcela: ajusta para zerar o saldo exatamente (evita resíduo de arredondamento).
    if (k === n) { amort = saldo; prest = amort + juros; }
    saldo = saldo - amort;
    parcelas.push({ numero: k, amortizacao_cents: amort, juros_cents: juros, prestacao_cents: prest, saldo_cents: Math.max(0, saldo) });
    totalJuros += juros; totalAmort += amort; totalPago += prest;
  }
  return { metodo: "price", parcelas, total_pago_cents: totalPago, total_juros_cents: totalJuros, total_amortizado_cents: totalAmort };
}

// ── TABELA SAC (amortização constante) ─────────────────────
// Amortização = PV / n; juros sobre o saldo; prestação decrescente.
export function tabelaSAC(principal_cents: number, taxaMensal: number, n: number): ResultadoTabela {
  if (n <= 0 || principal_cents <= 0) return vazio("sac");
  const pv = principal_cents;
  const amortBase = round(pv / n);

  const parcelas: Parcela[] = [];
  let saldo = pv;
  let totalJuros = 0, totalAmort = 0, totalPago = 0;
  for (let k = 1; k <= n; k++) {
    const juros = round(saldo * taxaMensal);
    let amort = amortBase;
    if (k === n) amort = saldo; // última zera o saldo
    const prest = amort + juros;
    saldo = saldo - amort;
    parcelas.push({ numero: k, amortizacao_cents: amort, juros_cents: juros, prestacao_cents: prest, saldo_cents: Math.max(0, saldo) });
    totalJuros += juros; totalAmort += amort; totalPago += prest;
  }
  return { metodo: "sac", parcelas, total_pago_cents: totalPago, total_juros_cents: totalJuros, total_amortizado_cents: totalAmort };
}

// ── JUROS SIMPLES ──  M = C (1 + i*n)
export function jurosSimples(principal_cents: number, taxa: number, n: number): { montante_cents: number; juros_cents: number } {
  const juros = round(principal_cents * taxa * n);
  return { montante_cents: principal_cents + juros, juros_cents: juros };
}

// ── JUROS COMPOSTOS ──  M = C (1 + i)^n
export function jurosCompostos(principal_cents: number, taxa: number, n: number): { montante_cents: number; juros_cents: number } {
  const montante = round(principal_cents * Math.pow(1 + taxa, n));
  return { montante_cents: montante, juros_cents: montante - principal_cents };
}

// ── VALOR FUTURO / VALOR PRESENTE ──
export function valorFuturo(vp_cents: number, taxa: number, n: number): number { return round(vp_cents * Math.pow(1 + taxa, n)); }
export function valorPresente(vf_cents: number, taxa: number, n: number): number { return round(vf_cents / Math.pow(1 + taxa, n)); }

function vazio(metodo: "price" | "sac"): ResultadoTabela {
  return { metodo, parcelas: [], total_pago_cents: 0, total_juros_cents: 0, total_amortizado_cents: 0 };
}

// Formata centavos como BRL para a memória de cálculo.
export function fmtCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
