-- Andrade Concept · carga inicial
-- 1. Crie a usuária em Authentication → Users.
-- 2. Troque o e-mail abaixo pelo dela (ou cole o UUID em v_user).
-- 3. Rode este arquivo no SQL Editor. Pode rodar de novo: ele apaga e recria
--    serviços, custos e histórico dessa usuária (atendimentos e reservas ficam).

do $$
declare
  v_email text := 'seu email';
  v_user  uuid := null; -- ou cole aqui o UUID da usuária
begin
  if v_user is null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
  end if;
  if v_user is null then
    raise exception 'Usuária não encontrada. Confira o e-mail (%) ou preencha v_user.', v_email;
  end if;

  -- config ------------------------------------------------------------------
  insert into public.config (user_id, imposto, taxa_cartao, horas_mes, lucro_alvo, meta_mes, meta_reserva, licenca, politicas)
  values (v_user, 0.054, 0.035, 100, 0.15, 15000, 20000, '2027-02-01',
'- Sinal de 50% no Pix para reservar o horário
- Remarcação com até 24h de antecedência; sem aviso, o sinal não é devolvido
- Manutenção dentro do prazo e com pelo menos 40% dos fios; fora disso é cobrada como aplicação
- Valores para Pix ou dinheiro. No crédito parcelado, a taxa da maquininha é repassada
- Venha sem maquiagem nos olhos e sem lente de contato')
  on conflict (user_id) do update set
    imposto = excluded.imposto, taxa_cartao = excluded.taxa_cartao, horas_mes = excluded.horas_mes,
    lucro_alvo = excluded.lucro_alvo, meta_mes = excluded.meta_mes, meta_reserva = excluded.meta_reserva,
    licenca = excluded.licenca, politicas = excluded.politicas;

  -- serviços ----------------------------------------------------------------
  -- Atendimentos já registrados mantêm nome/minutos/material copiados; o
  -- vínculo servico_id vira null se o serviço for recriado.
  delete from public.servicos where user_id = v_user;
  insert into public.servicos (user_id, nome, categoria, preco, minutos, material, descricao, no_catalogo, ordem) values
    (v_user, 'Express',                        'Aplicação',    187,  85, 10,   'Fio a fio, 80% dos fios naturais',                 true,  1),
    (v_user, 'Classic Hyper',                  'Aplicação',    217,  90, 14,   'Fio elíptico, efeito natural e marcado',           true,  2),
    (v_user, 'Soft Hyper',                     'Aplicação',    247, 100, 10,   'Fios em Y, leve e preenchido, dura até 40 dias',   true,  3),
    (v_user, 'Luxo Hyper',                     'Aplicação',    287, 120, 18,   '100% dos fios preenchidos, volume máximo',         true,  4),
    (v_user, 'Full Hyper',                     'Aplicação',    297, 120, 29,   '100% preenchido com fio elíptico premium',         true,  5),
    (v_user, 'Manutenção Express',             'Manutenção',   187,  80, 11.5, 'Até 20 dias, com 40% dos fios',                    true,  6),
    (v_user, 'Manutenção Classic',             'Manutenção',   207,  95, 15.5, 'Até 30 dias, com 40% dos fios',                    true,  7),
    (v_user, 'Manutenção Soft',                'Manutenção',   217,  95, 11.5, 'Até 30 dias, com 40% dos fios',                    true,  8),
    (v_user, 'Manutenção Luxo / Full',         'Manutenção',   257, 110, 25,   'Até 30 dias, com 40% dos fios',                    true,  9),
    (v_user, 'Lash Lifting',                   'Lash lifting', 177,  75, 8,    'Curvatura e nutrição dos fios naturais',           true, 10),
    (v_user, 'Penteado',                       'Penteado',     200,  60, 5,    'Para eventos, formaturas e casamentos',            true, 11),
    (v_user, 'Remoção',                        'Outros',        70,  30, 3,    'Remoção segura com removedor em creme',            true, 12),
    (v_user, 'Preço especial antigo (R$ 150)', 'Outros',       150,  85, 10,   'Clientes antigas, em transição para o Express',    false, 13);

  -- custos fixos (total R$ 9.586,98) ---------------------------------------
  delete from public.custos where user_id = v_user;
  insert into public.custos (user_id, nome, valor, ordem) values
    (v_user, 'Meu salário (pró-labore)',             5000,    1),
    (v_user, 'Aluguel',                              1400,    2),
    (v_user, 'Água',                                   33,    3),
    (v_user, 'Luz',                                    98.70, 4),
    (v_user, 'Internet',                               60,    5),
    (v_user, 'Vivo',                                   65.43, 6),
    (v_user, 'Faxina',                                200,    7),
    (v_user, 'Faxina escada',                          54,    8),
    (v_user, 'Honorário contabilidade',               376,    9),
    (v_user, 'DAS (fixo)',                            176.98, 10),
    (v_user, 'IMP. BB',                                25,   11),
    (v_user, 'ACISB',                                  71.58, 12),
    (v_user, 'Gislaine (financeiro)',                 500,   13),
    (v_user, 'Giovanna (agenda)',                     200,   14),
    (v_user, 'Fatura PJ (Apple / produto / cola)',    320.35, 15),
    (v_user, 'Fatura PJ (materiais, cursos)',         557.14, 16),
    (v_user, 'Memória do celular',                     66.90, 17),
    (v_user, 'Spotify',                                31.90, 18),
    (v_user, 'Compras recepção',                       50,   19),
    (v_user, 'Fundo de reinvestimento',               300,   20);

  -- histórico de faturamento ------------------------------------------------
  delete from public.historico where user_id = v_user;
  insert into public.historico (user_id, mes, total) values
    (v_user, '2026-04', 12259),
    (v_user, '2026-05',  8942),
    (v_user, '2026-06', 14807),
    (v_user, '2026-07', 13209),
    (v_user, '2026-08', 13112),
    (v_user, '2026-09', 14045);

  -- reserva da licença (só cria se ela ainda não tiver nenhuma reserva) -----
  insert into public.reservas (user_id, nome, meta, data_alvo, ordem)
  select v_user, 'Licença', 20000, '2027-02-01', 1
  where not exists (select 1 from public.reservas where user_id = v_user);

  raise notice 'Carga inicial aplicada para %', v_user;
end $$;
