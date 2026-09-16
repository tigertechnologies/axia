// Constantes de contatos (arquivo comum — Server e Client).
export const TIPOS_CONTATO = ["profissional", "advogado", "parte", "escritorio", "instituicao", "tribunal", "outro"];

export const TIPO_CONTATO_LABEL: Record<string, string> = {
  profissional: "Profissional", advogado: "Advogado", parte: "Parte",
  escritorio: "Escritório", instituicao: "Instituição", tribunal: "Tribunal/Unidade", outro: "Outro",
};

export interface Contato {
  id: string; tipo: string; nome: string; organizacao: string | null;
  email: string | null; telefone: string | null; oab: string | null;
  cidade: string | null; uf: string | null; observacoes: string | null; processo_id: string | null;
}
