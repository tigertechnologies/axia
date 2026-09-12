// ============================================================
// AXIA — Auditor determinístico do laudo (seção 13.1)
// Sem IA: checagens objetivas. Funções puras, testáveis.
// Resultado: OK | Atenção | Revisar (nunca "juridicamente correto").
// ============================================================

import type { ConteudoLaudo } from "./laudoModel";

export type Severidade = "ok" | "atencao" | "revisar";

export interface Achado {
  severidade: Severidade;
  codigo: string;      // estável (seção 22 do complemento)
  mensagem: string;
  secao?: string;
}

export interface ResultadoAuditoria {
  nivel: Severidade;   // pior severidade encontrada
  achados: Achado[];
  totalRevisar: number;
  totalAtencao: number;
}

// Regex de placeholders não resolvidos: {{...}} ou [preencher: ...] ou [a responder]
const PLACEHOLDER_BRACES = /\{\{[^}]+\}\}/g;
const PLACEHOLDER_PREENCHER = /\[preencher:[^\]]*\]/gi;
const PLACEHOLDER_RESPONDER = /\[a responder\]/gi;

export function auditarLaudo(conteudo: ConteudoLaudo, opts?: { quesitosTotais?: number; quesitosRespondidos?: number }): ResultadoAuditoria {
  const achados: Achado[] = [];

  for (const s of conteudo.secoes) {
    const texto = s.texto ?? "";

    // Placeholder de dado não preenchido → REVISAR (pode faltar dado essencial)
    const braces = texto.match(PLACEHOLDER_BRACES);
    if (braces) achados.push({ severidade: "revisar", codigo: "PLACEHOLDER_NAO_RESOLVIDO", mensagem: `Placeholder não substituído (${braces.length}) na seção "${s.titulo}".`, secao: s.titulo });

    const preencher = texto.match(PLACEHOLDER_PREENCHER);
    if (preencher) achados.push({ severidade: "revisar", codigo: "CAMPO_A_PREENCHER", mensagem: `Há campo(s) marcado(s) como "[preencher]" na seção "${s.titulo}".`, secao: s.titulo });

    const responder = texto.match(PLACEHOLDER_RESPONDER);
    if (responder) achados.push({ severidade: "revisar", codigo: "QUESITO_SEM_RESPOSTA", mensagem: `Há ${responder.length} quesito(s) com "[a responder]".`, secao: s.titulo });

    // Seção "Conclusão" vazia → REVISAR (ausência de conclusão, seção 13.1)
    if (/conclus/i.test(s.titulo) && !texto.trim()) {
      achados.push({ severidade: "revisar", codigo: "CONCLUSAO_VAZIA", mensagem: "A seção de Conclusão está vazia.", secao: s.titulo });
    }
    // Outras seções vazias → ATENÇÃO
    else if (!texto.trim()) {
      achados.push({ severidade: "atencao", codigo: "SECAO_VAZIA", mensagem: `A seção "${s.titulo}" está vazia.`, secao: s.titulo });
    }
  }

  // Progresso de quesitos, se informado.
  if (opts && typeof opts.quesitosTotais === "number" && opts.quesitosTotais > 0) {
    const resp = opts.quesitosRespondidos ?? 0;
    if (resp < opts.quesitosTotais) {
      achados.push({ severidade: "revisar", codigo: "QUESITOS_PENDENTES", mensagem: `${resp} de ${opts.quesitosTotais} quesitos respondidos.` });
    }
  }

  const totalRevisar = achados.filter((a) => a.severidade === "revisar").length;
  const totalAtencao = achados.filter((a) => a.severidade === "atencao").length;
  const nivel: Severidade = totalRevisar > 0 ? "revisar" : totalAtencao > 0 ? "atencao" : "ok";

  return { nivel, achados, totalRevisar, totalAtencao };
}
