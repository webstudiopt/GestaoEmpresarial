-- Andrade Concept · Gestão
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- Toda tabela tem user_id preenchido automaticamente com o usuário logado
-- e RLS que só deixa cada usuária ver e mexer nas próprias linhas.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- serviços
create table if not exists public.servicos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null default '',
  categoria   text not null default 'Aplicação'
              check (categoria in ('Aplicação', 'Manutenção', 'Lash lifting', 'Penteado', 'Outros')),
  preco       numeric(10, 2) not null default 0 check (preco >= 0),
  minutos     int not null default 60 check (minutos >= 0),
  material    numeric(10, 2) not null default 0 check (material >= 0),
  descricao   text not null default '',
  no_catalogo boolean not null default true,
  ordem       int not null default 0
);
create index if not exists servicos_user_idx on public.servicos (user_id, ordem);

-- ---------------------------------------------------------------- custos fixos
create table if not exists public.custos (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome    text not null default '',
  valor   numeric(10, 2) not null default 0,
  ordem   int not null default 0
);
create index if not exists custos_user_idx on public.custos (user_id, ordem);

-- ---------------------------------------------------------------- atendimentos
-- servico_nome, minutos e material são copiados do serviço no momento do
-- registro, para o histórico não mudar quando o preço do serviço mudar.
create table if not exists public.atendimentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data         date not null default current_date,
  cliente      text not null default '',
  servico_id   uuid references public.servicos (id) on delete set null,
  servico_nome text not null default '',
  categoria    text not null default '',
  valor        numeric(10, 2) not null default 0 check (valor >= 0),
  minutos      int not null default 0,
  material     numeric(10, 2) not null default 0,
  pagamento    text not null default 'Pix'
               check (pagamento in ('Pix', 'Dinheiro', 'Débito', 'Crédito', 'Permuta')),
  obs          text not null default '',
  criado_em    timestamptz not null default now()
);
create index if not exists atendimentos_user_data_idx on public.atendimentos (user_id, data desc);

-- ---------------------------------------------------------------- reservas
-- Cada reserva tem nome, meta e data em que o dinheiro precisa estar pronto
-- (ex.: Licença, Reforma). Os valores guardados ficam em public.reserva.
create table if not exists public.reservas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome      text not null default '',
  meta      numeric(12, 2) not null default 0 check (meta >= 0),
  data_alvo date not null,
  ordem     int not null default 0,
  unique (id, user_id)
);

-- Lançamentos (valores guardados) de cada reserva.
-- A chave composta garante que o lançamento e a reserva são da mesma usuária.
create table if not exists public.reserva (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reserva_id uuid not null,
  data       date not null default current_date,
  descricao  text not null default '',
  valor      numeric(10, 2) not null default 0,
  foreign key (reserva_id, user_id) references public.reservas (id, user_id) on delete cascade
);
create index if not exists reserva_user_idx on public.reserva (user_id, data desc);
create index if not exists reserva_reserva_idx on public.reserva (reserva_id);

-- ---------------------------------------------------------------- histórico
-- Faturamento de meses anteriores ao uso do app (mes = 'YYYY-MM').
create table if not exists public.historico (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes     text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  total   numeric(12, 2) not null default 0,
  unique (user_id, mes)
);

-- ---------------------------------------------------------------- config
-- Uma linha por usuária.
create table if not exists public.config (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  imposto      numeric(6, 4) not null default 0.054,
  taxa_cartao  numeric(6, 4) not null default 0.035,
  horas_mes    int not null default 100 check (horas_mes > 0),
  lucro_alvo   numeric(6, 4) not null default 0.15,
  meta_mes     numeric(12, 2) not null default 15000,
  -- meta_reserva e licenca: usadas antes de existirem várias reservas
  -- (agora cada reserva tem meta e data própria). Mantidas por compatibilidade.
  meta_reserva numeric(12, 2) not null default 20000,
  licenca      date,
  politicas    text not null default ''
);

-- ---------------------------------------------------------------- RLS
do $$
declare
  t text;
begin
  foreach t in array array['servicos', 'custos', 'atendimentos', 'reservas', 'reserva', 'historico', 'config'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);

    execute format(
      'create policy "%s_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t, t);
    execute format(
      'create policy "%s_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t, t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
