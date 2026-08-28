-- ============================================================
-- AXIA — schema inicial
-- Rode no Supabase: SQL Editor > cole este arquivo > Run
-- (ou via `supabase db push` se usar a CLI)
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────
do $$ begin
  create type subscription_status as enum
    ('pending_subscription','trialing','active','past_due','unpaid','canceled','suspended','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_category as enum
    ('nomeacao','prazo','intimacao','honorarios','pericia','esclarecimento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type honorario_status as enum ('proposto','aprovado','depositado','recebido');
exception when duplicate_object then null; end $$;

-- ── Organizations (1 por usuário no MVP) ────────────────────
create table if not exists organizations (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null default 'Minha organização',
  subscription_status subscription_status not null default 'pending_subscription',
  plan_id             text,
  stripe_customer_id  text,
  created_at          timestamptz not null default now(),
  unique(owner_id)
);

-- ── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  org_id               uuid not null references organizations(id) on delete cascade,
  nome                 text,
  sobrenome            text,
  telefone             text,
  crm                  text,
  uf                   text,
  especialidade        text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ── Subscriptions ───────────────────────────────────────────
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references organizations(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  plan_id                text not null,
  status                 subscription_status not null default 'active',
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ── Webhook events (idempotência) ───────────────────────────
create table if not exists webhook_events (
  id           text primary key,        -- event.id do Stripe
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ── Dashboard: comunicações classificadas ───────────────────
create table if not exists communications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  category    comm_category not null,
  sender      text,
  subject     text not null,
  snippet     text,
  process_ref text,
  received_at timestamptz not null default now(),
  validated   boolean not null default false
);

create table if not exists pericias (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  titulo      text not null,
  local       text,
  process_ref text,
  scheduled_at timestamptz not null
);

create table if not exists prazos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  titulo      text not null,
  process_ref text,
  due_date    date not null,
  status      text not null default 'a_validar'  -- a_validar | confirmado | urgente
);

create table if not exists honorarios (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  process_ref text,
  amount_cents integer not null,
  status      honorario_status not null default 'proposto'
);

-- ── Trigger: cria organização + profile ao criar usuário ────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare new_org uuid;
begin
  insert into organizations (owner_id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'nome','Minha') || ' — AXIA')
    returning id into new_org;

  insert into profiles (id, org_id, nome, sobrenome, telefone)
    values (
      new.id, new_org,
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'sobrenome',
      new.raw_user_meta_data->>'telefone'
    );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Helper: org do usuário logado ───────────────────────────
create or replace function current_org()
returns uuid language sql stable security definer set search_path = public as $$
  select id from organizations where owner_id = auth.uid()
$$;

-- ── RLS ─────────────────────────────────────────────────────
alter table organizations  enable row level security;
alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table communications  enable row level security;
alter table pericias        enable row level security;
alter table prazos          enable row level security;
alter table honorarios      enable row level security;

create policy "own org"        on organizations for select using (owner_id = auth.uid());
create policy "own org upd"    on organizations for update using (owner_id = auth.uid());
create policy "own profile"    on profiles      for select using (id = auth.uid());
create policy "own profile upd" on profiles     for update using (id = auth.uid());
create policy "own subs"       on subscriptions for select using (org_id = current_org());

create policy "own comms"      on communications for select using (org_id = current_org());
create policy "own comms upd"  on communications for update using (org_id = current_org());
create policy "own pericias"   on pericias      for select using (org_id = current_org());
create policy "own prazos"     on prazos        for select using (org_id = current_org());
create policy "own honorarios" on honorarios    for select using (org_id = current_org());

-- NB: escritas de billing (subscriptions/organizations.status) são feitas
-- pelo webhook usando a service role key, que ignora RLS.
