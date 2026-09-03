-- ============================================================
-- AXIA — 0004: segurança e integridade (A09, A10, A11, A12, A07)
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run
-- ============================================================

-- A11 — webhook_events sem RLS: ativa (sem policies = só service role acessa)
alter table webhook_events enable row level security;

-- A12 — garante colunas usadas por state.ts (idempotente)
alter table communications add column if not exists archived boolean not null default false;
alter table honorarios     add column if not exists paid_at   timestamptz;

-- A07 — marca origem de dados de demonstração (não apaga histórico; identifica)
alter table communications add column if not exists is_demo boolean not null default false;
alter table pericias        add column if not exists is_demo boolean not null default false;
alter table prazos          add column if not exists is_demo boolean not null default false;
alter table honorarios      add column if not exists is_demo boolean not null default false;

-- A09 — faltava política de UPDATE em pericias
do $$ begin
  create policy "own pericias upd" on pericias for update using (org_id = current_org());
exception when duplicate_object then null; end $$;

-- A10 — impede o USUÁRIO de alterar cobrança/identidade da organização.
-- Escritas de cobrança devem vir do servidor (service role, onde auth.uid() é null).
create or replace function guard_org_sensitive()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then  -- contexto de usuário logado
    if new.plan_id             is distinct from old.plan_id
       or new.subscription_status is distinct from old.subscription_status
       or new.stripe_customer_id  is distinct from old.stripe_customer_id
       or new.owner_id            is distinct from old.owner_id then
      raise exception 'AXIA: alteração de cobrança/identidade da organização não é permitida pelo usuário';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_org on organizations;
create trigger trg_guard_org before update on organizations
  for each row execute function guard_org_sensitive();

-- A10 — impede o usuário de "trocar de organização" alterando vínculos do profile
create or replace function guard_profile_sensitive()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id or new.org_id is distinct from old.org_id then
      raise exception 'AXIA: alteração de vínculo do perfil não é permitida';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile on profiles;
create trigger trg_guard_profile before update on profiles
  for each row execute function guard_profile_sensitive();
