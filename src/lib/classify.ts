// ============================================================
// Motor de classificação de e-mails da AXIA.
// Este é o "seam": a action chama classifyEmail() sem saber se
// por trás está o classificador por regras (demo, grátis) ou a IA.
// Para plugar IA depois, basta trocar a implementação de classifyEmail.
// ============================================================

export type CommCategory = "nomeacao" | "prazo" | "intimacao" | "honorarios" | "pericia" | "esclarecimento";

export interface Classification {
  category: CommCategory;
  sender: string | null;
  subject: string;
  snippet: string;
  process_ref: string | null;
  due_date: string | null;    // YYYY-MM-DD
  amount_cents: number | null;
  confidence: number;         // 0..1
  engine: "regras" | "ia";
}

// ── extração auxiliar ───────────────────────────────────────
function extractProcess(text: string): string | null {
  const cnj = text.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/);
  if (cnj) return cnj[0];
  const loose = text.match(/\bproc(?:esso)?\.?\s*(?:n[ºo°.]?\s*)?([\d.\-\/]{4,})/i);
  if (loose) return loose[1].replace(/[.\-\/]+$/, "");
  const anyNum = text.match(/\b(\d{5,})\b/);
  return anyNum ? anyNum[1] : null;
}

function extractSender(text: string): string | null {
  const court = text.match(/\b(TJ[A-Z]{2}|TRF-?\d|TRT-?\d|STJ|STF|TST)\b/);
  if (court) return court[0].replace("-", "");
  const vara = text.match(/\b\d{0,2}[ªa]?\s*Vara[^\n,.;]{0,40}/i);
  if (vara) return vara[0].trim();
  const de = text.match(/(?:^|\n)\s*(?:de|remetente)\s*:\s*([^\n]{2,60})/i);
  if (de) return de[1].trim();
  return null;
}

function extractAmount(text: string): number | null {
  const m = text.match(/R\$\s?([\d.]+,\d{2})/);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(/\./g, "").replace(",", ".")) * 100);
}

function extractDueDate(text: string): string | null {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  // "em N dias" / "N dias corridos/úteis"
  const dias = text.match(/(\d{1,3})\s*dias/i);
  if (dias) { const d = new Date(); d.setDate(d.getDate() + parseInt(dias[1])); return iso(d); }
  // data dd/mm/aaaa
  const data = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (data) return `${data[3]}-${data[2]}-${data[1]}`;
  return null;
}

const RULES: { cat: CommCategory; kws: RegExp; weight: number }[] = [
  { cat: "nomeacao", kws: /nomea[çc]|perito nomeado|indica[çc][aã]o do perito|encargo de perito/i, weight: 3 },
  { cat: "pericia", kws: /per[íi]cia|agendament|data da per[íi]cia|designad|comparecer/i, weight: 2 },
  { cat: "prazo", kws: /prazo|dias corridos|dias [úu]teis|manifest|entrega de laudo|apresenta[çc][aã]o do laudo/i, weight: 2 },
  { cat: "honorarios", kws: /honor[áa]rio|arbitrad|dep[óo]sito|levantamento|R\$\s?\d/i, weight: 2 },
  { cat: "intimacao", kws: /intima[çc]|cite-se|intime-se|notifica[çc]/i, weight: 2 },
  { cat: "esclarecimento", kws: /esclarecim|esclarecer|impugna[çc]|quesito suplementar/i, weight: 1 },
];

const LABEL: Record<CommCategory, string> = {
  nomeacao: "Nova nomeação", prazo: "Prazo", intimacao: "Intimação",
  honorarios: "Honorários", pericia: "Perícia", esclarecimento: "Esclarecimento",
};

// ── classificador por regras (demo, sem custo) ──────────────
export function classifyByRules(text: string): Classification {
  const scores = RULES.map((r) => ({ cat: r.cat, score: (text.match(new RegExp(r.kws, "gi"))?.length ?? 0) * r.weight }));
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const category: CommCategory = top.score > 0 ? top.cat : "esclarecimento";
  const totalHits = scores.reduce((s, x) => s + x.score, 0) || 1;
  const confidence = Math.min(0.95, 0.4 + (top.score / totalHits) * 0.5);

  const firstLine = (text.split("\n").find((l) => l.trim().length > 0) ?? text).trim();
  const subject = firstLine.slice(0, 120);

  return {
    category,
    sender: extractSender(text),
    subject: subject || `Comunicação (${LABEL[category]})`,
    snippet: `A AXIA classificou como “${LABEL[category]}” pelo conteúdo.`,
    process_ref: extractProcess(text),
    due_date: (category === "prazo" || category === "intimacao") ? extractDueDate(text) : null,
    amount_cents: category === "honorarios" ? extractAmount(text) : null,
    confidence,
    engine: "regras",
  };
}

// Seam: hoje aponta para regras. Ao plugar IA, trocar aqui.
export async function classifyEmail(text: string): Promise<Classification> {
  return classifyByRules(text);
}

export { LABEL as CATEGORY_LABEL };
