-- ============================================================
-- AXIA — 0005: idempotência robusta do webhook Stripe (A13 / Etapa 5)
-- Rode no Supabase: SQL Editor > New query > cole > Run
-- ============================================================

-- Marca se o evento já foi processado com sucesso.
-- Assim: duplicata só é ignorada quando processed=true; se um evento ficou
-- pela metade (processed=false), uma nova entrega REPROCESSA (as escritas são
-- idempotentes), em vez de perder o evento.
alter table webhook_events add column if not exists processed boolean not null default false;
