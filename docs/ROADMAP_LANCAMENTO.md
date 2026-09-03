# AXIA — ROADMAP DE LANÇAMENTO

## Concluído (loop comercial + app funcional + correções de segurança)
- Landing, cadastro, login, checkout (preço no backend), webhook Stripe, onboarding, dashboard.
- Todas as telas do menu construídas e navegáveis, lendo do Supabase com RLS por organização.
- Ações reais: validar, confirmar prazo, avançar honorário, arquivar, criação manual.
- Detalhe de processo, busca global.
- Ingestão por colagem + endpoint de encaminhamento (Postmark).
- **Lote de segurança (A03–A06, A09–A14, A17):** ver MATRIZ_REQUISITOS.md.

## Próximas etapas (ordem sugerida por valor/risco)
1. **Aplicar 0004_seguranca.sql** (obrigatório antes de usar em produção).
2. **IA real** (A02) — depende de provedor + chave paga do titular. Troca no seam `classifyEmail`.
3. **Ingestão automática validada** (A01) — testar encaminhamento real (Postmark) e depois OAuth Gmail/Outlook (verificação Google/MS).
4. **Alertas** (A08) — infra de e-mail transacional + push; corrigir texto do onboarding enquanto não houver.
5. **Conta completa** (A15) — recuperação/troca de senha, exclusão de conta (requer e-mail transacional).
6. **Equipe/Office** (A16) — membros, convites, papéis, limites por plano no servidor.
7. **Apps móveis** (A18) — Expo/React Native, builds, testes em device.
8. **Testes automatizados** (T01–T18) — regressões de data (A03–A05) primeiro.
9. **Conformidade** — revisão jurídica de termos/privacidade; App Privacy/Data Safety.
10. **Piloto** (10–20 peritos) — só após controles de dados reais.

## Bloqueios externos (não dependem de código)
Verificação OAuth (Google/MS), contas Apple/Google Play, revisão jurídica, decisão de provedor de IA, ativação do Billing Portal no Stripe.
