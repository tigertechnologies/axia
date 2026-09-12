// ============================================================
// AXIA — Domínio do Laudo (funções puras, sem DB/React)
// Estrutura de seções, placeholders e pré-preenchimento.
// ============================================================

export interface SecaoLaudo { titulo: string; texto: string }
export interface ConteudoLaudo { secoes: SecaoLaudo[] }

// Dados conhecidos que alimentam o pré-preenchimento (item 6 do comando).
export interface DadosCaso {
  nome_periciado?: string | null;
  numero_processo?: string | null;
  tribunal?: string | null;
  vara?: string | null;
  comarca?: string | null;
  data_pericia?: string | null;   // já formatada
  especialidade?: string | null;
  crm?: string | null;
  medico?: string | null;
  quesitos?: { origem: string; numero: number | null; texto: string }[];
}

// Placeholders suportados (seção 12.1 do MD).
const PLACEHOLDERS: (keyof DadosCaso)[] = [
  "nome_periciado", "numero_processo", "tribunal", "vara", "comarca",
  "data_pericia", "especialidade", "crm", "medico",
];

// Substitui {{chave}} pelos dados do caso. Onde não há dado, mantém um marcador
// visível para o médico preencher (nunca inventa — item 5/6).
export function aplicarPlaceholders(texto: string, dados: DadosCaso): string {
  let out = texto;
  for (const k of PLACEHOLDERS) {
    const val = (dados[k] as string | null | undefined) ?? "";
    const marcador = val || `[preencher: ${k.replace(/_/g, " ")}]`;
    out = out.replaceAll(`{{${k}}}`, marcador);
  }
  return out;
}

// Estrutura padrão de um laudo em branco (item: iniciar em branco).
export function laudoEmBranco(): ConteudoLaudo {
  return {
    secoes: [
      { titulo: "Identificação", texto: "" },
      { titulo: "Histórico", texto: "" },
      { titulo: "Documentos analisados", texto: "" },
      { titulo: "Exame pericial", texto: "" },
      { titulo: "Discussão", texto: "" },
      { titulo: "Conclusão", texto: "" },
      { titulo: "Resposta aos quesitos", texto: "" },
    ],
  };
}

// Pré-preenche um conteúdo (de modelo ou branco) com os dados do caso.
// A "Identificação" ganha um cabeçalho automático; os quesitos entram listados.
export function prePreencher(base: ConteudoLaudo, dados: DadosCaso): ConteudoLaudo {
  const secoes = base.secoes.map((s) => ({ titulo: s.titulo, texto: aplicarPlaceholders(s.texto, dados) }));

  // Cabeçalho de identificação (só se a seção existir e estiver vazia).
  const idIdx = secoes.findIndex((s) => /identifica/i.test(s.titulo));
  if (idIdx >= 0 && !secoes[idIdx].texto.trim()) {
    const linhas: string[] = [];
    if (dados.nome_periciado) linhas.push(`Periciando: ${dados.nome_periciado}`);
    if (dados.numero_processo) linhas.push(`Processo: ${dados.numero_processo}`);
    if (dados.tribunal) linhas.push(`Tribunal: ${dados.tribunal}`);
    if (dados.vara) linhas.push(`Vara: ${dados.vara}`);
    if (dados.comarca) linhas.push(`Comarca: ${dados.comarca}`);
    if (dados.data_pericia) linhas.push(`Data da perícia: ${dados.data_pericia}`);
    if (dados.especialidade) linhas.push(`Especialidade: ${dados.especialidade}`);
    secoes[idIdx].texto = linhas.join("\n");
  }

  // Quesitos listados (só se a seção existir e estiver vazia).
  const qIdx = secoes.findIndex((s) => /quesito/i.test(s.titulo));
  if (qIdx >= 0 && !secoes[qIdx].texto.trim() && dados.quesitos && dados.quesitos.length) {
    secoes[qIdx].texto = dados.quesitos
      .map((q) => `${q.origem}${q.numero ? " " + q.numero : ""}: ${q.texto}\nResposta: [a responder]`)
      .join("\n\n");
  }

  return { secoes };
}

// Extrai o conteúdo de um jsonb do banco para o tipo, com fallback seguro.
export function normalizaConteudo(raw: unknown): ConteudoLaudo {
  const c = raw as { secoes?: unknown };
  if (c && Array.isArray(c.secoes)) {
    return { secoes: (c.secoes as any[]).map((s) => ({ titulo: String(s?.titulo ?? ""), texto: String(s?.texto ?? "") })) };
  }
  return laudoEmBranco();
}
