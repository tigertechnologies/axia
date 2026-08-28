# AXIA

Central inteligente de perícias para peritos médicos. Landing + cadastro + checkout de
assinatura (Stripe) + onboarding + dashboard, sobre **Next.js + Supabase + Stripe**.

> Este repo entrega o **loop comercial completo** (visitante → plano → conta → pagamento →
> ativação por webhook → onboarding → dashboard). A ingestão de e-mail (OAuth Gmail/Outlook)
> e a classificação por IA estão *scaffolded* atrás de uma interface limpa; a dashboard nasce
> com dados de demonstração (`seedDemoData`) e é trocada pela ingestão real quando implementada.

## Stack
- **Next.js 14** (App Router, TypeScript) → deploy na Vercel
- **Supabase** → Postgres + Auth + RLS
- **Stripe** → assinatura recorrente + webhook (fonte da verdade da ativação)

---

## 1. Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor → New query** → cole `supabase/migrations/0001_init.sql` → **Run**.
   Isso cria tabelas, enums, RLS e o trigger que gera organização+profile a cada novo usuário.
3. **Authentication → Providers → Email**: habilite. Para testar rápido sem e-mail de
   confirmação, **desative "Confirm email"** (Authentication → Settings).
4. Em **Project Settings → API**, copie: `Project URL`, `anon public key`, `service_role key`.

## 2. Stripe
1. Crie conta em https://stripe.com (modo teste).
2. **Developers → API keys**: copie a `Secret key` (`sk_test_…`).
3. Não é preciso criar produtos/preços: o checkout usa `price_data` inline, com o **preço
   oficial resolvido no backend** por `plan_id` (`src/lib/plans.ts`).
4. **Webhook** (produção): Developers → Webhooks → Add endpoint →
   `https://SEU-DOMINIO/api/webhooks/stripe`, eventos:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`. Copie o `Signing secret` (`whsec_…`).

## 3. Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # só no servidor — nunca exponha
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 4. Rodar local
```bash
npm install
npm run dev
```
Para testar o webhook localmente, use a Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# use o whsec impresso como STRIPE_WEBHOOK_SECRET
```
Fluxo de teste: `/` → escolher plano → cadastro → checkout → cartão de teste
`4242 4242 4242 4242` → webhook ativa a assinatura → `/onboarding` → `/dashboard`.

## 5. GitHub + Vercel
```bash
git init && git add . && git commit -m "AXIA MVP"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/axia.git
git push -u origin main
```
Na Vercel: **New Project → importe o repo → cole as env vars** (as mesmas do `.env.local`,
com `NEXT_PUBLIC_SITE_URL` = seu domínio de produção) → Deploy. Depois cadastre o webhook do
Stripe apontando para o domínio final.

---

## Mapa do código
```
supabase/migrations/0001_init.sql   schema + RLS + trigger
src/lib/plans.ts                    catálogo de preços (fonte da verdade)
src/lib/stripe.ts                   cliente Stripe (lazy)
src/lib/supabase/*                  clients server/browser/admin + middleware
src/middleware.ts                   gate de auth + status de assinatura
src/app/page.tsx                    landing (design aprovado)
src/app/cadastro, /login            auth (Supabase)
src/app/checkout + actions.ts       ETAPA 2 (perfil) + Checkout Session (preço no backend)
src/app/checkout/sucesso            "Bem-vindo à AXIA"
src/app/api/webhooks/stripe         ativação assinada e idempotente (fonte da verdade)
src/app/onboarding + actions.ts     wizard 5 passos + seed de demonstração
src/app/dashboard/*                 dashboard lendo do Supabase (RLS por organização)
```

## Próximos milestones (scaffolded)
- Ingestão de e-mail: OAuth Gmail/Outlook → fila → classificação IA → `communications`.
- Área de assinatura (upgrade/downgrade/cancelamento) via Stripe Billing Portal.
- Cupons, preço fundador (o catálogo já suporta preços legados), analytics de funil.

## Segurança / versão do Next
Este projeto usa **Next 14.2.35** (última correção da linha 14.2) para um build estável hoje.
O `npm audit` recomenda a linha **Next 16**, que corrige avisos adicionais mas é um *major*
com mudanças (ex.: `cookies()`/`headers()` assíncronos). Para atualizar depois:
```bash
npm i next@latest react@latest react-dom@latest
```
e ajuste `src/lib/supabase/server.ts` para `const cookieStore = await cookies()`.
