# AXIA — MATRIZ DE REQUISITOS (A01–A18)

Estados: ✅ implementado nesta base · 🟡 parcial · ⛔ pendente/bloqueado externamente.
Esta matriz reflete o estado do repositório de desenvolvimento, não homologação de produção.

| ID | Achado | Estado | O que foi feito / o que falta | Evidência |
|----|--------|--------|-------------------------------|-----------|
| A01 | Conectores Gmail/Outlook não existem | ⛔ | OAuth Gmail + Microsoft Graph é etapa grande e **bloqueada por verificação do Google/Microsoft** (semanas). Foi entregue o caminho de **encaminhamento** (endpoint `/api/inbound/email` + Postmark) como alternativa explícita para validar antes de investir. | `src/app/api/inbound/email/route.ts` |
| A02 | classify.ts é regras, não IA | 🟡 | Seam `classifyEmail()` pronto; classificador por regras funciona. IA real depende de **decisão de provedor + chave paga do titular**. | `src/lib/classify.ts` |
| A03 | "15 dias úteis / venc. 30/09" deu data errada | ✅ | Extração de data reescrita: só aceita **vencimento explícito e válido**; não converte dias úteis em corridos; não usa a data de análise como termo inicial. | `src/lib/classify.ts` (extractDueDate) |
| A04 | 31/02/2026 aceito | ✅ | Validação de calendário (round-trip UTC) rejeita datas impossíveis → prazo fica pendente de confirmação. | `src/lib/classify.ts` (validDate) |
| A05 | Uma mensagem = um só evento | ✅ | Data e valor são extraídos **sempre**; nomeação com prazo/honorário cria os múltiplos eventos. | `classify.ts`, `actions/ingest.ts`, `inbound/email/route.ts` |
| A06 | "Confiança %" é heurística | ✅ | Campo renomeado para `signal` + `needs_review=true`; UI não mostra mais "% de confiança", e sim "requer sua revisão". | `classify.ts`, `inbox/AnalyzeEmail.tsx` |
| A07 | seedDemoData polui conta real | 🟡 | Linhas de demo agora marcadas `is_demo=true` (origem identificável). Falta badge visual e opção de limpar. | `0004_seguranca.sql`, `onboarding/actions.ts` |
| A08 | Onboarding diz "alertas ativos" sem infra | ⛔ | Push/e-mail transacional (registro de device, filas, consentimento) é etapa de infra ainda não construída. Onboarding não deve afirmar "ativo" — ajuste de texto pendente. | — |
| A09 | Faltavam políticas INSERT/UPDATE (RLS) | ✅ | INSERT/UPDATE por organização adicionados nos Lotes 2/3 + `pericias upd` agora. | `0002`, `0003`, `0004` |
| A10 | "own org upd" permitia mudar cobrança | ✅ | Trigger `guard_org_sensitive` bloqueia usuário de alterar plan_id/subscription_status/stripe_customer_id/owner_id; escritas de cobrança via service role. Guard de perfil impede troca de org_id/id. | `0004_seguranca.sql`, `checkout/actions.ts` |
| A11 | webhook_events sem RLS | ✅ | RLS ativada (sem policies = só service role). | `0004_seguranca.sql` |
| A12 | Colunas archived/paid_at ausentes | ✅ | Criadas (0002) + reforço idempotente (0004). | `0002`, `0004` |
| A13 | Webhook Stripe trata erro como duplicidade | ✅ | Só código 23505 é duplicata; outros erros → HTTP 500 para reenvio; escrita de evento verificada. | `api/webhooks/stripe/route.ts` |
| A14 | Sucesso afirma "ativa" sem checar | ✅ | Página consulta `subscription_status` real; mostra "aguardando confirmação" quando não ativa. | `checkout/sucesso/page.tsx` |
| A15 | Falta cancelar/plano/senha/exclusão; /configuracoes inexistente | 🟡 | `/configuracoes` criada com **gerenciar assinatura** (Portal Stripe: cancelar/trocar plano/cartão). Troca de senha, exclusão de conta e recuperação dependem de **e-mail transacional configurado**. | `configuracoes/*` |
| A16 | Office sem membros/convites/papéis | ⛔ | Multiusuário/equipe (membros, convites, papéis, limites por plano) não implementado. Escopo grande; decisão comercial + modelagem. | — |
| A17 | /privacidade e /termos = 404 | ✅ | Páginas criadas com conteúdo honesto (sem promessas inventadas). Revisão jurídica pendente. | `privacidade/page.tsx`, `termos/page.tsx` |
| A18 | Sem app móvel / testes / política Next | ⛔ | Apps Android/iOS (Expo/RN), suíte de testes e revisão de versão do Next são etapas próprias, não iniciadas aqui. | — |

## Dependências que exigem AÇÃO DO TITULAR (não executáveis por mim)
| Ação | Plataforma | Por quê | Custo |
|------|-----------|---------|-------|
| Rodar `0004_seguranca.sql` | Supabase | Aplica correções de segurança A09–A12 | Grátis |
| Decidir provedor de IA + gerar chave | Anthropic/OpenAI/Google | Habilitar A02 (IA real) | Pago por uso |
| Ativar Billing Portal | Stripe | Fazer A15 (gerenciar assinatura) funcionar | Grátis |
| Verificação OAuth | Google/Microsoft | A01 (conectores nativos) | Grátis, análise ~semanas |
| Contas de desenvolvedor | Apple/Google Play | A18 (apps) | Pago (taxas) |
| Revisão jurídica | Advogado/DPO | A17/A10 (LGPD, termos) | Externo |
