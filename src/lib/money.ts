// Parser monetário robusto (T11). Interpreta o separador decimal como o ÚLTIMO
// separador quando seguido de 1–2 dígitos; caso contrário, trata os separadores
// como milhar. Evita o bug de "1500.50" virar 150050.
//
// Exemplos:
//   "2.400,00" -> 240000    "1.500" -> 150000     "1500.50" -> 150050
//   "1500,5"   -> 150050    "1880"  -> 188000     "R$ 1.234,56" -> 123456
export function parseBRLToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim().replace(/r\$\s*/i, "").replace(/\s/g, "");
  s = s.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;

  let intPart = s.replace(/[.,]/g, "");
  let decPart = "";

  if (/[.,]/.test(s)) {
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const after = s.slice(lastSep + 1);
    if (after.length === 1 || after.length === 2) {   // separador decimal
      intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
      decPart = after;
    } // senão: todos os separadores são milhar (intPart já sem separadores)
  }

  const cents = (parseInt(intPart || "0", 10) * 100) + parseInt((decPart + "00").slice(0, 2), 10);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}
