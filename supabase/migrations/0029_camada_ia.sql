-- ============================================================
-- AXIA — 0029: Camada de IA (item 13 — controle de custo)
-- Prepara o registro de uso da IA: tokens, custo, função, org.
-- A IA só funciona quando a chave (env) existir; esta tabela
-- registra cada chamada para franquia/limite por plano.
-- INCREMENTAL E REVERSÍVEL. RLS por organização.
-- Rode no Supabase: SQL Editor > Run. Depende de: 0001.
-- ============================================================

create table if not exists ia_uso (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  funcao        text not null,           -- laudo | quesitos | classificacao | resumo | chat | analise_risco | ...
  modelo        text,                    -- gpt-4o | claude-... (registrado, não o segredo)
  tokens_in     int not null default 0,
  tokens_out    int not null default 0,
  custo_cents   int not null default 0,  -- custo estimado da chamada
  status        text not null default 'ok',  -- ok | erro | bloqueado_limite
  cache_hit     boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists ix_ia_org on ia_uso (org_id, created_at desc);
create index if not exists ix_ia_org_mes on ia_uso (org_id, funcao);

alter table ia_uso enable row level security;
drop policy if exists ia_uso_org on ia_uso;
create policy ia_uso_org on ia_uso for all
  using (org_id in (select o.id from organizations o where o.owner_id = auth.uid()))
  with check (org_id in (select o.id from organizations o where o.owner_id = auth.uid()));

-- Cache de respostas de IA (por hash do prompt) — evita recomputar e reduz custo.
create table if not exists ia_cache (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  prompt_hash   text not null,           -- sha256 do prompt normalizado
  funcao        text not null,
  resposta      jsonb not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists uix_ia_cache on ia_cache (org_id, prompt_hash, funcao);

alter table ia_cache enable row level security;
drop policy if exists ia_cache_org on ia_cache;
create policy ia_cache_org on ia_cache for all
  using (org_id in (select o.id from organizations o where o.owner_id = auth.uid()))
  with check (org_id in (select o.id from organizations o where o.owner_id = auth.uid()));

-- Uso do mês por organização (para franquia/limite por plano — item 13).
create or replace function ia_uso_mes(p_org uuid)
returns table(total_chamadas bigint, custo_total_cents bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::bigint, coalesce(sum(custo_cents),0)::bigint
  from ia_uso
  where org_id = p_org
    and created_at >= date_trunc('month', now())
    and status = 'ok';
$$;
