// Campos editáveis do site (arquivo comum — importável por Server e Client).
// Não é "use server", então pode exportar valores além de funções.
export interface CampoConteudo { chave: string; rotulo: string; padrao: string; multiline?: boolean }

export const CAMPOS_CONTEUDO: CampoConteudo[] = [
  { chave: "hero_eyebrow", rotulo: "Herói — linha superior", padrao: "Inteligência que conecta o que importa" },
  { chave: "hero_title", rotulo: "Herói — título", padrao: "Você não precisa mais procurar", multiline: true },
  { chave: "hero_title_accent", rotulo: "Herói — título (destaque)", padrao: "o que é importante." },
  { chave: "hero_sub", rotulo: "Herói — subtítulo", padrao: "Conecte seu e-mail e deixe a AXIA identificar automaticamente nomeações, intimações, prazos, perícias e outras comunicações da sua rotina pericial.", multiline: true },
  { chave: "hero_cta_primary", rotulo: "Botão principal", padrao: "Começar agora" },
  { chave: "hero_cta_secondary", rotulo: "Botão secundário", padrao: "Ver como funciona" },
  { chave: "hero_trust", rotulo: "Linha de confiança", padrao: "Conexão segura • Criptografia • Conformidade com a LGPD" },
  { chave: "features_cap", rotulo: "Legenda da seção de recursos", padrao: "Tudo que importa, já separado" },
];
