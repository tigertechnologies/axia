-- ============================================================
-- AXIA — 0031: Cálculos salvos (item 19 — salvar no processo)
-- Guarda o resultado de um cálculo (Price, SAC, rescisão…) vinculado
-- a um processo, para consulta posterior na tela do processo.
-- INCREMENTAL E REVERSÍVEL. RLS por organização.
-- Rode no Supabase: SQL Editor > Run. Depende de: 0001, 0018.
-- ============================================================

create table if not exists calculos_salvos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  process_ref  text,
  processo_id  uuid references judicial_processes(id) on delete set null,
  pericia_id   uuid references pericias(id) on delete set null,
  tipo         text not null,           -- price | sac | simples | compostos | rescisao | revisional | pasep
  titulo       text not null,           -- descrição livre dada pelo médico
  entrada      jsonb not null default '{}'::jsonb,   -- parâmetros usados
  resultado    jsonb not null default '{}'::jsonb,   -- resumo do resultado
  resumo_texto text,                     -- memória de cálculo legível
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists ix_calc_processo on calculos_salvos (process_ref);
create index if not exists ix_calc_org on calculos_salvos (org_id, created_at desc);

alter table calculos_salvos enable row level security;
drop policy if exists calc_org_all on calculos_salvos;
create policy calc_org_all on calculos_salvos for all
  using (org_id in (select o.id from organizations o where o.owner_id = auth.uid()))
  with check (org_id in (select o.id from organizations o where o.owner_id = auth.uid()));
