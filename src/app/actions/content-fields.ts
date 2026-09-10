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

  // ── Seção: problema (caixa de entrada) ──
  { chave: "prob_title", rotulo: "Problema — título", padrao: "Quantas oportunidades estão escondidas na sua caixa de entrada?", multiline: true },
  { chave: "prob_lead", rotulo: "Problema — texto", padrao: "Todo dia chegam e-mails pessoais, newsletters e propaganda — misturados com tribunais, cartórios, advogados e comunicações administrativas. No meio disso, o que realmente importa passa despercebido.", multiline: true },

  // ── Seção: como funciona ──
  { chave: "como_title", rotulo: "Como funciona — título", padrao: "Quatro passos entre a sua caixa e a sua clareza.", multiline: true },

  // ── Seção: benefícios ──
  { chave: "benef_title", rotulo: "Benefícios — título", padrao: "Menos procura. Mais controle." },

  // ── Seção: estatísticas ──
  { chave: "stats_title", rotulo: "Estatísticas — título", padrao: "Imagine abrir a AXIA pela manhã e encontrar:", multiline: true },

  // ── Seção: planos ──
  { chave: "planos_title", rotulo: "Planos — título", padrao: "Escolha o plano da sua rotina." },

  // ── Seção: FAQ ──
  { chave: "faq_title", rotulo: "Dúvidas — título", padrao: "Tudo que você precisa saber." },

  // ── Seção final (CTA) ──
  { chave: "cta_title", rotulo: "Chamada final — título", padrao: "Comece a deixar a AXIA trabalhar por você.", multiline: true },
  { chave: "cta_lead", rotulo: "Chamada final — texto", padrao: "Conecte seu e-mail e veja o que estava passando despercebido.", multiline: true },

  // ── Rodapé ──
  { chave: "foot_tag", rotulo: "Rodapé — descrição", padrao: "Inteligência que conecta o que importa na sua rotina pericial.", multiline: true },
  { chave: "foot_copy", rotulo: "Rodapé — direitos", padrao: "© 2026 AXIA. Todos os direitos reservados." },
];
