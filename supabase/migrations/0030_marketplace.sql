-- ============================================================
-- AXIA — 0030: Marketplace de Peritos (diretório público)
-- Perfil profissional do perito para ser encontrado por
-- especialidade/região. SEM pagamento/comissão/escrow (o documento
-- mestre pede assim nesta fase). Só diretório.
-- INCREMENTAL E REVERSÍVEL. Rode no Supabase: SQL Editor > Run.
-- Depende de: 0001.
-- ============================================================

create table if not exists perito_perfil (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  nome           text not null,
  crm            text,
  uf_crm         text,
  rqe            text,                    -- registro de qualificação de especialista
  especialidade  text,
  areas_periciais text[],                 -- ex.: {trabalhista, cível, previdenciário}
  cidade         text,
  uf             text,
  regioes        text[],                  -- regiões atendidas
  mini_curriculo text,
  disponivel     boolean not null default true,
  contato_autorizado boolean not null default false,  -- autoriza mostrar contato
  email_contato  text,
  telefone_contato text,
  publicado      boolean not null default false,       -- visível no diretório público
  verificado     text not null default 'nao',          -- nao | pendente | verificado
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists uix_perito_org on perito_perfil (org_id);
create index if not exists ix_perito_pub on perito_perfil (publicado, especialidade, uf);

alter table perito_perfil enable row level security;

-- O dono edita o próprio perfil.
drop policy if exists perito_owner on perito_perfil;
create policy perito_owner on perito_perfil for all
  using (org_id in (select o.id from organizations o where o.owner_id = auth.uid()))
  with check (org_id in (select o.id from organizations o where o.owner_id = auth.uid()));

-- Leitura PÚBLICA dos perfis publicados (o diretório é público, mas só
-- mostra quem marcou 'publicado'). Somente colunas seguras via view.
drop policy if exists perito_publico on perito_perfil;
create policy perito_publico on perito_perfil for select
  using (publicado = true);

-- View pública: expõe só o que é seguro mostrar (nunca org_id/user_id).
-- Contato só aparece se contato_autorizado = true (via app).
create or replace view perito_diretorio as
  select id, nome, crm, uf_crm, rqe, especialidade, areas_periciais,
         cidade, uf, regioes, mini_curriculo, disponivel, verificado,
         contato_autorizado,
         case when contato_autorizado then email_contato else null end as email_contato,
         case when contato_autorizado then telefone_contato else null end as telefone_contato
  from perito_perfil
  where publicado = true;
