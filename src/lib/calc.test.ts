import { describe, expect, it } from 'vitest'
import {
  calcularServico,
  fixosTotal,
  horaCusto,
  maisVendidos,
  mesesAte,
  planoReserva,
  progressoMeta,
  resultadoMes,
  resumoReserva,
  serieFaturamento,
  taxaMedia,
} from './calc'
import { textoWhatsApp } from './catalogo'
import { lerNumero } from './format'
import type { Atendimento, Servico } from './types'

// Mesmos números de supabase/seed.sql
const CUSTOS = [
  5000, 1400, 33, 98.7, 60, 65.43, 200, 54, 376, 176.98, 25, 71.58, 500, 200, 320.35, 557.14, 66.9, 31.9, 50, 300,
].map((valor) => ({ valor }))

const PARAMS = { imposto: 0.054, taxa_cartao: 0.035, horas_mes: 100, lucro_alvo: 0.15 }

const FIXOS = fixosTotal(CUSTOS)
const HORA = horaCusto(FIXOS, PARAMS.horas_mes)

describe('custos', () => {
  it('soma os custos fixos do seed', () => {
    expect(FIXOS).toBeCloseTo(9586.98, 2)
  })
  it('hora_custo ≈ 95,87', () => {
    expect(HORA).toBeCloseTo(95.87, 2)
  })
  it('taxa média é 15% da taxa do cartão', () => {
    expect(taxaMedia(0.035)).toBeCloseTo(0.00525, 6)
  })
  it('horas_mes zero não divide por zero', () => {
    expect(horaCusto(1000, 0)).toBe(0)
  })
})

describe('serviço', () => {
  it('Soft Hyper: mínimo ≈ R$ 215 e Saudável', () => {
    const r = calcularServico({ preco: 247, minutos: 100, material: 10 }, PARAMS, HORA)
    expect(r.custo_real).toBeCloseTo(169.78, 2)
    expect(r.minimo).toBeCloseTo(214.71, 2)
    expect(Math.round(r.minimo)).toBe(215)
    expect(r.por_hora).toBeCloseTo(148.2, 2)
    expect(r.lucro).toBeCloseTo(247 * (1 - 0.054 - 0.00525) - 169.78, 1)
    expect(r.margem).toBeCloseTo(r.lucro / 247, 6)
    expect(r.selo).toBe('saudavel')
  })

  it('preço especial de R$ 150 dá prejuízo', () => {
    const r = calcularServico({ preco: 150, minutos: 85, material: 10 }, PARAMS, HORA)
    expect(r.custo_real).toBeCloseTo(145.82, 2)
    expect(150).toBeLessThan(r.custo_real / (1 - 0.054))
    expect(r.selo).toBe('prejuizo')
  })

  it('entre o limite de prejuízo e o mínimo fica "Abaixo do mínimo"', () => {
    // Express: custo ≈ 145,82; limite de prejuízo ≈ 154,14; mínimo ≈ 184,41
    const r = calcularServico({ preco: 170, minutos: 85, material: 10 }, PARAMS, HORA)
    expect(r.selo).toBe('abaixo')
  })
})

describe('mês', () => {
  const at = [
    { valor: 247, pagamento: 'Pix', material: 10, minutos: 100 },
    { valor: 187, pagamento: 'Crédito', material: 11.5, minutos: 80 },
    { valor: 200, pagamento: 'Débito', material: 5, minutos: 60 },
    { valor: 70, pagamento: 'Dinheiro', material: 3, minutos: 30 },
  ] as Pick<Atendimento, 'valor' | 'pagamento' | 'material' | 'minutos'>[]

  it('calcula o resultado do mês', () => {
    const r = resultadoMes(at, PARAMS, FIXOS)
    expect(r.faturamento).toBe(704)
    expect(r.quantidade).toBe(4)
    expect(r.imposto).toBeCloseTo(704 * 0.054, 6)
    expect(r.taxas).toBeCloseTo((187 + 200) * 0.035, 6)
    expect(r.material).toBeCloseTo(29.5, 6)
    expect(r.sobra).toBeCloseTo(704 - 704 * 0.054 - 387 * 0.035 - 29.5 - FIXOS, 6)
    expect(r.ticket).toBe(176)
    expect(r.por_hora).toBeCloseTo(704 / 4.5, 6)
  })

  it('mês vazio não quebra', () => {
    const r = resultadoMes([], PARAMS, FIXOS)
    expect(r.faturamento).toBe(0)
    expect(r.ticket).toBeNull()
    expect(r.por_hora).toBeNull()
    expect(r.sobra).toBeCloseTo(-FIXOS, 6)
  })

  it('meta: falta e atendimentos no ticket', () => {
    const m = progressoMeta(10000, 15000, 215)
    expect(m.falta).toBe(5000)
    expect(m.atendimentos).toBe(24)
    expect(m.progresso).toBeCloseTo(2 / 3, 6)
    expect(progressoMeta(16000, 15000, 215)).toMatchObject({ falta: 0, progresso: 1, atendimentos: 0 })
  })

  it('agrupa o que mais saiu', () => {
    const r = maisVendidos([
      { servico_nome: 'Express', valor: 187 },
      { servico_nome: 'Soft Hyper', valor: 247 },
      { servico_nome: 'Express', valor: 187 },
    ])
    expect(r[0]).toEqual({ nome: 'Express', quantidade: 2, total: 374 })
    expect(r[1].nome).toBe('Soft Hyper')
  })
})

describe('gráfico', () => {
  it('lista 8 meses atravessando o ano', () => {
    expect(mesesAte('2026-02', 8)).toEqual([
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    ])
  })

  it('usa atendimentos quando há, histórico quando não há', () => {
    const s = serieFaturamento(
      '2026-10',
      3,
      [{ data: '2026-10-03', valor: 300 }, { data: '2026-09-20', valor: 100 }],
      [{ mes: '2026-09', total: 14045 }, { mes: '2026-08', total: 13112 }],
    )
    expect(s).toEqual([
      { mes: '2026-08', total: 13112, fonte: 'historico' },
      { mes: '2026-09', total: 100, fonte: 'atendimentos' },
      { mes: '2026-10', total: 300, fonte: 'atendimentos' },
    ])
  })
})

describe('reserva', () => {
  it('calcula dias, quanto guardar por mês e meses cobertos', () => {
    const r = resumoReserva([{ valor: 3000 }, { valor: 2000 }], 20000, '2027-02-01', '2026-10-01', FIXOS)
    expect(r.total).toBe(5000)
    expect(r.falta).toBe(15000)
    expect(r.dias).toBe(123)
    expect(r.meses).toBe(4)
    expect(r.por_mes).toBe(3750)
    expect(r.meses_cobertos).toBeCloseTo(5000 / FIXOS, 6)
  })
})

describe('catálogo e números', () => {
  it('monta o texto do WhatsApp', () => {
    const servicos = [
      { id: '1', nome: 'Soft Hyper', categoria: 'Aplicação', preco: 247, minutos: 100, material: 10, descricao: 'Fios em Y', no_catalogo: true, ordem: 1 },
      { id: '2', nome: 'Antigo', categoria: 'Outros', preco: 150, minutos: 85, material: 10, descricao: '', no_catalogo: false, ordem: 2 },
    ] as Servico[]
    const t = textoWhatsApp(servicos, '- Sinal de 50%')
    expect(t).toContain('*APLICAÇÕES*')
    expect(t).toContain('• *Soft Hyper* — R$ 247')
    expect(t).toContain('_Fios em Y · 1h40_')
    expect(t).toContain('• Sinal de 50%')
    expect(t).not.toContain('Antigo')
  })

  it('lê números no formato brasileiro', () => {
    expect(lerNumero('98,70')).toBe(98.7)
    expect(lerNumero('1.400')).toBe(1400)
    expect(lerNumero('1.400,50')).toBe(1400.5)
    expect(lerNumero('98.7')).toBe(98.7)
    expect(lerNumero('')).toBeNull()
    expect(lerNumero('abc')).toBeNull()
  })
})

describe('plano da reserva', () => {
  const META = 20000
  const LIC = '2027-02-01'

  it('sem nada guardado, divide igual pelos meses até a licença', () => {
    const p = planoReserva([], META, LIC, '2026-10-15')
    expect(p.meses_restantes).toBe(4) // out, nov, dez, jan
    expect(p.parcela_atual).toBe(5000)
    expect(p.parcela_futura).toBe(5000)
    expect(p.meses.map((m) => `${m.mes}:${m.situacao}`)).toEqual([
      '2026-10:atual', '2026-11:futuro', '2026-12:futuro', '2027-01:futuro',
    ])
  })

  it('mostra meses passados com a parcela que valia na época', () => {
    const p = planoReserva([{ data: '2026-09-10', valor: 3000 }], META, LIC, '2026-10-15')
    expect(p.meses[0]).toEqual({ mes: '2026-09', situacao: 'passado', parcela: 4000, guardado: 3000 })
    expect(p.parcela_atual).toBe(4250) // (20000 - 3000) / 4
  })

  it('guardar a mais no mês diminui as próximas parcelas', () => {
    const p = planoReserva(
      [{ data: '2026-09-10', valor: 3000 }, { data: '2026-10-05', valor: 6000 }],
      META, LIC, '2026-10-15',
    )
    expect(p.falta_mes).toBe(0)
    expect(p.extra_mes).toBe(1750)
    expect(p.parcela_futura).toBeCloseTo(11000 / 3, 6) // < 4250
  })

  it('guardar a menos aumenta as parcelas quando o mês vira', () => {
    const lanc = [{ data: '2026-09-10', valor: 3000 }, { data: '2026-10-05', valor: 1000 }]
    const emOutubro = planoReserva(lanc, META, LIC, '2026-10-15')
    expect(emOutubro.falta_mes).toBe(3250)
    expect(emOutubro.parcela_futura).toBe(4250) // ainda conta que outubro vai fechar
    const emNovembro = planoReserva(lanc, META, LIC, '2026-11-02')
    expect(emNovembro.parcela_atual).toBeCloseTo(16000 / 3, 6) // subiu
  })

  it('meta já batida zera as parcelas', () => {
    const p = planoReserva([{ data: '2026-10-01', valor: 25000 }], META, LIC, '2026-10-15')
    expect(p.parcela_futura).toBe(0)
    expect(p.extra_mes).toBe(20000)
  })

  it('no mês da licença não há mais parcelas', () => {
    const p = planoReserva([], META, LIC, '2027-02-10')
    expect(p.meses_restantes).toBe(0)
    expect(p.parcela_atual).toBe(0)
  })
})
