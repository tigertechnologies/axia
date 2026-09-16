// ============================================================
// AXIA — Cálculos periciais: Trabalhista, Revisional, PASEP
// Matemática DETERMINÍSTICA (sem IA). Valores em CENTAVOS.
// Base: regras gerais da CLT para verbas rescisórias. NÃO substitui
// a conferência do perito — é uma ferramenta de apoio ao cálculo.
// ============================================================

const round = (x: number) => Math.round(x);

// ── VERBAS RESCISÓRIAS (dispensa sem justa causa) ──────────
export interface EntradaRescisao {
  salario_cents: number;        // último salário mensal
  admissao: string;             // ISO (yyyy-mm-dd)
  demissao: string;             // ISO
  ferias_vencidas: boolean;     // tem período de férias vencidas não gozadas?
  saldo_fgts_cents: number;     // saldo de FGTS depositado (para a multa de 40%)
  aviso_indenizado: boolean;    // aviso prévio indenizado pelo empregador?
}
export interface VerbaLinha { rubrica: string; valor_cents: number; base: string }
export interface ResultadoRescisao { verbas: VerbaLinha[]; total_cents: number }

function mesesEntre(ini: Date, fim: Date): number {
  return (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
}
// Meses trabalhados no ano da rescisão para 13º e férias proporcionais.
// Regra dos 15 dias: fração igual ou superior a 15 dias conta como mês inteiro.
function mesesProporcionais(ini: Date, fim: Date): number {
  let meses = fim.getMonth() - ini.getMonth() + (fim.getMonth() < ini.getMonth() ? 12 : 0);
  // considerando o ano vigente da rescisão
  const inicioAnoRef = new Date(fim.getFullYear(), 0, 1);
  const base = ini > inicioAnoRef ? ini : inicioAnoRef;
  meses = fim.getMonth() - base.getMonth();
  if (fim.getDate() >= 15) meses += 1;
  return Math.max(0, Math.min(12, meses));
}

export function calcularRescisao(e: EntradaRescisao): ResultadoRescisao {
  const verbas: VerbaLinha[] = [];
  const sal = e.salario_cents;
  const adm = new Date(e.admissao + "T00:00:00");
  const dem = new Date(e.demissao + "T00:00:00");
  const diaDemissao = dem.getDate();

  // Saldo de salário: dias trabalhados no mês da demissão.
  const saldoDias = diaDemissao;
  const saldoSalario = round(sal / 30 * saldoDias);
  verbas.push({ rubrica: "Saldo de salário", valor_cents: saldoSalario, base: `${saldoDias} dia(s) × salário/30` });

  // Aviso prévio indenizado: 30 dias + 3 dias por ano trabalhado (máx. 90).
  if (e.aviso_indenizado) {
    const anos = Math.floor(mesesEntre(adm, dem) / 12);
    const diasAviso = Math.min(90, 30 + anos * 3);
    const aviso = round(sal / 30 * diasAviso);
    verbas.push({ rubrica: "Aviso prévio indenizado", valor_cents: aviso, base: `${diasAviso} dias` });
  }

  // 13º proporcional: 1/12 por mês trabalhado no ano.
  const meses13 = mesesProporcionais(adm, dem);
  const decimo = round(sal / 12 * meses13);
  verbas.push({ rubrica: "13º salário proporcional", valor_cents: decimo, base: `${meses13}/12 avos` });

  // Férias proporcionais + 1/3.
  const mesesFerias = mesesProporcionais(adm, dem);
  const feriasProp = round(sal / 12 * mesesFerias);
  const tercoProp = round(feriasProp / 3);
  verbas.push({ rubrica: "Férias proporcionais", valor_cents: feriasProp, base: `${mesesFerias}/12 avos` });
  verbas.push({ rubrica: "1/3 sobre férias proporcionais", valor_cents: tercoProp, base: "1/3 constitucional" });

  // Férias vencidas + 1/3 (se houver).
  if (e.ferias_vencidas) {
    const terco = round(sal / 3);
    verbas.push({ rubrica: "Férias vencidas", valor_cents: sal, base: "período completo" });
    verbas.push({ rubrica: "1/3 sobre férias vencidas", valor_cents: terco, base: "1/3 constitucional" });
  }

  // Multa de 40% do FGTS.
  if (e.saldo_fgts_cents > 0) {
    const multa = round(e.saldo_fgts_cents * 0.4);
    verbas.push({ rubrica: "Multa de 40% do FGTS", valor_cents: multa, base: "40% sobre o saldo" });
  }

  const total = verbas.reduce((s, v) => s + v.valor_cents, 0);
  return { verbas, total_cents: total };
}

// ── REVISIONAL (comparação de juros contratado × legal) ────
// Recalcula o total pago com uma taxa diferente (ex.: teto legal) e
// mostra a diferença — típico em ações revisionais de contrato.
export interface ResultadoRevisional {
  total_contratado_cents: number;
  total_revisado_cents: number;
  diferenca_cents: number;
  parcela_contratada_cents: number;
  parcela_revisada_cents: number;
}
function pmt(pv: number, i: number, n: number): number {
  if (i === 0) return pv / n;
  return pv * i / (1 - Math.pow(1 + i, -n));
}
export function calcularRevisional(principal_cents: number, taxaContratada: number, taxaRevisada: number, n: number): ResultadoRevisional {
  const pmtC = round(pmt(principal_cents, taxaContratada, n));
  const pmtR = round(pmt(principal_cents, taxaRevisada, n));
  const totalC = pmtC * n;
  const totalR = pmtR * n;
  return {
    total_contratado_cents: totalC, total_revisado_cents: totalR,
    diferenca_cents: totalC - totalR,
    parcela_contratada_cents: pmtC, parcela_revisada_cents: pmtR,
  };
}

// ── PASEP/PIS (abono salarial) ─────────────────────────────
// Abono = (salário mínimo / 12) × meses trabalhados no ano-base.
export function calcularAbonoPasep(salarioMinimo_cents: number, mesesTrabalhados: number): { abono_cents: number; base: string } {
  const meses = Math.max(0, Math.min(12, Math.round(mesesTrabalhados)));
  const abono = round(salarioMinimo_cents / 12 * meses);
  return { abono_cents: abono, base: `${meses}/12 do salário mínimo` };
}
