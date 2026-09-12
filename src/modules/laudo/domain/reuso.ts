// ============================================================
// AXIA — Reutilização de laudo e "Salvar como modelo"
// (seções 12.2 e 12.3). Funções puras, testáveis.
// ============================================================

import type { ConteudoLaudo, DadosCaso } from "./laudoModel";

// Ao "Salvar como modelo": sugere trocar os dados específicos do caso pelos
// placeholders correspondentes, para o modelo ficar reutilizável (seção 12.2).
// NÃO altera o laudo original — gera uma cópia do conteúdo já com placeholders.
export function converterParaModelo(conteudo: ConteudoLaudo, dados: DadosCaso): ConteudoLaudo {
  const mapa: [string | null | undefined, string][] = [
    [dados.nome_periciado, "{{nome_periciado}}"],
    [dados.numero_processo, "{{numero_processo}}"],
    [dados.tribunal, "{{tribunal}}"],
    [dados.vara, "{{vara}}"],
    [dados.comarca, "{{comarca}}"],
    [dados.data_pericia, "{{data_pericia}}"],
    [dados.medico, "{{medico}}"],
    [dados.crm, "{{crm}}"],
  ];
  const trocar = (t: string) => {
    let out = t;
    for (const [valor, ph] of mapa) {
      if (valor && valor.trim().length >= 3) {
        // substitui o valor literal pelo placeholder (case-insensitive, valor exato)
        out = out.split(valor).join(ph);
      }
    }
    return out;
  };
  return { secoes: conteudo.secoes.map((s) => ({ titulo: s.titulo, texto: trocar(s.texto) })) };
}

// Ao reutilizar um laudo como base para OUTRO caso: detecta trechos que ainda
// parecem pertencer ao caso ANTERIOR (seção 12.3), para o médico revisar.
// Determinístico: procura o nome/processo/dados do caso anterior no texto.
export interface DadoResidual { valor: string; tipo: string; secao: string }

export function detectarDadosResiduais(conteudo: ConteudoLaudo, dadosAnteriores: DadosCaso): DadoResidual[] {
  const alvos: [string | null | undefined, string][] = [
    [dadosAnteriores.nome_periciado, "nome do periciado anterior"],
    [dadosAnteriores.numero_processo, "número do processo anterior"],
    [dadosAnteriores.tribunal, "tribunal anterior"],
    [dadosAnteriores.vara, "vara anterior"],
    [dadosAnteriores.comarca, "comarca anterior"],
  ];
  const achados: DadoResidual[] = [];
  for (const s of conteudo.secoes) {
    for (const [valor, tipo] of alvos) {
      if (valor && valor.trim().length >= 3 && s.texto.includes(valor)) {
        achados.push({ valor, tipo, secao: s.titulo });
      }
    }
  }
  return achados;
}
