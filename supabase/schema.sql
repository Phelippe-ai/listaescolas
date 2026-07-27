-- ============================================================================
-- Fala Tio · Prospecção de Escolas — Esquema do banco (Supabase / PostgreSQL)
-- Rode este script UMA VEZ no SQL Editor do seu projeto Supabase.
-- (Painel Supabase → SQL Editor → New query → cole tudo → Run)
-- ============================================================================

-- 1) Tabela principal: a base de escolas compartilhada por todo o time -------
create table if not exists public.escolas (
  id               bigint primary key,
  nome             text not null,
  cidade           text,
  estado           text,
  bairro           text,
  endereco         text,
  telefone_escola  text,
  site             text,
  alunos           integer,
  ensino_medio     boolean default true,
  decisor_nome     text,
  decisor_cargo    text,
  decisor_telefone text,
  inovacao         text,
  score            integer default 0,
  nota_enem        numeric,
  etapa            text default 'identificada',
  proximo_passo    text,
  observacoes      text,
  notas            text,
  updated_at       timestamptz default now(),
  updated_by       text
);

-- 2) Histórico de atividades: quem mudou o quê e quando ----------------------
create table if not exists public.atividades (
  id          bigint generated always as identity primary key,
  escola_id   bigint,
  escola_nome text,
  acao        text,   -- 'adicionou' | 'editou' | 'moveu' | 'excluiu' | 'importou'
  detalhe     text,   -- ex.: 'Reunião agendada → Contrato enviado'
  usuario     text,   -- email de quem fez a ação
  criado_em   timestamptz default now()
);
create index if not exists atividades_criado_em_idx on public.atividades (criado_em desc);

-- 3) Segurança (Row Level Security): só quem está logado acessa --------------
alter table public.escolas    enable row level security;
alter table public.atividades enable row level security;

-- Remove políticas antigas (se rodar o script mais de uma vez)
drop policy if exists "escolas_full_access"    on public.escolas;
drop policy if exists "atividades_full_access" on public.atividades;

-- Qualquer usuário autenticado pode ler e escrever na base compartilhada.
create policy "escolas_full_access" on public.escolas
  for all to authenticated using (true) with check (true);

-- Atividades: qualquer logado pode ler e inserir (mas não apagar histórico).
create policy "atividades_full_access" on public.atividades
  for select to authenticated using (true);
create policy "atividades_insert" on public.atividades
  for insert to authenticated with check (true);

-- 4) Realtime: mudanças aparecem em todos os aparelhos na hora ---------------
-- (Se der erro "already member", pode ignorar — só significa que já está ativo.)
alter publication supabase_realtime add table public.escolas;
alter publication supabase_realtime add table public.atividades;

-- ============================================================================
-- Pronto! Próximo passo: crie os usuários do time em
--   Authentication → Users → Add user  (email + senha)
-- e me envie a URL do projeto + a chave "anon public"
--   (Project Settings → API).
-- ============================================================================
