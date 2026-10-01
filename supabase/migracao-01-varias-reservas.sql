-- Migração 01: várias reservas.
-- Para quem já rodou o schema.sql antigo (com uma reserva só).
-- Rode uma vez no SQL Editor. Os lançamentos que já existem vão para uma
-- reserva "Licença", com a meta e a data que estavam em Custos.
-- Pode rodar de novo sem duplicar nada.

begin;

create table if not exists public.reservas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome      text not null default '',
  meta      numeric(12, 2) not null default 0 check (meta >= 0),
  data_alvo date not null,
  ordem     int not null default 0,
  unique (id, user_id)
);

alter table public.reserva add column if not exists reserva_id uuid;

-- Uma reserva "Licença" para cada usuária que tem config ou lançamentos.
insert into public.reservas (user_id, nome, meta, data_alvo, ordem)
select u.user_id,
       'Licença',
       coalesce(c.meta_reserva, 20000),
       coalesce(c.licenca, (date_trunc('month', current_date) + interval '6 months')::date),
       1
from (select user_id from public.config union select user_id from public.reserva) u
left join public.config c on c.user_id = u.user_id
where not exists (select 1 from public.reservas r where r.user_id = u.user_id);

-- Lançamentos antigos vão para a primeira reserva da usuária.
update public.reserva l
set reserva_id = (
  select r.id from public.reservas r where r.user_id = l.user_id order by r.ordem, r.nome limit 1
)
where l.reserva_id is null;

alter table public.reserva alter column reserva_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reserva_reserva_id_user_id_fkey') then
    alter table public.reserva
      add constraint reserva_reserva_id_user_id_fkey
      foreign key (reserva_id, user_id) references public.reservas (id, user_id) on delete cascade;
  end if;
end $$;

create index if not exists reserva_reserva_idx on public.reserva (reserva_id);

-- RLS da tabela nova (mesmas regras das outras).
alter table public.reservas enable row level security;
drop policy if exists "reservas_select" on public.reservas;
drop policy if exists "reservas_insert" on public.reservas;
drop policy if exists "reservas_update" on public.reservas;
drop policy if exists "reservas_delete" on public.reservas;
create policy "reservas_select" on public.reservas for select to authenticated
  using (user_id = (select auth.uid()));
create policy "reservas_insert" on public.reservas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "reservas_update" on public.reservas for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reservas_delete" on public.reservas for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.reservas from anon;
grant select, insert, update, delete on public.reservas to authenticated;

commit;
