// Constantes de equipe (arquivo comum — importável por Server e Client).
// Não é "use server", então pode exportar valores além de funções.
export const PAPEIS = ["medico", "assistente", "administrativo", "financeiro", "revisor", "leitura"];

export const PAPEL_LABEL: Record<string, string> = {
  proprietario: "Proprietário", medico: "Médico perito", assistente: "Assistente",
  administrativo: "Administrativo", financeiro: "Financeiro", revisor: "Revisor", leitura: "Somente leitura",
};

export interface Membro {
  id: string | null; user_id: string | null; papel: string; status: string;
  email: string | null; convidado_email: string | null; ehDono: boolean;
}
